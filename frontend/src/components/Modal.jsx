import { useState, useEffect } from "react";

const inp = {
  width: "100%", padding: "8px 10px",
  border: "0.5px solid var(--border2)",
  borderRadius: "var(--radius)", background: "var(--surface)",
  color: "var(--text)", fontSize: 13, outline: "none"
};

const label = { fontSize: 12, color: "var(--text2)", marginBottom: 4, display: "block" };

export default function Modal({ open, onClose, onSubmit, initial, suppliers }) {
  const empty = { name: "", category: "Grains & Pulses", stock: 0, price: 0, cost_price: 0, low_stock_threshold: 10, supplier_id: "" };
  const [form, setForm] = useState(empty);

  useEffect(() => {
    setForm(initial ? {
      name: initial.name, category: initial.category,
      stock: initial.stock, price: initial.price, cost_price: initial.cost_price || 0,
      low_stock_threshold: initial.low_stock_threshold,
      supplier_id: initial.supplier?.id || ""
    } : empty);
  }, [initial, open]);

  if (!open) return null;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50
    }}>
      <div style={{
        background: "var(--surface)", borderRadius: "var(--radius-lg)",
        border: "0.5px solid var(--border)", padding: 24, width: 440,
        boxShadow: "0 8px 32px rgba(0,0,0,0.12)"
      }}>
        <div style={{ fontWeight: 500, fontSize: 15, marginBottom: 18 }}>
          {initial ? "Edit product" : "Add new product"}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div style={{ gridColumn: "span 2" }}>
            <label style={label}>Product name</label>
            <input style={inp} value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Basmati rice 5kg" />
          </div>
          <div>
            <label style={label}>Category</label>
            <select style={inp} value={form.category} onChange={e => set("category", e.target.value)}>
              {["Grains & Pulses","Dairy","Oils & Condiments","Spices","Snacks","Beverages","Cleaning"].map(c =>
                <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={label}>Supplier</label>
            <select style={inp} value={form.supplier_id} onChange={e => set("supplier_id", e.target.value)}>
              <option value="">— None —</option>
              {suppliers?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label style={label}>Opening stock</label>
            <input style={inp} type="number" value={form.stock} onChange={e => set("stock", +e.target.value)} />
          </div>
          <div>
            <label style={label}>Selling Price (₹)</label>
            <input style={inp} type="number" value={form.price} onChange={e => set("price", +e.target.value)} />
          </div>
          <div>
            <label style={label}>Cost Price (₹)</label>
            <input style={inp} type="number" value={form.cost_price} onChange={e => set("cost_price", +e.target.value)} />
          </div>
          <div>
            <label style={label}>Low stock threshold</label>
            <input style={inp} type="number" value={form.low_stock_threshold} onChange={e => set("low_stock_threshold", +e.target.value)} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
          <button onClick={onClose} style={{
            padding: "8px 16px", borderRadius: "var(--radius)",
            border: "0.5px solid var(--border2)", background: "transparent",
            color: "var(--text2)", cursor: "pointer"
          }}>Cancel</button>
          <button onClick={() => onSubmit(form)} style={{
            padding: "8px 16px", borderRadius: "var(--radius)",
            border: "none", background: "var(--accent)",
            color: "#fff", cursor: "pointer", fontWeight: 500
          }}>
            {initial ? "Save changes" : "Add product"}
          </button>
        </div>
      </div>
    </div>
  );
}