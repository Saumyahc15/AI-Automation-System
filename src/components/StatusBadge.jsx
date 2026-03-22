export default function StatusBadge({ stock, threshold }) {
  if (stock === 0)
    return <span style={{ background: "var(--danger-light)", color: "var(--danger)", padding: "2px 9px", borderRadius: 20, fontSize: 11, fontWeight: 500 }}>Out of stock</span>;
  if (stock <= threshold)
    return <span style={{ background: "var(--warning-light)", color: "var(--warning)", padding: "2px 9px", borderRadius: 20, fontSize: 11, fontWeight: 500 }}>Low stock</span>;
  return <span style={{ background: "var(--accent-light)", color: "var(--accent-dark)", padding: "2px 9px", borderRadius: 20, fontSize: 11, fontWeight: 500 }}>In stock</span>;
}