from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from ..models import Product, OrderItem, Order
from ..groq_client.client import ask_groq


def get_daily_sales_rate(db: Session, product_id: int, days: int = 14) -> float:
    """Calculate average units sold per day over the last N days."""
    cutoff = datetime.utcnow() - timedelta(days=days)
    result = db.query(func.sum(OrderItem.quantity)).join(Order).filter(
        OrderItem.product_id == product_id,
        Order.order_date >= cutoff
    ).scalar()
    total_sold = result or 0
    return total_sold / days


def predict_stockouts(db: Session, horizon_days: int = 7) -> list:
    """
    For every active product, compute days until stockout
    based on moving average sales rate.
    Returns list of products predicted to run out within horizon_days.
    """
    products = db.query(Product).filter(Product.is_active == True, Product.stock > 0).all()
    at_risk = []

    for product in products:
        daily_rate = get_daily_sales_rate(db, product.id)
        if daily_rate <= 0:
            continue  # not selling — skip
        days_remaining = product.stock / daily_rate
        if days_remaining <= horizon_days:
            at_risk.append({
                "id": product.id,
                "name": product.name,
                "sku": product.sku,
                "stock": product.stock,
                "daily_rate": round(daily_rate, 2),
                "days_remaining": round(days_remaining, 1),
                "category": product.category
            })

    # Sort by most urgent first
    at_risk.sort(key=lambda x: x["days_remaining"])
    return at_risk


def get_groq_forecast(db: Session, horizon_days: int = 7) -> dict:
    """
    Build stock data context and ask Groq for a plain English forecast.
    """
    at_risk = predict_stockouts(db, horizon_days)
    all_products = db.query(Product).filter(
        Product.is_active == True
    ).order_by(Product.stock.asc()).limit(20).all()

    product_summary = "\n".join([
        f"- {p.name}: {p.stock} units in stock (threshold: {p.low_stock_threshold})"
        for p in all_products
    ])

    at_risk_summary = "\n".join([
        f"- {item['name']}: {item['stock']} units left, selling {item['daily_rate']} units/day → runs out in {item['days_remaining']} days"
        for item in at_risk
    ]) if at_risk else "No products predicted to run out."

    prompt = f"""You are a retail inventory analyst for an Indian retail store.

Current inventory snapshot:
{product_summary}

Products predicted to run out within {horizon_days} days (based on sales velocity):
{at_risk_summary}

Provide a detailed inventory forecast for the store owner. 
Focus on explaining why certain items are at risk based on their sales speed. 
Recommend specific actions for each high-alert item. Since the owner will listen to this report via voice, make the structure clear and easy to follow. 
Use a helpful, professional tone. Be specific with product names and numbers.
"""

    narrative = ask_groq(prompt, system="You are a helpful retail inventory analyst. Be concise and data-driven.")

    return {
        "at_risk": at_risk,
        "horizon_days": horizon_days,
        "narrative": narrative,
        "generated_at": datetime.utcnow().isoformat()
    }