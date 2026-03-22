export default function StatCard({ label, value, sub, subColor }) {
  return (
    <div style={{
      background: "var(--surface2)", borderRadius: "var(--radius)",
      padding: "14px 18px", flex: 1
    }}>
      <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 600, color: "var(--text)" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, marginTop: 4, color: subColor || "var(--text3)" }}>{sub}</div>}
    </div>
  );
}