import api from './api';

export const reportService = {
  uploadReport: async (formData) => {
    return await api.post('/reports/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  getReports: async (patientId) => {
    return await api.get('/reports', { params: { patientId } });
  },

  deleteReport: async (id) => {
    return await api.delete(`/reports/${id}`);
  },
};
