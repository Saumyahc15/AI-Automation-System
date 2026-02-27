import { Download, BarChart3, Activity, PieChart, Timer, Loader } from 'lucide-react'
import { useState, useEffect } from 'react'
import StatCard from '../../components/ui/StatCard'
import PageTransition from '../../components/animations/PageTransition'
import { apiClient } from '../../lib/api-client'

export default function AnalyticsPage() {
  const [workflows, setWorkflows] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [workflowsData, logsData] = await Promise.all([
        apiClient.getWorkflows(),
        apiClient.getLogs(100)
      ])

      setWorkflows(Array.isArray(workflowsData) ? workflowsData : [])
      setLogs(Array.isArray(logsData) ? logsData : [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate performance data
  const totalExecutions = logs.length
  const successCount = logs.filter(l => l.status === 'success').length
  const successRate = logs.length > 0 ? ((successCount / logs.length) * 100).toFixed(1) : '0'
  const avgDuration = logs.length > 0 
    ? (logs.reduce((sum, l) => sum + (l.execution_time || 0), 0) / logs.length / 1000).toFixed(2) 
    : '0'

  // Get workflow performance
  const workflowPerformance = workflows.slice(0, 5).map(w => {
    const workflowLogs = logs.filter(l => l.workflow_id === w.id)
    const successCount = workflowLogs.filter(l => l.status === 'success').length
    const successRate = workflowLogs.length > 0 ? successCount / workflowLogs.length : 0
    return {
      id: w.id,
      name: w.name,
      executions: workflowLogs.length,
      success: successRate,
      is_active: w.is_active
    }
  }).filter(w => w.executions > 0)

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400">Analytics</p>
            <h2 className="text-2xl font-bold">Performance overview</h2>
          </div>
          <button 
            onClick={fetchData}
            className="flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2 text-sm text-white ring-1 ring-white/10 hover:bg-white/10 transition"
          >
            <Download size={16} /> Refresh
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard 
            label="Total Executions" 
            value={totalExecutions.toString()} 
            helper="all time" 
            icon={<Activity size={18} />} 
          />
          <StatCard 
            label="Success Rate" 
            value={`${successRate}%`} 
            helper="overall" 
            icon={<BarChart3 size={18} />} 
          />
          <StatCard 
            label="Avg Duration" 
            value={`${avgDuration}s`} 
            helper="per execution" 
            icon={<Timer size={18} />} 
          />
          <StatCard 
            label="Total Workflows" 
            value={workflows.length.toString()} 
            helper="configured" 
            icon={<PieChart size={18} />} 
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="glass rounded-3xl p-4">
            <p className="mb-4 text-sm font-semibold text-white">Workflow Performance</p>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader className="animate-spin text-primary" />
              </div>
            ) : workflowPerformance.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">
                No execution data yet. Create and run workflows to see performance metrics.
              </p>
            ) : (
              <div className="space-y-4">
                {workflowPerformance.map((item) => (
                  <div key={item.id}>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                        <p className="text-white truncate font-medium">{item.name}</p>
                        {item.is_active && <span className="text-xs text-emerald-400 flex-shrink-0">● Active</span>}
                      </div>
                      <p className="text-slate-400 ml-2 flex-shrink-0">{item.executions} runs</p>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-blue-500"
                        style={{ width: `${Math.min(100, item.success * 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Success: {Math.round(item.success * 100)}%
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="glass rounded-3xl p-4">
            <p className="mb-4 text-sm font-semibold text-white">System Status</p>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader className="animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-4 text-sm">
                <div className="rounded-2xl bg-white/5 p-3 ring-1 ring-white/5">
                  <div className="flex items-center justify-between">
                    <p className="text-slate-300">Total Workflows</p>
                    <p className="text-white font-semibold">{workflows.length}</p>
                  </div>
                </div>
                <div className="rounded-2xl bg-white/5 p-3 ring-1 ring-white/5">
                  <div className="flex items-center justify-between">
                    <p className="text-slate-300">Active Workflows</p>
                    <p className="text-emerald-400 font-semibold">{workflows.filter(w => w.is_active).length}</p>
                  </div>
                </div>
                <div className="rounded-2xl bg-white/5 p-3 ring-1 ring-white/5">
                  <div className="flex items-center justify-between">
                    <p className="text-slate-300">Total Executions</p>
                    <p className="text-white font-semibold">{totalExecutions}</p>
                  </div>
                </div>
                <div className="rounded-2xl bg-white/5 p-3 ring-1 ring-white/5">
                  <div className="flex items-center justify-between">
                    <p className="text-slate-300">Success Rate</p>
                    <p className="text-emerald-400 font-semibold">{successRate}%</p>
                  </div>
                </div>
                <div className="rounded-2xl bg-white/5 p-3 ring-1 ring-white/5">
                  <div className="flex items-center justify-between">
                    <p className="text-slate-300">Avg Execution Time</p>
                    <p className="text-white font-semibold">{avgDuration}s</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {logs.length > 0 && (
          <div className="glass rounded-3xl p-4">
            <p className="mb-4 text-sm font-semibold text-white">Recent Executions Summary</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {logs.slice(0, 6).map((log, idx) => (
                <div key={idx} className="rounded-2xl bg-white/5 p-3 ring-1 ring-white/5">
                  <p className="text-xs text-slate-400 truncate">{log.workflow_name || 'Unknown'}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      log.status === 'success' 
                        ? 'bg-emerald-500/20 text-emerald-400' 
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {log.status === 'success' ? '✓ Success' : '✗ Failed'}
                    </span>
                    <span className="text-xs text-slate-500">
                      {log.execution_time ? `${Math.round(log.execution_time)}ms` : '-'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  )
}
