from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from ..database import get_db
from ..intelligence.prediction import get_groq_forecast
from ..intelligence.sales_qa import answer_sales_question
from ..intelligence.suggestions import get_suggestions

router = APIRouter(prefix="/intelligence", tags=["Intelligence"])


class QuestionRequest(BaseModel):
    question: str


@router.get("/predict-stockouts")
def predict_stockouts(
    horizon_days: int = Query(default=7, ge=1, le=30),
    db: Session = Depends(get_db)
):
    try:
        return get_groq_forecast(db, horizon_days)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ask")
def ask_sales_question(request: QuestionRequest, db: Session = Depends(get_db)):
    try:
        answer = answer_sales_question(db, request.question)
        return {"question": request.question, "answer": answer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/suggestions")
def get_automation_suggestions(db: Session = Depends(get_db)):
    try:
        return get_suggestions(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))