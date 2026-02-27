from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base, Session
import os

# PostgreSQL connection string
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://ai_user:ai_automation_password@localhost:5432/ai_automation"
)

# Create engine with connection pooling
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,      # Check connection health before using
    pool_recycle=3600,       # Recycle connections after 1 hour
    echo=False               # Set to True for SQL logging
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Declarative base for models
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Create all database tables and handle migrations"""
    from sqlalchemy import inspect, text
    
    # Create all tables based on models
    Base.metadata.create_all(bind=engine)
    
    # Handle migrations for existing tables
    try:
        # Check if users table exists and if avatar column is missing
        inspector = inspect(engine)
        
        if 'users' in inspector.get_table_names():
            users_columns = [col['name'] for col in inspector.get_columns('users')]
            
            # Add avatar column if it doesn't exist
            if 'avatar' not in users_columns:
                with engine.connect() as connection:
                    connection.execute(text('ALTER TABLE users ADD COLUMN avatar VARCHAR'))
                    connection.commit()
                    print("✅ Added 'avatar' column to users table")
        
        # Check if workflows table exists and add webhook columns if missing
        if 'workflows' in inspector.get_table_names():
            workflows_columns = [col['name'] for col in inspector.get_columns('workflows')]
            
            with engine.connect() as connection:
                if 'webhook_enabled' not in workflows_columns:
                    connection.execute(text('ALTER TABLE workflows ADD COLUMN webhook_enabled BOOLEAN DEFAULT false'))
                    connection.commit()
                    print("✅ Added 'webhook_enabled' column to workflows table")
                
                if 'webhook_token' not in workflows_columns:
                    connection.execute(text('ALTER TABLE workflows ADD COLUMN webhook_token VARCHAR'))
                    connection.commit()
                    print("✅ Added 'webhook_token' column to workflows table")
    
    except Exception as e:
        print(f"⚠️  Migration note: {str(e)}")
        # Don't fail if columns already exist
