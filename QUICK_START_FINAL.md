# Quick Start - Running the Complete System

## 1. Start PostgreSQL Database

Ensure PostgreSQL server is running on `localhost:5432` with:
- Database: `ai_automation`
- User: `ai_user`
- Password: `ai_automation_password`

### Check Connection
```bash
# From backend directory
python -c "from app.core.database import engine; print('Database connected!' if engine else 'Failed')"
```

## 2. Start Backend Server

```bash
cd "c:\AI Automation System\ai-automation-backend"
python main.py
```

Expected output:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
```

The API documentation will be available at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 3. Start Frontend Development Server

```bash
cd "c:\AI Automation System\frontend"
npm run dev
```

The frontend will be available at: http://localhost:5173

## 4. Use the System

### 4.1 Register/Login
1. Navigate to the login or signup page
2. Create an account with your email
3. Your user ID will be stored in localStorage

### 4.2 Create a Workflow
1. Go to "Create Workflow" page
2. Describe your workflow in natural language, e.g.:
   - "Send me daily GitHub trending repositories at 9 AM"
   - "Monitor my email and summarize important messages"
   - "Create a backup of my Google Drive files weekly"
3. Click "Generate Workflow"
4. Review the generated workflow configuration
5. Click "Save Workflow"

### 4.3 Execute Workflow
1. Click "Execute Now" on a workflow card
2. The workflow will run immediately
3. Check "Execution Logs" to see results

### 4.4 View Execution History
1. Go to "Execution Logs" page
2. See all your workflow executions
3. Filter by status (success/failed)
4. View execution time and output

### 4.5 View Analytics
1. Go to "Analytics" page
2. See overall statistics for your workflows
3. View success rates and execution times
4. Compare performance across workflows

## How User Authentication Works

```
LOGIN
  ↓
User enters email → Backend creates/verifies user
  ↓
User ID returned → Frontend stores in localStorage
  ↓
CREATE WORKFLOW
  ↓
Frontend retrieves user_id from localStorage
  ↓
API call includes ?user_id={userId} parameter
  ↓
Backend verifies user_id is authenticated
  ↓
Workflow saved with user_id FK to database
  ↓
EXECUTE WORKFLOW
  ↓
Execution logged with same user_id
  ↓
Only that user can see logs and analytics for their workflows
```

## Database Schema

### Users Table
```
users (
  id INTEGER PRIMARY KEY,
  email VARCHAR UNIQUE,
  full_name VARCHAR,
  password_hash VARCHAR,
  is_active BOOLEAN,
  created_at TIMESTAMP,
  last_login TIMESTAMP
)
```

### Workflows Table
```
workflows (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL FK→users.id,  ← NEW: Links to user
  name VARCHAR,
  description TEXT,
  user_instruction TEXT,
  trigger_type VARCHAR,
  trigger_config JSONB,
  actions JSONB,
  workflow_code TEXT,
  workflow_yaml TEXT,
  is_active BOOLEAN,
  execution_count INTEGER,
  success_count INTEGER,
  failure_count INTEGER,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

### Execution Logs Table
```
execution_logs (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL FK→users.id,  ← NEW: Links to user
  workflow_id INTEGER FK→workflows.id,
  status VARCHAR,
  error_message TEXT,
  execution_time FLOAT,
  input_data TEXT,
  output_data TEXT,
  executed_at TIMESTAMP
)
```

## API Endpoints

All endpoints require `user_id` query parameter:

### Workflow Management
- `POST /api/workflows/create?user_id={id}` - Create workflow
- `GET /api/workflows?user_id={id}` - Get all user's workflows
- `GET /api/workflows/{id}?user_id={userId}` - Get specific workflow
- `POST /api/workflows/execute?user_id={id}` - Execute workflow
- `DELETE /api/workflows/{id}?user_id={id}` - Delete workflow

### Execution Logs
- `GET /api/logs?user_id={id}&limit=100` - Get execution logs
- `GET /api/workflows/{id}/logs?user_id={userId}` - Get logs for specific workflow

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `GET /auth/me?user_id={id}` - Get current user info

## Troubleshooting

### "User not authenticated" error
- Check that your email is stored in localStorage
- Try logging in again
- Clear localStorage if necessary: `localStorage.clear()` in browser console

### "Workflow not found" error
- Verify the workflow ID is correct
- Make sure you're the owner of that workflow
- Check that the workflow exists in your user account

### Database connection error
- Verify PostgreSQL is running: `pg_isready -h localhost -p 5432`
- Check credentials in `.env` file
- Ensure database `ai_automation` exists

### API returns 500 error
- Check backend console for error messages
- Review logs in `ai-automation-backend/logs/app.log`
- Restart backend server

## Performance Tips

1. **First Workflow Generation**: May take 10-30 seconds (OpenAI API call)
2. **Subsequent Operations**: Usually 1-5 seconds
3. **Workflow Execution**: Depends on the actions (email, web scraping, etc.)

## Security Notes

⚠️ **Important**: This is a development setup. For production:

1. **Use JWT Authentication**: Replace localStorage email-based auth with JWT tokens
2. **HTTPS Only**: Enable HTTPS/SSL for all communications
3. **Rate Limiting**: Add rate limiting on API endpoints
4. **Input Validation**: Validate all user inputs server-side
5. **Database Security**: Use strong passwords, rotate credentials regularly
6. **Environment Variables**: Never commit `.env` file with real credentials
7. **CORS**: Restrict CORS origins to your domain only

## Next Steps

1. Test the system with your own workflows
2. Configure integrations (Gmail, GitHub, etc.) in `app/integrations/`
3. Set up workflow scheduling with APScheduler
4. Add workflow sharing and permissions
5. Deploy to production with proper security measures

---

**System Status**: ✅ All components operational and ready to use!
