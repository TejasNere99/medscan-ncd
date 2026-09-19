import express from 'express';
import {
  getAvailableDoctors,
  requestDoctor,
  generateDoctorCode,
  claimDoctorCode,
  acceptRelationship,
  rejectRelationship,
  revokeRelationship,
  setPrimaryDoctor,
  getMyRelationships,
  getPendingRequests,
} from '../controllers/relationshipController.js';
import { verifyJWT } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/roleCheck.js';

const router = express.Router();

router.use(verifyJWT);

// Discovery
router.get('/doctors', getAvailableDoctors);

// Patient doctor connection workflows
router.post('/doctor/request', authorizeRoles('Patient'), requestDoctor);
router.post('/doctor/generate-code', authorizeRoles('Patient'), generateDoctorCode);

// Doctor code claim workflow
router.post('/doctor/claim-code', authorizeRoles('Doctor'), claimDoctorCode);

// Relationship lifecycle actions
router.patch('/:id/accept', acceptRelationship);
router.patch('/:id/reject', rejectRelationship);
router.patch('/:id/revoke', revokeRelationship);
router.patch('/:id/set-primary', authorizeRoles('Patient'), setPrimaryDoctor);

// Queries
router.get('/pending', getPendingRequests);
router.get('/', getMyRelationships);

export default router;
