from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class OrderCreate(BaseModel):
    product_id: Optional[int] = None
    customer_id: Optional[int] = None
    quantity: int
    total_price: float = 0.0
    shipping_address: Optional[str] = None
    payment_method: Optional[str] = None

class OrderOut(OrderCreate):
    order_id: int
    order_date: datetime
    shipping_status: str
    shipped_at: Optional[datetime] = None
    expected_delivery: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True
