from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import select, desc
from typing import List, Dict
import os
import uuid
from datetime import datetime

from app.core.database import get_db
from app.models.workflow import Workflow
from app.models.execution_log import ExecutionLog
from app.api.schemas import (
    WorkflowCreate, WorkflowResponse, 
    WorkflowExecuteRequest, ExecutionLogResponse
)
from app.services.ai_service import AIService
from app.workflows.executor import WorkflowExecutor

router = APIRouter()

# Pydantic models for calendar endpoints
class QuickEventRequest(BaseModel):
    text: str

# File upload directory
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/files/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload and process files"""
    try:
        # Generate unique file ID
        file_id = str(uuid.uuid4())
        file_extension = os.path.splitext(file.filename)[1]
        file_path = os.path.join(UPLOAD_DIR, f"{file_id}{file_extension}")
        
        # Save file
        contents = await file.read()
        with open(file_path, "wb") as f:
            f.write(contents)
        
        return {
            "success": True,
            "file_id": file_id,
            "filename": file.filename,
            "content_type": file.content_type,
            "size": len(contents),
            "uploaded_at": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"File upload failed: {str(e)}")


@router.get("/files/{file_id}")
def download_file(file_id: str):
    """Download processed files"""
    try:
        # Search for file with matching ID
        import glob
        matching_files = glob.glob(os.path.join(UPLOAD_DIR, f"{file_id}*"))
        
        if not matching_files:
            raise HTTPException(status_code=404, detail="File not found")
        
        file_path = matching_files[0]
        
        from fastapi.responses import FileResponse
        return FileResponse(
            path=file_path,
            filename=os.path.basename(file_path),
            media_type="application/octet-stream"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File download failed: {str(e)}")


@router.post("/webhooks/create")
def create_webhook(workflow_id: int, db: Session = Depends(get_db)):
    """Generate webhook URL for triggering workflows"""
    try:
        # Verify workflow exists
        result = db.execute(select(Workflow).filter(Workflow.id == workflow_id))
        workflow = result.scalar_one_or_none()
        
        if not workflow:
            raise HTTPException(status_code=404, detail="Workflow not found")
        
        # Generate webhook token
        webhook_token = str(uuid.uuid4())
        webhook_url = f"/webhooks/trigger/{workflow_id}/{webhook_token}"
        
        # Store webhook config in workflow (requires schema update)
        workflow.webhook_enabled = True
        workflow.webhook_token = webhook_token
        
        db.commit()
        
        return {
            "success": True,
            "workflow_id": workflow_id,
            "webhook_token": webhook_token,
            "webhook_url": webhook_url,
            "full_url": f"https://your-domain.com{webhook_url}"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create webhook: {str(e)}")


@router.post("/webhooks/trigger/{workflow_id}/{webhook_token}")
async def trigger_webhook(workflow_id: int, webhook_token: str, db: Session = Depends(get_db)):
    """Webhook endpoint to trigger workflow execution"""
    try:
        # Verify workflow and token
        result = db.execute(select(Workflow).filter(Workflow.id == workflow_id))
        workflow = result.scalar_one_or_none()
        
        if not workflow:
            raise HTTPException(status_code=404, detail="Workflow not found")
        
        if not hasattr(workflow, 'webhook_token') or workflow.webhook_token != webhook_token:
            raise HTTPException(status_code=401, detail="Invalid webhook token")
        
        # Execute workflow
        executor = WorkflowExecutor()
        result = await executor.execute(workflow.workflow_code, workflow.workflow_yaml)
        
        return {
            "success": True,
            "workflow_id": workflow_id,
            "execution_status": "triggered",
            "result": result
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Webhook execution failed: {str(e)}")


@router.delete("/webhooks/{workflow_id}")
def delete_webhook(workflow_id: int, db: Session = Depends(get_db)):
    """Disable webhook for a workflow"""
    try:
        result = db.execute(select(Workflow).filter(Workflow.id == workflow_id))
        workflow = result.scalar_one_or_none()
        
        if not workflow:
            raise HTTPException(status_code=404, detail="Workflow not found")
        
        workflow.webhook_enabled = False
        workflow.webhook_token = None
        
        db.commit()
        
        return {
            "success": True,
            "message": "Webhook disabled successfully",
            "workflow_id": workflow_id
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete webhook: {str(e)}")

@router.post("/workflows/create", response_model=WorkflowResponse)
async def create_workflow(
    workflow_data: WorkflowCreate,
    user_id: int,
    db: Session = Depends(get_db)
):
    """
    Create a new workflow from natural language instruction for the logged-in user
    """
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        if not user_id:
            raise HTTPException(status_code=401, detail="User not authenticated")
        
        # Step 1: Parse user instruction using AI
        logger.info(f"Step 1: Parsing instruction: {workflow_data.user_instruction[:100]}...")
        parsed = await AIService.parse_user_instruction(workflow_data.user_instruction)
        logger.info(f"Step 1 Success: Parsed workflow - {parsed.get('workflow_name')}")
        
        # Step 2: Generate workflow code with integrations
        logger.info("Step 2: Generating workflow code...")
        code = await AIService.generate_workflow_code_with_integrations(parsed)
        logger.info(f"Step 2 Success: Code generated ({len(code)} chars)")
        
        # Step 3: Generate YAML
        logger.info("Step 3: Generating YAML...")
        yaml_content = await AIService.generate_yaml(parsed)
        logger.info(f"Step 3 Success: YAML generated ({len(yaml_content)} chars)")
        
        # Step 4: Save to database with user_id
        logger.info("Step 4: Saving workflow to database...")
        workflow = Workflow(
            user_id=user_id,
            name=parsed.get("workflow_name", "Untitled Workflow"),
            description=parsed.get("description", ""),
            user_instruction=workflow_data.user_instruction,
            trigger_type=parsed["trigger"]["type"],
            trigger_config=parsed["trigger"].get("config", {}),
            actions=parsed.get("actions", []),
            workflow_code=code,
            workflow_yaml=yaml_content,
            is_active=True
        )
        
        db.add(workflow)
        db.commit()
        db.refresh(workflow)
        
        logger.info(f"Step 4 Success: Workflow saved with ID {workflow.id}")
        
        # Step 5: Auto-activate cron-scheduled and email-triggered workflows
        logger.info("Step 5: Activating workflow triggers...")
        if workflow.trigger_type in ["cron_schedule", "email_received"]:
            from app.services.workflow_service import WorkflowService
            workflow_service = WorkflowService()
            success = await workflow_service.activate_workflow(workflow, db)
            if success:
                workflow.is_active = True
                db.commit()
                logger.info(f"Step 5 Success: Workflow {workflow.id} activated automatically")
            else:
                logger.warning(f"Step 5 Warning: Failed to activate workflow {workflow.id}")
        
        return workflow
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Workflow creation failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to create workflow: {str(e)}")

@router.get("/workflows", response_model=List[WorkflowResponse])
def get_all_workflows(user_id: int, db: Session = Depends(get_db)):
    """
    Get all workflows for the logged-in user
    """
    workflows = db.query(Workflow).filter(Workflow.user_id == user_id).order_by(desc(Workflow.created_at)).all()
    return workflows

@router.get("/workflows/{workflow_id}", response_model=WorkflowResponse)
def get_workflow(workflow_id: int, user_id: int, db: Session = Depends(get_db)):
    """
    Get a specific workflow (must belong to logged-in user)
    """
    workflow = db.query(Workflow).filter(
        (Workflow.id == workflow_id) & (Workflow.user_id == user_id)
    ).first()
    
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    return workflow

@router.post("/workflows/execute")
async def execute_workflow(
    request: WorkflowExecuteRequest,
    user_id: int,
    db: Session = Depends(get_db)
):
    """
    Execute a workflow manually for the logged-in user
    """
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        # Get workflow (verify it belongs to user)
        workflow = db.query(Workflow).filter(
            (Workflow.id == request.workflow_id) & (Workflow.user_id == user_id)
        ).first()
        
        if not workflow:
            raise HTTPException(status_code=404, detail="Workflow not found")
        
        if not workflow.is_active:
            raise HTTPException(status_code=400, detail="Workflow is not active")
        
        # Execute - this is now async
        logger.info(f"Executing workflow {workflow.id}")
        execution_result = await WorkflowExecutor.execute(
            workflow.workflow_code,
            request.input_data
        )
        
        # Log execution with user_id
        log = ExecutionLog(
            user_id=user_id,
            workflow_id=workflow.id,
            status=execution_result["status"],
            error_message=execution_result.get("error"),
            execution_time=execution_result["execution_time"],
            input_data=str(request.input_data) if request.input_data else None,
            output_data=str(execution_result.get("result")) if execution_result.get("result") else None
        )
        
        db.add(log)
        
        # Update workflow stats
        workflow.execution_count += 1
        workflow.last_executed = log.executed_at
        
        if execution_result["status"] == "success":
            workflow.success_count += 1
        else:
            workflow.failure_count += 1
        
        db.commit()
        
        logger.info(f"Workflow {workflow.id} executed successfully")
        return execution_result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Workflow execution failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Workflow execution failed: {str(e)}")

@router.delete("/workflows/{workflow_id}")
def delete_workflow(workflow_id: int, db: Session = Depends(get_db)):
    """
    Delete a workflow
    """
    result = db.execute(select(Workflow).where(Workflow.id == workflow_id))
    workflow = result.scalar_one_or_none()
    
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    db.delete(workflow)
    db.commit()
    
    return {"message": "Workflow deleted successfully"}

@router.get("/workflows/{workflow_id}/logs", response_model=List[ExecutionLogResponse])
def get_workflow_logs(workflow_id: int, user_id: int, db: Session = Depends(get_db)):
    """
    Get execution logs for a workflow (must belong to user)
    """
    # Verify workflow belongs to user
    result = db.execute(
        select(Workflow).where(
            (Workflow.id == workflow_id) & (Workflow.user_id == user_id)
        )
    )
    workflow = result.scalar_one_or_none()
    
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    result = db.execute(
        select(ExecutionLog)
        .where(ExecutionLog.workflow_id == workflow_id)
        .order_by(desc(ExecutionLog.executed_at))
        .limit(50)
    )
    logs = result.scalars().all()
    return logs

@router.get("/logs")
def get_all_logs(user_id: int, limit: int = 100, db: Session = Depends(get_db)):
    """
    Get all execution logs for the logged-in user with workflow info
    """
    result = db.execute(
        select(ExecutionLog, Workflow)
        .outerjoin(Workflow, ExecutionLog.workflow_id == Workflow.id)
        .where(ExecutionLog.user_id == user_id)
        .order_by(desc(ExecutionLog.executed_at))
        .limit(limit)
    )
    logs_with_workflows = result.all()
    
    # Format response to include workflow name
    response = []
    for log, workflow in logs_with_workflows:
        log_dict = {
            "id": log.id,
            "workflow_id": log.workflow_id,
            "workflow_name": workflow.name if workflow else "Unknown",
            "status": log.status,
            "error_message": log.error_message,
            "execution_time": log.execution_time,
            "input_data": log.input_data,
            "output_data": log.output_data,
            "executed_at": log.executed_at,
            "started_at": log.executed_at,
            "duration_ms": log.execution_time
        }
        response.append(log_dict)
    
    return response

@router.post("/workflows/{workflow_id}/activate")
async def activate_workflow(workflow_id: int, db: Session = Depends(get_db)):
    """
    Activate a workflow (start listening for triggers)
    """
    from app.services.workflow_service import WorkflowService
    
    result = db.execute(select(Workflow).where(Workflow.id == workflow_id))
    workflow = result.scalar_one_or_none()
    
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    workflow_service = WorkflowService()
    success = await workflow_service.activate_workflow(workflow, db)
    
    if success:
        workflow.is_active = True
        db.commit()
        return {"message": "Workflow activated successfully", "workflow_id": workflow_id}
    else:
        raise HTTPException(status_code=500, detail="Failed to activate workflow")

@router.post("/workflows/{workflow_id}/deactivate")
async def deactivate_workflow(workflow_id: int, db: Session = Depends(get_db)):
    """
    Deactivate a workflow
    """
    from app.services.workflow_service import WorkflowService
    
    result = db.execute(select(Workflow).where(Workflow.id == workflow_id))
    workflow = result.scalar_one_or_none()
    
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    workflow_service = WorkflowService()
    success = await workflow_service.deactivate_workflow(workflow)
    
    if success:
        workflow.is_active = False
        db.commit()
        return {"message": "Workflow deactivated successfully", "workflow_id": workflow_id}
    else:
        raise HTTPException(status_code=500, detail="Failed to deactivate workflow")

@router.get("/workflows/{workflow_id}/code")
def get_workflow_code(workflow_id: int, db: Session = Depends(get_db)):
    """
    Get the generated code for a workflow
    """
    result = db.execute(select(Workflow).where(Workflow.id == workflow_id))
    workflow = result.scalar_one_or_none()
    
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    return {
        "workflow_id": workflow.id,
        "workflow_name": workflow.name,
        "code": workflow.workflow_code,
        "yaml": workflow.workflow_yaml,
        "trigger_type": workflow.trigger_type,
        "actions": workflow.actions
    }

@router.put("/workflows/{workflow_id}")
def update_workflow(
    workflow_id: int,
    workflow_data: WorkflowCreate,
    db: Session = Depends(get_db)
):
    """
    Update an existing workflow
    """
    result = db.execute(select(Workflow).where(Workflow.id == workflow_id))
    workflow = result.scalar_one_or_none()
    
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    try:
        # Re-parse and regenerate
        parsed = AIService.parse_user_instruction(workflow_data.user_instruction)
        code = AIService.generate_workflow_code_with_integrations(parsed)
        yaml_content = AIService.generate_yaml(parsed)
        
        # Update workflow
        workflow.name = parsed.get("workflow_name", workflow.name)
        workflow.description = parsed.get("description", workflow.description)
        workflow.user_instruction = workflow_data.user_instruction
        workflow.trigger_type = parsed["trigger"]["type"]
        workflow.trigger_config = parsed["trigger"].get("config", {})
        workflow.actions = parsed.get("actions", [])
        workflow.workflow_code = code
        workflow.workflow_yaml = yaml_content
        
        db.commit()
        db.refresh(workflow)
        
        return workflow
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update workflow: {str(e)}")

@router.post("/workflows/{workflow_id}/fix-code")
def fix_workflow_code(workflow_id: int, db: Session = Depends(get_db)):
    """
    Fix workflow code by removing incorrect await statements
    """
    from app.workflows.executor import WorkflowExecutor
    
    result = db.execute(select(Workflow).where(Workflow.id == workflow_id))
    workflow = result.scalar_one_or_none()
    
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    # Get original code
    original_code = workflow.workflow_code
    
    # Sanitize it
    fixed_code = WorkflowExecutor.sanitize_code(original_code)
    
    # Update workflow
    workflow.workflow_code = fixed_code
    db.commit()
    
    return {
        "message": "Workflow code fixed",
        "workflow_id": workflow_id,
        "changes_made": original_code != fixed_code,
        "original_length": len(original_code),
        "fixed_length": len(fixed_code)
    }

@router.post("/workflows/{workflow_id}/validate")
def validate_workflow_code(workflow_id: int, db: Session = Depends(get_db)):
    """
    Validate workflow code without executing it
    """
    result = db.execute(select(Workflow).where(Workflow.id == workflow_id))
    workflow = result.scalar_one_or_none()
    
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    validation_result = WorkflowExecutor.validate_code(workflow.workflow_code)
    
    return {
        "workflow_id": workflow_id,
        "workflow_name": workflow.name,
        **validation_result
    }

@router.post("/workflows/{workflow_id}/debug")
def debug_workflow(workflow_id: int, error_message: str, db: Session = Depends(get_db)):
    """
    Get AI-powered debugging suggestions for a workflow
    """
    result = db.execute(select(Workflow).where(Workflow.id == workflow_id))
    workflow = result.scalar_one_or_none()
    
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    debug_info = AIService.debug_workflow(workflow.workflow_code, error_message)
    
    return {
        "workflow_id": workflow_id,
        "workflow_name": workflow.name,
        **debug_info
    }

@router.get("/workflows/{workflow_id}/explain")
def explain_workflow(workflow_id: int, db: Session = Depends(get_db)):
    """
    Get a human-readable explanation of what the workflow does
    """
    result = db.execute(select(Workflow).where(Workflow.id == workflow_id))
    workflow = result.scalar_one_or_none()
    
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    explanation = AIService.explain_workflow(workflow.workflow_code)
    
    return {
        "workflow_id": workflow_id,
        "workflow_name": workflow.name,
        "explanation": explanation
    }

@router.post("/integrations/test-email")
def test_email_integration(to: str, subject: str, body: str):
    """
    Test email sending
    """
    from app.integrations.gmail_service import SimpleEmailService
    
    result = SimpleEmailService.send_simple_email(to, subject, body)
    return result

@router.get("/integrations/auth/gmail")
def authenticate_gmail():
    """
    Authenticate Gmail OAuth - Opens browser for user to authorize
    Stores credentials in credentials/token.pickle
    """
    try:
        from app.integrations.gmail_oauth import GmailOAuthService
        
        # This will open a browser window for user to authorize
        gmail = GmailOAuthService()
        
        return {
            "status": "success",
            "message": "Gmail authentication completed successfully. Token saved.",
            "authenticated": True
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Gmail authentication failed: {str(e)}",
            "authenticated": False,
            "details": "Make sure credentials.json exists in credentials/ folder"
        }

@router.post("/integrations/test-telegram")
def test_telegram(bot_token: str = None, chat_id: str = None, message: str = "Test message"):
    """
    Test Telegram messaging
    """
    from app.integrations.messaging_service import MessagingService
    
    result = MessagingService.send_telegram_message(bot_token, chat_id, message)
    return result

@router.post("/integrations/test-whatsapp")
def test_whatsapp(phone_number: str, message: str = "Test message"):
    """
    Test WhatsApp messaging
    """
    from app.integrations.messaging_service import MessagingService
    
    result = MessagingService.send_whatsapp_message(phone_number, message)
    return result

@router.get("/integrations/github-trends")
def get_github_trends():
    """
    Fetch GitHub trending repositories
    """
    from app.integrations.web_service import WebService
    
    trends = WebService.scrape_github_trends()
    return {"trends": trends, "count": len(trends)}

@router.get("/integrations/github/status")
def github_status():
    """
    Check GitHub integration status and rate limits
    """
    from app.integrations.github_service import GitHubService
    from app.core.config import get_settings
    
    settings = get_settings()
    github = GitHubService()
    
    has_token = bool(settings.GITHUB_ACCESS_TOKEN)
    rate_limit = github.get_rate_limit()
    
    return {
        "authenticated": has_token,
        "status": "ready",
        "rate_limit": rate_limit,
        "features": {
            "trending_repos": "available",
            "search_repos": "available",
            "user_repos": "available" if has_token else "requires_token",
            "create_issues": "available" if has_token else "requires_token"
        }
    }

@router.get("/integrations/github/search")
def github_search_repos(query: str, limit: int = 10):
    """
    Search GitHub repositories
    Example: query=python machine learning
    """
    from app.integrations.github_service import GitHubService
    
    github = GitHubService()
    repos = github.search_repositories(query, limit=limit)
    
    return {
        "query": query,
        "count": len(repos),
        "repositories": repos
    }

@router.get("/integrations/github/user/{username}/repos")
def github_user_repos(username: str, limit: int = 10):
    """
    Get repositories for a GitHub user
    """
    from app.integrations.github_service import GitHubService
    
    github = GitHubService()
    repos = github.get_user_repos(username, limit=limit)
    
    return {
        "username": username,
        "count": len(repos),
        "repositories": repos
    }

@router.get("/integrations/github/repo/{owner}/{repo}")
def github_repo_details(owner: str, repo: str):
    """
    Get details about a specific repository
    Example: owner=facebook, repo=react
    """
    from app.integrations.github_service import GitHubService
    
    github = GitHubService()
    details = github.get_repo_details(owner, repo)
    
    if not details:
        raise HTTPException(status_code=404, detail="Repository not found")
    
    return details

@router.get("/integrations/github/repo/{owner}/{repo}/commits")
def github_repo_commits(owner: str, repo: str, limit: int = 10):
    """
    Get recent commits for a repository
    """
    from app.integrations.github_service import GitHubService
    
    github = GitHubService()
    commits = github.get_repo_commits(owner, repo, limit=limit)
    
    return {
        "repository": f"{owner}/{repo}",
        "count": len(commits),
        "commits": commits
    }

@router.get("/integrations/github/repo/{owner}/{repo}/issues")
def github_repo_issues(owner: str, repo: str, state: str = "open", limit: int = 10):
    """
    Get issues for a repository
    state: open, closed, all
    """
    from app.integrations.github_service import GitHubService
    
    github = GitHubService()
    issues = github.get_repo_issues(owner, repo, state=state, limit=limit)
    
    return {
        "repository": f"{owner}/{repo}",
        "state": state,
        "count": len(issues),
        "issues": issues
    }

@router.post("/integrations/github/repo/{owner}/{repo}/issues")
def github_create_issue(owner: str, repo: str, title: str, body: str = "", labels: List[str] = None):
    """
    Create a new issue in a repository
    Requires GitHub token with repo scope
    """
    from app.integrations.github_service import GitHubService
    
    github = GitHubService()
    
    if not github.access_token:
        raise HTTPException(status_code=401, detail="GitHub token required. Set GITHUB_ACCESS_TOKEN in .env")
    
    issue = github.create_issue(owner, repo, title, body, labels)
    
    if not issue:
        raise HTTPException(status_code=500, detail="Failed to create issue")
    
    return issue

@router.get("/integrations/github/user/{username}")
def github_user_info(username: str = None):
    """
    Get information about a GitHub user
    """
    from app.integrations.github_service import GitHubService
    
    github = GitHubService()
    user_info = github.get_user_info(username)
    
    if not user_info:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user_info

@router.post("/integrations/web-fetch")
def fetch_web_url(url: str):
    """
    Fetch content from a URL
    """
    from app.integrations.web_service import WebService
    
    result = WebService.fetch_url(url)
    return result

@router.post("/integrations/whatsapp/send")
def send_whatsapp_message(phone: str, message: str):
    """
    Send WhatsApp message
    Phone format: Country code + number (e.g., 919876543210)
    """
    from app.integrations.whatsapp_service import WhatsAppService
    
    whatsapp = WhatsAppService()
    result = whatsapp.send_message(phone, message)
    
    return result

@router.post("/integrations/whatsapp/send-template")
def send_whatsapp_template(phone: str, template_name: str = "hello_world"):
    """
    Send WhatsApp template message
    Default template: hello_world (pre-approved by Meta)
    """
    from app.integrations.whatsapp_service import WhatsAppService
    
    whatsapp = WhatsAppService()
    result = whatsapp.send_template_message(phone, template_name)
    
    return result

@router.get("/integrations/whatsapp/status")
def whatsapp_status():
    """
    Check WhatsApp configuration status
    """
    import os
    from app.core.config import get_settings
    
    settings = get_settings()
    
    has_phone_id = bool(settings.WHATSAPP_PHONE_NUMBER_ID)
    has_token = bool(settings.WHATSAPP_ACCESS_TOKEN)
    
    return {
        "phone_number_id_configured": has_phone_id,
        "access_token_configured": has_token,
        "status": "ready" if (has_phone_id and has_token) else "not_configured",
        "api_version": settings.WHATSAPP_API_VERSION,
        "instructions": "Set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN in .env file" if not (has_phone_id and has_token) else "WhatsApp is ready"
    }

@router.post("/integrations/gmail/setup")
def setup_gmail_oauth():
    """
    Setup Gmail OAuth - Run this once to authenticate
    """
    try:
        from app.integrations.gmail_oauth import GmailOAuthService
        
        gmail = GmailOAuthService()
        
        return {
            "status": "success",
            "message": "Gmail OAuth setup completed! You can now send real emails.",
            "authenticated": True
        }
    except FileNotFoundError as e:
        return {
            "status": "error",
            "message": str(e),
            "instructions": "Please place credentials.json in the credentials/ folder"
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }

@router.get("/integrations/gmail/status")
def gmail_oauth_status():
    """
    Check Gmail OAuth status
    """
    import os
    
    has_credentials = os.path.exists('credentials/credentials.json')
    has_token = os.path.exists('credentials/token.pickle')
    
    return {
        "credentials_file": has_credentials,
        "authenticated": has_token,
        "status": "ready" if has_token else "needs_setup",
        "instructions": "Run POST /api/integrations/gmail/setup to authenticate" if not has_token else "Gmail is ready to use"
    }

@router.get("/integrations/telegram/status")
def telegram_status():
    """
    Check Telegram configuration status
    """
    from app.core.config import get_settings
    
    settings = get_settings()
    
    has_token = bool(getattr(settings, 'TELEGRAM_BOT_TOKEN', None))
    has_chat_id = bool(getattr(settings, 'TELEGRAM_CHAT_ID', None))
    
    return {
        "bot_token_configured": has_token,
        "chat_id_configured": has_chat_id,
        "status": "ready" if (has_token and has_chat_id) else "not_configured",
        "instructions": "Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env file" if not (has_token and has_chat_id) else "Telegram is ready"
    }

@router.get("/scheduler/jobs")
def get_scheduled_jobs():
    """
    Get all scheduled jobs
    """
    from app.services.workflow_service import WorkflowService
    
    workflow_service = WorkflowService()
    jobs = workflow_service.scheduler.get_scheduled_jobs()
    
    job_list = []
    for job in jobs:
        job_list.append({
            "id": job.id,
            "name": job.name,
            "next_run_time": str(job.next_run_time) if job.next_run_time else None,
            "trigger": str(job.trigger)
        })
    
    return {"jobs": job_list, "count": len(job_list)}

@router.get("/stats")
def get_system_stats(db: Session = Depends(get_db)):
    """
    Get system statistics
    """
    # Count total workflows
    workflows_result = db.execute(select(Workflow))
    total_workflows = len(workflows_result.scalars().all())
    
    # Count active workflows
    active_result = db.execute(select(Workflow).where(Workflow.is_active == True))
    active_workflows = len(active_result.scalars().all())
    
    # Count total executions
    logs_result = db.execute(select(ExecutionLog))
    total_executions = len(logs_result.scalars().all())
    
    # Count successful executions
    success_result = db.execute(select(ExecutionLog).where(ExecutionLog.status == "success"))
    successful_executions = len(success_result.scalars().all())
    
    return {
        "total_workflows": total_workflows,
        "active_workflows": active_workflows,
        "total_executions": total_executions,
        "successful_executions": successful_executions,
        "failed_executions": total_executions - successful_executions,
        "success_rate": round((successful_executions / total_executions * 100) if total_executions > 0 else 0, 2)
    }

@router.post("/workflows/batch-fix")
def batch_fix_workflows(db: Session = Depends(get_db)):
    """
    Fix all workflows at once
    """
    from app.workflows.executor import WorkflowExecutor
    
    result = db.execute(select(Workflow))
    workflows = result.scalars().all()
    
    fixed_count = 0
    for workflow in workflows:
        original_code = workflow.workflow_code
        fixed_code = WorkflowExecutor.sanitize_code(original_code)
        
        if original_code != fixed_code:
            workflow.workflow_code = fixed_code
            fixed_count += 1
    
    db.commit()
    
    return {
        "message": "Batch fix completed",
        "total_workflows": len(workflows),
        "workflows_fixed": fixed_count
    }

@router.post("/workflows/{workflow_id}/ask")
def ask_about_workflow(
    workflow_id: int,
    question: str,
    db: Session = Depends(get_db)
):
    """
    Ask AI questions about workflow failures
    Example: "Why did my workflow fail?", "What went wrong?", "How do I fix this?"
    """
    # Get workflow
    result = db.execute(select(Workflow).where(Workflow.id == workflow_id))
    workflow = result.scalar_one_or_none()
    
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    # Get recent error logs
    logs_result = db.execute(
        select(ExecutionLog)
        .where(ExecutionLog.workflow_id == workflow_id)
        .where(ExecutionLog.status == "failed")
        .order_by(desc(ExecutionLog.executed_at))
        .limit(5)
    )
    error_logs = logs_result.scalars().all()
    
    if not error_logs:
        return {
            "workflow_id": workflow_id,
            "workflow_name": workflow.name,
            "answer": "Great news! This workflow hasn't had any errors recently. It's running smoothly!"
        }
    
    # Get most recent error
    latest_error = error_logs[0]
    
    # Format logs for AI
    logs_text = "\n".join([
        f"[{log.executed_at}] Status: {log.status}, Error: {log.error_message}"
        for log in error_logs
    ])
    
    # Get AI explanation
    explanation = AIService.explain_error_to_user(
        workflow_name=workflow.name,
        workflow_code=workflow.workflow_code,
        error_message=latest_error.error_message or "Unknown error",
        execution_logs=logs_text,
        user_question=question
    )
    
    return {
        "workflow_id": workflow_id,
        "workflow_name": workflow.name,
        "question": question,
        "answer": explanation,
        "latest_error": {
            "time": latest_error.executed_at.isoformat(),
            "message": latest_error.error_message
        }
    }

@router.post("/workflows/{workflow_id}/auto-fix")
def auto_fix_workflow(
    workflow_id: int,
    db: Session = Depends(get_db)
):
    """
    AI automatically fixes workflow errors
    Analyzes recent failures and generates fixed code
    """
    # Get workflow
    result = db.execute(select(Workflow).where(Workflow.id == workflow_id))
    workflow = result.scalar_one_or_none()
    
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    # Get recent error
    logs_result = db.execute(
        select(ExecutionLog)
        .where(ExecutionLog.workflow_id == workflow_id)
        .where(ExecutionLog.status == "failed")
        .order_by(desc(ExecutionLog.executed_at))
        .limit(1)
    )
    error_log = logs_result.scalar_one_or_none()
    
    if not error_log:
        return {
            "success": False,
            "message": "No errors found to fix. Workflow is working correctly!",
            "workflow_id": workflow_id
        }
    
    # Get workflow structure
    workflow_structure = {
        "trigger": {
            "type": workflow.trigger_type,
            "config": workflow.trigger_config
        },
        "actions": workflow.actions,
        "workflow_name": workflow.name,
        "description": workflow.description
    }
    
    # Attempt auto-fix
    fix_result = AIService.auto_fix_workflow(
        workflow_code=workflow.workflow_code,
        error_message=error_log.error_message,
        workflow_structure=workflow_structure
    )
    
    if fix_result.get("success"):
        # Save the fixed code
        original_code = workflow.workflow_code
        workflow.workflow_code = fix_result["fixed_code"]
        db.commit()
        
        return {
            "success": True,
            "message": "Workflow automatically fixed! The code has been updated.",
            "workflow_id": workflow_id,
            "workflow_name": workflow.name,
            "changes_summary": fix_result.get("changes_summary"),
            "fixed": True,
            "original_code_length": len(original_code),
            "new_code_length": len(fix_result["fixed_code"])
        }
    else:
        return {
            "success": False,
            "message": "Unable to automatically fix this error. Manual intervention required.",
            "workflow_id": workflow_id,
            "error": fix_result.get("error"),
            "suggestion": "Try asking 'Why did my workflow fail?' for more details."
        }

@router.get("/workflows/{workflow_id}/improvements")
def get_workflow_improvements(
    workflow_id: int,
    db: Session = Depends(get_db)
):
    """
    Get AI-powered improvement suggestions for a workflow
    """
    # Get workflow
    result = db.execute(select(Workflow).where(Workflow.id == workflow_id))
    workflow = result.scalar_one_or_none()
    
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    # Get execution history
    logs_result = db.execute(
        select(ExecutionLog)
        .where(ExecutionLog.workflow_id == workflow_id)
        .order_by(desc(ExecutionLog.executed_at))
        .limit(20)
    )
    logs = logs_result.scalars().all()
    
    # Convert logs to dict
    execution_history = [
        {
            "status": log.status,
            "execution_time": log.execution_time,
            "executed_at": log.executed_at.isoformat()
        }
        for log in logs
    ]
    
    # Get workflow structure
    workflow_structure = {
        "trigger": {
            "type": workflow.trigger_type,
            "config": workflow.trigger_config
        },
        "actions": workflow.actions,
        "workflow_name": workflow.name,
        "description": workflow.description
    }
    
    # Get suggestions
    suggestions = AIService.suggest_workflow_improvements(
        workflow_code=workflow.workflow_code,
        workflow_structure=workflow_structure,
        execution_history=execution_history
    )
    
    return {
        "workflow_id": workflow_id,
        "workflow_name": workflow.name,
        "suggestions": suggestions,
        "count": len(suggestions)
    }

@router.post("/workflows/{workflow_id}/explain-last-failure")
def explain_last_failure(
    workflow_id: int,
    db: Session = Depends(get_db)
):
    """
    Get a detailed explanation of the last workflow failure
    """
    # Get workflow
    result = db.execute(select(Workflow).where(Workflow.id == workflow_id))
    workflow = result.scalar_one_or_none()
    
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    # Get last failed execution
    logs_result = db.execute(
        select(ExecutionLog)
        .where(ExecutionLog.workflow_id == workflow_id)
        .where(ExecutionLog.status == "failed")
        .order_by(desc(ExecutionLog.executed_at))
        .limit(1)
    )
    error_log = logs_result.scalar_one_or_none()
    
    if not error_log:
        return {
            "workflow_id": workflow_id,
            "workflow_name": workflow.name,
            "has_failures": False,
            "message": "This workflow has no recent failures. Everything is working well!"
        }
    
    # Get explanation
    explanation = AIService.explain_error_to_user(
        workflow_name=workflow.name,
        workflow_code=workflow.workflow_code,
        error_message=error_log.error_message or "Unknown error",
        execution_logs=f"Failed at: {error_log.executed_at}",
        user_question=None
    )
    
    return {
        "workflow_id": workflow_id,
        "workflow_name": workflow.name,
        "has_failures": True,
        "last_failure": {
            "time": error_log.executed_at.isoformat(),
            "error": error_log.error_message,
            "execution_time": error_log.execution_time
        },
        "explanation": explanation,
        "can_auto_fix": True
    }

@router.get("/templates")
def get_all_templates():
    """
    Get all available workflow templates
    """
    from app.templates.workflow_templates import WORKFLOW_TEMPLATES, TEMPLATE_CATEGORIES
    
    return {
        "templates": WORKFLOW_TEMPLATES,
        "categories": TEMPLATE_CATEGORIES,
        "total_count": len(WORKFLOW_TEMPLATES)
    }

@router.get("/templates/categories")
def get_template_categories():
    """
    Get all template categories
    """
    from app.templates.workflow_templates import TEMPLATE_CATEGORIES
    
    return {
        "categories": TEMPLATE_CATEGORIES
    }

@router.get("/templates/category/{category}")
def get_templates_by_category(category: str):
    """
    Get templates by category
    Categories: Development, Business, Productivity, Notifications, Learning
    """
    from app.templates.workflow_templates import get_templates_by_category
    
    templates = get_templates_by_category(category)
    
    if not templates:
        raise HTTPException(status_code=404, detail=f"No templates found in category: {category}")
    
    return {
        "category": category,
        "templates": templates,
        "count": len(templates)
    }

@router.get("/templates/{template_id}")
def get_template_details(template_id: str):
    """
    Get details of a specific template
    """
    from app.templates.workflow_templates import get_template_by_id
    
    template = get_template_by_id(template_id)
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return template

@router.post("/templates/{template_id}/use")
def create_workflow_from_template(
    template_id: str,
    customize: dict = None,
    db: Session = Depends(get_db)
):
    """
    Create a new workflow from a template
    Optional: customize with {"email": "your@email.com", "time": "10 AM", etc}
    """
    from app.templates.workflow_templates import get_template_by_id
    
    template = get_template_by_id(template_id)
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Get instruction
    instruction = template["instruction"]
    
    # Customize if provided
    if customize:
        for key, value in customize.items():
            # Replace placeholders
            instruction = instruction.replace(f"my@email.com", customize.get("email", "my@email.com"))
            instruction = instruction.replace("9 AM", customize.get("time", "9 AM"))
            # Add more customization options as needed
    
    # Create workflow using the standard creation process
    try:
        parsed = AIService.parse_user_instruction(instruction)
        code = AIService.generate_workflow_code_with_integrations(parsed)
        yaml_content = AIService.generate_yaml(parsed)
        
        workflow = Workflow(
            name=parsed.get("workflow_name", template["name"]),
            description=parsed.get("description", template["description"]),
            user_instruction=instruction,
            trigger_type=parsed["trigger"]["type"],
            trigger_config=parsed["trigger"].get("config", {}),
            actions=parsed.get("actions", []),
            workflow_code=code,
            workflow_yaml=yaml_content,
            is_active=True
        )
        
        db.add(workflow)
        db.commit()
        db.refresh(workflow)
        
        return {
            "success": True,
            "message": f"Workflow created from template: {template['name']}",
            "template_id": template_id,
            "workflow": {
                "id": workflow.id,
                "name": workflow.name,
                "description": workflow.description,
                "trigger_type": workflow.trigger_type
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create workflow from template: {str(e)}")

@router.get("/templates/search")
def search_templates(query: str):
    """
    Search templates by keyword
    Example: query=github, query=email, query=daily
    """
    from app.templates.workflow_templates import search_templates as search_fn
    
    results = search_fn(query)
    
    return {
        "query": query,
        "results": results,
        "count": len(results)
    }

@router.get("/health-detailed")
def detailed_health_check(db: Session = Depends(get_db)):
    """
    Detailed health check with database connectivity
    """
    from datetime import datetime
    
    try:
        # Test database connection
        db.execute(select(Workflow).limit(1))
        db_status = "healthy"
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"
    
    return {
        "status": "healthy" if db_status == "healthy" else "degraded",
        "timestamp": datetime.now().isoformat(),
        "service": "AI Automation System",
        "version": "1.0.0",
        "components": {
            "api": "healthy",
            "database": db_status,
            "ai_service": "healthy"
        }
    }


# Google Sheets Integration Routes

@router.get("/integrations/sheets/status")
def sheets_status():
    """
    Check Google Sheets integration status
    """
    import os
    
    has_token = os.path.exists('credentials/token.pickle')
    has_credentials = os.path.exists('credentials/credentials.json')
    
    return {
        "authenticated": has_token,
        "credentials_file": has_credentials,
        "status": "ready" if has_token else "needs_setup",
        "instructions": "Google Sheets uses the same OAuth as Gmail. Run Gmail setup if not authenticated."
    }


@router.post("/integrations/sheets/create")
def create_spreadsheet(title: str):
    """
    Create a new Google Sheet
    """
    from app.integrations.sheets_service import GoogleSheetsService
    
    sheets = GoogleSheetsService()
    result = sheets.create_spreadsheet(title)
    
    return result


@router.post("/integrations/sheets/{spreadsheet_id}/write")
def write_to_sheet(spreadsheet_id: str, data: List[List], sheet_name: str = None):
    """
    Write data to a Google Sheet
    data format: [['Header1', 'Header2'], ['Row1Col1', 'Row1Col2']]
    """
    from app.integrations.sheets_service import GoogleSheetsService
    
    sheets = GoogleSheetsService()
    result = sheets.write_data(spreadsheet_id, data, sheet_name)
    
    return result


@router.get("/integrations/sheets/{spreadsheet_id}/read")
def read_from_sheet(spreadsheet_id: str, sheet_name: str = None):
    """
    Read data from a Google Sheet
    """
    from app.integrations.sheets_service import GoogleSheetsService
    
    sheets = GoogleSheetsService()
    result = sheets.read_data(spreadsheet_id, sheet_name)
    
    return result


@router.post("/integrations/sheets/github-trends")
def create_github_trends_sheet(title: str = None):
    """
    Fetch GitHub trends and create a Google Sheet
    """
    from app.integrations.sheets_service import GoogleSheetsService
    from app.integrations.web_service import WebService
    
    # Fetch GitHub trends
    trends = WebService.scrape_github_trends()
    
    if not trends:
        raise HTTPException(status_code=500, detail="Failed to fetch GitHub trends")
    
    # Create sheet
    sheets = GoogleSheetsService()
    result = sheets.create_github_trends_sheet(trends, title)
    
    return result


@router.post("/integrations/sheets/{spreadsheet_id}/share")
def share_spreadsheet(spreadsheet_id: str, email: str = None, role: str = "reader"):
    """
    Share a Google Sheet
    role: reader, writer, owner
    Leave email empty to make publicly accessible
    """
    from app.integrations.sheets_service import GoogleSheetsService
    
    sheets = GoogleSheetsService()
    result = sheets.share_spreadsheet(spreadsheet_id, email, role)
    
    return result


# ==================== CALENDAR ENDPOINTS ====================

@router.get("/integrations/calendar/status")
async def calendar_status():
    """
    Check Google Calendar integration status
    """
    import os
    
    has_token = os.path.exists('credentials/token.pickle')
    
    return {
        "authenticated": has_token,
        "status": "ready" if has_token else "needs_setup",
        "instructions": "Google Calendar uses the same OAuth as Gmail. Re-authenticate if needed."
    }

@router.get("/integrations/calendar/calendars")
async def list_calendars():
    """
    List all user's calendars
    """
    from app.integrations.calendar_service import GoogleCalendarService
    
    calendar = GoogleCalendarService()
    calendars = calendar.list_calendars()
    
    return {"calendars": calendars, "count": len(calendars)}

@router.post("/integrations/calendar/events")
async def create_calendar_event(
    title: str,
    start_time: str,
    end_time: str = None,
    description: str = "",
    location: str = "",
    attendees: List[str] = None
):
    """
    Create a calendar event
    
    start_time format: 
    - For all-day: "2024-12-27"
    - For timed: "2024-12-27T10:00:00"
    """
    from app.integrations.calendar_service import GoogleCalendarService
    
    calendar = GoogleCalendarService()
    result = calendar.create_event(
        title=title,
        start_time=start_time,
        end_time=end_time,
        description=description,
        location=location,
        attendees=attendees or []
    )
    
    return result

@router.get("/integrations/calendar/events/upcoming")
async def get_upcoming_events(max_results: int = 10, days_ahead: int = 7):
    """
    List upcoming events
    """
    from app.integrations.calendar_service import GoogleCalendarService
    
    try:
        calendar = GoogleCalendarService()
        if not calendar.service:
            return {"events": [], "count": 0, "message": "Calendar service not authenticated"}
        
        events = calendar.list_upcoming_events(
            max_results=max_results,
            days_ahead=days_ahead
        )
        
        return {"events": events, "count": len(events)}
    except Exception as e:
        import logging
        logging.error(f"Error in get_upcoming_events: {str(e)}")
        return {"status": "error", "message": str(e), "events": [], "count": 0}

@router.get("/integrations/calendar/events/search")
async def search_calendar_events(query: str, max_results: int = 10):
    """
    Search for events
    """
    from app.integrations.calendar_service import GoogleCalendarService
    
    calendar = GoogleCalendarService()
    events = calendar.search_events(query, max_results)
    
    return {"events": events, "count": len(events)}

@router.post("/integrations/calendar/events/quick")
async def create_quick_event(request: QuickEventRequest):
    """
    Create event using natural language
    Expected JSON: {"text": "Meeting with John tomorrow at 3pm"}
    """
    from app.integrations.calendar_service import GoogleCalendarService
    
    try:
        calendar = GoogleCalendarService()
        if not calendar.service:
            return {"status": "error", "message": "Calendar service not authenticated"}
        
        result = calendar.create_quick_event(request.text)
        return result
    except Exception as e:
        import logging
        logging.error(f"Error in create_quick_event: {str(e)}")
        return {"status": "error", "message": str(e)}

@router.get("/integrations/calendar/events/{event_id}")
async def get_event_details(event_id: str):
    """
    Get details of a specific event
    """
    from app.integrations.calendar_service import GoogleCalendarService
    
    calendar = GoogleCalendarService()
    event = calendar.get_event(event_id)
    
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    return event

@router.put("/integrations/calendar/events/{event_id}")
async def update_calendar_event(
    event_id: str,
    title: str = None,
    start_time: str = None,
    end_time: str = None,
    description: str = None,
    location: str = None
):
    """
    Update an existing event
    """
    from app.integrations.calendar_service import GoogleCalendarService
    
    calendar = GoogleCalendarService()
    result = calendar.update_event(
        event_id=event_id,
        title=title,
        start_time=start_time,
        end_time=end_time,
        description=description,
        location=location
    )
    
    return result

@router.delete("/integrations/calendar/events/{event_id}")
async def delete_calendar_event(event_id: str):
    """
    Delete an event
    """
    from app.integrations.calendar_service import GoogleCalendarService
    
    calendar = GoogleCalendarService()
    result = calendar.delete_event(event_id)
    
    return result


