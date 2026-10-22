import api from './api';

export const communityCareService = {
  getFollowUps: (params = {}) => api.get('/community-care/follow-ups', { params }),
  createFollowUp: (data) => api.post('/community-care/follow-ups', data),
  updateFollowUp: (id, data) => api.patch(`/community-care/follow-ups/${id}`, data),
  getReferrals: (params = {}) => api.get('/community-care/referrals', { params }),
  createReferral: (data) => api.post('/community-care/referrals', data),
  updateReferral: (id, data) => api.patch(`/community-care/referrals/${id}`, data),
};
