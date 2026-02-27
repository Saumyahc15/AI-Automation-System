# 🔗 Frontend-Backend Integration Guide

## Current Setup Status

✅ **Backend**: FastAPI running on `http://localhost:8000`
- CORS already configured for Vite default ports (5173, 5174)
- API routes available at `/api/*`
- Swagger docs at `http://localhost:8000/docs`

✅ **Frontend**: React + Vite running on `http://localhost:5173`
- Using React Router for navigation
- TanStack React Query for data fetching
- Configured pages and dashboard

---

## How They Connect

### Backend Endpoints (Already Built)
```
POST   /workflows                 - Create workflow
GET    /workflows                 - List workflows
GET    /workflows/{id}            - Get workflow detail
DELETE /workflows/{id}            - Delete workflow
POST   /workflows/{id}/execute    - Execute workflow
POST   /workflows/{id}/activate   - Activate workflow
POST   /workflows/{id}/deactivate - Deactivate workflow
GET    /logs                      - Get execution logs
GET    /logs/{workflow_id}        - Get workflow logs
POST   /files/upload              - Upload files
GET    /files/{file_id}           - Download files
```

### Frontend Pages (Already Built)
```
/                     - Landing Page
/login                - Login
/signup               - Sign Up
/forgot-password      - Forgot Password
/app/overview         - Dashboard Overview
/app/workflows        - Workflows List
/app/create           - Create Workflow
/app/logs             - Execution Logs
/app/integrations     - Integrations
/app/analytics        - Analytics
/app/settings         - Settings
```

---

## How to Run Both

### Terminal 1: Start Backend
```bash
# Navigate to backend directory
cd "c:\AI Automation System\ai-automation-backend"

# Start the server
python main.py
```

**Expected output**:
```
🚀 AI AUTOMATION SYSTEM STARTING...
✅ Database initialized successfully
✅ SERVER IS READY!
📚 Interactive API Docs: http://localhost:8000/docs
```

### Terminal 2: Start Frontend
```bash
# Navigate to frontend directory
cd "c:\AI Automation System\frontend"

# Install dependencies (first time only)
npm install

# Start development server
npm run dev
```

**Expected output**:
```
VITE v7.2.4  ready in XXX ms

➜  Local:   http://localhost:5173/
➜  press h to show help
```

---

## How They're Connected

### 1. CORS Configuration ✅
**File**: `ai-automation-backend/main.py`

CORS is already configured to allow requests from:
- `http://localhost:5173` (Vite frontend)
- `http://localhost:5174` (Vite alternative)
- `http://localhost:3000` (React default)

**No changes needed** - frontend can make requests to backend!

### 2. Frontend API Calls

The frontend uses **React Query** for data fetching. You need to create an API client layer.

**Create**: `frontend/src/lib/api-client.ts`
```typescript
const API_URL = 'http://localhost:8000'

export const apiClient = {
  async request(endpoint: string, options?: RequestInit) {
    const response = await fetch(`${API_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    })
    
    if (!response.ok) throw new Error(await response.text())
    return response.json()
  },
  
  get: (endpoint: string) => 
    apiClient.request(endpoint),
  
  post: (endpoint: string, data?: any) => 
    apiClient.request(endpoint, { 
      method: 'POST', 
      body: JSON.stringify(data) 
    }),
  
  put: (endpoint: string, data?: any) => 
    apiClient.request(endpoint, { 
      method: 'PUT', 
      body: JSON.stringify(data) 
    }),
  
  delete: (endpoint: string) => 
    apiClient.request(endpoint, { method: 'DELETE' }),
}
```

### 3. Using API Client in Components

**Example**: `frontend/src/pages/dashboard/WorkflowsPage.tsx`
```typescript
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../lib/api-client'

export default function WorkflowsPage() {
  const { data: workflows, isLoading } = useQuery({
    queryKey: ['workflows'],
    queryFn: () => apiClient.get('/workflows')
  })
  
  // Use workflows data...
}
```

---

## What to Check (Testing)

### ✅ Check 1: Backend is Running
```bash
# Open browser, go to:
http://localhost:8000/docs

# Should see Swagger UI with all endpoints
# All endpoints should have green "200" response codes
```

### ✅ Check 2: Frontend is Running
```bash
# Open browser, go to:
http://localhost:5173/

# Should see the Landing Page with navigation
# No console errors in Developer Tools (F12)
```

### ✅ Check 3: Network Communication
```bash
# Open browser Developer Tools (F12)
# Go to Network tab
# Click any button on frontend
# Should see requests to:
http://localhost:8000/api/...

# Status should be 200/201/204 (not 404 or 500)
```

### ✅ Check 4: Create a Test Workflow
```bash
1. Open backend Swagger: http://localhost:8000/docs
2. Find POST /workflows endpoint
3. Click "Try it out"
4. Paste example:
{
  "name": "Test Workflow",
  "description": "Testing the connection",
  "user_instruction": "Send me an email every day at 9 AM"
}
5. Click Execute
6. Should return 200 with workflow data
```

### ✅ Check 5: Verify CORS Working
```bash
# In browser console (F12):
fetch('http://localhost:8000/workflows')
  .then(r => r.json())
  .then(d => console.log('Success!', d))
  .catch(e => console.log('Error:', e))

# Should print: Success! [workflows array]
# If you see CORS error, it means CORS is not configured
```

### ✅ Check 6: Database Connection
```bash
# Look for this in backend logs:
✅ Database initialized successfully

# Check database file exists:
ls ai-automation-backend/automation.db
# Should exist (SQLite file)
```

### ✅ Check 7: API Response Format

**Create Workflow Request**:
```bash
curl -X POST http://localhost:8000/workflows \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test",
    "user_instruction": "Daily email"
  }'
```

**Expected Response** (200):
```json
{
  "id": 1,
  "name": "Test",
  "description": null,
  "user_instruction": "Daily email",
  "trigger_type": "cron_schedule",
  "trigger_config": {...},
  "actions": [...],
  "is_active": true,
  "is_running": false,
  "created_at": "2025-12-27T...",
  "updated_at": "2025-12-27T..."
}
```

---

## Troubleshooting Connection Issues

### Issue: Frontend can't reach backend (CORS error)
```
Access to XMLHttpRequest blocked by CORS policy
```

**Solution**:
- Make sure backend is running on `http://localhost:8000`
- Check CORS configuration in `ai-automation-backend/main.py`
- Add your frontend URL to `allow_origins` if different

### Issue: Backend returns 404
```
{"detail": "Not Found"}
```

**Solutions**:
1. Check endpoint path is correct (case-sensitive)
2. Backend routes start with `/workflows`, `/files`, `/logs`, not `/api`
3. Make sure route is registered in `app/api/routes.py`

### Issue: CORS works but data isn't displaying
1. Check Network tab in DevTools
2. Look for response status and body
3. Verify API response format matches frontend expectations
4. Check browser console for JavaScript errors

### Issue: Database file not found
```
FileNotFoundError: automation.db
```

**Solution**:
- Backend creates `automation.db` automatically on first run
- Make sure backend ran successfully
- Check `ai-automation-backend/` directory for `automation.db`

---

## Quick Reference

| Component | Port | URL | Status |
|-----------|------|-----|--------|
| Backend API | 8000 | http://localhost:8000 | ✅ Ready |
| Backend Docs | 8000 | http://localhost:8000/docs | ✅ Ready |
| Frontend | 5173 | http://localhost:5173 | ✅ Ready |
| Database | - | automation.db | ✅ Auto-created |

---

## Files Already Configured

### Backend CORS
- ✅ `main.py` - CORS middleware configured
- ✅ `app/api/routes.py` - All routes defined
- ✅ `app/core/database.py` - Database setup

### Frontend Structure
- ✅ `src/App.tsx` - Routes configured
- ✅ `src/main.tsx` - React Query provider ready
- ✅ `package.json` - Dependencies installed
- ✅ `vite.config.ts` (if exists) - Build configured

---

## Next Steps

1. **Start backend**: `python main.py`
2. **Start frontend**: `npm run dev`
3. **Open browser**: `http://localhost:5173`
4. **Check DevTools Network tab** for API calls
5. **Test Swagger API** at `http://localhost:8000/docs`

---

## Environment Variables

### Frontend
Frontend is already configured to connect to `http://localhost:8000`. If you need to change the API URL later, create `frontend/.env.local`:
```
VITE_API_URL=http://localhost:8000
```

Then update `api-client.ts`:
```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
```

### Backend
Backend runs on port 8000 (configurable in `.env` or config):
```
API_PORT=8000
```

---

## Summary

✅ **No changes needed** - Everything is already connected!
- Backend has CORS configured
- Frontend can make HTTP requests
- Both use standard ports
- API routes are ready

Just start both servers and they'll work together!
