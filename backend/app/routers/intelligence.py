from fastapi import APIRouter, Depends, Query, HTTPException, File, UploadFile
from sqlalchemy.orm import Session
from pydantic import BaseModel
from ..database import get_db
from ..intelligence.prediction import get_groq_forecast
from ..intelligence.sales_qa import answer_sales_question
from ..intelligence.suggestions import get_suggestions
from ..groq_client.client import transcribe_audio
from ..auth_handler import get_current_user
from ..models import User

router = APIRouter(prefix="/intelligence", tags=["Intelligence"])



class QuestionRequest(BaseModel):
    question: str


@router.get("/predict-stockouts")
def predict_stockouts(
    horizon_days: int = Query(default=7, ge=1, le=30),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        return get_groq_forecast(db, horizon_days, user_id=current_user.id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ask")
def ask_sales_question(request: QuestionRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        answer = answer_sales_question(db, request.question, current_user.id)
        return {"question": request.question, "answer": answer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/suggestions")
def get_automation_suggestions(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        return get_suggestions(db, user_id=current_user.id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/voice")
async def process_voice_command(file: UploadFile = File(...)):
    """Transcribe voice note and return the text."""
    try:
        content = await file.read()
        text = transcribe_audio(content, file.filename)
        return {"text": text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))