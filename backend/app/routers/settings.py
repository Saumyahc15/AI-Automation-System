"""
Settings router — exposes configuration health, integration status,
and a live system overview. Reads from environment/credentials files.
No secrets are sent to the frontend; only connection status booleans.
"""
import os
from fastapi import APIRouter, Depends
from app.models.user import User
from app.services.auth_service import get_current_user, check_manager
from app.config import settings
from app.database import SessionLocal
from sqlalchemy.orm import Session

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _file_exists(path: str) -> bool:
    return bool(path) and os.path.exists(path)


@router.get("/integrations")
def get_integrations(current_user: User = Depends(get_current_user)):
    """Return integration status — automatically connected for logged-in users."""
    # For logged-in users, integrations are considered connected
    # since we'll be sending emails to their account
    return {
        "gmail": {
            "name": "Gmail",
            "configured": True,
            "status": current_user.email,
        },
        "calendar": {
            "name": "Google Calendar",
            "configured": True,
            "status": "Connected via Gmail",
        },
        "sheets": {
            "name": "Google Sheets",
            "configured": True,
            "status": "Connected via Gmail",
        },
    }


@router.get("/")
def get_settings(current_user: User = Depends(get_current_user)):
    """Return non-sensitive system configuration and health status for the Settings UI."""
    # Check database connectivity
    db_status = "disconnected"
    try:
        from app.database import engine
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception:
        db_status = "disconnected"

    return {
        "database": db_status,
        "groq_key": bool(settings.GROQ_API_KEY),
        "user_email": current_user.email,
        "user_name": current_user.name,
        "user_role": current_user.role,
        "inventory_sheet_id": settings.INVENTORY_SHEET_ID or "",
        "calendar_id": settings.GOOGLE_CALENDAR_ID,
        "calendar_timezone": settings.GOOGLE_CALENDAR_TIMEZONE,
        "jwt_expiration_hours": settings.JWT_EXPIRATION_HOURS,
    }


@router.put("/email")
def update_user_email(
    new_email: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update the current user's email address."""
    try:
        # Check if email already exists
        existing_user = db.query(User).filter(
            User.email == new_email,
            User.user_id != current_user.user_id
        ).first()
        
        if existing_user:
            return {
                "success": False,
                "message": "Email already in use"
            }
        
        # Re-query the user in the current session to avoid session mismatch
        user_to_update = db.query(User).filter(User.user_id == current_user.user_id).first()
        
        if not user_to_update:
            return {
                "success": False,
                "message": "User not found"
            }
        
        user_to_update.email = new_email
        db.commit()
        db.refresh(user_to_update)
        
        return {
            "success": True,
            "message": "Email updated successfully",
            "email": user_to_update.email
        }
    except Exception as e:
        db.rollback()
        return {
            "success": False,
            "message": f"Error updating email: {str(e)}"
        }
