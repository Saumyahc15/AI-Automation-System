from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List
from app.database import get_db
from app.models.user import User, UserRole
from app.schemas.user import (
    UserRegisterRequest, UserLoginRequest, LoginResponse, UserResponse, UserListResponse
)
from app.services.auth_service import (
    hash_password, verify_password, create_access_token,
    get_current_user, check_owner, check_manager
)

router = APIRouter()


@router.post("/register", response_model=LoginResponse)
def register(data: UserRegisterRequest, db: Session = Depends(get_db)):
    """
    Register a new user. Only OWNER can create users with roles other than STAFF.
    """
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Hash password and create user
    hashed_password = hash_password(data.password)
    user = User(
        name=data.name,
        email=data.email,
        password_hash=hashed_password,
        role=data.role or UserRole.STAFF,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Generate token
    token = create_access_token(user.user_id, user.email, user.role)

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": UserResponse.from_orm(user)
    }


@router.post("/login", response_model=LoginResponse)
def login(credentials: UserLoginRequest, db: Session = Depends(get_db)):
    """
    User login with email and password.
    Returns JWT token for subsequent requests.
    """
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not verify_password(credentials.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="User account is inactive")

    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()

    # Generate token
    token = create_access_token(user.user_id, user.email, user.role)

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": UserResponse.from_orm(user)
    }


@router.get("/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    """
    Get current authenticated user info.
    """
    return UserResponse.from_orm(current_user)


@router.get("/users", response_model=List[UserListResponse])
def list_users(
    current_user: User = Depends(check_owner),
    db: Session = Depends(get_db)
):
    """
    List all users. Owner access only.
    """
    users = db.query(User).filter(User.is_active == True).all()
    return [UserListResponse.from_orm(u) for u in users]


@router.post("/users", response_model=UserResponse)
def create_user(
    data: UserRegisterRequest,
    current_user: User = Depends(check_owner),
    db: Session = Depends(get_db)
):
    """
    Create a new user. Owner access only.
    """
    existing_user = db.query(User).filter(User.email == data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already exists")

    hashed_password = hash_password(data.password)
    user = User(
        name=data.name,
        email=data.email,
        password_hash=hashed_password,
        role=data.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return UserResponse.from_orm(user)


@router.put("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    data: dict,
    current_user: User = Depends(check_owner),
    db: Session = Depends(get_db)
):
    """
    Update user. Owner access only.
    Can update: name, email, role, is_active
    """
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if "name" in data:
        user.name = data["name"]
    if "email" in data:
        existing = db.query(User).filter(
            User.email == data["email"],
            User.user_id != user_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already exists")
        user.email = data["email"]
    if "role" in data:
        user.role = UserRole(data["role"])
    if "is_active" in data:
        user.is_active = data["is_active"]

    user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(user)

    return UserResponse.from_orm(user)


@router.delete("/users/{user_id}", status_code=204)
def delete_user(
    user_id: int,
    current_user: User = Depends(check_owner),
    db: Session = Depends(get_db)
):
    """
    Soft-delete a user (set is_active=False). Owner access only.
    """
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.user_id == current_user.user_id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    user.is_active = False
    db.commit()


@router.post("/change-password")
def change_password(
    old_password: str,
    new_password: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Change password for the current user.
    """
    if not verify_password(old_password, current_user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid old password")

    current_user.password_hash = hash_password(new_password)
    db.commit()

    return {"message": "Password changed successfully"}
