from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from ..database import SessionLocal
from ..models import Workflow, Product, Order, Customer
from .runner import run_actions


def get_matching_workflows(db: Session, trigger: str) -> list:
    return db.query(Workflow).filter(
        Workflow.trigger == trigger,
        Workflow.is_active == True
    ).all()


def evaluate_condition(condition: dict, value) -> bool:
    if not condition:
        return True
    op = condition.get("op")
    threshold = condition.get("value")
    if op == "<":  return value < threshold
    if op == ">":  return value > threshold
    if op == "<=": return value <= threshold
    if op == ">=": return value >= threshold
    if op == "==": return value == threshold
    return False


# Add this at module level (above the functions)
_stock_watcher_last_fired = {}   # key: (workflow_id, product_id) → datetime

# ─── Watcher 1: Stock watcher ────────────────────────────────────────────────
def run_stock_watcher():
    global _stock_watcher_last_fired
    db: Session = SessionLocal()
    try:
        workflows = get_matching_workflows(db, "inventory_update")
        if not workflows:
            return

        products = db.query(Product).filter(Product.is_active == True).all()
        now = datetime.utcnow()
        cooldown = timedelta(hours=1)   # only re-fire same product after 1 hour

        for wf in workflows:
            condition = wf.condition
            if not condition or condition.get("field") != "stock":
                continue

            for product in products:
                if evaluate_condition(condition, product.stock):
                    key = (wf.id, product.id)
                    last = _stock_watcher_last_fired.get(key)
                    if last and (now - last) < cooldown:
                        continue   # skip — already fired recently

                    _stock_watcher_last_fired[key] = now
                    context = {
                        "product_name": product.name,
                        "stock": product.stock,
                        "supplier_email": product.supplier.email if product.supplier else None,
                        "detail": (
                            f"<b>{product.name}</b> stock is now <b>{product.stock} units</b> "
                            f"(threshold: {condition['value']}). SKU: {product.sku}"
                        )
                    }
                    run_actions(wf, context, db, triggered_by="stock_watcher")
                    print(f"[STOCK WATCHER] Fired workflow '{wf.name}' for {product.name} (stock={product.stock})")
    finally:
        db.close()


# ─── Watcher 2: Order delay watcher ──────────────────────────────────────────
def run_order_watcher():
    db: Session = SessionLocal()
    try:
        workflows = get_matching_workflows(db, "order_created")
        if not workflows:
            return

        cutoff = datetime.utcnow() - timedelta(hours=48)
        delayed_orders = db.query(Order).filter(
            Order.shipping_status == "pending",
            Order.order_date <= cutoff
        ).all()

        for wf in workflows:
            for order in delayed_orders:
                hours_pending = (datetime.utcnow() - order.order_date.replace(tzinfo=None)).total_seconds() / 3600
                context = {
                    "detail": (
                        f"Order <b>#{order.id}</b> has been pending for "
                        f"<b>{hours_pending:.0f} hours</b> without shipping."
                    )
                }
                run_actions(wf, context, db, triggered_by="order_watcher")
                print(f"[ORDER WATCHER] Fired for order #{order.id}")
    finally:
        db.close()


# ─── Watcher 3: Customer inactivity watcher ───────────────────────────────────
def run_customer_watcher():
    db: Session = SessionLocal()
    try:
        workflows = get_matching_workflows(db, "scheduled_check")
        if not workflows:
            return

        for wf in workflows:
            condition = wf.condition  # e.g. {"field": "last_purchase", "op": ">", "value": "30_days"}
            if not condition or condition.get("field") != "last_purchase":
                continue

            days = int(str(condition.get("value", "30")).replace("_days", ""))
            cutoff = datetime.utcnow() - timedelta(days=days)

            inactive = db.query(Customer).filter(
                Customer.last_purchase <= cutoff
            ).all()

            for customer in inactive:
                context = {
                    "customer_name": customer.name,
                    "customer_email": customer.email,
                    "detail": (
                        f"Customer <b>{customer.name}</b> ({customer.email}) "
                        f"has not purchased in over {days} days."
                    )
                }
                run_actions(wf, context, db, triggered_by="customer_watcher")
                print(f"[CUSTOMER WATCHER] Fired for {customer.name}")
    finally:
        db.close()


# ─── Watcher 4: Cron — daily sales report ─────────────────────────────────────
def run_daily_report():
    from ..groq_client.client import ask_groq
    from ..actions.notify import send_email
    from ..actions.pdf_report import generate_sales_pdf
    import os

    db: Session = SessionLocal()
    try:
        workflows = db.query(Workflow).filter(
            Workflow.trigger.in_(["cron_21_00", "cron_09_00"]),
            Workflow.is_active == True
        ).all()
        if not workflows:
            return

        today = datetime.utcnow().date()
        start = datetime.combine(today, datetime.min.time())
        orders = db.query(Order).filter(Order.order_date >= start).all()

        orders_data = [{
            "id": o.id,
            "customer_id": o.customer_id,
            "total_amount": o.total_amount,
            "shipping_status": o.shipping_status,
            "order_date": str(o.order_date)
        } for o in orders]

        total_revenue = sum(o.total_amount for o in orders)
        summary_prompt = (
            f"Today's retail summary: {len(orders)} orders, "
            f"₹{total_revenue:.2f} total revenue. "
            f"Statuses: {[o.shipping_status for o in orders]}. "
            f"Write a 3-sentence business summary for the store owner."
        )
        summary = ask_groq(summary_prompt)
        pdf_bytes = generate_sales_pdf(orders_data, summary, str(today))

        for wf in workflows:
            context = {"detail": f"Daily report for {today}: {len(orders)} orders, ₹{total_revenue:.2f} revenue."}
            try:
                send_email(
                    to=os.getenv("MANAGER_EMAIL", ""),
                    subject=f"RetailAI Daily Report — {today}",
                    body=f"<p>{summary}</p><p>See attached PDF for full details.</p>",
                    pdf_bytes=pdf_bytes,
                    pdf_name=f"sales_report_{today}.pdf"
                )
            except Exception:
                pass
            run_actions(wf, context, db, triggered_by="cron_scheduler")
            print(f"[CRON] Daily report sent for {today}")
    finally:
        db.close()