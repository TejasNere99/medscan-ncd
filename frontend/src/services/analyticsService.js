import api from './api';

export const analyticsService = {
  getAdherenceStats: async (patientId) => {
    return await api.get('/analytics/adherence', { params: { patientId } });
  },

  getPopulationStats: async (filters = {}) => {
    return await api.get('/analytics/population', { params: filters });
  },
};
