from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from ..database import get_db
from ..models import RestockRequest, Product, Supplier, Notification, User
from ..schemas import RestockRequestCreate, RestockRequestOut, RestockRequestUpdate
from ..auth_handler import get_current_user

router = APIRouter(prefix="/restock", tags=["Restock"])


@router.get("/", response_model=List[RestockRequestOut])
def get_restock_requests(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(RestockRequest).filter(RestockRequest.user_id == current_user.id).order_by(RestockRequest.created_at.desc()).all()


@router.post("/", response_model=RestockRequestOut, status_code=201)
def create_restock_request(req: RestockRequestCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    product = db.query(Product).filter(Product.id == req.product_id, Product.user_id == current_user.id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    supplier = db.query(Supplier).filter(Supplier.id == req.supplier_id, Supplier.user_id == current_user.id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    db_req = RestockRequest(
        user_id=current_user.id,
        product_id=req.product_id,
        supplier_id=req.supplier_id,
        units_requested=req.units_requested,
        notes=req.notes,
        status="pending"
    )
    db.add(db_req)

    # Also create an in-app notification
    notif = Notification(
        user_id=current_user.id,
        title="Restock Request Created",
        message=f"Restock request for {product.name} ({req.units_requested} units) sent to {supplier.name}.",
        type="info",
        link="/restock"
    )
    db.add(notif)
    db.commit()
    db.refresh(db_req)
    return db_req


@router.patch("/{req_id}", response_model=RestockRequestOut)
def update_restock_request(req_id: int, updates: RestockRequestUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    req = db.query(RestockRequest).filter(RestockRequest.id == req_id, RestockRequest.user_id == current_user.id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Restock request not found")

    for field, value in updates.model_dump(exclude_unset=True).items():
        setattr(req, field, value)

    # If fulfilled — update product stock automatically
    if updates.status == "fulfilled" and updates.units_received:
        product = db.query(Product).filter(Product.id == req.product_id).first()
        if product:
            product.stock += updates.units_received
            notif = Notification(
                user_id=current_user.id,
                title="Stock Restocked ✅",
                message=f"{product.name} restocked by {updates.units_received} units. New stock: {product.stock}.",
                type="success",
                link="/inventory"
            )
            db.add(notif)

    db.commit()
    db.refresh(req)
    return req


@router.delete("/{req_id}", status_code=204)
def delete_restock_request(req_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    req = db.query(RestockRequest).filter(RestockRequest.id == req_id, RestockRequest.user_id == current_user.id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(req)
    db.commit()
