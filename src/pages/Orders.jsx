import { useQuery } from "@tanstack/react-query";
import api from "../api/client";

const statusColor = { pending: ["#FAEEDA","#854F0B"], shipped: ["#E6F1FB","#185FA5"], delivered: ["#EAF3DE","#3B6D11"], delayed: ["#FCEBEB","#A32D2D"] };
const th = { fontSize: 11, color: "var(--text2)", fontWeight: 500, textAlign: "left", padding: "8px 12px", borderBottom: "0.5px solid var(--border)", textTransform: "uppercase", letterSpacing: ".04em" };
const td = { padding: "10px 12px", borderBottom: "0.5px solid var(--border)", fontSize: 13 };

export default function Orders() {
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: () => api.get("/orders").then(r => r.data)
  });

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>Orders</h1>
        <p style={{ color: "var(--text2)", fontSize: 13, marginTop: 2 }}>{orders.length} total orders</p>
      </div>
      <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
        {isLoading ? <p style={{ padding: 24, color: "var(--text2)" }}>Loading...</p> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>{["Order ID","Customer ID","Items","Amount","Status","Date"].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
            <tbody>
              {orders.map(o => {
                const [bg, color] = statusColor[o.shipping_status] || ["var(--surface2)","var(--text2)"];
                return (
                  <tr key={o.id}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--surface2)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ ...td, fontFamily: "DM Mono, monospace", fontWeight: 500 }}>#{o.id}</td>
                    <td style={td}>Customer #{o.customer_id}</td>
                    <td style={td}>{o.items.length} item{o.items.length !== 1 ? "s" : ""}</td>
                    <td style={{ ...td, fontWeight: 500 }}>₹{o.total_amount.toFixed(2)}</td>
                    <td style={td}><span style={{ background: bg, color, padding: "2px 9px", borderRadius: 20, fontSize: 11, fontWeight: 500 }}>{o.shipping_status}</span></td>
                    <td style={{ ...td, color: "var(--text2)" }}>{new Date(o.order_date).toLocaleDateString("en-IN")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}