import pickle
import os
import logging

logger = logging.getLogger(__name__)

class GoogleCredentialsManager:
    """
    Manages Google OAuth credentials for Drive, Sheets, and Gmail
    """
    
    @staticmethod
    def get_credentials():
        """
        Load OAuth credentials from token.pickle
        """
        token_path = 'credentials/token.pickle'
        
        if not os.path.exists(token_path):
            logger.warning("OAuth token not found. Please authenticate first.")
            return None
        
        try:
            with open(token_path, 'rb') as f:
                creds = pickle.load(f)
            logger.info("Loaded OAuth credentials from token.pickle")
            return creds
        except Exception as e:
            logger.error(f"Failed to load credentials: {str(e)}")
            return None
