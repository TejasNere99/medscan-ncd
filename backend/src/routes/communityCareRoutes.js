import express from 'express';
import { verifyJWT } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/roleCheck.js';
import { createFollowUp, createReferral, listFollowUps, listReferrals, updateFollowUp, updateReferral } from '../controllers/communityCareController.js';

const router = express.Router();
router.use(verifyJWT, authorizeRoles('Doctor', 'CHO'));
router.get('/follow-ups', listFollowUps);
router.post('/follow-ups', createFollowUp);
router.patch('/follow-ups/:id', updateFollowUp);
router.get('/referrals', listReferrals);
router.post('/referrals', createReferral);
router.patch('/referrals/:id', updateReferral);
export default router;
