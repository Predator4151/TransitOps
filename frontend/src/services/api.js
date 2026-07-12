import axios from 'axios';

const API_URL = 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('transitops_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle unauthorized errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token and redirect to login if unauthorized
      localStorage.removeItem('transitops_token');
      localStorage.removeItem('transitops_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const auth = {
  login: async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data.success) {
      localStorage.setItem('transitops_token', res.data.token);
      localStorage.setItem('transitops_user', JSON.stringify(res.data.user));
    }
    return res.data;
  },
  register: async (userData) => {
    const res = await api.post('/auth/register', userData);
    if (res.data.success) {
      localStorage.setItem('transitops_token', res.data.token);
      localStorage.setItem('transitops_user', JSON.stringify(res.data.user));
    }
    return res.data;
  },
  logout: () => {
    localStorage.removeItem('transitops_token');
    localStorage.removeItem('transitops_user');
  },
  getMe: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },
  resetPassword: async (email, name, newPassword) => {
    const res = await api.post('/auth/reset-password', { email, name, newPassword });
    return res.data;
  },
  getCurrentUser: () => {
    const userStr = localStorage.getItem('transitops_user');
    return userStr ? JSON.parse(userStr) : null;
  }
};

export const vehicles = {
  getAll: async (params) => {
    const res = await api.get('/vehicles', { params });
    return res.data;
  },
  getOne: async (id) => {
    const res = await api.get(`/vehicles/${id}`);
    return res.data;
  },
  create: async (data) => {
    const res = await api.post('/vehicles', data);
    return res.data;
  },
  update: async (id, data) => {
    const res = await api.put(`/vehicles/${id}`, data);
    return res.data;
  },
  delete: async (id) => {
    const res = await api.delete(`/vehicles/${id}`);
    return res.data;
  }
};

export const drivers = {
  getAll: async (params) => {
    const res = await api.get('/drivers', { params });
    return res.data;
  },
  getOne: async (id) => {
    const res = await api.get(`/drivers/${id}`);
    return res.data;
  },
  create: async (data) => {
    const res = await api.post('/drivers', data);
    return res.data;
  },
  update: async (id, data) => {
    const res = await api.put(`/drivers/${id}`, data);
    return res.data;
  },
  delete: async (id) => {
    const res = await api.delete(`/drivers/${id}`);
    return res.data;
  }
};

export const trips = {
  getAll: async (params) => {
    const res = await api.get('/trips', { params });
    return res.data;
  },
  getOne: async (id) => {
    const res = await api.get(`/trips/${id}`);
    return res.data;
  },
  create: async (data) => {
    const res = await api.post('/trips', data);
    return res.data;
  },
  update: async (id, data) => {
    const res = await api.put(`/trips/${id}`, data);
    return res.data;
  },
  delete: async (id) => {
    const res = await api.delete(`/trips/${id}`);
    return res.data;
  }
};

export const maintenance = {
  getAll: async (params) => {
    const res = await api.get('/maintenance', { params });
    return res.data;
  },
  getOne: async (id) => {
    const res = await api.get(`/maintenance/${id}`);
    return res.data;
  },
  create: async (data) => {
    const res = await api.post('/maintenance', data);
    return res.data;
  },
  update: async (id, data) => {
    const res = await api.put(`/maintenance/${id}`, data);
    return res.data;
  },
  delete: async (id) => {
    const res = await api.delete(`/maintenance/${id}`);
    return res.data;
  }
};

export const fuel = {
  getAll: async (params) => {
    const res = await api.get('/fuel', { params });
    return res.data;
  },
  getOne: async (id) => {
    const res = await api.get(`/fuel/${id}`);
    return res.data;
  },
  create: async (data) => {
    const res = await api.post('/fuel', data);
    return res.data;
  },
  update: async (id, data) => {
    const res = await api.put(`/fuel/${id}`, data);
    return res.data;
  },
  delete: async (id) => {
    const res = await api.delete(`/fuel/${id}`);
    return res.data;
  }
};

export const expenses = {
  getAll: async (params) => {
    const res = await api.get('/expenses', { params });
    return res.data;
  },
  getOne: async (id) => {
    const res = await api.get(`/expenses/${id}`);
    return res.data;
  },
  create: async (data) => {
    const res = await api.post('/expenses', data);
    return res.data;
  },
  update: async (id, data) => {
    const res = await api.put(`/expenses/${id}`, data);
    return res.data;
  },
  delete: async (id) => {
    const res = await api.delete(`/expenses/${id}`);
    return res.data;
  },
  getOperationalCosts: async () => {
    const res = await api.get('/expenses/operational-costs');
    return res.data;
  }
};

export const reports = {
  getDashboard: async () => {
    const res = await api.get('/reports/dashboard');
    return res.data;
  },
  getAnalytics: async () => {
    const res = await api.get('/reports/analytics');
    return res.data;
  }
};
