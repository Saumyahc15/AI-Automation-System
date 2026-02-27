from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime

# ==================== USER SCHEMAS ====================

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "user@example.com",
                "password": "securepassword123",
                "full_name": "John Doe"
            }
        }

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "user@example.com",
                "password": "securepassword123"
            }
        }

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: Optional[str]
    is_active: bool
    is_verified: bool
    created_at: datetime
    avatar: Optional[str] = None
    
    class Config:
        from_attributes = True

class AuthToken(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

# ==================== WORKFLOW SCHEMAS ====================

class WorkflowCreate(BaseModel):
    user_instruction: str

class WorkflowResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    user_instruction: str
    trigger_type: Optional[str]
    is_active: bool
    created_at: datetime
    execution_count: int = 0
    success_count: int = 0
    failure_count: int = 0
    last_executed: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class WorkflowExecuteRequest(BaseModel):
    workflow_id: int
    input_data: Optional[Dict[str, Any]] = None

class ExecutionLogResponse(BaseModel):
    id: int
    workflow_id: int
    status: str
    error_message: Optional[str]
    execution_time: int
    executed_at: datetime
    
    class Config:
        from_attributes = True