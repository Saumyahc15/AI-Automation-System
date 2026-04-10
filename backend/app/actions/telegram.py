import os, asyncio
from dotenv import load_dotenv

load_dotenv()

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
CHAT_ID   = os.getenv("TELEGRAM_CHAT_ID", "")


def send_telegram(message: str, bot_token: str = None, chat_id: str = None):
    token = bot_token or BOT_TOKEN
    chat = chat_id or CHAT_ID
    if not token or not chat:
        print(f"[TELEGRAM SKIP] No credentials. Message: {message}")
        return

    async def _send():
        from telegram import Bot
        bot = Bot(token=token)
        await bot.send_message(chat_id=chat, text=message, parse_mode="HTML")

    try:
        asyncio.run(_send())
        print(f"[TELEGRAM OK] {message[:60]}...")
    except Exception as e:
        print(f"[TELEGRAM ERROR] {e}")
        raise


def alert_manager(subject: str, detail: str, bot_token: str = None, chat_id: str = None):
    message = f"<b>RetailAI Alert</b>\n<b>{subject}</b>\n\n{detail}"
    send_telegram(message, bot_token, chat_id)