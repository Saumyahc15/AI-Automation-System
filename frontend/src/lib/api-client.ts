/**
 * API Client for AI Automation System
 * Handles all communication with the backend API
 */

const API_URL = 'http://localhost:8000'

class APIClient {
  private baseURL: string

  constructor(baseURL: string = API_URL) {
    this.baseURL = baseURL
  }

  /**
   * Make HTTP request to backend
   */
  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`

    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`API Error: ${response.status} - ${error}`)
      }

      // Handle empty responses
      const text = await response.text()
      if (!text) return null as any

      return JSON.parse(text)
    } catch (error) {
      console.error(`[API Error] ${endpoint}:`, error)
      throw error
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'GET',
    })
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    })
  }

  /**
   * Get user ID from localStorage
   */
  private getUserId(): number {
    const userId = localStorage.getItem('user_id')
    if (!userId) {
      throw new Error('User not authenticated')
    }
    return parseInt(userId, 10)
  }

  // ==================== WORKFLOW ENDPOINTS ====================

  /**
   * Get all workflows
   */
  async getWorkflows() {
    const userId = this.getUserId()
    return this.get(`/api/workflows?user_id=${userId}`)
  }

  /**
   * Get single workflow
   */
  async getWorkflow(id: number) {
    const userId = this.getUserId()
    return this.get(`/api/workflows/${id}?user_id=${userId}`)
  }

  /**
   * Create new workflow
   */
  async createWorkflow(data: {
    name: string
    description?: string
    user_instruction: string
  }) {
    const userId = this.getUserId()
    return this.post(`/api/workflows/create?user_id=${userId}`, data)
  }

  /**
   * Update workflow
   */
  async updateWorkflow(id: number, data: any) {
    const userId = this.getUserId()
    return this.put(`/api/workflows/${id}?user_id=${userId}`, data)
  }

  /**
   * Delete workflow
   */
  async deleteWorkflow(id: number) {
    const userId = this.getUserId()
    return this.delete(`/api/workflows/${id}?user_id=${userId}`)
  }

  /**
   * Execute workflow immediately
   */
  async executeWorkflow(id: number) {
    const userId = this.getUserId()
    return this.post(`/api/workflows/execute?user_id=${userId}`, { workflow_id: id })
  }

  /**
   * Activate workflow
   */
  async activateWorkflow(id: number) {
    const userId = this.getUserId()
    return this.post(`/api/workflows/${id}/activate?user_id=${userId}`, {})
  }

  /**
   * Deactivate workflow
   */
  async deactivateWorkflow(id: number) {
    const userId = this.getUserId()
    return this.post(`/api/workflows/${id}/deactivate?user_id=${userId}`, {})
  }

  // ==================== EXECUTION LOGS ====================

  /**
   * Get all execution logs
   */
  async getLogs(limit: number = 100) {
    const userId = this.getUserId()
    return this.get(`/api/logs?user_id=${userId}&limit=${limit}`)
  }

  /**
   * Get logs for specific workflow
   */
  async getWorkflowLogs(workflowId: number) {
    const userId = this.getUserId()
    return this.get(`/api/workflows/${workflowId}/logs?user_id=${userId}`)
  }

  // ==================== FILE OPERATIONS ====================

  /**
   * Upload file
   */
  async uploadFile(file: File) {
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch(`${this.baseURL}/api/files/upload`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`)
      }

      return response.json()
    } catch (error) {
      console.error('[API Error] File upload:', error)
      throw error
    }
  }

  /**
   * Download file
   */
  async downloadFile(fileId: string) {
    return this.get(`/api/files/${fileId}`)
  }

  // ==================== AUTH ENDPOINTS ====================

  /**
   * Register a new user
   */
  async register(data: {
    email: string
    password: string
    full_name: string
  }) {
    return this.post('/auth/register', data)
  }

  /**
   * Login user
   */
  async login(data: { email: string; password: string }) {
    return this.post('/auth/login', data)
  }

  /**
   * Get current user
   */
  async getCurrentUser(userId: number) {
    return this.get(`/auth/me?user_id=${userId}`)
  }

  /**
   * Update current user profile
   */
  async updateUserProfile(userId: number, data: {
    full_name?: string
    avatar?: string
  }) {
    return this.put(`/auth/me?user_id=${userId}`, data)
  }

  // ==================== CALENDAR ENDPOINTS ====================

  /**
   * Check calendar integration status
   */
  async getCalendarStatus() {
    return this.get('/api/integrations/calendar/status')
  }

  /**
   * List all calendars
   */
  async getCalendars() {
    return this.get('/api/integrations/calendar/calendars')
  }

  /**
   * Create a calendar event
   */
  async createCalendarEvent(data: {
    title: string
    start_time: string
    end_time?: string
    description?: string
    location?: string
    attendees?: string[]
  }) {
    return this.post('/api/integrations/calendar/events', data)
  }

  /**
   * Get upcoming events
   */
  async getUpcomingEvents(maxResults: number = 10, daysAhead: number = 7) {
    return this.get(`/api/integrations/calendar/events/upcoming?max_results=${maxResults}&days_ahead=${daysAhead}`)
  }

  /**
   * Get event details
   */
  async getEventDetails(eventId: string) {
    return this.get(`/api/integrations/calendar/events/${eventId}`)
  }

  /**
   * Update calendar event
   */
  async updateCalendarEvent(eventId: string, data: {
    title?: string
    start_time?: string
    end_time?: string
    description?: string
    location?: string
  }) {
    return this.put(`/api/integrations/calendar/events/${eventId}`, data)
  }

  /**
   * Delete calendar event
   */
  async deleteCalendarEvent(eventId: string) {
    return this.delete(`/api/integrations/calendar/events/${eventId}`)
  }

  /**
   * Search calendar events
   */
  async searchCalendarEvents(query: string, maxResults: number = 10) {
    return this.get(`/api/integrations/calendar/events/search?query=${encodeURIComponent(query)}&max_results=${maxResults}`)
  }

  /**
   * Create quick event from natural language
   */
  async createQuickEvent(text: string) {
    return this.post('/api/integrations/calendar/events/quick', { text })
  }

  /**
   * Get calendar events (alias for getUpcomingEvents)
   */
  async getCalendarEvents(maxResults: number = 10, _timeMin?: string, _timeMax?: string) {
    return this.getUpcomingEvents(maxResults)
  }
}

// Create singleton instance
export const apiClient = new APIClient()

export default apiClient
