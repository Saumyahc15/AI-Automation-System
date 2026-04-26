from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from app.database import Base
from datetime import datetime

class WorkflowLog(Base):
    __tablename__ = "workflow_logs"

    log_id        = Column(Integer, primary_key=True, index=True)
    workflow_id   = Column(Integer, ForeignKey("workflows.workflow_id"))
    executed_at   = Column(DateTime, default=datetime.utcnow)
    status        = Column(String)         # success | failed | skipped
    output        = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    items_triggered = Column(Integer, default=0)