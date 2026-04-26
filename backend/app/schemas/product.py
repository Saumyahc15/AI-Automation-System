from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ProductBase(BaseModel):
    name: str
    stock: int
    price: float
    category: Optional[str] = None
    supplier_email: Optional[str] = None
    reorder_threshold: int = 10

class ProductCreate(ProductBase):
    sku: Optional[str] = None

class ProductUpdate(BaseModel):
    stock: Optional[int] = None
    price: Optional[float] = None
    supplier_email: Optional[str] = None
    reorder_threshold: Optional[int] = None

class ProductOut(ProductBase):
    product_id: int
    sku: Optional[str] = None
    avg_daily_sales: float
    updated_at: datetime
    created_at: datetime
    is_active: bool

    class Config:
        from_attributes = True
