import sys
sys.path.insert(0, '.')
from app.core.database import SessionLocal
from app.models.workflow import Workflow
from app.services.ai_service import AIService
import asyncio

db = SessionLocal()

# Get all workflows
workflows = db.query(Workflow).all()
print('Current workflows:')
for w in workflows:
    print(f'  ID: {w.id}, Name: {w.name}')

print()
print('Regenerating all workflows...')

async def regenerate_all():
    for workflow in workflows:
        try:
            print(f'\nWorkflow #{workflow.id}: {workflow.name}')
            parsed = await AIService.parse_user_instruction(workflow.user_instruction)
            code = await AIService.generate_workflow_code_with_integrations(parsed)
            yaml_content = await AIService.generate_yaml(parsed)
            
            workflow.workflow_code = code
            workflow.workflow_yaml = yaml_content
            
            print(f'  ✅ Regenerated')
        except Exception as e:
            print(f'  ❌ Error: {e}')
    
    db.commit()
    print('\n✅ All workflows regenerated!')

asyncio.run(regenerate_all())
db.close()
