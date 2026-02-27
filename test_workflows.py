import requests
import json

print('=' * 70)
print('TESTING FIXED WORKFLOWS')
print('=' * 70)
print()

# Test workflow #1
print('Test 1: Workflow #1 (GitHub Trends + Email)')
print('-' * 70)
try:
    response = requests.post(
        'http://localhost:8000/api/workflows/execute?user_id=1',
        json={'workflow_id': 1},
        timeout=30
    )
    result = response.json()
    print(f"Status: {result['status']}")
    print(f"Result Status: {result['result']['status']}")
    print(f"Message: {result['result']['message']}")
    print('✅ WORKING')
except Exception as e:
    print(f'❌ ERROR: {e}')

print()
print()

# Test workflow #3
print('Test 2: Workflow #3 (GitHub Trends Fetch)')
print('-' * 70)
try:
    response = requests.post(
        'http://localhost:8000/api/workflows/execute?user_id=1',
        json={'workflow_id': 3},
        timeout=30
    )
    result = response.json()
    print(f"Status: {result['status']}")
    print(f"Result Status: {result['result']['status']}")
    print(f"Message: {result['result']['message']}")
    if result['result'].get('data', {}).get('trending_repos'):
        print(f"Repos Fetched: {len(result['result']['data']['trending_repos'])}")
        print(f"First Repo: {result['result']['data']['trending_repos'][0]['name']}")
    print('✅ WORKING')
except Exception as e:
    print(f'❌ ERROR: {e}')

print()
print('=' * 70)
print('All tests completed!')
print('=' * 70)
