import pickle
import os
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from datetime import datetime, timedelta
import logging
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

class GoogleCalendarService:
    """
    Google Calendar Integration
    """
    
    def __init__(self):
        self.creds = None
        self.service = None
        self._authenticate()
    
    def _authenticate(self):
        """
        Authenticate with Google Calendar using existing OAuth credentials
        """
        try:
            token_path = 'credentials/token.pickle'
            
            if os.path.exists(token_path):
                with open(token_path, 'rb') as token:
                    self.creds = pickle.load(token)
            
            if not self.creds or not self.creds.valid:
                if self.creds and self.creds.expired and self.creds.refresh_token:
                    self.creds.refresh(Request())
                else:
                    logger.error("No valid credentials for Google Calendar. Run OAuth setup first.")
                    return
            
            # Build the Calendar service
            self.service = build('calendar', 'v3', credentials=self.creds)
            logger.info("Google Calendar authenticated successfully")
            
        except Exception as e:
            logger.error(f"Failed to authenticate Google Calendar: {str(e)}")
    
    def list_calendars(self) -> List[Dict]:
        """
        List all calendars for the user
        """
        try:
            if not self.service:
                return []
            
            calendars_result = self.service.calendarList().list().execute()
            calendars = calendars_result.get('items', [])
            
            calendar_list = []
            for calendar in calendars:
                calendar_list.append({
                    'id': calendar['id'],
                    'name': calendar.get('summary', 'Unnamed Calendar'),
                    'primary': calendar.get('primary', False),
                    'timezone': calendar.get('timeZone', 'UTC')
                })
            
            logger.info(f"Found {len(calendar_list)} calendars")
            return calendar_list
            
        except Exception as e:
            logger.error(f"Failed to list calendars: {str(e)}")
            return []
    
    def create_event(
        self,
        title: str,
        start_time: str,
        end_time: str = None,
        description: str = "",
        location: str = "",
        attendees: List[str] = None,
        calendar_id: str = 'primary'
    ) -> Dict:
        """
        Create a calendar event
        
        Args:
            title: Event title
            start_time: Start time (ISO format: 2024-12-27T10:00:00 or 2024-12-27)
            end_time: End time (ISO format, optional)
            description: Event description
            location: Event location
            attendees: List of email addresses
            calendar_id: Calendar ID (default: 'primary')
        """
        try:
            if not self.service:
                return {"status": "error", "message": "Not authenticated"}
            
            # Parse datetime
            is_all_day = len(start_time) == 10  # Date only (YYYY-MM-DD)
            
            event_body = {
                'summary': title,
                'description': description,
                'location': location,
            }
            
            if is_all_day:
                # All-day event
                event_body['start'] = {'date': start_time}
                if end_time:
                    event_body['end'] = {'date': end_time}
                else:
                    # Default to same day
                    event_body['end'] = {'date': start_time}
            else:
                # Timed event
                event_body['start'] = {
                    'dateTime': start_time,
                    'timeZone': 'UTC',
                }
                if end_time:
                    event_body['end'] = {
                        'dateTime': end_time,
                        'timeZone': 'UTC',
                    }
                else:
                    # Default to 1 hour later
                    start_dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
                    end_dt = start_dt + timedelta(hours=1)
                    event_body['end'] = {
                        'dateTime': end_dt.isoformat(),
                        'timeZone': 'UTC',
                    }
            
            # Add attendees if provided
            if attendees:
                event_body['attendees'] = [{'email': email} for email in attendees]
            
            # Create the event
            event = self.service.events().insert(
                calendarId=calendar_id,
                body=event_body
            ).execute()
            
            logger.info(f"Created event: {title}")
            
            return {
                "status": "success",
                "message": f"Event '{title}' created successfully",
                "event_id": event['id'],
                "event_link": event.get('htmlLink', ''),
                "start": event['start'],
                "end": event['end']
            }
            
        except Exception as e:
            logger.error(f"Failed to create event: {str(e)}")
            return {"status": "error", "message": str(e)}
    
    def list_upcoming_events(
        self,
        max_results: int = 10,
        calendar_id: str = 'primary',
        days_ahead: int = 7
    ) -> List[Dict]:
        """
        List upcoming events
        
        Args:
            max_results: Maximum number of events to return
            calendar_id: Calendar ID
            days_ahead: Number of days to look ahead
        """
        try:
            if not self.service:
                return []
            
            # Get current time and time range
            now = datetime.utcnow()
            time_min = now.isoformat() + 'Z'
            time_max = (now + timedelta(days=days_ahead)).isoformat() + 'Z'
            
            events_result = self.service.events().list(
                calendarId=calendar_id,
                timeMin=time_min,
                timeMax=time_max,
                maxResults=max_results,
                singleEvents=True,
                orderBy='startTime'
            ).execute()
            
            events = events_result.get('items', [])
            
            event_list = []
            for event in events:
                start = event['start'].get('dateTime', event['start'].get('date'))
                end = event['end'].get('dateTime', event['end'].get('date'))
                
                event_list.append({
                    'id': event['id'],
                    'title': event.get('summary', 'No Title'),
                    'description': event.get('description', ''),
                    'location': event.get('location', ''),
                    'start': start,
                    'end': end,
                    'link': event.get('htmlLink', ''),
                    'attendees': [a.get('email') for a in event.get('attendees', [])]
                })
            
            logger.info(f"Found {len(event_list)} upcoming events")
            return event_list
            
        except Exception as e:
            logger.error(f"Failed to list events: {str(e)}")
            return []
    
    def get_event(self, event_id: str, calendar_id: str = 'primary') -> Optional[Dict]:
        """
        Get a specific event by ID
        """
        try:
            if not self.service:
                return None
            
            event = self.service.events().get(
                calendarId=calendar_id,
                eventId=event_id
            ).execute()
            
            return {
                'id': event['id'],
                'title': event.get('summary', 'No Title'),
                'description': event.get('description', ''),
                'location': event.get('location', ''),
                'start': event['start'].get('dateTime', event['start'].get('date')),
                'end': event['end'].get('dateTime', event['end'].get('date')),
                'link': event.get('htmlLink', '')
            }
            
        except Exception as e:
            logger.error(f"Failed to get event: {str(e)}")
            return None
    
    def update_event(
        self,
        event_id: str,
        title: str = None,
        start_time: str = None,
        end_time: str = None,
        description: str = None,
        location: str = None,
        calendar_id: str = 'primary'
    ) -> Dict:
        """
        Update an existing event
        """
        try:
            if not self.service:
                return {"status": "error", "message": "Not authenticated"}
            
            # Get existing event
            event = self.service.events().get(
                calendarId=calendar_id,
                eventId=event_id
            ).execute()
            
            # Update fields if provided
            if title:
                event['summary'] = title
            if description:
                event['description'] = description
            if location:
                event['location'] = location
            if start_time:
                if len(start_time) == 10:
                    event['start'] = {'date': start_time}
                else:
                    event['start'] = {'dateTime': start_time, 'timeZone': 'UTC'}
            if end_time:
                if len(end_time) == 10:
                    event['end'] = {'date': end_time}
                else:
                    event['end'] = {'dateTime': end_time, 'timeZone': 'UTC'}
            
            # Update the event
            updated_event = self.service.events().update(
                calendarId=calendar_id,
                eventId=event_id,
                body=event
            ).execute()
            
            logger.info(f"Updated event: {event_id}")
            
            return {
                "status": "success",
                "message": "Event updated successfully",
                "event_id": updated_event['id'],
                "event_link": updated_event.get('htmlLink', '')
            }
            
        except Exception as e:
            logger.error(f"Failed to update event: {str(e)}")
            return {"status": "error", "message": str(e)}
    
    def delete_event(self, event_id: str, calendar_id: str = 'primary') -> Dict:
        """
        Delete an event
        """
        try:
            if not self.service:
                return {"status": "error", "message": "Not authenticated"}
            
            self.service.events().delete(
                calendarId=calendar_id,
                eventId=event_id
            ).execute()
            
            logger.info(f"Deleted event: {event_id}")
            
            return {
                "status": "success",
                "message": "Event deleted successfully"
            }
            
        except Exception as e:
            logger.error(f"Failed to delete event: {str(e)}")
            return {"status": "error", "message": str(e)}
    
    def search_events(
        self,
        query: str,
        max_results: int = 10,
        calendar_id: str = 'primary'
    ) -> List[Dict]:
        """
        Search for events by keyword
        """
        try:
            if not self.service:
                return []
            
            now = datetime.utcnow().isoformat() + 'Z'
            
            events_result = self.service.events().list(
                calendarId=calendar_id,
                q=query,
                timeMin=now,
                maxResults=max_results,
                singleEvents=True,
                orderBy='startTime'
            ).execute()
            
            events = events_result.get('items', [])
            
            event_list = []
            for event in events:
                event_list.append({
                    'id': event['id'],
                    'title': event.get('summary', 'No Title'),
                    'start': event['start'].get('dateTime', event['start'].get('date')),
                    'link': event.get('htmlLink', '')
                })
            
            logger.info(f"Found {len(event_list)} events matching '{query}'")
            return event_list
            
        except Exception as e:
            logger.error(f"Failed to search events: {str(e)}")
            return []
    
    def create_quick_event(self, text: str, calendar_id: str = 'primary') -> Dict:
        """
        Create event using quick add (natural language)
        Example: "Meeting with John tomorrow at 3pm"
        """
        try:
            if not self.service:
                return {"status": "error", "message": "Not authenticated"}
            
            event = self.service.events().quickAdd(
                calendarId=calendar_id,
                text=text
            ).execute()
            
            logger.info(f"Created quick event: {text}")
            
            return {
                "status": "success",
                "message": "Event created successfully",
                "event_id": event['id'],
                "event_link": event.get('htmlLink', ''),
                "title": event.get('summary', '')
            }
            
        except Exception as e:
            logger.error(f"Failed to create quick event: {str(e)}")
            return {"status": "error", "message": str(e)}