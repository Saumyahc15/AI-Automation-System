from sqlalchemy import Column, Integer, String, JSON, Boolean, DateTime, ForeignKey
from app.database import Base
from datetime import datetime

class Workflow(Base):
    __tablename__ = "workflows"

    workflow_id           = Column(Integer, primary_key=True, index=True)
    user_id               = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    natural_language_input= Column(String, nullable=False)
    trigger_type          = Column(String, nullable=False)
    condition_json        = Column(JSON, default={})
    actions_json          = Column(JSON, default=[])
    notification_channel  = Column(String, default="gmail")
    calendar_event_id     = Column(String, nullable=True)
    frequency             = Column(String, default="every_15_min")
    is_active             = Column(Boolean, default=True)
    created_at            = Column(DateTime, default=datetime.utcnow)
    last_executed_at      = Column(DateTime, nullable=True)