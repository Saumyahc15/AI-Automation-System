from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List
from datetime import datetime, timezone
import io
from ..database import get_db
from ..models import Order, Customer, Notification, User, OrderItem, Product
from ..schemas import OrderOut, OrderStatusUpdate
from ..auth_handler import get_current_user

router = APIRouter(prefix="/orders", tags=["Orders"])

VALID_TRANSITIONS = {
    "pending": ["shipped", "delayed", "cancelled"],
    "shipped": ["delivered", "delayed"],
    "delayed": ["shipped", "delivered", "cancelled"],
    "delivered": [],
    "cancelled": [],
}


@router.get("/", response_model=List[OrderOut])
def get_orders(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Order).filter(Order.user_id == current_user.id).order_by(Order.order_date.desc()).all()


@router.get("/delayed")
def get_delayed_orders(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Order).filter(Order.shipping_status == "delayed", Order.user_id == current_user.id).all()


@router.patch("/{order_id}/status", response_model=OrderOut)
def update_order_status(order_id: int, body: OrderStatusUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    order = db.query(Order).filter(Order.id == order_id, Order.user_id == current_user.id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    allowed = VALID_TRANSITIONS.get(order.shipping_status, [])
    if body.status not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot transition from '{order.shipping_status}' to '{body.status}'. Allowed: {allowed}"
        )

    order.shipping_status = body.status
    if body.notes:
        order.notes = body.notes
    if body.status == "shipped":
        order.shipped_at = datetime.now(timezone.utc)
    if body.status == "delivered":
        order.delivered_at = datetime.now(timezone.utc)

    # Create notification for status change
    notif = Notification(
        user_id=current_user.id,
        title=f"Order #{order.id} {body.status.capitalize()}",
        message=f"Order #{order.id} status updated to '{body.status}'.",
        type="success" if body.status == "delivered" else "info",
        link="/orders"
    )
    db.add(notif)
    db.commit()
    db.refresh(order)
    return order


@router.get("/{order_id}/invoice")
def download_invoice(order_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Generate a simple HTML invoice for an order."""
    order = db.query(Order).filter(Order.id == order_id, Order.user_id == current_user.id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    customer = db.query(Customer).filter(Customer.id == order.customer_id).first()
    items_html = ""
    for item in order.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        items_html += f"""
        <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #eee">{product.name if product else 'Unknown'}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center">{item.quantity}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right">₹{item.unit_price:.2f}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right">₹{item.quantity * item.unit_price:.2f}</td>
        </tr>"""

    html = f"""<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Invoice #{order.id}</title>
<style>body{{font-family:Arial,sans-serif;color:#333;max-width:800px;margin:40px auto;padding:20px}}
h1{{color:#2563eb}} table{{width:100%;border-collapse:collapse}} th{{background:#f8fafc;padding:10px 12px;text-align:left;border-bottom:2px solid #e2e8f0}}
.total{{font-size:18px;font-weight:bold;color:#2563eb}}</style>
</head>
<body>
<div style="display:flex;justify-content:space-between;align-items:start">
    <div><h1>🧾 Invoice</h1><p style="color:#666">RetailAI Store</p></div>
    <div style="text-align:right">
        <div><strong>Invoice #</strong> {order.id}</div>
        <div><strong>Date:</strong> {order.order_date.strftime('%d %b %Y')}</div>
        <div><strong>Status:</strong> <span style="color:{'#16a34a' if order.shipping_status=='delivered' else '#d97706'}">{order.shipping_status.upper()}</span></div>
    </div>
</div>
<hr style="margin:20px 0;border:none;border-top:1px solid #e2e8f0">
<div style="margin-bottom:20px">
    <strong>Bill To:</strong><br/>
    {customer.name if customer else 'N/A'}<br/>
    {customer.email if customer else ''}<br/>
    {customer.phone if customer and customer.phone else ''}
</div>
<table>
    <thead><tr>
        <th>Product</th><th style="text-align:center">Qty</th>
        <th style="text-align:right">Unit Price</th><th style="text-align:right">Total</th>
    </tr></thead>
    <tbody>{items_html}</tbody>
</table>
<div style="text-align:right;margin-top:16px">
    <div class="total">Total: ₹{order.total_amount:.2f}</div>
</div>
{f'<div style="margin-top:20px;color:#666;font-size:13px"><strong>Notes:</strong> {order.notes}</div>' if order.notes else ''}
<hr style="margin:30px 0;border:none;border-top:1px solid #e2e8f0">
<p style="color:#999;font-size:12px;text-align:center">Generated by RetailAI Automation System</p>
</body></html>"""

    return StreamingResponse(
        io.BytesIO(html.encode("utf-8")),
        media_type="text/html",
        headers={"Content-Disposition": f"inline; filename=invoice_{order.id}.html"}
    )