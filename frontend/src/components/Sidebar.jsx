import { NavLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../api/client";

const links = [
  { to: "/dashboard",   label: "Dashboard",    color: "#378ADD" },
  { to: "/inventory",   label: "Inventory",    color: "#1D9E75" },
  { to: "/orders",      label: "Orders",       color: "#BA7517" },
  { to: "/restock",     label: "Restock",      color: "#BA7517" },
  { to: "/customers",   label: "Customers",    color: "#378ADD" },
  { to: "/suppliers",   label: "Suppliers",    color: "#1D9E75" },
  { to: "/automations", label: "Automations",  color: "#E24B4A" },
  { to: "/notifications", label: "Notifications", color: "#F0C808" },
  { to: "/reports",     label: "Reports",      color: "#7F77DD" },
  { to: "/assistant",   label: "AI assistant", color: "#7F77DD" },
  { to: "/settings",    label: "Settings",     color: "#888780" },
];

export default function Sidebar() {
  const { data: { count: unreadCount = 0 } = {} } = useQuery({
    queryKey: ["unreadCount"],
    queryFn: () => api.get("/notifications/unread-count").then(r => r.data),
    refetchInterval: 10000 // Check every 10s
  });

  return (
    <aside style={{
      width: 200, background: "var(--surface2)",
      borderRight: "0.5px solid var(--border)",
      display: "flex", flexDirection: "column",
      padding: "20px 12px", gap: 4, flexShrink: 0
    }}>
      <div style={{
        fontWeight: 600, fontSize: 15,
        padding: "4px 12px 16px",
        borderBottom: "0.5px solid var(--border)",
        marginBottom: 8, color: "var(--text)"
      }}>RetailAI</div>

      {links.map(({ to, label, color }) => (
        <NavLink key={to} to={to} style={({ isActive }) => ({
          display: "flex", alignItems: "center", gap: 9,
          padding: "8px 12px", borderRadius: "var(--radius)",
          fontSize: 13, textDecoration: "none",
          fontWeight: isActive ? 500 : 400,
          background: isActive ? "var(--surface)" : "transparent",
          color: isActive ? "var(--text)" : "var(--text2)",
          border: isActive ? "0.5px solid var(--border)" : "0.5px solid transparent",
          transition: "all 0.15s"
        })}>
          <span style={{
            width: 7, height: 7, borderRadius: "50%",
            background: color, flexShrink: 0
          }} />
          {label}
          {label === "Notifications" && unreadCount > 0 && (
            <span style={{ 
              marginLeft: "auto", background: "var(--danger)", color: "#fff", 
              fontSize: 10, padding: "1px 6px", borderRadius: 10, fontWeight: 600
            }}>{unreadCount}</span>
          )}
        </NavLink>
      ))}

      <div style={{ flex: 1 }} />
      <div style={{
        fontSize: 11, color: "var(--text3)",
        padding: "8px 12px",
        borderTop: "0.5px solid var(--border)", marginTop: 8
      }}>Phase 2 — Dashboard</div>
    </aside>
  );
}