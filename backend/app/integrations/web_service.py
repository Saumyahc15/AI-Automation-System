import requests
from bs4 import BeautifulSoup
import logging
from typing import Dict, List

logger = logging.getLogger(__name__)

class WebService:
    """
    Handle web scraping and API calls
    """
    
    @staticmethod
    def fetch_url(url: str, headers: Dict = None) -> Dict:
        """
        Fetch content from a URL
        """
        try:
            default_headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            
            if headers:
                default_headers.update(headers)
            
            response = requests.get(url, headers=default_headers, timeout=15)
            response.raise_for_status()
            
            return {
                "status": "success",
                "status_code": response.status_code,
                "content": response.text,
                "url": url
            }
            
        except Exception as e:
            logger.error(f"Failed to fetch URL {url}: {str(e)}")
            return {
                "status": "error",
                "message": str(e),
                "url": url
            }
    
    @staticmethod
    def scrape_github_trends() -> List[Dict]:
        """
        Scrape trending repositories from GitHub
        """
        try:
            url = "https://github.com/trending"
            response = requests.get(url, timeout=15)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            repos = []
            
            for article in soup.find_all('article', class_='Box-row')[:10]:
                try:
                    h2 = article.find('h2')
                    if h2:
                        a_tag = h2.find('a')
                        if a_tag:
                            repo_name = a_tag.get('href', '').strip('/')
                            
                            description_elem = article.find('p', class_='col-9')
                            description = description_elem.text.strip() if description_elem else "No description"
                            
                            repos.append({
                                "name": repo_name,
                                "description": description,
                                "url": f"https://github.com/{repo_name}"
                            })
                except Exception as e:
                    logger.error(f"Error parsing repo: {str(e)}")
                    continue
            
            logger.info(f"Scraped {len(repos)} trending repos")
            return repos
            
        except Exception as e:
            logger.error(f"Failed to scrape GitHub trends: {str(e)}")
            return []
    
    @staticmethod
    def make_api_call(url: str, method: str = "GET", headers: Dict = None, 
                     json_data: Dict = None, params: Dict = None) -> Dict:
        """
        Make a generic API call
        """
        try:
            method = method.upper()
            
            kwargs = {
                "timeout": 15,
                "headers": headers or {},
                "params": params or {}
            }
            
            if json_data and method in ["POST", "PUT", "PATCH"]:
                kwargs["json"] = json_data
            
            response = requests.request(method, url, **kwargs)
            
            try:
                json_response = response.json()
            except:
                json_response = {"text": response.text}
            
            return {
                "status": "success" if response.ok else "error",
                "status_code": response.status_code,
                "data": json_response,
                "url": url
            }
            
        except Exception as e:
            logger.error(f"API call failed for {url}: {str(e)}")
            return {
                "status": "error",
                "message": str(e),
                "url": url
            }