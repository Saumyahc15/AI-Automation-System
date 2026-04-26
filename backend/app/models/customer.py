from sqlalchemy import Column, Integer, String, Float, DateTime
from app.database import Base
from datetime import datetime

class Customer(Base):
    __tablename__ = "customers"

    customer_id       = Column(Integer, primary_key=True, index=True)
    name              = Column(String, nullable=False)
    email             = Column(String, unique=True, nullable=False, index=True)
    phone             = Column(String, nullable=True)
    last_purchase_date= Column(DateTime, nullable=True)
    total_orders      = Column(Integer, default=0)
    lifetime_value    = Column(Float, default=0.0)
    created_at        = Column(DateTime, default=datetime.utcnow)
