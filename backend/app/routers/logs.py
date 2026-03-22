from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import ExecutionLog
from ..schemas import ExecutionLogOut

router = APIRouter(prefix="/logs", tags=["Logs"])

@router.get("/", response_model=List[ExecutionLogOut])
def get_logs(limit: int = 50, db: Session = Depends(get_db)):
    return db.query(ExecutionLog).order_by(
        ExecutionLog.created_at.desc()
    ).limit(limit).all()

@router.get("/workflow/{workflow_id}", response_model=List[ExecutionLogOut])
def get_workflow_logs(workflow_id: int, db: Session = Depends(get_db)):
    return db.query(ExecutionLog).filter(
        ExecutionLog.workflow_id == workflow_id
    ).order_by(ExecutionLog.created_at.desc()).all()