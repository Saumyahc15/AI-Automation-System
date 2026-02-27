"""
Quick test script to verify calendar endpoint is accessible
"""
import sys
import os

# Add the current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from app.api.routes import router
    
    # Find calendar routes
    calendar_routes = []
    for route in router.routes:
        if hasattr(route, 'path') and 'calendar' in route.path:
            methods = getattr(route, 'methods', set())
            calendar_routes.append({
                'path': route.path,
                'methods': list(methods) if methods else ['GET'],
                'name': getattr(route, 'name', 'unknown')
            })
    
    if calendar_routes:
        print("✅ Calendar routes found:")
        for route in calendar_routes:
            print(f"  {list(route['methods'])[0]} {route['path']}")
        print(f"\nFull endpoint URLs (with /api prefix):")
        for route in calendar_routes:
            method = list(route['methods'])[0]
            print(f"  {method} http://localhost:8000/api{route['path']}")
    else:
        print("❌ No calendar routes found in router")
        
    # Test calendar service import
    print("\n" + "="*50)
    print("Testing calendar service import...")
    try:
        from app.integrations.calendar_service import GoogleCalendarService, SimpleCalendarService
        print("✅ Calendar service imports successfully")
        
        # Try to initialize
        try:
            service = GoogleCalendarService()
            if service.service:
                print("✅ Calendar service initialized with credentials")
            else:
                print("⚠️  Calendar service initialized but no service object (credentials may be missing)")
        except Exception as e:
            print(f"⚠️  Calendar service initialization error: {e}")
            
    except ImportError as e:
        print(f"❌ Failed to import calendar service: {e}")
        
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()



