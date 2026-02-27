import asyncio
import time
from datetime import datetime
from typing import Dict, Any
import logging
import sys
import re
from io import StringIO

# Import integration services needed by workflows
from app.integrations.web_service import WebService
from app.integrations.gmail_service import GmailService, SimpleEmailService
from app.integrations.drive_service import GoogleDriveService, SimpleDriveService
from app.integrations.sheets_service import GoogleSheetsService
from app.integrations.messaging_service import MessagingService
from app.integrations.github_service import GitHubService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class WorkflowExecutor:
    
    @staticmethod
    def sanitize_code(code: str) -> str:
        """
        Remove incorrect await statements from integration calls
        """
        # List of all integration services that should NOT be awaited
        non_async_services = [
            'SimpleEmailService',
            'WebService',
            'MessagingService',
            'SimpleDriveService'
        ]
        
        # Remove await from these service calls
        for service in non_async_services:
            # Match patterns like: await ServiceName.method_name(
            pattern = rf'await\s+{service}\.'
            code = re.sub(pattern, f'{service}.', code)
        
        # Also remove await from direct method calls if they exist
        code = re.sub(r'await\s+send_simple_email\(', 'send_simple_email(', code)
        code = re.sub(r'await\s+scrape_github_trends\(', 'scrape_github_trends(', code)
        code = re.sub(r'await\s+send_telegram_message\(', 'send_telegram_message(', code)
        code = re.sub(r'await\s+send_whatsapp_message\(', 'send_whatsapp_message(', code)
        code = re.sub(r'await\s+fetch_url\(', 'fetch_url(', code)
        code = re.sub(r'await\s+save_file_locally\(', 'save_file_locally(', code)
        
        logger.debug("Code sanitization completed")
        return code
    
    @staticmethod
    async def execute(workflow_code: str, input_data: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Execute workflow code safely with better error handling
        """
        start_time = time.time()
        
        try:
            # Sanitize the code first
            workflow_code = WorkflowExecutor.sanitize_code(workflow_code)
            
            logger.info("Executing workflow with sanitized code")
            
            # Create execution namespace with safe imports
            namespace = {
                '__builtins__': __builtins__,
                'asyncio': asyncio,
                'datetime': datetime,
                'logger': logger,
                'input_data': input_data or {},
                'print': print,
                # Integration services
                'WebService': WebService,
                'GmailService': GmailService,
                'SimpleEmailService': SimpleEmailService,
                'GoogleSheetsService': GoogleSheetsService,
                'GoogleDriveService': GoogleDriveService,
                'SimpleDriveService': SimpleDriveService,
                'MessagingService': MessagingService,
                'GitHubService': GitHubService,
            }
            
            # Execute the workflow code
            exec(workflow_code, namespace)
            
            # Check if execute_workflow function exists
            if 'execute_workflow' not in namespace:
                raise Exception("Generated code missing 'execute_workflow' function")
            
            execute_func = namespace['execute_workflow']
            
            # Check if it's a coroutine function
            if asyncio.iscoroutinefunction(execute_func):
                result = await execute_func()
            else:
                # If not async, run it directly
                result = execute_func()
            
            execution_time = int((time.time() - start_time) * 1000)
            
            # Ensure result is a dict
            if not isinstance(result, dict):
                result = {
                    "status": "success",
                    "data": result,
                    "message": "Workflow completed"
                }
            
            # Ensure required keys exist
            if 'status' not in result:
                result['status'] = 'success'
            if 'message' not in result:
                result['message'] = 'Workflow completed'
            
            logger.info(f"Workflow executed successfully in {execution_time}ms")
            
            return {
                "status": "success",
                "result": result,
                "execution_time": execution_time,
                "executed_at": datetime.now().isoformat()
            }
            
        except SyntaxError as e:
            execution_time = int((time.time() - start_time) * 1000)
            error_msg = f"Syntax error in generated code: {str(e)}"
            logger.error(error_msg)
            
            return {
                "status": "failed",
                "error": error_msg,
                "error_type": "SyntaxError",
                "execution_time": execution_time,
                "executed_at": datetime.now().isoformat()
            }
        
        except TypeError as e:
            execution_time = int((time.time() - start_time) * 1000)
            error_msg = str(e)
            
            # Check if it's the await issue
            if "can't be used in 'await' expression" in error_msg:
                logger.error(f"Detected await issue in workflow code: {error_msg}")
                return {
                    "status": "failed",
                    "error": "Code generation error: Non-async function called with await. This workflow needs to be recreated.",
                    "error_type": "TypeError",
                    "execution_time": execution_time,
                    "executed_at": datetime.now().isoformat(),
                    "suggestion": "Please delete and recreate this workflow"
                }
            
            logger.error(f"Type error: {error_msg}")
            return {
                "status": "failed",
                "error": error_msg,
                "error_type": "TypeError",
                "execution_time": execution_time,
                "executed_at": datetime.now().isoformat()
            }
            
        except Exception as e:
            execution_time = int((time.time() - start_time) * 1000)
            error_msg = str(e)
            error_type = type(e).__name__
            
            logger.error(f"Workflow execution failed ({error_type}): {error_msg}")
            
            return {
                "status": "failed",
                "error": error_msg,
                "error_type": error_type,
                "execution_time": execution_time,
                "executed_at": datetime.now().isoformat()
            }
    
    @staticmethod
    async def validate_code(workflow_code: str) -> Dict[str, Any]:
        """
        Validate workflow code without executing it
        """
        try:
            # Sanitize first
            workflow_code = WorkflowExecutor.sanitize_code(workflow_code)
            
            # Try to compile the code
            compile(workflow_code, '<string>', 'exec')
            
            # Check for required function
            namespace = {}
            exec(workflow_code, namespace)
            
            if 'execute_workflow' not in namespace:
                return {
                    "valid": False,
                    "error": "Missing 'execute_workflow' function"
                }
            
            logger.info("Code validation successful")
            return {
                "valid": True,
                "message": "Code is valid"
            }
            
        except SyntaxError as e:
            logger.error(f"Validation failed: Syntax error at line {e.lineno}")
            return {
                "valid": False,
                "error": f"Syntax error: {str(e)}",
                "line": e.lineno
            }
        except Exception as e:
            logger.error(f"Validation failed: {str(e)}")
            return {
                "valid": False,
                "error": str(e)
            }
    
    @staticmethod
    async def dry_run(workflow_code: str, input_data: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Perform a dry run of the workflow without executing actual integrations
        """
        logger.info("Starting dry run")
        
        # Create mock versions of integration services
        mock_namespace = {
            '__builtins__': __builtins__,
            'asyncio': asyncio,
            'datetime': datetime,
            'logger': logger,
            'input_data': input_data or {},
        }
        
        # Add mock integration classes
        class MockSimpleEmailService:
            @staticmethod
            def send_simple_email(to, subject, body):
                logger.info(f"[DRY RUN] Would send email to {to}")
                return {"status": "success", "message": "Mock email sent"}
        
        class MockWebService:
            @staticmethod
            def scrape_github_trends():
                logger.info("[DRY RUN] Would scrape GitHub trends")
                return [{"name": "mock-repo", "description": "Mock repo", "url": "https://github.com/mock"}]
            
            @staticmethod
            def fetch_url(url):
                logger.info(f"[DRY RUN] Would fetch URL: {url}")
                return {"status": "success", "content": "Mock content"}
        
        class MockMessagingService:
            @staticmethod
            def send_telegram_message(bot_token, chat_id, message):
                logger.info(f"[DRY RUN] Would send Telegram message to {chat_id}")
                return {"status": "success", "message": "Mock Telegram sent"}
            
            @staticmethod
            def send_whatsapp_message(phone, message):
                logger.info(f"[DRY RUN] Would send WhatsApp to {phone}")
                return {"status": "success", "message": "Mock WhatsApp sent"}
        
        class MockSimpleDriveService:
            @staticmethod
            def save_file_locally(file_path, destination):
                logger.info(f"[DRY RUN] Would save {file_path} to {destination}")
                return {"status": "success", "message": "Mock file saved"}
        
        # Inject mocks into namespace
        mock_namespace['SimpleEmailService'] = MockSimpleEmailService
        mock_namespace['WebService'] = MockWebService
        mock_namespace['MessagingService'] = MockMessagingService
        mock_namespace['SimpleDriveService'] = MockSimpleDriveService
        
        try:
            # Sanitize and execute
            workflow_code = WorkflowExecutor.sanitize_code(workflow_code)
            exec(workflow_code, mock_namespace)
            
            if 'execute_workflow' not in mock_namespace:
                return {
                    "status": "error",
                    "message": "Missing execute_workflow function"
                }
            
            execute_func = mock_namespace['execute_workflow']
            
            if asyncio.iscoroutinefunction(execute_func):
                result = await execute_func()
            else:
                result = execute_func()
            
            logger.info("Dry run completed successfully")
            return {
                "status": "success",
                "message": "Dry run completed",
                "result": result
            }
            
        except Exception as e:
            logger.error(f"Dry run failed: {str(e)}")
            return {
                "status": "error",
                "message": str(e)
            }