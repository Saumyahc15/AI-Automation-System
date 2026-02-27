# 🚀 Google Calendar Integration - GET STARTED NOW

## 📌 3-Minute Setup Guide

Follow these steps to use Google Calendar integration right now:

### Step 1: Start Backend (1 minute)
```bash
cd ai-automation-backend
python main.py
```
Wait for message: "Uvicorn running on http://0.0.0.0:8000"

### Step 2: Start Frontend (30 seconds)
```bash
# In a new terminal
cd frontend
npm run dev
```
Wait for message about local server running

### Step 3: Access Calendar (30 seconds)
1. Open http://localhost:5173/app
2. Log in (if needed)
3. Click **Calendar** in sidebar

---

## 📝 Create Your First Event (60 seconds)

### Option A: Natural Language (EASIEST)
1. Click **Create Event** button
2. Keep **📝 Natural Language** selected
3. Type your event:
   ```
   Schedule team meeting tomorrow at 3:00 PM for 1 hour in conference room
   ```
4. Click **✨ Create from Prompt**
5. ✅ Event created! Check Google Calendar

### Option B: Form Interface
1. Click **Create Event** button
2. Switch to **📋 Form** tab
3. Fill in:
   - Title: "Team Meeting"
   - Date & Time: Tomorrow at 3:00 PM
   - Duration: 60 minutes
   - Location: "Conference Room"
4. Click **✨ Create Event**
5. ✅ Event created! Check Google Calendar

---

## 🔥 Quick Test Examples

Try these prompts to test:

```
1. "Meeting tomorrow at 10 AM"
2. "Dentist appointment Friday 2:30 PM for 45 minutes"
3. "Team standup Monday 9 AM for 15 mins in room 305"
4. "Interview call with Sarah on January 15 at 3 PM"
5. "Lunch meeting Jan 4 at 12 PM for 1 hour"
```

---

## ✨ Features You Can Use

### ✅ Create Events
- Natural language: "meeting at 5 PM tomorrow"
- Form: Click all fields and submit
- Workflow: Include in automations

### ✅ View Events
- See all upcoming events
- Shows date, time, location
- Click Google Calendar link

### ✅ Delete Events
- Click trash icon on any event
- Confirm deletion
- Event removed

### ✅ Details Included
- Event title
- Date and time
- Duration (default 30 min)
- Location (optional)
- Description (optional)
- Attendees (optional)

---

## 🎯 Common Prompts That Work

Copy and paste these:

### Simple Events
```
1. "Meeting tomorrow at 10 AM"
2. "Coffee at 2 PM"
3. "Lunch Friday"
```

### Detailed Events
```
1. "Team standup Monday 9 AM for 15 minutes in room 305"
2. "Dentist appointment Friday 2:30 PM for 1 hour"
3. "Interview with John on Jan 15 at 3:00 PM for 45 minutes"
```

### Complex Events
```
1. "Company offsite June 15, 2026 at 10 AM for 3 hours at the hotel"
2. "Conference call tomorrow 2 PM with IT team and invites Sarah and Bob"
3. "Project review meeting on Jan 8 at 4:30 PM for 90 mins in board room"
```

---

## 🐛 If Something Doesn't Work

### Backend Issues
```bash
# Check if backend is running
curl http://localhost:8000/

# Check logs
tail -f ai-automation-backend/logs/*.log

# If not starting, check port 8000 is free
```

### Frontend Issues
```bash
# Clear cache and restart
rm -rf frontend/node_modules
npm install
npm run dev
```

### Calendar Not Appearing
1. Refresh Google Calendar page
2. Check event was created (look in "Upcoming Events" section)
3. Verify date/time format was parsed correctly

### Event Not Created
1. Check error message in red box
2. Read error carefully
3. Try more specific prompt
4. Check network tab in DevTools

---

## 📱 What You'll See

### Calendar Page Layout
```
┌─────────────────────────────────────┐
│ Create Event Button                 │ (Top right)
├─────────────────────────────────────┤
│                                     │
│  [If Creating]                      │
│  Natural Language / Form Toggle     │
│  Input box or form fields           │
│  Create Button                      │
│                                     │
├─────────────────────────────────────┤
│ Upcoming Events                     │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Event Title                     │ │
│ │ 🕐 Date & Time                  │ │
│ │ 📍 Location (if set)            │ │
│ │ ... [View in Google Calendar]   │ │
│ │                    [Delete ✕]    │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [More events...]                    │
│                                     │
└─────────────────────────────────────┘
```

---

## 🔗 API Endpoints (For Developers)

### Create Event from Prompt
```bash
curl -X POST http://localhost:8000/calendar/create-from-prompt?user_id=1 \
  -H "Content-Type: application/json" \
  -d '{"prompt":"meeting tomorrow at 5 PM"}'
```

### Create Event from Form
```bash
curl -X POST http://localhost:8000/calendar/create-event?user_id=1 \
  -H "Content-Type: application/json" \
  -d '{
    "summary": "Team Meeting",
    "start_datetime": "2026-01-04T17:00:00",
    "duration_minutes": 30,
    "location": "Room A"
  }'
```

### List Events
```bash
curl http://localhost:8000/calendar/events?user_id=1&max_results=10
```

### Delete Event
```bash
curl -X DELETE http://localhost:8000/calendar/events/{event_id}?user_id=1
```

---

## 📖 Next: Read Documentation

After testing, read these docs:

1. **[CALENDAR_QUICK_START.md](CALENDAR_QUICK_START.md)**
   - 2-minute reference
   - Common issues

2. **[GOOGLE_CALENDAR_INTEGRATION_GUIDE.md](GOOGLE_CALENDAR_INTEGRATION_GUIDE.md)**
   - Complete guide
   - All features explained
   - Troubleshooting

3. **[CALENDAR_DOCS_INDEX.md](CALENDAR_DOCS_INDEX.md)**
   - Navigation for all docs
   - Task-based lookup

---

## ✅ Success Criteria

When you've successfully integrated:
- ✅ Calendar page loads
- ✅ Can type event prompt
- ✅ Can click Create
- ✅ See success message
- ✅ Event appears in upcoming events
- ✅ Event visible in Google Calendar

---

## 🎓 What to Try Next

### Basic Testing
1. Create 5 different events
2. Try different date formats
3. Add location and description
4. Delete an event

### Advanced Testing
1. Try very long event names
2. Try special characters
3. Try future dates (2030+)
4. Try multiple attendees

### Real Usage
1. Sync with your calendar
2. Create actual meetings
3. Use in workflows
4. Integrate with email automation

---

## 💡 Pro Tips

1. **Be Specific**: "meeting tomorrow" works, but "team standup tomorrow 9 AM for 15 mins" is better
2. **Use Timeformat**: "5:00 PM" works better than "five o'clock"
3. **Location Helps**: Include location for meeting room bookings
4. **Attendees**: Email addresses let you send invites
5. **Check Google Calendar**: Events sync instantly, so check there

---

## 🚨 Common Issues & Quick Fixes

| Issue | Quick Fix |
|-------|-----------|
| "Calendar service not available" | Restart backend |
| Event not appearing | Refresh Google Calendar |
| Wrong date parsed | Be more explicit (e.g., "January 4, 2026" not just "Jan 4") |
| Datetime format error | Use form picker instead of typing |
| Can't find Calendar tab | Refresh page or check browser cache |

---

## 📞 Need Help?

1. **Check**: [GOOGLE_CALENDAR_INTEGRATION_GUIDE.md](GOOGLE_CALENDAR_INTEGRATION_GUIDE.md#troubleshooting)
2. **Read**: Backend logs in `ai-automation-backend/logs/`
3. **Review**: Browser console (F12) for frontend errors
4. **Search**: Documentation files for your error message

---

## 🎉 You're Ready!

Everything is set up and working. Start with the 3-minute guide above and you'll be creating calendar events in seconds!

---

**Time to create your first event: < 5 minutes** ⏱️

Let's go! 🚀
