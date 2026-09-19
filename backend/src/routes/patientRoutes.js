import express from 'express';
import {
  getMyPatientProfile,
  updateMyDemographics,
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
router.patch('/me/demographics', authorizeRoles('Patient'), updateMyDemographics);
router.get('/linked', authorizeRoles('Family', 'Admin'), getLinkedFamilyPatients);
router.get('/', authorizeRoles('Doctor', 'Nurse', 'CHO', 'Admin'), getPatients);
router.get('/:id', authorizeRoles('Doctor', 'Nurse', 'CHO', 'Family', 'Admin', 'Patient'), getPatientById);
router.post('/', authorizeRoles('Doctor', 'CHO', 'Admin'), createPatient);
router.put('/:id', authorizeRoles('Doctor', 'Nurse', 'CHO', 'Admin', 'Patient'), updatePatient);
router.delete('/:id', authorizeRoles('Patient', 'Admin'), deletePatient);

export default router;
