# Google Calendar Integration - Quick Start

## ⚡ What's Integrated

Your AI Automation System now has complete Google Calendar integration:

✅ **Natural Language Prompts** - "Create meeting on Jan 4 at 5 PM for 30 mins"
✅ **Form Interface** - Detailed event creation with all fields
✅ **Calendar Events List** - View all upcoming events
✅ **Event Deletion** - Remove events with one click
✅ **Workflow Automation** - Include calendar events in automated workflows
✅ **OAuth 2.0 Secure** - Credentials safely stored and authenticated

## 🚀 Quick Test (2 minutes)

1. Start your backend:
   ```bash
   cd ai-automation-backend
   python main.py
   ```

2. Start your frontend:
   ```bash
   cd frontend
   npm run dev
   ```

3. Login to the app and navigate to **Calendar** tab

4. Click **Create Event** and try:
   - **Natural Language**: "Schedule team meeting tomorrow at 3 PM for 1 hour"
   - Or use the **Form** tab for manual entry

5. Check Google Calendar - your event should appear instantly! 

## 📍 Where Everything Is

- **Backend Calendar Endpoints**: `ai-automation-backend/app/api/routes.py` (lines ~1520-1700)
- **Calendar Service**: `ai-automation-backend/app/integrations/calendar_service.py`
- **Frontend Component**: `frontend/src/pages/dashboard/CalendarPage.tsx`
- **API Client Methods**: `frontend/src/lib/api-client.ts`
- **Navigation**: Added to sidebar in `frontend/src/components/layout/DashboardLayout.tsx`
- **Google Credentials**: `ai-automation-backend/credentials/token.pickle` (already configured)

## 🎯 Three Ways to Create Events

### 1. Natural Language (Easiest)
Just describe your event:
- "Create dentist appointment on Friday at 2 PM for 1 hour"
- "Team standup tomorrow at 9 AM for 15 mins in room 305"
- "Interview call with Sarah on Jan 15 at 3:30 PM"

### 2. Form Interface (Detailed)
Fill in step-by-step:
- Event Title
- Date & Time (datetime picker)
- Duration (minutes)
- Location
- Description
- Attendees

### 3. Workflow Automation
Create workflows that automatically create calendar events:
```python
from app.integrations.calendar_service import GoogleCalendarService

calendar = GoogleCalendarService()
calendar.create_event(
    summary="Auto Meeting",
    start_datetime="2026-01-04T17:00:00",
    duration_minutes=30,
    location="Room 5"
)
```

## 🔧 API Endpoints (Backend)

```bash
# Create event from natural language
POST /calendar/create-from-prompt?user_id=1
{ "prompt": "meeting tomorrow at 5 PM" }

# Create event from form data
POST /calendar/create-event?user_id=1
{ 
  "summary": "Meeting",
  "start_datetime": "2026-01-04T17:00:00",
  "duration_minutes": 30,
  "location": "Room A"
}

# List upcoming events
GET /calendar/events?user_id=1&max_results=10

# Delete an event
DELETE /calendar/events/{event_id}?user_id=1
```

## ✨ Features Included

- ✅ Full CRUD (Create, Read, Delete)
- ✅ Event visibility in Google Calendar
- ✅ Support for 12 timezones
- ✅ Attendee email invitations
- ✅ Event descriptions and locations
- ✅ Duration in minutes
- ✅ AI-powered natural language parsing
- ✅ Error handling and validation
- ✅ Real-time sync with Google Calendar

## 🐛 Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| "Calendar service not available" | Check `credentials/token.pickle` exists |
| Event not appearing | Refresh Google Calendar page |
| Wrong date/time | Use format YYYY-MM-DDTHH:MM:SS |
| AI parse error | Be more specific in description |

## 📋 File Changes Summary

### Backend Changes:
- ✅ Added 4 new calendar endpoints to `routes.py`
- ✅ Enhanced AI prompts in `ai_service.py` for better date/time parsing
- ✅ Calendar service already existed and working

### Frontend Changes:
- ✅ Created new `CalendarPage.tsx` component
- ✅ Added calendar API methods to `api-client.ts`
- ✅ Added Calendar to routing in `App.tsx`
- ✅ Added Calendar to navigation in `DashboardLayout.tsx`

## 🎓 Test Scenarios

Try these to verify everything works:

1. **Simple Event**: "Meeting at 5 PM today"
2. **With Duration**: "Lunch with team on Jan 5 at 12:30 PM for 1 hour"
3. **With Location**: "Doctor appointment on Friday 2 PM in clinic B"
4. **With Attendees**: "Create event and invite john@example.com"
5. **Tomorrow**: "Schedule tomorrow 10 AM for 30 mins"
6. **Next Week**: "Meeting next Monday 9 AM for 2 hours"

All of these should work with natural language parsing!

## 📖 Full Documentation

See `GOOGLE_CALENDAR_INTEGRATION_GUIDE.md` for:
- Detailed setup instructions
- Complete API documentation
- Troubleshooting guide
- Workflow integration examples
- All supported date/time formats

---

**You're all set! Your Google Calendar integration is live and ready to use.** 🎉
