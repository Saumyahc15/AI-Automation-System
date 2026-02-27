# 🧪 Testing Checklist - Frontend & Backend Connection

Use this checklist to verify everything is working correctly.

---

## Phase 1: Start Services

### Backend Startup
```bash
cd "c:\AI Automation System\ai-automation-backend"
python main.py
```

- [ ] See message: `🚀 AI AUTOMATION SYSTEM STARTING...`
- [ ] See message: `✅ Database initialized successfully`
- [ ] See message: `🎉 SERVER IS READY!`
- [ ] See message: `📚 Interactive API Docs: http://localhost:8000/docs`
- [ ] **No errors in console**

### Frontend Startup
```bash
cd "c:\AI Automation System\frontend"
npm run dev
```

- [ ] See message: `VITE v7.2.4 ready in XXX ms`
- [ ] See message: `Local: http://localhost:5173/`
- [ ] **No errors in console**

---

## Phase 2: Check Backend API

### Test 1: Swagger Documentation
- [ ] Open browser: `http://localhost:8000/docs`
- [ ] Page loads successfully
- [ ] See list of endpoints (POST /workflows, GET /workflows, etc.)
- [ ] All endpoints show with blue/green badges

### Test 2: Backend Health
- [ ] Open `http://localhost:8000/openapi.json`
- [ ] See JSON response with API schema
- [ ] Status code in DevTools: **200**

### Test 3: Create Test Workflow via Swagger
1. [ ] Go to `http://localhost:8000/docs`
2. [ ] Find `POST /workflows` section
3. [ ] Click "Try it out"
4. [ ] Copy-paste this in request body:
```json
{
  "name": "Connection Test",
  "description": "Testing frontend-backend connection",
  "user_instruction": "Send me a daily email at 9 AM with GitHub trends"
}
```
5. [ ] Click "Execute"
6. [ ] See response code: **200** or **201**
7. [ ] Response contains workflow ID and data

---

## Phase 3: Check Frontend Loading

### Test 4: Frontend Home Page
- [ ] Open `http://localhost:5173/`
- [ ] Landing page loads (should see hero section)
- [ ] No white screen or errors
- [ ] Navigation menu visible
- [ ] **Browser console (F12) shows no errors**

### Test 5: Check Browser Console
1. [ ] Press `F12` to open Developer Tools
2. [ ] Go to **Console** tab
3. [ ] Should be empty (no red errors)
4. [ ] Only normal React/Vite messages acceptable

### Test 6: Check Network Tab
1. [ ] Keep Developer Tools open
2. [ ] Go to **Network** tab
3. [ ] Refresh page (`F5`)
4. [ ] Should see requests for:
   - [ ] `index.html` (status 200)
   - [ ] `main.tsx` bundle (status 200)
   - [ ] CSS files (status 200)
   - [ ] Image/font files (status 200/304)
5. [ ] No 404 or 500 errors

---

## Phase 4: Test Frontend-Backend Communication

### Test 7: Manual API Request from Browser
1. [ ] Open browser console (`F12`)
2. [ ] Click on **Console** tab
3. [ ] Paste this code:
```javascript
fetch('http://localhost:8000/workflows')
  .then(response => response.json())
  .then(data => console.log('SUCCESS:', data))
  .catch(error => console.error('ERROR:', error))
```
4. [ ] Press Enter
5. [ ] Should see `SUCCESS: [array of workflows]` (or empty array if no workflows)
6. [ ] Should NOT see CORS error

### Test 8: Check Network Request
1. [ ] Keep the code from Test 7 running
2. [ ] Go to **Network** tab
3. [ ] Look for request to `localhost:8000/workflows`
4. [ ] Click on it
5. [ ] Check **Response** tab
6. [ ] Should show workflow data (JSON)
7. [ ] Status should be **200**

### Test 9: POST Request (Create Workflow)
```javascript
fetch('http://localhost:8000/workflows', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Browser Test',
    user_instruction: 'Test workflow from browser'
  })
})
  .then(r => r.json())
  .then(d => console.log('Created:', d))
  .catch(e => console.error('Error:', e))
```

- [ ] Request succeeds
- [ ] Status **200** or **201**
- [ ] Response includes `id` and `name`
- [ ] No CORS errors

---

## Phase 5: Database Verification

### Test 10: Check Database File
```bash
# In PowerShell, navigate to backend folder
cd "c:\AI Automation System\ai-automation-backend"
ls
```

- [ ] See file: `automation.db` (should exist)
- [ ] File size > 0 bytes

### Test 11: Verify Data Persisted
1. [ ] Go to Swagger: `http://localhost:8000/docs`
2. [ ] Find `GET /workflows`
3. [ ] Click "Try it out" → Execute
4. [ ] Should see the workflow created in Test 3 and Test 9
5. [ ] Both workflows should have different IDs

---

## Phase 6: Full Integration Test

### Test 12: Create Workflow via UI (When Connected)
*Note: This requires API client to be implemented in frontend*

Once frontend is connected to API:
- [ ] Navigate to `/app/create` page
- [ ] Form loads correctly
- [ ] Can enter workflow details
- [ ] Submit button sends data to backend
- [ ] Response returns new workflow

### Test 13: View Workflows List
- [ ] Navigate to `/app/workflows`
- [ ] Page loads
- [ ] Workflows from database are displayed
- [ ] Each workflow shows: name, status, last executed
- [ ] Can interact with workflow items

### Test 14: Execute a Workflow
- [ ] Click on a workflow
- [ ] Find "Execute" button
- [ ] Click to execute
- [ ] See confirmation message
- [ ] Check execution logs updated

---

## Phase 7: Error Handling

### Test 15: Test Error Response
1. [ ] Go to Swagger: `http://localhost:8000/docs`
2. [ ] Try to get non-existent workflow: `GET /workflows/99999`
3. [ ] Should return **404** (not 500)
4. [ ] Response shows error message clearly

### Test 16: Check Console on Error
1. [ ] Trigger an error in frontend (invalid action)
2. [ ] Check browser console (`F12`)
3. [ ] Should see useful error messages
4. [ ] Should NOT see cryptic stack traces

---

## Phase 8: Performance Check

### Test 17: Response Time
1. [ ] Open Network tab
2. [ ] Request `/workflows`
3. [ ] Check **Time** column
4. [ ] Should be < 500ms typically
5. [ ] Accept < 1000ms (if database is slow)

### Test 18: Bundle Size
1. [ ] Go to `http://localhost:5173/`
2. [ ] Open Network tab
3. [ ] Look at total bundle size
4. [ ] Should be reasonable (< 1MB for dev build)

---

## Summary Checklist

### Backend Working?
- [ ] Server starts without errors
- [ ] Swagger docs load
- [ ] Can create workflows
- [ ] Database file exists
- [ ] All endpoints respond

### Frontend Working?
- [ ] Dev server starts
- [ ] Landing page loads
- [ ] No console errors
- [ ] Network requests successful

### Connection Working?
- [ ] Can fetch from localhost:8000
- [ ] No CORS errors
- [ ] Can create workflow via API
- [ ] Data persists in database

---

## Troubleshooting

### Backend won't start
```
Error: port 8000 already in use
```
Solution: Change port in `ai-automation-backend/.env` or kill process on 8000
```bash
netstat -ano | findstr :8000
taskkill /PID [PID] /F
```

### Frontend won't start
```
error:   vite did not return a config object
```
Solution: 
```bash
cd frontend
npm install
npm run dev
```

### CORS Error in browser
```
Access to XMLHttpRequest at 'http://localhost:8000' blocked by CORS policy
```
Solution: Make sure `http://localhost:5173` is in backend CORS allowed origins (already is!)

### Can't reach backend from frontend
- [ ] Check both servers are running
- [ ] Check ports (backend 8000, frontend 5173)
- [ ] Check firewall isn't blocking
- [ ] Try `http://127.0.0.1:8000` instead of `localhost:8000`

### Database empty
- [ ] Check `automation.db` exists
- [ ] Try deleting and restarting (will recreate)
- [ ] Check backend logs for SQL errors

---

## ✅ Success Criteria

You'll know everything is working when:

1. ✅ Backend server starts with all messages
2. ✅ Frontend server starts with no errors
3. ✅ Can access `http://localhost:5173/` in browser
4. ✅ Can access `http://localhost:8000/docs` in browser
5. ✅ Browser Network tab shows requests to localhost:8000
6. ✅ API requests return status 200
7. ✅ No CORS errors in console
8. ✅ Database file exists and contains data
9. ✅ Can create and retrieve workflows
10. ✅ Frontend pages load without errors

---

Print this checklist and mark off each item as you verify! 🚀
