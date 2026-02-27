import base64
import email
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

try:
    from google.oauth2.credentials import Credentials
except ImportError:
    Credentials = None

from googleapiclient.discovery import build
from typing import List, Dict, Optional
import logging

logger = logging.getLogger(__name__)

class GmailService:
    def __init__(self, credentials_dict: dict = None):
        """
        Initialize Gmail service
        
        Args:
            credentials_dict: Google OAuth credentials dictionary (if None, auto-loads from credentials.json)
        """
        # Auto-load credentials if not provided
        if credentials_dict is None:
            try:
                from app.core.google_credentials import GoogleCredentialsManager
                credentials_dict = GoogleCredentialsManager.get_credentials()
                if credentials_dict:
                    logger.info("✅ Auto-loaded Google credentials from credentials.json")
            except Exception as e:
                logger.warning(f"Could not auto-load credentials: {e}")
        
        self.credentials = credentials_dict
        self.service = None
        
        if credentials_dict:
            # Handle both dict and installed app formats
            creds_data = credentials_dict.get('installed', credentials_dict)
            
            # Try to create Credentials object if available
            if Credentials:
                creds = Credentials(
                    token=creds_data.get('token'),
                    refresh_token=creds_data.get('refresh_token'),
                    token_uri=creds_data.get('token_uri', 'https://oauth2.googleapis.com/token'),
                    client_id=creds_data.get('client_id'),
                    client_secret=creds_data.get('client_secret')
                )
                self.service = build('gmail', 'v1', credentials=creds)
            else:
                # Fallback: use build with credentials dict
                self.service = build('gmail', 'v1', credentials=credentials_dict, static_discovery=False)
    
    def send_email(self, to: str, subject: str, body: str, html: bool = False) -> bool:
        """
        Send an email via Gmail
        """
        try:
            if not self.service:
                logger.error("Gmail service not initialized")
                return False
            
            message = MIMEMultipart()
            message['to'] = to
            message['subject'] = subject
            
            if html:
                message.attach(MIMEText(body, 'html'))
            else:
                message.attach(MIMEText(body, 'plain'))
            
            raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode('utf-8')
            
            self.service.users().messages().send(
                userId='me',
                body={'raw': raw_message}
            ).execute()
            
            logger.info(f"Email sent successfully to {to}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email: {str(e)}")
            return False
    
    def list_emails(self, query: str = "", max_results: int = 10) -> List[Dict]:
        """
        List emails matching a query
        """
        try:
            if not self.service:
                logger.warning("Gmail service not initialized")
                return []
            
            results = self.service.users().messages().list(
                userId='me',
                q=query,
                maxResults=max_results
            ).execute()
            
            messages = results.get('messages', [])
            
            email_list = []
            for msg in messages:
                msg_data = self.service.users().messages().get(
                    userId='me',
                    id=msg['id']
                ).execute()
                
                headers = msg_data['payload']['headers']
                subject = next((h['value'] for h in headers if h['name'] == 'Subject'), 'No Subject')
                from_email = next((h['value'] for h in headers if h['name'] == 'From'), 'Unknown')
                
                email_list.append({
                    'id': msg['id'],
                    'subject': subject,
                    'from': from_email,
                    'snippet': msg_data.get('snippet', '')
                })
            
            return email_list
            
        except Exception as e:
            logger.error(f"Failed to list emails: {str(e)}")
            return []


# Simple email service with OAuth support
class SimpleEmailService:
    """
    Simple email service that tries OAuth first, falls back to mock
    """
    
    @staticmethod
    def send_simple_email(to: str, subject: str, body: str) -> Dict:
        """
        Send email using OAuth if available, otherwise mock
        """
        try:
            # Try to use OAuth service
            import os
            if os.path.exists('credentials/token.pickle') or os.path.exists('credentials/credentials.json'):
                try:
                    from app.integrations.gmail_oauth import GmailOAuthService
                    
                    gmail = GmailOAuthService()
                    result = gmail.send_email(to, subject, body)
                    logger.info(f"Email sent via OAuth to {to}")
                    return result
                except Exception as oauth_error:
                    logger.warning(f"OAuth authentication failed: {str(oauth_error)}")
                    logger.info("Falling back to mock mode - please re-authenticate via /integrations/auth endpoint")
                    return {
                        "status": "error",
                        "message": f"Authentication failed: {str(oauth_error)}. Please re-authenticate by visiting /integrations/auth endpoint.",
                        "to": to,
                        "subject": subject,
                        "mode": "auth_required"
                    }
            else:
                # No credentials file, fall back to mock
                logger.info(f"[MOCK] Email sent to {to}")
                logger.info(f"[MOCK] Subject: {subject}")
                logger.info(f"[MOCK] Body: {body[:100]}...")
                
                return {
                    "status": "success",
                    "message": f"Email sent to {to} (mock mode - setup OAuth for real emails)",
                    "to": to,
                    "subject": subject
                }
        except Exception as e:
            logger.error(f"Failed to send email: {str(e)}")
            return {
                "status": "error",
                "message": str(e),
                "to": to,
                "subject": subject
            }