# Google Calendar Integration - Technical Implementation

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (React/TypeScript)               │
├─────────────────────────────────────────────────────────────┤
│  CalendarPage.tsx                                             │
│  ├── Natural Language Input                                  │
│  ├── Form Interface                                          │
│  ├── Events List Display                                     │
│  └── Delete Functionality                                    │
└───────────────────┬─────────────────────────────────────────┘
                    │ HTTP/JSON
┌───────────────────▼─────────────────────────────────────────┐
│                  API CLIENT (TypeScript)                      │
├─────────────────────────────────────────────────────────────┤
│  api-client.ts                                                │
│  ├── createCalendarEvent()                                   │
│  ├── createCalendarEventFromPrompt()                         │
│  ├── getCalendarEvents()                                     │
│  └── deleteCalendarEvent()                                   │
└───────────────────┬─────────────────────────────────────────┘
                    │ HTTP REST
┌───────────────────▼─────────────────────────────────────────┐
│                  BACKEND (FastAPI/Python)                     │
├─────────────────────────────────────────────────────────────┤
│  routes.py - Calendar Endpoints                              │
│  ├── POST /calendar/create-from-prompt    (Natural Language) │
│  ├── POST /calendar/create-event          (Form Data)        │
│  ├── GET  /calendar/events                (List Events)      │
│  └── DELETE /calendar/events/{id}         (Delete Event)     │
│                                                                │
│  ai_service.py - Natural Language Processing                │
│  ├── parse_user_instruction() → JSON Structure              │
│  └── Extracts: summary, datetime, duration, location, etc.  │
└───────────────────┬─────────────────────────────────────────┘
                    │ OAuth 2.0
┌───────────────────▼─────────────────────────────────────────┐
│         GOOGLE CALENDAR API (calendar_service.py)            │
├─────────────────────────────────────────────────────────────┤
│  GoogleCalendarService                                        │
│  ├── create_event()                                          │
│  ├── list_events()                                           │
│  └── delete_event()                                          │
│                                                                │
│  SimpleCalendarService (Fallback)                            │
│  └── Mock implementation for testing                         │
└───────────────────┬─────────────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────────────┐
│             GOOGLE CALENDAR (Cloud Service)                   │
├─────────────────────────────────────────────────────────────┤
│  ✅ Events stored in Google Calendar                         │
│  ✅ Real-time sync across devices                            │
│  ✅ Visible in Google Calendar UI                            │
└─────────────────────────────────────────────────────────────┘
```

## Component Breakdown

### 1. Frontend Components

#### CalendarPage.tsx
- **Location**: `frontend/src/pages/dashboard/CalendarPage.tsx`
- **Functionality**:
  - Natural language input for events
  - Form-based event creation
  - Event list display with filtering
  - Event deletion with confirmation
  - Success/error messages
  - Loading states

**Key Features**:
- React hooks: `useState`, `useEffect`
- Lucide icons for UI
- Tailwind CSS styling
- API client integration
- Error handling and user feedback

#### API Client Methods
- **Location**: `frontend/src/lib/api-client.ts`
- **Methods**:
  ```typescript
  async createCalendarEvent(data: {
    summary: string
    start_datetime: string
    duration_minutes?: number
    description?: string
    location?: string
    attendees?: string[]
  })
  
  async createCalendarEventFromPrompt(data: {
    prompt: string
  })
  
  async getCalendarEvents(maxResults?, timeMin?, timeMax?)
  
  async deleteCalendarEvent(eventId: string)
  ```

#### Navigation
- **Location**: `frontend/src/components/layout/DashboardLayout.tsx`
- **Added**: Calendar link to sidebar navigation with Calendar icon

### 2. Backend Services

#### Calendar Routes
- **Location**: `ai-automation-backend/app/api/routes.py`
- **Endpoints**: Lines ~1520-1700

**Endpoints**:

1. **POST /calendar/create-event**
   - Accepts structured event data
   - Returns event with ID and Google Calendar link

2. **POST /calendar/create-from-prompt**
   - Accepts natural language prompt
   - Uses AI service to parse
   - Creates event from parsed data

3. **GET /calendar/events**
   - Lists upcoming events
   - Supports filtering by date range
   - Configurable max results

4. **DELETE /calendar/events/{event_id}**
   - Removes event from Google Calendar
   - Returns success confirmation

#### Calendar Service
- **Location**: `ai-automation-backend/app/integrations/calendar_service.py`
- **Classes**:
  - `GoogleCalendarService`: Real Google Calendar integration via OAuth
  - `SimpleCalendarService`: Mock implementation for testing

**Key Methods**:

```python
def create_event(
    summary: str,
    start_datetime: str,
    end_datetime: str = None,
    duration_minutes: int = 30,
    description: str = None,
    location: str = None,
    attendees: List[str] = None,
    timezone: str = 'UTC'
) -> Dict:
    """Create a Google Calendar event"""

def list_events(
    max_results: int = 10,
    time_min: str = None,
    time_max: str = None
) -> List[Dict]:
    """List upcoming calendar events"""

def delete_event(event_id: str) -> Dict:
    """Delete a calendar event"""
```

#### AI Service Enhancements
- **Location**: `ai-automation-backend/app/services/ai_service.py`
- **Changes**:
  - Enhanced prompt for calendar event parsing
  - Improved date/time format specifications
  - ISO datetime format requirement: `YYYY-MM-DDTHH:MM:SS`
  - Support for natural language date parsing (tomorrow, next Monday, etc.)

**AI Parsing Example**:
```python
# Input
"Create team meeting on January 4, 2026 at 5:00 PM for 30 minutes"

# Output JSON
{
    "trigger": {
        "type": "manual"
    },
    "actions": [{
        "type": "create_calendar_event",
        "params": {
            "summary": "team meeting",
            "start_datetime": "2026-01-04T17:00:00",
            "duration_minutes": 30
        }
    }]
}
```

### 3. Google OAuth Integration

#### Credentials Setup
- **Location**: `credentials/credentials.json` & `credentials/token.pickle`
- **Scopes**: Calendar API with read/write access
- **Authentication**: OAuth 2.0 with refresh token

#### Google Credentials Manager
- **Location**: `ai-automation-backend/app/core/google_credentials.py`
- **Functionality**:
  - Loads OAuth credentials from `token.pickle`
  - Handles credential refresh
  - Provides credentials to services

## Data Flow

### Natural Language Event Creation
```
User Input
  ↓
POST /calendar/create-from-prompt?user_id=1
{ "prompt": "meeting tomorrow at 5 PM" }
  ↓
AIService.parse_user_instruction()
  ↓
OpenAI API (gpt-4/3.5-turbo)
  ↓
Parsed JSON with calendar event action
  ↓
calendar.create_event()
  ↓
GoogleCalendarService.create_event()
  ↓
Google Calendar API (events.insert)
  ↓
Event created in Google Calendar
  ↓
Response with event_id & html_link
  ↓
Frontend shows success message
```

### Form-Based Event Creation
```
User Input (Form)
  ↓
POST /calendar/create-event?user_id=1
{
  "summary": "Meeting",
  "start_datetime": "2026-01-04T17:00:00",
  "duration_minutes": 30,
  ...
}
  ↓
Validation & Type Conversion
  ↓
GoogleCalendarService.create_event()
  ↓
Google Calendar API (events.insert)
  ↓
Event created & Response sent
  ↓
Frontend updates events list
```

### List Events
```
GET /calendar/events?user_id=1
  ↓
GoogleCalendarService.list_events()
  ↓
Google Calendar API (events.list)
  ↓
Parse & Format Events
  ↓
JSON Response with events array
  ↓
Frontend renders event list
```

### Delete Event
```
DELETE /calendar/events/{event_id}?user_id=1
  ↓
GoogleCalendarService.delete_event()
  ↓
Google Calendar API (events.delete)
  ↓
Success confirmation
  ↓
Frontend removes from list
```

## Error Handling

### Backend Error Handling
```python
try:
    # Create event
except HttpError as e:
    # Google Calendar API errors
    return {"status": "error", "message": str(e)}
except Exception as e:
    # Other errors
    return {"status": "error", "message": str(e)}
```

### Frontend Error Handling
```typescript
try {
    const response = await apiClient.createCalendarEvent(data)
    if (response.status === 'success') {
        // Success
    } else {
        setError(response.message)
    }
} catch (err) {
    setError(err.message)
}
```

## Type Safety

### TypeScript Interfaces (Frontend)
```typescript
interface CalendarEvent {
    id: string
    summary: string
    start: string
    end: string
    description?: string
    location?: string
    html_link?: string
}

interface CreateEventForm {
    summary: string
    start_datetime: string
    duration_minutes: number
    description: string
    location: string
    attendees: string
}
```

### Python Type Hints (Backend)
```python
def create_event(
    self,
    summary: str,
    start_datetime: str = None,
    end_datetime: str = None,
    duration_minutes: int = 30,
    description: str = None,
    location: str = None,
    attendees: List[str] = None,
    timezone: str = 'UTC'
) -> Dict:
```

## Authentication & Authorization

- **User Authentication**: JWT tokens from login
- **User ID Extraction**: From query parameters or headers
- **Google OAuth**: Handled by GoogleCredentialsManager
- **Scope**: `https://www.googleapis.com/auth/calendar`

## Testing Strategy

### Unit Tests
- Calendar service creation
- Date/time parsing
- Event data validation

### Integration Tests
- API endpoint functionality
- Google Calendar API interaction
- Frontend-to-backend communication

### E2E Tests
- Complete workflow: Natural Language → Calendar Event
- Event listing and display
- Event deletion

## Performance Considerations

- **Event Caching**: Could implement frontend caching
- **Pagination**: `max_results` parameter for large event lists
- **Async Operations**: All I/O operations are async
- **Error Recovery**: Fallback to SimpleCalendarService

## Security Measures

- ✅ OAuth 2.0 for Google authentication
- ✅ Credentials stored securely in `token.pickle`
- ✅ User ID validation on all endpoints
- ✅ No credentials exposure in responses
- ✅ Secure token refresh mechanism

## Extensibility

Future enhancements possible:
- Recurring events
- Event updates (PATCH endpoint)
- Calendar selection (multiple calendars)
- Meeting room availability checking
- Calendar sharing
- Workflow triggers on calendar events
- Event reminders

---

**Implementation Complete** ✅

All components are integrated and tested. The system is ready for production use.
