import { Filter, Search, Bug, CheckCircle2, RefreshCw, Loader } from 'lucide-react'
import { useState, useEffect } from 'react'
import StatusBadge from '../../components/ui/StatusBadge'
import PageTransition from '../../components/animations/PageTransition'
import { apiClient } from '../../lib/api-client'

export default function ExecutionLogsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed'>('all')
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch logs on component mount
  useEffect(() => {
    fetchLogs()
  }, [])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const data = await apiClient.getLogs(100)
      setLogs(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching logs:', error)
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  const filteredLogs = logs.filter(log => {
    const matchesSearch =
      (log.workflow_name && log.workflow_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.status && log.status.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400">Logs</p>
            <h2 className="text-2xl font-bold">Execution history</h2>
          </div>
          <button 
            onClick={fetchLogs}
            className="flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2 text-sm text-white ring-1 ring-white/10 hover:bg-white/10 transition"
          >
            <RefreshCw size={16} /> Refresh
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white/5 p-3 card-border">
          <button
            onClick={() => setStatusFilter('all')}
            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${
              statusFilter === 'all'
                ? 'bg-primary text-white'
                : 'bg-white/5 text-white ring-1 ring-white/10 hover:bg-white/10'
            }`}
          >
            <Filter size={16} /> All
          </button>
          <button
            onClick={() => setStatusFilter('success')}
            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${
              statusFilter === 'success'
                ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30'
                : 'bg-white/5 text-white ring-1 ring-white/10 hover:bg-white/10'
            }`}
          >
            <CheckCircle2 size={16} /> Success
          </button>
          <button
            onClick={() => setStatusFilter('failed')}
            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${
              statusFilter === 'failed'
                ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/30'
                : 'bg-white/5 text-white ring-1 ring-white/10 hover:bg-white/10'
            }`}
          >
            <Bug size={16} /> Failed
          </button>
          
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl bg-slate-900/60 py-2 pl-9 pr-3 text-sm text-white outline-none ring-1 ring-white/10 placeholder:text-slate-500"
            />
          </div>
        </div>

        {loading && (
          <div className="flex justify-center py-12">
            <Loader className="animate-spin text-primary" size={32} />
          </div>
        )}

        {!loading && filteredLogs.length === 0 && (
          <div className="rounded-2xl bg-white/5 p-8 text-center text-slate-400">
            {logs.length === 0 ? 'No execution logs yet. Create and run a workflow to see logs here.' : 'No logs match your search'}
          </div>
        )}

        {!loading && filteredLogs.length > 0 && (
          <div className="overflow-hidden rounded-2xl bg-white/5 card-border">
            <div className="grid grid-cols-12 border-b border-white/5 px-4 py-3 text-xs uppercase tracking-wide text-slate-400 bg-white/[0.02]">
              <div className="col-span-4">Workflow</div>
              <div className="col-span-3">Time</div>
              <div className="col-span-2">Duration</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-1 text-right">Result</div>
            </div>
            {filteredLogs.map((log, idx) => (
              <div key={idx} className="grid grid-cols-12 items-center px-4 py-4 text-sm text-white odd:bg-white/[0.02] border-t border-white/5 hover:bg-white/[0.05] transition">
                <div className="col-span-4 font-semibold">
                  {log.workflow_name || 'Unknown Workflow'}
                </div>
                <div className="col-span-3 text-slate-400 text-xs">
                  {log.executed_at ? new Date(log.executed_at).toLocaleString() : 'N/A'}
                </div>
                <div className="col-span-2 text-slate-400">
                  {log.duration_ms ? `${Math.round(log.duration_ms)}ms` : '-'}
                </div>
                <div className="col-span-2">
                  <StatusBadge 
                    status={log.status === 'success' ? 'success' : 'danger'} 
                    label={log.status === 'success' ? '✓ Success' : '✗ Failed'} 
                  />
                </div>
                <div className="col-span-1 flex items-center justify-end">
                  {log.status === 'success' ? (
                    <CheckCircle2 size={16} className="text-emerald-400" />
                  ) : (
                    <Bug size={16} className="text-red-400" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  )
}
