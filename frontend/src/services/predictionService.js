import api from './api';

export const predictionService = {
  runPrediction: async (data) => {
    return await api.post('/predictions', data);
  },

  getPredictionHistory: async (patientId) => {
    return await api.get('/predictions', { params: { patientId } });
  },
};
