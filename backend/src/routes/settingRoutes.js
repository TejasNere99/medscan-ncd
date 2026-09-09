import express from 'express';
import { getSettings, updateSettings } from '../controllers/settingController.js';
import { verifyJWT } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/roleCheck.js';

const router = express.Router();

router.use(verifyJWT);

router.get('/', getSettings);
router.put('/', authorizeRoles('Admin'), updateSettings);

export default router;
