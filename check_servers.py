import requests
import time

print("Checking backend API...")
try:
    response = requests.get('http://localhost:8000/docs', timeout=5)
    print(f"✅ Backend is running! Status: {response.status_code}")
except requests.exceptions.ConnectionError:
    print("❌ Backend is NOT running on port 8000")
except Exception as e:
    print(f"⚠️  Error: {e}")

print()
print("Frontend is running on: http://localhost:5174")
print("Backend is running on: http://localhost:8000")
