import requests
import logging
from typing import Dict, Optional
from app.core.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

class MessagingService:
    """
    Handles various messaging platforms
    """
    
    @staticmethod
    def send_telegram_message(bot_token: str = None, chat_id: str = None, message: str = None) -> Dict:
        """
        Send message via Telegram Bot
        Uses environment variables if bot_token and chat_id not provided
        """
        try:
            # Use provided credentials or fall back to environment variables
            token = bot_token or getattr(settings, 'TELEGRAM_BOT_TOKEN', None)
            chat = chat_id or getattr(settings, 'TELEGRAM_CHAT_ID', None)
            msg = message if message is not None else ""
            
            # Validate credentials
            if not token or not chat:
                logger.error("Telegram credentials not configured")
                return {
                    "status": "error",
                    "message": "Telegram bot token or chat ID not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env file"
                }
            
            # Validate message
            if not msg or msg.strip() == "":
                logger.error("Telegram message is empty")
                return {
                    "status": "error",
                    "message": "Cannot send empty message to Telegram"
                }
            
            url = f"https://api.telegram.org/bot{token}/sendMessage"
            
            payload = {
                "chat_id": str(chat),
                "text": str(msg),
                "parse_mode": "HTML"
            }
            
            logger.info(f"Sending Telegram message to chat {chat}")
            logger.debug(f"Message content: {msg[:100]}...")
            
            response = requests.post(url, json=payload, timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                logger.info(f"Telegram message sent successfully")
                return {
                    "status": "success",
                    "message": "Message sent via Telegram",
                    "chat_id": chat,
                    "message_id": result.get("result", {}).get("message_id")
                }
            else:
                error_data = response.json()
                error_desc = error_data.get('description', 'Unknown error')
                logger.error(f"Telegram API error: {error_desc}")
                return {
                    "status": "error",
                    "message": f"Telegram API error: {error_desc}",
                    "error_code": error_data.get('error_code')
                }
                
        except requests.exceptions.Timeout:
            logger.error("Telegram API timeout")
            return {
                "status": "error",
                "message": "Telegram API timeout - request took too long"
            }
        except Exception as e:
            logger.error(f"Failed to send Telegram message: {str(e)}")
            return {
                "status": "error",
                "message": str(e)
            }
    
    @staticmethod
    def send_whatsapp_message(phone_number: str, message: str = "", access_token: str = None) -> Dict:
        """
        Send WhatsApp message via Cloud API
        Uses environment variables if access_token not provided
        """
        try:
            # Validate message
            if not message or message.strip() == "":
                logger.error("WhatsApp message is empty")
                return {
                    "status": "error",
                    "message": "Cannot send empty message to WhatsApp"
                }
            
            # Try WhatsApp Cloud API first
            try:
                from app.integrations.whatsapp_service import WhatsAppService
                
                # Use provided token or environment variable
                token = access_token or getattr(settings, 'WHATSAPP_ACCESS_TOKEN', None)
                
                if token:
                    whatsapp = WhatsAppService(access_token=token)
                    result = whatsapp.send_message(phone_number, message)
                    
                    if result.get("status") == "success":
                        return result
                    else:
                        logger.warning(f"WhatsApp Cloud API returned: {result.get('message')}")
            except ImportError:
                logger.debug("WhatsApp service not available")
            except Exception as e:
                logger.warning(f"WhatsApp Cloud API failed: {str(e)}")
            
            # Try Twilio WhatsApp as fallback
            try:
                from app.integrations.twilio_whatsapp import TwilioWhatsAppService
                
                twilio = TwilioWhatsAppService()
                result = twilio.send_message(phone_number, message)
                
                if result.get("status") == "success":
                    return result
            except ImportError:
                logger.debug("Twilio not installed")
            except Exception as e:
                logger.warning(f"Twilio WhatsApp failed: {str(e)}")
            
            # Fallback: Mock mode
            logger.info(f"[MOCK] WhatsApp to {phone_number}: {message[:50]}...")
            return {
                "status": "success",
                "message": f"WhatsApp sent to {phone_number} (mock mode - setup WhatsApp API for real messages)",
                "phone": phone_number,
                "note": "Configure WHATSAPP_ACCESS_TOKEN or Twilio credentials in .env"
            }
            
        except Exception as e:
            logger.error(f"Failed to send WhatsApp message: {str(e)}")
            return {
                "status": "error",
                "message": str(e)
            }
    
    @staticmethod
    def send_sms(phone_number: str, message: str = "") -> Dict:
        """
        Send SMS via Twilio
        """
        try:
            if not message or message.strip() == "":
                return {
                    "status": "error",
                    "message": "Cannot send empty SMS"
                }
            
            try:
                from twilio.rest import Client
                
                account_sid = getattr(settings, 'TWILIO_ACCOUNT_SID', None)
                auth_token = getattr(settings, 'TWILIO_AUTH_TOKEN', None)
                from_number = getattr(settings, 'TWILIO_PHONE_NUMBER', None)
                
                if not all([account_sid, auth_token, from_number]):
                    return {
                        "status": "info",
                        "message": "SMS requires Twilio account with phone number. Visit https://www.twilio.com/try-twilio",
                        "phone": phone_number
                    }
                
                client = Client(account_sid, auth_token)
                
                message_response = client.messages.create(
                    from_=from_number,
                    body=message,
                    to=phone_number
                )
                
                logger.info(f"SMS sent to {phone_number}")
                return {
                    "status": "success",
                    "message": f"SMS sent to {phone_number}",
                    "sid": message_response.sid
                }
            except ImportError:
                return {
                    "status": "info",
                    "message": "SMS requires Twilio. Install with: pip install twilio"
                }
            
        except Exception as e:
            logger.error(f"Failed to send SMS: {str(e)}")
            return {
                "status": "error",
                "message": str(e)
            }