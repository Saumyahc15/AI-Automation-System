from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from ..models import Product, Order, Customer, Workflow
from ..groq_client.client import ask_groq
import json, re


def build_store_snapshot(db: Session) -> str:
    """Summarise the store's current state for Groq."""
    low_stock = db.query(Product).filter(
        Product.stock <= Product.low_stock_threshold,
        Product.is_active == True
    ).count()
    out_of_stock = db.query(Product).filter(
        Product.stock == 0, Product.is_active == True
    ).count()
    delayed_orders = db.query(Order).filter(
        Order.shipping_status == "pending",
        Order.order_date <= datetime.utcnow() - timedelta(hours=48)
    ).count()
    inactive_customers = db.query(Customer).filter(
        Customer.last_purchase <= datetime.utcnow() - timedelta(days=30)
    ).count()
    existing_workflows = db.query(Workflow).filter(Workflow.is_active == True).all()
    existing_triggers = [wf.trigger for wf in existing_workflows]

    return f"""
Store snapshot:
- Low stock products: {low_stock}
- Out of stock products: {out_of_stock}
- Orders pending 48+ hours: {delayed_orders}
- Customers inactive 30+ days: {inactive_customers}
- Active workflow triggers already set: {existing_triggers}
"""


def get_suggestions(db: Session) -> list:
    """
    Ask Groq to suggest 4 automation workflows based on current store state.
    Returns a list of suggestion objects with text and a ready-to-use NL command.
    """
    snapshot = build_store_snapshot(db)

    prompt = f"""You are a retail automation expert for an Indian retail store.

{snapshot}

Based on this store data, suggest exactly 4 automation workflows that would be most valuable RIGHT NOW.
Prioritise suggestions based on the problems visible in the data (e.g. if there are delayed orders, suggest an order alert).
Do NOT suggest workflows whose trigger already exists in the active workflows list.

Return ONLY a JSON array, no explanation, no markdown. Format:
[
  {{
    "title": "Short workflow title (5 words max)",
    "reason": "One sentence why this is needed now",
    "command": "The exact natural language command the owner should type to create this workflow"
  }}
]"""

    raw = ask_groq(
        prompt,
        system="You are a retail automation expert. Return only valid JSON arrays."
    )

    # Strip markdown fences if present
    raw = re.sub(r"```(?:json)?", "", raw).strip().rstrip("```").strip()

    try:
        suggestions = json.loads(raw)
        return suggestions if isinstance(suggestions, list) else []
    except json.JSONDecodeError:
        # Fallback suggestions if Groq returns bad JSON
        return [
            {"title": "Low stock alert", "reason": "Several products are running low.", "command": "Notify me when any product stock falls below 10 units"},
            {"title": "Order delay alert", "reason": "Some orders may be delayed.", "command": "Alert me if any order is not shipped within 48 hours"},
            {"title": "Daily sales report", "reason": "Get a nightly summary of sales.", "command": "Send me a PDF sales report every night at 9 PM"},
            {"title": "Re-engage customers", "reason": "Many customers are inactive.", "command": "Send a discount coupon to customers who haven't purchased in 30 days"},
        ]