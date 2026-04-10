import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../api/client";
import toast from "react-hot-toast";

const th = { fontSize: 11, color: "var(--text2)", fontWeight: 500, textAlign: "left", padding: "8px 12px", borderBottom: "0.5px solid var(--border)", textTransform: "uppercase" };
const td = { padding: "12px", borderBottom: "0.5px solid var(--border)", fontSize: 13 };

export default function Notifications() {
  const qc = useQueryClient();
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.get("/notifications").then(r => r.data)
  });

  const readMutation = useMutation({
    mutationFn: (id) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries(["notifications"])
  });

  const markAllRead = useMutation({
    mutationFn: () => api.patch("/notifications/mark-all-read"),
    onSuccess: () => { qc.invalidateQueries(["notifications"]); toast.success("All marked as read"); }
  });

  const clearRead = useMutation({
    mutationFn: () => api.delete("/notifications/clear-read"),
    onSuccess: () => { qc.invalidateQueries(["notifications"]); toast.success("Cleared old notifications"); }
  });

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>Notifications</h1>
          <p style={{ color: "var(--text2)", fontSize: 13, marginTop: 2 }}>Stay updated on automated actions</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => markAllRead.mutate()} style={{
            padding: "6px 14px", fontSize: 12, borderRadius: 6, cursor: "pointer",
            border: "0.5px solid var(--border2)", background: "var(--surface)", color: "var(--text)"
          }}>Mark all read</button>
          <button onClick={() => clearRead.mutate()} style={{
            padding: "6px 14px", fontSize: 12, borderRadius: 6, cursor: "pointer",
            border: "0.5px solid #f09595", background: "var(--danger-light)", color: "var(--danger)"
          }}>Clear read</button>
        </div>
      </div>

      <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
        {isLoading ? <p style={{ padding: 24, color: "var(--text2)" }}>Loading...</p> : notifications.length === 0 ? (
          <p style={{ padding: 40, textAlign: "center", color: "var(--text3)" }}>No notifications yet</p>
        ) : (
          <div>
            {notifications.map(n => (
              <div 
                key={n.id} 
                onClick={() => !n.is_read && readMutation.mutate(n.id)}
                style={{ 
                  padding: 16, borderBottom: "0.5px solid var(--border)", 
                  background: n.is_read ? "transparent" : "var(--surface2)",
                  cursor: "pointer", display: "flex", gap: 16, alignItems: "start",
                  transition: "background 0.2s"
                }}
              >
                <div style={{ 
                  width: 8, height: 8, borderRadius: "50%", marginTop: 6, flexShrink: 0,
                  background: n.type === "error" ? "var(--danger)" : n.type === "success" ? "var(--accent)" : "var(--warning)",
                  opacity: n.is_read ? 0.3 : 1
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: 14, color: n.is_read ? "var(--text2)" : "var(--text)", marginBottom: 4 }}>
                    {n.title}
                  </div>
                  <div style={{ fontSize: 13, color: n.is_read ? "var(--text3)" : "var(--text2)", lineHeight: 1.4 }}>
                    {n.message}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 11, color: "var(--text3)" }}>
                    {new Date(n.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
