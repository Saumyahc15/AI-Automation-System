# Google Calendar Integration Guide

## Overview
The Google Calendar integration is now fully implemented in your AI Automation System. You can create calendar events in three ways:
1. **Natural Language Prompt**: Describe events in plain English (e.g., "Create team meeting on Jan 4 at 5 PM for 30 mins")
2. **Form Interface**: Fill out a structured form with event details
3. **Workflow Automation**: Include calendar events in your automated workflows

## Setup Complete ✅

Your Google Calendar integration includes:
- ✅ OAuth 2.0 credentials configured (credentials/token.pickle)
- ✅ Backend API endpoints for calendar operations
- ✅ Frontend UI with Calendar page
- ✅ AI-powered natural language parsing for events
- ✅ Full CRUD operations (Create, Read, Delete)

## How to Use

### Method 1: Natural Language Prompt (Recommended)
1. Navigate to **Calendar** in the sidebar
2. Click **Create Event** button
3. Select **📝 Natural Language** tab
4. Enter your event description:
   - ✅ "Create team meeting on January 4, 2026 at 5:00 PM for 30 minutes"
   - ✅ "Schedule dentist appointment tomorrow at 2 PM for 1 hour in room 305"
   - ✅ "Interview call with John on 2026-01-10 at 3:30 PM, 45 minutes"
5. Click **✨ Create from Prompt**

The AI will automatically:
- Extract event title
- Parse date and time
- Determine duration
- Create the event in your Google Calendar

### Method 2: Form Interface
1. Navigate to **Calendar** in the sidebar
2. Click **Create Event** button
3. Select **📋 Form** tab
4. Fill in the details:
   - **Event Title** (required): e.g., "Team Meeting"
   - **Start Date & Time** (required): e.g., 2026-01-04 17:00
   - **Duration**: Default 30 minutes, adjust as needed
   - **Location**: Optional (e.g., "Conference Room A")
   - **Description**: Optional event details
   - **Attendees**: Optional, comma-separated emails
5. Click **✨ Create Event**

### Method 3: Workflow Automation
Create a workflow with calendar event creation:
1. Go to **Create Workflow**
2. Provide prompt like:
   - "When I receive email with 'meeting' in subject, create calendar event"
   - "Every Monday at 9 AM, create recurring team standup"
3. The system will generate code that includes calendar event creation

## API Endpoints

### Create Event from Prompt
```bash
POST /calendar/create-from-prompt?user_id=1
Content-Type: application/json

{
  "prompt": "Create team meeting on January 4, 2026 at 5:00 PM for 30 minutes"
}
```

**Response:**
```json
{
  "status": "success",
  "event_id": "abc123xyz",
  "summary": "team meeting",
  "start": "2026-01-04T17:00:00",
  "end": "2026-01-04T17:30:00",
  "html_link": "https://calendar.google.com/...",
  "message": "Event 'team meeting' created successfully"
}
```

### Create Event from Form
```bash
POST /calendar/create-event?user_id=1
Content-Type: application/json

{
  "summary": "Team Meeting",
  "start_datetime": "2026-01-04T17:00:00",
  "duration_minutes": 30,
  "description": "Weekly team sync",
  "location": "Conference Room A",
  "attendees": ["john@example.com", "jane@example.com"],
  "timezone": "America/New_York"
}
```

### List Events
```bash
GET /calendar/events?user_id=1&max_results=10
```

**Response:**
```json
{
  "status": "success",
  "events": [
    {
      "id": "abc123",
      "summary": "Team Meeting",
      "start": "2026-01-04T17:00:00",
      "end": "2026-01-04T17:30:00",
      "location": "Conference Room A",
      "description": "Weekly sync",
      "html_link": "https://calendar.google.com/..."
    }
  ],
  "count": 1
}
```

### Delete Event
```bash
DELETE /calendar/events/{event_id}?user_id=1
```

## Testing Checklist

### Step 1: Verify Backend
```bash
# Check calendar service is working
cd ai-automation-backend
python -c "from app.integrations.calendar_service import GoogleCalendarService; 
svc = GoogleCalendarService(); 
print('✅ Service initialized' if svc.service else '❌ Service failed')"
```

### Step 2: Test Natural Language Creation
1. Go to `/app/calendar`
2. Create event with prompt: "Meeting tomorrow at 10 AM for 1 hour"
3. Should see success message
4. Check Google Calendar - event should appear

### Step 3: Test Form Creation
1. Fill out form manually with:
   - Title: "Test Event"
   - Start: Tomorrow at 2 PM
   - Duration: 45 minutes
   - Location: "Test Room"
2. Click create
3. Verify in Google Calendar

### Step 4: Test Listing Events
1. Create a few events
2. Navigate to Calendar page
3. Should see "Upcoming Events" section with your events
4. Each event should show:
   - Title
   - Date & Time
   - Location (if set)
   - Description (if set)
   - Google Calendar link

### Step 5: Test Deletion
1. Click trash icon on any event
2. Confirm deletion
3. Event should disappear from list
4. Verify in Google Calendar it's deleted

## Supported Date/Time Formats

The natural language parser supports:
- **Dates**: "January 4, 2026", "Jan 4", "tomorrow", "next Monday", "2026-01-04"
- **Times**: "5:00 PM", "17:00", "5 PM", "09:30 AM"
- **Durations**: "30 minutes", "1 hour", "45 mins", "2 hours"
- **Combined**: "meeting tomorrow at 3 PM for 1 hour"

## Troubleshooting

### "Calendar service not available" error
**Problem**: OAuth credentials not initialized
**Solution**:
1. Check `credentials/token.pickle` exists
2. Verify `credentials/credentials.json` has correct Google Project ID
3. Delete `token.pickle` and re-authenticate if needed

### Event not appearing in Google Calendar
**Problem**: Event created but not visible
**Solution**:
1. Refresh Google Calendar page
2. Check correct calendar is selected (should be "primary")
3. Verify event date/time is in correct timezone
4. Check in Calendar settings if calendar is hidden

### "Invalid datetime format" error
**Problem**: Date/time string format incorrect
**Solution**:
- Use ISO format: `YYYY-MM-DDTHH:MM:SS`
- Example: `2026-01-04T17:00:00`
- For form: Use datetime picker (handles format automatically)

### AI not parsing event details correctly
**Problem**: Summary, time, or duration extracted incorrectly
**Solution**:
1. Be more explicit in prompt:
   - ❌ "Meeting tomorrow"
   - ✅ "Create team meeting on January 4 at 5 PM for 30 minutes"
2. Use standard time format:
   - ❌ "five o'clock"
   - ✅ "5:00 PM" or "17:00"

## Integration with Workflows

You can now include calendar events in workflows:

**Example Workflow Prompt:**
```
"When I receive email from calendar-sync@company.com, extract meeting details 
and create calendar event for it, then send confirmation via Gmail"
```

The system will:
1. Trigger on incoming email
2. Parse email content
3. Extract meeting date/time/title
4. Create calendar event
5. Send confirmation

**Example Calendar Action in Workflow:**
```python
from app.integrations.calendar_service import GoogleCalendarService

calendar = GoogleCalendarService()
result = calendar.create_event(
    summary="Extracted Meeting Title",
    start_datetime="2026-01-04T17:00:00",
    duration_minutes=60,
    description="Auto-created from email",
)
```

## Features

✅ **Natural Language Processing**: Describe events in plain English
✅ **Timezone Support**: Automatically handles your timezone
✅ **Attendee Invitations**: Add multiple attendees to events
✅ **Event Details**: Full support for description, location, duration
✅ **Event Management**: View, update, delete events
✅ **Google Calendar Sync**: Changes appear instantly in Google Calendar
✅ **Workflow Integration**: Use calendar events in automated workflows
✅ **Error Handling**: Clear error messages and recovery options

## Next Steps

1. ✅ Test the calendar integration using the guide above
2. ✅ Create some test events using natural language prompts
3. ✅ Explore the form interface for detailed event creation
4. ✅ Create workflows that include calendar event creation
5. ✅ Add calendar events to your email automation workflows

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the backend logs: `ai-automation-backend/logs/`
3. Verify OAuth credentials are valid
4. Ensure Google Calendar API is enabled in your Google Cloud Project

---

**Your Google Calendar integration is ready to use!** 🎉
