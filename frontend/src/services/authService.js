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
    // Public registration creates account in unverified state; no session is stored
    return await api.post('/auth/register', userData);
  },

  verifyEmail: async (token) => {
    return await api.post('/auth/verify-email', { token });
  },

  resendVerification: async (email) => {
    return await api.post('/auth/resend-verification', { email });
  },

  forgotPassword: async (email) => {
    return await api.post('/auth/forgot-password', { email });
  },

  resetPassword: async (tokenOrPayload, maybePassword, maybeConfirm) => {
    let payload;
    if (typeof tokenOrPayload === 'object' && tokenOrPayload !== null) {
      payload = tokenOrPayload;
    } else {
      payload = {
        token: tokenOrPayload,
        newPassword: maybePassword,
        confirmPassword: maybeConfirm,
      };
    }
    return await api.post('/auth/reset-password', payload);
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
};