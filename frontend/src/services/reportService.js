import api from './api';

export const reportService = {
  uploadReport: async (formData) => {
    return await api.post('/reports/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  confirmReport: async (id, confirmedData) => {
    return await api.put(`/reports/${id}/confirm`, { confirmedData });
  },

  updateExtractedData: async (id, corrections) => {
    return await api.patch(`/reports/${id}/extracted-data`, { corrections });
  },

  getReports: async (patientId) => {
    return await api.get('/reports', { params: { patientId } });
  },

  getReportById: async (id) => {
    return await api.get(`/reports/${id}`);
  },

  deleteReport: async (id) => {
    return await api.delete(`/reports/${id}`);
  },
};
