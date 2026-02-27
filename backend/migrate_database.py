#!/usr/bin/env python
"""
Database migration script for adding new columns to existing tables
Run this once if you're experiencing column not found errors
"""

import os
import sys
from sqlalchemy import inspect, text, create_engine
from sqlalchemy.orm import sessionmaker

# Import database configuration
from app.core.database import DATABASE_URL

def migrate():
    """Migrate database schema"""
    print("=" * 80)
    print("🔄 DATABASE MIGRATION SCRIPT")
    print("=" * 80)
    
    # Create engine
    engine = create_engine(DATABASE_URL, echo=False)
    
    try:
        # Get inspector to check table structure
        inspector = inspect(engine)
        
        print("\n📊 Checking existing tables...")
        tables = inspector.get_table_names()
        print(f"Found tables: {tables}")
        
        with engine.connect() as connection:
            # Migrate users table
            if 'users' in tables:
                print("\n📝 Checking 'users' table...")
                users_columns = [col['name'] for col in inspector.get_columns('users')]
                print(f"Existing columns: {users_columns}")
                
                if 'avatar' not in users_columns:
                    print("  → Adding 'avatar' column...")
                    try:
                        connection.execute(text('ALTER TABLE users ADD COLUMN avatar VARCHAR'))
                        connection.commit()
                        print("  ✅ 'avatar' column added successfully")
                    except Exception as e:
                        print(f"  ⚠️  Column might already exist: {str(e)}")
                        connection.rollback()
                else:
                    print("  ✅ 'avatar' column already exists")
            
            # Migrate workflows table
            if 'workflows' in tables:
                print("\n📝 Checking 'workflows' table...")
                workflows_columns = [col['name'] for col in inspector.get_columns('workflows')]
                print(f"Existing columns: {workflows_columns}")
                
                if 'webhook_enabled' not in workflows_columns:
                    print("  → Adding 'webhook_enabled' column...")
                    try:
                        connection.execute(text('ALTER TABLE workflows ADD COLUMN webhook_enabled BOOLEAN DEFAULT false'))
                        connection.commit()
                        print("  ✅ 'webhook_enabled' column added successfully")
                    except Exception as e:
                        print(f"  ⚠️  Column might already exist: {str(e)}")
                        connection.rollback()
                else:
                    print("  ✅ 'webhook_enabled' column already exists")
                
                if 'webhook_token' not in workflows_columns:
                    print("  → Adding 'webhook_token' column...")
                    try:
                        connection.execute(text('ALTER TABLE workflows ADD COLUMN webhook_token VARCHAR'))
                        connection.commit()
                        print("  ✅ 'webhook_token' column added successfully")
                    except Exception as e:
                        print(f"  ⚠️  Column might already exist: {str(e)}")
                        connection.rollback()
                else:
                    print("  ✅ 'webhook_token' column already exists")
        
        print("\n" + "=" * 80)
        print("✅ MIGRATION COMPLETE!")
        print("=" * 80)
        print("\nYou can now run the application:")
        print("  python main.py")
        
    except Exception as e:
        print(f"\n❌ Migration failed: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    migrate()
