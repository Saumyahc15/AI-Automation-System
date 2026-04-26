from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.customer import Customer
from app.schemas.customer import CustomerCreate, CustomerOut
from typing import List
from datetime import datetime, timedelta

router = APIRouter()


@router.get("/", response_model=List[CustomerOut])
def list_customers(db: Session = Depends(get_db)):
    return db.query(Customer).order_by(Customer.last_purchase_date.desc()).all()


@router.post("/", response_model=CustomerOut)
def create_customer(data: CustomerCreate, db: Session = Depends(get_db)):
    c = Customer(**data.model_dump())
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


@router.get("/inactive")
def inactive_customers(days: int = 30, db: Session = Depends(get_db)):
    cutoff = datetime.utcnow() - timedelta(days=days)
    return db.query(Customer).filter(Customer.last_purchase_date < cutoff).all()