import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API calls
export const authAPI = {
  register: (data) => apiClient.post('/auth/register', data),
  login: (data) => apiClient.post('/auth/login', data),
  getCurrentUser: () => apiClient.get('/auth/me'),
  listUsers: () => apiClient.get('/auth/users'),
  createUser: (data) => apiClient.post('/auth/users', data),
  updateUser: (userId, data) => apiClient.put(`/auth/users/${userId}`, data),
  deleteUser: (userId) => apiClient.delete(`/auth/users/${userId}`),
  changePassword: (oldPassword, newPassword) =>
    apiClient.post('/auth/change-password', { old_password: oldPassword, new_password: newPassword }),
};

// Analytics API calls
export const analyticsAPI = {
  getSummary: () => apiClient.get('/analytics/summary'),
  getTopProducts: (days = 7, limit = 10) =>
    apiClient.get('/analytics/top-products', { params: { days, limit } }),
  getRevenueChart: (days = 30) =>
    apiClient.get('/analytics/revenue-chart', { params: { days } }),
  getOrderDistribution: (days = 7) =>
    apiClient.get('/analytics/order-distribution', { params: { days } }),
  getInventoryStatus: () => apiClient.get('/analytics/inventory-status'),
  getCategorySales: (days = 30) =>
    apiClient.get('/analytics/category-sales', { params: { days } }),
  getActivityTimeline: (days = 7) =>
    apiClient.get('/analytics/activity-timeline', { params: { days } }),
};

// Inventory API calls — maps to backend /api/products/
export const inventoryAPI = {
  getAll: (params = {}) => apiClient.get('/products/', { params }),
  getOne: (id) => apiClient.get(`/products/${id}`),
  create: (data) => apiClient.post('/products/', data),
  update: (id, data) => apiClient.patch(`/products/${id}`, data),
  delete: (id) => apiClient.delete(`/products/${id}`),
  getLowStock: (threshold = 10) => apiClient.get('/products/low-stock', { params: { threshold } }),
};

// Orders API calls
export const ordersAPI = {
  getAll: (params = {}) => apiClient.get('/orders/', { params }),
  getOne: (id) => apiClient.get(`/orders/${id}`),
  create: (data) => apiClient.post('/orders/', data),
  updateStatus: (id, status) => apiClient.patch(`/orders/${id}/status`, null, { params: { status } }),
  getDelayed: (hours = 48) => apiClient.get('/orders/pending-delayed', { params: { hours } }),
};

// Customers API calls
export const customersAPI = {
  getAll: (params = {}) => apiClient.get('/customers/', { params }),
  create: (data) => apiClient.post('/customers/', data),
  getInactive: (days = 30) => apiClient.get('/customers/inactive', { params: { days } }),
};

// Reports API calls — wired to real /api/reports/ backend
export const reportsAPI = {
  getAll: () => apiClient.get('/reports/'),
  getMetrics: () => apiClient.get('/reports/metrics'),
  generateNow: (reportType = 'sales') =>
    apiClient.post('/reports/generate-now', null, { params: { report_type: reportType } }),
  generateCustom: (data) => apiClient.post('/reports/custom/generate', data),
  getTemplates: () => apiClient.get('/reports/templates'),
};

// AI API calls — all wired to real backend endpoints
export const aiAPI = {
  query: (question) => apiClient.post('/ai/query', { question }),
  getSuggestions: () => apiClient.get('/ai/suggest'),
  getMorningSummary: () => apiClient.get('/ai/morning-summary'),
};

// Workflows API calls
export const workflowsAPI = {
  list: () => apiClient.get('/workflows/'),
  create: (input) => apiClient.post('/workflows/create', { natural_language_input: input }),
  getLogs: (workflowId) => apiClient.get(`/workflows/${workflowId}/logs`),
  runNow: (workflowId) => apiClient.post(`/workflows/${workflowId}/run-now`),
  delete: (workflowId) => apiClient.delete(`/workflows/${workflowId}`),
  getOne: (id) => apiClient.get(`/workflows/${id}`),
  update: (id, data) => apiClient.put(`/workflows/${id}`, data),
};

// Gmail API calls
export const gmailAPI = {
  checkStatus: () => apiClient.get('/gmail/status'),
  listMessages: (params = {}) => apiClient.get('/gmail/messages', { params }),
  getThread: (threadId) => apiClient.get(`/gmail/threads/${threadId}`),
  reply: (payload) => apiClient.post('/gmail/reply', payload),
};

// Settings API calls — wired to real backend
export const settingsAPI = {
  getSettings: () => apiClient.get('/settings/'),
  getIntegrations: () => apiClient.get('/settings/integrations'),
  updateUserEmail: (email) => apiClient.put('/settings/email', null, { params: { new_email: email } }),
};

export default apiClient;
