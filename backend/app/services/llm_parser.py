import groq
import json
import logging
from app.config import settings

logger = logging.getLogger(__name__)
client = groq.Groq(api_key=settings.GROQ_API_KEY)

PARSE_SYSTEM = """
You are a retail workflow automation parser. Convert natural language instructions into
structured JSON workflows for a retail management system.

IMPORTANT: Return ONLY raw JSON — no markdown fences, no explanation.

JSON structure:
{
  "trigger_type": "inventory_check | order_event | customer_check | cron | return_check | sheet_edit",
  "notification_channel": "gmail | sms | both",
  "condition": {
    "field": "stock | order_age_hours | days_since_purchase | return_rate_percent | daily_units_sold | automation_status | sheet_column | sheet_value",
    "operator": "< | > | == | >= | <=",
    "value": <number>
  },
  "actions": [
    "notify_manager",
    "gmail_alert_manager",
    "email_supplier",
    "generate_pdf_report",
    "send_sms_manager",
    "send_customer_email",
    "create_purchase_order",
    "sync_to_sheets",
    "return_rate_alert",
    "send_ai_morning_summary"
  ],
  "frequency": "every_15_min | every_1_hour | every_6_hours | daily | weekly | cron:CRON_EXPR",
  "extra": {
    "report_type": "sales | inventory | customers",
    "cron_time": "21:00"
  }
}

Examples:
- "alert me when stock < 5" → trigger_type: inventory_check, condition: {field:stock, operator:<, value:5}
- "email supplier when stock falls below 10" → actions include email_supplier
- "send PDF report at 9pm daily" → trigger_type: cron, frequency: cron:0 21 * * *, actions: [generate_pdf_report]
- "notify customer if order not shipped in 48 hours" → trigger_type: order_event, condition: {field:order_age_hours, operator:>, value:48}
- "alert me by SMS when stock < 8" → notification_channel:sms, actions:[notify_manager]
- "alert me by email and SMS when stock < 8" → notification_channel:both, actions:[notify_manager]
- "when sheet status changes to reorder, email supplier" → trigger_type: sheet_edit, condition:{field:automation_status, operator:==, value:reorder}, actions:[email_supplier]
- "alert me if return rate exceeds 15% in a week" → trigger_type: return_check, condition: {field:return_rate_percent, operator:>, value:15}, actions:[return_rate_alert]
- "send me AI morning summary at 8am daily" → trigger_type: cron, frequency: cron:0 8 * * *, actions:[send_ai_morning_summary]
"""

def parse_workflow(natural_language: str) -> dict:
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        max_tokens=600,
        messages=[
            {"role": "system", "content": PARSE_SYSTEM},
            {"role": "user", "content": natural_language}
        ]
    )
    raw = response.choices[0].message.content.strip().replace("```json", "").replace("```", "").strip()
    return json.loads(raw)


def nl_query_to_answer(question: str, db) -> dict:
    """
    Translate a natural language question into SQL, run it, return
    a human-readable answer — no SQL knowledge needed by the manager.
    """
    from sqlalchemy import text

    schema = """
    Tables:
    - products(product_id, name, stock, price, category, avg_daily_sales, reorder_threshold)
    - orders(order_id, product_id, customer_id, quantity, total_price, order_date, shipping_status)
    - customers(customer_id, name, email, total_orders, lifetime_value, last_purchase_date)
    - returns(return_id, order_id, product_id, reason, return_date, status)
    - purchase_orders(po_id, product_id, supplier_email, quantity_ordered, sent_at, status)
    """

    sql_prompt = f"""
You are a PostgreSQL expert. Write a single SELECT query to answer this question.
Return ONLY the SQL query, nothing else. No markdown fences.

{schema}

Question: {question}
"""
    sql_resp = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        max_tokens=300,
        messages=[{"role": "user", "content": sql_prompt}]
    )
    sql = sql_resp.choices[0].message.content.strip()

    try:
        result = db.execute(text(sql)).fetchall()
        rows = [dict(r._mapping) for r in result]
    except Exception as e:
        return {"question": question, "sql": sql, "error": str(e), "answer": "Could not run query."}

    # Ask Claude to explain the result in plain language
    explain_prompt = f"""
Question: {question}
SQL run: {sql}
Result: {json.dumps(rows[:20], default=str)}

Give a clear 1-2 sentence plain English answer. Be specific with numbers.
"""
    explain_resp = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        max_tokens=200,
        messages=[{"role": "user", "content": explain_prompt}]
    )

    return {
        "question": question,
        "sql": sql,
        "raw_result": rows,
        "answer": explain_resp.choices[0].message.content.strip()
    }


def suggest_workflows(db) -> str:
    from app.models.product import Product
    from app.models.customer import Customer
    from app.models.order import Order
    from datetime import datetime, timedelta

    low_stock = db.query(Product).filter(Product.stock < 15).count()
    out_of_stock = db.query(Product).filter(Product.stock == 0).count()
    cutoff_30 = datetime.utcnow() - timedelta(days=30)
    inactive_customers = db.query(Customer).filter(
        Customer.last_purchase_date < cutoff_30
    ).count()
    pending_orders = db.query(Order).filter(Order.shipping_status == "pending").count()

    summary = (
        f"Low stock products: {low_stock}, Out of stock: {out_of_stock}, "
        f"Inactive customers (30d): {inactive_customers}, Pending orders: {pending_orders}"
    )

    prompt = f"""
You are a retail operations AI. Based on this real store data, suggest exactly 3 specific
automation workflows the manager should set up right now. Each suggestion should be in plain
English (how a manager would type it into the system).

Data: {summary}

Format:
1. [workflow suggestion]
2. [workflow suggestion]
3. [workflow suggestion]
"""
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        max_tokens=300,
        messages=[{"role": "user", "content": prompt}]
    )
    return response.choices[0].message.content.strip()


def explain_failure(logs: list) -> str:
    prompt = f"""
A retail automation workflow failed. Explain in 2-3 plain English sentences why it failed
and what the manager should do to fix it.

Logs: {json.dumps(logs, default=str)}
"""
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        max_tokens=200,
        messages=[{"role": "user", "content": prompt}]
    )
    return response.choices[0].message.content.strip()


def generate_morning_summary(db) -> str:
    from app.models.order import Order
    from app.models.product import Product
    from app.models.customer import Customer
    from datetime import datetime, timedelta
    from sqlalchemy import func

    yesterday = datetime.utcnow() - timedelta(days=1)
    orders_yesterday = db.query(Order).filter(Order.order_date >= yesterday).count()
    revenue = db.query(func.sum(Order.total_price)).filter(Order.order_date >= yesterday).scalar() or 0
    low_stock_count = db.query(Product).filter(Product.stock < 10).count()
    new_customers = db.query(Customer).filter(Customer.created_at >= yesterday).count()
    pending = db.query(Order).filter(Order.shipping_status == "pending").count()

    prompt = f"""
Generate a crisp 5-bullet morning business summary for a retail store manager.
Be specific with numbers. Use emojis for each bullet point.

Data from last 24h:
- Orders placed: {orders_yesterday}
- Revenue: ₹{revenue:,.2f}
- Low stock products: {low_stock_count}
- New customers: {new_customers}
- Pending/unshipped orders: {pending}
"""
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        max_tokens=300,
        messages=[{"role": "user", "content": prompt}]
    )
    return response.choices[0].message.content.strip()


def generate_sales_report_narrative(db, target_date=None) -> str:
    """
    Generate a short AI narrative for the daily sales report email/PDF.
    """
    from app.models.order import Order
    from app.models.product import Product
    from datetime import datetime, timedelta
    from sqlalchemy import func

    if target_date:
        today_start = datetime.combine(target_date, datetime.min.time())
        end_date = datetime.combine(target_date, datetime.max.time())
    else:
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        end_date = datetime.utcnow()

    yesterday_start = today_start - timedelta(days=1)

    today_orders = db.query(func.count(Order.order_id)).filter(Order.order_date >= today_start, Order.order_date <= end_date).scalar() or 0
    today_revenue = db.query(func.sum(Order.total_price)).filter(Order.order_date >= today_start, Order.order_date <= end_date).scalar() or 0

    y_orders = db.query(func.count(Order.order_id)).filter(
        Order.order_date >= yesterday_start, Order.order_date < today_start
    ).scalar() or 0
    y_revenue = db.query(func.sum(Order.total_price)).filter(
        Order.order_date >= yesterday_start, Order.order_date < today_start
    ).scalar() or 0

    top_product = (
        db.query(Product.name, func.sum(Order.quantity).label("qty"))
        .join(Order, Order.product_id == Product.product_id)
        .filter(Order.order_date >= today_start, Order.order_date <= end_date)
        .group_by(Product.name)
        .order_by(func.sum(Order.quantity).desc())
        .first()
    )
    top_product_name = top_product[0] if top_product else "N/A"
    top_product_qty = int(top_product[1]) if top_product else 0

    prompt = f"""
Write a concise 3-bullet retail sales narrative for today's report.
Each bullet should be one short sentence with a concrete insight.

Data:
- Today's orders: {today_orders}
- Today's revenue: ₹{today_revenue:,.2f}
- Yesterday's orders: {y_orders}
- Yesterday's revenue: ₹{y_revenue:,.2f}
- Top product today: {top_product_name} ({top_product_qty} units)
"""
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        max_tokens=220,
        messages=[{"role": "user", "content": prompt}]
    )
    return response.choices[0].message.content.strip()


def classify_supplier_reply_intent(subject: str, snippet: str, from_value: str) -> str:
    """
    Classify supplier reply intent for thread lifecycle automation.
    Returns one of: confirmed | rejected | follow_up | unclear
    """
    prompt = f"""
Classify this supplier email reply intent into exactly one token:
confirmed, rejected, follow_up, unclear

Subject: {subject}
From: {from_value}
Snippet: {snippet}

Rules:
- confirmed: supplier accepts/approves/commits shipment
- rejected: supplier declines/cannot fulfill/out of stock
- follow_up: asks questions, needs clarification, waiting details
- unclear: anything else

Return ONLY one token.
"""
    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            max_tokens=20,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = (response.choices[0].message.content or "").strip().lower()
        token = raw.split()[0] if raw else "unclear"
        if token in {"confirmed", "rejected", "follow_up", "unclear"}:
            return token
        return "unclear"
    except Exception:
        return "unclear"
