from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from ..database import get_db
from ..models import Workflow
from ..schemas import WorkflowCreate, WorkflowOut
from ..groq_client.client import parse_nl_to_workflow
import json

router = APIRouter(prefix="/workflows", tags=["Workflows"])


class NLRequest(BaseModel):
    text: str


@router.get("/", response_model=List[WorkflowOut])
def get_workflows(db: Session = Depends(get_db)):
    return db.query(Workflow).order_by(Workflow.created_at.desc()).all()


@router.post("/", response_model=WorkflowOut, status_code=201)
def create_workflow(workflow: WorkflowCreate, db: Session = Depends(get_db)):
    db_workflow = Workflow(**workflow.model_dump())
    db.add(db_workflow)
    db.commit()
    db.refresh(db_workflow)
    return db_workflow


@router.post("/parse", response_model=WorkflowOut, status_code=201)
def parse_and_create_workflow(request: NLRequest, db: Session = Depends(get_db)):
    """
    Takes a natural language string, sends to Groq,
    gets back structured JSON, saves it as a workflow.
    """
    try:
        parsed = parse_nl_to_workflow(request.text)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    # Validate required fields came back
    required = ["name", "trigger", "actions"]
    for field in required:
        if field not in parsed:
            raise HTTPException(status_code=422, detail=f"Groq response missing field: {field}")

    # Duplicate check: check if a workflow with same trigger and condition already exists
    new_trigger = parsed["trigger"]
    new_condition_str = json.dumps(parsed.get("condition"), sort_keys=True)
    
    existing = db.query(Workflow).filter(Workflow.trigger == new_trigger).all()
    for ex in existing:
        if json.dumps(ex.condition, sort_keys=True) == new_condition_str:
            return ex # Return already existing instead of duplicate

    db_workflow = Workflow(
        name=parsed.get("name", "Unnamed workflow"),
        description=parsed.get("description", ""),
        trigger=parsed["trigger"],
        condition=parsed.get("condition"),
        actions=parsed["actions"],
        is_active=True
    )
    db.add(db_workflow)
    db.commit()
    db.refresh(db_workflow)
    return db_workflow


@router.patch("/{workflow_id}/toggle")
def toggle_workflow(workflow_id: int, db: Session = Depends(get_db)):
    wf = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    wf.is_active = not wf.is_active
    db.commit()
    return {"id": wf.id, "is_active": wf.is_active}


@router.delete("/{workflow_id}", status_code=204)
def delete_workflow(workflow_id: int, db: Session = Depends(get_db)):
    wf = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    db.delete(wf)
    db.commit()