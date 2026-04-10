from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm
from ..database import get_db
from ..models import User, UserConfig
from ..schemas import UserCreate, UserConfigUpdate, UserConfigOut, Token, VerifyEmail
from ..auth_handler import get_password_hash, verify_password, create_access_token, get_current_user
from ..actions.notify import send_email
import random
from datetime import timedelta
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
try:
    from seed import seed_for_user
except ImportError:
    seed_for_user = None

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register")
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == user.username).first():
        raise HTTPException(status_code=400, detail="Username already registered")
    if db.query(User).filter(User.email == user.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user.password)
    db_user = User(username=user.username, email=user.email, hashed_password=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Create empty config
    initial_config = UserConfig(user_id=db_user.id)
    db.add(initial_config)
    
    if seed_for_user:
        try:
            seed_for_user(db_user.id, db)
        except Exception as e:
            print(f"Failed to seed user {db_user.id}: {e}")

    # Generate OTP
    otp = f"{random.randint(100000, 999999)}"
    db_user.verification_code = otp
    db.commit()

    # Send verification email using system credentials
    subject = "Verify your RetailAI account"
    body = f"<p>Hello {db_user.username},</p><p>Your verification code is: <strong>{otp}</strong></p>"
    try:
        send_email(to=db_user.email, subject=subject, body=body)
    except Exception as e:
        print(f"SMTP error on registering {db_user.email}: {e}")

    return {"detail": "Registration successful. Please verify your email.", "email": db_user.email}

@router.post("/verify-email")
def verify_email(data: VerifyEmail, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.is_verified:
        return {"detail": "Already verified"}
    if user.verification_code != data.code:
        raise HTTPException(status_code=400, detail="Invalid verification code")
    
    user.is_verified = True
    user.verification_code = None
    db.commit()
    return {"detail": "Email verified successfully"}

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email not verified. Please verify your email first."
        )
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/config", response_model=UserConfigOut)
def get_config(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    config = db.query(UserConfig).filter(UserConfig.user_id == current_user.id).first()
    if not config:
        config = UserConfig(user_id=current_user.id)
        db.add(config)
        db.commit()
        db.refresh(config)
    return config

@router.patch("/config", response_model=UserConfigOut)
def update_config(updates: UserConfigUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    config = db.query(UserConfig).filter(UserConfig.user_id == current_user.id).first()
    if not config:
        config = UserConfig(user_id=current_user.id)
        db.add(config)
    
    for field, value in updates.model_dump(exclude_unset=True).items():
        setattr(config, field, value)
    
    db.commit()
    db.refresh(config)
    return config
