from sqlalchemy.orm import Session
from datetime import datetime
from ..models import Workflow, ExecutionLog
from ..actions.notify import notify_manager, email_supplier
from ..actions.telegram import alert_manager


def log(db: Session, workflow_id: int, status: str, message: str, triggered_by: str):
    entry = ExecutionLog(
        workflow_id=workflow_id,
        status=status,
        message=message,
        triggered_by=triggered_by
    )
    db.add(entry)
    db.commit()


def run_actions(workflow: Workflow, context: dict, db: Session, triggered_by: str):
    """Execute each action in a workflow given a context dict."""
    errors = []

    for action in workflow.actions:
        try:
            if action == "notify_manager":
                alert_manager(
                    subject=f"RetailAI: {workflow.name}",
                    detail=context.get("detail", "Workflow triggered.")
                )
                notify_manager(
                    subject=f"RetailAI: {workflow.name}",
                    body=f"<p>{context.get('detail','Workflow triggered.')}</p>"
                )

            elif action == "email_supplier":
                if context.get("supplier_email"):
                    email_supplier(
                        supplier_email=context["supplier_email"],
                        product_name=context.get("product_name", "Unknown product"),
                        current_stock=context.get("stock", 0)
                    )

            elif action == "send_alert":
                alert_manager(
                    subject=f"RetailAI Alert: {workflow.name}",
                    detail=context.get("detail", "Alert triggered.")
                )

            elif action == "send_email":
                notify_manager(
                    subject=f"RetailAI: {workflow.name}",
                    body=f"<p>{context.get('detail','Workflow triggered.')}</p>"
                )

            elif action == "generate_pdf":
                # Handled separately in cron_runner.py
                pass

            elif action == "generate_coupon":
                coupon = f"RETAIL-{workflow.id}-{datetime.now().strftime('%d%m')}"
                alert_manager(
                    subject="Customer Re-engagement Coupon",
                    detail=f"Coupon generated: <code>{coupon}</code>\nFor: {context.get('customer_name','Customer')}"
                )

            elif action == "fetch_sales_data":
                pass  # handled in cron_runner

            elif action == "send_sms":
                # Falls back to Telegram if Twilio not configured
                alert_manager(
                    subject="Customer SMS",
                    detail=context.get("detail", "SMS triggered.")
                )

        except Exception as e:
            errors.append(f"{action}: {str(e)}")

    status = "failed" if errors else "success"
    message = "; ".join(errors) if errors else f"All actions completed. Context: {context.get('detail','')}"
    log(db, workflow.id, status, message, triggered_by)

    # Update last_run
    workflow.last_run = datetime.utcnow()
    db.commit()