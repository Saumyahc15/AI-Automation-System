import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import DashboardLayout from './components/layout/DashboardLayout'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/auth/LoginPage'
import SignUpPage from './pages/auth/SignUpPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import OverviewPage from './pages/dashboard/OverviewPage'
import WorkflowsPage from './pages/dashboard/WorkflowsPage'
import CreateWorkflowPage from './pages/dashboard/CreateWorkflowPage'
import ExecutionLogsPage from './pages/dashboard/ExecutionLogsPage'
import IntegrationsPage from './pages/dashboard/IntegrationsPage'
import AnalyticsPage from './pages/dashboard/AnalyticsPage'
import SettingsPage from './pages/dashboard/SettingsPage'
import RouteOverlay from './components/animations/RouteOverlay'
import Global3DBackground from './components/hero/Global3DBackground'

export default function App() {
  const location = useLocation()

  return (
    <>
      <Global3DBackground />
      <RouteOverlay />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          <Route path="/app" element={<DashboardLayout />}>
            <Route index element={<Navigate to="overview" replace />} />
            <Route path="overview" element={<OverviewPage />} />
            <Route path="workflows" element={<WorkflowsPage />} />
            <Route path="create" element={<CreateWorkflowPage />} />
            <Route path="logs" element={<ExecutionLogsPage />} />
            <Route path="integrations" element={<IntegrationsPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </>
  )
}
