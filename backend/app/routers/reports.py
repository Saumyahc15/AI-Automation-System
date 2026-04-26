"""
Reports router — real report generation, listing, and scheduling.
Reports are powered by workflow executions + on-demand generation.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from app.database import get_db
from app.models.user import User
from app.models.order import Order
from app.models.product import Product
from app.models.customer import Customer
from app.models.workflow import Workflow
from app.models.workflow_log import WorkflowLog
from app.services.auth_service import get_current_user, check_manager

router = APIRouter()


@router.get("/")
def list_reports(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    List real report records — derived from report-generating workflow executions
    plus any cron-scheduled report workflows.
    """
    # Get all workflows that include report generation actions
    report_workflows = db.query(Workflow).filter(
        Workflow.is_active == True,
    ).all()

    report_wfs = [
        wf for wf in report_workflows
        if any(
            a in (wf.actions_json or [])
            for a in ["generate_pdf_report", "send_ai_morning_summary"]
        )
    ]

    reports = []
    for wf in report_wfs:
        # Get latest log for this workflow
        latest_log = db.query(WorkflowLog).filter(
            WorkflowLog.workflow_id == wf.workflow_id
        ).order_by(WorkflowLog.executed_at.desc()).first()

        last_status = "scheduled"
        last_sent = None
        error_message = None
        if latest_log:
            last_status = "sent" if latest_log.status == "success" else "failed"
            last_sent = latest_log.executed_at.strftime("%Y-%m-%d %H:%M") if latest_log.executed_at else None
            error_message = latest_log.error_message

        report_type = "sales"
        if "send_ai_morning_summary" in (wf.actions_json or []):
            report_type = "summary"
        elif wf.trigger_type == "inventory_check":
            report_type = "inventory"
        elif wf.trigger_type == "customer_check":
            report_type = "customers"
        elif wf.trigger_type == "return_check":
            report_type = "returns"

        reports.append({
            "id": f"RPT-{wf.workflow_id:03d}",
            "workflow_id": wf.workflow_id,
            "name": wf.natural_language_input[:80],
            "type": report_type,
            "schedule": wf.frequency or "every_15_min",
            "frequency": wf.frequency or "every_15_min",
            "status": last_status,
            "recipients": [current_user.email] if current_user else [],
            "last_sent": last_sent,
            "next_send": "Automatic (scheduler)",
            "format": "PDF",
            "metrics_included": wf.actions_json or [],
            "created_at": wf.created_at.strftime("%Y-%m-%d") if wf.created_at else "",
            "enabled": wf.is_active,
            "error_message": error_message,
        })

    # Also add any recent one-off report logs (non-workflow PDF generations)
    recent_report_logs = db.query(WorkflowLog).filter(
        WorkflowLog.output.ilike("%report%"),
        WorkflowLog.executed_at >= datetime.utcnow() - timedelta(days=30),
    ).order_by(WorkflowLog.executed_at.desc()).limit(5).all()

    for log in recent_report_logs:
        # Avoid duplicates
        if any(r["workflow_id"] == log.workflow_id for r in reports):
            continue
        reports.append({
            "id": f"RPT-LOG-{log.log_id}",
            "workflow_id": log.workflow_id,
            "name": f"Auto Report (Workflow #{log.workflow_id})",
            "type": "auto",
            "schedule": "one-time",
            "frequency": "one-time",
            "status": "sent" if log.status == "success" else "failed",
            "recipients": [],
            "last_sent": log.executed_at.strftime("%Y-%m-%d %H:%M") if log.executed_at else None,
            "next_send": "N/A",
            "format": "PDF",
            "metrics_included": [],
            "created_at": log.executed_at.strftime("%Y-%m-%d") if log.executed_at else "",
            "enabled": False,
            "error_message": log.error_message,
        })

    return reports


@router.get("/metrics")
def report_metrics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Summary metrics for the reports dashboard."""
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    total_logs = db.query(WorkflowLog).count()
    sent_today = db.query(WorkflowLog).filter(
        WorkflowLog.executed_at >= today,
        WorkflowLog.status == "success"
    ).count()
    failed = db.query(WorkflowLog).filter(
        WorkflowLog.status == "failed",
        WorkflowLog.executed_at >= datetime.utcnow() - timedelta(days=7)
    ).count()
    scheduled = db.query(Workflow).filter(
        Workflow.is_active == True,
    ).count()

    return {
        "total_reports": total_logs,
        "scheduled": scheduled,
        "sent_today": sent_today,
        "failed": failed,
    }


@router.post("/generate-now")
def generate_report_now(
    report_type: str = "sales",
    current_user: User = Depends(check_manager),
    db: Session = Depends(get_db),
):
    """Generate and send a report immediately using real data."""
    if report_type == "sales":
        from app.services.pdf_service import generate_sales_report
        from app.services.llm_parser import generate_sales_report_narrative
        narrative = generate_sales_report_narrative(db)
        pdf_path = generate_sales_report(db, ai_narrative=narrative)
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        total_orders = db.query(func.count(Order.order_id)).filter(Order.order_date >= today_start).scalar() or 0
        revenue = db.query(func.sum(Order.total_price)).filter(Order.order_date >= today_start).scalar() or 0
        from app.services.gmail_service import send_daily_sales_report
        send_daily_sales_report(
            pdf_path, 
            total_orders, 
            revenue, 
            ai_narrative=narrative, 
            to_email=current_user.email,
            user_id=current_user.user_id
        )
        return {
            "status": "sent",
            "type": "sales",
            "pdf_path": pdf_path,
            "total_orders": total_orders,
            "revenue": round(revenue, 2),
            "narrative": narrative,
        }
    elif report_type == "morning_summary":
        from app.services.llm_parser import generate_morning_summary
        from app.services.gmail_service import send_ai_morning_summary
        summary = generate_morning_summary(db)
        send_ai_morning_summary(summary)
        return {"status": "sent", "type": "morning_summary", "summary": summary}
    else:
        raise HTTPException(status_code=400, detail=f"Unknown report type: {report_type}")


@router.post("/custom/generate")
def generate_custom_report(
    data: dict,
    current_user: User = Depends(check_manager),
    db: Session = Depends(get_db),
):
    """Generate a custom report based on user-selected metrics and filters."""
    report_type = data.get("type", "sales")
    metrics = data.get("metrics", [])
    date_range = data.get("dateRange", {})

    start_str = date_range.get("startDate")
    end_str = date_range.get("endDate")

    start = datetime.fromisoformat(start_str) if start_str else datetime.utcnow() - timedelta(days=30)
    end = datetime.fromisoformat(end_str) if end_str else datetime.utcnow()

    result = {"type": report_type, "date_range": {"start": str(start), "end": str(end)}, "data": {}}

    # Sales metrics
    if report_type == "sales" or any(m in metrics for m in ["total_revenue", "order_count", "avg_order_value", "top_products", "repeat_customers", "customer_ltv"]):
        total_orders = db.query(func.count(Order.order_id)).filter(
            Order.order_date >= start, Order.order_date <= end
        ).scalar() or 0
        total_revenue = db.query(func.sum(Order.total_price)).filter(
            Order.order_date >= start, Order.order_date <= end
        ).scalar() or 0
        avg_order = round(total_revenue / max(total_orders, 1), 2)

        top = db.query(
            Product.name, func.sum(Order.quantity).label("qty"),
            func.sum(Order.total_price).label("rev")
        ).join(Order, Order.product_id == Product.product_id).filter(
            Order.order_date >= start, Order.order_date <= end
        ).group_by(Product.name).order_by(func.sum(Order.quantity).desc()).limit(5).all()

        if "total_revenue" in metrics or not metrics:
            result["data"]["total_revenue"] = round(total_revenue, 2)
        if "order_count" in metrics or not metrics:
            result["data"]["total_orders"] = total_orders
        if "avg_order_value" in metrics or not metrics:
            result["data"]["avg_order_value"] = avg_order
        if "top_products" in metrics or not metrics:
            result["data"]["top_products"] = [
                {"name": t[0], "units": t[1], "revenue": round(t[2], 2)} for t in top
            ]
        if "repeat_customers" in metrics or not metrics:
            repeat_customers_count = db.query(Order.customer_id).filter(Order.order_date >= start, Order.order_date <= end).group_by(Order.customer_id).having(func.count(Order.order_id) > 1).count()
            total_unique_customers = db.query(Order.customer_id).filter(Order.order_date >= start, Order.order_date <= end).distinct().count()
            result["data"]["repeat_customers"] = f"{round((repeat_customers_count / max(total_unique_customers, 1)) * 100, 1)}%"
        if "customer_ltv" in metrics or not metrics:
            avg_ltv = db.query(func.avg(Customer.lifetime_value)).scalar() or 0
            result["data"]["customer_ltv"] = f"₹{avg_ltv:,.2f}"
            
        result["chart_data"] = [round(t[2], 2) for t in top]
        result["chart_labels"] = [t[0] for t in top]
        result["chart_title"] = "Top Products Revenue"

    # Inventory metrics
    if report_type == "inventory" or any(m in metrics for m in ["stock_levels", "critical_items", "low_stock", "overstock", "inventory_value", "stockout_forecast", "turnover_rate"]):
        products = db.query(Product).filter(Product.is_active == True).all()
        
        if "stock_levels" in metrics or not metrics:
            result["data"]["total_products"] = len(products)
        if "low_stock" in metrics or not metrics:
            result["data"]["low_stock_count"] = sum(1 for p in products if p.stock > 0 and p.stock < p.reorder_threshold)
        if "inventory_value" in metrics or not metrics:
            result["data"]["total_inventory_value"] = round(sum(p.stock * p.price for p in products), 2)
        if "critical_items" in metrics or not metrics:
            critical = [p for p in products if p.stock <= p.reorder_threshold]
            result["data"]["critical_items"] = [{"name": p.name, "stock": p.stock, "threshold": p.reorder_threshold} for p in critical[:10]]
        if "overstock" in metrics or not metrics:
            result["data"]["overstock_items"] = sum(1 for p in products if p.stock > p.reorder_threshold * 3)
        if "stockout_forecast" in metrics or not metrics:
            # Items sold in last 7 days vs stock
            seven_days_ago = datetime.utcnow() - timedelta(days=7)
            recent_sales = db.query(Order.product_id, func.sum(Order.quantity)).filter(Order.order_date >= seven_days_ago).group_by(Order.product_id).all()
            depleting = 0
            for pid, sold_qty in recent_sales:
                p = next((p for p in products if p.product_id == pid), None)
                if p and p.stock < (sold_qty * 2): # Less than 14 days of stock
                    depleting += 1
            result["data"]["items_depleting_soon"] = depleting
        if "turnover_rate" in metrics or not metrics:
            thirty_days_ago = datetime.utcnow() - timedelta(days=30)
            total_sold_qty = db.query(func.sum(Order.quantity)).filter(Order.order_date >= thirty_days_ago).scalar() or 0
            total_inventory_qty = sum(p.stock for p in products)
            result["data"]["turnover_rate"] = f"{round(total_sold_qty / max(total_inventory_qty, 1), 2)}x per month"
            
        cat_data = db.query(Product.category, func.count(Product.product_id)).group_by(Product.category).all()
        if cat_data:
            result["chart_data"] = [cd[1] for cd in cat_data]
            result["chart_labels"] = [cd[0] for cd in cat_data]
            result["chart_title"] = "Products by Category"

    # Customers metrics
    if report_type == "customers" or any(m in metrics for m in ["new_customers", "active_customers", "churn_rate", "at_risk", "ltv_distribution", "retention_rate"]):
        total_customers = db.query(Customer).count()
        new_in_period = db.query(Customer).filter(
            Customer.created_at >= start
        ).count()
        inactive_30 = db.query(Customer).filter(
            Customer.last_purchase_date < datetime.utcnow() - timedelta(days=30)
        ).count()
        
        if "new_customers" in metrics or not metrics:
            result["data"]["new_customers"] = new_in_period
        if "active_customers" in metrics or not metrics:
            result["data"]["active_customers"] = total_customers - inactive_30
        if "churn_rate" in metrics or not metrics:
            result["data"]["churn_rate"] = f"{round((inactive_30 / max(total_customers, 1)) * 100, 1)}%"
        if "at_risk" in metrics or not metrics:
            result["data"]["at_risk_customers"] = inactive_30
        if "retention_rate" in metrics or not metrics:
            result["data"]["retention_rate"] = f"{round(((total_customers - inactive_30) / max(total_customers, 1)) * 100, 1)}%"
        if "ltv_distribution" in metrics or not metrics:
            avg_ltv = db.query(func.avg(Customer.lifetime_value)).scalar() or 0
            result["data"]["avg_lifetime_value"] = f"₹{avg_ltv:,.2f}"
            
        result["chart_data"] = [total_customers, new_in_period, inactive_30]
        result["chart_labels"] = ["Total", "New", "Inactive"]
        result["chart_title"] = "Customer Segments"
        
        # Pass Top 10 for bullet points in PDF
        top_c = db.query(Customer).order_by(Customer.lifetime_value.desc()).limit(10).all()
        result["top_customers_recent"] = []
        for c in top_c:
            c_prods = db.query(Product.name).join(Order, Order.product_id == Product.product_id)\
                .filter(Order.customer_id == c.customer_id).limit(3).all()
            p_str = ", ".join([p[0][:30] for p in c_prods]) if c_prods else "No items"
            result["top_customers_recent"].append({"name": c.name, "ltv": c.lifetime_value, "products": p_str})

    # Performance metrics
    if report_type == "performance":
        total_rev = db.query(func.sum(Order.total_price)).filter(Order.order_date >= start, Order.order_date <= end).scalar() or 0
        last_month_start = start - timedelta(days=30)
        last_month_end = end - timedelta(days=30)
        last_rev = db.query(func.sum(Order.total_price)).filter(Order.order_date >= last_month_start, Order.order_date <= last_month_end).scalar() or 0
        
        growth = round(((total_rev - last_rev) / max(last_rev, 1)) * 100, 1) if last_rev else 100.0
        
        result["data"]["revenue_trend"] = f"{'+' if growth >= 0 else ''}{growth}% vs last period"
        result["data"]["growth_rate"] = f"{growth}%"
        
        # Trend chart data (REAL trailing 4 months)
        months_data = []
        months_labels = []
        for i in range(3, -1, -1):
            m_start = datetime.utcnow() - timedelta(days=(i+1)*30)
            m_end = datetime.utcnow() - timedelta(days=i*30)
            m_rev = db.query(func.sum(Order.total_price)).filter(Order.order_date >= m_start, Order.order_date <= m_end).scalar() or 0
            months_data.append(round(m_rev, 2))
            months_labels.append(m_start.strftime("%b"))
            
        result["chart_data"] = months_data
        result["chart_labels"] = months_labels
        result["chart_title"] = "Revenue Trend (4 Months)"

    from app.services.pdf_service import generate_custom_report_pdf
    from app.services.gmail_service import send_custom_report
    
    # Save as template if requested
    if data.get("savedAsTemplate") and current_user:
        new_wf = Workflow(
            user_id=current_user.user_id,
            natural_language_input=f"Custom {report_type.title()} Report Template: {data.get('name', 'Template')}",
            trigger_type="report_template",
            condition_json={"saved_as_template": True},
            actions_json=[data],
            is_active=False
        )
        db.add(new_wf)
        db.commit()
    
    # If the report is meant to be exported or scheduled right away, generate and email it
    # The frontend allows users to generate and "Save Report". Let's send them a copy via email right now
    if current_user:
        try:
            pdf_path = generate_custom_report_pdf(db, data, result)
            send_custom_report(pdf_path, data.get("name", "Custom Report"), to_email=current_user.email, user_id=current_user.user_id)
        except Exception as e:
            pass # Continue to return result even if email fails

    return result

@router.get("/templates")
def get_templates(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Return built-in report templates and user saved templates."""
    templates = [
        {
            "id": "tpl_sales_daily",
            "name": "Daily Sales Summary",
            "type": "sales",
            "metrics": ["total_revenue", "order_count", "avg_order_value", "top_products"],
            "frequency": "daily",
        },
        {
            "id": "tpl_inventory_health",
            "name": "Inventory Health Check",
            "type": "inventory",
            "metrics": ["stock_levels", "critical_items", "low_stock", "stockout_forecast"],
            "frequency": "daily",
        },
        {
            "id": "tpl_customer_churn",
            "name": "Customer Churn Risk",
            "type": "customers",
            "metrics": ["churn_rate", "at_risk", "retention_rate"],
            "frequency": "weekly",
        },
        {
            "id": "tpl_morning_summary",
            "name": "Morning Summary Brief",
            "type": "summary",
            "metrics": ["ai_narrative", "key_insights", "action_items"],
            "frequency": "daily",
        },
    ]

    if current_user:
        saved_templates = db.query(Workflow).filter(
            Workflow.trigger_type == "report_template",
            Workflow.user_id == current_user.user_id
        ).all()
        
        for wf in saved_templates:
            if wf.actions_json and len(wf.actions_json) > 0:
                config = wf.actions_json[0]
                templates.append({
                    "id": f"tpl_custom_{wf.workflow_id}",
                    "name": config.get("name", "Custom Template"),
                    "type": config.get("type", "sales"),
                    "metrics": config.get("metrics", []),
                    "frequency": "custom",
                    "isCustom": True
                })

    return templates
