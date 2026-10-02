import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired
      localStorage.removeItem('token');
      delete api.defaults.headers.common['Authorization'];
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API functions
export const authApi = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  register: (data: { email: string; password: string; full_name: string; role: string }) =>
    api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
};

export const usersApi = {
  list: (params?: { skip?: number; limit?: number; role?: string; is_active?: boolean }) =>
    api.get('/users', { params }),
  get: (id: number) => api.get(`/users/${id}`),
  create: (data: { email: string; password: string; full_name: string; role: string; is_active?: boolean }) =>
    api.post('/users', data),
  update: (id: number, data: Partial<{ email: string; full_name: string; role: string; is_active: boolean }>) =>
    api.patch(`/users/${id}`, data),
  delete: (id: number) => api.delete(`/users/${id}`),
};

export const hospitalsApi = {
  list: (params?: { skip?: number; limit?: number; verified_only?: boolean }) =>
    api.get('/hospitals', { params }),
  get: (id: number) => api.get(`/hospitals/${id}`),
  create: (data: {
    name: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    contact_email?: string;
    contact_phone?: string;
    license_number?: string;
  }) => api.post('/hospitals', data),
  update: (id: number, data: Partial<{
    name: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    contact_email?: string;
    contact_phone?: string;
    license_number?: string;
    is_verified?: boolean;
  }>) => api.patch(`/hospitals/${id}`, data),
  delete: (id: number) => api.delete(`/hospitals/${id}`),
};

export const requestsApi = {
  list: (params?: { skip?: number; limit?: number; status?: string; hospital_id?: number; patient_id?: number; is_emergency?: boolean }) =>
    api.get('/funding-requests', { params }),
  get: (id: number) => api.get(`/funding-requests/${id}`),
  create: (data: {
    patient_id: number;
    disease_id: number;
    procedure_id: number;
    treatment_package_id: number;
    hospital_id: number;
    requesting_doctor_id: number;
    surgery_cost_inr: number;
    surety_amount_inr: number;
    funding_gap_inr: number;
    urgency_score: number;
    ttc_category?: string;
    ttc_points?: number;
    success_rate?: number;
    success_rate_points?: number;
    age_factor_points?: number;
    is_emergency?: boolean;
    esi_level?: number;
  }) => api.post('/funding-requests', data),
  update: (id: number, data: Partial<{
    status: string;
    urgency_score: number;
    waiting_days: number;
    waiting_boost: number;
    eligibility_notes: string;
  }>) => api.patch(`/funding-requests/${id}`, data),
  calculateScore: (requestId: number) => api.post(`/funding-requests/${requestId}/calculate-score`),
};

export const scoringApi = {
  calculate: (data: {
    icd10_category: string;
    prototype_base_severity: number;
    ttc_category: string;
    success_rate: number;
    age: number;
    age_factor_points_10: number;
    waiting_days?: number;
    is_emergency?: boolean;
    esi_level?: number;
  }) => api.post('/scoring/calculate', data),
  calculateForRequest: (requestId: number) => api.post(`/scoring/requests/${requestId}/calculate`),
  getBreakdown: (requestId: number) => api.get(`/scoring/requests/${requestId}/breakdown`),
};

export const allocationApi = {
  run: (budgetId: number) => api.post('/allocation/run', { budget_id: budgetId }),
  getRun: (id: number) => api.get(`/allocation/runs/${id}`),
  getResults: (runId: number) => api.get(`/allocation/runs/${runId}/results`),
  getDetails: (runId: number) => api.get(`/allocation/runs/${runId}/details`),
  listResults: () => api.get('/allocation/results'),
};

export const emergencyApi = {
  allocate: (data: {
    funding_request_id: number;
    esi_level: number;
    justification: string;
  }) => api.post('/emergency/allocate', data),
  getReserveStatus: () => api.get('/emergency/reserve/status'),
  listAllocations: () => api.get('/emergency/allocations'),
};

export const dashboardApi = {
  getSummary: () => api.get('/dashboard/summary'),
  getAllocationFlow: () => api.get('/dashboard/allocation-flow'),
};

export const auditApi = {
  list: (params?: {
    skip?: number;
    limit?: number;
    actor_id?: number;
    action?: string;
    entity_type?: string;
    entity_id?: string;
    start_date?: string;
    end_date?: string;
  }) => api.get('/audit', { params }),
  get: (id: number) => api.get(`/audit/${id}`),
  listActions: () => api.get('/audit/actions/list'),
};

export const referenceApi = {
  diseases: (params?: { skip?: number; limit?: number; department?: string }) =>
    api.get('/reference/diseases', { params }),
  procedures: (params?: { skip?: number; limit?: number; department?: string }) =>
    api.get('/reference/procedures', { params }),
  treatmentPackages: (params?: { skip?: number; limit?: number; disease_id?: number; procedure_id?: number }) =>
    api.get('/reference/treatment-packages', { params }),
  patients: (params?: { skip?: number; limit?: number }) =>
    api.get('/reference/patients', { params }),
  hospitals: (params?: { skip?: number; limit?: number; verified_only?: boolean }) =>
    api.get('/reference/hospitals', { params }),
};