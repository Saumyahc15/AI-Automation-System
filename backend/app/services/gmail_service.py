import base64
import os
import logging
from typing import Optional
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from app.config import settings
from app.database import SessionLocal
from app.models.gmail_thread_state import GmailThreadState
from app.services.llm_parser import classify_supplier_reply_intent

logger = logging.getLogger(__name__)
SCOPES = [
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/gmail.readonly",
]


def is_gmail_authenticated(user_id: int = None) -> bool:
    """Check if Gmail is already authenticated for a user."""
    if user_id:
        token_file = settings.GMAIL_TOKEN_FILE.replace(".json", f"_user_{user_id}.json")
    else:
        token_file = settings.GMAIL_TOKEN_FILE
    return os.path.exists(token_file)


def get_gmail_service(user_id: int = None):
    """Get Gmail API service with user-specific credential management."""
    creds = None
    
    # Use user-specific token file if user_id provided
    if user_id:
        token_file = settings.GMAIL_TOKEN_FILE.replace(".json", f"_user_{user_id}.json")
    else:
        token_file = settings.GMAIL_TOKEN_FILE
    
    # Try to load existing token
    if os.path.exists(token_file):
        try:
            creds = Credentials.from_authorized_user_file(token_file, SCOPES)
        except Exception as e:
            logger.warning(f"Failed to load Gmail token from {token_file}: {e}")
            creds = None
    
    # Refresh expired credentials or get new ones
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
            except Exception as e:
                logger.error(f"Failed to refresh Gmail credentials: {e}")
                raise Exception("Gmail credentials expired and could not be refreshed")
        else:
            # Token doesn't exist - need to authorize
            if not os.path.exists(settings.GMAIL_CREDENTIALS_FILE):
                raise Exception(f"Gmail credentials file not found: {settings.GMAIL_CREDENTIALS_FILE}")
            
            try:
                flow = InstalledAppFlow.from_client_secrets_file(
                    settings.GMAIL_CREDENTIALS_FILE, SCOPES
                )
                # Try to run local server for OAuth
                creds = flow.run_local_server(port=0, open_browser=True)
            except Exception as e:
                logger.error(f"Gmail OAuth flow failed: {e}")
                raise Exception(f"Gmail authentication required. Please authorize the app: {e}")
    
    # Save updated credentials to user-specific file
    try:
        os.makedirs(os.path.dirname(token_file), exist_ok=True)
        with open(token_file, "w") as f:
            f.write(creds.to_json())
    except Exception as e:
        logger.warning(f"Could not save Gmail token to {token_file}: {e}")
    
    return build("gmail", "v1", credentials=creds)


def send_email(to: str, subject: str, body_html: str, attachment_path: str = None, user_id: int = None) -> Optional[dict]:
    try:
        service = get_gmail_service(user_id)
        message = MIMEMultipart("alternative")
        message["to"] = to
        message["subject"] = subject
        message.attach(MIMEText(body_html, "html"))

        if attachment_path and os.path.exists(attachment_path):
            with open(attachment_path, "rb") as f:
                part = MIMEBase("application", "octet-stream")
                part.set_payload(f.read())
                encoders.encode_base64(part)
                part.add_header(
                    "Content-Disposition",
                    f"attachment; filename={os.path.basename(attachment_path)}",
                )
                message.attach(part)

        raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
        response = service.users().messages().send(userId="me", body={"raw": raw}).execute()
        logger.info(f"Email sent to {to}: {subject}")
        return {
            "id": response.get("id"),
            "threadId": response.get("threadId"),
            "labelIds": response.get("labelIds", []),
        }
    except Exception as e:
        logger.error(f"Failed to send email to {to}: {e}")
        return None


def _get_or_create_label(service, label_name: str) -> str:
    labels = service.users().labels().list(userId="me").execute().get("labels", [])
    for label in labels:
        if label.get("name") == label_name:
            return label["id"]

    created = service.users().labels().create(
        userId="me",
        body={
            "name": label_name,
            "labelListVisibility": "labelShow",
            "messageListVisibility": "show",
        },
    ).execute()
    return created["id"]


def _get_label_map(service) -> dict:
    labels = service.users().labels().list(userId="me").execute().get("labels", [])
    return {label.get("name"): label.get("id") for label in labels}


def apply_label_to_message(message_id: str, label_name: str, user_id: int = None):
    if not message_id:
        return
    service = get_gmail_service(user_id)
    label_id = _get_or_create_label(service, label_name)
    service.users().messages().modify(
        userId="me",
        id=message_id,
        body={"addLabelIds": [label_id]},
    ).execute()


def modify_thread_labels(thread_id: str, add_label_names: list = None, remove_label_names: list = None):
    service = get_gmail_service()
    label_map = _get_label_map(service)
    add_label_ids = []
    remove_label_ids = []

    for name in add_label_names or []:
        label_id = label_map.get(name)
        if not label_id:
            label_id = _get_or_create_label(service, name)
        add_label_ids.append(label_id)

    for name in remove_label_names or []:
        label_id = label_map.get(name)
        if label_id:
            remove_label_ids.append(label_id)

    service.users().threads().modify(
        userId="me",
        id=thread_id,
        body={"addLabelIds": add_label_ids, "removeLabelIds": remove_label_ids},
    ).execute()


def archive_thread(thread_id: str):
    modify_thread_labels(thread_id, remove_label_names=["INBOX"])


def mark_thread_read(thread_id: str):
    modify_thread_labels(thread_id, remove_label_names=["UNREAD"])


def get_recent_thread_replies(query: str = "", max_results: int = 10, user_id: int = None) -> list:
    """
    Read recent inbox messages/replies for workflow follow-up handling.
    query example: 'from:supplier@example.com newer_than:7d'
    """
    try:
        service = get_gmail_service(user_id)
        response = service.users().messages().list(
            userId="me",
            q=query,
            maxResults=max_results,
        ).execute()
        messages = response.get("messages", [])
        results = []
        for msg in messages:
            full = service.users().messages().get(
                userId="me", id=msg["id"], format="metadata",
                metadataHeaders=["From", "Subject", "Date"]
            ).execute()
            headers = {h["name"]: h["value"] for h in full.get("payload", {}).get("headers", [])}
            results.append({
                "id": full.get("id"),
                "threadId": full.get("threadId"),
                "snippet": full.get("snippet"),
                "from": headers.get("From"),
                "subject": headers.get("Subject"),
                "date": headers.get("Date"),
            })
        return results
    except Exception as e:
        logger.error(f"Failed to get recent thread replies: {e}")
        raise


def get_thread_messages(thread_id: str, user_id: int = None) -> list:
    """Return parsed messages in a Gmail thread."""
    try:
        service = get_gmail_service(user_id)
        thread = service.users().threads().get(userId="me", id=thread_id).execute()
        parsed = []
        for msg in thread.get("messages", []):
            headers = {h["name"]: h["value"] for h in msg.get("payload", {}).get("headers", [])}
            parsed.append({
                "id": msg.get("id"),
                "threadId": msg.get("threadId"),
                "snippet": msg.get("snippet"),
                "internalDate": msg.get("internalDate"),
                "from": headers.get("From"),
                "to": headers.get("To"),
                "subject": headers.get("Subject"),
                "date": headers.get("Date"),
            })
        return parsed
    except Exception as e:
        logger.error(f"Failed to get thread messages for {thread_id}: {e}")
        raise


def send_thread_reply(thread_id: str, to: str, subject: str, body_html: str, label_name: str = "", user_id: int = None) -> Optional[dict]:
    """Send a reply into an existing Gmail thread."""
    try:
        service = get_gmail_service(user_id)
        message = MIMEText(body_html, "html")
        message["to"] = to
        message["subject"] = subject
        raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
        response = service.users().messages().send(
            userId="me",
            body={"raw": raw, "threadId": thread_id},
        ).execute()
        if label_name and response.get("id"):
            apply_label_to_message(response["id"], label_name, user_id)
        return {"id": response.get("id"), "threadId": response.get("threadId")}
    except Exception as e:
        logger.error(f"Failed to send thread reply: {e}")
        return None


# ─── TEMPLATE EMAILS ──────────────────────────────────────────────────────────

def send_low_stock_alert(product_name: str, stock: int, threshold: int, supplier_email: str, to_email: str = None, user_id: int = None):
    if not to_email:
        to_email = settings.MANAGER_EMAIL
    subject = f"🚨 Low Stock Alert: {product_name} ({stock} units left)"
    body = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;padding:24px;border:1px solid #eee;border-radius:8px">
      <h2 style="color:#dc2626">⚠️ Low Stock Alert</h2>
      <p>The following product has dropped below its reorder threshold:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr style="background:#f3f4f6"><td style="padding:8px;font-weight:bold">Product</td><td style="padding:8px">{product_name}</td></tr>
        <tr><td style="padding:8px;font-weight:bold">Current Stock</td><td style="padding:8px;color:#dc2626"><strong>{stock} units</strong></td></tr>
        <tr style="background:#f3f4f6"><td style="padding:8px;font-weight:bold">Threshold</td><td style="padding:8px">{threshold} units</td></tr>
        <tr><td style="padding:8px;font-weight:bold">Supplier</td><td style="padding:8px">{supplier_email}</td></tr>
      </table>
      <p style="color:#6b7280;font-size:12px">This alert was sent automatically by your Retail AI Agent.</p>
    </div>
    """
    send_email(to_email, subject, body, user_id=user_id)


def send_supplier_purchase_order(supplier_email: str, product_name: str, sku: str, quantity: int, estimated_cost: float, user_id: int = None):
    subject = f"Purchase Order Request — {product_name}"
    body = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;padding:24px;border:1px solid #eee;border-radius:8px">
      <h2 style="color:#1d4ed8">📦 Purchase Order</h2>
      <p>Dear Supplier,</p>
      <p>We would like to place the following purchase order:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr style="background:#f3f4f6"><td style="padding:8px;font-weight:bold">Product</td><td style="padding:8px">{product_name}</td></tr>
        <tr><td style="padding:8px;font-weight:bold">SKU</td><td style="padding:8px">{sku or 'N/A'}</td></tr>
        <tr style="background:#f3f4f6"><td style="padding:8px;font-weight:bold">Quantity Requested</td><td style="padding:8px"><strong>{quantity} units</strong></td></tr>
        <tr><td style="padding:8px;font-weight:bold">Estimated Value</td><td style="padding:8px">₹{estimated_cost:,.2f}</td></tr>
      </table>
      <p>Please confirm availability and expected delivery date at your earliest convenience.</p>
      <p>Best regards,<br><strong>Retail Automation System</strong></p>
    </div>
    """
    result = send_email(supplier_email, subject, body, user_id=user_id)
    if result and result.get("id"):
        apply_label_to_message(result["id"], "Retail-AI/Purchase-Orders", user_id)


def send_daily_sales_report(pdf_path: str, total_orders: int, total_revenue: float, ai_narrative: str = "", to_email: str = None, user_id: int = None, target_date=None):
    if not to_email:
        to_email = settings.MANAGER_EMAIL
    from datetime import date
    report_date = target_date if target_date else date.today()
    subject = f"📊 Daily Sales Report — {report_date}"
    ai_block = ""
    if ai_narrative:
        ai_block = f"""
        <div style="margin-top:16px;padding:12px;background:#ecfeff;border:1px solid #bae6fd;border-radius:8px">
          <h3 style="margin:0 0 8px 0;color:#0c4a6e">AI Sales Insight</h3>
          <pre style="white-space:pre-wrap;margin:0;font-family:Arial,sans-serif">{ai_narrative}</pre>
        </div>
        """

    body = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;padding:24px;border:1px solid #eee;border-radius:8px">
      <h2 style="color:#059669">📊 Daily Sales Report</h2>
      <p>Here is your sales summary for today:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr style="background:#f3f4f6"><td style="padding:8px;font-weight:bold">Total Orders</td><td style="padding:8px">{total_orders}</td></tr>
        <tr><td style="padding:8px;font-weight:bold">Total Revenue</td><td style="padding:8px"><strong>₹{total_revenue:,.2f}</strong></td></tr>
      </table>
      {ai_block}
      <p>Full report is attached as PDF.</p>
    </div>
    """
    send_email(to_email, subject, body, attachment_path=pdf_path, user_id=user_id)


def send_inventory_report(pdf_path: str, total_products: int, total_value: float, low_stock_count: int, to_email: str = None, user_id: int = None, target_date=None):
    if not to_email:
        to_email = settings.MANAGER_EMAIL
    from datetime import date
    report_date = target_date if target_date else date.today()
    subject = f"📦 Inventory Report — {report_date}"

    body = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;padding:24px;border:1px solid #eee;border-radius:8px">
      <h2 style="color:#059669">📦 Inventory Report</h2>
      <p>Here is your inventory summary:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr style="background:#f3f4f6"><td style="padding:8px;font-weight:bold">Total Products</td><td style="padding:8px">{total_products}</td></tr>
        <tr><td style="padding:8px;font-weight:bold">Low Stock Items</td><td style="padding:8px"><strong>{low_stock_count}</strong></td></tr>
        <tr style="background:#f3f4f6"><td style="padding:8px;font-weight:bold">Total Value</td><td style="padding:8px">₹{total_value:,.2f}</td></tr>
      </table>
      <p>Full report is attached as PDF.</p>
    </div>
    """
    send_email(to_email, subject, body, attachment_path=pdf_path, user_id=user_id)


def send_customer_report(pdf_path: str, total_customers: int, new_customers: int, inactive_customers: int, to_email: str = None, user_id: int = None, target_date=None):
    if not to_email:
        to_email = settings.MANAGER_EMAIL
    from datetime import date
    report_date = target_date if target_date else date.today()
    subject = f"👥 Customer Report — {report_date}"

    body = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;padding:24px;border:1px solid #eee;border-radius:8px">
      <h2 style="color:#059669">👥 Customer Report</h2>
      <p>Here is your customer summary:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr style="background:#f3f4f6"><td style="padding:8px;font-weight:bold">Total Customers</td><td style="padding:8px">{total_customers}</td></tr>
        <tr><td style="padding:8px;font-weight:bold">New Customers</td><td style="padding:8px"><strong>{new_customers}</strong></td></tr>
        <tr style="background:#f3f4f6"><td style="padding:8px;font-weight:bold">Inactive Customers</td><td style="padding:8px">{inactive_customers}</td></tr>
      </table>
      <p>Full report is attached as PDF.</p>
    </div>
    """
    send_email(to_email, subject, body, attachment_path=pdf_path, user_id=user_id)


def send_custom_report(pdf_path: str, report_name: str, to_email: str = None, user_id: int = None):
    if not to_email:
        to_email = settings.MANAGER_EMAIL
    subject = f"📊 Custom Report: {report_name}"

    body = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;padding:24px;border:1px solid #eee;border-radius:8px">
      <h2 style="color:#059669">📊 Custom Report Generated</h2>
      <p>Your custom report "<strong>{report_name}</strong>" has been successfully generated.</p>
      <p>Please find the report attached to this email as a PDF.</p>
    </div>
    """
    send_email(to_email, subject, body, attachment_path=pdf_path, user_id=user_id)


def send_customer_reengagement(customer_email: str, customer_name: str, days_inactive: int, coupon_code: str, user_id: int = None):
    subject = f"We miss you, {customer_name}! Here's a special offer 🎁"
    body = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;padding:24px;border:1px solid #eee;border-radius:8px">
      <h2 style="color:#7c3aed">We Miss You! 💜</h2>
      <p>Hi <strong>{customer_name}</strong>,</p>
      <p>It's been <strong>{days_inactive} days</strong> since your last purchase and we'd love to see you back.</p>
      <p>Here's a special discount code just for you:</p>
      <div style="text-align:center;padding:20px;background:#f5f3ff;border-radius:8px;margin:16px 0">
        <span style="font-size:28px;font-weight:bold;color:#7c3aed;letter-spacing:4px">{coupon_code}</span>
      </div>
      <p>Use this code at checkout for <strong>10% off</strong> your next order.</p>
      <p>Best wishes,<br><strong>Your Store Team</strong></p>
    </div>
    """
    send_email(customer_email, subject, body, user_id=user_id)


def send_order_delay_alert(order_id: int, customer_email: str, customer_name: str, hours_delayed: float, manager_email: str = None, user_id: int = None):
    if not manager_email:
        manager_email = settings.MANAGER_EMAIL
    # Alert manager
    send_email(
        manager_email,
        f"⚠️ Order #{order_id} Delayed ({int(hours_delayed)}h)",
        f"<p>Order <strong>#{order_id}</strong> has not been shipped after <strong>{int(hours_delayed)} hours</strong>. Please review immediately.</p>",
        user_id=user_id
    )
    # Alert customer
    if customer_email:
        send_email(
            customer_email,
            f"Update on your order #{order_id}",
            f"""<div style="font-family:Arial,sans-serif;padding:24px">
            <p>Hi {customer_name},</p>
            <p>We sincerely apologize — your order <strong>#{order_id}</strong> has been delayed.
            Our team is working to resolve this as quickly as possible.</p>
            <p>We'll send you an update as soon as it ships. Thank you for your patience.</p>
            </div>""",
            user_id=user_id
        )


def send_return_rate_alert(product_name: str, return_rate: float, total_returns: int):
    subject = f"🔄 High Return Rate Alert: {product_name} ({return_rate:.1f}%)"
    body = f"""
    <div style="font-family:Arial,sans-serif;padding:24px;border:1px solid #eee;border-radius:8px">
      <h2 style="color:#d97706">High Return Rate Detected</h2>
      <p>Product <strong>{product_name}</strong> has an unusually high return rate this week:</p>
      <ul>
        <li>Return Rate: <strong style="color:#dc2626">{return_rate:.1f}%</strong></li>
        <li>Total Returns: {total_returns}</li>
      </ul>
      <p>Please review the product listing and customer feedback.</p>
    </div>
    """
    send_email(settings.MANAGER_EMAIL, subject, body)


def send_workflow_failure_alert(workflow_id: int, workflow_name: str, error: str):
    send_email(
        settings.MANAGER_EMAIL,
        f"❌ Workflow #{workflow_id} Failed",
        f"""<div style="font-family:Arial,sans-serif;padding:24px">
        <h2 style="color:#dc2626">Workflow Execution Failed</h2>
        <p><strong>Workflow:</strong> {workflow_name}</p>
        <p><strong>Error:</strong></p>
        <pre style="background:#f3f4f6;padding:12px;border-radius:6px">{error}</pre>
        </div>"""
    )


def send_ai_morning_summary(summary_text: str):
    send_email(
        settings.MANAGER_EMAIL,
        "🌅 AI Morning Store Summary",
        f"""
        <div style="font-family:Arial,sans-serif;padding:24px;border:1px solid #eee;border-radius:8px">
          <h2 style="color:#0f766e">Your Morning Business Briefing</h2>
          <p>Good morning! Here's how your store is doing:</p>
          <pre style="white-space:pre-wrap;background:#f8fafc;padding:12px;border-radius:6px">{summary_text}</pre>
        </div>
        """,
    )


def run_thread_lifecycle_rules() -> dict:
    """
    Advanced Gmail automation:
    - Auto-archive stale replied threads.
    - Mark purchase-order threads as confirmed + archive on supplier confirmation replies.
    """
    service = get_gmail_service()
    stats = {
        "archived_replied_threads": 0,
        "confirmed_po_threads": 0,
        "rejected_po_threads": 0,
        "followup_po_threads": 0,
    }
    db = SessionLocal()
    try:
        # Rule 1: Replied threads older than 7 days -> archive + mark read.
        stale_reply_threads = service.users().threads().list(
            userId="me",
            q='label:"Retail-AI/Replied" older_than:7d in:inbox',
            maxResults=50,
        ).execute().get("threads", [])
        for th in stale_reply_threads:
            try:
                thread_id = th["id"]
                archive_thread(thread_id)
                mark_thread_read(thread_id)
                modify_thread_labels(thread_id, add_label_names=["Retail-AI/Archived"])
                _upsert_thread_state(
                    db, thread_id, lifecycle_status="archived", intent="unclear", sender="", snippet=""
                )
                stats["archived_replied_threads"] += 1
            except Exception as e:
                logger.warning(f"Could not archive replied thread {th.get('id')}: {e}")

        # Rule 2: PO threads with supplier intent classification.
        po_threads = service.users().threads().list(
            userId="me",
            q='label:"Retail-AI/Purchase-Orders" newer_than:30d',
            maxResults=50,
        ).execute().get("threads", [])

        for th in po_threads:
            try:
                thread_id = th["id"]
                thread = service.users().threads().get(userId="me", id=thread_id).execute()
                messages = thread.get("messages", [])
                if len(messages) < 2:
                    continue
                latest = messages[-1]
                headers = {h["name"]: h["value"] for h in latest.get("payload", {}).get("headers", [])}
                from_value = (headers.get("From") or "").lower()
                # Skip if latest message appears to be from manager account.
                if settings.MANAGER_EMAIL.lower() in from_value:
                    continue
                intent = classify_supplier_reply_intent(
                    subject=headers.get("Subject", ""),
                    snippet=latest.get("snippet", ""),
                    from_value=from_value,
                )
                if intent == "confirmed":
                    modify_thread_labels(
                        thread_id,
                        add_label_names=["Retail-AI/PO-Confirmed"],
                        remove_label_names=["INBOX", "UNREAD"],
                    )
                    _upsert_thread_state(
                        db, thread_id, lifecycle_status="confirmed", intent=intent,
                        sender=from_value, snippet=latest.get("snippet", "")
                    )
                    stats["confirmed_po_threads"] += 1
                elif intent == "rejected":
                    modify_thread_labels(
                        thread_id,
                        add_label_names=["Retail-AI/PO-Rejected", "Retail-AI/Needs-Attention"],
                        remove_label_names=["UNREAD"],
                    )
                    _upsert_thread_state(
                        db, thread_id, lifecycle_status="rejected", intent=intent,
                        sender=from_value, snippet=latest.get("snippet", "")
                    )
                    stats["rejected_po_threads"] += 1
                elif intent == "follow_up":
                    modify_thread_labels(
                        thread_id,
                        add_label_names=["Retail-AI/PO-FollowUp", "Retail-AI/Needs-Attention"],
                        remove_label_names=["UNREAD"],
                    )
                    _upsert_thread_state(
                        db, thread_id, lifecycle_status="follow_up", intent=intent,
                        sender=from_value, snippet=latest.get("snippet", "")
                    )
                    stats["followup_po_threads"] += 1
            except Exception as e:
                logger.warning(f"PO lifecycle check failed for thread {th.get('id')}: {e}")

        db.commit()
        return stats
    finally:
        db.close()


def _upsert_thread_state(db, thread_id: str, lifecycle_status: str, intent: str, sender: str, snippet: str):
    state = db.query(GmailThreadState).filter(GmailThreadState.thread_id == thread_id).first()
    if not state:
        state = GmailThreadState(thread_id=thread_id)
        db.add(state)
    state.lifecycle_status = lifecycle_status
    state.last_intent = intent
    state.last_sender = sender[:255] if sender else ""
    state.last_message_snippet = (snippet or "")[:1000]