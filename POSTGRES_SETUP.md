# PostgreSQL Setup Guide for AI Automation System

## Step 1: Create Database and User in PostgreSQL

### Using PowerShell (Recommended):

1. **Open PowerShell as Administrator**

2. **Connect to PostgreSQL**:
   ```powershell
   psql -U postgres
   ```
   - Enter the PostgreSQL password you set during installation

3. **Create the database**:
   ```sql
   CREATE DATABASE ai_automation;
   ```

4. **Create the user with password**:
   ```sql
   CREATE USER ai_user WITH PASSWORD 'ai_automation_password';
   ```

5. **Grant privileges**:
   ```sql
   GRANT ALL PRIVILEGES ON DATABASE ai_automation TO ai_user;
   GRANT USAGE ON SCHEMA public TO ai_user;
   GRANT CREATE ON SCHEMA public TO ai_user;
   ```

6. **Exit psql**:
   ```sql
   \q
   ```

### Verify Setup:

Connect with the new user to confirm it works:
```powershell
psql -U ai_user -d ai_automation -h localhost
# Should prompt for password: ai_automation_password
```

If you get a prompt, the setup is successful. Type `\q` to exit.

---

## Step 2: Install PostgreSQL Driver for Python

Run in your terminal/PowerShell:

```powershell
pip install psycopg2-binary
```

### Or if using a virtual environment:
```powershell
# If using venv
.\venv\Scripts\Activate.ps1
pip install psycopg2-binary

# Or if using conda
conda activate ai-automation
pip install psycopg2-binary
```

---

## Step 3: Verify Backend Configuration

The database connection string is already configured in `app/core/database.py`:

```python
DATABASE_URL = "postgresql://ai_user:ai_automation_password@localhost:5432/ai_automation"
```

**Note**: The credentials match what we created:
- User: `ai_user`
- Password: `ai_automation_password`
- Database: `ai_automation`
- Host: `localhost`
- Port: `5432` (PostgreSQL default)

---

## Step 4: Start the Backend Server

1. **Navigate to backend directory**:
   ```powershell
   cd "c:\AI Automation System\ai-automation-backend"
   ```

2. **Activate virtual environment** (if using venv):
   ```powershell
   .\venv\Scripts\Activate.ps1
   ```

3. **Run the backend**:
   ```powershell
   python main.py
   ```

### Expected Output:
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
📖 Alternative Docs: http://localhost:8000/redoc
================================================================================
```

If you see `✅ Database initialized successfully`, the PostgreSQL setup is working!

---

## Step 5: Test User Registration Endpoint

### Using PowerShell:

```powershell
$body = @{
    email = "testuser@example.com"
    password = "testpassword123"
    full_name = "Test User"
} | ConvertTo-Json

curl -X POST http://localhost:8000/auth/register `
  -Headers @{"Content-Type"="application/json"} `
  -Body $body
```

### Expected Response:
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

---

## Troubleshooting

### Error: "could not connect to server: No such file or directory"
- **Cause**: PostgreSQL service not running
- **Solution**: 
  ```powershell
  # Check if service is running
  Get-Service postgresql-x64-*
  
  # Start the service
  Start-Service -Name "postgresql-x64-15" # (adjust version number)
  ```

### Error: "FATAL: password authentication failed for user 'ai_user'"
- **Cause**: Incorrect password or user not created
- **Solution**: Verify you created the user with the correct password in Step 1

### Error: "database 'ai_automation' does not exist"
- **Cause**: Database not created
- **Solution**: Re-run the CREATE DATABASE command in Step 1

### Error: "No module named psycopg2"
- **Cause**: Driver not installed
- **Solution**: Run `pip install psycopg2-binary` in Step 2

---

## Verify Database Tables Were Created

```powershell
psql -U ai_user -d ai_automation -c "\dt"
```

You should see tables like:
- `user` - User accounts
- `workflow` - Workflow definitions
- `execution_log` - Workflow execution logs

---

## Next Steps

1. ✅ Database created and configured
2. ✅ Backend tested and connected to PostgreSQL
3. ⏭️ Test registration via frontend
4. ⏭️ Connect login form to backend
5. ⏭️ Add authentication tokens to API requests

