import express from 'express';
import { runPrediction, getPredictionHistory } from '../controllers/predictionController.js';
import { verifyJWT } from '../middleware/auth.js';

const router = express.Router();

router.use(verifyJWT);

router.post('/', runPrediction);
router.get('/', getPredictionHistory);

export default router;
