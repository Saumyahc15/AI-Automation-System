import { Activity, Clock3, Rocket, TrendingUp, Zap, Loader } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import StatCard from '../../components/ui/StatCard'
import StatusBadge from '../../components/ui/StatusBadge'
import PageTransition from '../../components/animations/PageTransition'
import { useWorkflows, useLogs } from '../../lib/hooks'

export default function OverviewPage() {
  const navigate = useNavigate()
  const { data: workflows = [], isLoading: workflowsLoading } = useWorkflows()
  const { data: logs = [], isLoading: logsLoading } = useLogs()

  // Calculate stats from real data
  const totalWorkflows = workflows.length
  const activeWorkflows = workflows.filter(w => w.is_active).length
  const recentLogs = logs.slice(0, 10)
  const successRate = logs.length > 0 ? ((logs.filter(l => l.status === 'success').length / logs.length) * 100).toFixed(1) : '0'

  const stats = [
    { label: 'Total Workflows', value: totalWorkflows.toString(), trend: '', icon: <Rocket size={18} /> },
    { label: 'Active Workflows', value: activeWorkflows.toString(), trend: '', icon: <Zap size={18} /> },
    { label: 'Total Executions', value: logs.length.toString(), trend: '', icon: <Activity size={18} /> },
    { label: 'Success Rate', value: `${successRate}%`, helper: 'all time', icon: <TrendingUp size={18} /> },
  ]
  return (
    <PageTransition>
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="animated-grid absolute inset-0 opacity-40" />
        <div className="bg-orbit absolute -right-20 top-10 h-72 w-72 rounded-full opacity-20 blur-3xl" />
      </div>
      <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-slate-400">Overview</p>
        <h2 className="text-2xl font-bold">Control center</h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} trend={s.trend} helper={s.helper} icon={s.icon} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass rounded-3xl p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-white">Recent activity</p>
            <button 
              onClick={() => navigate('/app/logs')}
              className="text-sm text-primary hover:text-primary/80 transition"
            >
              View all
            </button>
          </div>
          {logsLoading ? (
            <div className="flex justify-center py-8">
              <Loader className="animate-spin text-primary" />
            </div>
          ) : recentLogs.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">No execution logs yet</p>
          ) : (
            <div className="space-y-2">
              {recentLogs.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-2xl bg-white/5 px-3 py-3 text-sm ring-1 ring-white/5"
                >
                  <div>
                    <p className="font-medium text-white">{item.workflow_name || 'Unknown'}</p>
                    <p className="text-slate-500 text-xs">{new Date(item.started_at).toLocaleString()}</p>
                  </div>
                  <StatusBadge
                    status={item.status === 'success' ? 'success' : 'danger'}
                    label={item.status === 'success' ? 'Success' : 'Failed'}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass rounded-3xl p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-white">Active workflows</p>
            <button 
              onClick={() => navigate('/app/workflows')}
              className="text-sm text-primary hover:text-primary/80 transition"
            >
              Manage
            </button>
          </div>
          {workflowsLoading ? (
            <div className="flex justify-center py-8">
              <Loader className="animate-spin text-primary" />
            </div>
          ) : workflows.filter(w => w.is_active).length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">No active workflows</p>
          ) : (
            <div className="space-y-2">
              {workflows.filter(w => w.is_active).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-2xl bg-white/5 px-3 py-3 text-sm ring-1 ring-white/5"
                >
                  <div>
                    <p className="font-medium text-white">{item.name}</p>
                    <p className="text-slate-500 text-xs">{item.description || 'No description'}</p>
                  </div>
                  <div className="text-xs text-slate-400">
                    {item.execution_count} exec
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      </div>
    </PageTransition>
  )
}

