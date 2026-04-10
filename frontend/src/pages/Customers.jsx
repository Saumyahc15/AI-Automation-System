import { useQuery } from "@tanstack/react-query";
import api from "../api/client";

const th = { fontSize: 11, color: "var(--text2)", fontWeight: 500, textAlign: "left", padding: "8px 12px", borderBottom: "0.5px solid var(--border)", textTransform: "uppercase", letterSpacing: ".04em" };
const td = { padding: "10px 12px", borderBottom: "0.5px solid var(--border)", fontSize: 13 };

export default function Customers() {
  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: () => api.get("/customers").then(r => r.data)
  });

  const now = new Date();
  const daysSince = (date) => date ? Math.floor((now - new Date(date)) / 86400000) : null;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>Customers</h1>
        <p style={{ color: "var(--text2)", fontSize: 13, marginTop: 2 }}>{customers.length} registered customers</p>
      </div>
      <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
        {isLoading ? <p style={{ padding: 24, color: "var(--text2)" }}>Loading...</p> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>{["Name","Email","Orders","Spent","Last purchase","Status"].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
            <tbody>
              {customers.map(c => {
                const days = daysSince(c.last_purchase);
                const inactive = days !== null && days > 30;
                return (
                  <tr key={c.id}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--surface2)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ ...td, fontWeight: 500 }}>{c.name}</td>
                    <td style={{ ...td, color: "var(--text2)" }}>{c.email}</td>
                    <td style={td}>{c.total_orders || 0}</td>
                    <td style={{ ...td, fontWeight: 500 }}>₹{(c.total_spent || 0).toFixed(2)}</td>
                    <td style={{ ...td, color: inactive ? "var(--warning)" : "var(--text2)" }}>
                      {days !== null ? `${days} days ago` : "Never"}
                    </td>
                    <td style={td}>
                      {inactive
                        ? <span style={{ background: "var(--warning-light)", color: "var(--warning)", padding: "2px 9px", borderRadius: 20, fontSize: 11, fontWeight: 500 }}>Inactive</span>
                        : <span style={{ background: "var(--accent-light)", color: "var(--accent-dark)", padding: "2px 9px", borderRadius: 20, fontSize: 11, fontWeight: 500 }}>Active</span>
                      }
                    </td>
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