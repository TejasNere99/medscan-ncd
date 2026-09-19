import api from './api';

export const relationshipService = {
  // Doctor discovery
  getAvailableDoctors: () => api.get('/relationships/doctors'),

  // Patient -> Doctor connection requests
  requestDoctor: (data) => api.post('/relationships/doctor/request', data),
  generateDoctorCode: () => api.post('/relationships/doctor/generate-code'),

  // Doctor -> Code claim
  claimDoctorCode: (data) => api.post('/relationships/doctor/claim-code', data),

  // Relationship actions
  acceptRelationship: (id) => api.patch(`/relationships/${id}/accept`),
  rejectRelationship: (id) => api.patch(`/relationships/${id}/reject`),
  revokeRelationship: (id) => api.patch(`/relationships/${id}/revoke`),
  setPrimaryDoctor: (id) => api.patch(`/relationships/${id}/set-primary`),

  // Queries
  getMyRelationships: () => api.get('/relationships'),
  getPendingRequests: () => api.get('/relationships/pending'),

  // Family Invitations
  createFamilyInvite: (data) => api.post('/invitations/family', data),
  validateFamilyInvite: (token) => api.get(`/invitations/family/${token}`),
  redeemFamilyInvite: (token, data) => api.post(`/invitations/family/${token}/redeem`, data),
  getPatientFamilyInvitations: () => api.get('/invitations/family'),
  revokeFamilyInvite: (id) => api.patch(`/invitations/family/${id}/revoke`),
};

export default relationshipService;
