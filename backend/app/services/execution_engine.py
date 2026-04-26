import logging
import random
import string
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import SessionLocal
from app.models.workflow import Workflow
from app.models.workflow_log import WorkflowLog
from app.models.product import Product
from app.models.order import Order
from app.models.customer import Customer
from app.models.user import User
from app.models.returns import Return
from app.models.purchase_order import PurchaseOrder
from app.models.coupon import Coupon
from app.models.delay_analytics import DelayAnalytics
from app.services import gmail_service
from app.config import settings

logger = logging.getLogger(__name__)


def run_all_active_workflows():
    """Called every 15 minutes by APScheduler. The heart of the engine."""
    db = SessionLocal()
    try:
        workflows = db.query(Workflow).filter(Workflow.is_active == True).all()
        logger.info(f"Running {len(workflows)} active workflows")
        for wf in workflows:
            try:
                _execute_workflow(wf, db)
            except Exception as e:
                logger.error(f"Workflow {wf.workflow_id} crashed: {e}")
                _log(db, wf.workflow_id, "failed", error=str(e))
                # Alert manager about the failure
                try:
                    gmail_service.send_workflow_failure_alert(
                        wf.workflow_id, wf.natural_language_input[:80], str(e)
                    )
                except Exception:
                    pass
    finally:
        db.close()


def execute_event_workflows_for_order(order_id: int):
    """
    Real-time execution path triggered right after order creation.
    Runs matching order-event workflows immediately instead of waiting for batch scheduler.
    """
    db = SessionLocal()
    try:
        order = db.query(Order).filter(Order.order_id == order_id).first()
        if not order:
            return

        workflows = db.query(Workflow).filter(
            Workflow.is_active == True,
            Workflow.trigger_type.in_(["order_event", "order_created"])
        ).all()

        for wf in workflows:
            try:
                condition = wf.condition_json or {}
                field = condition.get("field", "order_age_hours")
                op = condition.get("operator", ">")
                value = condition.get("value", 48)
                triggered_items = []

                if field == "daily_units_sold":
                    if not order.product_id:
                        continue
                    yesterday = datetime.utcnow() - timedelta(days=1)
                    total_qty = db.query(func.sum(Order.quantity)).filter(
                        Order.product_id == order.product_id,
                        Order.order_date >= yesterday
                    ).scalar() or 0
                    if _eval(total_qty, op, value):
                        product = db.query(Product).filter(
                            Product.product_id == order.product_id
                        ).first()
                        if product:
                            triggered_items.append({
                                "type": "product",
                                "product": product,
                                "daily_qty": total_qty
                            })

                if triggered_items:
                    for item in triggered_items:
                        for action in (wf.actions_json or []):
                            _dispatch(action, item, db, wf)
                    wf.last_executed_at = datetime.utcnow()
                    db.commit()
                    _log(
                        db,
                        wf.workflow_id,
                        "success",
                        output=f"Real-time order event triggered {len(triggered_items)} item(s)",
                        items=len(triggered_items),
                    )
            except Exception as e:
                logger.error(f"Real-time workflow {wf.workflow_id} failed: {e}")
                _log(db, wf.workflow_id, "failed", error=str(e))
    finally:
        db.close()


def execute_workflow_by_id(workflow_id: int):
    """Run a single workflow by ID (used by per-workflow scheduler jobs)."""
    db = SessionLocal()
    try:
        wf = db.query(Workflow).filter(
            Workflow.workflow_id == workflow_id,
            Workflow.is_active == True
        ).first()
        if not wf:
            return
        _execute_workflow(wf, db)
    except Exception as e:
        logger.error(f"Workflow {workflow_id} crashed: {e}")
        _log(db, workflow_id, "failed", error=str(e))
        try:
            gmail_service.send_workflow_failure_alert(
                workflow_id, f"workflow-{workflow_id}", str(e)
            )
        except Exception:
            pass
    finally:
        db.close()


def _execute_workflow(wf: Workflow, db: Session):
    trigger = wf.trigger_type
    condition = wf.condition_json or {}
    actions = wf.actions_json or []

    triggered_items = []

    if trigger == "inventory_check":
        triggered_items = _check_inventory(db, condition)

    elif trigger == "order_event":
        triggered_items = _check_orders(db, condition)

    elif trigger == "customer_check":
        triggered_items = _check_customers(db, condition)

    elif trigger == "cron":
        # Always fires when called by cron scheduler — items = 1 dummy item
        triggered_items = [{"type": "scheduled"}]

    elif trigger == "return_check":
        triggered_items = _check_return_rates(db, condition)

    for item in triggered_items:
        for action in actions:
            _dispatch(action, item, db, wf)

    wf.last_executed_at = datetime.utcnow()
    db.commit()
    _log(db, wf.workflow_id, "success",
         output=f"Triggered {len(triggered_items)} item(s)",
         items=len(triggered_items))


# ─── CONDITION CHECKERS ────────────────────────────────────────────────────────

def _check_inventory(db: Session, condition: dict) -> list:
    field = condition.get("field", "stock")
    op = condition.get("operator", "<")
    value = condition.get("value", 10)
    products = db.query(Product).filter(Product.is_active == True).all()
    return [
        {"type": "product", "product": p}
        for p in products
        if _eval(getattr(p, field, None), op, value)
    ]


def _check_orders(db: Session, condition: dict) -> list:
    field = condition.get("field", "order_age_hours")
    op = condition.get("operator", ">")
    value = condition.get("value", 48)

    if field == "order_age_hours":
        cutoff = datetime.utcnow() - timedelta(hours=value)
        orders = db.query(Order).filter(
            Order.order_date < cutoff,
            Order.shipping_status == "pending"
        ).all()
        results = []
        for o in orders:
            age_hours = (datetime.utcnow() - o.order_date).total_seconds() / 3600
            customer = db.query(Customer).filter(
                Customer.customer_id == o.customer_id
            ).first() if o.customer_id else None
            results.append({"type": "order", "order": o, "customer": customer, "age_hours": age_hours})
        return results

    elif field == "daily_units_sold":
        yesterday = datetime.utcnow() - timedelta(days=1)
        results_raw = (
            db.query(Product, func.sum(Order.quantity).label("total_qty"))
            .join(Order, Order.product_id == Product.product_id)
            .filter(Order.order_date >= yesterday)
            .group_by(Product.product_id)
            .having(_sqlalchemy_having(func.sum(Order.quantity), op, value))
            .all()
        )
        return [{"type": "product", "product": r[0], "daily_qty": r[1]} for r in results_raw]

    return []


def _check_customers(db: Session, condition: dict) -> list:
    days = condition.get("value", 30)
    cutoff = datetime.utcnow() - timedelta(days=days)
    customers = db.query(Customer).filter(
        Customer.last_purchase_date < cutoff
    ).all()
    return [{"type": "customer", "customer": c} for c in customers]


def _check_return_rates(db: Session, condition: dict) -> list:
    threshold = condition.get("value", 15)
    week_ago = datetime.utcnow() - timedelta(days=7)
    products = db.query(Product).filter(Product.is_active == True).all()
    results = []
    for p in products:
        total_orders = db.query(func.count(Order.order_id)).filter(
            Order.product_id == p.product_id,
            Order.order_date >= week_ago
        ).scalar() or 0
        total_returns = db.query(func.count(Return.return_id)).filter(
            Return.product_id == p.product_id,
            Return.return_date >= week_ago
        ).scalar() or 0
        if total_orders > 0:
            rate = (total_returns / total_orders) * 100
            if rate > threshold:
                results.append({
                    "type": "return_rate",
                    "product": p,
                    "return_rate": rate,
                    "total_returns": total_returns
                })
    return results


# ─── ACTION DISPATCHER ────────────────────────────────────────────────────────

def _dispatch(action: str, item: dict, db: Session, wf: Workflow = None):
    product = item.get("product")
    customer = item.get("customer")
    order = item.get("order")
    notification_channel = _resolve_notification_channel(wf)
    
    # Get the user's email and user_id if workflow is associated with a user
    user_email = None
    user_id = None
    if wf and wf.user_id:
        user = db.query(User).filter(User.user_id == wf.user_id).first()
        if user:
            user_email = user.email
            user_id = user.user_id

    if action == "notify_manager":
        if notification_channel in ["gmail", "both"]:
            if product:
                gmail_service.send_low_stock_alert(
                    product.name, product.stock,
                    product.reorder_threshold,
                    product.supplier_email or "N/A",
                    to_email=user_email,
                    user_id=user_id
                )
            elif order:
                age = item.get("age_hours", 0)
                cust = item.get("customer")
                gmail_service.send_order_delay_alert(
                    order.order_id,
                    cust.email if cust else None,
                    cust.name if cust else "Customer",
                    age,
                    manager_email=user_email,
                    user_id=user_id
                )
                # Persist delay to analytics table
                _log_delay(db, order, cust, age, wf)

    elif action == "gmail_alert_manager":
        if product:
            gmail_service.send_low_stock_alert(
                product.name, product.stock,
                product.reorder_threshold,
                product.supplier_email or "N/A",
                to_email=user_email,
                user_id=user_id
            )
        elif order:
            age = item.get("age_hours", 0)
            cust = item.get("customer")
            gmail_service.send_order_delay_alert(
                order.order_id,
                cust.email if cust else None,
                cust.name if cust else "Customer",
                age,
                manager_email=user_email,
                user_id=user_id
            )
            # Persist delay to analytics table
            _log_delay(db, order, cust, age, wf)

    elif action == "email_supplier":
        if product and product.supplier_email:
            qty = max(20, int((product.avg_daily_sales or 1) * 30))
            estimated_cost = qty * product.price
            gmail_service.send_supplier_purchase_order(
                product.supplier_email, product.name,
                product.sku or "", qty, estimated_cost,
                user_id=user_id
            )
            # Save purchase order record
            po = PurchaseOrder(
                product_id=product.product_id,
                supplier_email=product.supplier_email,
                quantity_ordered=qty,
                estimated_cost=estimated_cost,
            )
            db.add(po)
            db.flush()

    elif action == "create_purchase_order":
        # Same as email_supplier but without emailing
        if product:
            qty = max(20, int((product.avg_daily_sales or 1) * 30))
            po = PurchaseOrder(
                product_id=product.product_id,
                supplier_email=product.supplier_email or "",
                quantity_ordered=qty,
                estimated_cost=qty * product.price,
            )
            db.add(po)
            db.flush()

    elif action == "send_customer_email":
        if customer:
            days_inactive = (datetime.utcnow() - customer.last_purchase_date).days \
                if customer.last_purchase_date else 30
            coupon_code = _generate_coupon()
            # Persist coupon to DB
            db_coupon = Coupon(
                code=coupon_code,
                customer_id=customer.customer_id,
                discount_percent=10.0,
                workflow_id=wf.workflow_id if wf else None,
            )
            db.add(db_coupon)
            db.flush()
            gmail_service.send_customer_reengagement(
                customer.email, customer.name, days_inactive, coupon_code,
                user_id=user_id
            )

    elif action == "generate_pdf_report":
        from app.services.pdf_service import generate_sales_report, generate_inventory_report, generate_customer_report
        from app.services.sheets_service import sync_inventory_to_sheet
        from app.services.llm_parser import generate_sales_report_narrative
        
        target_date = datetime.utcnow().date()
        if wf and wf.natural_language_input and "yesterday" in wf.natural_language_input.lower():
            target_date = target_date - timedelta(days=1)
            
        report_type = "sales"
        if wf and wf.natural_language_input:
            nlp_lower = wf.natural_language_input.lower()
            if "inventory" in nlp_lower:
                report_type = "inventory"
            elif "customer" in nlp_lower:
                report_type = "customers"

        if report_type == "inventory":
            pdf_path = generate_inventory_report(db, target_date=target_date)
            products = db.query(Product).filter(Product.is_active == True).all()
            total_products = len(products)
            low_stock_count = sum(1 for p in products if p.stock > 0 and p.stock < p.reorder_threshold)
            total_value = sum(p.stock * p.price for p in products)
            gmail_service.send_inventory_report(
                pdf_path, total_products, total_value, low_stock_count, to_email=user_email,
                user_id=user_id, target_date=target_date
            )
        elif report_type == "customers":
            pdf_path = generate_customer_report(db, target_date=target_date)
            
            start = datetime.combine(target_date, datetime.min.time())
            end = datetime.combine(target_date, datetime.max.time())
            thirty_days_ago = end - timedelta(days=30)
            
            total_customers = db.query(Customer).count()
            new_customers = db.query(Customer).filter(Customer.created_at >= start, Customer.created_at <= end).count()
            inactive_customers = db.query(Customer).filter(Customer.last_purchase_date < thirty_days_ago).count()
            
            gmail_service.send_customer_report(
                pdf_path, total_customers, new_customers, inactive_customers, to_email=user_email,
                user_id=user_id, target_date=target_date
            )
        else:
            ai_narrative = generate_sales_report_narrative(db, target_date=target_date)
            pdf_path = generate_sales_report(db, ai_narrative=ai_narrative, target_date=target_date)
            
            start = datetime.combine(target_date, datetime.min.time())
            end = datetime.combine(target_date, datetime.max.time())
            
            total_orders = db.query(func.count(Order.order_id)).filter(Order.order_date >= start, Order.order_date <= end).scalar() or 0
            revenue = db.query(func.sum(Order.total_price)).filter(Order.order_date >= start, Order.order_date <= end).scalar() or 0
            gmail_service.send_daily_sales_report(
                pdf_path, total_orders, revenue, ai_narrative=ai_narrative, to_email=user_email,
                user_id=user_id, target_date=target_date
            )
        sync_inventory_to_sheet()

    elif action == "sync_to_sheets":
        from app.services.sheets_service import sync_inventory_to_sheet
        sync_inventory_to_sheet()

    elif action == "return_rate_alert":
        if item.get("type") == "return_rate":
            gmail_service.send_return_rate_alert(
                product.name, item["return_rate"], item["total_returns"]
            )

    elif action == "send_ai_morning_summary":
        from app.services.llm_parser import generate_morning_summary
        summary = generate_morning_summary(db)
        gmail_service.send_ai_morning_summary(summary)


# ─── HELPERS ──────────────────────────────────────────────────────────────────

def _eval(val, op, threshold):
    if val is None:
        return False
    try:
        ops = {
            "<": lambda a, b: a < b,
            ">": lambda a, b: a > b,
            "==": lambda a, b: a == b,
            ">=": lambda a, b: a >= b,
            "<=": lambda a, b: a <= b,
        }
        comparator = ops.get(op)
        if not comparator:
            return False
        return comparator(val, threshold)
    except Exception:
        return False

def _sqlalchemy_having(col, op, value):
    from sqlalchemy import and_
    ops = {"<": col < value, ">": col > value, ">=": col >= value,
           "<=": col <= value, "==": col == value}
    return ops.get(op, col > value)

def _generate_coupon(length=8) -> str:
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=length))


def _log_delay(db: Session, order, customer, delay_hours: float, wf: Workflow = None):
    """Persist an order delay event to the DelayAnalytics table."""
    try:
        record = DelayAnalytics(
            order_id=order.order_id,
            customer_id=customer.customer_id if customer else None,
            product_id=order.product_id if hasattr(order, 'product_id') else None,
            delay_hours=round(delay_hours, 2),
            workflow_id=wf.workflow_id if wf else None,
            alert_sent_to_manager="gmail",
            alert_sent_to_customer=customer.email if customer else None,
        )
        db.add(record)
        db.flush()
    except Exception as e:
        logger.warning(f"Failed to log delay analytics: {e}")


def _resolve_notification_channel(wf: Workflow = None) -> str:
    if not wf:
        return "gmail"
    channel = getattr(wf, "notification_channel", None)
    if channel:
        return channel
    # Backward compatibility for old rows without dedicated column value.
    condition = getattr(wf, "condition_json", {}) or {}
    return condition.get("notification_channel", "gmail")

def _log(db: Session, workflow_id: int, status: str,
         output: str = None, error: str = None, items: int = 0):
    log = WorkflowLog(
        workflow_id=workflow_id,
        status=status,
        output=output,
        error_message=error,
        items_triggered=items
    )
    db.add(log)
    db.commit()