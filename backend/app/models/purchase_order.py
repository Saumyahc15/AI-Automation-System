from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float
from app.database import Base
from datetime import datetime

class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    po_id            = Column(Integer, primary_key=True, index=True)
    product_id       = Column(Integer, ForeignKey("products.product_id"))
    supplier_email   = Column(String)
    quantity_ordered = Column(Integer)
    estimated_cost   = Column(Float, default=0.0)
    sent_at          = Column(DateTime, default=datetime.utcnow)
    status           = Column(String, default="sent")   # sent/confirmed/delivered