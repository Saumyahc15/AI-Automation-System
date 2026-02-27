from pydantic_settings import BaseSettings
from functools import lru_cache
import json
import os
from typing import Optional, Dict, Any

def load_google_credentials() -> Optional[Dict[str, Any]]:
    """
    Load Google OAuth credentials from credentials.json file
    """
    credentials_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
        "credentials",
        "credentials.json"
    )
    
    try:
        if os.path.exists(credentials_path):
            with open(credentials_path, 'r') as f:
                credentials = json.load(f)
                return credentials
    except Exception as e:
        print(f"Warning: Could not load Google credentials: {e}")
    
    return None

class Settings(BaseSettings):
    # API Settings
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    DEBUG: bool = True
    
    # OpenAI
    OPENAI_API_KEY: str
    OPENAI_MODEL: str = "gpt-4o-mini"
    
    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./automation.db"
    
    # Gmail
    GMAIL_CLIENT_ID: str = ""
    GMAIL_CLIENT_SECRET: str = ""
    GMAIL_REFRESH_TOKEN: str = ""
    
    # Drive
    DRIVE_CLIENT_ID: str = ""
    DRIVE_CLIENT_SECRET: str = ""
    DRIVE_REFRESH_TOKEN: str = ""

    # Telegram
    TELEGRAM_BOT_TOKEN: str = "8542090004:AAFeGrZ7bAiNijEBk31IIBA-1R-Cr7vRw9o"
    TELEGRAM_CHAT_ID: str = "8555131209"

    # WhatsApp Cloud API
    WHATSAPP_PHONE_NUMBER_ID: str = "893377903864518"
    WHATSAPP_ACCESS_TOKEN: str = "EAAMBg3m6KiIBQYnRJrfdViofopyLMDqpPjO7JPu5Rp3aHCYm6kVkfhneZCUNF3DyFILSZCawwkPf6FfoJ0JswDRd30sNAHSrZCsT6eCYdBKYaE05qQhybeQDjPyRzWfiLBmwH1ZB2D7xd5hbv4qqAQyJnuthEczsxVZBttpUdzDs6wyKJo2mbsIf58fiaezdf5AZDZD"
    WHATSAPP_BUSINESS_ACCOUNT_ID: str = "1821272815194760"
    WHATSAPP_API_VERSION: str = "v21.0"

    # GitHub
    GITHUB_ACCESS_TOKEN: str = "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"
    GITHUB_USERNAME: str = "saumyahc"

    # Slack
    SLACK_BOT_TOKEN: str = ""
    SLACK_CHANNEL_ID: str = ""
    
    # Google OAuth Credentials Path
    GOOGLE_CREDENTIALS_PATH: str = "credentials/credentials.json"

    # Google Sheets
    GOOGLE_SHEETS_ENABLED: bool = True
    
    class Config:
        env_file = ".env"
    
    def get_google_credentials(self) -> Optional[Dict[str, Any]]:
        """
        Get Google OAuth credentials dictionary
        """
        return load_google_credentials()

@lru_cache()
def get_settings():
    return Settings()