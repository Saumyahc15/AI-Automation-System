from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import logging
import sys
import atexit

from app.core.database import init_db, engine, Base
from app.core.config import get_settings
from app.api.routes import router
from app.api import auth_routes

settings = get_settings()

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('logs/app.log')
    ]
)
logger = logging.getLogger(__name__)

# Global scheduler reference for cleanup
scheduler_instance = None

# Create FastAPI app
app = FastAPI(
    title="AI Automation System",
    description="Workflow automation with AI",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def cleanup_scheduler():
    """Properly cleanup scheduler on shutdown"""
    global scheduler_instance
    try:
        if scheduler_instance:
            logger.info("Shutting down scheduler...")
            # Check if scheduler has shutdown method
            if hasattr(scheduler_instance, 'shutdown'):
                scheduler_instance.shutdown(wait=False)
            logger.info("✅ Scheduler shutdown complete")
    except Exception as e:
        logger.error(f"Error during scheduler shutdown: {str(e)}")

# Register cleanup on exit
atexit.register(cleanup_scheduler)

# Create database tables on startup
@app.on_event("startup")
def startup_event():
    global scheduler_instance
    
    logger.info("=" * 80)
    logger.info("🚀 AI AUTOMATION SYSTEM STARTING...")
    logger.info("=" * 80)

    logger.info("📦 Initializing database...")
    try:
        init_db()
        logger.info("✅ Database initialized successfully")
    except Exception as e:
        logger.error(f"❌ Database initialization failed: {str(e)}")
        raise

    logger.info("📅 Loading scheduled workflows...")
    try:
        from app.models.workflow import Workflow
        from app.services.workflow_service import WorkflowService
        from sqlalchemy.orm import sessionmaker
        
        # Create a new session for loading workflows
        SessionLocal = sessionmaker(bind=engine)
        db = SessionLocal()
        
        try:
            # Get all active workflows
            active_workflows = db.query(Workflow).filter(Workflow.is_active == True).all()
            logger.info(f"Found {len(active_workflows)} active workflows")
            
            if active_workflows:
                # Initialize workflow service just once
                workflow_service = WorkflowService()
                scheduler_instance = workflow_service.scheduler
                
                # Load workflows synchronously without threading
                loaded_count = 0
                for workflow in active_workflows:
                    try:
                        if workflow.trigger_type in ["cron_schedule", "email_received"]:
                            # These are scheduled workflows
                            # WorkflowService will handle scheduling via APScheduler
                            loaded_count += 1
                            logger.info(f"✅ Loaded workflow: {workflow.name} (ID: {workflow.id})")
                    except Exception as e:
                        logger.error(f"❌ Error loading workflow {workflow.id}: {str(e)}")
                
                logger.info(f"✅ Workflow loading complete - {loaded_count} workflows activated")
            else:
                logger.info("No active workflows found")
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"❌ Failed to load workflows: {str(e)}", exc_info=True)

    logger.info(f"🤖 AI Model: {settings.OPENAI_MODEL}")
    logger.info(f"🌐 API Host: {settings.API_HOST}:{settings.API_PORT}")
    logger.info(f"🔧 Debug Mode: {settings.DEBUG}")

    logger.info("=" * 80)
    logger.info("🎉 SERVER IS READY!")
    logger.info(f"📚 Interactive API Docs: http://localhost:{settings.API_PORT}/docs")
    logger.info(f"📖 Alternative Docs: http://localhost:{settings.API_PORT}/redoc")
    logger.info("=" * 80)

@app.on_event("shutdown")
def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("=" * 80)
    logger.info("🛑 SERVER SHUTTING DOWN...")
    logger.info("=" * 80)
    cleanup_scheduler()

# Include API routes
app.include_router(router, prefix="/api", tags=["Workflows & Integrations"])
app.include_router(auth_routes.router, tags=["Authentication"])

@app.get("/", tags=["Root"])
async def root():
    """
    Root endpoint with system information
    """
    return {
        "message": "🤖 AI Automation System API",
        "version": "1.0.0",
        "status": "running",
        "documentation": {
            "interactive": "/docs",
            "alternative": "/redoc"
        },
        "features": [
            "Natural language workflow creation",
            "Email triggers and monitoring",
            "Cron-based scheduling",
            "Gmail integration",
            "Google Drive integration",
            "Telegram/WhatsApp messaging",
            "GitHub API access",
            "Web scraping",
            "AI-powered code generation",
            "Execution tracking and logs",
            "User registration and authentication"
        ],
        "endpoints": {
            "auth": {
                "register": "POST /auth/register",
                "login": "POST /auth/login",
                "me": "GET /auth/me"
            },
            "workflows": {
                "create": "POST /api/workflows/create",
                "list": "GET /api/workflows",
                "execute": "POST /api/workflows/execute",
                "logs": "GET /api/workflows/{id}/logs"
            }
        }
    }

@app.get("/health", tags=["Health"])
async def health_check():
    """
    Health check endpoint
    """
    from datetime import datetime
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "AI Automation System",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=False,
        log_level="info"
    )


# Include API routes
app.include_router(router, prefix="/api", tags=["Workflows & Integrations"])
app.include_router(auth_routes.router, tags=["Authentication"])

@app.get("/", tags=["Root"])
async def root():
    """
    Root endpoint with system information
    """
    return {
        "message": "🤖 AI Automation System API",
        "version": "1.0.0",
        "status": "running",
        "documentation": {
            "interactive": "/docs",
            "alternative": "/redoc"
        },
        "features": [
            "Natural language workflow creation",
            "Email triggers and monitoring",
            "Cron-based scheduling",
            "Gmail integration",
            "Google Drive integration",
            "Telegram/WhatsApp messaging",
            "GitHub API access",
            "Web scraping",
            "AI-powered code generation",
            "Execution tracking and logs",
            "User registration and authentication"
        ],
        "endpoints": {
            "auth": {
                "register": "POST /auth/register",
                "login": "POST /auth/login",
                "me": "GET /auth/me"
            },
            "workflows": {
                "create": "POST /api/workflows/create",
                "list": "GET /api/workflows",
                "execute": "POST /api/workflows/execute",
                "logs": "GET /api/workflows/{id}/logs"
            }
        }
    }

@app.get("/health", tags=["Health"])
async def health_check():
    """
    Health check endpoint
    """
    from datetime import datetime
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "AI Automation System",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=False,
        log_level="info"
    )