import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import api from "../api/client";

const th = { fontSize: 11, color: "var(--text2)", fontWeight: 500, textAlign: "left", padding: "8px 12px", borderBottom: "0.5px solid var(--border)", textTransform: "uppercase", letterSpacing: ".04em" };
const td = { padding: "10px 12px", borderBottom: "0.5px solid var(--border)", fontSize: 13 };
const inp = { width: "100%", padding: "8px 10px", border: "0.5px solid var(--border2)", borderRadius: "var(--radius)", background: "var(--surface)", color: "var(--text)", fontSize: 13, outline: "none" };

export default function Suppliers() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", telegram_chat_id: "" });
  const [showForm, setShowForm] = useState(false);

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => api.get("/suppliers").then(r => r.data)
  });

  const addMutation = useMutation({
    mutationFn: (data) => api.post("/suppliers", data),
    onSuccess: () => { qc.invalidateQueries(["suppliers"]); toast.success("Supplier added!"); setShowForm(false); setForm({ name: "", email: "", phone: "", company: "", telegram_chat_id: "" }); },
    onError: () => toast.error("Failed to add supplier")
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/suppliers/${id}`),
    onSuccess: () => { qc.invalidateQueries(["suppliers"]); toast.success("Supplier removed"); },
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>Suppliers</h1>
          <p style={{ color: "var(--text2)", fontSize: 13, marginTop: 2 }}>{suppliers.length} suppliers</p>
        </div>
        <button onClick={() => setShowForm(v => !v)} style={{ padding: "8px 16px", borderRadius: "var(--radius)", border: "none", background: "var(--accent)", color: "#fff", fontWeight: 500, cursor: "pointer", fontSize: 13 }}>
          {showForm ? "Cancel" : "+ Add supplier"}
        </button>
      </div>

      {showForm && (
        <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: "var(--radius-lg)", padding: 20, marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            {[["name","Name"],["email","Email"],["phone","Phone"],["company","Company"],["telegram_chat_id", "Telegram Chat ID"]].map(([k, lbl]) => (
              <div key={k}>
                <label style={{ fontSize: 12, color: "var(--text2)", marginBottom: 4, display: "block" }}>{lbl}</label>
                <input style={inp} value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} placeholder={lbl} />
              </div>
            ))}
          </div>
          <button onClick={() => addMutation.mutate(form)} style={{ padding: "8px 16px", borderRadius: "var(--radius)", border: "none", background: "var(--accent)", color: "#fff", fontWeight: 500, cursor: "pointer", fontSize: 13 }}>
            Save supplier
          </button>
        </div>
      )}

      <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>{["Name","Company","Email","Phone","Telegram Chat ID","Actions"].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>
            {suppliers.map(s => (
              <tr key={s.id}
                onMouseEnter={e => e.currentTarget.style.background = "var(--surface2)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <td style={{ ...td, fontWeight: 500 }}>{s.name}</td>
                <td style={{ ...td, color: "var(--text2)" }}>{s.company || "—"}</td>
                <td style={td}>{s.email}</td>
                <td style={{ ...td, color: "var(--text2)" }}>{s.phone || "—"}</td>
                <td style={{ ...td, color: "var(--text2)" }}>{s.telegram_chat_id || "—"}</td>
                <td style={td}>
                  <button onClick={() => { if (confirm(`Remove ${s.name}?`)) deleteMutation.mutate(s.id); }} style={{ padding: "4px 10px", fontSize: 11, borderRadius: 4, cursor: "pointer", border: "0.5px solid #f09595", background: "var(--danger-light)", color: "var(--danger)" }}>Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}