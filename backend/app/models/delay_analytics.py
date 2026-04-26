from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.database import Base


class DelayAnalytics(Base):
    __tablename__ = "delay_analytics"

    delay_id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.order_id"), nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("customers.customer_id"), nullable=True)
    product_id = Column(Integer, ForeignKey("products.product_id"), nullable=True)
    delay_hours = Column(Float, nullable=False)
    detected_at = Column(DateTime(timezone=True), server_default=func.now())
    alert_sent_to_manager = Column(String, default="gmail")
    alert_sent_to_customer = Column(String, nullable=True)
    workflow_id = Column(Integer, ForeignKey("workflows.workflow_id"), nullable=True)
