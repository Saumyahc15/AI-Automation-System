from sqlalchemy import Column, Integer, String, DateTime, Boolean, Enum
from app.database import Base
from datetime import datetime
import enum


class UserRole(str, enum.Enum):
    OWNER = "owner"
    MANAGER = "manager"
    STAFF = "staff"


class User(Base):
    __tablename__ = "users"

    user_id         = Column(Integer, primary_key=True, index=True)
    name            = Column(String, nullable=False)
    email           = Column(String, unique=True, nullable=False, index=True)
    password_hash   = Column(String, nullable=False)
    role            = Column(Enum(UserRole), default=UserRole.STAFF, nullable=False)
    store_id        = Column(Integer, default=1)  # For future multi-store support
    is_active       = Column(Boolean, default=True)
    created_at      = Column(DateTime, default=datetime.utcnow)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login      = Column(DateTime, nullable=True)
