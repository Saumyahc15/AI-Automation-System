from pydantic import BaseModel, EmailStr
from typing import Optional, List, Any
from datetime import datetime


# --- Auth & Users ---
class Token(BaseModel):
    access_token: str
    token_type: str

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

class VerifyEmail(BaseModel):
    email: EmailStr
    code: str

class UserConfigBase(BaseModel):
    smtp_host: Optional[str] = "smtp.gmail.com"
    smtp_port: Optional[int] = 587
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    mail_from: Optional[str] = None
    manager_email: Optional[str] = None
    manager_phone: Optional[str] = None
    telegram_bot_token: Optional[str] = None
    telegram_chat_id: Optional[str] = None

class UserConfigUpdate(UserConfigBase):
    pass

class UserConfigOut(UserConfigBase):
    id: int
    user_id: int
    class Config:
        from_attributes = True

# --- Supplier ---
class SupplierBase(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    company: Optional[str] = None
    telegram_chat_id: Optional[str] = None

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
    cost_price: Optional[float] = None
    low_stock_threshold: int = 10
    supplier_id: Optional[int] = None

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    stock: Optional[int] = None
    price: Optional[float] = None
    cost_price: Optional[float] = None
    low_stock_threshold: Optional[int] = None
    supplier_id: Optional[int] = None

class ProductOut(ProductBase):
    id: int
    sku: str
    is_active: bool
    created_at: datetime
    supplier: Optional[SupplierOut] = None
    profit_margin: Optional[float] = None  # computed field
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
    total_orders: int = 0
    total_spent: float = 0.0
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
    delivered_at: Optional[datetime] = None
    notes: Optional[str] = None
    items: List[OrderItemOut] = []
    class Config:
        from_attributes = True

class OrderStatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None


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


# --- Restock Request ---
class RestockRequestCreate(BaseModel):
    product_id: int
    supplier_id: int
    units_requested: int
    notes: Optional[str] = None

class RestockRequestUpdate(BaseModel):
    status: Optional[str] = None   # pending, acknowledged, fulfilled, cancelled
    units_received: Optional[int] = None
    notes: Optional[str] = None

class RestockRequestOut(BaseModel):
    id: int
    product_id: int
    supplier_id: int
    units_requested: int
    units_received: Optional[int] = None
    status: str
    notes: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    product: Optional[ProductOut] = None
    supplier: Optional[SupplierOut] = None
    class Config:
        from_attributes = True


# --- Notifications ---
class NotificationOut(BaseModel):
    id: int
    title: str
    message: str
    type: str
    is_read: bool
    link: Optional[str] = None
    created_at: datetime
    class Config:
        from_attributes = True