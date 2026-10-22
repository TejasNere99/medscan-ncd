import api from './api';

export const predictionService = {
  // Scenario A Diabetes ML Endpoints
  predictDiabetes: async (data) => {
    return await api.post('/predictions/diabetes', data);
  },

  getLatestDiabetesPrediction: async (patientId) => {
    return await api.get('/predictions/diabetes/latest', { params: { patientId } });
  },

  getDiabetesPredictionHistory: async (patientId) => {
    return await api.get('/predictions/diabetes/history', { params: { patientId } });
  },

  // Framingham 10-Year CHD Heart Disease ML Endpoints
  predictHeartDisease: async (data) => {
    return await api.post('/predictions/heart-disease', data);
  },

  getLatestHeartDiseasePrediction: async (patientId) => {
    return await api.get('/predictions/heart-disease/latest', { params: { patientId } });
  },

  getHeartDiseasePredictionHistory: async (patientId) => {
    return await api.get('/predictions/heart-disease/history', { params: { patientId } });
  },

  // Dataset classification estimates; the UI must retain the non-diagnostic task wording.
  predictHypertension: async (data) => api.post('/predictions/hypertension', data),
  getLatestHypertensionPrediction: async (patientId) =>
    api.get('/predictions/hypertension/latest', { params: { patientId } }),
  getHypertensionPredictionHistory: async (patientId) =>
    api.get('/predictions/hypertension/history', { params: { patientId } }),

  predictCkd: async (data) => api.post('/predictions/ckd', data),
  getLatestCkdPrediction: async (patientId) =>
    api.get('/predictions/ckd/latest', { params: { patientId } }),
  getCkdPredictionHistory: async (patientId) =>
    api.get('/predictions/ckd/history', { params: { patientId } }),

  getPredictionHistory: async (patientId) => {
    return await api.get('/predictions/diabetes/history', { params: { patientId } });
  },
};

