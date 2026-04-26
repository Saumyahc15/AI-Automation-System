from datetime import datetime, timedelta
import os
import logging
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from app.config import settings

logger = logging.getLogger(__name__)

SCOPES = ["https://www.googleapis.com/auth/calendar"]


def _get_calendar_service():
    creds = None
    if os.path.exists(settings.GOOGLE_CALENDAR_TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(settings.GOOGLE_CALENDAR_TOKEN_FILE, SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(
                settings.GOOGLE_CALENDAR_CREDENTIALS_FILE, SCOPES
            )
            creds = flow.run_local_server(port=0)
        with open(settings.GOOGLE_CALENDAR_TOKEN_FILE, "w", encoding="utf-8") as f:
            f.write(creds.to_json())
    return build("calendar", "v3", credentials=creds)


def _freq_to_rrule_and_time(frequency: str):
    """
    Convert workflow frequency to Google Calendar recurrence + event time.
    Returns (rrule, hour, minute).
    """
    freq = (frequency or "every_15_min").strip().lower()
    if freq == "daily":
        return "RRULE:FREQ=DAILY", 9, 0
    if freq == "weekly":
        return "RRULE:FREQ=WEEKLY;BYDAY=MO", 9, 0
    if freq.startswith("cron:"):
        expr = freq.split("cron:", 1)[1].strip()
        parts = expr.split()
        if len(parts) == 5:
            minute, hour, day, month, day_of_week = parts
            minute_i = int(minute) if minute.isdigit() else 0
            hour_i = int(hour) if hour.isdigit() else 9
            if day_of_week != "*":
                byday_map = {
                    "0": "SU", "1": "MO", "2": "TU", "3": "WE", "4": "TH", "5": "FR", "6": "SA",
                    "sun": "SU", "mon": "MO", "tue": "TU", "wed": "WE", "thu": "TH", "fri": "FR", "sat": "SA",
                }
                byday = byday_map.get(day_of_week.lower(), "MO")
                return f"RRULE:FREQ=WEEKLY;BYDAY={byday}", hour_i, minute_i
            if day != "*":
                return f"RRULE:FREQ=MONTHLY;BYMONTHDAY={day}", hour_i, minute_i
            return "RRULE:FREQ=DAILY", hour_i, minute_i
    # For interval frequencies we create daily reminder placeholder.
    return "RRULE:FREQ=DAILY", 9, 0


def create_or_update_workflow_calendar_event(workflow) -> str:
    """
    Create a recurring reminder event so manager expects workflow execution/report delivery.
    Returns event_id.
    """
    if workflow.trigger_type not in {"cron", "sheet_edit", "inventory_check", "order_event", "customer_check", "return_check"}:
        return workflow.calendar_event_id or ""

    service = _get_calendar_service()
    rrule, hour, minute = _freq_to_rrule_and_time(workflow.frequency)

    now = datetime.utcnow()
    start_dt = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
    if start_dt <= now:
        start_dt += timedelta(days=1)
    end_dt = start_dt + timedelta(minutes=15)

    body = {
        "summary": f"Retail AI Workflow #{workflow.workflow_id}",
        "description": (
            f"Workflow: {workflow.natural_language_input}\n"
            f"Trigger: {workflow.trigger_type}\n"
            f"Frequency: {workflow.frequency}\n"
            f"Channel: {workflow.notification_channel or 'gmail'}"
        ),
        "start": {"dateTime": start_dt.isoformat() + "Z", "timeZone": settings.GOOGLE_CALENDAR_TIMEZONE},
        "end": {"dateTime": end_dt.isoformat() + "Z", "timeZone": settings.GOOGLE_CALENDAR_TIMEZONE},
        "recurrence": [rrule],
    }

    cal_id = settings.GOOGLE_CALENDAR_ID or "primary"
    if workflow.calendar_event_id:
        event = service.events().update(calendarId=cal_id, eventId=workflow.calendar_event_id, body=body).execute()
    else:
        event = service.events().insert(calendarId=cal_id, body=body).execute()
    return event.get("id", "")


def delete_workflow_calendar_event(event_id: str):
    if not event_id:
        return
    service = _get_calendar_service()
    cal_id = settings.GOOGLE_CALENDAR_ID or "primary"
    try:
        service.events().delete(calendarId=cal_id, eventId=event_id).execute()
    except Exception as e:
        logger.warning(f"Calendar event delete skipped for {event_id}: {e}")
