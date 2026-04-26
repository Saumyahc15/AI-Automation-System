from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from app.database import Base
from datetime import datetime

class Order(Base):
    __tablename__ = "orders"

    order_id          = Column(Integer, primary_key=True, index=True)
    product_id        = Column(Integer, ForeignKey("products.product_id"), nullable=True)
    customer_id       = Column(Integer, ForeignKey("customers.customer_id"), nullable=True)
    quantity          = Column(Integer, default=1)
    total_price       = Column(Float, default=0.0)
    order_date        = Column(DateTime, default=datetime.utcnow)
    shipping_status   = Column(String, default="pending")  # pending/shipped/delivered/cancelled
    shipping_address  = Column(String, nullable=True)
    payment_method    = Column(String, nullable=True)
    shipped_at        = Column(DateTime, nullable=True)
    expected_delivery = Column(DateTime, nullable=True)
    created_at        = Column(DateTime, default=datetime.utcnow)
