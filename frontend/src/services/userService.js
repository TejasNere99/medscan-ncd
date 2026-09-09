import api from './api';

export const userService = {
  getUsers: async (params = {}) => {
    return await api.get('/users', { params });
  },

  getUserById: async (id) => {
    return await api.get(`/users/${id}`);
  },

  createUser: async (userData) => {
    return await api.post('/users', userData);
  },

  updateUser: async (id, userData) => {
    return await api.put(`/users/${id}`, userData);
  },

  deleteUser: async (id) => {
    return await api.delete(`/users/${id}`);
  },
};
