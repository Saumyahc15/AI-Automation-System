from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey
from sqlalchemy.sql import func
from app.database import Base


class Coupon(Base):
    __tablename__ = "coupons"

    coupon_id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("customers.customer_id"), nullable=True)
    discount_percent = Column(Float, default=10.0)
    is_used = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    used_at = Column(DateTime(timezone=True), nullable=True)
    workflow_id = Column(Integer, ForeignKey("workflows.workflow_id"), nullable=True)
