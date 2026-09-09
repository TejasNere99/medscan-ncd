import api from './api';

export const authService = {
  login: async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const user = res?.data?.user || res?.user;
    const token = res?.data?.accessToken || res?.accessToken;

    if (token) {
      localStorage.setItem('accessToken', token);
    }
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    }

    return res;
  },

  register: async (userData) => {
    const res = await api.post('/auth/register', userData);
    const user = res?.data?.user || res?.user;
    const token = res?.data?.accessToken || res?.accessToken;

    if (token) {
      localStorage.setItem('accessToken', token);
    }
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    }

    return res;
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // ignore logout errors
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
    }
  },

  getCurrentUser: async () => {
    return await api.get('/auth/me');
  },

  forgotPassword: async (email) => {
    return await api.post('/auth/forgot-password', { email });
  },

  resetPassword: async (token, newPassword) => {
    return await api.post(`/auth/reset-password/${token}`, { newPassword });
  },
};