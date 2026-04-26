from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.database import Base, engine
from app.routers import (
    products, orders, customers, workflows,
    ai, analytics, auth, gmail, sheets,
    settings, reports
)
from app.tasks.scheduler import start_scheduler

# Import models to ensure they're registered with Base
from app.models.user import User
from app.models.gmail_thread_state import GmailThreadState
from app.models.coupon import Coupon
from app.models.delay_analytics import DelayAnalytics

# Create all tables
Base.metadata.create_all(bind=engine)


def _ensure_workflow_notification_channel_column():
    """
    Lightweight runtime migration to keep existing DBs compatible
    when notification_channel is introduced.
    """
    with engine.begin() as conn:
        if engine.dialect.name == "sqlite":
            inspector = conn.exec_driver_sql("PRAGMA table_info(workflows)").fetchall()
            if inspector:
                columns = {row[1] for row in inspector}
                if "notification_channel" not in columns:
                    conn.execute(text("ALTER TABLE workflows ADD COLUMN notification_channel VARCHAR DEFAULT 'gmail'"))
            return
        
        cols = conn.execute(text("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'workflows'
        """)).fetchall()
        columns = {row[0] for row in cols}
        if "notification_channel" not in columns:
            conn.execute(text("ALTER TABLE workflows ADD COLUMN notification_channel VARCHAR DEFAULT 'gmail'"))


def _ensure_workflow_calendar_event_column():
    with engine.begin() as conn:
        if engine.dialect.name == "sqlite":
            inspector = conn.exec_driver_sql("PRAGMA table_info(workflows)").fetchall()
            if inspector:
                columns = {row[1] for row in inspector}
                if "calendar_event_id" not in columns:
                    conn.execute(text("ALTER TABLE workflows ADD COLUMN calendar_event_id VARCHAR"))
            return

        cols = conn.execute(text("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'workflows'
        """)).fetchall()
        columns = {row[0] for row in cols}
        if "calendar_event_id" not in columns:
            conn.execute(text("ALTER TABLE workflows ADD COLUMN calendar_event_id VARCHAR"))


_ensure_workflow_notification_channel_column()
_ensure_workflow_calendar_event_column()


def _ensure_order_extra_columns():
    with engine.begin() as conn:
        if engine.dialect.name == "sqlite":
            inspector = conn.exec_driver_sql("PRAGMA table_info(orders)").fetchall()
            if inspector:
                columns = {row[1] for row in inspector}
                if "shipping_address" not in columns:
                    conn.execute(text("ALTER TABLE orders ADD COLUMN shipping_address VARCHAR"))
                if "payment_method" not in columns:
                    conn.execute(text("ALTER TABLE orders ADD COLUMN payment_method VARCHAR"))
            return

        cols = conn.execute(text("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'orders'
        """)).fetchall()
        columns = {row[0] for row in cols}
        if "shipping_address" not in columns:
            conn.execute(text("ALTER TABLE orders ADD COLUMN shipping_address VARCHAR"))
        if "payment_method" not in columns:
            conn.execute(text("ALTER TABLE orders ADD COLUMN payment_method VARCHAR"))


_ensure_order_extra_columns()

app = FastAPI(
    title="Retail AI Agent API",
    description="AI-powered retail automation with Gmail, Google Sheets, and Google Calendar",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all routers
app.include_router(auth.router,               prefix="/api/auth",      tags=["Authentication"])
app.include_router(products.router,         prefix="/api/products",  tags=["Products"])
app.include_router(orders.router,           prefix="/api/orders",    tags=["Orders"])
app.include_router(customers.router,        prefix="/api/customers", tags=["Customers"])
app.include_router(workflows.router,        prefix="/api/workflows", tags=["Workflows"])
app.include_router(ai.router,               prefix="/api/ai",        tags=["AI"])
app.include_router(gmail.router,            prefix="/api/gmail",     tags=["Gmail"])
app.include_router(sheets.router,           prefix="/api/sheets",    tags=["Sheets"])
app.include_router(analytics.router,        prefix="/api/analytics", tags=["Analytics"])
app.include_router(settings.router,         prefix="/api/settings",  tags=["Settings"])
app.include_router(reports.router,          prefix="/api/reports",   tags=["Reports"])


@app.on_event("startup")
async def startup():
    start_scheduler()


@app.get("/")
def root():
    return {"status": "Retail AI Agent running", "docs": "/docs"}
