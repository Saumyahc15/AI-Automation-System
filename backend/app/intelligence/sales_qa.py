from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from ..models import Order, OrderItem, Product, Customer
from ..groq_client.client import ask_groq


def build_sales_context(db: Session, user_id: int, days: int = 7) -> str:
    now = datetime.utcnow()
    cutoff = now - timedelta(days=days)

    recent_orders = db.query(Order).filter(Order.order_date >= cutoff, Order.user_id == user_id).all()
    total_revenue = sum(o.total_amount for o in recent_orders)
    status_counts = {}
    for o in recent_orders:
        status_counts[o.shipping_status] = status_counts.get(o.shipping_status, 0) + 1

    top_products = db.query(
        Product.name,
        func.sum(OrderItem.quantity).label("total_qty"),
        func.sum(OrderItem.quantity * OrderItem.unit_price).label("revenue")
    ).join(OrderItem).join(Order).filter(
        Order.order_date >= cutoff, Order.user_id == user_id
    ).group_by(Product.name).order_by(
        func.sum(OrderItem.quantity).desc()
    ).limit(5).all()

    low_stock = db.query(Product).filter(
        Product.stock <= Product.low_stock_threshold,
        Product.is_active == True,
        Product.user_id == user_id
    ).all()

    total_customers = db.query(Customer).filter(Customer.user_id == user_id).count()
    active_customers = db.query(Customer).filter(
        Customer.last_purchase >= cutoff,
        Customer.user_id == user_id
    ).count()
    inactive_customers = db.query(Customer).filter(
        Customer.last_purchase <= now - timedelta(days=30),
        Customer.user_id == user_id
    ).count()

    prev_cutoff = cutoff - timedelta(days=days)
    prev_orders = db.query(Order).filter(
        Order.order_date >= prev_cutoff,
        Order.order_date < cutoff,
        Order.user_id == user_id
    ).all()
    prev_revenue = sum(o.total_amount for o in prev_orders)
    revenue_change = ((total_revenue - prev_revenue) / prev_revenue * 100) if prev_revenue > 0 else 0

    # SYSTEM HEALTH: Recent automation executions
    from ..models import Workflow, ExecutionLog
    active_workflows = db.query(Workflow).filter(Workflow.is_active == True, Workflow.user_id == user_id).all()
    # Find execution logs for this user's workflows
    workflow_ids = [w.id for w in active_workflows]
    recent_logs = db.query(ExecutionLog).filter(ExecutionLog.workflow_id.in_(workflow_ids)).order_by(ExecutionLog.created_at.desc()).limit(10).all()

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

SYSTEM AUTOMATIONS:
- Active workflows: {len(active_workflows)} ({[w.trigger for w in active_workflows]})
- Recent executions:
{chr(10).join([f"  - [{l.created_at.strftime('%H:%M')}] {l.triggered_by}: {l.status} - {l.message}" for l in recent_logs]) or "  - No recent executions"}
"""

    return context.strip()


def answer_sales_question(db: Session, question: str, user_id: int) -> str:
    # 1. First check if it's an actionable command (like sending an email)
    if "send" in question.lower() and ("email" in question.lower() or "@" in question.lower() or "message" in question.lower()):
        extractor_prompt = f"""
        Extract the email address and message body from this command.
        Return ONLY valid JSON format: {{"intent": "send", "email": "extracted_email@example.com", "body": "extracted message body"}}
        If no email address is found, return {{"intent": "none"}}
        Command: {question}
        """
        try:
            import json, os
            ai_resp = ask_groq(extractor_prompt, system="You are an intent extractor. Reply purely in JSON.")
            data = json.loads(ai_resp[ai_resp.find("{"):ai_resp.rfind("}")+1])
            if data.get("intent") == "send" and data.get("email"):
                from ..actions.notify import send_email
                from ..models import UserConfig

                # Try user-specific config first
                config = db.query(UserConfig).filter(UserConfig.user_id == user_id).first()
                config_dict = None
                if config and config.smtp_user and config.smtp_password:
                    config_dict = {
                        "host": config.smtp_host or "smtp.gmail.com",
                        "port": config.smtp_port or 587,
                        "user": config.smtp_user,
                        "password": config.smtp_password,
                        "from_addr": config.mail_from or config.smtp_user
                    }
                else:
                    # Fall back to global .env SMTP credentials
                    MAIL_USER = os.getenv("MAIL_USER", "")
                    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD", "")
                    if MAIL_USER and MAIL_PASSWORD:
                        config_dict = {
                            "host": os.getenv("MAIL_HOST", "smtp.gmail.com"),
                            "port": int(os.getenv("MAIL_PORT", 587)),
                            "user": MAIL_USER,
                            "password": MAIL_PASSWORD,
                            "from_addr": os.getenv("MAIL_FROM", MAIL_USER)
                        }
                    else:
                        return "❌ Cannot send email: No SMTP credentials configured. Please set up your email settings in the Settings page."

                # Build a proper greeting if body is just "hello" or similar
                body_text = data.get("body", "Hello!")
                send_email(
                    to=data["email"],
                    subject="Greeting from RetailAI Store",
                    body=f"""<div style='font-family:Arial,sans-serif;padding:20px'>
                        <p>{body_text}</p>
                        <br/>
                        <p style='color:#666;font-size:12px'>Sent via RetailAI Automation System</p>
                    </div>""",
                    config=config_dict
                )
                return f"✅ Email sent successfully to {data['email']}!"
        except Exception as e:
            print("Failed to execute action intent:", e)
            return f"❌ Failed to send email: {str(e)}"

    context = build_sales_context(db, user_id=user_id, days=14)
    prompt = f"""You are a smart retail business analyst for an Indian retail store using the RetailAI system.

Here is the current business data:
{context}

The store owner asks: "{question}"

IMPORTANT: Respond in the same language the user used (Hindi, English, or Hinglish). 
If they ask in Hindi, reply in Hindi. If they use Hinglish, reply similarly.

Provide a detailed, comprehensive, and helpful answer. Do not be overly concise. Explain the numbers, provide context, and if applicable, suggest next steps based on the data. The owner will listen to this answer via text-to-speech, so make it clear, naturally paced, and easy to follow.
Do not mention that you were given data — just answer naturally as an expert analyst who knows the store's performance.
Make it conversational and reassuring for an Indian shop owner.

"""

    return ask_groq(
        prompt,
        system="You are a concise, data-driven retail business analyst. Answer questions using the provided store data."
    )