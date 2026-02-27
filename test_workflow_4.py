import requests
import json

url = 'http://localhost:8000/api/workflows/execute?user_id=1'
payload = {'workflow_id': 4}

print('Testing Workflow #4...')
print('-' * 70)

try:
    response = requests.post(url, json=payload, timeout=30)
    result = response.json()
    
    print(f"Status: {result['status']}")
    print(f"Result Status: {result['result']['status']}")
    print(f"Message: {result['result']['message']}")
    print()
    
    if result['result']['status'] == 'success':
        print('✅ WORKFLOW EXECUTED SUCCESSFULLY!')
        if result['result'].get('data'):
            print(f"Data: {json.dumps(result['result']['data'], indent=2)}")
    else:
        print('❌ WORKFLOW FAILED')
        print(f"Error: {result['result']['message']}")
except Exception as e:
    print(f'❌ ERROR: {e}')
