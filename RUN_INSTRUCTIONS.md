# 🚀 How to Run Frontend + Backend

## Quick Start (Copy-Paste Ready)

### Step 1: Open First Terminal (Backend)
```powershell
# Copy and paste this entire block:
cd "c:\AI Automation System\ai-automation-backend"
python main.py
```

**Wait for these messages**:
```
🚀 AI AUTOMATION SYSTEM STARTING...
✅ Database initialized successfully
✅ SERVER IS READY!
📚 Interactive API Docs: http://localhost:8000/docs
```

✅ **Backend is ready** - Keep terminal open

---

### Step 2: Open Second Terminal (Frontend)
```powershell
# Copy and paste this entire block:
cd "c:\AI Automation System\frontend"
npm install
npm run dev
```

**Wait for this message**:
```
VITE v7.2.4  ready in XXX ms
➜  Local:   http://localhost:5173/
```

✅ **Frontend is ready** - Keep terminal open

---

## Now You Can Access:

| Component | URL | What to Check |
|-----------|-----|---------------|
| 🌐 Frontend | http://localhost:5173 | Landing page loads |
| 📚 API Docs | http://localhost:8000/docs | Swagger UI with all endpoints |
| 📊 Database | `automation.db` file | Should be in backend folder |

---

## What to Check First (In Order)

### ✅ Check 1: Backend is Running
Open browser and go to:
```
http://localhost:8000/docs
```

You should see:
- Swagger documentation page
- List of API endpoints
- Green badges for endpoints

### ✅ Check 2: Frontend is Running
Open browser and go to:
```
http://localhost:5173
```

You should see:
- Landing page with hero section
- Navigation menu working
- **No white screen or errors**

### ✅ Check 3: They Can Talk to Each Other
Open browser Developer Tools:
1. Press `F12`
2. Click **Console** tab
3. Paste and run:
```javascript
fetch('http://localhost:8000/workflows')
  .then(r => r.json())
  .then(d => console.log('✅ Connected!', d))
  .catch(e => console.log('❌ Error:', e))
```

You should see:
```
✅ Connected! []
```

(Empty array is OK - no workflows yet)

### ✅ Check 4: Create a Test Workflow
Go to `http://localhost:8000/docs`
1. Find endpoint: `POST /workflows`
2. Click "Try it out"
3. Paste this in body:
```json
{
  "name": "Test Workflow",
  "description": "Testing connection",
  "user_instruction": "Send me an email every day at 9 AM"
}
```
4. Click "Execute"
5. Should see response with `"id": 1` or similar

### ✅ Check 5: Verify Database
Look for database file:
```
c:\AI Automation System\ai-automation-backend\automation.db
```

- [ ] File exists
- [ ] File size > 0 KB

---

## Detailed Explanations

### What Each Terminal Does

**Terminal 1 (Backend)**:
```powershell
cd "c:\AI Automation System\ai-automation-backend"
python main.py
```
- Starts FastAPI server on `http://localhost:8000`
- Initializes SQLite database
- Loads all integration services
- Starts cron scheduler
- **Keep this running always**

**Terminal 2 (Frontend)**:
```powershell
cd "c:\AI Automation System\frontend"
npm install
npm run dev
```
- Installs npm packages (first time only)
- Starts Vite dev server on `http://localhost:5173`
- Hot reloads on file changes
- **Keep this running for development**

### What Files Are Used

Backend files being used:
```
ai-automation-backend/
├── main.py                    ← Starts here
├── app/api/routes.py          ← All API endpoints
├── app/core/database.py       ← Database setup
└── automation.db              ← Created after first run
```

Frontend files being used:
```
frontend/
├── src/App.tsx                ← Main app component
├── src/main.tsx               ← React entry point
├── package.json               ← npm dependencies
└── vite.config.ts             ← Build config
```

---

## Network Flow

```
User opens: http://localhost:5173 (Frontend)
                    ↓
         React app loads in browser
                    ↓
    User clicks button → Frontend makes API call
                    ↓
         fetch('http://localhost:8000/workflows')
                    ↓
         Backend receives request on port 8000
                    ↓
         Process request → Query database
                    ↓
         Return JSON response
                    ↓
    Frontend displays data to user
```

---

## If Something Goes Wrong

### Backend won't start
**Error**: `[Errno 48] Address already in use`
```powershell
# Kill process on port 8000
netstat -ano | findstr :8000
taskkill /PID [PID_NUMBER] /F

# Then try again
python main.py
```

### Frontend won't start
**Error**: `npm: command not found`
```powershell
# Install Node.js from https://nodejs.org/
# Then try again
npm run dev
```

**Error**: `Module not found`
```powershell
cd frontend
npm install
npm run dev
```

### Can't reach backend from frontend
**Error in browser console**: `CORS error`
```
❌ Access to XMLHttpRequest blocked by CORS policy
```

**Solutions**:
1. Make sure backend is running (check Terminal 1)
2. Make sure frontend is running (check Terminal 2)
3. CORS should already be configured - restart both servers

### Website shows blank white page
1. Press `F12` to open console
2. Look for red errors
3. Check the error message
4. If it says "Cannot GET /", backend might not be serving files correctly

---

## Ports Explained

| Port | Service | URL | Notes |
|------|---------|-----|-------|
| **8000** | FastAPI Backend | http://localhost:8000 | Main API server |
| **8080** | Google OAuth | (automatic) | Used for Google login only |
| **5173** | Vite Frontend Dev | http://localhost:5173 | Development server |

---

## Development Workflow

While both servers are running:

1. **Edit Frontend**:
   - Change files in `frontend/src/`
   - Browser auto-refreshes (hot reload)
   - No need to restart anything

2. **Edit Backend**:
   - Change files in `ai-automation-backend/app/`
   - May need to restart `python main.py`
   - Frontend keeps running

3. **Test with Swagger**:
   - Go to `http://localhost:8000/docs`
   - Try API endpoints
   - See responses in real-time
   - No frontend needed for this testing

---

## Quick Reference Commands

```powershell
# Terminal 1: Start Backend
cd "c:\AI Automation System\ai-automation-backend"
python main.py

# Terminal 2: Install Frontend Dependencies (First Time)
cd "c:\AI Automation System\frontend"
npm install

# Terminal 2: Start Frontend (After npm install)
npm run dev

# Check if ports are in use
netstat -ano | findstr :8000
netstat -ano | findstr :5173

# Kill process on port 8000
taskkill /PID [NUMBER] /F

# View database (requires sqlite3 or DB viewer)
sqlite3 automation.db ".tables"
```

---

## Checklist for First Run

- [ ] Terminal 1: Backend starts, see ✅ messages
- [ ] Terminal 2: Frontend starts, see "Local: http://localhost:5173"
- [ ] Open browser: http://localhost:5173 → See landing page
- [ ] Open browser: http://localhost:8000/docs → See Swagger UI
- [ ] Developer Console: No red errors
- [ ] Network tab: Requests to localhost:8000 show status 200
- [ ] Database file exists: `automation.db`

---

## Success!

When you see all of these:

✅ Backend running on port 8000  
✅ Frontend running on port 5173  
✅ Can access landing page  
✅ Can access Swagger docs  
✅ No errors in console  
✅ API requests succeed  

**You're ready to start building!** 🚀

---

## Next Steps

1. ✅ Verify both servers are running
2. ✅ Test the connection with the browser console
3. ✅ Create test workflows via Swagger
4. ✅ Implement API client in frontend (`lib/api-client.ts`)
5. ✅ Connect UI components to API endpoints
6. ✅ Build your first automated workflow!

See `TESTING_CHECKLIST.md` for detailed verification steps.
