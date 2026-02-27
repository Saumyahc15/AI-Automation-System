"""
Authentication routes for user registration and login
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.schemas import UserRegister, UserLogin, UserResponse, AuthToken
from app.services.auth_service import AuthService
from datetime import datetime

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=UserResponse)
def register(
    user_data: UserRegister,
    db: Session = Depends(get_db)
):
    """
    Register a new user with email and password
    """
    try:
        user = AuthService.register_user(db, user_data)
        return user
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )

@router.post("/login", response_model=AuthToken)
def login(
    login_data: UserLogin,
    db: Session = Depends(get_db)
):
    """
    Login with email and password
    Returns auth token and user info
    """
    try:
        user = AuthService.login_user(db, login_data)
        
        # Update last login
        user.last_login = datetime.utcnow()
        db.commit()
        
        # Return token (simplified - in production use JWT)
        return {
            "access_token": f"token_{user.id}_{user.email}",
            "token_type": "bearer",
            "user": UserResponse.from_orm(user)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}"
        )

@router.get("/me", response_model=UserResponse)
def get_current_user(
    user_id: int,
    db: Session = Depends(get_db)
):
    """
    Get current user info (would use JWT token in production)
    """
    user = AuthService.get_user(db, user_id)
    return UserResponse.from_orm(user)
