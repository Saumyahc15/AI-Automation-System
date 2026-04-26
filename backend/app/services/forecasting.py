import logging
import numpy as np
from datetime import datetime, timedelta
from sqlalchemy import func
from app.database import SessionLocal
from app.models.product import Product
from app.models.order import Order

logger = logging.getLogger(__name__)


def calculate_avg_daily_sales(product_id: int, db, days: int = 30) -> float:
    cutoff = datetime.utcnow() - timedelta(days=days)
    result = db.query(func.sum(Order.quantity)).filter(
        Order.product_id == product_id,
        Order.order_date >= cutoff
    ).scalar()
    return round((result or 0) / days, 3)


def run_stock_forecasting() -> list:
    """
    For every product: compute avg daily sales, update the DB field,
    predict days until stockout. Return products at risk (≤ 14 days).
    """
    db = SessionLocal()
    at_risk = []
    try:
        products = db.query(Product).filter(Product.is_active == True).all()
        for p in products:
            avg = calculate_avg_daily_sales(p.product_id, db)
            p.avg_daily_sales = avg

            if avg > 0:
                days_left = round(p.stock / avg, 1)
            else:
                days_left = float("inf")

            if p.stock > 0 and days_left <= 14:
                at_risk.append({
                    "product_id": p.product_id,
                    "product_name": p.name,
                    "current_stock": p.stock,
                    "avg_daily_sales": avg,
                    "days_until_stockout": days_left,
                    "recommended_reorder_qty": int(avg * 30),
                })

        db.commit()
        logger.info(f"Forecasting complete. {len(at_risk)} products at risk.")
        return at_risk

    except Exception as e:
        logger.error(f"Forecasting failed: {e}")
        return []
    finally:
        db.close()