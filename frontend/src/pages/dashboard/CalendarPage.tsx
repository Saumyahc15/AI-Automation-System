import { useState, useEffect } from 'react'
import { Calendar, Plus, Clock, MapPin, Trash2, AlertCircle, CheckCircle } from 'lucide-react'
import PageTransition from '../../components/animations/PageTransition'
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

interface CreateEventForm {
  summary: string
  start_datetime: string
  duration_minutes: number
  description: string
  location: string
  attendees: string
}

interface ApiResponse {
  status: string
  message?: string
  summary?: string
  event_id?: string
  events?: CalendarEvent[]
  count?: number
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [createMode, setCreateMode] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [useForm, setUseForm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [formData, setFormData] = useState<CreateEventForm>({
    summary: '',
    start_datetime: '',
    duration_minutes: 30,
    description: '',
    location: '',
    attendees: '',
  })

  // Load events on mount
  useEffect(() => {
    loadEvents()
  }, [])

  const loadEvents = async () => {
    try {
      setLoading(true)
      const response = (await apiClient.getUpcomingEvents(10, 30)) as ApiResponse
      setEvents(response.events || [])
    } catch (err) {
      setError('Failed to load calendar events')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const createEventFromPrompt = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt')
      return
    }

    try {
      setLoading(true)
      setError(null)
      const response = (await apiClient.createQuickEvent(prompt)) as ApiResponse

      if (response.status === 'success') {
        setSuccess(`✅ Event created successfully!`)
        setPrompt('')
        setCreateMode(false)
        await loadEvents()
      } else {
        setError(response.message || 'Failed to create event')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create event from prompt')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const createEventFromForm = async () => {
    if (!formData.summary.trim()) {
      setError('Event title is required')
      return
    }

    if (!formData.start_datetime) {
      setError('Start date and time is required')
      return
    }

    try {
      setLoading(true)
      setError(null)
      const response = (await apiClient.createCalendarEvent({
        title: formData.summary,
        start_time: formData.start_datetime,
        description: formData.description,
        location: formData.location,
        attendees: formData.attendees
          ? formData.attendees.split(',').map((e) => e.trim())
          : [],
      })) as ApiResponse

      if (response.status === 'success') {
        setSuccess(`✅ Event "${response.summary}" created successfully!`)
        setFormData({
          summary: '',
          start_datetime: '',
          duration_minutes: 30,
          description: '',
          location: '',
          attendees: '',
        })
        setCreateMode(false)
        setUseForm(false)
        await loadEvents()
      } else {
        setError(response.message || 'Failed to create event')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create event')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const deleteEvent = async (eventId: string) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return

    try {
      const response = (await apiClient.deleteCalendarEvent(eventId)) as ApiResponse
      if (response.status === 'success') {
        setSuccess('Event deleted successfully')
        await loadEvents()
      } else {
        setError('Failed to delete event')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete event')
      console.error(err)
    }
  }

  const formatDateTime = (dateTimeStr: string) => {
    try {
      const date = new Date(dateTimeStr)
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateTimeStr
    }
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400">Calendar</p>
            <h2 className="text-2xl font-bold">Google Calendar Integration</h2>
          </div>
          <button
            onClick={() => setCreateMode(!createMode)}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-glow transition hover:shadow-glow/50"
          >
            <Plus size={16} /> Create Event
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="flex items-center gap-3 rounded-2xl bg-red-500/10 p-4 ring-1 ring-red-500/20">
            <AlertCircle size={18} className="text-red-400" />
            <p className="text-sm text-red-200">{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-300"
            >
              ✕
            </button>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-3 rounded-2xl bg-emerald-500/10 p-4 ring-1 ring-emerald-500/20">
            <CheckCircle size={18} className="text-emerald-400" />
            <p className="text-sm text-emerald-200">{success}</p>
            <button
              onClick={() => setSuccess(null)}
              className="ml-auto text-emerald-400 hover:text-emerald-300"
            >
              ✕
            </button>
          </div>
        )}

        {/* Create Event Section */}
        {createMode && (
          <div className="glass rounded-3xl p-6 space-y-4">
            <h3 className="text-lg font-bold">Create a Calendar Event</h3>

            {/* Mode Selector */}
            <div className="flex gap-2">
              <button
                onClick={() => setUseForm(false)}
                className={`flex-1 rounded-lg px-4 py-2 transition ${
                  !useForm
                    ? 'bg-primary text-white'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                📝 Natural Language
              </button>
              <button
                onClick={() => setUseForm(true)}
                className={`flex-1 rounded-lg px-4 py-2 transition ${
                  useForm
                    ? 'bg-primary text-white'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                📋 Form
              </button>
            </div>

            {/* Natural Language Input */}
            {!useForm ? (
              <div className="space-y-3">
                <label className="block text-sm text-slate-300">Describe your event:</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g., Create a team meeting on January 4, 2026 at 5:00 PM for 30 minutes in the conference room"
                  className="w-full rounded-2xl bg-white/5 px-4 py-3 text-white placeholder-slate-500 ring-1 ring-white/10 focus:outline-none focus:ring-primary"
                  rows={3}
                />
                <p className="text-xs text-slate-400">
                  💡 Tip: Include event name, date, time, duration, and location for best results
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={createEventFromPrompt}
                    disabled={loading || !prompt.trim()}
                    className="flex-1 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-glow transition hover:shadow-glow/50 disabled:opacity-50"
                  >
                    {loading ? '⏳ Creating...' : '✨ Create from Prompt'}
                  </button>
                  <button
                    onClick={() => setCreateMode(false)}
                    className="flex-1 rounded-xl bg-white/5 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/10 transition hover:bg-white/10"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              /* Form Input */
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Event Title *</label>
                  <input
                    type="text"
                    value={formData.summary}
                    onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                    placeholder="e.g., Team Meeting"
                    className="w-full rounded-2xl bg-white/5 px-4 py-2 text-white placeholder-slate-500 ring-1 ring-white/10 focus:outline-none focus:ring-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">Start Date & Time *</label>
                    <input
                      type="datetime-local"
                      value={formData.start_datetime}
                      onChange={(e) =>
                        setFormData({ ...formData, start_datetime: e.target.value })
                      }
                      className="w-full rounded-2xl bg-white/5 px-4 py-2 text-white ring-1 ring-white/10 focus:outline-none focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-300 mb-1">Duration (minutes)</label>
                    <input
                      type="number"
                      value={formData.duration_minutes}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          duration_minutes: parseInt(e.target.value) || 30,
                        })
                      }
                      min="5"
                      step="5"
                      className="w-full rounded-2xl bg-white/5 px-4 py-2 text-white ring-1 ring-white/10 focus:outline-none focus:ring-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-1">Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g., Conference Room A"
                    className="w-full rounded-2xl bg-white/5 px-4 py-2 text-white placeholder-slate-500 ring-1 ring-white/10 focus:outline-none focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Event details..."
                    className="w-full rounded-2xl bg-white/5 px-4 py-2 text-white placeholder-slate-500 ring-1 ring-white/10 focus:outline-none focus:ring-primary"
                    rows={2}
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-1">Attendees</label>
                  <input
                    type="text"
                    value={formData.attendees}
                    onChange={(e) => setFormData({ ...formData, attendees: e.target.value })}
                    placeholder="email1@example.com, email2@example.com"
                    className="w-full rounded-2xl bg-white/5 px-4 py-2 text-white placeholder-slate-500 ring-1 ring-white/10 focus:outline-none focus:ring-primary"
                  />
                  <p className="text-xs text-slate-400 mt-1">Separate emails with commas</p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={createEventFromForm}
                    disabled={loading || !formData.summary || !formData.start_datetime}
                    className="flex-1 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-glow transition hover:shadow-glow/50 disabled:opacity-50"
                  >
                    {loading ? '⏳ Creating...' : '✨ Create Event'}
                  </button>
                  <button
                    onClick={() => setCreateMode(false)}
                    className="flex-1 rounded-xl bg-white/5 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/10 transition hover:bg-white/10"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Events List */}
        <div>
          <h3 className="text-lg font-bold mb-4">Upcoming Events</h3>
          {loading && !createMode ? (
            <div className="glass rounded-3xl p-8 text-center">
              <p className="text-slate-400">Loading events...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="glass rounded-3xl p-8 text-center">
              <Calendar size={32} className="mx-auto mb-3 text-slate-500" />
              <p className="text-slate-400">No upcoming events. Create your first event!</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="glass rounded-3xl p-4 hover:bg-white/10 transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-white">{event.summary}</h4>

                      <div className="mt-3 space-y-1 text-sm text-slate-300">
                        <div className="flex items-center gap-2">
                          <Clock size={14} />
                          <span>{formatDateTime(event.start)}</span>
                        </div>

                        {event.location && (
                          <div className="flex items-center gap-2">
                            <MapPin size={14} />
                            <span>{event.location}</span>
                          </div>
                        )}

                        {event.description && (
                          <p className="text-slate-400 mt-2">{event.description}</p>
                        )}
                      </div>

                      {event.html_link && (
                        <a
                          href={event.html_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 inline-block text-sm text-primary hover:text-primary/80 transition"
                        >
                          View in Google Calendar →
                        </a>
                      )}
                    </div>

                    <button
                      onClick={() => deleteEvent(event.id)}
                      className="ml-4 p-2 rounded-lg hover:bg-red-500/20 text-red-400 transition"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  )
}
