from pydantic_settings import BaseSettings
import os

# Get the base directory (project root, one level up from backend)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT_ROOT = os.path.dirname(BASE_DIR)

class Settings(BaseSettings):
    DATABASE_URL: str
    GROQ_API_KEY: str

    # Credentials paths - relative paths from .env will be resolved to project root
    GMAIL_CREDENTIALS_FILE: str = "credentials/gmail_credentials.json"
    GMAIL_TOKEN_FILE: str = "credentials/gmail_token.json"
    MANAGER_EMAIL: str
    GOOGLE_CALENDAR_CREDENTIALS_FILE: str = "credentials/calendar_credentials.json"
    GOOGLE_CALENDAR_TOKEN_FILE: str = "credentials/google_calendar_token.json"
    GOOGLE_CALENDAR_ID: str = "primary"
    GOOGLE_CALENDAR_TIMEZONE: str = "UTC"

    GOOGLE_SHEETS_CREDENTIALS_FILE: str = "credentials/sheets_credentials.json"
    INVENTORY_SHEET_ID: str = ""
    SHEETS_WEBHOOK_SECRET: str = ""

    # Authentication
    JWT_SECRET_KEY: str = "your-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24

    class Config:
        env_file = ".env"

settings = Settings()

# Resolve relative paths to absolute paths based on project root
def _resolve_path(path: str) -> str:
    if os.path.isabs(path):
        return path
    return os.path.join(PROJECT_ROOT, path)

settings.GMAIL_CREDENTIALS_FILE = _resolve_path(settings.GMAIL_CREDENTIALS_FILE)
settings.GMAIL_TOKEN_FILE = _resolve_path(settings.GMAIL_TOKEN_FILE)
settings.GOOGLE_CALENDAR_CREDENTIALS_FILE = _resolve_path(settings.GOOGLE_CALENDAR_CREDENTIALS_FILE)
settings.GOOGLE_CALENDAR_TOKEN_FILE = _resolve_path(settings.GOOGLE_CALENDAR_TOKEN_FILE)
settings.GOOGLE_SHEETS_CREDENTIALS_FILE = _resolve_path(settings.GOOGLE_SHEETS_CREDENTIALS_FILE)
