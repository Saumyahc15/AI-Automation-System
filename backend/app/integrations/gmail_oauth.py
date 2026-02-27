import os
import pickle
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import base64
import logging

logger = logging.getLogger(__name__)

# Updated scopes to include Sheets, Drive, and Calendar
SCOPES = [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/spreadsheets',  # Google Sheets
    'https://www.googleapis.com/auth/drive.file',     # Google Drive
    'https://www.googleapis.com/auth/calendar'         # Google Calendar
]

class GmailOAuthService:
    def __init__(self):
        self.creds = None
        self.service = None
        self._authenticate()
    
    def _authenticate(self):
        """
        Authenticate with Gmail using OAuth2
        """
        # Token file stores the user's access and refresh tokens
        token_path = 'credentials/token.pickle'
        creds_path = 'credentials/credentials.json'
        
        # Check if token.pickle exists
        if os.path.exists(token_path):
            with open(token_path, 'rb') as token:
                self.creds = pickle.load(token)
        
        # If no valid credentials, let user log in
        if not self.creds or not self.creds.valid:
            if self.creds and self.creds.expired and self.creds.refresh_token:
                logger.info("Refreshing Gmail credentials...")
                try:
                    self.creds.refresh(Request())
                except Exception as e:
                    logger.error(f"Failed to refresh token: {str(e)}")
                    # Delete old token and re-authenticate
                    if os.path.exists(token_path):
                        os.remove(token_path)
                    logger.info("Deleted old token. Please re-authenticate.")
                    self.creds = None
            
            if not self.creds:
                if not os.path.exists(creds_path):
                    logger.error("credentials.json not found! Please download it from Google Cloud Console.")
                    raise FileNotFoundError("credentials.json not found in credentials/ folder")
                
                logger.info("Starting Gmail OAuth flow with Sheets, Drive & Calendar scopes...")
                flow = InstalledAppFlow.from_client_secrets_file(creds_path, SCOPES)
                self.creds = flow.run_local_server(port=0)
            
            # Save credentials for next time
            with open(token_path, 'wb') as token:
                pickle.dump(self.creds, token)
            logger.info("Gmail credentials saved with Sheets, Drive & Calendar access")
        
        # Build the Gmail service
        self.service = build('gmail', 'v1', credentials=self.creds)
        logger.info("Gmail service authenticated successfully")
    
    def send_email(self, to: str, subject: str, body: str, html: bool = False):
        """
        Send an email via Gmail
        """
        try:
            message = MIMEMultipart()
            message['to'] = to
            message['subject'] = subject
            
            if html:
                message.attach(MIMEText(body, 'html'))
            else:
                message.attach(MIMEText(body, 'plain'))
            
            raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode('utf-8')
            
            send_message = self.service.users().messages().send(
                userId='me',
                body={'raw': raw_message}
            ).execute()
            
            logger.info(f"Email sent successfully to {to}. Message ID: {send_message['id']}")
            
            return {
                "status": "success",
                "message": f"Email sent to {to}",
                "message_id": send_message['id']
            }
            
        except HttpError as error:
            logger.error(f"Gmail API error: {error}")
            return {
                "status": "error",
                "message": str(error)
            }
        except Exception as e:
            logger.error(f"Failed to send email: {str(e)}")
            return {
                "status": "error",
                "message": str(e)
            }
    
    def list_recent_emails(self, max_results: int = 10):
        """
        List recent emails
        """
        try:
            results = self.service.users().messages().list(
                userId='me',
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