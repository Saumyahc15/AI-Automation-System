from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, JSON, ForeignKey
from sqlalchemy.sql import func
from app.core.database import Base

class Workflow(Base):
    __tablename__ = "workflows"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # Link to user
    name = Column(String, nullable=False)
    description = Column(Text)
    user_instruction = Column(Text, nullable=False)  # Original natural language input
    
    # Generated workflow structure
    trigger_type = Column(String)  # email, cron, file_upload, webhook
    trigger_config = Column(JSON)  # Trigger-specific configuration
    
    actions = Column(JSON)  # List of actions to perform
    workflow_code = Column(Text)  # Generated Python code
    workflow_yaml = Column(Text)  # YAML representation
    
    # Status
    is_active = Column(Boolean, default=True)
    is_running = Column(Boolean, default=False)
    
    # Execution tracking
    last_executed = Column(DateTime(timezone=True), nullable=True)
    execution_count = Column(Integer, default=0)
    success_count = Column(Integer, default=0)
    failure_count = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<Workflow(id={self.id}, name={self.name}, user_id={self.user_id})>"