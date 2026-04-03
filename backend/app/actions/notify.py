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


def send_email(to: str, subject: str, body: str, pdf_bytes: bytes = None, pdf_name: str = "report.pdf"):
    if not MAIL_USER or not MAIL_PASSWORD:
        print(f"[EMAIL SKIP] No credentials set. Would send to {to}: {subject}")
        return

    msg = MIMEMultipart()
    msg["From"] = MAIL_FROM
    msg["To"] = to
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "html"))

    if pdf_bytes:
        part = MIMEApplication(pdf_bytes, Name=pdf_name)
        part["Content-Disposition"] = f'attachment; filename="{pdf_name}"'
        msg.attach(part)

    try:
        with smtplib.SMTP(MAIL_HOST, MAIL_PORT) as server:
            server.starttls()
            server.login(MAIL_USER, MAIL_PASSWORD)
            server.sendmail(MAIL_FROM, to, msg.as_string())
        print(f"[EMAIL OK] Sent to {to}: {subject}")
    except Exception as e:
        print(f"[EMAIL ERROR] {e}")
        raise


def notify_manager(subject: str, body: str):
    send_email(MANAGER_EMAIL, subject, body)


def email_supplier(supplier_email: str, product_name: str, current_stock: int):
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
    send_email(supplier_email, subject, ai_body)