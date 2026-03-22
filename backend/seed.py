import sys, os
sys.path.append(os.path.dirname(__file__))

from faker import Faker
from datetime import datetime, timedelta
import random
from app.database import SessionLocal, engine, Base
from app.models import Supplier, Product, Customer, Order, OrderItem, Workflow

fake = Faker("en_IN")
Base.metadata.create_all(bind=engine)
db = SessionLocal()

print("Seeding database...")

# --- Suppliers ---
suppliers_data = [
    {"name": "Ravi Agro Traders", "email": "ravi@agrotraders.com", "phone": "9876543210", "company": "Ravi Agro Traders Pvt Ltd"},
    {"name": "Fresh Mart Wholesale", "email": "supply@freshmart.in", "phone": "9123456780", "company": "Fresh Mart Wholesale"},
    {"name": "City Essentials Hub", "email": "orders@cityhub.co.in", "phone": "9988776655", "company": "City Essentials Hub"},
    {"name": "Gujarat Dairy Link", "email": "dairy@gujlink.com", "phone": "9765432109", "company": "Gujarat Dairy Link"},
]
suppliers = []
for s in suppliers_data:
    supplier = Supplier(**s)
    db.add(supplier)
    suppliers.append(supplier)
db.flush()
print(f"  Added {len(suppliers)} suppliers")

# --- Products ---
products_data = [
    # Grains & Pulses
    ("Basmati Rice 5kg", "Grains & Pulses", 142, 420, 15),
    ("Toor Dal 1kg", "Grains & Pulses", 8, 130, 20),
    ("Moong Dal 500g", "Grains & Pulses", 55, 78, 15),
    ("Chana Dal 1kg", "Grains & Pulses", 34, 95, 10),
    ("Wheat Flour 10kg", "Grains & Pulses", 67, 340, 20),
    ("Basmati Rice 1kg", "Grains & Pulses", 0, 110, 15),
    ("Brown Rice 1kg", "Grains & Pulses", 22, 145, 10),
    ("Masoor Dal 1kg", "Grains & Pulses", 41, 88, 10),
    # Dairy
    ("Amul Butter 500g", "Dairy", 55, 285, 10),
    ("Amul Milk 1L", "Dairy", 120, 62, 30),
    ("Paneer 200g", "Dairy", 6, 85, 15),
    ("Curd 400g", "Dairy", 38, 45, 20),
    ("Ghee 500ml", "Dairy", 14, 380, 8),
    # Oils & Condiments
    ("Sunflower Oil 1L", "Oils & Condiments", 0, 155, 12),
    ("Mustard Oil 1L", "Oils & Condiments", 29, 168, 10),
    ("Olive Oil 500ml", "Oils & Condiments", 11, 420, 5),
    ("Coconut Oil 500ml", "Oils & Condiments", 18, 210, 8),
    # Spices
    ("Turmeric Powder 200g", "Spices", 73, 48, 15),
    ("Red Chilli Powder 200g", "Spices", 61, 52, 15),
    ("Cumin Seeds 100g", "Spices", 45, 38, 10),
    ("Garam Masala 100g", "Spices", 32, 65, 10),
    ("Coriander Powder 200g", "Spices", 58, 44, 12),
    # Snacks
    ("Lay's Chips 60g", "Snacks", 90, 20, 30),
    ("Haldiram Bhujia 200g", "Snacks", 76, 60, 20),
    ("Biscuits Parle-G 800g", "Snacks", 48, 50, 20),
    ("Namkeen Mix 500g", "Snacks", 5, 75, 15),
    # Beverages
    ("Tea Powder 500g", "Beverages", 39, 175, 15),
    ("Coffee Powder 200g", "Beverages", 21, 220, 10),
    ("Horlicks 500g", "Beverages", 13, 275, 8),
    ("Bournvita 500g", "Beverages", 7, 260, 8),
    # Cleaning
    ("Surf Excel 1kg", "Cleaning", 44, 198, 12),
    ("Vim Bar 200g", "Cleaning", 62, 22, 20),
    ("Dettol Soap 75g", "Cleaning", 35, 42, 15),
]

skus = set()
products = []
for i, (name, category, stock, price, threshold) in enumerate(products_data):
    while True:
        sku = f"SKU-{random.randint(1000,9999)}"
        if sku not in skus:
            skus.add(sku)
            break
    supplier = suppliers[i % len(suppliers)]
    p = Product(name=name, sku=sku, category=category, stock=stock,
                price=price, low_stock_threshold=threshold, supplier_id=supplier.id)
    db.add(p)
    products.append(p)
db.flush()
print(f"  Added {len(products)} products")

# --- Customers ---
customers = []
for _ in range(40):
    days_ago = random.randint(1, 90)
    c = Customer(
        name=fake.name(),
        email=fake.unique.email(),
        phone=fake.phone_number()[:10],
        last_purchase=datetime.now() - timedelta(days=days_ago)
    )
    db.add(c)
    customers.append(c)
db.flush()
print(f"  Added {len(customers)} customers")

# --- Orders ---
statuses = ["pending", "shipped", "delivered", "delayed"]
for _ in range(60):
    customer = random.choice(customers)
    status = random.choices(statuses, weights=[20, 30, 40, 10])[0]
    order_date = datetime.now() - timedelta(days=random.randint(0, 30))
    order = Order(
        customer_id=customer.id,
        shipping_status=status,
        order_date=order_date,
        shipped_at=order_date + timedelta(hours=random.randint(2, 48)) if status != "pending" else None
    )
    db.add(order)
    db.flush()
    total = 0
    for _ in range(random.randint(1, 4)):
        product = random.choice(products)
        qty = random.randint(1, 5)
        item = OrderItem(order_id=order.id, product_id=product.id,
                         quantity=qty, unit_price=product.price)
        db.add(item)
        total += qty * product.price
    order.total_amount = round(total, 2)
db.flush()
print("  Added 60 orders")

# --- Sample Workflows ---
sample_workflows = [
    {
        "name": "Low stock alert",
        "description": "Notify manager and email supplier when stock drops below threshold",
        "trigger": "inventory_update",
        "condition": {"field": "stock", "op": "<", "value": 10},
        "actions": ["notify_manager", "email_supplier"]
    },
    {
        "name": "Daily sales report",
        "description": "Generate and email PDF sales report every night at 9 PM",
        "trigger": "cron_21_00",
        "condition": None,
        "actions": ["fetch_sales_data", "generate_pdf", "send_email"]
    },
    {
        "name": "Customer re-engagement",
        "description": "Send discount coupon to customers inactive for 30+ days",
        "trigger": "scheduled_check",
        "condition": {"field": "last_purchase", "op": ">", "value": "30_days"},
        "actions": ["generate_coupon", "send_sms"]
    },
]
for wf in sample_workflows:
    db.add(Workflow(**wf))

db.commit()
print("  Added 3 sample workflows")
print("\nDatabase seeded successfully!")
db.close()
