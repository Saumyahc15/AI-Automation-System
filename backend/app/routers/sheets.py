import json
from fastapi import APIRouter, Depends, Request, HTTPException
from app.models.user import User
from app.services.auth_service import check_manager
from app.services.sheets_service import (
    watch_sheet_edit_triggers,
    process_sheet_webhook_event,
    verify_sheets_webhook_signature,
)

router = APIRouter()


@router.post("/watch/run")
def run_sheet_watch(current_user: User = Depends(check_manager)):
    stats = watch_sheet_edit_triggers()
    return {"status": "ok", "stats": stats, "run_by": current_user.email}


@router.post("/webhook/edit")
async def sheets_edit_webhook(request: Request):
    raw = await request.body()
    signature = request.headers.get("X-Sheets-Signature", "")
    if not verify_sheets_webhook_signature(raw, signature):
        raise HTTPException(status_code=401, detail="Invalid sheets webhook signature")
    try:
        payload = json.loads(raw.decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")
    result = process_sheet_webhook_event(payload)
    return {"status": "ok", "result": result}
