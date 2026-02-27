import requests
import logging
from typing import Dict, List, Optional
from app.core.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

class GitHubService:
    """
    GitHub API Integration
    """
    
    def __init__(self, access_token: str = None):
        self.access_token = access_token or getattr(settings, 'GITHUB_ACCESS_TOKEN', None)
        self.base_url = "https://api.github.com"
        self.headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "AI-Automation-System"
        }
        
        if self.access_token:
            self.headers["Authorization"] = f"token {self.access_token}"
    
    def get_trending_repos(self, language: str = None, since: str = "daily") -> List[Dict]:
        """
        Get trending repositories
        since: daily, weekly, monthly
        """
        try:
            from app.integrations.web_service import WebService
            
            # Use web scraping for trending (GitHub doesn't have API for this)
            trends = WebService.scrape_github_trends()
            
            logger.info(f"Fetched {len(trends)} trending repos")
            return trends
            
        except Exception as e:
            logger.error(f"Failed to get trending repos: {str(e)}")
            return []
    
    def search_repositories(self, query: str, sort: str = "stars", limit: int = 10) -> List[Dict]:
        """
        Search for repositories
        sort: stars, forks, updated
        """
        try:
            url = f"{self.base_url}/search/repositories"
            params = {
                "q": query,
                "sort": sort,
                "order": "desc",
                "per_page": limit
            }
            
            response = requests.get(url, headers=self.headers, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            repos = []
            
            for item in data.get("items", []):
                repos.append({
                    "name": item["full_name"],
                    "description": item.get("description", "No description"),
                    "stars": item["stargazers_count"],
                    "forks": item["forks_count"],
                    "language": item.get("language", "Unknown"),
                    "url": item["html_url"],
                    "updated": item["updated_at"]
                })
            
            logger.info(f"Found {len(repos)} repositories for query: {query}")
            return repos
            
        except Exception as e:
            logger.error(f"Failed to search repositories: {str(e)}")
            return []
    
    def get_user_repos(self, username: str = None, limit: int = 10) -> List[Dict]:
        """
        Get repositories for a user
        """
        try:
            user = username or getattr(settings, 'GITHUB_USERNAME', None)
            
            if not user:
                logger.error("GitHub username not configured")
                return []
            
            url = f"{self.base_url}/users/{user}/repos"
            params = {
                "sort": "updated",
                "per_page": limit
            }
            
            response = requests.get(url, headers=self.headers, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            repos = []
            
            for item in data:
                repos.append({
                    "name": item["name"],
                    "full_name": item["full_name"],
                    "description": item.get("description", "No description"),
                    "stars": item["stargazers_count"],
                    "forks": item["forks_count"],
                    "language": item.get("language", "Unknown"),
                    "url": item["html_url"],
                    "private": item["private"],
                    "updated": item["updated_at"]
                })
            
            logger.info(f"Fetched {len(repos)} repositories for user: {user}")
            return repos
            
        except Exception as e:
            logger.error(f"Failed to get user repos: {str(e)}")
            return []
    
    def get_repo_details(self, owner: str, repo: str) -> Optional[Dict]:
        """
        Get details about a specific repository
        """
        try:
            url = f"{self.base_url}/repos/{owner}/{repo}"
            
            response = requests.get(url, headers=self.headers, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            return {
                "name": data["name"],
                "full_name": data["full_name"],
                "description": data.get("description", "No description"),
                "stars": data["stargazers_count"],
                "forks": data["forks_count"],
                "watchers": data["watchers_count"],
                "language": data.get("language", "Unknown"),
                "open_issues": data["open_issues_count"],
                "url": data["html_url"],
                "created": data["created_at"],
                "updated": data["updated_at"],
                "size": data["size"],
                "default_branch": data["default_branch"]
            }
            
        except Exception as e:
            logger.error(f"Failed to get repo details: {str(e)}")
            return None
    
    def get_repo_commits(self, owner: str, repo: str, limit: int = 10) -> List[Dict]:
        """
        Get recent commits for a repository
        """
        try:
            url = f"{self.base_url}/repos/{owner}/{repo}/commits"
            params = {"per_page": limit}
            
            response = requests.get(url, headers=self.headers, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            commits = []
            
            for item in data:
                commits.append({
                    "sha": item["sha"][:7],
                    "message": item["commit"]["message"].split('\n')[0],
                    "author": item["commit"]["author"]["name"],
                    "date": item["commit"]["author"]["date"],
                    "url": item["html_url"]
                })
            
            logger.info(f"Fetched {len(commits)} commits for {owner}/{repo}")
            return commits
            
        except Exception as e:
            logger.error(f"Failed to get commits: {str(e)}")
            return []
    
    def get_repo_issues(self, owner: str, repo: str, state: str = "open", limit: int = 10) -> List[Dict]:
        """
        Get issues for a repository
        state: open, closed, all
        """
        try:
            url = f"{self.base_url}/repos/{owner}/{repo}/issues"
            params = {
                "state": state,
                "per_page": limit
            }
            
            response = requests.get(url, headers=self.headers, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            issues = []
            
            for item in data:
                # Skip pull requests
                if "pull_request" in item:
                    continue
                
                issues.append({
                    "number": item["number"],
                    "title": item["title"],
                    "state": item["state"],
                    "author": item["user"]["login"],
                    "labels": [label["name"] for label in item.get("labels", [])],
                    "created": item["created_at"],
                    "updated": item["updated_at"],
                    "url": item["html_url"]
                })
            
            logger.info(f"Fetched {len(issues)} issues for {owner}/{repo}")
            return issues
            
        except Exception as e:
            logger.error(f"Failed to get issues: {str(e)}")
            return []
    
    def create_issue(self, owner: str, repo: str, title: str, body: str = "", labels: List[str] = None) -> Optional[Dict]:
        """
        Create a new issue
        Requires authentication
        """
        try:
            if not self.access_token:
                logger.error("GitHub token required to create issues")
                return None
            
            url = f"{self.base_url}/repos/{owner}/{repo}/issues"
            payload = {
                "title": title,
                "body": body
            }
            
            if labels:
                payload["labels"] = labels
            
            response = requests.post(url, headers=self.headers, json=payload, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            logger.info(f"Created issue #{data['number']} in {owner}/{repo}")
            return {
                "number": data["number"],
                "title": data["title"],
                "url": data["html_url"],
                "state": data["state"]
            }
            
        except Exception as e:
            logger.error(f"Failed to create issue: {str(e)}")
            return None
    
    def get_user_info(self, username: str = None) -> Optional[Dict]:
        """
        Get information about a GitHub user
        """
        try:
            user = username or getattr(settings, 'GITHUB_USERNAME', None)
            
            if not user:
                # Get authenticated user info
                url = f"{self.base_url}/user"
            else:
                url = f"{self.base_url}/users/{user}"
            
            response = requests.get(url, headers=self.headers, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            return {
                "username": data["login"],
                "name": data.get("name", ""),
                "bio": data.get("bio", ""),
                "public_repos": data["public_repos"],
                "followers": data["followers"],
                "following": data["following"],
                "created": data["created_at"],
                "url": data["html_url"],
                "avatar": data["avatar_url"]
            }
            
        except Exception as e:
            logger.error(f"Failed to get user info: {str(e)}")
            return None
    
    def get_rate_limit(self) -> Dict:
        """
        Check API rate limit status
        """
        try:
            url = f"{self.base_url}/rate_limit"
            
            response = requests.get(url, headers=self.headers, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            core = data["resources"]["core"]
            
            return {
                "limit": core["limit"],
                "remaining": core["remaining"],
                "reset_time": core["reset"],
                "authenticated": bool(self.access_token)
            }
            
        except Exception as e:
            logger.error(f"Failed to get rate limit: {str(e)}")
            return {
                "limit": 0,
                "remaining": 0,
                "authenticated": False
            }