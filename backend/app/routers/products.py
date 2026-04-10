from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import random, string
from ..database import get_db
from ..models import Product, User
from ..schemas import ProductCreate, ProductOut, ProductUpdate
from ..auth_handler import get_current_user
from ..engine.watchers import trigger_stock_workflow

router = APIRouter(prefix="/products", tags=["Products"])

def generate_sku():
    return "SKU-" + "".join(random.choices(string.digits, k=4))

def attach_margin(product: Product) -> dict:
    """Compute profit margin and attach to product output."""
    data = ProductOut.model_validate(product).model_dump()
    if product.cost_price and product.cost_price > 0:
        data["profit_margin"] = round((product.price - product.cost_price) / product.cost_price * 100, 1)
    return data

@router.get("/", response_model=List[ProductOut])
def get_products(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    products = db.query(Product).filter(Product.is_active == True, Product.user_id == current_user.id).offset(skip).limit(limit).all()
    result = []
    for p in products:
        out = ProductOut.model_validate(p)
        if p.cost_price and p.cost_price > 0:
            out.profit_margin = round((p.price - p.cost_price) / p.cost_price * 100, 1)
        result.append(out)
    return result

@router.get("/low-stock", response_model=List[ProductOut])
def get_low_stock(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Product).filter(
        Product.stock <= Product.low_stock_threshold,
        Product.is_active == True,
        Product.user_id == current_user.id
    ).all()

@router.get("/{product_id}", response_model=ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    product = db.query(Product).filter(Product.id == product_id, Product.user_id == current_user.id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@router.post("/", response_model=ProductOut, status_code=201)
def create_product(product: ProductCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sku = generate_sku()
    while db.query(Product).filter(Product.sku == sku).first():
        sku = generate_sku()
    db_product = Product(**product.model_dump(), sku=sku, user_id=current_user.id)
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

@router.patch("/{product_id}", response_model=ProductOut)
def update_product(product_id: int, updates: ProductUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    product = db.query(Product).filter(Product.id == product_id, Product.user_id == current_user.id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    for field, value in updates.model_dump(exclude_unset=True).items():
        setattr(product, field, value)
    db.commit()
    db.refresh(product)
    trigger_stock_workflow(product.id, db)
    return product

@router.patch("/{product_id}/adjust-stock", response_model=ProductOut)
def adjust_stock(product_id: int, quantity: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    product = db.query(Product).filter(Product.id == product_id, Product.user_id == current_user.id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    product.stock = max(0, product.stock + quantity)
    db.commit()
    db.refresh(product)
    trigger_stock_workflow(product.id, db)
    return product

@router.delete("/{product_id}", status_code=204)
def delete_product(product_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    product = db.query(Product).filter(Product.id == product_id, Product.user_id == current_user.id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    product.is_active = False   # soft delete
    db.commit()