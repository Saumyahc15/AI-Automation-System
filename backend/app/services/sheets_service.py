import gspread
from google.oauth2.service_account import Credentials
from app.config import settings
from app.database import SessionLocal
from app.models.product import Product
from app.models.order import Order
from app.models.workflow import Workflow
from datetime import datetime, timedelta
from sqlalchemy import func
import logging
import json
from pathlib import Path
import hmac
import hashlib

logger = logging.getLogger(__name__)

SHEETS_SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
]
SHEETS_SNAPSHOT_FILE = Path("runtime/sheets_inventory_snapshot.json")


def get_sheets_client():
    creds = Credentials.from_service_account_file(
        settings.GOOGLE_SHEETS_CREDENTIALS_FILE,
        scopes=SHEETS_SCOPES
    )
    return gspread.authorize(creds)


def sync_inventory_to_sheet():
    """
    Write all products + live stock to Google Sheet.
    The sheet becomes a real-time inventory dashboard visible to all staff.
    """
    if not settings.INVENTORY_SHEET_ID:
        logger.warning("INVENTORY_SHEET_ID not set, skipping Sheets sync")
        return

    db = SessionLocal()
    try:
        gc = get_sheets_client()
        sheet = gc.open_by_key(settings.INVENTORY_SHEET_ID)

        # ── Inventory Tab ──
        try:
            inv_ws = sheet.worksheet("Inventory")
        except gspread.WorksheetNotFound:
            inv_ws = sheet.add_worksheet(title="Inventory", rows="200", cols="10")

        products = db.query(Product).filter(Product.is_active == True).all()
        rows = [["Product Name", "SKU", "Stock", "Price", "Category",
                 "Reorder Threshold", "Avg Daily Sales", "Est. Days Left",
                 "Automation Status", "Last Updated"]]
        for p in products:
            days_left = round(p.stock / p.avg_daily_sales, 1) if p.avg_daily_sales > 0 else "∞"
            rows.append([
                p.name, p.sku or "", p.stock, f"₹{p.price}",
                p.category or "", p.reorder_threshold,
                round(p.avg_daily_sales, 2), days_left, "",
                datetime.utcnow().strftime("%Y-%m-%d %H:%M")
            ])

        inv_ws.clear()
        inv_ws.update(rows)
        logger.info(f"Synced {len(products)} products to Google Sheets")

        # ── Sales Tab ──
        try:
            sales_ws = sheet.worksheet("Sales (7 days)")
        except gspread.WorksheetNotFound:
            sales_ws = sheet.add_worksheet(title="Sales (7 days)", rows="200", cols="6")

        cutoff = datetime.utcnow() - timedelta(days=7)
        results = (
            db.query(Product.name, func.sum(Order.quantity), func.sum(Order.total_price))
            .join(Order, Order.product_id == Product.product_id)
            .filter(Order.order_date >= cutoff)
            .group_by(Product.name)
            .order_by(func.sum(Order.quantity).desc())
            .all()
        )
        sales_rows = [["Product", "Units Sold (7d)", "Revenue (7d)"]]
        for name, qty, rev in results:
            sales_rows.append([name, qty or 0, f"₹{rev or 0:,.2f}"])

        sales_ws.clear()
        sales_ws.update(sales_rows)
        logger.info("Synced 7-day sales to Google Sheets")

    except Exception as e:
        logger.error(f"Google Sheets sync failed: {e}")
    finally:
        db.close()


def _load_snapshot() -> dict:
    if not SHEETS_SNAPSHOT_FILE.exists():
        return {}
    try:
        return json.loads(SHEETS_SNAPSHOT_FILE.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _save_snapshot(data: dict):
    SHEETS_SNAPSHOT_FILE.parent.mkdir(parents=True, exist_ok=True)
    SHEETS_SNAPSHOT_FILE.write_text(json.dumps(data), encoding="utf-8")


def watch_sheet_edit_triggers() -> dict:
    """
    Detect Inventory sheet cell changes and trigger matching workflows.
    Supports direct business action: set 'Automation Status' to 'reorder'
    in a row to trigger supplier communication workflows immediately.
    """
    if not settings.INVENTORY_SHEET_ID:
        return {"detected_changes": 0, "triggered_workflows": 0, "reason": "sheet_not_configured"}

    db = SessionLocal()
    detected_changes = 0
    triggered_workflows = 0
    try:
        gc = get_sheets_client()
        sheet = gc.open_by_key(settings.INVENTORY_SHEET_ID)
        inv_ws = sheet.worksheet("Inventory")
        values = inv_ws.get_all_values()
        if not values or len(values) < 2:
            return {"detected_changes": 0, "triggered_workflows": 0, "reason": "no_rows"}

        headers = values[0]
        current = {}
        for idx, row in enumerate(values[1:], start=2):
            row_data = {}
            for col_idx, h in enumerate(headers):
                row_data[h] = row[col_idx] if col_idx < len(row) else ""
            row_data["_row"] = idx
            current[str(idx)] = row_data

        previous = _load_snapshot()
        if not previous:
            _save_snapshot(current)
            return {"detected_changes": 0, "triggered_workflows": 0, "primed": True}

        active_wf = db.query(Workflow).filter(
            Workflow.is_active == True,
            Workflow.trigger_type == "sheet_edit",
        ).all()

        for row_id, now_row in current.items():
            prev_row = previous.get(row_id)
            if not prev_row:
                continue
            for column in headers:
                old_val = str(prev_row.get(column, "")).strip()
                new_val = str(now_row.get(column, "")).strip()
                if old_val == new_val:
                    continue

                detected_changes += 1
                product = None
                sku = now_row.get("SKU", "").strip()
                name = now_row.get("Product Name", "").strip()
                if sku:
                    product = db.query(Product).filter(Product.sku == sku).first()
                if not product and name:
                    product = db.query(Product).filter(Product.name == name).first()

                event = {
                    "row": now_row.get("_row"),
                    "column": column,
                    "old_value": old_val,
                    "new_value": new_val,
                }

                for wf in active_wf:
                    condition = wf.condition_json or {}
                    field = condition.get("field", "automation_status")
                    op = condition.get("operator", "==")
                    expected = condition.get("value", "reorder")

                    event_value = None
                    if field == "automation_status":
                        if column.lower() != "automation status":
                            continue
                        event_value = new_val.lower()
                    elif field == "sheet_column":
                        event_value = column
                    elif field == "sheet_value":
                        event_value = new_val
                    else:
                        # Non-sheet condition field; skip for this watcher.
                        continue

                    from app.services.execution_engine import _eval, _dispatch, _log
                    if _eval(event_value, op, str(expected).lower() if field == "automation_status" else expected):
                        item = {"type": "sheet_edit", "product": product, "sheet_event": event}
                        for action in (wf.actions_json or []):
                            _dispatch(action, item, db, wf)
                        wf.last_executed_at = datetime.utcnow()
                        db.commit()
                        _log(
                            db,
                            wf.workflow_id,
                            "success",
                            output=f"Sheet edit trigger row={event['row']} col={column} value={new_val}",
                            items=1,
                        )
                        triggered_workflows += 1

        _save_snapshot(current)
        return {"detected_changes": detected_changes, "triggered_workflows": triggered_workflows}
    except Exception as e:
        logger.error(f"Sheet edit watcher failed: {e}")
        return {"detected_changes": detected_changes, "triggered_workflows": triggered_workflows, "error": str(e)}
    finally:
        db.close()


def process_sheet_webhook_event(event: dict) -> dict:
    """
    Real-time push path for sheet edits (e.g. Google Apps Script webhook).
    Expected event fields:
    - sheet_name, row, column, column_name, old_value, new_value, product_name, sku
    """
    db = SessionLocal()
    triggered_workflows = 0
    try:
        if event.get("sheet_name") != "Inventory":
            return {"triggered_workflows": 0, "ignored": "non_inventory_sheet"}

        column = str(event.get("column_name") or event.get("column") or "")
        new_val = str(event.get("new_value", "")).strip()
        old_val = str(event.get("old_value", "")).strip()
        if new_val == old_val:
            return {"triggered_workflows": 0, "ignored": "no_change"}

        sku = str(event.get("sku", "")).strip()
        name = str(event.get("product_name", "")).strip()
        product = None
        if sku:
            product = db.query(Product).filter(Product.sku == sku).first()
        if not product and name:
            product = db.query(Product).filter(Product.name == name).first()

        active_wf = db.query(Workflow).filter(
            Workflow.is_active == True,
            Workflow.trigger_type == "sheet_edit",
        ).all()
        from app.services.execution_engine import _eval, _dispatch, _log
        for wf in active_wf:
            condition = wf.condition_json or {}
            field = condition.get("field", "automation_status")
            op = condition.get("operator", "==")
            expected = condition.get("value", "reorder")

            if field == "automation_status":
                if column.lower() != "automation status":
                    continue
                left = new_val.lower()
                right = str(expected).lower()
            elif field == "sheet_column":
                left = column
                right = expected
            elif field == "sheet_value":
                left = new_val
                right = expected
            else:
                continue

            if _eval(left, op, right):
                item = {"type": "sheet_edit", "product": product, "sheet_event": event}
                for action in (wf.actions_json or []):
                    _dispatch(action, item, db, wf)
                wf.last_executed_at = datetime.utcnow()
                db.commit()
                _log(
                    db,
                    wf.workflow_id,
                    "success",
                    output=f"Sheets webhook trigger row={event.get('row')} col={column} value={new_val}",
                    items=1,
                )
                triggered_workflows += 1

        return {"triggered_workflows": triggered_workflows}
    finally:
        db.close()


def verify_sheets_webhook_signature(raw_body: bytes, signature: str) -> bool:
    if not settings.SHEETS_WEBHOOK_SECRET:
        return True
    digest = hmac.new(
        settings.SHEETS_WEBHOOK_SECRET.encode("utf-8"),
        raw_body,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(digest, signature or "")