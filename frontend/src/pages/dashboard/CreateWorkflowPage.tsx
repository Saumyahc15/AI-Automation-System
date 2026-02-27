import { motion } from 'framer-motion'
import { Wand2, CheckCircle2, AlertCircle, Loader, RefreshCw, Calendar, Plus, Clock, MapPin, Trash2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import PageTransition from '../../components/animations/PageTransition'
import { useCreateWorkflow } from '../../lib/hooks'
import { apiClient } from '../../lib/api-client'

interface CalendarEvent {
  id: string
  summary: string
  start: string
  end: string
  description?: string
  location?: string
  html_link?: string
}

export default function CreateWorkflowPage() {
  const [tab, setTab] = useState<'workflow' | 'calendar'>('workflow')
  
  // Workflow states
  const [instruction, setInstruction] = useState('')
  const [workflowName, setWorkflowName] = useState('')
  const [generatedWorkflow, setGeneratedWorkflow] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [executionResult, setExecutionResult] = useState<any>(null)
  
  // Calendar states
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [calendarLoading, setCalendarLoading] = useState(true)
  const [calendarMode, setCalendarMode] = useState<'list' | 'create'>('list')
  const [eventPrompt, setEventPrompt] = useState('')
  const [creatingEvent, setCreatingEvent] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    summary: '',
    start_datetime: '',
    duration_minutes: 30,
    description: '',
    location: '',
  })
  
  const createWorkflowMutation = useCreateWorkflow()

  // Load calendar events when calendar tab is opened
  useEffect(() => {
    if (tab === 'calendar') {
      loadCalendarEvents()
    }
  }, [tab])

  const loadCalendarEvents = async () => {
    try {
      setCalendarLoading(true)
      const response = await apiClient.getUpcomingEvents(10, 30)
      setEvents(response.events || [])
    } catch (error) {
      console.error('Error loading calendar events:', error)
      toast.error('Failed to load calendar events')
    } finally {
      setCalendarLoading(false)
    }
  }

  const handleGenerateWorkflow = async () => {
    if (!instruction.trim()) {
      toast.error('Please describe your workflow')
      return
    }

    setLoading(true)
    try {
      const response = await createWorkflowMutation.mutateAsync({
        name: workflowName || `Workflow - ${new Date().toLocaleTimeString()}`,
        description: `Created from: ${instruction.substring(0, 100)}...`,
        user_instruction: instruction,
      })

      setGeneratedWorkflow(response)
      toast.success('✅ Workflow created successfully!')
    } catch (error) {
      console.error('Error creating workflow:', error)
      toast.error('❌ Failed to create workflow')
    } finally {
      setLoading(false)
    }
  }

  const handleExecuteWorkflow = async () => {
    if (!generatedWorkflow) {
      toast.error('No workflow to execute')
      return
    }

    setExecuting(true)
    setExecutionResult(null)
    
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Workflow execution timed out')), 60000)
      )
      
      const result: any = await Promise.race([
        apiClient.executeWorkflow(generatedWorkflow.id),
        timeoutPromise
      ])
      
      if (result.status === 'success') {
        toast.success('✅ Workflow executed successfully!')
        setExecutionResult(result.result)
      } else {
        toast.error(`❌ Workflow failed: ${result.error || 'Unknown error'}`)
        setExecutionResult(result.result || result)
      }
    } catch (error) {
      console.error('Error executing workflow:', error)
      const errorMsg = error instanceof Error ? error.message : 'Failed to execute workflow'
      toast.error(`❌ ${errorMsg}`)
    } finally {
      setExecuting(false)
    }
  }

  const handleCreateEventFromPrompt = async () => {
    if (!eventPrompt.trim()) {
      toast.error('Please enter event details')
      return
    }

    setCreatingEvent(true)
    try {
      const result = await apiClient.createQuickEvent(eventPrompt)
      if (result.status === 'success') {
        toast.success('✅ Event created successfully!')
        setEventPrompt('')
        setCalendarMode('list')
        await loadCalendarEvents()
      } else {
        toast.error(result.message || 'Failed to create event')
      }
    } catch (error) {
      console.error('Error creating event:', error)
      toast.error('Failed to create event')
    } finally {
      setCreatingEvent(false)
    }
  }

  const handleCreateEventFromForm = async () => {
    if (!formData.summary.trim()) {
      toast.error('Event title is required')
      return
    }
    if (!formData.start_datetime) {
      toast.error('Start date/time is required')
      return
    }

    setCreatingEvent(true)
    try {
      const endDateTime = new Date(new Date(formData.start_datetime).getTime() + formData.duration_minutes * 60000).toISOString()
      const result = await apiClient.createCalendarEvent({
        title: formData.summary,
        start_time: formData.start_datetime,
        end_time: endDateTime,
        description: formData.description,
        location: formData.location,
      })
      toast.success('✅ Event created successfully!')
      setShowForm(false)
      setFormData({ summary: '', start_datetime: '', duration_minutes: 30, description: '', location: '' })
      await loadCalendarEvents()
    } catch (error) {
      console.error('Error creating event:', error)
      toast.error('Failed to create event')
    } finally {
      setCreatingEvent(false)
    }
  }

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return

    try {
      await apiClient.deleteCalendarEvent(eventId)
      toast.success('✅ Event deleted successfully!')
      await loadCalendarEvents()
    } catch (error) {
      console.error('Error deleting event:', error)
      toast.error('Failed to delete event')
    }
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400">Create</p>
            <h2 className="text-2xl font-bold">Workflows & Calendar</h2>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 rounded-2xl bg-white/5 p-2 ring-1 ring-white/10">
          <button
            onClick={() => setTab('workflow')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              tab === 'workflow'
                ? 'bg-primary text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Wand2 size={16} /> Create Workflow
          </button>
          <button
            onClick={() => setTab('calendar')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              tab === 'calendar'
                ? 'bg-primary text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calendar size={16} /> Manage Calendar
          </button>
        </div>

        {/* Workflow Tab */}
        {tab === 'workflow' && (
          <>
            {!generatedWorkflow ? (
              <div className="grid gap-4 lg:grid-cols-3">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass rounded-3xl p-4 lg:col-span-2"
                >
                  <div className="mb-3 flex items-center gap-2 text-primary">
                    <Wand2 size={18} />
                    <p className="text-sm font-semibold text-white">Describe your workflow</p>
                  </div>
                  
                  <input
                    type="text"
                    value={workflowName}
                    onChange={(e) => setWorkflowName(e.target.value)}
                    placeholder="Workflow name (optional)"
                    className="w-full mb-3 rounded-2xl bg-slate-900/60 p-3 text-sm text-white outline-none ring-1 ring-white/10 placeholder:text-slate-500"
                  />

                  <textarea
                    rows={6}
                    value={instruction}
                    onChange={(e) => setInstruction(e.target.value)}
                    className="w-full rounded-2xl bg-slate-900/60 p-3 text-sm text-white outline-none ring-1 ring-white/10 placeholder:text-slate-500"
                    placeholder="Example: Every day at 9 AM, fetch all trending GitHub repositories and send them via email to user@example.com and also post to Telegram..."
                  />
                  <button 
                    onClick={handleGenerateWorkflow}
                    disabled={loading || !instruction.trim()}
                    className="mt-3 w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white ring-1 ring-primary/50 transition hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading && <Loader size={16} className="animate-spin" />}
                    {loading ? 'Creating workflow...' : 'Create Workflow'}
                  </button>
                </motion.div>

                <div className="glass space-y-3 rounded-3xl p-4">
                  <p className="text-sm font-semibold text-white">💡 Examples</p>
                  {[
                    '"Daily at 9 AM, send trending GitHub repos to my email"',
                    '"When I receive invoice emails, save attachments to Drive"',
                    '"Send Telegram message every morning with tech news"',
                    '"Monitor GitHub for new releases and notify on Slack"',
                  ].map((tip, idx) => (
                    <div key={idx} className="rounded-2xl bg-white/5 p-3 text-xs text-slate-300 ring-1 ring-white/5 cursor-pointer hover:bg-white/10 transition" onClick={() => setInstruction(tip)}>
                      {tip}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="glass rounded-3xl p-6 border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10">
                    <div className="flex items-center gap-2 text-emerald-400 mb-4">
                      <CheckCircle2 size={20} />
                      <p className="text-sm font-semibold">Workflow Created</p>
                    </div>
                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="text-xs text-slate-400 uppercase tracking-wide">Name</p>
                        <p className="text-white font-semibold mt-1">{generatedWorkflow.name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 uppercase tracking-wide">ID</p>
                        <p className="text-white font-mono text-sm mt-1">#{generatedWorkflow.id}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 uppercase tracking-wide">Status</p>
                        <p className="text-emerald-400 font-semibold mt-1">✓ {generatedWorkflow.is_active ? 'Active' : 'Inactive'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 uppercase tracking-wide">Trigger</p>
                        <p className="text-white capitalize mt-1">{generatedWorkflow.trigger_type || 'Manual'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="glass rounded-3xl p-6">
                    <div className="flex items-center gap-2 text-blue-400 mb-4">
                      <AlertCircle size={20} />
                      <p className="text-sm font-semibold">What's Next?</p>
                    </div>
                    <div className="space-y-2 text-sm text-slate-300">
                      <div className="flex gap-2">
                        <span className="text-primary">✓</span>
                        <span>Workflow created and ready to use</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-primary">→</span>
                        <span>Execute now or let it run on schedule</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-primary">📊</span>
                        <span>Monitor execution in Execution Logs</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-primary">📈</span>
                        <span>View stats in Analytics dashboard</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="glass rounded-3xl p-4">
                  <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-3">Workflow Description</p>
                  <p className="text-sm text-slate-300">{generatedWorkflow.description}</p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleExecuteWorkflow}
                    disabled={executing}
                    className="flex-1 rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-white ring-1 ring-primary/50 transition hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {executing && <Loader size={16} className="animate-spin" />}
                    {executing ? 'Executing...' : 'Execute Now'}
                  </button>
                  <button
                    onClick={() => {
                      setGeneratedWorkflow(null)
                      setInstruction('')
                      setWorkflowName('')
                      setExecutionResult(null)
                    }}
                    className="flex-1 rounded-2xl bg-white/10 px-6 py-3 text-sm font-semibold text-white ring-1 ring-white/10 transition hover:bg-white/15 flex items-center justify-center gap-2"
                  >
                    <RefreshCw size={16} />
                    Create Another
                  </button>
                </div>

                {executionResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`glass rounded-3xl p-6 border ${
                      executionResult.status === 'success'
                        ? 'border-emerald-500/30 bg-gradient-to-br from-emerald-500/10'
                        : 'border-red-500/30 bg-gradient-to-br from-red-500/10'
                    }`}
                  >
                    <div className={`flex items-center gap-2 mb-4 ${
                      executionResult.status === 'success' ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {executionResult.status === 'success' ? (
                        <CheckCircle2 size={20} />
                      ) : (
                        <AlertCircle size={20} />
                      )}
                      <p className="text-sm font-semibold capitalize">
                        {executionResult.status === 'success' ? 'Execution Successful' : 'Execution Failed'}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Message</p>
                        <p className="text-sm text-slate-200">{executionResult.message}</p>
                      </div>

                      {executionResult.data && Object.keys(executionResult.data).length > 0 && (
                        <div>
                          <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Results</p>
                          <div className="space-y-2">
                            {executionResult.data.trending_repos && Array.isArray(executionResult.data.trending_repos) && (
                              <div className="space-y-2">
                                <p className="text-xs text-slate-300 font-semibold">Top Trending Repositories:</p>
                                {executionResult.data.trending_repos.slice(0, 10).map((repo: any, idx: number) => (
                                  <div key={idx} className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10 text-sm">
                                    <a 
                                      href={repo.url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-primary hover:underline font-semibold"
                                    >
                                      {idx + 1}. {repo.name}
                                    </a>
                                    <p className="text-xs text-slate-400 mt-1">{repo.description}</p>
                                  </div>
                                ))}
                              </div>
                            )}

                            {executionResult.data.top_repos && Array.isArray(executionResult.data.top_repos) && (
                              <div className="space-y-2">
                                <p className="text-xs text-slate-300 font-semibold">Top Repositories:</p>
                                <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
                                  {executionResult.data.top_repos.map((repo: string, idx: number) => (
                                    <p key={idx} className="text-sm text-slate-300">
                                      {idx + 1}. {repo}
                                    </p>
                                  ))}
                                </div>
                              </div>
                            )}

                            {executionResult.data.trends_count !== undefined && (
                              <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
                                <p className="text-sm text-slate-300">
                                  <span className="font-semibold">Trends Fetched:</span> {executionResult.data.trends_count}
                                </p>
                              </div>
                            )}

                            {!executionResult.data.trending_repos && 
                             !executionResult.data.top_repos && 
                             !executionResult.data.trends_count && (
                              <pre className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10 text-xs text-slate-300 overflow-auto max-h-64">
                                {JSON.stringify(executionResult.data, null, 2)}
                              </pre>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </>
        )}

        {/* Calendar Tab */}
        {tab === 'calendar' && (
          <div className="space-y-4">
            {calendarMode === 'list' ? (
              <>
                <div className="flex gap-3">
                  <button
                    onClick={() => setCalendarMode('create')}
                    className="flex items-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white ring-1 ring-primary/50 transition hover:bg-primary/80"
                  >
                    <Plus size={16} /> Create Event
                  </button>
                  <button
                    onClick={loadCalendarEvents}
                    disabled={calendarLoading}
                    className="flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold text-white ring-1 ring-white/10 transition hover:bg-white/15 disabled:opacity-50"
                  >
                    <RefreshCw size={16} className={calendarLoading ? 'animate-spin' : ''} /> Refresh
                  </button>
                </div>

                {calendarLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader className="animate-spin text-primary" size={32} />
                  </div>
                ) : events.length === 0 ? (
                  <div className="glass rounded-3xl p-8 text-center text-slate-400">
                    <Calendar size={24} className="mx-auto mb-3 opacity-50" />
                    <p>No upcoming events. Create one to get started!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {events.map((event) => (
                      <div key={event.id} className="glass rounded-2xl p-4 ring-1 ring-white/10">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-white">{event.summary}</h3>
                            <div className="mt-2 space-y-1 text-sm text-slate-400">
                              <div className="flex items-center gap-2">
                                <Clock size={14} />
                                <span>{new Date(event.start).toLocaleString()}</span>
                              </div>
                              {event.location && (
                                <div className="flex items-center gap-2">
                                  <MapPin size={14} />
                                  <span>{event.location}</span>
                                </div>
                              )}
                              {event.description && (
                                <p className="mt-2 text-slate-300">{event.description}</p>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteEvent(event.id)}
                            className="rounded-lg p-2 hover:bg-red-500/10 transition"
                          >
                            <Trash2 size={16} className="text-red-400" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="glass rounded-3xl p-4">
                  <p className="text-sm font-semibold text-white mb-3">Quick Event Creation</p>
                  <p className="text-xs text-slate-400 mb-3">Describe your event in natural language</p>
                  <textarea
                    rows={3}
                    value={eventPrompt}
                    onChange={(e) => setEventPrompt(e.target.value)}
                    placeholder="E.g., Meeting with John tomorrow at 3pm at office"
                    className="w-full mb-3 rounded-2xl bg-slate-900/60 p-3 text-sm text-white outline-none ring-1 ring-white/10 placeholder:text-slate-500"
                  />
                  <button
                    onClick={handleCreateEventFromPrompt}
                    disabled={creatingEvent || !eventPrompt.trim()}
                    className="w-full rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/80 disabled:opacity-50"
                  >
                    {creatingEvent ? 'Creating...' : 'Create Event'}
                  </button>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-slate-950 px-2 text-xs text-slate-400">OR</span>
                  </div>
                </div>

                <div className="glass rounded-3xl p-4 space-y-3">
                  <p className="text-sm font-semibold text-white">Detailed Event Form</p>
                  
                  <input
                    type="text"
                    value={formData.summary}
                    onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                    placeholder="Event title *"
                    className="w-full rounded-2xl bg-slate-900/60 p-3 text-sm text-white outline-none ring-1 ring-white/10 placeholder:text-slate-500"
                  />
                  
                  <input
                    type="datetime-local"
                    value={formData.start_datetime}
                    onChange={(e) => setFormData({ ...formData, start_datetime: e.target.value })}
                    className="w-full rounded-2xl bg-slate-900/60 p-3 text-sm text-white outline-none ring-1 ring-white/10"
                  />
                  
                  <input
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                    placeholder="Duration (minutes)"
                    className="w-full rounded-2xl bg-slate-900/60 p-3 text-sm text-white outline-none ring-1 ring-white/10 placeholder:text-slate-500"
                  />
                  
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Location (optional)"
                    className="w-full rounded-2xl bg-slate-900/60 p-3 text-sm text-white outline-none ring-1 ring-white/10 placeholder:text-slate-500"
                  />
                  
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Description (optional)"
                    className="w-full rounded-2xl bg-slate-900/60 p-3 text-sm text-white outline-none ring-1 ring-white/10 placeholder:text-slate-500"
                  />

                  <div className="flex gap-3">
                    <button
                      onClick={handleCreateEventFromForm}
                      disabled={creatingEvent}
                      className="flex-1 rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/80 disabled:opacity-50"
                    >
                      {creatingEvent ? 'Creating...' : 'Create Event'}
                    </button>
                    <button
                      onClick={() => {
                        setCalendarMode('list')
                        setFormData({ summary: '', start_datetime: '', duration_minutes: 30, description: '', location: '' })
                      }}
                      className="flex-1 rounded-2xl bg-white/10 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/10 transition hover:bg-white/15"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </PageTransition>
  )
}

