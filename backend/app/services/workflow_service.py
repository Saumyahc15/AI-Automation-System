from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.workflow import Workflow
from app.models.execution_log import ExecutionLog
from app.workflows.executor import WorkflowExecutor
from app.workflows.scheduler import WorkflowScheduler
from app.workflows.email_monitor import EmailMonitor
from datetime import datetime, timedelta
import logging
import asyncio

logger = logging.getLogger(__name__)

class WorkflowService:
    def __init__(self):
        self.scheduler = WorkflowScheduler()
        self.email_monitor = EmailMonitor()
    
    async def activate_workflow(self, workflow: Workflow, db: AsyncSession):
        """
        Activate a workflow based on its trigger type
        """
        try:
            if workflow.trigger_type == "cron_schedule":
                # Schedule cron-based workflow
                cron_expr = workflow.trigger_config.get("cron_expression", "0 9 * * *")
                
                async def execute_cron_workflow():
                    await self.execute_workflow(workflow.id, db)
                
                self.scheduler.schedule_cron_workflow(
                    workflow.id,
                    cron_expr,
                    execute_cron_workflow
                )
                
                logger.info(f"Activated cron workflow {workflow.id}")
                return True
            
            elif workflow.trigger_type == "email_received":
                # Register email trigger
                conditions = workflow.trigger_config.get("conditions", {})
                
                async def email_callback(email_data):
                    await self.execute_workflow(workflow.id, db, email_data)
                
                self.email_monitor.register_workflow(
                    workflow.id,
                    conditions,
                    email_callback
                )
                
                logger.info(f"Activated email workflow {workflow.id}")
                return True
            
            elif workflow.trigger_type == "manual":
                # Manual workflows don't need activation
                logger.info(f"Workflow {workflow.id} is manual trigger")
                return True
            
            else:
                logger.warning(f"Unknown trigger type: {workflow.trigger_type}")
                return False
                
        except Exception as e:
            logger.error(f"Failed to activate workflow {workflow.id}: {str(e)}")
            return False
    
    async def deactivate_workflow(self, workflow: Workflow):
        """
        Deactivate a workflow
        """
        try:
            if workflow.trigger_type == "cron_schedule":
                self.scheduler.remove_scheduled_workflow(workflow.id)
            elif workflow.trigger_type == "email_received":
                self.email_monitor.unregister_workflow(workflow.id)
            
            logger.info(f"Deactivated workflow {workflow.id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to deactivate workflow {workflow.id}: {str(e)}")
            return False
    
    async def execute_workflow(self, workflow_id: int, db: AsyncSession, input_data: dict = None):
        """
        Execute a workflow with retry logic
        """
        max_retries = 3
        retry_delay = 2  # seconds
        attempt = 1
        
        while attempt <= max_retries:
            try:
                # Get workflow
                result = await db.execute(select(Workflow).where(Workflow.id == workflow_id))
                workflow = result.scalar_one_or_none()
                
                if not workflow:
                    logger.error(f"Workflow {workflow_id} not found")
                    return
                
                if not workflow.is_active:
                    logger.warning(f"Workflow {workflow_id} is not active")
                    return
                
                # Execute
                execution_result = await WorkflowExecutor.execute(
                    workflow.workflow_code,
                    input_data
                )
                
                # If successful, log and return
                if execution_result["status"] == "success":
                    log = ExecutionLog(
                        workflow_id=workflow.id,
                        status="success",
                        error_message=None,
                        execution_time=execution_result["execution_time"],
                        input_data=str(input_data),
                        output_data=str(execution_result.get("result"))
                    )
                    
                    db.add(log)
                    workflow.execution_count += 1
                    workflow.success_count += 1
                    workflow.last_executed = datetime.now()
                    
                    await db.commit()
                    logger.info(f"Workflow {workflow_id} executed successfully on attempt {attempt}")
                    return execution_result
                
                # If failed, check if we should retry
                else:
                    error = execution_result.get("error", "Unknown error")
                    
                    # Determine if error is retryable
                    retryable_errors = [
                        "timeout",
                        "connection",
                        "temporarily unavailable",
                        "rate limit"
                    ]
                    
                    should_retry = any(
                        err_type.lower() in error.lower() 
                        for err_type in retryable_errors
                    )
                    
                    if should_retry and attempt < max_retries:
                        logger.warning(
                            f"Workflow {workflow_id} failed with retryable error "
                            f"(attempt {attempt}/{max_retries}): {error}"
                        )
                        
                        # Wait before retrying with exponential backoff
                        await asyncio.sleep(retry_delay * attempt)
                        attempt += 1
                        continue
                    
                    else:
                        # Non-retryable error or max retries reached
                        log = ExecutionLog(
                            workflow_id=workflow.id,
                            status="failed",
                            error_message=f"{error} (after {attempt} attempts)",
                            execution_time=execution_result["execution_time"],
                            input_data=str(input_data),
                            output_data=None
                        )
                        
                        db.add(log)
                        workflow.execution_count += 1
                        workflow.failure_count += 1
                        workflow.last_executed = datetime.now()
                        
                        await db.commit()
                        logger.error(f"Workflow {workflow_id} failed after {attempt} attempts: {error}")
                        return execution_result
                    
            except Exception as e:
                error_msg = str(e)
                logger.error(f"Workflow {workflow_id} exception (attempt {attempt}/{max_retries}): {error_msg}")
                
                if attempt < max_retries:
                    await asyncio.sleep(retry_delay * attempt)
                    attempt += 1
                    continue
                else:
                    # Log final failure
                    try:
                        result = await db.execute(select(Workflow).where(Workflow.id == workflow_id))
                        workflow = result.scalar_one_or_none()
                        
                        log = ExecutionLog(
                            workflow_id=workflow.id,
                            status="failed",
                            error_message=f"Exception: {error_msg} (after {attempt} attempts)",
                            execution_time=0,
                            input_data=str(input_data),
                            output_data=None
                        )
                        
                        db.add(log)
                        workflow.execution_count += 1
                        workflow.failure_count += 1
                        workflow.last_executed = datetime.now()
                        
                        await db.commit()
                    except:
                        pass
                    
                    return {
                        "status": "failed",
                        "error": f"Exception after {attempt} attempts: {error_msg}",
                        "execution_time": 0
                    }
            logger.error(f"Workflow execution failed: {str(e)}")