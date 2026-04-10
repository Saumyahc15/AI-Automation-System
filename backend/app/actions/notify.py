import smtplib, os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from dotenv import load_dotenv

load_dotenv()

MAIL_HOST     = os.getenv("MAIL_HOST", "smtp.gmail.com")
MAIL_PORT     = int(os.getenv("MAIL_PORT", 587))
MAIL_USER     = os.getenv("MAIL_USER", "")
MAIL_PASSWORD = os.getenv("MAIL_PASSWORD", "")
MAIL_FROM     = os.getenv("MAIL_FROM", "")
MANAGER_EMAIL = os.getenv("MANAGER_EMAIL", "")


def send_email(to: str, subject: str, body: str, pdf_bytes: bytes = None, pdf_name: str = "report.pdf", config: dict = None):
    host = config.get("host") if config else MAIL_HOST
    port = config.get("port") if config else MAIL_PORT
    user = config.get("user") if config else MAIL_USER
    password = config.get("password") if config else MAIL_PASSWORD
    from_addr = config.get("from_addr") if config else MAIL_FROM

    if not user or not password:
        print(f"[EMAIL SKIP] No credentials set. Would send to {to}: {subject}")
        return

    msg = MIMEMultipart()
    msg["From"] = from_addr or user
    msg["To"] = to
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "html"))

    if pdf_bytes:
        part = MIMEApplication(pdf_bytes, Name=pdf_name)
        part["Content-Disposition"] = f'attachment; filename="{pdf_name}"'
        msg.attach(part)

    try:
        with smtplib.SMTP(host, port) as server:
            server.starttls()
            server.login(user, password)
            server.sendmail(from_addr or user, to, msg.as_string())
        print(f"[EMAIL OK] Sent to {to}: {subject}")
    except Exception as e:
        print(f"[EMAIL ERROR] {e}")
        raise


def notify_manager(subject: str, body: str, config: dict = None):
    manager_email = config.get("manager_email") if config and config.get("manager_email") else MANAGER_EMAIL
    send_email(manager_email, subject, body, config=config)


def email_supplier(supplier_email: str, product_name: str, current_stock: int, config: dict = None):
    from ..groq_client.client import ask_groq
    
    prompt = f"""
    Write a brief, professional reorder email for a retail store.
    Product: {product_name}
    Current stock: {current_stock} units
    The stock is low and we need a restock soon.
    Output ONLY the HTML body of the email. No subject, no greeting like 'Subject: ...'.
    """
    
    try:
        ai_body = ask_groq(prompt, system="You are a professional retail procurement manager.")
        # Ensure it's clean HTML
        if "<html>" not in ai_body.lower() and "<p>" not in ai_body.lower():
            ai_body = f"<p>{ai_body.replace(chr(10), '<br>')}</p>"
    except Exception:
        # Fallback if AI fails
        ai_body = f"""
        <p>Dear Supplier,</p>
        <p>Our stock for <strong>{product_name}</strong> has dropped to <strong>{current_stock} units</strong>.</p>
        <p>Please arrange a restock immediately.</p>
        """
    
    subject = f"Urgent Reorder: {product_name} (Stock: {current_stock})"
    send_email(supplier_email, subject, ai_body, config=config)


def send_whatsapp(to_number: str, message: str, config: dict = None):
    """Send WhatsApp message via Twilio. to_number format: '919876543210' (no +)"""
    import os
    try:
        from twilio.rest import Client
    except ImportError:
        print("[WHATSAPP SKIP] twilio not installed. Run: pip install twilio")
        return

    account_sid = (config or {}).get("twilio_sid") or os.getenv("TWILIO_SID", "")
    auth_token = (config or {}).get("twilio_token") or os.getenv("TWILIO_TOKEN", "")
    from_whatsapp = (config or {}).get("twilio_from") or os.getenv("TWILIO_FROM", "")

    if not account_sid or not auth_token or not from_whatsapp:
        print(f"[WHATSAPP SKIP] No Twilio credentials. Would send to {to_number}: {message[:60]}")
        return

    try:
        client = Client(account_sid, auth_token)
        client.messages.create(
            from_=f"whatsapp:{from_whatsapp}",
            to=f"whatsapp:+{to_number.lstrip('+')}",
            body=message
        )
        print(f"[WHATSAPP OK] Sent to +{to_number}")
    except Exception as e:
        print(f"[WHATSAPP ERROR] {e}")