from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.order import Order
from app.schemas.order import OrderCreate, OrderOut
from typing import List

router = APIRouter()


@router.get("/", response_model=List[OrderOut])
def list_orders(limit: int = 100, db: Session = Depends(get_db)):
    return db.query(Order).order_by(Order.order_date.desc()).limit(limit).all()


@router.post("/", response_model=OrderOut)
def create_order(data: OrderCreate, db: Session = Depends(get_db)):
    from app.models.customer import Customer
    from app.models.product import Product
    from datetime import datetime, timedelta

    if not data.product_id:
        raise HTTPException(status_code=400, detail="Product is required")

    product = db.query(Product).filter(Product.product_id == data.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if data.quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be greater than 0")
    if product.stock < data.quantity:
        raise HTTPException(status_code=400, detail="Not enough stock available")

    customer = None
    if data.customer_id:
        customer = db.query(Customer).filter(Customer.customer_id == data.customer_id).first()
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")

    order = Order(
        product_id=data.product_id,
        customer_id=data.customer_id,
        quantity=data.quantity,
        total_price=round(product.price * data.quantity, 2),
        shipping_address=data.shipping_address,
        payment_method=data.payment_method,
        expected_delivery=datetime.utcnow() + timedelta(days=5),
    )
    db.add(order)

    if customer:
        customer.last_purchase_date = datetime.utcnow()
        customer.total_orders += 1
        customer.lifetime_value += order.total_price

    product.stock -= data.quantity
    db.commit()
    db.refresh(order)
    # Real-time trigger: run order-event workflows immediately.
    from app.services.execution_engine import execute_event_workflows_for_order
    execute_event_workflows_for_order(order.order_id)
    return order


@router.patch("/{order_id}/status")
def update_order_status(order_id: int, status: str, db: Session = Depends(get_db)):
    from datetime import datetime
    order = db.query(Order).filter(Order.order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    order.shipping_status = status
    if status == "shipped":
        order.shipped_at = datetime.utcnow()
    db.commit()
    return {"status": "updated"}


@router.get("/pending-delayed")
def get_delayed_orders(hours: int = 48, db: Session = Depends(get_db)):
    from datetime import datetime, timedelta
    cutoff = datetime.utcnow() - timedelta(hours=hours)
    return db.query(Order).filter(
        Order.order_date < cutoff,
        Order.shipping_status == "pending"
    ).all()
