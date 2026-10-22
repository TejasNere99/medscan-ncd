import { Appointment } from '../models/Appointment.js';
import { Doctor } from '../models/Doctor.js';
import { Patient } from '../models/Patient.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncWrapper.js';
import { assertDoctorCanAccessPatient, getOwnPatient, resolvePatientForCareRequest } from '../utils/careAccess.js';

const appointmentStatuses = ['Pending', 'Upcoming', 'Completed', 'Cancelled'];

export const getAppointments = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.user.role === 'Patient') {
    filter.patient = (await getOwnPatient(req.user))._id;
  } else if (req.user.role === 'Doctor') {
    filter.doctor = req.user._id;
    if (req.query.patientId) {
      const patient = await resolvePatientForCareRequest(req.user, req.query.patientId);
      filter.patient = patient._id;
    }
  } else {
    throw new ApiError(403, 'Your role cannot view appointment records.');
  }

  const appointments = await Appointment.find(filter)
    .populate({ path: 'patient', populate: { path: 'user', select: 'name email phone avatar' } })
    .populate('doctor', 'name email phone')
    .sort({ date: 1, time: 1 });
  return res.status(200).json(new ApiResponse(200, appointments, 'Appointments retrieved.'));
});

export const createAppointment = asyncHandler(async (req, res) => {
  if (!['Patient', 'Doctor'].includes(req.user.role)) throw new ApiError(403, 'Only patients and doctors can schedule appointments.');

  const patient = await resolvePatientForCareRequest(req.user, req.body.patientId);
  const doctorId = req.user.role === 'Doctor' ? req.user._id : req.body.doctorId;
  if (!doctorId || !(await Doctor.exists({ user: doctorId }))) throw new ApiError(400, 'Select a valid doctor.');

  const date = new Date(req.body.date);
  if (!req.body.date || Number.isNaN(date.getTime())) throw new ApiError(400, 'Enter a valid appointment date.');
  const now = new Date();
  if (date <= now) throw new ApiError(400, 'Choose a future date and time for the appointment.');
  const time = String(req.body.time || '').trim();
  if (!time || time.length > 40) throw new ApiError(400, 'Enter a valid appointment time.');
  const reason = String(req.body.reason || 'Routine check-up').trim();
  if (reason.length > 200) throw new ApiError(400, 'Appointment reason must be under 200 characters.');

  const appointment = await Appointment.create({
    patient: patient._id,
    doctor: doctorId,
    date,
    time,
    reason,
    notes: typeof req.body.notes === 'string' ? req.body.notes.trim().slice(0, 1000) : undefined,
    status: 'Upcoming',
  });
  const populated = await Appointment.findById(appointment._id)
    .populate({ path: 'patient', populate: { path: 'user', select: 'name email phone avatar' } })
    .populate('doctor', 'name email phone');
  return res.status(201).json(new ApiResponse(201, populated, 'Appointment scheduled successfully.'));
});

export const updateAppointmentStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!appointmentStatuses.includes(status)) throw new ApiError(400, 'Invalid appointment status.');
  const appointment = await Appointment.findById(req.params.id);
  if (!appointment) throw new ApiError(404, 'Appointment record not found.');

  if (req.user.role === 'Patient') {
    const ownPatient = await getOwnPatient(req.user);
    if (String(appointment.patient) !== String(ownPatient._id)) throw new ApiError(403, 'You can only update your own appointments.');
    if (status !== 'Cancelled') throw new ApiError(403, 'Patients may cancel an appointment; doctors update its completion status.');
    if (appointment.status === 'Completed') throw new ApiError(409, 'A completed appointment cannot be cancelled.');
  } else if (req.user.role === 'Doctor') {
    if (String(appointment.doctor) !== String(req.user._id)) throw new ApiError(403, 'You can only update appointments assigned to you.');
    const patient = await Patient.findById(appointment.patient);
    if (!patient) throw new ApiError(404, 'Patient record not found.');
    await assertDoctorCanAccessPatient(req.user, patient);
    if (!['Upcoming', 'Completed', 'Cancelled'].includes(status)) throw new ApiError(400, 'Doctors can mark an appointment upcoming, completed, or cancelled.');
  } else {
    throw new ApiError(403, 'Your role cannot update appointments.');
  }

  appointment.status = status;
  if (typeof req.body.notes === 'string') appointment.notes = req.body.notes.trim().slice(0, 1000);
  await appointment.save();
  const populated = await Appointment.findById(appointment._id)
    .populate({ path: 'patient', populate: { path: 'user', select: 'name email phone avatar' } })
    .populate('doctor', 'name email phone');
  return res.status(200).json(new ApiResponse(200, populated, `Appointment status updated to ${status}.`));
});
