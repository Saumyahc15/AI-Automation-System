from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from io import BytesIO
from datetime import datetime


def generate_sales_pdf(sales_data: list, summary: str, date_str: str) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    styles = getSampleStyleSheet()
    elements = []

    elements.append(Paragraph(f"RetailAI — Daily Sales Report", styles["Title"]))
    elements.append(Paragraph(f"Date: {date_str}", styles["Normal"]))
    elements.append(Spacer(1, 12))
    elements.append(Paragraph("AI Summary", styles["Heading2"]))
    elements.append(Paragraph(summary, styles["Normal"]))
    elements.append(Spacer(1, 12))

    if sales_data:
        elements.append(Paragraph("Order Details", styles["Heading2"]))
        table_data = [["Order ID", "Customer", "Amount (₹)", "Status", "Date"]]
        for row in sales_data[:20]:
            table_data.append([
                f"#{row.get('id','')}",
                f"Customer #{row.get('customer_id','')}",
                f"₹{row.get('total_amount',0):.2f}",
                row.get('shipping_status',''),
                str(row.get('order_date',''))[:10]
            ])
        t = Table(table_data, colWidths=[60, 120, 90, 80, 90])
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1D9E75")),
            ("TEXTCOLOR",  (0, 0), (-1, 0), colors.white),
            ("FONTSIZE",   (0, 0), (-1, -1), 9),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f7f7f5")]),
            ("GRID",       (0, 0), (-1, -1), 0.25, colors.HexColor("#e4e3df")),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]))
        elements.append(t)

    doc.build(elements)
    return buffer.getvalue()