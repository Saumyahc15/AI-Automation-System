#!/usr/bin/env python
"""
Migration script to add user_id columns to workflows and execution_logs tables
Run this once to migrate the database schema
"""
from sqlalchemy import text, inspect
from app.core.database import engine, SessionLocal

def migrate():
    """Run database migrations"""
    db = SessionLocal()
    try:
        inspector = inspect(engine)
        
        # Check if user_id column already exists in workflows table
        columns = [col['name'] for col in inspector.get_columns('workflows')]
        if 'user_id' not in columns:
            print("Adding user_id column to workflows table...")
            db.execute(text("ALTER TABLE workflows ADD COLUMN user_id INTEGER"))
            
            # Create a default user (id=1) if it doesn't exist
            try:
                db.execute(
                    text("INSERT INTO \"user\" (id, email, full_name, password_hash) VALUES (1, 'default@system.com', 'System User', 'N/A')")
                )
            except:
                print("  (Default user already exists)")
            
            # Set all existing workflows to user_id=1
            db.execute(text("UPDATE workflows SET user_id=1 WHERE user_id IS NULL"))
            
            # Make user_id not nullable
            db.execute(text("ALTER TABLE workflows ALTER COLUMN user_id SET NOT NULL"))
            
            # Add foreign key constraint (if it doesn't exist)
            try:
                db.execute(
                    text("ALTER TABLE workflows ADD CONSTRAINT fk_workflows_user_id FOREIGN KEY (user_id) REFERENCES \"user\"(id)")
                )
            except:
                print("  (Foreign key constraint already exists)")
            
            print("✓ workflows table migrated")
            db.commit()
        else:
            print("✓ workflows table already has user_id column")
        
        # Check if user_id column already exists in execution_logs table
        columns = [col['name'] for col in inspector.get_columns('execution_logs')]
        if 'user_id' not in columns:
            print("Adding user_id column to execution_logs table...")
            db.execute(text("ALTER TABLE execution_logs ADD COLUMN user_id INTEGER"))
            
            # Set all existing logs to user_id=1 (or match from workflow)
            db.execute(
                text("""UPDATE execution_logs 
                        SET user_id = (SELECT user_id FROM workflows WHERE workflows.id = execution_logs.workflow_id)
                        WHERE user_id IS NULL""")
            )
            
            # Make user_id not nullable
            db.execute(text("ALTER TABLE execution_logs ALTER COLUMN user_id SET NOT NULL"))
            
            # Add foreign key constraint (if it doesn't exist)
            try:
                db.execute(
                    text("ALTER TABLE execution_logs ADD CONSTRAINT fk_execution_logs_user_id FOREIGN KEY (user_id) REFERENCES \"user\"(id)")
                )
            except:
                print("  (Foreign key constraint already exists)")
            
            print("✓ execution_logs table migrated")
            db.commit()
        else:
            print("✓ execution_logs table already has user_id column")
        
        print("\nMigration completed successfully!")
        
    except Exception as e:
        print(f"Migration error: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    migrate()
