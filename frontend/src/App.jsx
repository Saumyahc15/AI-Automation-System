import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import Orders from "./pages/Orders";
import Customers from "./pages/Customers";
import Suppliers from "./pages/Suppliers";
import Automations from "./pages/Automations";
import Assistant from "./pages/Assistant";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import Notifications from "./pages/Notifications";
import Restock from "./pages/Restock";

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));

  if (!token) {
    return <Auth onLogin={setToken} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"   element={<Dashboard />} />
          <Route path="inventory"   element={<Inventory />} />
          <Route path="orders"      element={<Orders />} />
          <Route path="customers"   element={<Customers />} />
          <Route path="suppliers"   element={<Suppliers />} />
          <Route path="automations" element={<Automations />} />
          <Route path="assistant"   element={<Assistant />} />
          <Route path="reports"     element={<Reports />} />
          <Route path="settings"    element={<Settings />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="restock"     element={<Restock />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}