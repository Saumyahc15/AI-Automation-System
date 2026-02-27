#!/usr/bin/env python
"""
Migration script to add user_id columns to workflows and execution_logs tables
Run this once to migrate the database schema
"""
import asyncio
from sqlalchemy import text
from app.core.database import engine

async def migrate():
    """Run database migrations"""
    async with engine.begin() as conn:
        try:
            # Check if user_id already exists in workflows table
            result = await conn.execute(
                text("SELECT column_name FROM information_schema.columns WHERE table_name='workflows' AND column_name='user_id'")
            )
            if not result.fetchone():
                print("Adding user_id column to workflows table...")
                await conn.execute(
                    text("ALTER TABLE workflows ADD COLUMN user_id INTEGER")
                )
                # Create a default user (id=1) if it doesn't exist
                await conn.execute(
                    text("INSERT INTO \"user\" (id, email, full_name, password_hash) VALUES (1, 'default@system.com', 'System User', 'N/A') ON CONFLICT DO NOTHING")
                )
                # Set all existing workflows to user_id=1
                await conn.execute(
                    text("UPDATE workflows SET user_id=1 WHERE user_id IS NULL")
                )
                # Make user_id not nullable and add foreign key
                await conn.execute(
                    text("ALTER TABLE workflows ALTER COLUMN user_id SET NOT NULL")
                )
                await conn.execute(
                    text("ALTER TABLE workflows ADD CONSTRAINT fk_workflows_user_id FOREIGN KEY (user_id) REFERENCES \"user\"(id)")
                )
                print("✓ workflows table migrated")
            
            # Check if user_id already exists in execution_logs table
            result = await conn.execute(
                text("SELECT column_name FROM information_schema.columns WHERE table_name='execution_logs' AND column_name='user_id'")
            )
            if not result.fetchone():
                print("Adding user_id column to execution_logs table...")
                await conn.execute(
                    text("ALTER TABLE execution_logs ADD COLUMN user_id INTEGER")
                )
                # Set all existing logs to user_id=1
                await conn.execute(
                    text("UPDATE execution_logs SET user_id=1 WHERE user_id IS NULL")
                )
                # Make user_id not nullable and add foreign key
                await conn.execute(
                    text("ALTER TABLE execution_logs ALTER COLUMN user_id SET NOT NULL")
                )
                await conn.execute(
                    text("ALTER TABLE execution_logs ADD CONSTRAINT fk_execution_logs_user_id FOREIGN KEY (user_id) REFERENCES \"user\"(id)")
                )
                print("✓ execution_logs table migrated")
            
            print("\n✓ Database migration completed successfully!")
        except Exception as e:
            print(f"✗ Migration error: {e}")
            raise

if __name__ == "__main__":
    asyncio.run(migrate())
