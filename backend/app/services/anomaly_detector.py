import logging
import numpy as np
from datetime import datetime, timedelta
from sqlalchemy import func, and_
from app.database import SessionLocal
from app.models.product import Product
from app.models.order import Order
from app.models.customer import Customer
from app.models.returns import Return
from app.services import gmail_service

logger = logging.getLogger(__name__)


def run_anomaly_detection():
    """
    Comprehensive anomaly detection across multiple patterns:
    - Dead products (0 sales for 3+ days)
    - Demand spikes (3x above average)
    - Stock anomalies (sudden depletion/increase)
    - Return rate spikes
    - Inventory velocity changes
    - Revenue per product anomalies
    - Customer purchase pattern anomalies
    - Price impact anomalies
    - Overstock situations
    """
    db = SessionLocal()
    anomalies = []
    try:
        products = db.query(Product).filter(Product.is_active == True).all()

        for p in products:
            # Pattern 1: Dead Products & Demand Spikes
            anomalies.extend(_detect_sales_anomalies(db, p))
            
            # Pattern 2: Stock Anomalies
            anomalies.extend(_detect_stock_anomalies(db, p))
            
            # Pattern 3: Return Rate Spikes
            anomalies.extend(_detect_return_anomalies(db, p))
            
            # Pattern 4: Revenue Anomalies
            anomalies.extend(_detect_revenue_anomalies(db, p))
            
            # Pattern 5: Inventory Velocity Anomalies
            anomalies.extend(_detect_velocity_anomalies(db, p))

        # Cross-product anomalies
        anomalies.extend(_detect_category_anomalies(db))
        anomalies.extend(_detect_customer_anomalies(db))

        logger.info(f"Anomaly detection: {len(anomalies)} anomalies found")
        for anomaly in anomalies:
            _send_anomaly_alert(anomaly)
        
        return anomalies

    except Exception as e:
        logger.error(f"Anomaly detection failed: {e}")
        return []
    finally:
        db.close()


# ─── SALES PATTERN DETECTION ──────────────────────────────────────────────

def _detect_sales_anomalies(db, product: Product) -> list:
    """Detect dead products, demand spikes, and sales consistency issues."""
    anomalies = []
    
    # Get last 30 days of daily sales
    daily_sales = []
    for i in range(30):
        day_start = datetime.utcnow() - timedelta(days=i+1)
        day_end = datetime.utcnow() - timedelta(days=i)
        qty = db.query(func.sum(Order.quantity)).filter(
            Order.product_id == product.product_id,
            Order.order_date >= day_start,
            Order.order_date < day_end
        ).scalar() or 0
        daily_sales.append(qty)

    if not daily_sales or sum(daily_sales) == 0:
        return anomalies

    today_sales = daily_sales[0]
    recent_avg = np.mean(daily_sales[1:8])  # Last 7 days (excluding today)
    long_avg = np.mean(daily_sales[1:])     # Last 30 days (excluding today)
    
    # PATTERN 1: Dead Product (0 sales for 3+ consecutive days when historically was selling)
    if long_avg > 0.5 and all(s == 0 for s in daily_sales[:3]):
        anomalies.append({
            "product": product.name,
            "product_id": product.product_id,
            "type": "dead_product",
            "severity": "HIGH",
            "message": f"🚫 {product.name} has had 0 sales for 3 consecutive days (historical avg: {long_avg:.1f}/day)",
            "recommendation": "Investigate demand, check competitor pricing, consider promotion"
        })
    
    # PATTERN 2: Demand Spike (3x+ above average)
    elif long_avg > 0 and today_sales >= long_avg * 3:
        anomalies.append({
            "product": product.name,
            "product_id": product.product_id,
            "type": "demand_spike",
            "severity": "MEDIUM",
            "message": f"📈 {product.name}: Sold {today_sales} units today (avg: {long_avg:.1f}/day). Spike: {today_sales/long_avg:.1f}x",
            "recommendation": "Restock urgently. Consider adjusting pricing. Check social media mentions"
        })
    
    # PATTERN 3: Severe Demand Drop (80%+ below 7-day avg)
    elif recent_avg > 1 and today_sales < recent_avg * 0.2:
        anomalies.append({
            "product": product.name,
            "product_id": product.product_id,
            "type": "demand_drop",
            "severity": "MEDIUM",
            "message": f"📉 {product.name}: Sales dropped to {today_sales} units (7-day avg: {recent_avg:.1f}/day). Down {(1 - today_sales/recent_avg)*100:.0f}%",
            "recommendation": "Review recent changes (price, visibility). Check for negative reviews"
        })
    
    # PATTERN 4: High Volatility (sales swing wildly day to day)
    if len(daily_sales) > 7:
        avg_sales = np.mean(daily_sales[:7])
        if avg_sales > 5:
            volatility = np.std(daily_sales[:7])
            volatility_ratio = volatility / (avg_sales + 0.1)
            if volatility_ratio > 2.0:  # Coefficient of variation > 2.0
                anomalies.append({
                    "product": product.name,
                    "product_id": product.product_id,
                    "type": "high_sales_volatility",
                    "severity": "LOW",
                    "message": f"⚡ {product.name} has unpredictable sales (volatility: {volatility_ratio:.2f}). Std Dev: {volatility:.1f}",
                    "recommendation": "Review demand forecasting. May need safety stock buffer"
                })
    
    return anomalies


# ─── STOCK PATTERN DETECTION ──────────────────────────────────────────────

def _detect_stock_anomalies(db, product: Product) -> list:
    """Detect stock velocity changes, overstock, and depletion anomalies."""
    anomalies = []
    
    if product.avg_daily_sales <= 0:
        return anomalies
    
    days_until_stockout = product.stock / product.avg_daily_sales if product.avg_daily_sales > 0 else float('inf')
    
    # PATTERN 5: Sudden Rapid Depletion (faster than forecasted)
    if days_until_stockout < 3 and product.avg_daily_sales > 5:
        anomalies.append({
            "product": product.name,
            "product_id": product.product_id,
            "type": "rapid_stock_depletion",
            "severity": "HIGH",
            "message": f"🔴 {product.name}: Only {days_until_stockout:.1f} days of stock left at current velocity",
            "recommendation": "URGENT: Reorder now or face stockout"
        })
    
    # PATTERN 6: Overstock (60%+ above recommended level)
    recommended_stock = product.avg_daily_sales * 30  # 30-day supply
    if product.stock > recommended_stock * 1.6:
        excess = product.stock - recommended_stock
        if excess > 50:
            anomalies.append({
                "product": product.name,
                "product_id": product.product_id,
                "type": "overstock",
                "severity": "MEDIUM",
                "message": f"📦 {product.name}: Overstocked by {excess:.0f} units ({(product.stock/recommended_stock - 1)*100:.0f}% above recommended)",
                "recommendation": "Consider discounts or bundle deals to move excess inventory"
            })
    
    # PATTERN 7: Dead Stock (very slow moving)
    if product.avg_daily_sales < 1 and product.stock > 50:
        days_to_clear = product.stock / (product.avg_daily_sales + 0.01)
        anomalies.append({
            "product": product.name,
            "product_id": product.product_id,
            "type": "dead_stock",
            "severity": "MEDIUM",
            "message": f"🐌 {product.name}: Slow mover ({product.avg_daily_sales:.2f}/day). {days_to_clear:.0f} days to clear current stock",
            "recommendation": "Mark down pricing or discontinue. Frees up storage space"
        })
    
    return anomalies


# ─── RETURN PATTERN DETECTION ────────────────────────────────────────────

def _detect_return_anomalies(db, product: Product) -> list:
    """Detect sudden spikes in return rates."""
    anomalies = []
    
    week_ago = datetime.utcnow() - timedelta(days=7)
    this_week_orders = db.query(func.count(Order.order_id)).filter(
        Order.product_id == product.product_id,
        Order.order_date >= week_ago
    ).scalar() or 0
    this_week_returns = db.query(func.count(Return.return_id)).filter(
        Return.product_id == product.product_id,
        Return.return_date >= week_ago
    ).scalar() or 0
    
    # Calculate historical return rate (last 30 days)
    month_ago = datetime.utcnow() - timedelta(days=30)
    month_orders = db.query(func.count(Order.order_id)).filter(
        Order.product_id == product.product_id,
        Order.order_date >= month_ago
    ).scalar() or 1
    month_returns = db.query(func.count(Return.return_id)).filter(
        Return.product_id == product.product_id,
        Return.return_date >= month_ago
    ).scalar() or 0
    
    historical_rate = (month_returns / month_orders * 100) if month_orders > 0 else 0
    
    # PATTERN 8: Return Rate Spike (2x above historical average)
    if this_week_orders > 0:
        current_rate = this_week_returns / this_week_orders * 100
        if historical_rate > 0 and current_rate > historical_rate * 2:
            anomalies.append({
                "product": product.name,
                "product_id": product.product_id,
                "type": "return_rate_spike",
                "severity": "HIGH",
                "message": f"⚠️ {product.name}: Return rate spiked to {current_rate:.1f}% (normal: {historical_rate:.1f}%)",
                "recommendation": "Check for quality issues. Review customer feedback immediately"
            })
    
    # PATTERN 9: Consistent High Returns (>25% return rate)
    if month_orders > 5:
        if month_returns / month_orders * 100 > 25:
            anomalies.append({
                "product": product.name,
                "product_id": product.product_id,
                "type": "chronic_high_returns",
                "severity": "HIGH",
                "message": f"🔧 {product.name}: Chronic high return rate of {month_returns/month_orders*100:.1f}% ({this_week_returns}/{this_week_orders} this week)",
                "recommendation": "Investigate product quality, manufacturing defects, or wrong product descriptions"
            })
    
    return anomalies


# ─── REVENUE PATTERN DETECTION ───────────────────────────────────────────

def _detect_revenue_anomalies(db, product: Product) -> list:
    """Detect anomalies in revenue per product."""
    anomalies = []
    
    # Revenue per unit trends
    weekly_data = []
    for i in range(4):
        week_start = datetime.utcnow() - timedelta(days=7*(i+1))
        week_end = datetime.utcnow() - timedelta(days=7*i)
        
        revenue = db.query(func.sum(Order.total_price)).filter(
            Order.product_id == product.product_id,
            Order.order_date >= week_start,
            Order.order_date < week_end
        ).scalar() or 0
        
        qty = db.query(func.sum(Order.quantity)).filter(
            Order.product_id == product.product_id,
            Order.order_date >= week_start,
            Order.order_date < week_end
        ).scalar() or 1
        
        price_per_unit = revenue / qty if qty > 0 else product.price
        weekly_data.append({
            "week": i,
            "revenue": revenue,
            "qty": qty,
            "price_per_unit": price_per_unit
        })
    
    if len(weekly_data) >= 2:
        current_price = weekly_data[0]["price_per_unit"]
        avg_historical_price = np.mean([w["price_per_unit"] for w in weekly_data[1:]])
        
        # PATTERN 10: Sudden Price Change (>15% deviation)
        if avg_historical_price > 0 and abs(current_price - avg_historical_price) / avg_historical_price > 0.15:
            change_pct = (current_price / avg_historical_price - 1) * 100
            anomalies.append({
                "product": product.name,
                "product_id": product.product_id,
                "type": "price_anomaly",
                "severity": "MEDIUM",
                "message": f"💰 {product.name}: Price changed by {change_pct:+.1f}% (₹{current_price:.2f} vs ₹{avg_historical_price:.2f})",
                "recommendation": "Verify pricing is correct. High prices may reduce sales"
            })
    
    return anomalies


# ─── INVENTORY VELOCITY ───────────────────────────────────────────────────

def _detect_velocity_anomalies(db, product: Product) -> list:
    """Detect changes in inventory turnover velocity."""
    anomalies = []
    
    # Compare turnover rate from 2 weeks ago vs last week
    two_weeks_ago = datetime.utcnow() - timedelta(days=14)
    one_week_ago = datetime.utcnow() - timedelta(days=7)
    
    older_qty = db.query(func.sum(Order.quantity)).filter(
        Order.product_id == product.product_id,
        Order.order_date >= two_weeks_ago,
        Order.order_date < one_week_ago
    ).scalar() or 0
    
    recent_qty = db.query(func.sum(Order.quantity)).filter(
        Order.product_id == product.product_id,
        Order.order_date >= one_week_ago
    ).scalar() or 0
    
    if older_qty > 10 and recent_qty < older_qty * 0.3:
        anomalies.append({
            "product": product.name,
            "product_id": product.product_id,
            "type": "velocity_slowdown",
            "severity": "LOW",
            "message": f"🐢 {product.name}: Sales velocity decreased by {(1 - recent_qty/older_qty)*100:.0f}% week-over-week",
            "recommendation": "Monitor closely. May indicate market saturation or seasonal decline"
        })
    
    return anomalies


# ─── CATEGORY-LEVEL ANOMALIES ────────────────────────────────────────────

def _detect_category_anomalies(db) -> list:
    """Detect anomalies across product categories."""
    anomalies = []
    
    categories = db.query(Product.category).filter(
        Product.is_active == True,
        Product.category != None
    ).distinct().all()
    
    for (category,) in categories:
        week_ago = datetime.utcnow() - timedelta(days=7)
        
        cat_orders = db.query(func.sum(Order.quantity)).join(
            Product, Order.product_id == Product.product_id
        ).filter(
            Product.category == category,
            Order.order_date >= week_ago
        ).scalar() or 0
        
        cat_revenue = db.query(func.sum(Order.total_price)).join(
            Product, Order.product_id == Product.product_id
        ).filter(
            Product.category == category,
            Order.order_date >= week_ago
        ).scalar() or 0
        
        if cat_orders == 0 and cat_revenue == 0:
            anomalies.append({
                "product": f"Category: {category}",
                "type": "category_dead",
                "severity": "MEDIUM",
                "message": f"📂 {category}: No sales this week",
                "recommendation": "Investigate category health. Consider promotions"
            })
    
    return anomalies


# ─── CUSTOMER BEHAVIOR ANOMALIES ──────────────────────────────────────────

def _detect_customer_anomalies(db) -> list:
    """Detect unusual customer behavior patterns."""
    anomalies = []
    
    week_ago = datetime.utcnow() - timedelta(days=7)
    
    # PATTERN: Sudden drop in new customers
    new_customers_this_week = db.query(func.count(Customer.customer_id)).filter(
        Customer.created_at >= week_ago
    ).scalar() or 0
    
    new_customers_last_week = db.query(func.count(Customer.customer_id)).filter(
        Customer.created_at >= week_ago - timedelta(days=7),
        Customer.created_at < week_ago
    ).scalar() or 1
    
    if new_customers_this_week < new_customers_last_week * 0.5:
        anomalies.append({
            "product": "Customer Acquisition",
            "type": "customer_acquisition_drop",
            "severity": "MEDIUM",
            "message": f"👥 New customer signups dropped by {(1 - new_customers_this_week/new_customers_last_week)*100:.0f}%",
            "recommendation": "Review marketing campaigns. Check if ads are still running"
        })
    
    return anomalies


# ─── ALERT SENDER ────────────────────────────────────────────────────────

def _send_anomaly_alert(anomaly: dict):
    """Send alert email for detected anomalies."""
    severity_emoji = {
        "HIGH": "🚨",
        "MEDIUM": "⚠️",
        "LOW": "ℹ️"
    }
    
    try:
        severity = anomaly.get("severity", "LOW")
        emoji = severity_emoji.get(severity, "ℹ️")
        
        subject = f"{emoji} Anomaly Alert: {anomaly['type'].replace('_', ' ').title()}"
        
        body = f"""
        <div style="font-family:Arial,sans-serif;max-width:600px;padding:24px;border:1px solid #eee;border-radius:8px">
            <h2 style="color:#{'dc2626' if severity == 'HIGH' else 'f59e0b' if severity == 'MEDIUM' else '3b82f6'}">{emoji} {anomaly['type'].replace('_', ' ').title()}</h2>
            <p><strong>Product:</strong> {anomaly.get('product', 'N/A')}</p>
            <p><strong>Message:</strong> {anomaly['message']}</p>
            <p><strong>Recommendation:</strong> {anomaly.get('recommendation', 'Monitor situation')}</p>
            <p style="color:#6b7280;font-size:12px;margin-top:16px">Detected by AI Anomaly Detection at {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}</p>
        </div>
        """
        
        gmail_service.send_email(
            gmail_service.settings.MANAGER_EMAIL,
            subject,
            body
        )
    except Exception as e:
        logger.error(f"Failed to send anomaly alert: {e}")