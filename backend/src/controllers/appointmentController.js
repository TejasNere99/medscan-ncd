import { Appointment } from '../models/Appointment.js';
import { Patient } from '../models/Patient.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncWrapper.js';

export const getAppointments = asyncHandler(async (req, res) => {
  let { patientId } = req.query;

  if (req.user.role === 'Patient') {
    const p = await Patient.findOne({ user: req.user._id });
    if (p) patientId = p._id;
  }

  const filter = {};
  if (patientId) filter.patient = patientId;
  if (req.user.role === 'Doctor') filter.doctor = req.user._id;

  const appointments = await Appointment.find(filter)
    .populate({
      path: 'patient',
      populate: { path: 'user', select: 'name email phone avatar' },
    })
    .populate('doctor', 'name email phone')
    .sort({ date: 1 });

  return res.status(200).json(new ApiResponse(200, appointments, 'Appointments retrieved.'));
});

export const createAppointment = asyncHandler(async (req, res) => {
  const { patientId, doctorId, date, time, reason, notes } = req.body;

  let targetPatientId = patientId;
  if (req.user.role === 'Patient') {
    const p = await Patient.findOne({ user: req.user._id });
    if (p) targetPatientId = p._id;
  }

  if (!targetPatientId || !date) {
    throw new ApiError(400, 'Patient and Date are required for booking an appointment.');
  }

  const appointment = await Appointment.create({
    patient: targetPatientId,
    doctor: doctorId || req.user._id,
    date,
    time: time || '10:00 AM',
    reason: reason || 'Routine Checkup',
    notes,
    status: 'Upcoming',
  });

  return res.status(201).json(new ApiResponse(201, appointment, 'Appointment scheduled successfully.'));
});

export const updateAppointmentStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body; // 'Completed', 'Cancelled'

  const appointment = await Appointment.findByIdAndUpdate(
    id,
    { status, ...(notes ? { notes } : {}) },
    { new: true }
  );

  if (!appointment) throw new ApiError(404, 'Appointment record not found.');

  return res.status(200).json(new ApiResponse(200, appointment, `Appointment status updated to ${status}.`));
});
