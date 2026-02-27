"""
Pre-built workflow templates that users can use as starting points
"""

WORKFLOW_TEMPLATES = [
    {
        "id": "github-daily-digest",
        "name": "GitHub Daily Digest",
        "category": "Development",
        "description": "Get trending GitHub repositories sent to your email every morning",
        "icon": "📊",
        "difficulty": "Easy",
        "instruction": "Every day at 9 AM, fetch GitHub trending repositories and send me an email summary to my@email.com",
        "tags": ["github", "email", "daily", "trends"],
        "estimated_time": "Runs daily at 9 AM",
        "integrations": ["GitHub API", "Gmail"],
        "use_case": "Stay updated with popular open-source projects without manually checking GitHub"
    },
    {
        "id": "invoice-automation",
        "name": "Invoice Email Automation",
        "category": "Business",
        "description": "Automatically save invoice attachments from emails to Google Drive",
        "icon": "💼",
        "difficulty": "Medium",
        "instruction": "When I receive an email with subject containing 'Invoice', save the attachment to my Google Drive folder named Invoices",
        "tags": ["email", "drive", "invoices", "automation"],
        "estimated_time": "Runs when email received",
        "integrations": ["Gmail", "Google Drive"],
        "use_case": "Never lose invoice documents - automatically organize them in Drive"
    },
    {
        "id": "morning-briefing",
        "name": "Morning Briefing",
        "category": "Productivity",
        "description": "Get a Telegram message every morning with GitHub trends and weather",
        "icon": "☀️",
        "difficulty": "Easy",
        "instruction": "Every day at 8 AM, send me a Telegram message with good morning and today's date",
        "tags": ["telegram", "morning", "daily", "notifications"],
        "estimated_time": "Runs daily at 8 AM",
        "integrations": ["Telegram"],
        "use_case": "Start your day with an automated morning message"
    },
    {
        "id": "repo-monitor",
        "name": "Repository Monitor",
        "category": "Development",
        "description": "Monitor a specific GitHub repository and get notified of new issues",
        "icon": "🔍",
        "difficulty": "Medium",
        "instruction": "Every hour, check facebook/react repository for new open issues and send me a summary via email",
        "tags": ["github", "monitoring", "issues", "notifications"],
        "estimated_time": "Runs hourly",
        "integrations": ["GitHub API", "Gmail"],
        "use_case": "Stay on top of issues in repositories you care about"
    },
    {
        "id": "multi-channel-alert",
        "name": "Multi-Channel Alert System",
        "category": "Notifications",
        "description": "Send important notifications via email, Telegram, and WhatsApp simultaneously",
        "icon": "🔔",
        "difficulty": "Advanced",
        "instruction": "Send me a notification saying 'System check completed' via email, Telegram, and WhatsApp",
        "tags": ["email", "telegram", "whatsapp", "notifications", "multi-channel"],
        "estimated_time": "Runs on demand",
        "integrations": ["Gmail", "Telegram", "WhatsApp"],
        "use_case": "Ensure critical alerts reach you through multiple channels"
    },
    {
        "id": "github-search-weekly",
        "name": "Weekly GitHub Search Report",
        "category": "Development",
        "description": "Search GitHub for specific topics and get weekly email reports",
        "icon": "🔎",
        "difficulty": "Medium",
        "instruction": "Every Monday at 10 AM, search GitHub for 'python automation' repositories and email me the top 10",
        "tags": ["github", "search", "weekly", "research"],
        "estimated_time": "Runs weekly on Mondays",
        "integrations": ["GitHub API", "Gmail"],
        "use_case": "Discover new projects and libraries in your area of interest"
    },
    {
        "id": "daily-reminder",
        "name": "Daily Reminder",
        "category": "Productivity",
        "description": "Get a daily reminder via Telegram at a specific time",
        "icon": "⏰",
        "difficulty": "Easy",
        "instruction": "Every day at 6 PM, send me a Telegram message saying 'Time to wrap up work!'",
        "tags": ["telegram", "reminder", "daily", "productivity"],
        "estimated_time": "Runs daily at 6 PM",
        "integrations": ["Telegram"],
        "use_case": "Never forget important daily tasks with automated reminders"
    },
    {
        "id": "weekend-digest",
        "name": "Weekend Tech Digest",
        "category": "Learning",
        "description": "Get a curated list of trending tech repositories every weekend",
        "icon": "📰",
        "difficulty": "Easy",
        "instruction": "Every Saturday at 9 AM, fetch GitHub trending repositories and send me an email with top 20",
        "tags": ["github", "weekend", "learning", "digest"],
        "estimated_time": "Runs every Saturday",
        "integrations": ["GitHub API", "Gmail"],
        "use_case": "Stay updated with tech trends during your weekend learning time"
    },
    {
        "id": "daily-news-digest",
        "name": "Daily News Digest",
        "category": "Learning",
        "description": "Get a curated digest of trending tech news delivered to your email every morning",
        "icon": "📰",
        "difficulty": "Easy",
        "instruction": "Every day at 8 AM, scrape tech news and send me a formatted email digest with top 10 trending articles",
        "tags": ["news", "email", "daily", "digest", "tech-news"],
        "estimated_time": "Runs daily at 8 AM",
        "integrations": ["Web Scraping", "Gmail"],
        "use_case": "Start your day informed with the latest technology and programming trends without browsing multiple news sites"
    },
    {
        "id": "api-health-monitor",
        "name": "API Health Monitor",
        "category": "Development",
        "description": "Monitor your API endpoint health with multi-channel alerts when issues are detected",
        "icon": "🏥",
        "difficulty": "Medium",
        "instruction": "Every 15 minutes, ping my API endpoint. If the status code is not 200, send me an alert via email, Slack, and Telegram with the error details",
        "tags": ["api", "monitoring", "health-check", "alerts", "slack", "telegram", "email"],
        "estimated_time": "Runs every 15 minutes",
        "integrations": ["HTTP/REST", "Gmail", "Slack", "Telegram"],
        "use_case": "Catch API downtime immediately and get notified across multiple channels so you never miss critical service issues"
    },
    {
        "id": "github-to-sheets",
        "name": "GitHub Data to Google Sheets",
        "category": "Development",
        "description": "Export trending GitHub repositories to a Google Sheet daily",
        "icon": "📊",
        "difficulty": "Easy",
        "instruction": "Every day at 10 AM, fetch trending GitHub repositories and save them to a Google Sheet with columns for Repository Name, Stars, Language, and URL",
        "tags": ["github", "sheets", "spreadsheet", "automation", "data-export"],
        "estimated_time": "Runs daily at 10 AM",
        "integrations": ["GitHub API", "Google Sheets"],
        "use_case": "Automatically maintain a spreadsheet of trending repositories for market research, learning, or team updates without manual copy-paste"
    },
    {
        "id": "survey-to-sheets",
        "name": "Survey Data Collection to Sheets",
        "category": "Business",
        "description": "Collect form submissions and automatically save them to Google Sheets",
        "icon": "📝",
        "difficulty": "Medium",
        "instruction": "When a webhook receives survey data, parse it and append the responses to a Google Sheet with proper formatting and timestamp",
        "tags": ["sheets", "forms", "data-collection", "webhook", "automation"],
        "estimated_time": "Runs on webhook trigger",
        "integrations": ["Webhooks", "Google Sheets"],
        "use_case": "Replace manual data entry by automatically collecting form responses into organized Google Sheets for analysis"
    },
    {
        "id": "drive-file-organizer",
        "name": "Google Drive File Organizer",
        "category": "Productivity",
        "description": "Automatically organize files in Google Drive by creating folders and moving files",
        "icon": "📁",
        "difficulty": "Medium",
        "instruction": "Every week, check my Downloads folder for files, organize them by type into Google Drive folders (Documents, Images, Videos), and notify me via email",
        "tags": ["drive", "file-organization", "automation", "email"],
        "estimated_time": "Runs every Sunday",
        "integrations": ["Google Drive", "Gmail"],
        "use_case": "Keep your Google Drive organized automatically without manual folder creation and file moving"
    },
    {
        "id": "data-backup-drive",
        "name": "Automated Data Backup to Drive",
        "category": "Productivity",
        "description": "Automatically backup important files and spreadsheets to Google Drive",
        "icon": "💾",
        "difficulty": "Medium",
        "instruction": "Every day at midnight, create a backup of important documents, compress them, and upload to a Google Drive folder named 'Daily Backups' with today's date",
        "tags": ["drive", "backup", "automation", "storage"],
        "estimated_time": "Runs daily at midnight",
        "integrations": ["Google Drive"],
        "use_case": "Ensure your critical data is always backed up in the cloud without manual uploads"
    },
]

TEMPLATE_CATEGORIES = [
    {
        "id": "development",
        "name": "Development",
        "description": "Workflows for developers and programmers",
        "icon": "💻"
    },
    {
        "id": "business",
        "name": "Business",
        "description": "Automate business processes and documentation",
        "icon": "💼"
    },
    {
        "id": "productivity",
        "name": "Productivity",
        "description": "Boost your daily productivity",
        "icon": "⚡"
    },
    {
        "id": "notifications",
        "name": "Notifications",
        "description": "Stay informed with automated alerts",
        "icon": "🔔"
    },
    {
        "id": "learning",
        "name": "Learning",
        "description": "Educational and research workflows",
        "icon": "📚"
    },
    {
        "id": "design",
        "name": "Design",
        "description": "Auto-generate designs, graphics, and media",
        "icon": "🎨"
    }
]

def get_template_by_id(template_id: str):
    """Get a specific template by ID"""
    for template in WORKFLOW_TEMPLATES:
        if template["id"] == template_id:
            return template
    return None

def get_templates_by_category(category: str):
    """Get all templates in a category"""
    return [
        template for template in WORKFLOW_TEMPLATES
        if template["category"].lower() == category.lower()
    ]

def search_templates(query: str):
    """Search templates by name, description, or tags"""
    query = query.lower()
    results = []
    
    for template in WORKFLOW_TEMPLATES:
        if (query in template["name"].lower() or
            query in template["description"].lower() or
            any(query in tag.lower() for tag in template["tags"])):
            results.append(template)
    
    return results