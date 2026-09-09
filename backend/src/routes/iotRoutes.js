import express from 'express';
import { handleIotMedicineStatus } from '../controllers/iotController.js';

const router = express.Router();

// Public IoT endpoint authenticated via device key or payload validation
router.post('/medicine-status', handleIotMedicineStatus);

export default router;
