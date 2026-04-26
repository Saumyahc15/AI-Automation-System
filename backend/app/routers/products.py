from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.product import Product
from app.schemas.product import ProductCreate, ProductUpdate, ProductOut
from typing import List

router = APIRouter()


@router.get("/", response_model=List[ProductOut])
def list_products(db: Session = Depends(get_db)):
    return db.query(Product).filter(Product.is_active == True).order_by(Product.stock).all()


@router.post("/", response_model=ProductOut)
def create_product(data: ProductCreate, db: Session = Depends(get_db)):
    p = Product(**data.model_dump())
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


@router.patch("/{product_id}", response_model=ProductOut)
def update_product(product_id: int, data: ProductUpdate, db: Session = Depends(get_db)):
    p = db.query(Product).filter(Product.product_id == product_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    for field, val in data.model_dump(exclude_unset=True).items():
        setattr(p, field, val)
    db.commit()
    db.refresh(p)
    return p


@router.delete("/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db)):
    p = db.query(Product).filter(Product.product_id == product_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    p.is_active = False
    db.commit()
    return {"status": "deleted"}


@router.get("/low-stock")
def low_stock_products(threshold: int = 10, db: Session = Depends(get_db)):
    return db.query(Product).filter(
        Product.stock <= threshold, Product.is_active == True
    ).order_by(Product.stock).all()
