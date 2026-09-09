import express from 'express';
import {
  getMedicines,
  getMedicineLogs,
  addMedicine,
  updateMedicineStatus,
  deleteMedicine,
} from '../controllers/medicineController.js';
import { verifyJWT } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/roleCheck.js';

const router = express.Router();

router.use(verifyJWT);

router.get('/', getMedicines);
router.get('/logs', getMedicineLogs);
router.post('/', authorizeRoles('Doctor', 'Patient', 'Admin'), addMedicine);
router.post('/:id/status', updateMedicineStatus);
router.delete('/:id', authorizeRoles('Doctor', 'Admin'), deleteMedicine);

export default router;
