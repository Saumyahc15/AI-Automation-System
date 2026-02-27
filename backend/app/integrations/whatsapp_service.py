import requests
import logging
from typing import Dict, Optional
from app.core.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

class WhatsAppService:
    """
    WhatsApp Cloud API Service
    """
    
    def __init__(self, phone_number_id: str = None, access_token: str = None):
        """
        Initialize WhatsApp service
        """
        self.phone_number_id = phone_number_id or settings.WHATSAPP_PHONE_NUMBER_ID
        self.access_token = access_token or settings.WHATSAPP_ACCESS_TOKEN
        self.api_version = settings.WHATSAPP_API_VERSION
        self.base_url = f"https://graph.facebook.com/{self.api_version}/{self.phone_number_id}"
    
    def send_message(self, to: str, message: str, message_type: str = "text") -> Dict:
        """
        Send a WhatsApp message
        
        Args:
            to: Recipient phone number with country code (e.g., "919876543210")
            message: Message text
            message_type: Type of message (text, template, etc.)
        """
        try:
            if not self.phone_number_id or not self.access_token:
                logger.error("WhatsApp credentials not configured")
                return {
                    "status": "error",
                    "message": "WhatsApp not configured. Set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN in .env"
                }
            
            # Remove + from phone number if present
            to = to.replace("+", "").replace("-", "").replace(" ", "")
            
            url = f"{self.base_url}/messages"
            
            headers = {
                "Authorization": f"Bearer {self.access_token}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": to,
                "type": "text",
                "text": {
                    "preview_url": False,
                    "body": message
                }
            }
            
            logger.info(f"Sending WhatsApp message to {to}")
            response = requests.post(url, json=payload, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                logger.info(f"WhatsApp message sent successfully. Message ID: {data.get('messages', [{}])[0].get('id')}")
                return {
                    "status": "success",
                    "message": f"WhatsApp message sent to {to}",
                    "message_id": data.get('messages', [{}])[0].get('id'),
                    "phone": to
                }
            else:
                error_data = response.json()
                error_message = error_data.get('error', {}).get('message', 'Unknown error')
                logger.error(f"WhatsApp API error: {error_message}")
                return {
                    "status": "error",
                    "message": f"WhatsApp API error: {error_message}",
                    "error_code": error_data.get('error', {}).get('code'),
                    "details": error_data
                }
        
        except requests.exceptions.Timeout:
            logger.error("WhatsApp API request timeout")
            return {
                "status": "error",
                "message": "Request timeout - WhatsApp API did not respond in time"
            }
        except Exception as e:
            logger.error(f"Failed to send WhatsApp message: {str(e)}")
            return {
                "status": "error",
                "message": str(e)
            }
    
    def send_template_message(self, to: str, template_name: str, language_code: str = "en_US") -> Dict:
        """
        Send a template message (pre-approved by Meta)
        
        Args:
            to: Recipient phone number
            template_name: Name of approved template (e.g., "hello_world")
            language_code: Template language (e.g., "en_US")
        """
        try:
            if not self.phone_number_id or not self.access_token:
                return {
                    "status": "error",
                    "message": "WhatsApp not configured"
                }
            
            to = to.replace("+", "").replace("-", "").replace(" ", "")
            url = f"{self.base_url}/messages"
            
            headers = {
                "Authorization": f"Bearer {self.access_token}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "messaging_product": "whatsapp",
                "to": to,
                "type": "template",
                "template": {
                    "name": template_name,
                    "language": {
                        "code": language_code
                    }
                }
            }
            
            logger.info(f"Sending WhatsApp template '{template_name}' to {to}")
            response = requests.post(url, json=payload, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                return {
                    "status": "success",
                    "message": f"Template message sent to {to}",
                    "message_id": data.get('messages', [{}])[0].get('id')
                }
            else:
                error_data = response.json()
                return {
                    "status": "error",
                    "message": error_data.get('error', {}).get('message', 'Unknown error')
                }
        
        except Exception as e:
            logger.error(f"Failed to send template: {str(e)}")
            return {
                "status": "error",
                "message": str(e)
            }
    
    def get_media_url(self, media_id: str) -> Optional[str]:
        """
        Get media URL from media ID
        """
        try:
            url = f"https://graph.facebook.com/{self.api_version}/{media_id}"
            headers = {"Authorization": f"Bearer {self.access_token}"}
            
            response = requests.get(url, headers=headers, timeout=10)
            
            if response.status_code == 200:
                return response.json().get('url')
            return None
        
        except Exception as e:
            logger.error(f"Failed to get media URL: {str(e)}")
            return None