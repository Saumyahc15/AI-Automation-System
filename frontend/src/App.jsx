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

export default function App() {
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
        </Route>
      </Routes>
    </BrowserRouter>
  );
}