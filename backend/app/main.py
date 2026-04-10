from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from apscheduler.schedulers.background import BackgroundScheduler
from .database import engine, Base
from .routers import products, orders, customers, suppliers, workflows, logs, intelligence, reports, auth, restock, notifications
from .groq_client.client import test_groq_connection
from .engine.watchers import (
    run_stock_watcher,
    run_order_watcher,
    run_customer_watcher,
    run_daily_report,
    run_demand_watcher
)

Base.metadata.create_all(bind=engine)

scheduler = BackgroundScheduler()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Stock watcher — every 30 seconds
    scheduler.add_job(run_stock_watcher, "interval", seconds=30, id="stock_watcher")
    # Order delay watcher — every hour
    scheduler.add_job(run_order_watcher, "interval", hours=1, id="order_watcher")
    # Customer inactivity — every 6 hours
    scheduler.add_job(run_customer_watcher, "interval", hours=6, id="customer_watcher")
    # Daily report — every day at 9 PM
    scheduler.add_job(run_daily_report, "cron", hour=21, minute=0, id="daily_report")
    # Demand watcher — every 15 mins
    scheduler.add_job(run_demand_watcher, "interval", minutes=15, id="demand_watcher")
    scheduler.start()
    print("[SCHEDULER] All watchers started.")
    yield
    scheduler.shutdown()
    print("[SCHEDULER] Stopped.")

app = FastAPI(
    title="RetailAI API",
    description="AI-Powered Retail Automation Agent",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(products.router)
app.include_router(orders.router)
app.include_router(customers.router)
app.include_router(suppliers.router)
app.include_router(workflows.router)
app.include_router(logs.router)
app.include_router(intelligence.router)
app.include_router(reports.router)
app.include_router(restock.router)
app.include_router(notifications.router)

@app.get("/")
def root():
    return {"message": "RetailAI API is running", "docs": "/docs"}

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/test-groq")
def test_groq():
    return test_groq_connection()