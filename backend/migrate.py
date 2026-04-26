from sqlalchemy import text
from app.database import engine

with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE workflows ADD COLUMN user_id INTEGER REFERENCES users(user_id)"))
        conn.commit()
        print("✓ Successfully added user_id column to workflows table")
    except Exception as e:
        if "already exists" in str(e):
            print("✓ Column already exists, skipping")
        else:
            print(f"Error: {e}")
            conn.rollback()
