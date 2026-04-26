from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.workflow import Workflow
from app.models.workflow_log import WorkflowLog
from app.models.user import User
from app.services.llm_parser import parse_workflow
from app.services.auth_service import get_current_user, check_manager
from app.schemas.workflow import WorkflowCreate, WorkflowOut
from typing import List

router = APIRouter()


@router.post("/create", response_model=dict)
def create_workflow(
    data: WorkflowCreate,
    current_user: User = Depends(check_manager),
    db: Session = Depends(get_db)
):
    """Parse natural language and save workflow to DB. Manager+ access."""
    parsed = parse_workflow(data.natural_language_input)
    wf = Workflow(
        user_id=current_user.user_id,
        natural_language_input=data.natural_language_input,
        trigger_type=parsed["trigger_type"],
        condition_json=parsed.get("condition", {}),
        actions_json=parsed.get("actions", []),
        notification_channel=parsed.get("notification_channel", "gmail"),
        frequency=parsed.get("frequency", "every_15_min"),
    )
    db.add(wf)
    db.commit()
    db.refresh(wf)
    # Create Google Calendar reminder for workflow schedule/expectation.
    try:
        from app.services.calendar_service import create_or_update_workflow_calendar_event
        event_id = create_or_update_workflow_calendar_event(wf)
        if event_id:
            wf.calendar_event_id = event_id
            db.commit()
    except Exception:
        pass
    try:
        from app.tasks.scheduler import sync_workflow_jobs
        sync_workflow_jobs()
    except Exception:
        pass
    return {"workflow_id": wf.workflow_id, "parsed": parsed, "status": "active", "created_by": current_user.email}


@router.get("/", response_model=List[WorkflowOut])
def list_workflows(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List active workflows. All authenticated users."""
    return db.query(Workflow).filter(Workflow.is_active == True).order_by(
        Workflow.created_at.desc()
    ).all()


@router.get("/{workflow_id}/logs")
def get_logs(
    workflow_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """View execution history. All authenticated users."""
    return db.query(WorkflowLog).filter(
        WorkflowLog.workflow_id == workflow_id
    ).order_by(WorkflowLog.executed_at.desc()).limit(20).all()


@router.post("/{workflow_id}/run-now")
def run_workflow_now(
    workflow_id: int,
    current_user: User = Depends(check_manager),
    db: Session = Depends(get_db)
):
    """Manually trigger a workflow for demo purposes. Manager+ access."""
    from app.services.execution_engine import _execute_workflow
    wf = db.query(Workflow).filter(Workflow.workflow_id == workflow_id).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    _execute_workflow(wf, db)
    return {"status": "executed", "workflow_id": workflow_id, "triggered_by": current_user.email}


@router.delete("/{workflow_id}")
def deactivate_workflow(
    workflow_id: int,
    current_user: User = Depends(check_manager),
    db: Session = Depends(get_db)
):
    """Deactivate a workflow. Manager+ access."""
    wf = db.query(Workflow).filter(Workflow.workflow_id == workflow_id).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    try:
        from app.services.calendar_service import delete_workflow_calendar_event
        delete_workflow_calendar_event(wf.calendar_event_id or "")
    except Exception:
        pass
    wf.is_active = False
    wf.calendar_event_id = None
    db.commit()
    try:
        from app.tasks.scheduler import sync_workflow_jobs
        sync_workflow_jobs()
    except Exception:
        pass
    return {"status": "deactivated", "deactivated_by": current_user.email}