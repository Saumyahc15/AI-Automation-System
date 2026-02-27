#!/usr/bin/env python
"""
Simple migration script to add user_id columns
"""
import psycopg2
import os

def migrate():
    """Connect directly to PostgreSQL and add user_id columns"""
    
    # Get connection string from .env
    from dotenv import load_dotenv
    load_dotenv()
    
    db_url = os.getenv('DATABASE_URL', 'postgresql://ai_user:ai_automation_password@localhost:5432/ai_automation')
    
    # Parse connection string
    # postgresql://ai_user:ai_automation_password@localhost:5432/ai_automation
    parts = db_url.replace('postgresql://', '').replace('postgresql+asyncpg://', '').split('@')
    user_pass = parts[0].split(':')
    host_db = parts[1].split('/')
    
    user = user_pass[0]
    password = user_pass[1]
    host = host_db[0].split(':')[0]
    port = int(host_db[0].split(':')[1]) if ':' in host_db[0] else 5432
    database = host_db[1]
    
    try:
        conn = psycopg2.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            database=database
        )
        cursor = conn.cursor()
        
        print("Connected to PostgreSQL database")
        print(f"Database: {database}")
        
        # Check and add user_id to workflows table
        cursor.execute("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name='workflows' AND column_name='user_id'
        """)
        
        if not cursor.fetchone():
            print("\nAdding user_id to workflows table...")
            cursor.execute("ALTER TABLE workflows ADD COLUMN user_id INTEGER DEFAULT 1")
            print("✓ user_id column added to workflows")
            
            # Make NOT NULL with foreign key
            cursor.execute("ALTER TABLE workflows ALTER COLUMN user_id SET NOT NULL")
            cursor.execute("ALTER TABLE workflows ADD CONSTRAINT fk_workflows_user_id FOREIGN KEY (user_id) REFERENCES users(id)")
            print("✓ Foreign key added")
        else:
            print("\n✓ workflows table already has user_id column")
        
        # Check and add user_id to execution_logs table
        cursor.execute("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name='execution_logs' AND column_name='user_id'
        """)
        
        if not cursor.fetchone():
            print("\nAdding user_id to execution_logs table...")
            cursor.execute("ALTER TABLE execution_logs ADD COLUMN user_id INTEGER DEFAULT 1")
            print("✓ user_id column added to execution_logs")
            
            # Make NOT NULL with foreign key
            cursor.execute("ALTER TABLE execution_logs ALTER COLUMN user_id SET NOT NULL")
            cursor.execute("ALTER TABLE execution_logs ADD CONSTRAINT fk_execution_logs_user_id FOREIGN KEY (user_id) REFERENCES users(id)")
            print("✓ Foreign key added")
        else:
            print("\n✓ execution_logs table already has user_id column")
        
        conn.commit()
        cursor.close()
        conn.close()
        
        print("\nMigration completed successfully!")
        
    except Exception as e:
        print(f"Migration error: {str(e)}")
        raise

if __name__ == "__main__":
    migrate()
