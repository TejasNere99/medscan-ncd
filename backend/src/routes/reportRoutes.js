import express from 'express';
import {
  uploadReport,
  updateExtractedData,
  confirmReport,
  getReports,
  getReportById,
  deleteReport,
} from '../controllers/reportController.js';
import { verifyJWT } from '../middleware/auth.js';
import { handleReportUpload } from '../middleware/upload.js';

const router = express.Router();

router.use(verifyJWT);

router.post('/upload', handleReportUpload, uploadReport);
router.patch('/:id/extracted-data', updateExtractedData);
router.put('/:id/confirm', confirmReport);
router.get('/', getReports);
router.get('/:id', getReportById);
router.delete('/:id', deleteReport);

export default router;
