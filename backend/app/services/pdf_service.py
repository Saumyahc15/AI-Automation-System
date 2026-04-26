from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.platypus import Table, TableStyle
from sqlalchemy import func
from app.models.order import Order
from app.models.product import Product
from app.models.customer import Customer
from datetime import datetime, timedelta
from reportlab.graphics.shapes import Drawing
from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.graphics.charts.piecharts import Pie
import os
import tempfile

def draw_bar_chart(c, x, y, data, labels, title="Chart"):
    d = Drawing(400, 200)
    bc = VerticalBarChart()
    bc.x = 0
    bc.y = 0
    bc.height = 150
    bc.width = 350
    
    # Handle None in data
    safe_data = [d if d is not None else 0 for d in data]
    bc.data = [safe_data]
    
    bc.strokeColor = colors.white
    bc.valueAxis.valueMin = 0
    max_val = max(safe_data) if safe_data else 10
    bc.valueAxis.valueMax = max_val * 1.2 if max_val > 0 else 10
    bc.valueAxis.valueStep = max(1, int(bc.valueAxis.valueMax / 5))
    bc.categoryAxis.labels.boxAnchor = 'n'
    bc.categoryAxis.labels.dy = -5
    bc.categoryAxis.labels.angle = 0
    bc.categoryAxis.categoryNames = [str(lbl)[:10] for lbl in labels]
    
    # Custom colors
    bc.bars[0].fillColor = colors.HexColor("#1357ba")
        
    d.add(bc)
    
    c.setFont("Helvetica-Bold", 12)
    c.drawString(x, y + 20, title)
    d.drawOn(c, x, y - 150)
    return y - 180


def generate_sales_report(db, ai_narrative: str = "", target_date=None) -> str:
    today = target_date if target_date else datetime.utcnow().date()
    start = datetime.combine(today, datetime.min.time())
    end = datetime.combine(today, datetime.max.time()) if target_date else datetime.utcnow()

    # Gather data
    orders_today = db.query(Order).filter(Order.order_date >= start, Order.order_date <= end).all()
    total_orders = len(orders_today)
    total_revenue = sum(o.total_price for o in orders_today)

    # Top products
    top_products = (
        db.query(Product.name, func.sum(Order.quantity).label("qty"))
        .join(Order, Order.product_id == Product.product_id)
        .filter(Order.order_date >= start, Order.order_date <= end)
        .group_by(Product.name)
        .order_by(func.sum(Order.quantity).desc())
        .limit(5)
        .all()
    )

    # New customers today
    new_customers = db.query(Customer).filter(Customer.created_at >= start, Customer.created_at <= end).count()

    filename = os.path.join(tempfile.gettempdir(), f"sales_report_{today}.pdf")
    c = canvas.Canvas(filename, pagesize=A4)
    width, height = A4

    # Header
    c.setFillColorRGB(0.07, 0.35, 0.73)
    c.rect(0, height - 80, width, 80, fill=1, stroke=0)
    c.setFillColorRGB(1, 1, 1)
    c.setFont("Helvetica-Bold", 20)
    c.drawString(40, height - 45, "Daily Sales Report")
    c.setFont("Helvetica", 12)
    c.drawString(40, height - 65, f"Generated: {datetime.utcnow().strftime('%d %b %Y, %H:%M UTC')}")

    # Stats
    c.setFillColorRGB(0, 0, 0)
    y = height - 130
    c.setFont("Helvetica-Bold", 14)
    c.drawString(40, y, "Summary")
    y -= 25
    c.setFont("Helvetica", 12)
    for label, val in [
        ("Total Orders", str(total_orders)),
        ("Total Revenue", f"₹{total_revenue:,.2f}"),
        ("New Customers", str(new_customers)),
    ]:
        c.drawString(60, y, f"{label}:")
        c.setFont("Helvetica-Bold", 12)
        c.drawString(250, y, val)
        c.setFont("Helvetica", 12)
        y -= 20

    # AI narrative
    if ai_narrative:
        y -= 10
        c.setFont("Helvetica-Bold", 14)
        c.drawString(40, y, "AI Insight Summary")
        y -= 18
        c.setFont("Helvetica", 10)
        for line in [ln.strip() for ln in ai_narrative.split("\n") if ln.strip()]:
            c.drawString(50, y, line[:110])
            y -= 14
            if y < 140:
                c.showPage()
                y = A4[1] - 60

    if top_products:
        y = draw_bar_chart(c, 40, y - 40, [p[1] for p in top_products], [p[0] for p in top_products], "Top Products by Volume")

    # Top products table
    y -= 20
    c.setFont("Helvetica-Bold", 14)
    c.drawString(40, y, "Top Products Detailed")
    y -= 20
    if top_products:
        table_data = [["Product", "Units Sold"]] + [[p[0], str(p[1])] for p in top_products]
        t = Table(table_data, colWidths=[380, 100])
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1357ba")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f0f4ff")]),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cccccc")),
            ("FONTSIZE", (0, 0), (-1, -1), 10),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]))
        t.wrapOn(c, width - 80, 200)
        t.drawOn(c, 40, y - len(table_data) * 22)

    c.save()
    return filename

def generate_inventory_report(db, target_date=None) -> str:
    today = target_date if target_date else datetime.utcnow().date()
    
    products = db.query(Product).filter(Product.is_active == True).all()
    total_products = len(products)
    low_stock = [p for p in products if p.stock > 0 and p.stock < p.reorder_threshold]
    out_of_stock = [p for p in products if p.stock == 0]
    total_value = sum(p.stock * p.price for p in products)

    filename = os.path.join(tempfile.gettempdir(), f"inventory_report_{today}.pdf")
    c = canvas.Canvas(filename, pagesize=A4)
    width, height = A4

    c.setFillColorRGB(0.07, 0.35, 0.73)
    c.rect(0, height - 80, width, 80, fill=1, stroke=0)
    c.setFillColorRGB(1, 1, 1)
    c.setFont("Helvetica-Bold", 20)
    c.drawString(40, height - 45, "Inventory Report")
    c.setFont("Helvetica", 12)
    c.drawString(40, height - 65, f"Generated: {datetime.utcnow().strftime('%d %b %Y, %H:%M UTC')}")

    c.setFillColorRGB(0, 0, 0)
    y = height - 130
    c.setFont("Helvetica-Bold", 14)
    c.drawString(40, y, "Summary")
    y -= 25
    c.setFont("Helvetica", 12)
    for label, val in [
        ("Total Products", str(total_products)),
        ("Low Stock Items", str(len(low_stock))),
        ("Out of Stock Items", str(len(out_of_stock))),
        ("Total Inventory Value", f"₹{total_value:,.2f}"),
    ]:
        c.drawString(60, y, f"{label}:")
        c.setFont("Helvetica-Bold", 12)
        c.drawString(250, y, val)
        c.setFont("Helvetica", 12)
        y -= 20

    # Draw inventory breakdown chart
    cat_data = db.query(Product.category, func.count(Product.product_id)).group_by(Product.category).all()
    if cat_data:
        y -= 20
        y = draw_bar_chart(c, 40, y - 40, [cd[1] for cd in cat_data], [cd[0] for cd in cat_data], "Products by Category")

    y -= 20
    c.setFont("Helvetica-Bold", 14)
    c.drawString(40, y, "Critical Items (Out of Stock / Low Stock)")
    y -= 20
    
    critical_items = out_of_stock + low_stock
    if critical_items:
        critical_items = critical_items[:15]
        table_data = [["Product", "Stock", "Threshold"]] + [[p.name, str(p.stock), str(p.reorder_threshold)] for p in critical_items]
        t = Table(table_data, colWidths=[300, 90, 90])
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1357ba")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f0f4ff")]),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cccccc")),
            ("FONTSIZE", (0, 0), (-1, -1), 10),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]))
        t.wrapOn(c, width - 80, 400)
        t.drawOn(c, 40, y - len(table_data) * 22)

    c.save()
    return filename

def generate_customer_report(db, target_date=None) -> str:
    today = target_date if target_date else datetime.utcnow().date()
    
    start = datetime.combine(today, datetime.min.time())
    end = datetime.combine(today, datetime.max.time()) if target_date else datetime.utcnow()
    thirty_days_ago = end - timedelta(days=30)
    
    total_customers = db.query(Customer).count()
    new_customers = db.query(Customer).filter(Customer.created_at >= start, Customer.created_at <= end).count()
    inactive_customers = db.query(Customer).filter(Customer.last_purchase_date < thirty_days_ago).count()
    
    top_customers = (
        db.query(Customer.name, Customer.lifetime_value)
        .order_by(Customer.lifetime_value.desc())
        .limit(10)
        .all()
    )

    filename = os.path.join(tempfile.gettempdir(), f"customer_report_{today}.pdf")
    c = canvas.Canvas(filename, pagesize=A4)
    width, height = A4

    c.setFillColorRGB(0.07, 0.35, 0.73)
    c.rect(0, height - 80, width, 80, fill=1, stroke=0)
    c.setFillColorRGB(1, 1, 1)
    c.setFont("Helvetica-Bold", 20)
    c.drawString(40, height - 45, "Customer Report")
    c.setFont("Helvetica", 12)
    c.drawString(40, height - 65, f"Generated: {datetime.utcnow().strftime('%d %b %Y, %H:%M UTC')}")

    c.setFillColorRGB(0, 0, 0)
    y = height - 130
    c.setFont("Helvetica-Bold", 14)
    c.drawString(40, y, "Summary")
    y -= 25
    c.setFont("Helvetica", 12)
    
    for label, val in [
        ("Total Customers", str(total_customers)),
        ("New Customers (Selected Date)", str(new_customers)),
        ("Inactive Customers (>30 days)", str(inactive_customers)),
    ]:
        c.drawString(60, y, f"{label}:")
        c.setFont("Helvetica-Bold", 12)
        c.drawString(280, y, val)
        c.setFont("Helvetica", 12)
        y -= 20

    y = draw_bar_chart(c, 40, y - 40, [total_customers, new_customers, inactive_customers], ["Total", "New", "Inactive"], "Customer Base Breakdown")

    y -= 20
    c.setFont("Helvetica-Bold", 14)
    c.drawString(40, y, "Top 10 Customers & Recent Purchases")
    y -= 20
    
    top_customers_query = db.query(Customer).order_by(Customer.lifetime_value.desc()).limit(10).all()
    
    if top_customers_query:
        for cust in top_customers_query:
            cust_products = db.query(Product.name).join(Order, Order.product_id == Product.product_id)\
                .filter(Order.customer_id == cust.customer_id).limit(3).all()
            products_str = ", ".join([p[0][:30] for p in cust_products]) if cust_products else "No recorded items"
            
            c.setFont("Helvetica-Bold", 11)
            c.drawString(40, y, f"• {cust.name} (LTV: ₹{cust.lifetime_value:,.2f})")
            y -= 15
            c.setFont("Helvetica", 10)
            c.drawString(55, y, f"Bought: {products_str}")
            y -= 25
            
            if y < 100:
                c.showPage()
                y = height - 60

    c.save()
    return filename

def generate_custom_report_pdf(db, report_config: dict, result_data: dict) -> str:
    import json
    today = datetime.utcnow().date()
    filename = os.path.join(tempfile.gettempdir(), f"custom_report_{today}.pdf")
    c = canvas.Canvas(filename, pagesize=A4)
    width, height = A4

    c.setFillColorRGB(0.07, 0.35, 0.73)
    c.rect(0, height - 80, width, 80, fill=1, stroke=0)
    c.setFillColorRGB(1, 1, 1)
    c.setFont("Helvetica-Bold", 20)
    report_name = report_config.get("name", "Custom Report")
    c.drawString(40, height - 45, report_name[:40])
    c.setFont("Helvetica", 12)
    c.drawString(40, height - 65, f"Generated: {datetime.utcnow().strftime('%d %b %Y, %H:%M UTC')}")

    c.setFillColorRGB(0, 0, 0)
    y = height - 130
    c.setFont("Helvetica-Bold", 14)
    c.drawString(40, y, "Report Summary")
    y -= 25
    c.setFont("Helvetica", 12)
    
    data = result_data.get("data", {})
    
    # Format primitive keys
    for key, value in data.items():
        if isinstance(value, (list, dict)):
            continue
            
        formatted_key = key.replace("_", " ").title()
        formatted_val = str(value)
        if "revenue" in key.lower() or "value" in key.lower():
            try:
                formatted_val = f"₹{float(value):,.2f}"
            except:
                pass
                
        c.drawString(60, y, f"{formatted_key}:")
        c.setFont("Helvetica-Bold", 12)
        c.drawString(250, y, formatted_val)
        c.setFont("Helvetica", 12)
        y -= 20
        if y < 100:
            c.showPage()
            y = height - 60

    y -= 20
    
    # Draw optional chart
    chart_data = result_data.get("chart_data")
    chart_labels = result_data.get("chart_labels")
    chart_title = result_data.get("chart_title", "Chart")
    if chart_data and chart_labels:
        y -= 20
        y = draw_bar_chart(c, 40, y - 40, chart_data, chart_labels, chart_title)
        y -= 20

    # Draw optional bullet points (Customer Report)
    top_customers_recent = result_data.get("top_customers_recent")
    if top_customers_recent:
        c.setFont("Helvetica-Bold", 14)
        c.drawString(40, y, "Top Customers & Recent Purchases")
        y -= 20
        for cust in top_customers_recent:
            ltv_val = cust['ltv'] if cust['ltv'] else 0.0
            c.setFont("Helvetica-Bold", 11)
            c.drawString(40, y, f"• {cust['name']} (LTV: ₹{ltv_val:,.2f})")
            y -= 15
            c.setFont("Helvetica", 10)
            c.drawString(55, y, f"Bought: {cust['products']}")
            y -= 25
            if y < 100:
                c.showPage()
                y = height - 60

    # Check for lists to draw as tables
    for key, value in data.items():
        if isinstance(value, list) and value:
            c.setFont("Helvetica-Bold", 14)
            c.drawString(40, y, key.replace("_", " ").title())
            y -= 20
            
            headers = list(value[0].keys())
            formatted_headers = [h.replace("_", " ").title() for h in headers]
            
            table_data = [formatted_headers]
            for item in value:
                row = []
                for h in headers:
                    val = item.get(h, "")
                    if "revenue" in h.lower() or "value" in h.lower() or "price" in h.lower():
                        try:
                            val = f"₹{float(val):,.2f}"
                        except:
                            pass
                    row.append(str(val))
                table_data.append(row)
                
            col_widths = [min(380 / len(headers), 200)] * len(headers)
            if len(headers) == 3:
                col_widths = [200, 90, 90]
            elif len(headers) == 2:
                col_widths = [280, 100]
                
            t = Table(table_data, colWidths=col_widths)
            t.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1357ba")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f0f4ff")]),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cccccc")),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]))
            t.wrapOn(c, width - 80, 400)
            t.drawOn(c, 40, y - len(table_data) * 22)
            y -= (len(table_data) * 22 + 40)
            
            if y < 100:
                c.showPage()
                y = height - 60

    c.save()
    return filename