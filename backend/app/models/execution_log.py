from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey
from sqlalchemy.sql import func
from app.core.database import Base

class ExecutionLog(Base):
    __tablename__ = "execution_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # Link to user
    workflow_id = Column(Integer, ForeignKey("workflows.id"), nullable=False)
    
    status = Column(String)  # success, failed, running
    error_message = Column(Text, nullable=True)
    execution_time = Column(Integer)  # in milliseconds
    
    input_data = Column(Text, nullable=True)  # What triggered the workflow
    output_data = Column(Text, nullable=True)  # Result of execution
    
    executed_at = Column(DateTime(timezone=True), server_default=func.now())
    
    def __repr__(self):
        return f"<ExecutionLog(id={self.id}, workflow_id={self.workflow_id}, status={self.status})>"