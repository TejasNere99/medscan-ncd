import express from 'express';
import { getAppointments, createAppointment, updateAppointmentStatus } from '../controllers/appointmentController.js';
import { verifyJWT } from '../middleware/auth.js';
import { authorizeRoles } from '../middleware/roleCheck.js';

const router = express.Router();

router.use(verifyJWT);

router.get('/', authorizeRoles('Patient', 'Doctor'), getAppointments);
router.post('/', authorizeRoles('Patient', 'Doctor'), createAppointment);
router.put('/:id', authorizeRoles('Patient', 'Doctor'), updateAppointmentStatus);

export default router;
