# Quick Copy-Paste Commands

## 1️⃣ PostgreSQL Database Setup

**Copy and paste this entire block into PowerShell:**

```powershell
# Connect to PostgreSQL
psql -U postgres

# Then in the psql prompt, paste each line individually:
```

**Then copy each of these lines one at a time into the psql prompt:**

```sql
CREATE DATABASE ai_automation;
```

```sql
CREATE USER ai_user WITH PASSWORD 'ai_automation_password';
```

```sql
GRANT ALL PRIVILEGES ON DATABASE ai_automation TO ai_user;
```

```sql
GRANT USAGE ON SCHEMA public TO ai_user;
```

```sql
GRANT CREATE ON SCHEMA public TO ai_user;
```

```sql
\q
```

---

## 2️⃣ Verify PostgreSQL Installation

```powershell
# Check if PostgreSQL service is running
Get-Service postgresql-x64-* | Select-Object Name, Status

# If not running, start it (adjust version number as needed)
Start-Service -Name "postgresql-x64-15"
```

---

## 3️⃣ Test New User Connection

```powershell
psql -U ai_user -d ai_automation -h localhost
```
When prompted, enter password: `ai_automation_password`

Then type `\q` to exit.

---

## 4️⃣ Install Python PostgreSQL Driver

```powershell
# Navigate to backend folder
cd "c:\AI Automation System\ai-automation-backend"

# Install the driver
pip install psycopg2-binary

# Verify installation
python -c "import psycopg2; print('✓ psycopg2 installed')"
```

---

## 5️⃣ Start Backend Server

```powershell
# Navigate to backend
cd "c:\AI Automation System\ai-automation-backend"

# Activate virtual environment (if using one)
.\venv\Scripts\Activate.ps1

# Start the server
python main.py
```

Look for this message:
```
✅ Database initialized successfully
🎉 SERVER IS READY!
📚 Interactive API Docs: http://localhost:8000/docs
```

---

## 6️⃣ Test Registration API

```powershell
# Create test user via API
$body = @{
    email = "testuser@example.com"
    password = "testpassword123"
    full_name = "Test User"
} | ConvertTo-Json

curl -X POST http://localhost:8000/auth/register `
  -Headers @{"Content-Type"="application/json"} `
  -Body $body
```

---

## 7️⃣ Test Login API

```powershell
# Login with created user
$body = @{
    email = "testuser@example.com"
    password = "testpassword123"
} | ConvertTo-Json

curl -X POST http://localhost:8000/auth/login `
  -Headers @{"Content-Type"="application/json"} `
  -Body $body
```

---

## 8️⃣ View Database Tables

```powershell
# List all tables in database
psql -U ai_user -d ai_automation -c "\dt"

# View users table
psql -U ai_user -d ai_automation -c "SELECT * FROM \"user\";"

# View workflows table
psql -U ai_user -d ai_automation -c "SELECT * FROM workflow;"
```

---

## 9️⃣ Troubleshooting Commands

```powershell
# Check port 8000 usage
netstat -ano | findstr :8000

# Kill process on port 8000 (replace PID)
taskkill /PID <PID> /F

# Check if PostgreSQL is installed
psql --version

# Get PostgreSQL service info
Get-Service postgresql-x64-* | Format-List *
```

---

## 🔟 Reset Database (if needed)

⚠️ **Warning**: This deletes all data!

```powershell
# Connect as admin
psql -U postgres

# Drop database
DROP DATABASE IF EXISTS ai_automation;

# Drop user
DROP USER IF EXISTS ai_user;

# Exit
\q

# Then recreate (use Step 1 commands above)
```

---

## Summary

**Total time needed**: ~15 minutes

1. Create database & user (5 min) → Step 1
2. Install driver (2 min) → Step 4
3. Start backend (2 min) → Step 5
4. Test API (3 min) → Steps 6-7
5. Verify database (2 min) → Step 8

You're all set!

