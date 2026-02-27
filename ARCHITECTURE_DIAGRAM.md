# 🎨 System Diagram & Architecture

## Complete System Flow

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│  USER BROWSER                                                  │
│  (Opens localhost:5173)                                       │
│                                                                │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     │ HTTP Request (GET /workflows)
                     ↓
         ┌───────────────────────┐
         │  FRONTEND (React)      │
         │  Port 5173             │
         │  Components:           │
         │  - Dashboard           │
         │  - Workflow List       │
         │  - Create Form         │
         │  - Logs                │
         │  - Settings            │
         │                        │
         │  Technologies:         │
         │  - React 19            │
         │  - Vite 7              │
         │  - React Query         │
         │  - React Router        │
         │  - Tailwind CSS        │
         └─────────┬──────────────┘
                   │
                   │ HTTP (localhost:8000)
                   │ fetch('http://localhost:8000/workflows')
                   │
                   ↓
         ┌───────────────────────────┐
         │  BACKEND API (FastAPI)    │
         │  Port 8000                │
         │                           │
         │  Endpoints:               │
         │  ├─ GET /workflows        │
         │  ├─ POST /workflows       │
         │  ├─ DELETE /workflows/{id}│
         │  ├─ POST /execute/{id}    │
         │  ├─ GET /logs             │
         │  ├─ POST /files/upload    │
         │  ├─ GET /files/{id}       │
         │  └─ ... more              │
         │                           │
         │  Middleware:              │
         │  ├─ CORS (✅ enabled)    │
         │  ├─ Error handling        │
         │  ├─ Logging               │
         │  └─ Request validation    │
         │                           │
         │  Services:                │
         │  ├─ AI Service            │
         │  ├─ Workflow Service      │
         │  ├─ Scheduler             │
         │  ├─ Email Monitor         │
         │  └─ Executor              │
         │                           │
         │  Integrations:            │
         │  ├─ Gmail                 │
         │  ├─ Google Drive          │
         │  ├─ Google Sheets         │
         │  ├─ GitHub                │
         │  ├─ Telegram              │
         │  ├─ WhatsApp              │
         │  └─ Web Scraping          │
         └─────────┬──────────────────┘
                   │
                   │ SQL Queries
                   │ INSERT INTO workflows...
                   │ SELECT * FROM workflows
                   │
                   ↓
         ┌──────────────────────┐
         │  DATABASE (SQLite)   │
         │  automation.db       │
         │                      │
         │  Tables:             │
         │  ├─ workflows        │
         │  │  ├─ id            │
         │  │  ├─ name          │
         │  │  ├─ trigger_type  │
         │  │  ├─ actions       │
         │  │  ├─ is_active     │
         │  │  └─ timestamps    │
         │  │                   │
         │  └─ execution_logs   │
         │     ├─ id            │
         │     ├─ workflow_id   │
         │     ├─ status        │
         │     ├─ result        │
         │     └─ timestamps    │
         │                      │
         │  Features:           │
         │  - Auto-sync         │
         │  - Transactions      │
         │  - Indexes           │
         │  - Relationships     │
         └──────────────────────┘
```

---

## Request-Response Cycle

```
┌────────────────────────────────────────────────────────────────┐
│                     USER CLICKS BUTTON                         │
│              (e.g., "Create Workflow")                        │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ↓
         ┌─────────────────────────────┐
         │  FRONTEND (React Component) │
         │  Form submission handler    │
         └────────────┬────────────────┘
                      │
                      ↓
         ┌──────────────────────────────────┐
         │  JAVASCRIPT / REACT QUERY        │
         │  Prepares request:               │
         │  {                               │
         │    "name": "My Workflow",        │
         │    "user_instruction": "...",    │
         │    "trigger_type": "cron"        │
         │  }                               │
         └────────────┬─────────────────────┘
                      │
                      ↓
         ┌──────────────────────────────────┐
         │  HTTP POST REQUEST               │
         │  URL: http://localhost:8000      │
         │  Path: /workflows                │
         │  Headers: Content-Type: json     │
         │  Body: [JSON above]              │
         │                                  │
         │  Status: ⏳ Pending              │
         └────────────┬─────────────────────┘
                      │
         ┌────────────┴────────────┐
         │                         │
         ↓                         ↓
    CORS Check              CORS Check
    ✅ ALLOWED             ✅ ALLOWED
    (configured)           (configured)
         │                         │
         └────────────┬────────────┘
                      │
                      ↓
         ┌──────────────────────────────────┐
         │  FASTAPI BACKEND                 │
         │  Router: POST /workflows         │
         │  Handler: create_workflow()      │
         │                                  │
         │  Validation:                     │
         │  ✅ Check name not empty         │
         │  ✅ Check instruction exists     │
         │  ✅ Validate trigger_type        │
         └────────────┬─────────────────────┘
                      │
                      ↓
         ┌──────────────────────────────────┐
         │  AI SERVICE                      │
         │  parse_user_instruction()        │
         │  Generate workflow structure     │
         │  from natural language           │
         │                                  │
         │  Returns:                        │
         │  {                               │
         │    trigger: {...},               │
         │    actions: [...],               │
         │    workflow_code: "..."          │
         │  }                               │
         └────────────┬─────────────────────┘
                      │
                      ↓
         ┌──────────────────────────────────┐
         │  DATABASE OPERATION              │
         │  INSERT INTO workflows (...)     │
         │                                  │
         │  Returns: Workflow ID = 42       │
         └────────────┬─────────────────────┘
         │
                      ↓
         ┌──────────────────────────────────┐
         │  HTTP RESPONSE (200)             │
         │  Headers: Content-Type: json     │
         │  Body:                           │
         │  {                               │
         │    "id": 42,                     │
         │    "name": "My Workflow",        │
         │    "status": "active",           │
         │    ...                           │
         │  }                               │
         │                                  │
         │  Status: ✅ SUCCESS              │
         └────────────┬─────────────────────┘
                      │
                      ↓
         ┌──────────────────────────────────┐
         │  FRONTEND RECEIVES RESPONSE      │
         │  React Query updates state       │
         │  Component re-renders            │
         │  Shows workflow in list          │
         │                                  │
         │  User sees: "✅ Created!"        │
         └──────────────────────────────────┘
```

---

## Data Flow: Workflow Execution

```
┌──────────────────────────────────────────────────────────────────┐
│                 WORKFLOW EXECUTION FLOW                          │
└──────────────────────────────────────────────────────────────────┘

USER ACTION (Frontend)
  │
  ├─→ Click "Execute" button
  │
  ↓
HTTP POST /workflows/{id}/execute
  │
  ├─→ Sent to Backend
  │
  ↓
WorkflowService.execute_workflow()
  │
  ├─→ Fetch workflow from database
  ├─→ Get workflow_code (Python code)
  ├─→ Create execution namespace
  │
  ↓
WorkflowExecutor.execute()
  │
  ├─→ Sanitize code
  ├─→ Load integration services
  ├─→ Execute code with exec()
  │
  ↓
Integration Services (Async)
  │
  ├─→ WebService.scrape_github_trends()
  ├─→ SimpleEmailService.send_email()
  ├─→ GoogleDriveService.upload_file()
  ├─→ ... (whatever actions needed)
  │
  ↓
External Services (Gmail, GitHub, etc.)
  │
  ├─→ Send API requests
  ├─→ Get responses
  │
  ↓
Workflow Complete
  │
  ├─→ Prepare result
  ├─→ Create ExecutionLog
  ├─→ Save to database
  │
  ↓
Response to Frontend
  │
  ├─→ HTTP 200 with result
  ├─→ React Query updates state
  ├─→ User sees success message
  │
  ↓
User sees execution results
  ├─→ Log entry appears
  ├─→ Timestamp updated
  ├─→ Status = "success" ✅
```

---

## Component Interaction Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                   FRONTEND COMPONENTS                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  App.tsx (Router)                                               │
│  │                                                              │
│  ├─→ LandingPage                                               │
│  │                                                              │
│  ├─→ AuthPages                                                 │
│  │   ├─→ LoginPage                                             │
│  │   ├─→ SignUpPage                                            │
│  │   └─→ ForgotPasswordPage                                    │
│  │                                                              │
│  └─→ DashboardLayout                                           │
│      ├─→ OverviewPage                 ←→ API: GET /workflows   │
│      ├─→ WorkflowsPage                ←→ API: GET /workflows   │
│      ├─→ CreateWorkflowPage           ←→ API: POST /workflows  │
│      ├─→ ExecutionLogsPage            ←→ API: GET /logs        │
│      ├─→ IntegrationsPage             ←→ API: GET /integrations│
│      ├─→ AnalyticsPage                ←→ API: GET /analytics   │
│      └─→ SettingsPage                 ←→ API: GET /settings    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                   BACKEND SERVICES                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  FastAPI App (main.py)                                         │
│  │                                                              │
│  ├─→ APIRouter (routes.py)                                     │
│  │   ├─→ Workflow CRUD endpoints                               │
│  │   ├─→ Execution endpoints                                   │
│  │   ├─→ File upload endpoints                                 │
│  │   └─→ Log retrieval endpoints                               │
│  │                                                              │
│  ├─→ WorkflowService                                           │
│  │   ├─→ activate_workflow()                                   │
│  │   ├─→ deactivate_workflow()                                 │
│  │   ├─→ execute_workflow()                                    │
│  │   └─→ Retry logic                                           │
│  │                                                              │
│  ├─→ AIService                                                 │
│  │   ├─→ parse_user_instruction()                              │
│  │   └─→ generate_workflow_code()                              │
│  │                                                              │
│  ├─→ WorkflowExecutor                                          │
│  │   ├─→ execute()                                             │
│  │   └─→ sanitize_code()                                       │
│  │                                                              │
│  ├─→ WorkflowScheduler                                         │
│  │   ├─→ schedule_cron_workflow()                              │
│  │   └─→ APScheduler integration                               │
│  │                                                              │
│  ├─→ EmailMonitor                                              │
│  │   ├─→ register_workflow()                                   │
│  │   └─→ IMAP email checking                                   │
│  │                                                              │
│  └─→ Integration Services                                      │
│      ├─→ GmailService                                          │
│      ├─→ GoogleDriveService                                    │
│      ├─→ GoogleSheetsService                                   │
│      ├─→ GitHubService                                         │
│      ├─→ MessagingService (Telegram, WhatsApp)                 │
│      └─→ WebService                                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE SCHEMA                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Workflows Table                                                │
│  ├─ id (Primary Key)                                            │
│  ├─ name (String)                                               │
│  ├─ description (Text)                                          │
│  ├─ user_instruction (Text)                                     │
│  ├─ trigger_type (String: cron, email, webhook, manual)         │
│  ├─ trigger_config (JSON)                                       │
│  ├─ actions (JSON)                                              │
│  ├─ workflow_code (Text)                                        │
│  ├─ is_active (Boolean)                                         │
│  ├─ execution_count (Integer)                                   │
│  ├─ success_count (Integer)                                     │
│  ├─ failure_count (Integer)                                     │
│  └─ timestamps (created_at, updated_at, last_executed)          │
│                                                                 │
│  ExecutionLogs Table                                            │
│  ├─ id (Primary Key)                                            │
│  ├─ workflow_id (Foreign Key → Workflows)                       │
│  ├─ status (String: success, failed, running)                   │
│  ├─ error_message (Text)                                        │
│  ├─ execution_time (Integer, milliseconds)                      │
│  ├─ input_data (JSON)                                           │
│  ├─ output_data (JSON)                                          │
│  └─ executed_at (Timestamp)                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Network Ports

```
┌──────────────────────────────────────────────────────┐
│            NETWORK PORTS & SERVICES                  │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Port 5173  ← Frontend Dev Server (Vite)            │
│             http://localhost:5173                   │
│             React, Webpack HMR, Hot reload          │
│                                                      │
│  Port 8000  ← Backend API Server (FastAPI)          │
│             http://localhost:8000                   │
│             OpenAPI Docs at /docs                   │
│                                                      │
│  Port 8080  ← Google OAuth (auto, temporary)        │
│             Used only for initial Google login      │
│             Automatically opened in browser         │
│                                                      │
│  File System ← SQLite Database                      │
│              automation.db                          │
│              In backend directory                   │
│                                                      │
│  External   ← Third-party APIs                      │
│              ├─ Gmail API (Google)                  │
│              ├─ Drive API (Google)                  │
│              ├─ Sheets API (Google)                 │
│              ├─ GitHub API                          │
│              ├─ Telegram API                        │
│              ├─ WhatsApp API                        │
│              └─ Various web services               │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## Deployment Architecture (Production)

```
┌────────────────────────────────────────────────────────────┐
│                   PRODUCTION SETUP                         │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Users                                                     │
│  │                                                         │
│  ├─→ www.myapp.com                                        │
│      ├─→ CloudFlare CDN (Optional)                        │
│      │                                                     │
│      ├─→ Vercel / Netlify (Frontend SPA)                  │
│      │   ├─ dist/ folder (built React)                    │
│      │   └─ Automatic deployment                          │
│      │                                                     │
│      └─→ api.myapp.com                                    │
│          ├─→ Heroku / Railway / Render (Backend)          │
│          │   ├─ gunicorn / uvicorn server                 │
│          │   ├─ PostgreSQL database                       │
│          │   ├─ Background job queue (optional)           │
│          │   └─ Cron scheduler                            │
│          │                                                 │
│          ├─→ Google Cloud (for OAuth)                     │
│          └─→ External APIs (Gmail, GitHub, etc.)          │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## File Structure Hierarchy

```
AI Automation System/
│
├── 📄 README.md                           ← Start here
├── 📄 INTEGRATION_SUMMARY.md              ← Overview
├── 📄 RUN_INSTRUCTIONS.md                 ← How to run
├── 📄 TESTING_CHECKLIST.md                ← Verification
├── 📄 QUICK_REFERENCE.md                  ← Quick start
├── 📄 FRONTEND_BACKEND_CONNECTION.md      ← Deep dive
│
├── 📁 frontend/                           ← React App
│   ├── 📄 package.json                    ← npm dependencies
│   ├── 📄 vite.config.ts                  ← Build config
│   ├── 📄 tsconfig.json                   ← TypeScript config
│   ├── 📄 tailwind.config.js              ← Styling
│   ├── 📄 index.html                      ← HTML template
│   │
│   └── 📁 src/
│       ├── 📄 main.tsx                    ← Entry point
│       ├── 📄 App.tsx                     ← Router & layout
│       ├── 📄 index.css                   ← Global styles
│       │
│       ├── 📁 pages/                      ← Route components
│       │   ├── LandingPage.tsx
│       │   ├── 📁 auth/
│       │   │   ├── LoginPage.tsx
│       │   │   ├── SignUpPage.tsx
│       │   │   └── ForgotPasswordPage.tsx
│       │   └── 📁 dashboard/
│       │       ├── OverviewPage.tsx
│       │       ├── WorkflowsPage.tsx
│       │       ├── CreateWorkflowPage.tsx
│       │       ├── ExecutionLogsPage.tsx
│       │       ├── IntegrationsPage.tsx
│       │       ├── AnalyticsPage.tsx
│       │       └── SettingsPage.tsx
│       │
│       ├── 📁 components/                 ← Reusable UI
│       │   ├── 📁 layout/
│       │   ├── 📁 ui/
│       │   ├── 📁 animations/
│       │   └── 📁 hero/
│       │
│       └── 📁 lib/                        ← Utilities
│           └── api-client.ts              ← API calls
│
├── 📁 ai-automation-backend/              ← FastAPI Server
│   ├── 📄 main.py                         ← Entry point
│   ├── 📄 requirements.txt                ← Python dependencies
│   │
│   ├── 📁 app/
│   │   │
│   │   ├── 📁 api/
│   │   │   ├── routes.py                  ← All endpoints
│   │   │   └── schemas.py                 ← Request/response models
│   │   │
│   │   ├── 📁 core/
│   │   │   ├── config.py                  ← Settings/env vars
│   │   │   ├── database.py                ← SQLAlchemy setup
│   │   │   ├── google_oauth.py            ← OAuth manager
│   │   │   ├── google_credentials.py      ← Credentials loader
│   │   │   └── google_setup.py            ← Setup utilities
│   │   │
│   │   ├── 📁 models/
│   │   │   ├── workflow.py                ← Workflow ORM model
│   │   │   └── execution_log.py           ← Log ORM model
│   │   │
│   │   ├── 📁 services/
│   │   │   ├── ai_service.py              ← OpenAI integration
│   │   │   └── workflow_service.py        ← Workflow orchestration
│   │   │
│   │   ├── 📁 integrations/
│   │   │   ├── gmail_service.py           ← Gmail API
│   │   │   ├── gmail_oauth.py             ← Gmail OAuth
│   │   │   ├── drive_service.py           ← Google Drive
│   │   │   ├── sheets_service.py          ← Google Sheets
│   │   │   ├── github_service.py          ← GitHub API
│   │   │   ├── messaging_service.py       ← Telegram/WhatsApp
│   │   │   └── web_service.py             ← Web scraping
│   │   │
│   │   ├── 📁 workflows/
│   │   │   ├── executor.py                ← Code execution
│   │   │   ├── scheduler.py               ← APScheduler
│   │   │   └── email_monitor.py           ← Email triggers
│   │   │
│   │   └── 📁 templates/
│   │       └── workflow_templates.py      ← Pre-built examples
│   │
│   ├── 📁 credentials/
│   │   ├── credentials.json               ← Google OAuth config
│   │   ├── token.pickle                   ← OAuth token (auto-created)
│   │   └── credentials_dict.json          ← Cached creds
│   │
│   ├── 📁 logs/
│   │   └── app.log                        ← Application logs
│   │
│   ├── 📁 uploads/
│   │   └── [user uploaded files]
│   │
│   └── automation.db                      ← SQLite database
│
└── 📁 .venv/                              ← Python virtual env
```

---

This diagram shows the complete structure and how all pieces connect! 🎨
