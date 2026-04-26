from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger
import logging

logger = logging.getLogger(__name__)
scheduler = BackgroundScheduler(timezone="UTC")


def _frequency_to_trigger(frequency: str):
    frequency = (frequency or "every_15_min").strip().lower()
    preset = {
        "every_15_min": IntervalTrigger(minutes=15),
        "every_1_hour": IntervalTrigger(hours=1),
        "every_6_hours": IntervalTrigger(hours=6),
        "daily": CronTrigger(hour=0, minute=0),
        "weekly": CronTrigger(day_of_week="mon", hour=0, minute=0),
    }
    if frequency in preset:
        return preset[frequency]

    if frequency.startswith("cron:"):
        expr = frequency.split("cron:", 1)[1].strip()
        parts = expr.split()
        if len(parts) != 5:
            raise ValueError(f"Invalid cron expression: {expr}")
        minute, hour, day, month, day_of_week = parts
        return CronTrigger(
            minute=minute,
            hour=hour,
            day=day,
            month=month,
            day_of_week=day_of_week,
        )

    logger.warning(f"Unknown frequency '{frequency}', defaulting to every_15_min")
    return IntervalTrigger(minutes=15)


def sync_workflow_jobs():
    """Keep scheduler jobs in sync with active workflow rows."""
    from app.database import SessionLocal
    from app.models.workflow import Workflow
    from app.services.execution_engine import execute_workflow_by_id

    db = SessionLocal()
    try:
        active = db.query(Workflow).filter(Workflow.is_active == True).all()
        active_ids = set()
        for wf in active:
            job_id = f"workflow_{wf.workflow_id}"
            active_ids.add(job_id)
            trigger = _frequency_to_trigger(wf.frequency)
            scheduler.add_job(
                execute_workflow_by_id,
                trigger=trigger,
                args=[wf.workflow_id],
                id=job_id,
                replace_existing=True,
                misfire_grace_time=120,
            )

        for job in scheduler.get_jobs():
            if job.id.startswith("workflow_") and job.id not in active_ids:
                scheduler.remove_job(job.id)
    finally:
        db.close()


def start_scheduler():
    from app.services.forecasting import run_stock_forecasting
    from app.services.anomaly_detector import run_anomaly_detection
    from app.services.sheets_service import sync_inventory_to_sheet, watch_sheet_edit_triggers
    from app.services.gmail_service import run_thread_lifecycle_rules

    # Reconcile dynamic workflow schedules every minute.
    scheduler.add_job(sync_workflow_jobs, IntervalTrigger(minutes=1),
                      id="workflow_job_sync", replace_existing=True)
    sync_workflow_jobs()

    # Google Sheets sync — every hour
    scheduler.add_job(sync_inventory_to_sheet, IntervalTrigger(hours=1),
                      id="sheets_sync", replace_existing=True)

    # Google Sheets edit watcher — every 2 minutes
    scheduler.add_job(watch_sheet_edit_triggers, IntervalTrigger(minutes=2),
                      id="sheets_edit_watcher", replace_existing=True)

    # ML forecasting — daily at midnight
    scheduler.add_job(run_stock_forecasting, CronTrigger(hour=0, minute=0),
                      id="stock_forecasting", replace_existing=True)

    # Anomaly detection — every hour
    scheduler.add_job(run_anomaly_detection, IntervalTrigger(hours=1),
                      id="anomaly_detection", replace_existing=True)

    # Gmail thread lifecycle automation — every 30 minutes
    scheduler.add_job(run_thread_lifecycle_rules, IntervalTrigger(minutes=30),
                      id="gmail_lifecycle_automation", replace_existing=True)

    scheduler.start()
    logger.info("Scheduler started with all jobs")
    return scheduler
