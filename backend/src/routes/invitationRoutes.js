import express from 'express';
import { ApiError } from '../utils/apiError.js';

const router = express.Router();

// Deprecated endpoint guard: Family role and invitation workflows are removed
router.all('*', (req, res, next) => {
  return next(new ApiError(410, 'Family invitation endpoints are deprecated and no longer supported in MedScan-NCD.'));
});

export default router;
