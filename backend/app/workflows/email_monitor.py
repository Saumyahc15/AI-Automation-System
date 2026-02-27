import asyncio
import imaplib
import email
from email.header import decode_header
from datetime import datetime
import logging
from typing import Callable, Dict
from app.integrations.gmail_service import SimpleEmailService

logger = logging.getLogger(__name__)

class EmailMonitor:
    """
    Monitor email inbox for new messages and trigger workflows
    """
    
    def __init__(self):
        self.is_running = False
        self.workflows = {}  # workflow_id -> {conditions, callback}
    
    def register_workflow(self, workflow_id: int, conditions: Dict, callback: Callable):
        """
        Register a workflow to be triggered by email
        conditions = {
            "subject_contains": "Invoice",
            "from_contains": "example@gmail.com",
            "has_attachment": True
        }
        """
        self.workflows[workflow_id] = {
            "conditions": conditions,
            "callback": callback
        }
        logger.info(f"Registered email workflow {workflow_id}")
    
    def unregister_workflow(self, workflow_id: int):
        """
        Remove a workflow from monitoring
        """
        if workflow_id in self.workflows:
            del self.workflows[workflow_id]
            logger.info(f"Unregistered email workflow {workflow_id}")
    
    async def check_email_match(self, email_data: Dict, conditions: Dict) -> bool:
        """
        Check if email matches workflow conditions
        """
        try:
            subject = email_data.get("subject", "").lower()
            from_email = email_data.get("from", "").lower()
            has_attachments = email_data.get("has_attachments", False)
            
            # Check subject condition
            if "subject_contains" in conditions:
                if conditions["subject_contains"].lower() not in subject:
                    return False
            
            # Check from condition
            if "from_contains" in conditions:
                if conditions["from_contains"].lower() not in from_email:
                    return False
            
            # Check attachment condition
            if "has_attachment" in conditions:
                if conditions["has_attachment"] != has_attachments:
                    return False
            
            return True
            
        except Exception as e:
            logger.error(f"Error checking email match: {str(e)}")
            return False
    
    async def monitor_loop(self, check_interval: int = 60):
        """
        Main monitoring loop (mock implementation)
        In production, use IMAP IDLE or Gmail Push Notifications
        """
        logger.info("Email monitor started")
        self.is_running = True
        
        while self.is_running:
            try:
                logger.info("Checking for new emails...")
                
                # Mock: In real implementation, check IMAP or Gmail API
                # For now, we'll just log
                
                await asyncio.sleep(check_interval)
                
            except Exception as e:
                logger.error(f"Email monitor error: {str(e)}")
                await asyncio.sleep(check_interval)
    
    def stop(self):
        """
        Stop the monitoring loop
        """
        self.is_running = False
        logger.info("Email monitor stopped")


class IMAPEmailMonitor:
    """
    Real IMAP-based email monitoring
    Requires email credentials
    """
    
    def __init__(self, email_address: str, password: str, imap_server: str = "imap.gmail.com"):
        self.email_address = email_address
        self.password = password
        self.imap_server = imap_server
        self.connection = None
    
    def connect(self) -> bool:
        """
        Connect to IMAP server
        """
        try:
            self.connection = imaplib.IMAP4_SSL(self.imap_server)
            self.connection.login(self.email_address, self.password)
            logger.info(f"Connected to {self.imap_server}")
            return True
        except Exception as e:
            logger.error(f"IMAP connection failed: {str(e)}")
            return False
    
    def fetch_recent_emails(self, mailbox: str = "INBOX", limit: int = 10) -> list:
        """
        Fetch recent emails
        """
        try:
            if not self.connection:
                return []
            
            self.connection.select(mailbox)
            
            # Search for unseen emails
            status, messages = self.connection.search(None, 'UNSEEN')
            
            if status != "OK":
                return []
            
            email_ids = messages[0].split()[-limit:]
            emails = []
            
            for email_id in email_ids:
                status, msg_data = self.connection.fetch(email_id, '(RFC822)')
                
                if status != "OK":
                    continue
                
                for response_part in msg_data:
                    if isinstance(response_part, tuple):
                        msg = email.message_from_bytes(response_part[1])
                        
                        subject = decode_header(msg["Subject"])[0][0]
                        if isinstance(subject, bytes):
                            subject = subject.decode()
                        
                        from_email = msg.get("From")
                        
                        emails.append({
                            "id": email_id.decode(),
                            "subject": subject,
                            "from": from_email,
                            "date": msg.get("Date")
                        })
            
            return emails
            
        except Exception as e:
            logger.error(f"Failed to fetch emails: {str(e)}")
            return []
    
    def disconnect(self):
        """
        Disconnect from IMAP server
        """
        if self.connection:
            try:
                self.connection.close()
                self.connection.logout()
                logger.info("Disconnected from IMAP")
            except:
                pass