from pydantic import BaseModel, EmailStr
from typing import Optional, List, Any
from datetime import datetime


# --- Supplier ---
class SupplierBase(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    company: Optional[str] = None

class SupplierCreate(SupplierBase):
    pass

class SupplierOut(SupplierBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True


# --- Product ---
class ProductBase(BaseModel):
    name: str
    category: str
    stock: int = 0
    price: float
    low_stock_threshold: int = 10
    supplier_id: Optional[int] = None

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    stock: Optional[int] = None
    price: Optional[float] = None
    low_stock_threshold: Optional[int] = None
    supplier_id: Optional[int] = None

class ProductOut(ProductBase):
    id: int
    sku: str
    is_active: bool
    created_at: datetime
    supplier: Optional[SupplierOut] = None
    class Config:
        from_attributes = True


# --- Customer ---
class CustomerBase(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None

class CustomerCreate(CustomerBase):
    pass

class CustomerOut(CustomerBase):
    id: int
    last_purchase: Optional[datetime] = None
    created_at: datetime
    class Config:
        from_attributes = True


# --- Order ---
class OrderItemOut(BaseModel):
    id: int
    product_id: int
    quantity: int
    unit_price: float
    class Config:
        from_attributes = True

class OrderOut(BaseModel):
    id: int
    customer_id: int
    total_amount: float
    shipping_status: str
    order_date: datetime
    shipped_at: Optional[datetime] = None
    items: List[OrderItemOut] = []
    class Config:
        from_attributes = True


# --- Workflow ---
class WorkflowBase(BaseModel):
    name: str
    description: Optional[str] = None
    trigger: str
    condition: Optional[Any] = None
    actions: List[str]

class WorkflowCreate(WorkflowBase):
    pass

class WorkflowOut(WorkflowBase):
    id: int
    is_active: bool
    last_run: Optional[datetime] = None
    created_at: datetime
    class Config:
        from_attributes = True


# --- ExecutionLog ---
class ExecutionLogOut(BaseModel):
    id: int
    workflow_id: int
    status: str
    message: Optional[str] = None
    triggered_by: Optional[str] = None
    created_at: datetime
    class Config:
        from_attributes = True