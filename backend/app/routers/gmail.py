from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.models.user import User
from app.services.auth_service import check_manager
from app.services import gmail_service

router = APIRouter()


class ReplyPayload(BaseModel):
    thread_id: str
    to: str
    subject: str
    body_html: str
    label_name: str = "Retail-AI/Replied"


@router.get("/status")
def check_gmail_status(current_user: User = Depends(check_manager)):
    """Check if Gmail is authenticated for current user."""
    is_authenticated = gmail_service.is_gmail_authenticated(current_user.user_id)
    return {
        "authenticated": is_authenticated,
        "user": current_user.email,
        "user_id": current_user.user_id,
        "message": "Gmail is ready to use" if is_authenticated else "Gmail needs authentication. Use OAuth flow to authorize."
    }


@router.get("/messages")
def list_recent_messages(
    query: str = "",
    max_results: int = 15,
    current_user: User = Depends(check_manager),
):
    try:
        messages = gmail_service.get_recent_thread_replies(query=query, max_results=max_results, user_id=current_user.user_id)
        return {"count": len(messages), "messages": messages, "requested_by": current_user.email}
    except Exception as e:
        error_msg = str(e)
        if "Gmail authentication required" in error_msg:
            raise HTTPException(status_code=401, detail=f"Gmail not authenticated: {error_msg}")
        raise HTTPException(status_code=500, detail=f"Failed to load Gmail messages: {error_msg}")


@router.get("/threads/{thread_id}")
def get_thread(
    thread_id: str,
    current_user: User = Depends(check_manager),
):
    try:
        messages = gmail_service.get_thread_messages(thread_id, user_id=current_user.user_id)
        return {"thread_id": thread_id, "messages": messages, "requested_by": current_user.email}
    except Exception as e:
        error_msg = str(e)
        if "Gmail authentication required" in error_msg:
            raise HTTPException(status_code=401, detail=f"Gmail not authenticated: {error_msg}")
        raise HTTPException(status_code=500, detail=f"Failed to load thread: {error_msg}")


@router.post("/reply")
def reply_in_thread(
    payload: ReplyPayload,
    current_user: User = Depends(check_manager),
):
    try:
        result = gmail_service.send_thread_reply(
            thread_id=payload.thread_id,
            to=payload.to,
            subject=payload.subject,
            body_html=payload.body_html,
            label_name=payload.label_name,
            user_id=current_user.user_id,
        )
        if not result:
            raise HTTPException(status_code=500, detail="Failed to send Gmail reply")
        return result
    except Exception as e:
        error_msg = str(e)
        if "Gmail authentication required" in error_msg:
            raise HTTPException(status_code=401, detail=f"Gmail not authenticated: {error_msg}")
        raise HTTPException(status_code=500, detail=f"Failed to send reply: {error_msg}")
    return {"status": "sent", "result": result, "sent_by": current_user.email}


@router.post("/lifecycle/run")
def run_lifecycle_rules(
    current_user: User = Depends(check_manager),
):
    stats = gmail_service.run_thread_lifecycle_rules()
    return {"status": "ok", "stats": stats, "run_by": current_user.email}
