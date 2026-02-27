import gspread
from oauth2client.service_account import ServiceAccountCredentials
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
import pickle
import os
import logging
from typing import List, Dict, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

class GoogleSheetsService:
    """
    Google Sheets Integration
    """
    
    def __init__(self):
        self.client = None
        self.creds = None
        self._authenticate()
    
    def _authenticate(self):
        """
        Authenticate with Google Sheets using existing OAuth credentials
        """
        try:
            token_path = 'credentials/token.pickle'
            
            if os.path.exists(token_path):
                with open(token_path, 'rb') as token:
                    self.creds = pickle.load(token)
            
            if not self.creds or not self.creds.valid:
                if self.creds and self.creds.expired and self.creds.refresh_token:
                    self.creds.refresh(Request())
                else:
                    logger.error("No valid credentials for Google Sheets. Run Gmail OAuth setup first.")
                    return
            
            # Authorize gspread client
            self.client = gspread.authorize(self.creds)
            logger.info("Google Sheets authenticated successfully")
            
        except Exception as e:
            logger.error(f"Failed to authenticate Google Sheets: {str(e)}")
    
    def create_spreadsheet(self, title: str, folder_id: str = None) -> Optional[Dict]:
        """
        Create a new Google Sheet
        """
        try:
            if not self.client:
                return {"status": "error", "message": "Not authenticated"}
            
            spreadsheet = self.client.create(title)
            
            # Move to specific folder if provided
            if folder_id:
                spreadsheet.move_to_folder(folder_id)
            
            logger.info(f"Created spreadsheet: {title}")
            
            return {
                "status": "success",
                "spreadsheet_id": spreadsheet.id,
                "title": title,
                "url": spreadsheet.url
            }
            
        except Exception as e:
            logger.error(f"Failed to create spreadsheet: {str(e)}")
            return {"status": "error", "message": str(e)}
    
    def open_spreadsheet(self, spreadsheet_id: str = None, title: str = None):
        """
        Open an existing spreadsheet by ID or title
        """
        try:
            if not self.client:
                return None
            
            if spreadsheet_id:
                return self.client.open_by_key(spreadsheet_id)
            elif title:
                return self.client.open(title)
            else:
                return None
                
        except Exception as e:
            logger.error(f"Failed to open spreadsheet: {str(e)}")
            return None
    
    def write_data(self, spreadsheet_id: str, data: List[List], sheet_name: str = None) -> Dict:
        """
        Write data to a spreadsheet
        data format: [['Header1', 'Header2'], ['Row1Col1', 'Row1Col2']]
        """
        try:
            if not self.client:
                return {"status": "error", "message": "Not authenticated"}
            
            spreadsheet = self.client.open_by_key(spreadsheet_id)
            
            # Get or create worksheet
            if sheet_name:
                try:
                    worksheet = spreadsheet.worksheet(sheet_name)
                except:
                    worksheet = spreadsheet.add_worksheet(title=sheet_name, rows=1000, cols=20)
            else:
                worksheet = spreadsheet.sheet1
            
            # Clear existing data
            worksheet.clear()
            
            # Write new data
            worksheet.update(range_name='A1', values=data)
            
            logger.info(f"Wrote {len(data)} rows to spreadsheet")
            
            return {
                "status": "success",
                "rows_written": len(data),
                "spreadsheet_url": spreadsheet.url
            }
            
        except Exception as e:
            logger.error(f"Failed to write data: {str(e)}")
            return {"status": "error", "message": str(e)}
    
    def append_data(self, spreadsheet_id: str, data: List[List], sheet_name: str = None) -> Dict:
        """
        Append data to existing spreadsheet
        """
        try:
            if not self.client:
                return {"status": "error", "message": "Not authenticated"}
            
            spreadsheet = self.client.open_by_key(spreadsheet_id)
            
            if sheet_name:
                worksheet = spreadsheet.worksheet(sheet_name)
            else:
                worksheet = spreadsheet.sheet1
            
            # Append rows
            worksheet.append_rows(data)
            
            logger.info(f"Appended {len(data)} rows to spreadsheet")
            
            return {
                "status": "success",
                "rows_appended": len(data),
                "spreadsheet_url": spreadsheet.url
            }
            
        except Exception as e:
            logger.error(f"Failed to append data: {str(e)}")
            return {"status": "error", "message": str(e)}
    
    def read_data(self, spreadsheet_id: str, sheet_name: str = None) -> Dict:
        """
        Read all data from a spreadsheet
        """
        try:
            if not self.client:
                return {"status": "error", "message": "Not authenticated"}
            
            spreadsheet = self.client.open_by_key(spreadsheet_id)
            
            if sheet_name:
                worksheet = spreadsheet.worksheet(sheet_name)
            else:
                worksheet = spreadsheet.sheet1
            
            data = worksheet.get_all_values()
            
            logger.info(f"Read {len(data)} rows from spreadsheet")
            
            return {
                "status": "success",
                "data": data,
                "rows": len(data),
                "spreadsheet_url": spreadsheet.url
            }
            
        except Exception as e:
            logger.error(f"Failed to read data: {str(e)}")
            return {"status": "error", "message": str(e)}
    
    def share_spreadsheet(self, spreadsheet_id: str, email: str = None, role: str = "reader") -> Dict:
        """
        Share spreadsheet with specific email or make it public
        role: reader, writer, owner
        """
        try:
            if not self.client:
                return {"status": "error", "message": "Not authenticated"}
            
            spreadsheet = self.client.open_by_key(spreadsheet_id)
            
            if email:
                # Share with specific email
                spreadsheet.share(email, perm_type='user', role=role)
                message = f"Shared with {email}"
            else:
                # Make publicly readable
                spreadsheet.share('', perm_type='anyone', role='reader')
                message = "Made publicly accessible"
            
            logger.info(f"Shared spreadsheet: {message}")
            
            return {
                "status": "success",
                "message": message,
                "spreadsheet_url": spreadsheet.url
            }
            
        except Exception as e:
            logger.error(f"Failed to share spreadsheet: {str(e)}")
            return {"status": "error", "message": str(e)}
    
    def format_github_trends_for_sheet(self, trends: List[Dict]) -> List[List]:
        """
        Format GitHub trends data for Google Sheets
        """
        # Headers
        data = [['#', 'Repository', 'Description', 'URL', 'Fetched At']]
        
        # Data rows
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        for i, repo in enumerate(trends, 1):
            data.append([
                i,
                repo.get('name', 'N/A'),
                repo.get('description', 'No description')[:100],  # Limit description
                repo.get('url', ''),
                timestamp
            ])
        
        return data
    
    def create_github_trends_sheet(self, trends: List[Dict], title: str = None) -> Dict:
        """
        Create a new sheet with GitHub trends data
        """
        try:
            # Create spreadsheet
            if not title:
                title = f"GitHub Trends {datetime.now().strftime('%Y-%m-%d')}"
            
            result = self.create_spreadsheet(title)
            
            if result.get('status') != 'success':
                return result
            
            spreadsheet_id = result['spreadsheet_id']
            
            # Format data
            data = self.format_github_trends_for_sheet(trends)
            
            # Write data
            write_result = self.write_data(spreadsheet_id, data, sheet_name="Trending Repos")
            
            if write_result.get('status') != 'success':
                return write_result
            
            # Make publicly readable
            self.share_spreadsheet(spreadsheet_id)
            
            return {
                "status": "success",
                "message": f"Created sheet with {len(trends)} trending repos",
                "spreadsheet_id": spreadsheet_id,
                "url": result['url'],
                "rows": len(trends)
            }
            
        except Exception as e:
            logger.error(f"Failed to create GitHub trends sheet: {str(e)}")
            return {"status": "error", "message": str(e)}