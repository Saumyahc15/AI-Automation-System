import os, asyncio
from dotenv import load_dotenv

load_dotenv()

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
CHAT_ID   = os.getenv("TELEGRAM_CHAT_ID", "")


def send_telegram(message: str):
    if not BOT_TOKEN or not CHAT_ID:
        print(f"[TELEGRAM SKIP] No credentials. Message: {message}")
        return

    async def _send():
        from telegram import Bot
        bot = Bot(token=BOT_TOKEN)
        await bot.send_message(chat_id=CHAT_ID, text=message, parse_mode="HTML")

    try:
        asyncio.run(_send())
        print(f"[TELEGRAM OK] {message[:60]}...")
    except Exception as e:
        print(f"[TELEGRAM ERROR] {e}")
        raise


def alert_manager(subject: str, detail: str):
    message = f"<b>RetailAI Alert</b>\n<b>{subject}</b>\n\n{detail}"
    send_telegram(message)