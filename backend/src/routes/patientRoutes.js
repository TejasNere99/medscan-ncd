import express from 'express';
import {
  getMyPatientProfile,
  getPatients,
  getPatientById,
  createPatient,
  updatePatient,
  deletePatient,
  getLinkedFamilyPatients,
} from '../controllers/patientController.js';
import { verifyJWT } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/roleCheck.js';

const router = express.Router();

router.use(verifyJWT);

router.get('/me', authorizeRoles('Patient'), getMyPatientProfile);
router.get('/linked', authorizeRoles('Family', 'Admin'), getLinkedFamilyPatients);
router.get('/', authorizeRoles('Doctor', 'Nurse', 'CHO', 'Admin'), getPatients);
router.get('/:id', authorizeRoles('Doctor', 'Nurse', 'CHO', 'Family', 'Admin'), getPatientById);
router.post('/', authorizeRoles('Doctor', 'CHO', 'Admin'), createPatient);
router.put('/:id', authorizeRoles('Doctor', 'Nurse', 'CHO', 'Admin'), updatePatient);
router.delete('/:id', authorizeRoles('Doctor', 'Admin'), deletePatient);

export default router;
