import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import InventoryPage from './pages/InventoryPage';
import OrdersPage from './pages/OrdersPage';
import CustomersPage from './pages/CustomersPage';
import AutomationsPage from './pages/AutomationsPage';
import WorkflowDetailPage from './pages/WorkflowDetailPage';
import ReportsPage from './pages/ReportsPage';
import AIInsightsPage from './pages/AIInsightsPage';
import SettingsPage from './pages/SettingsPage';
import UsersPage from './pages/UsersPage';
import CustomReportBuilderPage from './pages/CustomReportBuilderPage';
import GmailOpsPage from './pages/GmailOpsPage';
import './App.css';
import './styles/workflow.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/inventory"
            element={
              <ProtectedRoute>
                <InventoryPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <OrdersPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/customers"
            element={
              <ProtectedRoute>
                <CustomersPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/automations"
            element={
              <ProtectedRoute requiredRoles={['owner', 'manager']}>
                <AutomationsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/automations/:id"
            element={
              <ProtectedRoute requiredRoles={['owner', 'manager']}>
                <WorkflowDetailPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/reports"
            element={
              <ProtectedRoute requiredRoles={['owner', 'manager']}>
                <ReportsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/reports/builder"
            element={
              <ProtectedRoute requiredRoles={['owner', 'manager']}>
                <CustomReportBuilderPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/ai-insights"
            element={
              <ProtectedRoute requiredRoles={['owner', 'manager']}>
                <AIInsightsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/gmail-ops"
            element={
              <ProtectedRoute requiredRoles={['owner', 'manager']}>
                <GmailOpsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/users"
            element={
              <ProtectedRoute requiredRoles={['owner']}>
                <UsersPage />
              </ProtectedRoute>
            }
          />

          {/* Catch-all */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
