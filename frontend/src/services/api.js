/**
 * API Service Client
 * Configured Axios instance connecting to Express Gateway (/api).
 * Automatically injects JWT Bearer tokens and handles response errors.
 */

import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: inject token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('mplads_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Don't auto-redirect if we're on login page
      if (!window.location.pathname.includes('/login')) {
        console.warn('[API Auth] Session expired or invalid token.');
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (userData) => api.post('/auth/register', userData),
  getMe: () => api.get('/auth/me'),
};

export const projectsAPI = {
  getAll: (params) => api.get('/projects', { params }),
  getById: (id) => api.get(`/projects/${id}`),
  create: (projectData) => api.post('/projects', projectData),
};

export const milestonesAPI = {
  create: (formData) => api.post('/milestones', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  verify: (id, payload) => api.put(`/milestones/${id}/verify`, payload),
};

export const analyticsAPI = {
  getMetrics: (params) => api.get('/analytics', { params }),
  getGeoJSON: (params) => api.get('/analytics/geojson', { params }),
};

export const alertsAPI = {
  getAll: (params) => api.get('/alerts', { params }),
  updateStatus: (id, status, notes) => api.put(`/alerts/${id}/status`, { status, notes }),
};

export default api;
