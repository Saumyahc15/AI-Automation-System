from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class CustomerCreate(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None

class CustomerOut(CustomerCreate):
    customer_id: int
    total_orders: int
    lifetime_value: float
    last_purchase_date: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True
