# PostgreSQL Setup Checklist ✓

## Before You Start
- [ ] PostgreSQL installed on Windows
- [ ] Windows PowerShell or Command Prompt open
- [ ] AI Automation Backend folder accessible

---

## Step 1: Create Database & User (5 minutes)

**Run these commands in PowerShell:**

```powershell
# Connect to PostgreSQL as admin
psql -U postgres

# Run these SQL commands (paste them one by one):
CREATE DATABASE ai_automation;
CREATE USER ai_user WITH PASSWORD 'ai_automation_password';
GRANT ALL PRIVILEGES ON DATABASE ai_automation TO ai_user;
GRANT USAGE ON SCHEMA public TO ai_user;
GRANT CREATE ON SCHEMA public TO ai_user;

# Exit
\q
```

- [ ] Database created successfully
- [ ] User created with correct password
- [ ] Permissions granted

**Verify:**
```powershell
psql -U ai_user -d ai_automation -h localhost
# Enter password: ai_automation_password
# Type: \q (to exit)
```

- [ ] Can login with ai_user account

---

## Step 2: Install PostgreSQL Driver (2 minutes)

```powershell
# Navigate to backend folder
cd "c:\AI Automation System\ai-automation-backend"

# Install driver
pip install psycopg2-binary
```

- [ ] psycopg2-binary installed successfully

**Verify:**
```powershell
python -c "import psycopg2; print('✓ psycopg2 installed')"
```

---

## Step 3: Backend Configuration (Already Done ✓)

These files were already updated:
- [x] app/core/database.py - PostgreSQL connection string
- [x] app/models/user.py - User model with password hashing
- [x] app/services/auth_service.py - Registration/login logic
- [x] app/api/auth_routes.py - Auth endpoints
- [x] app/api/schemas.py - Auth schemas
- [x] main.py - Database initialization and auth routes
- [x] requirements.txt - psycopg2-binary added

**No manual changes needed!**

---

## Step 4: Start Backend Server (2 minutes)

```powershell
# Navigate to backend
cd "c:\AI Automation System\ai-automation-backend"

# Activate environment if needed
.\venv\Scripts\Activate.ps1

# Start server
python main.py
```

**Expected output:**
```
================================================================================
🚀 AI AUTOMATION SYSTEM STARTING...
================================================================================
📦 Initializing database...
✅ Database initialized successfully
🤖 AI Model: gpt-4
🌐 API Host: 127.0.0.1:8000
🔧 Debug Mode: True
================================================================================
🎉 SERVER IS READY!
📚 Interactive API Docs: http://localhost:8000/docs
================================================================================
```

- [ ] Backend started successfully
- [ ] Database initialized
- [ ] Server ready on port 8000

---

## Step 5: Test Registration Endpoint (2 minutes)

```powershell
# Test registration
$body = @{
    email = "testuser@example.com"
    password = "testpassword123"
    full_name = "Test User"
} | ConvertTo-Json

curl -X POST http://localhost:8000/auth/register `
  -Headers @{"Content-Type"="application/json"} `
  -Body $body
```

**Expected response:**
```json
{
  "id": 1,
  "email": "testuser@example.com",
  "full_name": "Test User",
  "is_active": true,
  "is_verified": false,
  "created_at": "2024-01-15T10:30:00",
  "updated_at": "2024-01-15T10:30:00"
}
```

- [ ] Registration endpoint works
- [ ] User created in database

---

## Step 6: Verify Database Tables

```powershell
# Show all tables
psql -U ai_user -d ai_automation -c "\dt"
```

**Expected tables:**
- `user` - User accounts
- `workflow` - Workflow definitions  
- `execution_log` - Workflow execution records
- `execution_log_json` - JSON workflow data

- [ ] All expected tables created

---

## Troubleshooting Quick Fixes

**"Database does not exist"**
```powershell
# Check PostgreSQL is running
Get-Service postgresql-x64-* | Select-Object Name, Status

# If stopped, start it
Start-Service -Name "postgresql-x64-15"  # adjust version
```

**"Password authentication failed"**
- Verify correct username: `ai_user`
- Verify correct password: `ai_automation_password`
- Verify correct database: `ai_automation`

**"No module named psycopg2"**
```powershell
pip install psycopg2-binary
```

**Port 8000 already in use**
```powershell
# Find process using port 8000
netstat -ano | findstr :8000

# Kill it (replace PID)
taskkill /PID <PID> /F
```

---

## What's Next?

Once all steps are complete:

1. **Frontend Registration Form**: Connect to POST /auth/register
2. **Frontend Login Form**: Connect to POST /auth/login
3. **Store Auth Token**: Save in localStorage
4. **Protected Routes**: Add authentication header to API requests
5. **User-Specific Workflows**: Tie workflows to logged-in users

---

## Success Indicators ✓

- [x] PostgreSQL installed
- [x] Backend code updated
- [ ] Database created
- [ ] Driver installed
- [ ] Server started
- [ ] Registration tested
- [ ] Frontend connected

**Total Setup Time**: ~15 minutes

