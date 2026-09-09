import express from 'express';
import { uploadReport, getReports, deleteReport } from '../controllers/reportController.js';
import { verifyJWT } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

router.use(verifyJWT);

router.post('/upload', upload.single('report'), uploadReport);
router.get('/', getReports);
router.delete('/:id', deleteReport);

export default router;
