from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.user import User
from app.models.order import Order
from app.models.product import Product
from app.models.customer import Customer
from app.models.purchase_order import PurchaseOrder
from app.models.returns import Return
from app.services.auth_service import get_current_user
from datetime import datetime, timedelta

router = APIRouter()


@router.get("/summary")
def get_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Dashboard KPI summary. All authenticated users."""
    today = datetime.utcnow() - timedelta(hours=24)
    week = datetime.utcnow() - timedelta(days=7)

    return {
        "orders_today": db.query(Order).filter(Order.order_date >= today).count(),
        "revenue_today": db.query(func.sum(Order.total_price)).filter(Order.order_date >= today).scalar() or 0,
        "orders_this_week": db.query(Order).filter(Order.order_date >= week).count(),
        "revenue_this_week": db.query(func.sum(Order.total_price)).filter(Order.order_date >= week).scalar() or 0,
        "total_products": db.query(Product).filter(Product.is_active == True).count(),
        "low_stock_products": db.query(Product).filter(Product.stock < 10, Product.is_active == True).count(),
        "out_of_stock": db.query(Product).filter(Product.stock == 0, Product.is_active == True).count(),
        "total_customers": db.query(Customer).count(),
        "pending_orders": db.query(Order).filter(Order.shipping_status == "pending").count(),
        "purchase_orders_sent": db.query(PurchaseOrder).filter(PurchaseOrder.status == "sent").count(),
    }


@router.get("/top-products")
def top_products(
    days: int = 7,
    limit: int = 10,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get top-selling products. All authenticated users."""
    cutoff = datetime.utcnow() - timedelta(days=days)
    results = db.query(
        Product.name,
        func.sum(Order.quantity).label("units_sold"),
        func.sum(Order.total_price).label("revenue")
    ).join(Order, Order.product_id == Product.product_id).filter(
        Order.order_date >= cutoff
    ).group_by(Product.name).order_by(func.sum(Order.quantity).desc()).limit(limit).all()
    
    return [
        {
            "name": row[0],
            "units_sold": row[1] or 0,
            "revenue": float(row[2] or 0)
        }
        for row in results
    ]


@router.get("/revenue-chart")
def revenue_chart(
    days: int = 30,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Daily revenue for the last N days (for charting). All authenticated users."""
    result = []
    for i in range(days):
        day = datetime.utcnow() - timedelta(days=i)
        start = day.replace(hour=0, minute=0, second=0)
        end = day.replace(hour=23, minute=59, second=59)
        rev = db.query(func.sum(Order.total_price)).filter(
            Order.order_date >= start, Order.order_date <= end
        ).scalar() or 0
        result.append({"date": start.strftime("%Y-%m-%d"), "revenue": round(rev, 2)})
    return list(reversed(result))


@router.get("/order-distribution")
def order_distribution(
    days: int = 7,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Daily order counts split by status for the last N days."""
    result = []
    now = datetime.utcnow()

    for i in range(days):
        day = now - timedelta(days=i)
        start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        end = day.replace(hour=23, minute=59, second=59, microsecond=999999)

        orders = db.query(Order).filter(
            Order.order_date >= start,
            Order.order_date <= end
        ).all()

        buckets = {
            "day": start.strftime("%a"),
            "pending": 0,
            "processing": 0,
            "shipped": 0,
            "delayed": 0,
        }

        for order in orders:
            status = (order.shipping_status or "pending").lower()
            if status == "pending" and order.order_date < now - timedelta(hours=48):
                buckets["delayed"] += 1
            elif status in buckets:
                buckets[status] += 1
            else:
                buckets["processing"] += 1

        result.append(buckets)

    return list(reversed(result))


@router.get("/inventory-status")
def inventory_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Bucket products by stock health for dashboard charts."""
    products = db.query(Product).filter(Product.is_active == True).all()
    buckets = {
        "Critical (0-3d)": 0,
        "Low Stock": 0,
        "Normal": 0,
        "Overstock": 0,
    }

    for product in products:
        avg_daily_sales = product.avg_daily_sales or 0
        days_to_stockout = (product.stock / avg_daily_sales) if avg_daily_sales > 0 else float("inf")

        if product.stock == 0 or days_to_stockout <= 3:
            buckets["Critical (0-3d)"] += 1
        elif product.stock <= product.reorder_threshold:
            buckets["Low Stock"] += 1
        elif avg_daily_sales > 0 and product.stock > avg_daily_sales * 45:
            buckets["Overstock"] += 1
        else:
            buckets["Normal"] += 1

    return [{"name": name, "value": value} for name, value in buckets.items()]


@router.get("/category-sales")
def category_sales(
    days: int = 30,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Revenue and units sold grouped by product category."""
    cutoff = datetime.utcnow() - timedelta(days=days)
    rows = db.query(
        func.coalesce(Product.category, "Uncategorized").label("category"),
        func.coalesce(func.sum(Order.total_price), 0).label("revenue"),
        func.coalesce(func.sum(Order.quantity), 0).label("orders"),
    ).join(
        Order, Order.product_id == Product.product_id
    ).filter(
        Order.order_date >= cutoff
    ).group_by(
        func.coalesce(Product.category, "Uncategorized")
    ).order_by(
        func.sum(Order.total_price).desc()
    ).all()

    return [
        {
            "category": row.category,
            "revenue": round(float(row.revenue or 0), 2),
            "orders": int(row.orders or 0),
        }
        for row in rows
    ]


@router.get("/activity-timeline")
def activity_timeline(
    days: int = 7,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Daily created-record counts for products, customers, and orders."""
    now = datetime.utcnow()
    result = []

    for i in range(days):
        day = now - timedelta(days=i)
        start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        end = day.replace(hour=23, minute=59, second=59, microsecond=999999)

        result.append({
            "date": start.strftime("%Y-%m-%d"),
            "label": start.strftime("%b %d"),
            "products": db.query(Product).filter(
                Product.created_at >= start,
                Product.created_at <= end,
                Product.is_active == True,
            ).count(),
            "customers": db.query(Customer).filter(
                Customer.created_at >= start,
                Customer.created_at <= end,
            ).count(),
            "orders": db.query(Order).filter(
                Order.order_date >= start,
                Order.order_date <= end,
            ).count(),
        })

    return list(reversed(result))
