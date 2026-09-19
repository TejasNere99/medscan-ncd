import express from 'express';
import {
  createFamilyInvite,
  validateFamilyInvite,
  redeemFamilyInvite,
  getPatientFamilyInvitations,
  revokeFamilyInvite,
} from '../controllers/invitationController.js';
import { verifyJWT } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/roleCheck.js';

const router = express.Router();

// Public verification and redemption endpoints
router.get('/family/:token', validateFamilyInvite);
router.post('/family/:token/redeem', redeemFamilyInvite);

// Authenticated Patient endpoints
router.post('/family', verifyJWT, authorizeRoles('Patient'), createFamilyInvite);
router.get('/family', verifyJWT, authorizeRoles('Patient'), getPatientFamilyInvitations);
router.patch('/family/:id/revoke', verifyJWT, authorizeRoles('Patient'), revokeFamilyInvite);

export default router;
