import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import api from "../api/client";
import StatCard from "../components/StatCard";

const COLORS = ["#1D9E75","#378ADD","#BA7517","#7F77DD","#D4537E"];

export default function Dashboard() {
  const { data: products = [] } = useQuery({ queryKey: ["products"], queryFn: () => api.get("/products").then(r => r.data) });
  const { data: orders = [] } = useQuery({ queryKey: ["orders"], queryFn: () => api.get("/orders").then(r => r.data) });
  const { data: customers = [] } = useQuery({ queryKey: ["customers"], queryFn: () => api.get("/customers").then(r => r.data) });
  const { data: workflows = [] } = useQuery({ queryKey: ["workflows"], queryFn: () => api.get("/workflows").then(r => r.data) });

  const lowStock = products.filter(p => p.stock > 0 && p.stock <= p.low_stock_threshold);
  const outOfStock = products.filter(p => p.stock === 0);
  const totalValue = products.reduce((s, p) => s + p.stock * p.price, 0);
  const totalRevenue = orders.reduce((s, o) => s + o.total_amount, 0);
  const totalProfit = products.reduce((s, p) => {
    const sold = orders.reduce((sum, o) => sum + o.items.filter(i => i.product_id === p.id).reduce((isum, ii) => isum + ii.quantity, 0), 0);
    return s + (sold * (p.price - (p.cost_price || 0)));
  }, 0);
  const avgMargin = products.filter(p => p.profit_margin).reduce((s, p) => s + p.profit_margin, 0) / (products.filter(p => p.profit_margin).length || 1);

  const categoryCounts = products.reduce((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + p.stock;
    return acc;
  }, {});
  const chartData = Object.entries(categoryCounts)
    .map(([name, stock]) => ({ name: name.split(" ")[0], stock }))
    .sort((a, b) => b.stock - a.stock);

  const activeWorkflows = workflows.filter(w => w.is_active);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>Inventory dashboard</h1>
        <p style={{ color: "var(--text2)", fontSize: 13, marginTop: 2 }}>
          {products.length} products · {orders.length} orders · {customers.length} customers
        </p>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        <StatCard label="Total Revenue" value={`₹${(totalRevenue/1000).toFixed(1)}K`} sub="Current orders" subColor="var(--accent)" />
        <StatCard label="Total Profit" value={`₹${(totalProfit/1000).toFixed(1)}K`} sub="Gross profit" subColor="var(--accent)" />
        <StatCard label="Avg Margin" value={`${avgMargin.toFixed(1)}%`} sub="Overall performance" subColor="var(--info)" />
        <StatCard label="Low stock" value={lowStock.length} sub="Needs attention" subColor="var(--warning)" />
        <StatCard label="Out of stock" value={outOfStock.length} sub="Action required" subColor="var(--danger)" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: "var(--radius-lg)", padding: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text2)", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 16 }}>Stock by category</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barSize={28}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--text2)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--text2)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, border: "0.5px solid var(--border)" }} />
              <Bar dataKey="stock" radius={[4,4,0,0]}>
                {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: "var(--radius-lg)", padding: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text2)", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 16 }}>Active workflows</div>
          {workflows.length === 0
            ? <p style={{ color: "var(--text3)", fontSize: 13 }}>No workflows yet.</p>
            : workflows.map(wf => (
              <div key={wf.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "0.5px solid var(--border)" }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: wf.is_active ? "var(--accent)" : "var(--border2)", flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{wf.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text3)" }}>{wf.trigger}</div>
                </div>
              </div>
            ))
          }
        </div>
      </div>

      <div style={{ background: "var(--surface)", border: "0.5px solid var(--border)", borderRadius: "var(--radius-lg)", padding: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text2)", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 14 }}>Items needing attention</div>
        {[...outOfStock, ...lowStock].slice(0, 5).map(p => (
          <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "0.5px solid var(--border)" }}>
            <span style={{ fontWeight: 500, fontSize: 13 }}>{p.name}</span>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "var(--text2)" }}>{p.sku}</span>
              <span style={{ fontSize: 13, color: p.stock === 0 ? "var(--danger)" : "var(--warning)", fontWeight: 500 }}>{p.stock} units</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}