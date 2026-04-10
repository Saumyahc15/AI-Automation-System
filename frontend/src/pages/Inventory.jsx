import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import api from "../api/client";
import StatusBadge from "../components/StatusBadge";
import Modal from "../components/Modal";

const th = { fontSize: 11, color: "var(--text2)", fontWeight: 500, textAlign: "left", padding: "8px 12px", borderBottom: "0.5px solid var(--border)", textTransform: "uppercase", letterSpacing: ".04em" };
const td = { padding: "10px 12px", borderBottom: "0.5px solid var(--border)", fontSize: 13 };

export default function Inventory() {
  const qc = useQueryClient();
  const [modal, setModal] = useState({ open: false, product: null });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [adjustId, setAdjustId] = useState(null);
  const [adjustQty, setAdjustQty] = useState(0);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: () => api.get("/products").then(r => r.data)
  });
  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => api.get("/suppliers").then(r => r.data)
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.post("/products", data),
    onSuccess: () => { qc.invalidateQueries(["products"]); toast.success("Product added!"); setModal({ open: false, product: null }); },
    onError: () => toast.error("Failed to add product")
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.patch(`/products/${id}`, data),
    onSuccess: () => { qc.invalidateQueries(["products"]); toast.success("Product updated!"); setModal({ open: false, product: null }); },
    onError: () => toast.error("Failed to update product")
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/products/${id}`),
    onSuccess: () => { qc.invalidateQueries(["products"]); toast.success("Product removed"); },
    onError: () => toast.error("Failed to delete")
  });

  const adjustMutation = useMutation({
    mutationFn: ({ id, qty }) => api.patch(`/products/${id}/adjust-stock?quantity=${qty}`),
    onSuccess: () => { qc.invalidateQueries(["products"]); toast.success("Stock adjusted!"); setAdjustId(null); setAdjustQty(0); },
    onError: () => toast.error("Failed to adjust stock")
  });

  const filtered = products
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.includes(search))
    .filter(p => {
      if (filter === "low") return p.stock > 0 && p.stock <= p.low_stock_threshold;
      if (filter === "out") return p.stock === 0;
      return true;
    });

  const handleSubmit = (form) => {
    const payload = { ...form, supplier_id: form.supplier_id ? +form.supplier_id : null };
    if (modal.product) updateMutation.mutate({ id: modal.product.id, data: payload });
    else createMutation.mutate(payload);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>Inventory</h1>
          <p style={{ color: "var(--text2)", fontSize: 13, marginTop: 2 }}>{filtered.length} products shown</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            placeholder="Search name or SKU..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding: "8px 12px", border: "0.5px solid var(--border2)", borderRadius: "var(--radius)", background: "var(--surface)", color: "var(--text)", fontSize: 13, width: 200, outline: "none" }}
          />
          <button onClick={() => setModal({ open: true, product: null })} style={{
            padding: "8px 16px", borderRadius: "var(--radius)", border: "none",
            background: "var(--accent)", color: "#fff", fontWeight: 500, cursor: "pointer", fontSize: 13
          }}>+ Add product</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 0, marginBottom: 16, border: "0.5px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden", width: "fit-content" }}>
        {[["all","All"],["low","Low stock"],["out","Out of stock"]].map(([val, lbl]) => (
          <button key={val} onClick={() => setFilter(val)} style={{
            padding: "6px 16px", fontSize: 12, border: "none", cursor: "pointer",
            background: filter === val ? "var(--surface2)" : "var(--surface)",
            color: filter === val ? "var(--text)" : "var(--text2)",
            fontWeight: filter === val ? 500 : 400,
            borderRight: val !== "out" ? "0.5px solid var(--border)" : "none"
          }}>{lbl}</button>
        ))}
      </div>

      <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
        {isLoading ? (
          <p style={{ padding: 24, color: "var(--text2)" }}>Loading products...</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Product","SKU","Category","Stock","Price/Cost","Margin","Status","Actions"].map(h => <th key={h} style={th}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} style={{ transition: "background 0.1s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--surface2)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <td style={{ ...td, fontWeight: 500 }}>{p.name}</td>
                  <td style={{ ...td, color: "var(--text2)", fontFamily: "DM Mono, monospace" }}>{p.sku}</td>
                  <td style={td}>{p.category}</td>
                  <td style={td}>
                    {adjustId === p.id ? (
                      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                        <input type="number" value={adjustQty} onChange={e => setAdjustQty(+e.target.value)}
                          style={{ width: 60, padding: "4px 6px", border: "0.5px solid var(--border2)", borderRadius: 4, fontSize: 12 }} />
                        <button onClick={() => adjustMutation.mutate({ id: p.id, qty: adjustQty })}
                          style={{ padding: "3px 8px", background: "var(--accent)", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 11 }}>✓</button>
                        <button onClick={() => setAdjustId(null)}
                          style={{ padding: "3px 8px", background: "var(--surface2)", border: "0.5px solid var(--border)", borderRadius: 4, cursor: "pointer", fontSize: 11 }}>✕</button>
                      </div>
                    ) : (
                      <span
                        style={{ color: p.stock === 0 ? "var(--danger)" : p.stock <= p.low_stock_threshold ? "var(--warning)" : "var(--text)", fontWeight: p.stock <= p.low_stock_threshold ? 500 : 400, cursor: "pointer" }}
                        onClick={() => { setAdjustId(p.id); setAdjustQty(0); }}
                        title="Click to adjust stock"
                      >{p.stock}</span>
                    )}
                  </td>
                  <td style={td}>
                    <div>₹{p.price}</div>
                    <div style={{ fontSize: 10, color: "var(--text3)" }}>Cost: ₹{p.cost_price || 0}</div>
                  </td>
                  <td style={td}>
                    {p.profit_margin !== undefined ? (
                      <span style={{ 
                        color: p.profit_margin > 20 ? "var(--accent)" : p.profit_margin > 0 ? "var(--warning)" : "var(--danger)",
                        fontWeight: 500
                      }}>
                        {p.profit_margin}%
                      </span>
                    ) : "—"}
                  </td>
                  <td style={td}><StatusBadge stock={p.stock} threshold={p.low_stock_threshold} /></td>
                  <td style={td}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => setModal({ open: true, product: p })} style={{
                        padding: "4px 10px", fontSize: 11, borderRadius: 4, cursor: "pointer",
                        border: "0.5px solid var(--border2)", background: "var(--surface)", color: "var(--text)"
                      }}>Edit</button>
                      <button onClick={() => { if (confirm(`Delete ${p.name}?`)) deleteMutation.mutate(p.id); }} style={{
                        padding: "4px 10px", fontSize: 11, borderRadius: 4, cursor: "pointer",
                        border: "0.5px solid #f09595", background: "var(--danger-light)", color: "var(--danger)"
                      }}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={modal.open}
        onClose={() => setModal({ open: false, product: null })}
        onSubmit={handleSubmit}
        initial={modal.product}
        suppliers={suppliers}
      />
    </div>
  );
}