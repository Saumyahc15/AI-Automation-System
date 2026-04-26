from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean
from app.database import Base
from datetime import datetime

class Product(Base):
    __tablename__ = "products"

    product_id    = Column(Integer, primary_key=True, index=True)
    name          = Column(String, nullable=False)
    sku           = Column(String, nullable=True)
    stock         = Column(Integer, default=0)
    price         = Column(Float, nullable=False, default=0.0)
    category      = Column(String, nullable=True)
    supplier_email= Column(String, nullable=True)
    reorder_threshold = Column(Integer, default=10)
    avg_daily_sales   = Column(Float, default=0.0)
    is_active     = Column(Boolean, default=True)
    updated_at    = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_at    = Column(DateTime, default=datetime.utcnow)
