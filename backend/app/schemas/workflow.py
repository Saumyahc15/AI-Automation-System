from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class WorkflowCreate(BaseModel):
    natural_language_input: str

class WorkflowOut(BaseModel):
    workflow_id: int
    natural_language_input: str
    trigger_type: str
    condition_json: dict
    actions_json: list
    notification_channel: Optional[str] = "gmail"
    calendar_event_id: Optional[str] = None
    frequency: str
    is_active: bool
    created_at: datetime
    last_executed_at: Optional[datetime]

    class Config:
        from_attributes = True