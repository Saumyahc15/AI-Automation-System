from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from ..database import get_db
from ..models import Order, OrderItem, Product, Customer
from ..groq_client.client import ask_groq

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/summary")
def get_summary(days: int = Query(default=30, ge=1, le=365), db: Session = Depends(get_db)):
    """Revenue, orders, top products over last N days."""
    cutoff = datetime.utcnow() - timedelta(days=days)

    orders = db.query(Order).filter(Order.order_date >= cutoff).all()
    total_revenue = sum(o.total_amount for o in orders)

    # Daily revenue breakdown
    daily = {}
    for o in orders:
        day = o.order_date.strftime("%Y-%m-%d")
        daily[day] = daily.get(day, 0) + o.total_amount
    daily_series = [{"date": k, "revenue": round(v, 2)} for k, v in sorted(daily.items())]

    # Top products
    top_products = db.query(
        Product.name,
        Product.category,
        func.sum(OrderItem.quantity).label("units_sold"),
        func.sum(OrderItem.quantity * OrderItem.unit_price).label("revenue")
    ).join(OrderItem).join(Order).filter(
        Order.order_date >= cutoff
    ).group_by(Product.name, Product.category).order_by(
        func.sum(OrderItem.quantity * OrderItem.unit_price).desc()
    ).limit(10).all()

    # Revenue by category
    by_category = db.query(
        Product.category,
        func.sum(OrderItem.quantity * OrderItem.unit_price).label("revenue")
    ).join(OrderItem).join(Order).filter(
        Order.order_date >= cutoff
    ).group_by(Product.category).order_by(
        func.sum(OrderItem.quantity * OrderItem.unit_price).desc()
    ).all()

    # Order status breakdown
    status_counts = {}
    for o in orders:
        status_counts[o.shipping_status] = status_counts.get(o.shipping_status, 0) + 1

    # Compare with previous period
    prev_cutoff = cutoff - timedelta(days=days)
    prev_orders = db.query(Order).filter(
        Order.order_date >= prev_cutoff,
        Order.order_date < cutoff
    ).all()
    prev_revenue = sum(o.total_amount for o in prev_orders)
    revenue_change = round(((total_revenue - prev_revenue) / prev_revenue * 100), 1) if prev_revenue > 0 else 0

    return {
        "period_days": days,
        "total_orders": len(orders),
        "total_revenue": round(total_revenue, 2),
        "prev_revenue": round(prev_revenue, 2),
        "revenue_change_pct": revenue_change,
        "avg_order_value": round(total_revenue / len(orders), 2) if orders else 0,
        "daily_revenue": daily_series,
        "top_products": [
            {"name": p.name, "category": p.category, "units_sold": p.units_sold, "revenue": round(p.revenue, 2)}
            for p in top_products
        ],
        "by_category": [
            {"category": c.category, "revenue": round(c.revenue, 2)}
            for c in by_category
        ],
        "status_breakdown": status_counts,
    }


@router.get("/debug-workflow/{workflow_id}")
def debug_workflow(workflow_id: int, db: Session = Depends(get_db)):
    """Ask Groq to explain why a workflow may not have fired as expected."""
    from ..models import Workflow, ExecutionLog

    workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not workflow:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Workflow not found")

    logs = db.query(ExecutionLog).filter(
        ExecutionLog.workflow_id == workflow_id
    ).order_by(ExecutionLog.created_at.desc()).limit(10).all()

    log_summary = "\n".join([
        f"- [{l.created_at.strftime('%Y-%m-%d %H:%M')}] status={l.status} triggered_by={l.triggered_by} message={l.message}"
        for l in logs
    ]) if logs else "No execution logs found for this workflow."

    prompt = f"""You are a retail automation debugging assistant.

Workflow details:
- Name: {workflow.name}
- Trigger: {workflow.trigger}
- Condition: {workflow.condition}
- Actions: {workflow.actions}
- Is active: {workflow.is_active}
- Last run: {workflow.last_run}

Recent execution logs:
{log_summary}

The store owner wants to know: why might this workflow not be firing as expected?
Provide a clear, specific explanation in 3-5 sentences.
If there are errors in the logs, explain what they mean in plain English.
If no logs exist, explain what conditions need to be met for it to fire."""

    explanation = ask_groq(prompt, system="You are a helpful retail automation debugging assistant. Be specific and practical.")

    return {
        "workflow_id": workflow_id,
        "workflow_name": workflow.name,
        "is_active": workflow.is_active,
        "last_run": str(workflow.last_run) if workflow.last_run else None,
        "log_count": len(logs),
        "explanation": explanation
    }