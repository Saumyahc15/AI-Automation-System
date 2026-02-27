import { Plus, Filter, List, Grid2X2, Search, Settings, PlayCircle, Edit3, Trash2, Loader } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import StatusBadge from '../../components/ui/StatusBadge'
import PageTransition from '../../components/animations/PageTransition'
import { useWorkflows, useDeleteWorkflow, useExecuteWorkflow, useActivateWorkflow, useDeactivateWorkflow } from '../../lib/hooks'

export default function WorkflowsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [showFilters, setShowFilters] = useState(false)
  const navigate = useNavigate()
  
  const { data: workflows = [], isLoading, error } = useWorkflows()
  const deleteWorkflowMutation = useDeleteWorkflow()
  const executeWorkflowMutation = useExecuteWorkflow()
  const activateWorkflowMutation = useActivateWorkflow()
  const deactivateWorkflowMutation = useDeactivateWorkflow()

  const filteredWorkflows = workflows.filter(w => 
    w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (w.description && w.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const handleDelete = async (workflowId: string) => {
    if (!confirm('Are you sure you want to delete this workflow?')) return
    
    try {
      await deleteWorkflowMutation.mutateAsync(workflowId)
      toast.success('✅ Workflow deleted')
    } catch (error) {
      toast.error('Failed to delete workflow')
    }
  }

  const handleExecute = async (workflowId: string) => {
    try {
      await executeWorkflowMutation.mutateAsync(workflowId)
      toast.success('✅ Workflow execution started')
    } catch (error) {
      toast.error('Failed to execute workflow')
    }
  }

  const handleToggleStatus = async (workflow: any) => {
    try {
      if (workflow.is_active) {
        await deactivateWorkflowMutation.mutateAsync(workflow.id)
        toast.success('✅ Workflow deactivated')
      } else {
        await activateWorkflowMutation.mutateAsync(workflow.id)
        toast.success('✅ Workflow activated')
      }
    } catch (error) {
      toast.error('Failed to update workflow status')
    }
  }

  return (
    <PageTransition>
      <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">Workflows</p>
          <h2 className="text-2xl font-bold">Manage automations</h2>
        </div>
        <button 
          onClick={() => navigate('/app/create')}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-glow transition hover:translate-y-[-1px]"
        >
          <Plus size={16} /> Create Workflow
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white/5 p-3 card-border">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input
            placeholder="Search workflows..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl bg-slate-900/60 py-2 pl-9 pr-3 text-sm text-white outline-none ring-1 ring-white/10 placeholder:text-slate-500"
          />
        </div>
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ring-1 ring-white/10 transition ${
            showFilters ? 'bg-primary/20 text-primary' : 'bg-white/5 text-white hover:bg-white/10'
          }`}
        >
          <Filter size={16} /> Filter
        </button>
        <button 
          onClick={() => setViewMode('list')}
          className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ring-1 ring-white/10 transition ${
            viewMode === 'list' ? 'bg-primary/20 text-primary' : 'bg-white/5 text-white hover:bg-white/10'
          }`}
        >
          <List size={16} /> List
        </button>
        <button 
          onClick={() => setViewMode('grid')}
          className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ring-1 ring-white/10 transition ${
            viewMode === 'grid' ? 'bg-primary/20 text-primary' : 'bg-white/5 text-white hover:bg-white/10'
          }`}
        >
          <Grid2X2 size={16} /> Grid
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader className="animate-spin text-primary" size={32} />
        </div>
      )}

      {error && (
        <div className="rounded-2xl bg-red-500/10 p-4 text-red-400">
          Failed to load workflows: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      )}

      {!isLoading && filteredWorkflows.length === 0 && (
        <div className="rounded-2xl bg-white/5 p-8 text-center text-slate-400">
          {workflows.length === 0 ? 'No workflows yet. Create one to get started!' : 'No workflows match your search.'}
        </div>
      )}

      {!isLoading && filteredWorkflows.length > 0 && (
        <div className="overflow-hidden rounded-2xl bg-white/5 card-border">
          <div className="grid grid-cols-12 border-b border-white/5 px-4 py-3 text-xs uppercase tracking-wide text-slate-400">
            <div className="col-span-3">Workflow</div>
            <div className="col-span-3">Description</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Created</div>
            <div className="col-span-1">Execs</div>
            <div className="col-span-1 text-right">Actions</div>
          </div>
          {filteredWorkflows.map((w) => (
            <div key={w.id} className="grid grid-cols-12 items-center px-4 py-3 text-sm text-white odd:bg-white/[0.02]">
              <div className="col-span-3 font-semibold text-white">{w.name}</div>
              <div className="col-span-3 text-slate-400 truncate">{w.description || '-'}</div>
              <div className="col-span-2">
                <StatusBadge 
                  status={w.is_active ? 'success' : 'warning'} 
                  label={w.is_active ? 'Active' : 'Inactive'} 
                />
              </div>
              <div className="col-span-2 text-slate-400 text-xs">
                {new Date(w.created_at).toLocaleDateString()}
              </div>
              <div className="col-span-1 text-slate-400">{w.execution_count || 0}</div>
              <div className="col-span-1 flex items-center justify-end gap-2 text-slate-400">
                <button 
                  onClick={() => handleExecute(w.id)}
                  disabled={executeWorkflowMutation.isPending}
                  className="rounded-lg bg-white/5 p-1.5 ring-1 ring-white/10 hover:bg-white/10 disabled:opacity-50"
                  title="Execute workflow"
                >
                  <PlayCircle size={16} />
                </button>
                <button 
                  onClick={() => navigate(`/app/workflows/${w.id}`)}
                  className="rounded-lg bg-white/5 p-1.5 ring-1 ring-white/10 hover:bg-white/10"
                  title="Edit workflow"
                >
                  <Edit3 size={16} />
                </button>
                <button 
                  onClick={() => handleToggleStatus(w)}
                  className="rounded-lg bg-white/5 p-1.5 ring-1 ring-white/10 hover:bg-white/10"
                  title={w.is_active ? 'Deactivate' : 'Activate'}
                >
                  <Settings size={16} />
                </button>
                <button 
                  onClick={() => handleDelete(w.id)}
                  disabled={deleteWorkflowMutation.isPending}
                  className="rounded-lg bg-white/5 p-1.5 ring-1 ring-white/10 hover:bg-white/10 disabled:opacity-50"
                  title="Delete workflow"
                >
                  <Trash2 size={16} className="text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </PageTransition>
  )
}

