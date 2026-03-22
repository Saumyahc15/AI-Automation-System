from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from ..models import Order, OrderItem, Product, Customer
from ..groq_client.client import ask_groq


def build_sales_context(db: Session, days: int = 7) -> str:
    now = datetime.utcnow()
    cutoff = now - timedelta(days=days)

    recent_orders = db.query(Order).filter(Order.order_date >= cutoff).all()
    total_revenue = sum(o.total_amount for o in recent_orders)
    status_counts = {}
    for o in recent_orders:
        status_counts[o.shipping_status] = status_counts.get(o.shipping_status, 0) + 1

    top_products = db.query(
        Product.name,
        func.sum(OrderItem.quantity).label("total_qty"),
        func.sum(OrderItem.quantity * OrderItem.unit_price).label("revenue")
    ).join(OrderItem).join(Order).filter(
        Order.order_date >= cutoff
    ).group_by(Product.name).order_by(
        func.sum(OrderItem.quantity).desc()
    ).limit(5).all()

    low_stock = db.query(Product).filter(
        Product.stock <= Product.low_stock_threshold,
        Product.is_active == True
    ).all()

    total_customers = db.query(Customer).count()
    active_customers = db.query(Customer).filter(
        Customer.last_purchase >= cutoff
    ).count()
    inactive_customers = db.query(Customer).filter(
        Customer.last_purchase <= now - timedelta(days=30)
    ).count()

    prev_cutoff = cutoff - timedelta(days=days)
    prev_orders = db.query(Order).filter(
        Order.order_date >= prev_cutoff,
        Order.order_date < cutoff
    ).all()
    prev_revenue = sum(o.total_amount for o in prev_orders)
    revenue_change = ((total_revenue - prev_revenue) / prev_revenue * 100) if prev_revenue > 0 else 0

    context = f"""
SALES DATA — Last {days} days (vs previous {days} days):
- Total orders: {len(recent_orders)} (prev: {len(prev_orders)})
- Total revenue: Rs.{total_revenue:.2f} (prev: Rs.{prev_revenue:.2f}, change: {revenue_change:+.1f}%)
- Order statuses: {status_counts}

TOP 5 SELLING PRODUCTS:
{chr(10).join([f"- {p.name}: {p.total_qty} units sold, Rs.{p.revenue:.2f} revenue" for p in top_products]) or "No sales data"}

INVENTORY ALERTS:
- Low/out of stock products: {len(low_stock)}
{chr(10).join([f"  - {p.name}: {p.stock} units" for p in low_stock[:5]])}

CUSTOMER HEALTH:
- Total customers: {total_customers}
- Active (bought in last {days} days): {active_customers}
- Inactive (no purchase in 30+ days): {inactive_customers}
"""
    return context.strip()


def answer_sales_question(db: Session, question: str) -> str:
    context = build_sales_context(db, days=14)
    prompt = f"""You are a smart retail business analyst for an Indian retail store using the RetailAI system.

Here is the current business data:
{context}

The store owner asks: "{question}"

Answer in 3-5 sentences. Be specific, use the numbers from the data.
If the data doesn't directly answer the question, say what you can infer.
Do not mention that you were given data — just answer naturally as an analyst."""

    return ask_groq(
        prompt,
        system="You are a concise, data-driven retail business analyst. Answer questions using the provided store data."
    )