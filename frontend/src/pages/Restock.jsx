import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/client";
import toast from "react-hot-toast";

const th = { fontSize: 11, color: "var(--text2)", fontWeight: 500, textAlign: "left", padding: "8px 12px", borderBottom: "0.5px solid var(--border)", textTransform: "uppercase" };
const td = { padding: "12px", borderBottom: "0.5px solid var(--border)", fontSize: 13 };

export default function Restock() {
  const qc = useQueryClient();
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["restock"],
    queryFn: () => api.get("/restock").then(r => r.data)
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.patch(`/restock/${id}`, data),
    onSuccess: () => { qc.invalidateQueries(["restock"]); qc.invalidateQueries(["products"]); toast.success("Updated!"); }
  });

  const handleFulfill = (req) => {
    const qty = prompt(`Enter units received for ${req.product?.name}:`, req.units_requested);
    if (qty) {
      updateMutation.mutate({ id: req.id, data: { status: "fulfilled", units_received: +qty } });
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>Restock Requests</h1>
        <p style={{ color: "var(--text2)", fontSize: 13, marginTop: 2 }}>Track supplier reorders and incoming stock</p>
      </div>

      <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
        {isLoading ? <p style={{ padding: 24, color: "var(--text2)" }}>Loading...</p> : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Product","Supplier","Requested","Status","Actions"].map(h => <th key={h} style={th}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {requests.map(r => (
                <tr key={r.id}>
                  <td style={{ ...td, fontWeight: 500 }}>{r.product?.name || "Unknown"}</td>
                  <td style={td}>{r.supplier?.name || "Unknown"}</td>
                  <td style={td}>{r.units_requested} units</td>
                  <td style={td}>
                    <span style={{ 
                      padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 500,
                      background: r.status === "fulfilled" ? "var(--accent-light)" : "var(--surface2)",
                      color: r.status === "fulfilled" ? "var(--accent-dark)" : "var(--text2)",
                      textTransform: "uppercase"
                    }}>{r.status}</span>
                  </td>
                  <td style={td}>
                    {r.status === "pending" && (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => handleFulfill(r)} style={{
                          padding: "4px 8px", fontSize: 11, borderRadius: 4, cursor: "pointer",
                          border: "none", background: "var(--accent)", color: "#fff"
                        }}>Mark Fulfilled</button>
                        <button onClick={() => updateMutation.mutate({ id: r.id, data: { status: "cancelled" } })} style={{
                          padding: "4px 8px", fontSize: 11, borderRadius: 4, cursor: "pointer",
                          border: "0.5px solid var(--border2)", background: "var(--surface)", color: "var(--text2)"
                        }}>Cancel</button>
                      </div>
                    )}
                    {r.status === "fulfilled" && <span style={{ fontSize: 11, color: "var(--text3)" }}>Received {r.units_received} units</span>}
                  </td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr><td colSpan="5" style={{ padding: 40, textAlign: "center", color: "var(--text3)" }}>No restock requests found</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
