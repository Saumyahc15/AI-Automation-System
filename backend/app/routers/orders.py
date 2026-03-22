from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import Order
from ..schemas import OrderOut

router = APIRouter(prefix="/orders", tags=["Orders"])

@router.get("/", response_model=List[OrderOut])
def get_orders(db: Session = Depends(get_db)):
    return db.query(Order).order_by(Order.order_date.desc()).all()

@router.get("/delayed")
def get_delayed_orders(db: Session = Depends(get_db)):
    return db.query(Order).filter(Order.shipping_status == "delayed").all()