from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.services.auth_service import get_current_user, check_manager
from app.services.llm_parser import (
    nl_query_to_answer, suggest_workflows,
    generate_morning_summary
)

router = APIRouter()


class QueryRequest(BaseModel):
    question: str


@router.post("/query")
def ask_question(
    data: QueryRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Natural language → SQL → plain English answer. All authenticated users."""
    return nl_query_to_answer(data.question, db)


@router.get("/suggest")
def get_suggestions(
    current_user: User = Depends(check_manager),
    db: Session = Depends(get_db)
):
    """AI suggests 3 workflows based on live store data. Manager+ access."""
    return {"suggestions": suggest_workflows(db), "suggested_by": current_user.email}


@router.get("/morning-summary")
def morning_summary(
    current_user: User = Depends(check_manager),
    db: Session = Depends(get_db)
):
    """AI-generated 5-bullet business health summary. Manager+ access."""
    summary = generate_morning_summary(db)
    return {"summary": summary, "generated_for": current_user.email}


