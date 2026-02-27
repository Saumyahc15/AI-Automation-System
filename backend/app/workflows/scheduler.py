from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class WorkflowScheduler:
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self.scheduler.start()
        logger.info("Workflow scheduler started")
    
    def schedule_cron_workflow(self, workflow_id: int, cron_expression: str, execute_func):
        """
        Schedule a workflow with cron expression
        Example: "0 9 * * *" = Every day at 9 AM
        """
        try:
            # Parse cron expression (minute hour day month day_of_week)
            parts = cron_expression.split()
            
            if len(parts) == 5:
                minute, hour, day, month, day_of_week = parts
                
                self.scheduler.add_job(
                    execute_func,
                    CronTrigger(
                        minute=minute,
                        hour=hour,
                        day=day,
                        month=month,
                        day_of_week=day_of_week
                    ),
                    id=f"workflow_{workflow_id}",
                    replace_existing=True
                )
                
                logger.info(f"Scheduled workflow {workflow_id} with cron: {cron_expression}")
                return True
            else:
                logger.error(f"Invalid cron expression: {cron_expression}")
                return False
                
        except Exception as e:
            logger.error(f"Failed to schedule workflow {workflow_id}: {str(e)}")
            return False
    
    def schedule_interval_workflow(self, workflow_id: int, seconds: int, execute_func):
        """
        Schedule a workflow to run at fixed intervals
        """
        try:
            self.scheduler.add_job(
                execute_func,
                IntervalTrigger(seconds=seconds),
                id=f"workflow_{workflow_id}",
                replace_existing=True
            )
            
            logger.info(f"Scheduled workflow {workflow_id} every {seconds} seconds")
            return True
            
        except Exception as e:
            logger.error(f"Failed to schedule interval workflow {workflow_id}: {str(e)}")
            return False
    
    def remove_scheduled_workflow(self, workflow_id: int):
        """
        Remove a scheduled workflow
        """
        try:
            self.scheduler.remove_job(f"workflow_{workflow_id}")
            logger.info(f"Removed scheduled workflow {workflow_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to remove workflow {workflow_id}: {str(e)}")
            return False
    
    def get_scheduled_jobs(self):
        """
        Get all scheduled jobs
        """
        return self.scheduler.get_jobs()
    
    def pause_workflow(self, workflow_id: int):
        """
        Pause a scheduled workflow
        """
        try:
            self.scheduler.pause_job(f"workflow_{workflow_id}")
            logger.info(f"Paused workflow {workflow_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to pause workflow {workflow_id}: {str(e)}")
            return False
    
    def resume_workflow(self, workflow_id: int):
        """
        Resume a paused workflow
        """
        try:
            self.scheduler.resume_job(f"workflow_{workflow_id}")
            logger.info(f"Resumed workflow {workflow_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to resume workflow {workflow_id}: {str(e)}")
            return False