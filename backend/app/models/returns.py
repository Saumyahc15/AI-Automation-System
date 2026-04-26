from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from app.database import Base
from datetime import datetime

class Return(Base):
    __tablename__ = "returns"

    return_id  = Column(Integer, primary_key=True, index=True)
    order_id   = Column(Integer, ForeignKey("orders.order_id"))
    product_id = Column(Integer, ForeignKey("products.product_id"))
    reason     = Column(String, nullable=True)
    return_date= Column(DateTime, default=datetime.utcnow)
    status     = Column(String, default="pending")   # pending/approved/rejected