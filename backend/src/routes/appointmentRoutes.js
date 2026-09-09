import express from 'express';
import { getAppointments, createAppointment, updateAppointmentStatus } from '../controllers/appointmentController.js';
import { verifyJWT } from '../middleware/auth.js';

const router = express.Router();

router.use(verifyJWT);

router.get('/', getAppointments);
router.post('/', createAppointment);
router.put('/:id', updateAppointmentStatus);

export default router;
