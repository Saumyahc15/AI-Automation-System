# PostgreSQL Setup Guide for AI Automation System

## Why PostgreSQL?

✅ **Multi-user support** - Handles concurrent access
✅ **Production-ready** - Industry standard
✅ **Relational data** - Perfect for users + workflows
✅ **Free & Open source** - No licensing costs
✅ **Works with SQLAlchemy** - What your backend uses
✅ **Scalable** - Can grow with your app

---

## Installation Options

### Option 1: PostgreSQL Installer (Windows) ⭐ Recommended for Beginners

#### Step 1: Download & Install
1. Go to: https://www.postgresql.org/download/windows/
2. Download "Windows x86-64" (14 or 15 version)
3. Run installer
4. **Important settings during install:**
   - Password for `postgres` user: **remember this!**
   - Port: `5432` (default)
   - Locale: `[Default locale]`

#### Step 2: Verify Installation
```powershell
# Open PowerShell and test
psql --version
```

Should output: `psql (PostgreSQL) 15.x ...`

---

### Option 2: Docker (Recommended for Professionals)

#### Step 1: Install Docker Desktop
1. Download: https://www.docker.com/products/docker-desktop
2. Run installer
3. Restart computer
4. Open PowerShell

#### Step 2: Run PostgreSQL Container
```powershell
docker run --name postgres-ai ^
  -e POSTGRES_PASSWORD=postgres ^
  -e POSTGRES_DB=ai_automation ^
  -p 5432:5432 ^
  -d postgres:15
```

#### Step 3: Verify
```powershell
docker ps
# Should show running postgres container
```

---

### Option 3: Using Chocolatey (Windows)

```powershell
choco install postgresql
```

---

## Database Configuration

### Step 1: Create Database & User

#### Using pgAdmin (GUI - Easiest)
1. Open pgAdmin (installed with PostgreSQL)
2. Right-click "Databases" → Create → Database
3. Name: `ai_automation`
4. Right-click "Login/Group Roles" → Create → Login/Group Role
5. Name: `ai_user`
6. Set password: `ai_automation_password` (change this!)
7. Grant privileges

#### OR Using Command Line

```powershell
# Connect to PostgreSQL
psql -U postgres

# Inside psql, run:
CREATE DATABASE ai_automation;
CREATE USER ai_user WITH PASSWORD 'ai_automation_password';
ALTER ROLE ai_user SET client_encoding TO 'utf8';
ALTER ROLE ai_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE ai_user SET default_transaction_deferrable TO on;
ALTER ROLE ai_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE ai_automation TO ai_user;
\q
```

---

## Backend Configuration

### Step 1: Install PostgreSQL Driver

```bash
cd "c:\AI Automation System\ai-automation-backend"
pip install psycopg2-binary
```

### Step 2: Update Database Configuration

Edit `app/core/database.py`:

```python
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# PostgreSQL connection string
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://ai_user:ai_automation_password@localhost:5432/ai_automation"
)

# Create engine with connection pooling
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,  # Check connection health before using
    pool_recycle=3600,   # Recycle connections after 1 hour
    echo=False           # Set to True for SQL logging
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

### Step 3: Create Tables

Edit `main.py` to add table creation:

```python
from app.models import User, Workflow, ExecutionLog
from app.core.database import engine, Base

# Create all tables
Base.metadata.create_all(bind=engine)
```

### Step 4: Update main.py to Include Auth Routes

```python
from app.api import auth_routes

# Add to app:
app.include_router(auth_routes.router)
```

---

## Environment Variables

Create `.env` file in backend root:

```env
# Database
DATABASE_URL=postgresql://ai_user:ai_automation_password@localhost:5432/ai_automation

# API
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=True

# OpenAI (if using)
OPENAI_API_KEY=your_key_here

# JWT (for production)
SECRET_KEY=your-secret-key-here
```

---

## Frontend Registration Integration

### API Endpoints Now Available:

```
POST /auth/register
{
  "email": "user@example.com",
  "password": "password123",
  "full_name": "John Doe"
}

POST /auth/login
{
  "email": "user@example.com",
  "password": "password123"
}

GET /auth/me?user_id=1
```

### Frontend Registration Form

Connect your registration page to:
```typescript
// Use in your RegisterPage.tsx
const registerUser = async (email: string, password: string, fullName: string) => {
  const response = await fetch('http://localhost:8000/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      full_name: fullName
    })
  })
  
  if (response.ok) {
    const user = await response.json()
    // Store user ID or token in localStorage
    localStorage.setItem('user_id', user.id)
    // Redirect to dashboard
  }
}
```

---

## Testing the Setup

### 1. Verify Database Connection
```powershell
psql -U ai_user -d ai_automation -c "SELECT 1;"
```

### 2. Start Backend
```powershell
cd "c:\AI Automation System\ai-automation-backend"
python main.py
```

Should show:
```
✅ Database initialized successfully
🎉 SERVER IS READY!
```

### 3. Test Registration Endpoint
```powershell
curl -X POST http://localhost:8000/auth/register ^
  -H "Content-Type: application/json" ^
  -d '{
    "email": "test@example.com",
    "password": "testpass123",
    "full_name": "Test User"
  }'
```

Should return:
```json
{
  "id": 1,
  "email": "test@example.com",
  "full_name": "Test User",
  "is_active": true,
  "is_verified": false,
  "created_at": "2025-12-27T20:00:00"
}
```

### 4. Test Login
```powershell
curl -X POST http://localhost:8000/auth/login ^
  -H "Content-Type: application/json" ^
  -d '{
    "email": "test@example.com",
    "password": "testpass123"
  }'
```

---

## Database Schema

Your PostgreSQL database will have these tables:

### users
```
id (PK)
email (UNIQUE)
password_hash
full_name
is_active
is_verified
created_at
updated_at
last_login
```

### workflows
```
id (PK)
user_id (FK)
name
description
user_instruction
trigger_type
...
created_at
```

### execution_logs
```
id (PK)
workflow_id (FK)
user_id (FK)
status
duration_ms
started_at
...
```

---

## Troubleshooting

### Connection Refused
```
Error: could not connect to server: Connection refused
```
**Fix:**
- Is PostgreSQL running? Check Services in Windows
- Is it on port 5432? Check `pg_hba.conf`
- Wrong password? Reset user password

### Database Not Found
```
Error: database "ai_automation" does not exist
```
**Fix:**
```powershell
psql -U postgres -l
# Check if ai_automation is listed
```

### Permission Denied
```
Error: permission denied for schema public
```
**Fix:**
```powershell
psql -U postgres -d ai_automation

GRANT ALL PRIVILEGES ON SCHEMA public TO ai_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ai_user;
\q
```

---

## Next Steps

1. ✅ Install PostgreSQL (Option 1, 2, or 3)
2. ✅ Create database and user
3. ✅ Update backend configuration
4. ✅ Install `psycopg2-binary`
5. ✅ Run migrations
6. ✅ Test registration endpoint
7. ✅ Connect frontend registration form

---

## Production Considerations

**Before deploying to production:**
- Use strong passwords
- Use JWT tokens (not simple tokens)
- Use HTTPS (not HTTP)
- Hash passwords with bcrypt (not SHA256)
- Add email verification
- Add password reset
- Use environment variables
- Add rate limiting
- Add CORS configuration

**For now (development):**
- Simple tokens OK
- HTTP OK
- SHA256 OK for testing

---

Let me know which installation option you want to use, and I'll help you complete the setup! 🚀
