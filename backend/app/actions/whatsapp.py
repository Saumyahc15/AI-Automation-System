import os
from dotenv import load_dotenv

load_dotenv()

# For a real implementation, you'd use Twilio or WhatsApp Cloud API
# Here we simulate it by logging it beautifully and optionally sending to Telegram as a fallback

def send_whatsapp(to_phone: str, message: str):
    """
    Simulates sending a WhatsApp message.
    In a real project, use Twilio:
    client.messages.create(from_='whatsapp:+14155238886', to=f'whatsapp:{to_phone}', body=message)
    """
    print(f"\n[WHATSAPP SIMULATION] 📱 To: {to_phone}")
    print(f"[WHATSAPP MESSAGE] {message}\n")
    
    # Optional: If you want it to actually show up somewhere during a live demo
    # We can forward it to Telegram if TELEGRAM_BOT_TOKEN is set
    from .telegram import send_telegram
    send_telegram(f"<b>[SIMULATED WHATSAPP]</b>\nTo: {to_phone}\n\n{message}")

def whatsapp_alert(phone: str, subject: str, detail: str):
    message = f"*{subject}*\n\n{detail.replace('<b>','').replace('</b>','')}"
    send_whatsapp(phone, message)
