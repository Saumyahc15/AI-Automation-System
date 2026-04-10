from app.database import SessionLocal
from app.models import User, Supplier, Product, Workflow, UserConfig
from app.engine.watchers import trigger_stock_workflow

db = SessionLocal()

# 1. Ensure user exists and is verified
user = db.query(User).filter_by(username="testrun").first()
if not user:
    user = User(username="testrun", email="supplier_test@test.com", hashed_password="pw", is_verified=True)
    db.add(user)
    db.commit()
    db.refresh(user)
else:
    user.is_verified = True
    db.commit()

# Create dummy UserConfig with fake bot token to avoid errors
config = db.query(UserConfig).filter_by(user_id=user.id).first()
if not config:
    config = UserConfig(user_id=user.id, telegram_bot_token="fake_bot_token:12345", telegram_chat_id="fake")
    db.add(config)
    db.commit()


# 2. Assign a workflow to this user to "contact_supplier"
wf = db.query(Workflow).filter_by(user_id=user.id, name="Low stock alert").first()
if not wf:
    wf = Workflow(
        user_id=user.id,
        name="Low stock alert",
        trigger="inventory_update",
        condition={"field": "stock", "op": "<", "value": 10},
        actions=["contact_supplier"],
        is_active=True
    )
    db.add(wf)
    db.commit()

# 3. Create a supplier
sup = db.query(Supplier).filter_by(user_id=user.id, name="Test Supplier").first()
if not sup:
    sup = Supplier(
        user_id=user.id,
        name="Test Supplier",
        email="fake_supplier@example.com",
        telegram_chat_id="123456789"
    )
    db.add(sup)
    db.commit()
    db.refresh(sup)

# 4. Create a product
prod = db.query(Product).filter_by(user_id=user.id, name="Test Product").first()
if not prod:
    prod = Product(
        user_id=user.id,
        name="Test Product",
        sku="TEST-001",
        category="Electronics",
        stock=15,
        low_stock_threshold=50,
        price=10.0,
        supplier_id=sup.id
    )
    db.add(prod)
    db.commit()
    db.refresh(prod)

# 5. Drop stock to 5 (below 10)
print(f"Triggering workflow for Product {prod.name} (ID: {prod.id}), Stock dropping from {prod.stock} to 5")
prod.stock = 5
db.commit()

# 6. Run the instant workflow logic!
try:
    trigger_stock_workflow(prod.id, db)
    print("Workflow executed successfully!")
except Exception as e:
    print(f"Error executing workflow: {e}")

db.close()
