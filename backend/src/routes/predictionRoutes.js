import express from 'express';
import {
  predictDiabetes,
  getLatestDiabetesPrediction,
  getDiabetesPredictionHistory,
  predictHeartDisease,
  getLatestHeartDiseasePrediction,
  getHeartDiseasePredictionHistory,
  predictHypertension,
  getLatestHypertensionPrediction,
  getHypertensionPredictionHistory,
  predictCkd,
  getLatestCkdPrediction,
  getCkdPredictionHistory,
} from '../controllers/predictionController.js';
import { verifyJWT } from '../middleware/auth.js';

const router = express.Router();

router.use(verifyJWT);

// Base prediction endpoints routed to authentic Diabetes ML assessment
router.post('/', predictDiabetes);
router.get('/', getDiabetesPredictionHistory);

// Scenario A Diabetes ML Endpoints
router.post('/diabetes', predictDiabetes);
router.get('/diabetes/latest', getLatestDiabetesPrediction);
router.get('/diabetes/history', getDiabetesPredictionHistory);

// Framingham 10-Year CHD Heart Disease ML Endpoints
router.post('/heart-disease', predictHeartDisease);
router.get('/heart-disease/latest', getLatestHeartDiseasePrediction);
router.get('/heart-disease/history', getHeartDiseasePredictionHistory);

// New trained research models. Inputs are always built server-side from confirmed data.
router.post('/hypertension', predictHypertension);
router.get('/hypertension/latest', getLatestHypertensionPrediction);
router.get('/hypertension/history', getHypertensionPredictionHistory);
router.post('/ckd', predictCkd);
router.get('/ckd/latest', getLatestCkdPrediction);
router.get('/ckd/history', getCkdPredictionHistory);

export default router;
