import jwt
import logging
from datetime import datetime, timedelta
import bcrypt
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app.models.user import User, UserRole

logger = logging.getLogger(__name__)

# Security scheme
security = HTTPBearer()

# JWT Constants
JWT_SECRET = getattr(settings, 'JWT_SECRET_KEY', 'your-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24


def hash_password(password: str) -> str:
    """Hash a plaintext password using bcrypt."""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against its bcrypt hash."""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))


def create_access_token(user_id: int, email: str, role: UserRole, expires_delta: timedelta = None) -> str:
    """Create a JWT token for a user."""
    if expires_delta is None:
        expires_delta = timedelta(hours=JWT_EXPIRATION_HOURS)
    
    expire = datetime.utcnow() + expires_delta
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role.value,
        "exp": expire,
        "iat": datetime.utcnow()
    }
    
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return token


def verify_token(token: str) -> dict:
    """Verify and decode a JWT token. Returns payload if valid."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)) -> User:
    """
    Dependency to extract and validate the current user from the JWT token.
    Used in endpoint definitions: def my_endpoint(current_user: User = Depends(get_current_user))
    """
    token = credentials.credentials
    payload = verify_token(token)
    
    user = db.query(User).filter(User.user_id == payload["user_id"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="User is inactive")
    
    return user


def require_role(*roles: UserRole):
    """
    Decorator to check if user has one of the required roles.
    Usage: @require_role(UserRole.OWNER, UserRole.MANAGER)
    """
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=403,
                detail=f"Permission denied. Required roles: {[r.value for r in roles]}"
            )
        return current_user
    
    return role_checker


def check_owner(current_user: User = Depends(get_current_user)) -> User:
    """Check if user is an OWNER."""
    if current_user.role != UserRole.OWNER:
        raise HTTPException(status_code=403, detail="Owner access required")
    return current_user


def check_manager(current_user: User = Depends(get_current_user)) -> User:
    """Check if user is a MANAGER or higher."""
    if current_user.role not in [UserRole.OWNER, UserRole.MANAGER]:
        raise HTTPException(status_code=403, detail="Manager access required")
    return current_user


def check_staff_or_higher(current_user: User = Depends(get_current_user)) -> User:
    """Check if user is any role (staff or higher)."""
    return current_user  # All authenticated users pass
