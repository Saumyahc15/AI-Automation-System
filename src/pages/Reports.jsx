import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Cell, CartesianGrid
} from "recharts";
import api from "../api/client";

const COLORS = ["#1D9E75","#378ADD","#BA7517","#7F77DD","#D4537E","#E24B4A"];

const th = { fontSize:11, color:"var(--text2)", fontWeight:500, textAlign:"left", padding:"8px 12px", borderBottom:"0.5px solid var(--border)", textTransform:"uppercase", letterSpacing:".04em" };
const td = { padding:"10px 12px", borderBottom:"0.5px solid var(--border)", fontSize:13 };

function StatCard({ label, value, sub, subColor }) {
  return (
    <div style={{ background:"var(--surface2)", borderRadius:8, padding:"14px 18px", flex:1 }}>
      <div style={{ fontSize:12, color:"var(--text2)", marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:22, fontWeight:600 }}>{value}</div>
      {sub && <div style={{ fontSize:11, marginTop:4, color: subColor || "var(--text3)" }}>{sub}</div>}
    </div>
  );
}

export default function Reports() {
  const [days, setDays] = useState(30);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["reports", days],
    queryFn: () => api.get(`/reports/summary?days=${days}`).then(r => r.data)
  });

  const handleExportPDF = async () => {
    try {
      const res = await api.post("/intelligence/ask", {
        question: `Generate a brief executive summary of the last ${days} days performance`
      });
      const summary = res.data.answer;
      const content = `
RetailAI — Sales Report (Last ${days} days)
Generated: ${new Date().toLocaleDateString("en-IN")}

SUMMARY
${summary}

KEY METRICS
- Total Orders: ${data?.total_orders}
- Total Revenue: Rs.${data?.total_revenue}
- Avg Order Value: Rs.${data?.avg_order_value}
- Revenue Change: ${data?.revenue_change_pct > 0 ? "+" : ""}${data?.revenue_change_pct}% vs previous period

TOP PRODUCTS
${data?.top_products?.map((p, i) => `${i+1}. ${p.name} — ${p.units_sold} units — Rs.${p.revenue}`).join("\n")}
      `.trim();

      const blob = new Blob([content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `retailai_report_${new Date().toISOString().slice(0,10)}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Export failed. Make sure the backend is running.");
    }
  };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:600 }}>Reports</h1>
          <p style={{ color:"var(--text2)", fontSize:13, marginTop:2 }}>Sales analytics from your live database</p>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <select
            value={days}
            onChange={e => setDays(+e.target.value)}
            style={{ padding:"7px 10px", border:"0.5px solid var(--border2)", borderRadius:8, background:"var(--surface)", color:"var(--text)", fontSize:13, outline:"none" }}>
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button onClick={handleExportPDF} style={{
            padding:"7px 16px", borderRadius:8, border:"0.5px solid var(--border2)",
            background:"var(--surface)", color:"var(--text)", fontSize:13, cursor:"pointer", fontWeight:500
          }}>Export report</button>
        </div>
      </div>

      {isLoading ? (
        <p style={{ color:"var(--text2)" }}>Loading report data...</p>
      ) : data ? (
        <>
          {/* Stat cards */}
          <div style={{ display:"flex", gap:12, marginBottom:20 }}>
            <StatCard label="Total revenue" value={`₹${data.total_revenue.toLocaleString("en-IN")}`}
              sub={`${data.revenue_change_pct > 0 ? "+" : ""}${data.revenue_change_pct}% vs prev period`}
              subColor={data.revenue_change_pct >= 0 ? "var(--accent)" : "var(--danger)"} />
            <StatCard label="Total orders" value={data.total_orders} sub={`Last ${days} days`} />
            <StatCard label="Avg order value" value={`₹${data.avg_order_value}`} sub="Per order" />
            <StatCard label="Prev period" value={`₹${data.prev_revenue.toLocaleString("en-IN")}`} sub="For comparison" />
          </div>

          {/* Revenue line chart */}
          <div style={{ background:"var(--surface)", border:"0.5px solid var(--border)", borderRadius:12, padding:20, marginBottom:16 }}>
            <div style={{ fontSize:12, fontWeight:500, color:"var(--text2)", textTransform:"uppercase", letterSpacing:".04em", marginBottom:16 }}>Daily revenue</div>
            {data.daily_revenue.length === 0 ? (
              <p style={{ color:"var(--text3)", fontSize:13 }}>No orders in this period.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data.daily_revenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize:11, fill:"var(--text2)" }} axisLine={false} tickLine={false}
                    tickFormatter={v => v.slice(5)} />
                  <YAxis tick={{ fontSize:11, fill:"var(--text2)" }} axisLine={false} tickLine={false}
                    tickFormatter={v => `₹${v}`} />
                  <Tooltip
                    formatter={v => [`₹${v.toLocaleString("en-IN")}`, "Revenue"]}
                    contentStyle={{ fontSize:12, borderRadius:6, border:"0.5px solid var(--border)", background:"var(--surface)" }} />
                  <Line type="monotone" dataKey="revenue" stroke="#1D9E75" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
            {/* Category bar chart */}
            <div style={{ background:"var(--surface)", border:"0.5px solid var(--border)", borderRadius:12, padding:20 }}>
              <div style={{ fontSize:12, fontWeight:500, color:"var(--text2)", textTransform:"uppercase", letterSpacing:".04em", marginBottom:16 }}>Revenue by category</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.by_category} barSize={24}>
                  <XAxis dataKey="category" tick={{ fontSize:10, fill:"var(--text2)" }} axisLine={false} tickLine={false}
                    tickFormatter={v => v.split(" ")[0]} />
                  <YAxis tick={{ fontSize:10, fill:"var(--text2)" }} axisLine={false} tickLine={false}
                    tickFormatter={v => `₹${v}`} />
                  <Tooltip formatter={v => [`₹${v.toLocaleString("en-IN")}`, "Revenue"]}
                    contentStyle={{ fontSize:12, borderRadius:6, border:"0.5px solid var(--border)", background:"var(--surface)" }} />
                  <Bar dataKey="revenue" radius={[4,4,0,0]}>
                    {data.by_category.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Order status breakdown */}
            <div style={{ background:"var(--surface)", border:"0.5px solid var(--border)", borderRadius:12, padding:20 }}>
              <div style={{ fontSize:12, fontWeight:500, color:"var(--text2)", textTransform:"uppercase", letterSpacing:".04em", marginBottom:16 }}>Order status breakdown</div>
              {Object.entries(data.status_breakdown).map(([status, count]) => {
                const total = Object.values(data.status_breakdown).reduce((a,b) => a+b, 0);
                const pct = Math.round(count / total * 100);
                const colors = { delivered:["#EAF3DE","#3B6D11"], shipped:["#E6F1FB","#185FA5"], pending:["#FAEEDA","#854F0B"], delayed:["#FCEBEB","#A32D2D"] };
                const [bg, color] = colors[status] || ["var(--surface2)","var(--text2)"];
                return (
                  <div key={status} style={{ marginBottom:12 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4, fontSize:13 }}>
                      <span style={{ background:bg, color, padding:"2px 8px", borderRadius:10, fontSize:11, fontWeight:500 }}>{status}</span>
                      <span style={{ color:"var(--text2)" }}>{count} orders ({pct}%)</span>
                    </div>
                    <div style={{ background:"var(--border)", borderRadius:4, height:6 }}>
                      <div style={{ width:`${pct}%`, height:6, borderRadius:4, background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top products table */}
          <div style={{ background:"var(--surface)", border:"0.5px solid var(--border)", borderRadius:12, overflow:"hidden" }}>
            <div style={{ padding:"12px 16px", borderBottom:"0.5px solid var(--border)" }}>
              <div style={{ fontSize:12, fontWeight:500, color:"var(--text2)", textTransform:"uppercase", letterSpacing:".04em" }}>Top products by revenue</div>
            </div>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead><tr>{["#","Product","Category","Units sold","Revenue"].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>
                {data.top_products.map((p, i) => (
                  <tr key={i}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--surface2)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ ...td, color:"var(--text3)", width:40 }}>{i+1}</td>
                    <td style={{ ...td, fontWeight:500 }}>{p.name}</td>
                    <td style={td}>{p.category}</td>
                    <td style={td}>{p.units_sold}</td>
                    <td style={{ ...td, fontWeight:500, color:"var(--accent)" }}>₹{p.revenue.toLocaleString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}