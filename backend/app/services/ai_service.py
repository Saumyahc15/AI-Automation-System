from openai import OpenAI
from app.core.config import get_settings
from datetime import datetime
import json
import logging

settings = get_settings()
client = OpenAI(api_key=settings.OPENAI_API_KEY)
logger = logging.getLogger(__name__)

class AIService:
    
    @staticmethod
    async def parse_user_instruction(instruction: str) -> dict:
        """
        Parse natural language instruction and extract workflow components
        """
        
        prompt = f"""
You are an AI automation expert. Parse the following user instruction and extract:
1. Trigger type (email_received, cron_schedule, file_uploaded, webhook, manual)
2. Trigger conditions (if any)
3. List of actions to perform
4. Any specific parameters or configurations

User instruction: "{instruction}"

Respond ONLY with a valid JSON object in this exact format:
{{
    "trigger": {{
        "type": "email_received|cron_schedule|file_uploaded|webhook|manual",
        "config": {{}}
    }},
    "conditions": [],
    "actions": [
        {{
            "type": "action_name",
            "params": {{}}
        }}
    ],
    "workflow_name": "Brief descriptive name",
    "description": "What this workflow does"
}}

Examples:
- "Email with subject 'Invoice' → Save attachment to Drive" = email trigger + save action
- "Every day at 9 AM send me GitHub trends" = cron trigger (config: {{"cron_expression": "0 9 * * *"}}) + fetch + send actions
- "When file uploaded, resize it" = file trigger + resize action
- "Send me a Telegram message every morning" = cron trigger + telegram action
- "Make an event called team meeting on 4 january, 2026 at 5:00PM for 30 mins" = manual trigger + create_calendar_event action (params: {{"summary": "team meeting", "start_datetime": "2026-01-04T17:00:00", "duration_minutes": 30}})
- "Create event called interview at 2pm tomorrow for 1 hour" = manual trigger + create_calendar_event action

For cron schedules:
- "Every day at 9 AM" = "0 9 * * *"
- "Every day at 8 AM" = "0 8 * * *"
- "Every hour" = "0 * * * *"
- "Every Monday at 10 AM" = "0 10 * * 1"
- "Every 5 minutes" = "*/5 * * * *"

Action types include:
- send_email, fetch_github_trends, send_telegram, send_whatsapp, save_to_drive, resize_image, scrape_web, api_call, create_calendar_event

IMPORTANT FOR CALENDAR EVENTS:
- Extract event title/summary (e.g., "team meeting", "interview call", "dentist appointment")
- Extract date: Convert to ISO format YYYY-MM-DD, then combine with time to make ISO datetime
- Extract time: Convert to 24-hour format HH:MM, then combine with date to make ISO datetime  
- Final datetime format MUST be: "YYYY-MM-DDTHH:MM:SS" (e.g., "2026-01-04T17:00:00")
- Extract duration in minutes (default 30 if not specified)
- Extract location if mentioned
- Extract description if available

CALENDAR EVENT PARAM FORMAT (REQUIRED):
{{
    "type": "create_calendar_event",
    "params": {{
        "summary": "Event Title",
        "start_datetime": "2026-01-04T17:00:00",
        "duration_minutes": 30,
        "description": "optional description",
        "location": "optional location",
        "attendees": ["optional@email.com"]
    }}
}}
"""
        
        try:
            response = client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": "You are a workflow automation expert. Always respond with valid JSON only. When extracting dates/times for calendar events, ALWAYS produce ISO format datetimes like '2026-01-04T17:00:00'."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3
            )
            
            result = response.choices[0].message.content
            
            # Clean and parse JSON
            result = result.strip()
            if result.startswith("```json"):
                result = result[7:]
            if result.startswith("```"):
                result = result[3:]
            if result.endswith("```"):
                result = result[:-3]
            result = result.strip()
            
            parsed = json.loads(result)
            logger.info(f"Successfully parsed instruction: {parsed.get('workflow_name')}")
            return parsed
            
        except Exception as e:
            logger.error(f"Failed to parse instruction: {str(e)}")
            raise Exception(f"AI parsing failed: {str(e)}")
    
    @staticmethod
    async def generate_workflow_code_with_integrations(workflow_structure: dict) -> str:
        """
        Generate executable Python code with actual integration imports
        """
        
        # Detect which integrations are needed
        actions = workflow_structure.get("actions", [])
        integrations_needed = set()
        has_conditionals = False
        
        for action in actions:
            action_type = action.get("type", "").lower()
            description = action.get("description", "").lower()
            
            # Check for conditional logic keywords
            if any(keyword in description for keyword in ["if ", "when ", "unless ", "only if", "check if", "verify", "condition"]):
                has_conditionals = True
            
            if "email" in action_type or "gmail" in action_type or "mail" in action_type:
                integrations_needed.add("email")
            elif "drive" in action_type or "upload" in action_type or "save" in action_type or "download" in action_type:
                integrations_needed.add("drive")
            elif "sheets" in action_type or "spreadsheet" in action_type or "sheet" in action_type or "csv" in action_type:
                integrations_needed.add("sheets")
            elif "telegram" in action_type:
                integrations_needed.add("telegram")
            elif "whatsapp" in action_type:
                integrations_needed.add("whatsapp")
            elif "slack" in action_type:
                integrations_needed.add("slack")
            elif "github" in action_type:
                integrations_needed.add("github")
            elif "calendar" in action_type or "event" in action_type or "meeting" in action_type or "schedule" in action_type:
                integrations_needed.add("calendar")
            elif "scrape" in action_type or "fetch" in action_type or "web" in action_type or "trends" in action_type:
                integrations_needed.add("web")
        
        imports = []
        if "email" in integrations_needed:
            imports.append("from app.integrations.gmail_service import SimpleEmailService")
        if "github" in integrations_needed:
            imports.append("from app.integrations.github_service import GitHubService")
        if "drive" in integrations_needed:
            imports.append("from app.integrations.drive_service import SimpleDriveService, GoogleDriveService")
        if "sheets" in integrations_needed:
            imports.append("from app.integrations.sheets_service import GoogleSheetsService, SimpleGoogleSheetsService")
        if "telegram" in integrations_needed or "whatsapp" in integrations_needed:
            imports.append("from app.integrations.messaging_service import MessagingService")
        if "slack" in integrations_needed:
            imports.append("from app.integrations.slack_service import SlackService")
        if "calendar" in integrations_needed:
            imports.append("from app.integrations.calendar_service import GoogleCalendarService, SimpleCalendarService")
        if "web" in integrations_needed:
            imports.append("from app.integrations.web_service import WebService")
        
        # ALWAYS include these core imports
        imports.append("import logging")
        imports.append("from datetime import datetime")
        
        imports_str = "\n".join(imports)
        
        # Create detailed action descriptions
        action_details = []
        for i, action in enumerate(actions, 1):
            action_type = action.get("type", "unknown")
            params = action.get("params", {})
            action_details.append(f"Action {i}: {action_type} with params {params}")
        
        actions_str = "\n".join(action_details)
        
        # Use raw string to avoid escaping issues with curly braces
        prompt = """You are generating Python code for a workflow automation system.

WORKFLOW TO IMPLEMENT:
""" + json.dumps(workflow_structure, indent=2) + """

ACTIONS:
""" + actions_str + """

CRITICAL REQUIREMENTS:

1. ALWAYS USE THESE EXACT IMPORTS (copy them exactly):
""" + imports_str + """

2. FUNCTION SIGNATURE - MUST be exactly:
async def execute_workflow():

3. RETURN VALUE - MUST be a dict:
{
    "status": "success" or "error",
    "message": "description",
    "data": {} or None
}

4. ALWAYS wrap everything in try-except

5. INTEGRATION METHODS (NO await needed):
   - SimpleEmailService.send_simple_email(to, subject, body)
   - GitHubService().get_trending_repos(language=None, since="daily") - Instantiate first! FOR TRENDING REPOS (NOT search_repositories!)
   - GitHubService().search_repositories(query, limit=10) - Instantiate first! For searching specific repositories
   - GitHubService().get_user_repos(username, limit=10)
   - GitHubService().get_repo_commits(owner, repo, limit=10)
   - GitHubService().get_repo_issues(owner, repo, state="open", limit=10)
   - GitHubService().create_issue(owner, repo, title, body="", labels=None)
   - WebService.scrape_github_trends()
   - MessagingService.send_telegram_message(message="your message")
   - MessagingService.send_whatsapp_message(phone_number="919876543210", message="your message")
   - SlackService(bot_token).send_message(channel, text)
   - SlackService(bot_token).send_alert(channel, title, text)
   - SlackService(bot_token).send_success(channel, title, text)
   - SimpleDriveService.save_file_locally(file_path, destination_folder)
   - GoogleSheetsService().create_spreadsheet(title) -> returns {spreadsheet_id, web_link}
   - GoogleSheetsService().append_data(spreadsheet_id, range_name, values)
   - GoogleSheetsService().read_range(spreadsheet_id, range_name)
   - SimpleGoogleSheetsService.write_to_csv(data, file_name)
   - SimpleGoogleSheetsService.log_data(data, log_name)
   - GoogleCalendarService().create_event(summary="Event Title", start_datetime="2026-01-04T17:00:00", duration_minutes=30, description="Event description", location="Location", attendees=["email@example.com"])
   - SimpleCalendarService.create_event(summary="Event Title", start_datetime="2026-01-04T17:00:00", duration_minutes=30)
   - IMPORTANT: Always check if calendar_service.service is not None before calling create_event, and handle errors properly

COMPLETE WORKING EXAMPLES:

EXAMPLE 1 - GitHub Trends Fetch:
```python
from app.integrations.web_service import WebService
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

async def execute_workflow():
    try:
        logger.info("Fetching GitHub trends")
        
        trends = WebService.scrape_github_trends()
        
        top_repos = [repo['name'] for repo in trends[:5]]
        
        return {
            "status": "success",
            "message": f"Found {len(trends)} trending repos",
            "data": {"top_repos": top_repos}
        }
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        return {
            "status": "error",
            "message": str(e),
            "data": None
        }
```

EXAMPLE 2 - Email Service:
```python
from app.integrations.gmail_service import SimpleEmailService
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

async def execute_workflow():
    try:
        logger.info("Sending email")
        
        result = SimpleEmailService.send_simple_email(
            to="user@example.com",
            subject="Test Email",
            body="This is a test message"
        )
        
        return {
            "status": "success",
            "message": "Email sent",
            "data": result
        }
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        return {
            "status": "error",
            "message": str(e),
            "data": None
        }
```

EXAMPLE 3 - Email + GitHub Trends Combined:
```python
from app.integrations.web_service import WebService
from app.integrations.gmail_service import SimpleEmailService
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

async def execute_workflow():
    try:
        logger.info("Fetching GitHub trends")
        trends = WebService.scrape_github_trends()
        
        logger.info(f"Found {len(trends)} trending repos, preparing email")
        
        # Format email body (NO EMOJIS - plain text only)
        email_body = "Top GitHub Trending Repositories:\\n\\n"
        
        for repo in trends[:10]:
            email_body += f"Repository: {repo['name']}\\n"
            email_body += f"Description: {repo['description']}\\n"
            email_body += f"URL: {repo['url']}\\n"
            email_body += "-" * 60 + "\\n\\n"
        
        # Send email
        result = SimpleEmailService.send_simple_email(
            to="user@example.com",
            subject=f"GitHub Trending Repositories - {datetime.now().strftime('%Y-%m-%d')}",
            body=email_body
        )
        
        logger.info(f"Email sent successfully")
        
        return {
            "status": "success",
            "message": f"Sent email with {len(trends)} trending repositories",
            "data": {"trends_count": len(trends)}
        }
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        return {
            "status": "error",
            "message": str(e),
            "data": None
        }
```

EXAMPLE 4 - Calendar Event Creation:
```python
from app.integrations.calendar_service import GoogleCalendarService
import logging
from datetime import datetime, timedelta
import re

logger = logging.getLogger(__name__)

async def execute_workflow():
    try:
        logger.info("Creating calendar event")
        
        # Parse date and time from natural language
        # Example: "4 january, 2026 at 5:00PM" -> "2026-01-04T17:00:00"
        date_str = "4 january, 2026"  # From workflow params
        time_str = "5:00PM"  # From workflow params
        
        # Parse date (handle formats like "4 january, 2026", "january 4, 2026", "2026-01-04")
        months = {
            'january': 1, 'february': 2, 'march': 3, 'april': 4,
            'may': 5, 'june': 6, 'july': 7, 'august': 8,
            'september': 9, 'october': 10, 'november': 11, 'december': 12
        }
        
        # Simple parsing
        date_match = re.search(r'(\d{1,2})\s+(\w+),\s+(\d{4})', date_str.lower())
        if date_match:
            day, month_name, year = date_match.groups()
            month = months.get(month_name.lower(), 1)
            parsed_date = datetime(int(year), month, int(day))
        else:
            # Try ISO format
            parsed_date = datetime.strptime(date_str, "%Y-%m-%d")
        
        # Parse time (handle 12-hour format with AM/PM)
        time_match = re.search(r'(\d{1,2}):(\d{2})\s*(AM|PM)', time_str.upper())
        if time_match:
            hour, minute, am_pm = time_match.groups()
            hour = int(hour)
            minute = int(minute)
            if am_pm == 'PM' and hour != 12:
                hour += 12
            elif am_pm == 'AM' and hour == 12:
                hour = 0
            parsed_time = datetime.strptime(f"{hour:02d}:{minute:02d}", "%H:%M").time()
        else:
            # Try 24-hour format
            parsed_time = datetime.strptime(time_str, "%H:%M").time()
        
        # Combine date and time to create ISO format start_time
        start_dt = datetime.combine(parsed_date.date(), parsed_time)
        start_time = start_dt.isoformat()
        
        # Calculate end time (1 hour later)
        end_dt = start_dt + timedelta(hours=1)
        end_time = end_dt.isoformat()
        
        # Initialize calendar service
        calendar_service = GoogleCalendarService()
        
        # Check if service is available
        if not calendar_service.service:
            logger.error("Calendar service not available - credentials missing")
            return {
                "status": "error",
                "message": "Calendar service not available. Ensure Google OAuth is set up.",
                "data": None
            }
        
        result = calendar_service.create_event(
            title="Team Meeting",
            start_time=start_time,
            end_time=end_time,
            description="Team meeting to discuss project progress",
            location="Conference Room A"
        )
        
        if result.get("status") == "success":
            logger.info(f"Event created successfully")
            return {
                "status": "success",
                "message": f"Calendar event created: Team Meeting on {date_str} at {time_str}",
                "data": {
                    "event_id": result.get("id"),
                    "html_link": result.get("htmlLink")
                }
            }
        else:
            error_msg = result.get("message", "Failed to create event")
            logger.error(f"Failed to create calendar event: {error_msg}")
            return {
                "status": "error",
                "message": error_msg,
                "data": None
            }
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        return {
            "status": "error",
            "message": str(e),
            "data": None
        }
```

CRITICAL RULES:
1. ALWAYS import datetime at the top
2. ALWAYS import logging at the top
3. Use logger = logging.getLogger(__name__)
4. NO await on integration methods
5. MessagingService.send_telegram_message requires message parameter
6. Always use try-except
7. Always return the exact dict structure shown
8. NEVER use emoji characters - use plain text only with ASCII characters
9. Use plain ASCII formatting (dashes, asterisks, etc.) instead of emojis
10. CALENDAR DATE PARSING:
    - Parse dates from natural language in the workflow structure params
    - Examples: "4 january, 2026 at 5:00PM" -> "2026-01-04T17:00:00"
    - "january 4, 2026 at 9:00AM" -> "2026-01-04T09:00:00"
    - "2026-01-04 17:00" -> "2026-01-04T17:00:00"
    - Use datetime.strptime() or manual parsing to convert to ISO format
    - If time is in 12-hour format (AM/PM), convert to 24-hour format
    - Format: YYYY-MM-DDTHH:MM:SS (ISO 8601)
11. GITHUB METHODS:
    - For "trending repositories", "popular repos" => use GitHubService().get_trending_repos() or WebService.scrape_github_trends()
    - For "search repositories" with a keyword => use GitHubService().search_repositories(query="keyword", limit=10)
    - ALWAYS instantiate GitHubService() with parentheses before calling methods!
    - NEVER call search_repositories() without a query parameter!
11. CONDITIONAL LOGIC: If the instruction mentions "if", "when", "unless", "check", "condition", or "threshold":
    - Generate if/elif/else statements
    - Store results in variables before conditionals
    - Use meaningful variable names (count, result, status, etc.)
    - Include logging before and after conditions
    - Example: if issue_count > 10: send_alert()
    - Always provide success return for both branches

Generate ONLY the Python code following these patterns exactly. No explanations, no markdown."""
        
        try:
            response = client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[
                    {
                        "role": "system", 
                        "content": "You are an expert Python developer. Generate ONLY valid Python code. NEVER use await on SimpleEmailService, WebService, MessagingService, SlackService, SimpleDriveService, or GoogleCalendarService methods - they are NOT async. Follow the examples exactly. ALWAYS include 'import logging' and 'from datetime import datetime' at the top. For GitHub: use GitHubService().get_trending_repos() or scrape_github_trends() for trending (only has name, description, url fields), use GitHubService().search_repositories(query='keyword') for search (has name, description, stars, forks, language, url). ALWAYS instantiate GitHubService and GoogleCalendarService with parentheses. Never call search_repositories() without the query parameter. For Calendar: parse dates from natural language (e.g., '4 january, 2026 at 5:00PM' -> '2026-01-04T17:00:00'), use GoogleCalendarService().create_event() with summary, start_datetime (ISO format), duration_minutes, description, location, attendees. CRITICAL: Always check if calendar_service.service is not None before calling create_event, and properly handle and return errors if the service is not available. If the instruction mentions conditions (if, when, unless, check, threshold), generate if/elif/else statements with proper variable assignments and logging."
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=0.05,
                max_tokens=1500
            )
            
            code = response.choices[0].message.content
            
            # Clean code
            code = code.strip()
            if code.startswith("```python"):
                code = code[9:]
            elif code.startswith("```"):
                code = code[3:]
            if code.endswith("```"):
                code = code[:-3]
            code = code.strip()
            
            # Safety check - remove any await from integration calls
            code = code.replace("await SimpleEmailService.", "SimpleEmailService.")
            code = code.replace("await WebService.", "WebService.")
            code = code.replace("await MessagingService.", "MessagingService.")
            code = code.replace("await SimpleDriveService.", "SimpleDriveService.")
            code = code.replace("await GoogleCalendarService.", "GoogleCalendarService.")
            code = code.replace("await SimpleCalendarService.", "SimpleCalendarService.")
            
            # Ensure datetime and logging are imported (safety check)
            if "from datetime import datetime" not in code:
                code = "from datetime import datetime\n" + code
            if "import logging" not in code:
                code = "import logging\n" + code
            
            logger.info(f"Generated workflow code:\n{code[:500]}...")  # Log first 500 chars
            return code
            
        except Exception as e:
            logger.error(f"Failed to generate code: {str(e)}")
            raise Exception(f"Code generation failed: {str(e)}")
    
    @staticmethod
    async def generate_yaml(workflow_structure: dict) -> str:
        """
        Generate YAML representation of workflow
        """
        try:
            import yaml
            yaml_content = yaml.dump(workflow_structure, default_flow_style=False, sort_keys=False)
            logger.info("Successfully generated YAML")
            return yaml_content
        except Exception as e:
            logger.error(f"Failed to generate YAML: {str(e)}")
            return str(workflow_structure)
    
    @staticmethod
    async def debug_workflow(workflow_code: str, error_message: str) -> dict:
        """
        Use AI to debug workflow errors
        """
        prompt = f"""
You are a Python debugging expert. Analyze this workflow code and error:

CODE:
```python
{workflow_code}
```

ERROR:
{error_message}

Common issues:
1. Using 'await' on non-async functions (SimpleEmailService, WebService, etc.)
2. Missing return statement
3. Wrong dict structure in return
4. Missing error handling
5. Missing imports (datetime, logging)

Provide:
1. Root cause of the error
2. Suggested fix
3. Corrected code

Respond in JSON format:
{{
    "root_cause": "explanation of what went wrong",
    "suggested_fix": "what needs to be changed",
    "fixed_code": "corrected code"
}}
"""
        
        try:
            response = client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": "You are a debugging expert. Respond with valid JSON only."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3
            )
            
            result = response.choices[0].message.content
            result = result.strip()
            if result.startswith("```json"):
                result = result[7:]
            if result.startswith("```"):
                result = result[3:]
            if result.endswith("```"):
                result = result[:-3]
            result = result.strip()
            
            debug_info = json.loads(result)
            logger.info("Successfully generated debug analysis")
            return debug_info
            
        except Exception as e:
            logger.error(f"Debug analysis failed: {str(e)}")
            return {
                "root_cause": "Unable to analyze error automatically",
                "suggested_fix": "Please check the logs manually and review the generated code",
                "fixed_code": None
            }
    
    @staticmethod
    async def explain_workflow(workflow_code: str) -> str:
        """
        Generate a human-readable explanation of what the workflow does
        """
        prompt = f"""
Explain what this workflow code does in simple, non-technical language:
```python
{workflow_code}
```

Write a brief explanation (2-3 sentences) that anyone can understand.
"""
        
        try:
            response = client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": "You are a technical writer. Explain code in simple terms."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.5
            )
            
            explanation = response.choices[0].message.content.strip()
            logger.info("Successfully generated workflow explanation")
            return explanation
            
        except Exception as e:
            logger.error(f"Failed to generate explanation: {str(e)}")
            return "This workflow automates a task based on user instructions."
    
    @staticmethod
    async def suggest_improvements(workflow_structure: dict) -> list:
        """
        Suggest improvements for a workflow
        """
        prompt = f"""
Analyze this workflow and suggest 3 improvements:

{json.dumps(workflow_structure, indent=2)}

Respond with a JSON array of suggestions:
[
    {{"improvement": "description", "benefit": "why this helps"}},
    ...
]
"""
        
        try:
            response = client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": "You are a workflow optimization expert. Respond with valid JSON only."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.6
            )
            
            result = response.choices[0].message.content.strip()
            if result.startswith("```json"):
                result = result[7:]
            if result.startswith("```"):
                result = result[3:]
            if result.endswith("```"):
                result = result[:-3]
            result = result.strip()
            
            suggestions = json.loads(result)
            logger.info(f"Generated {len(suggestions)} improvement suggestions")
            return suggestions
            
        except Exception as e:
            logger.error(f"Failed to generate suggestions: {str(e)}")
            return []
    
    @staticmethod
    async def explain_error_to_user(
        workflow_name: str,
        workflow_code: str,
        error_message: str,
        execution_logs: str,
        user_question: str = None
    ) -> str:
        """
        AI explains workflow errors in plain English to users
        """
        
        base_prompt = f"""
You are a helpful AI assistant helping users understand why their automation workflow failed.

WORKFLOW NAME: {workflow_name}

WORKFLOW CODE:
```python
{workflow_code}
```

ERROR MESSAGE:
{error_message}

EXECUTION LOGS:
{execution_logs}
"""
        
        if user_question:
            prompt = f"{base_prompt}\n\nUSER'S QUESTION: {user_question}\n\nProvide a clear, friendly explanation answering their question."
        else:
            prompt = f"{base_prompt}\n\nExplain what went wrong in simple terms that anyone can understand. Provide specific steps to fix it."
        
        try:
            response = client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a friendly AI assistant helping users debug their automation workflows. Explain technical issues in simple terms. Be encouraging and helpful. Provide clear action steps."
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=500
            )
            
            explanation = response.choices[0].message.content.strip()
            logger.info(f"Generated user-friendly explanation for workflow: {workflow_name}")
            return explanation
            
        except Exception as e:
            logger.error(f"Failed to generate explanation: {str(e)}")
            return "I'm having trouble analyzing this error right now. Please check the execution logs for more details."
    
    @staticmethod
    async def auto_fix_workflow(
        workflow_code: str,
        error_message: str,
        workflow_structure: dict
    ) -> dict:
        """
        AI attempts to automatically fix workflow errors
        """
        
        prompt = f"""
You are an expert at fixing automation workflows. A workflow has failed and needs to be fixed.

CURRENT CODE:
```python
{workflow_code}
```

ERROR:
{error_message}

WORKFLOW STRUCTURE:
{json.dumps(workflow_structure, indent=2)}

TASK: Generate FIXED, working code that solves this error.

REQUIREMENTS:
1. Keep the same functionality
2. Fix the specific error
3. Ensure all imports are correct
4. Follow the same code structure pattern
5. Return ONLY the fixed Python code, no explanations

Generate the complete fixed code:
"""
        
        try:
            response = client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert Python developer. Fix broken code while maintaining functionality. Output only valid Python code."
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=0.2,
                max_tokens=1500
            )
            
            fixed_code = response.choices[0].message.content.strip()
            
            # Clean the code
            if fixed_code.startswith("```python"):
                fixed_code = fixed_code[9:]
            elif fixed_code.startswith("```"):
                fixed_code = fixed_code[3:]
            if fixed_code.endswith("```"):
                fixed_code = fixed_code[:-3]
            fixed_code = fixed_code.strip()
            
            # Safety check
            from app.workflows.executor import WorkflowExecutor
            fixed_code = WorkflowExecutor.sanitize_code(fixed_code)
            
            # Validate the fixed code
            validation = await WorkflowExecutor.validate_code(fixed_code)
            
            logger.info("Successfully generated fixed workflow code")
            
            return {
                "success": validation.get("valid", False),
                "fixed_code": fixed_code,
                "validation": validation,
                "changes_summary": "Fixed the error and ensured code quality"
            }
            
        except Exception as e:
            logger.error(f"Failed to auto-fix workflow: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "fixed_code": None
            }
    
    @staticmethod
    async def suggest_workflow_improvements(
        workflow_code: str,
        workflow_structure: dict,
        execution_history: list = None
    ) -> list:
        """
        AI suggests improvements for workflows based on execution patterns
        """
        
        history_summary = ""
        if execution_history:
            total = len(execution_history)
            failed = sum(1 for log in execution_history if log.get("status") == "failed")
            avg_time = sum(log.get("execution_time", 0) for log in execution_history) / total if total > 0 else 0
            
            history_summary = f"""
EXECUTION HISTORY:
- Total executions: {total}
- Failed executions: {failed}
- Success rate: {((total - failed) / total * 100):.1f}%
- Average execution time: {avg_time:.0f}ms
"""
        
        prompt = f"""
Analyze this workflow and suggest 3 practical improvements:

WORKFLOW STRUCTURE:
{json.dumps(workflow_structure, indent=2)}

CODE:
```python
{workflow_code}
```

{history_summary}

Suggest improvements for:
1. Performance optimization
2. Error handling
3. User experience
4. Additional features

Respond ONLY with valid JSON array:
[
    {{
        "category": "Performance|Error Handling|Features|Reliability",
        "suggestion": "Brief description",
        "benefit": "Why this helps",
        "priority": "High|Medium|Low"
    }}
]
"""
        
        try:
            response = client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a workflow optimization expert. Provide practical, actionable suggestions. Respond with valid JSON only."
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=0.6
            )
            
            result = response.choices[0].message.content.strip()
            
            # Clean JSON
            if result.startswith("```json"):
                result = result[7:]
            if result.startswith("```"):
                result = result[3:]
            if result.endswith("```"):
                result = result[:-3]
            result = result.strip()
            
            suggestions = json.loads(result)
            logger.info(f"Generated {len(suggestions)} workflow improvement suggestions")
            return suggestions
            
        except Exception as e:
            logger.error(f"Failed to generate suggestions: {str(e)}")
            return []