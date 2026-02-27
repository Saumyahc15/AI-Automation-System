try:
    from google.oauth2.credentials import Credentials
except ImportError:
    Credentials = None

from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload, MediaIoBaseDownload
import io
import os
import logging

logger = logging.getLogger(__name__)

class GoogleDriveService:
    def __init__(self, credentials_dict: dict = None):
        """
        Initialize Google Drive service
        
        Args:
            credentials_dict: Google OAuth credentials object (if None, auto-loads from token.pickle)
        """
        # Auto-load credentials if not provided
        if credentials_dict is None:
            try:
                from app.core.google_credentials import GoogleCredentialsManager
                credentials_dict = GoogleCredentialsManager.get_credentials()
                if credentials_dict:
                    logger.info("Auto-loaded Google credentials from token.pickle")
            except Exception as e:
                logger.warning(f"Could not auto-load credentials: {e}")
        
        self.credentials = credentials_dict
        self.service = None
        
        if credentials_dict:
            try:
                # Build service directly with OAuth credentials
                self.service = build('drive', 'v3', credentials=credentials_dict)
                logger.info("Google Drive service initialized successfully")
            except Exception as e:
                logger.error(f"Failed to build Drive service: {str(e)}")
    
    def upload_file(self, file_path: str, folder_id: str = None, file_name: str = None) -> dict:
        """
        Upload a file to Google Drive
        """
        try:
            if not self.service:
                logger.error("Drive service not initialized")
                return {"status": "error", "message": "Drive service not initialized"}
            
            if not os.path.exists(file_path):
                return {"status": "error", "message": "File not found"}
            
            file_metadata = {
                'name': file_name or os.path.basename(file_path)
            }
            
            if folder_id:
                file_metadata['parents'] = [folder_id]
            
            media = MediaFileUpload(file_path, resumable=True)
            
            file = self.service.files().create(
                body=file_metadata,
                media_body=media,
                fields='id, name, webViewLink'
            ).execute()
            
            logger.info(f"File uploaded: {file.get('name')}")
            
            return {
                "status": "success",
                "file_id": file.get('id'),
                "file_name": file.get('name'),
                "web_link": file.get('webViewLink')
            }
            
        except Exception as e:
            logger.error(f"Failed to upload file: {str(e)}")
            return {"status": "error", "message": str(e)}
    
    def create_folder(self, folder_name: str, parent_folder_id: str = None) -> dict:
        """
        Create a folder in Google Drive
        """
        try:
            if not self.service:
                return {"status": "error", "message": "Drive service not initialized"}
            
            file_metadata = {
                'name': folder_name,
                'mimeType': 'application/vnd.google-apps.folder'
            }
            
            if parent_folder_id:
                file_metadata['parents'] = [parent_folder_id]
            
            folder = self.service.files().create(
                body=file_metadata,
                fields='id, name'
            ).execute()
            
            return {
                "status": "success",
                "folder_id": folder.get('id'),
                "folder_name": folder.get('name')
            }
            
        except Exception as e:
            logger.error(f"Failed to create folder: {str(e)}")
            return {"status": "error", "message": str(e)}
    
    def list_files(self, folder_id: str = None, max_results: int = 10) -> list:
        """
        List files in Google Drive
        """
        try:
            if not self.service:
                return []
            
            query = ""
            if folder_id:
                query = f"'{folder_id}' in parents"
            
            results = self.service.files().list(
                q=query,
                pageSize=max_results,
                fields="files(id, name, mimeType, createdTime, modifiedTime)"
            ).execute()
            
            return results.get('files', [])
            
        except Exception as e:
            logger.error(f"Failed to list files: {str(e)}")
            return []
    
    def find_folder_by_name(self, folder_name: str) -> dict:
        """
        Find a folder by name in Google Drive
        
        Args:
            folder_name: Name of folder to find
            
        Returns:
            Dictionary with folder_id and metadata
        """
        try:
            if not self.service:
                return {"status": "error", "message": "Drive service not initialized"}
            
            query = f"name='{folder_name}' and mimeType='application/vnd.google-apps.folder' and trashed=false"
            
            results = self.service.files().list(
                q=query,
                pageSize=1,
                fields="files(id, name, webViewLink)"
            ).execute()
            
            files = results.get('files', [])
            
            if files:
                folder = files[0]
                logger.info(f"Found folder: {folder_name}")
                return {
                    "status": "success",
                    "folder_id": folder.get('id'),
                    "folder_name": folder.get('name'),
                    "web_link": folder.get('webViewLink')
                }
            else:
                return {"status": "not_found", "message": f"Folder '{folder_name}' not found"}
            
        except Exception as e:
            logger.error(f"Failed to find folder: {str(e)}")
            return {"status": "error", "message": str(e)}
    
    def download_file(self, file_id: str, destination_path: str = None) -> dict:
        """
        Download a file from Google Drive
        
        Args:
            file_id: ID of the file to download
            destination_path: Local path to save file
            
        Returns:
            Dictionary with status and file info
        """
        try:
            if not self.service:
                return {"status": "error", "message": "Drive service not initialized"}
            
            # Get file metadata
            file_metadata = self.service.files().get(
                fileId=file_id,
                fields="name,mimeType"
            ).execute()
            
            file_name = file_metadata.get('name')
            
            # Download the file
            request = self.service.files().get_media(fileId=file_id)
            fh = io.BytesIO()
            downloader = MediaIoBaseDownload(fh, request)
            done = False
            
            while not done:
                status, done = downloader.next_chunk()
            
            # Save to destination
            if destination_path is None:
                destination_path = file_name
            
            with open(destination_path, 'wb') as f:
                f.write(fh.getvalue())
            
            logger.info(f"File downloaded: {file_name}")
            
            return {
                "status": "success",
                "file_name": file_name,
                "local_path": destination_path,
                "file_size": len(fh.getvalue())
            }
            
        except Exception as e:
            logger.error(f"Failed to download file: {str(e)}")
            return {"status": "error", "message": str(e)}
    
    def delete_file(self, file_id: str) -> dict:
        """
        Delete a file from Google Drive
        
        Args:
            file_id: ID of the file to delete
            
        Returns:
            Dictionary with status
        """
        try:
            if not self.service:
                return {"status": "error", "message": "Drive service not initialized"}
            
            self.service.files().delete(fileId=file_id).execute()
            
            logger.info(f"File deleted: {file_id}")
            
            return {
                "status": "success",
                "message": "File deleted successfully"
            }
            
        except Exception as e:
            logger.error(f"Failed to delete file: {str(e)}")
            return {"status": "error", "message": str(e)}
    
    def share_file(self, file_id: str, email: str, role: str = "reader") -> dict:
        """
        Share a file with another user
        
        Args:
            file_id: ID of the file to share
            email: Email address to share with
            role: Permission role (reader, commenter, writer)
            
        Returns:
            Dictionary with share status
        """
        try:
            if not self.service:
                return {"status": "error", "message": "Drive service not initialized"}
            
            permission = {
                "type": "user",
                "role": role,
                "emailAddress": email
            }
            
            self.service.permissions().create(
                fileId=file_id,
                body=permission
            ).execute()
            
            logger.info(f"File shared with {email}")
            
            return {
                "status": "success",
                "message": f"File shared with {email}",
                "email": email,
                "role": role
            }
            
        except Exception as e:
            logger.error(f"Failed to share file: {str(e)}")
            return {"status": "error", "message": str(e)}


# Simplified Drive Service (for testing)
class SimpleDriveService:
    """
    Mock Drive service for testing without OAuth
    """
    
    @staticmethod
    def save_file_locally(file_path: str, destination_folder: str = "drive_uploads") -> dict:
        """
        Save file locally (simulates Drive upload)
        """
        try:
            os.makedirs(destination_folder, exist_ok=True)
            
            if not os.path.exists(file_path):
                return {"status": "error", "message": "File not found"}
            
            file_name = os.path.basename(file_path)
            dest_path = os.path.join(destination_folder, file_name)
            
            import shutil
            shutil.copy(file_path, dest_path)
            
            logger.info(f"[MOCK] File saved locally: {dest_path}")
            
            return {
                "status": "success",
                "message": f"File saved to {dest_path}",
                "file_name": file_name,
                "local_path": dest_path
            }
            
        except Exception as e:
            logger.error(f"Failed to save file: {str(e)}")
            return {"status": "error", "message": str(e)}