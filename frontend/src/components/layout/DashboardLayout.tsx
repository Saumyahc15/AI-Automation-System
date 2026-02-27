import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Home, Zap, PlusCircle, ListChecks, PlugZap, BarChart3, Settings } from 'lucide-react'
import Sidebar, { type NavItem } from './Sidebar'
import Topbar from './Topbar'

const navItems: NavItem[] = [
  { label: 'Overview', path: '/app/overview', icon: <Home size={18} /> },
  { label: 'Workflows', path: '/app/workflows', icon: <Zap size={18} /> },
  { label: 'Create Workflow', path: '/app/create', icon: <PlusCircle size={18} /> },
  { label: 'Execution Logs', path: '/app/logs', icon: <ListChecks size={18} /> },
  { label: 'Integrations', path: '/app/integrations', icon: <PlugZap size={18} /> },
  { label: 'Analytics', path: '/app/analytics', icon: <BarChart3 size={18} /> },
  { label: 'Settings', path: '/app/settings', icon: <Settings size={18} /> },
]

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950/10 text-white">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/55 to-slate-950/80" />
      <div className="relative mx-auto flex max-w-7xl gap-4 px-4 py-6 lg:px-8">
        <Sidebar items={navItems} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex-1">
          <Topbar onToggleSidebar={() => setSidebarOpen((p) => !p)} />
          <div className="rounded-3xl bg-white/[0.03] p-4 card-border">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  )
}
