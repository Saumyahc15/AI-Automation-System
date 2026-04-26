from sqlalchemy import Column, Integer, String, DateTime
from app.database import Base
from datetime import datetime


class GmailThreadState(Base):
    __tablename__ = "gmail_thread_states"

    id = Column(Integer, primary_key=True, index=True)
    thread_id = Column(String, unique=True, nullable=False, index=True)
    lifecycle_status = Column(String, default="open")
    last_intent = Column(String, nullable=True)
    last_sender = Column(String, nullable=True)
    last_message_snippet = Column(String, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
