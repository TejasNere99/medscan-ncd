import express from 'express';
import { getAdherenceAnalytics, getPopulationHealthStats } from '../controllers/analyticsController.js';
import { verifyJWT } from '../middleware/auth.js';

const router = express.Router();

router.use(verifyJWT);

router.get('/adherence', getAdherenceAnalytics);
router.get('/population', getPopulationHealthStats);

export default router;
