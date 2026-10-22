import { Medicine } from '../models/Medicine.js';
import { MedicineLog } from '../models/MedicineLog.js';
import { Patient } from '../models/Patient.js';
import { PatientRelationship } from '../models/PatientRelationship.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncWrapper.js';
import { assertDoctorCanAccessPatient, getOwnPatient, resolvePatientForCareRequest } from '../utils/careAccess.js';
import { routeMissedMedicineAlert } from '../services/notificationService.js';

const doseHours = { morning: 9, afternoon: 14, night: 21 };
const validTimings = Object.keys(doseHours);
const validStatuses = ['Taken', 'Missed', 'Pending', 'Delayed'];
const defaultTimings = {
  'Once daily': ['morning'],
  'Twice daily': ['morning', 'night'],
  'Thrice daily': ['morning', 'afternoon', 'night'],
  'Every 8 hours': ['morning', 'afternoon', 'night'],
  'As needed': [],
};

async function ensureTodayDoseLogs(patientId, medicines, now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const existing = await MedicineLog.find({
    patient: patientId,
    medicine: { $in: medicines.map((medicine) => medicine._id) },
    scheduledTime: { $gte: start, $lt: end },
  }).select('medicine scheduledTime');
  const existingKeys = new Set(existing.map((log) => `${log.medicine}:${new Date(log.scheduledTime).getHours()}`));
  const pending = [];

  for (const medicine of medicines) {
    if (medicine.status !== 'Active') continue;
    const startDate = medicine.startDate ? new Date(medicine.startDate) : start;
    const endDate = medicine.endDate ? new Date(medicine.endDate) : null;
    if (startDate >= end || (endDate && endDate < start)) continue;
    const timings = medicine.timing?.length ? medicine.timing : defaultTimings[medicine.frequency] || [];
    for (const timing of timings) {
      const hour = doseHours[timing];
      if (hour === undefined || existingKeys.has(`${medicine._id}:${hour}`)) continue;
      const scheduledTime = new Date(start);
      scheduledTime.setHours(hour, 0, 0, 0);
      pending.push({ patient: patientId, medicine: medicine._id, scheduledTime, status: 'Pending', source: 'App' });
    }
  }

  if (pending.length) await MedicineLog.insertMany(pending, { ordered: false });
}

async function resolvePatientIdsForDoctor(userId) {
  const [assigned, relationships] = await Promise.all([
    Patient.find({ assignedDoctor: userId }).select('_id'),
    PatientRelationship.find({ relatedUser: userId, relationshipType: 'DOCTOR', status: 'ACTIVE' }).select('patient'),
  ]);
  return [...new Set([...assigned.map((patient) => String(patient._id)), ...relationships.map((relationship) => String(relationship.patient))])];
}

export const getMedicines = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.user.role === 'Patient') {
    filter.patient = (await getOwnPatient(req.user))._id;
  } else if (req.user.role === 'Doctor') {
    if (req.query.patientId) {
      const patient = await resolvePatientForCareRequest(req.user, req.query.patientId);
      filter.patient = patient._id;
    } else {
      filter.patient = { $in: await resolvePatientIdsForDoctor(req.user._id) };
    }
  } else if (req.user.role === 'Admin') {
    if (req.query.patientId) filter.patient = req.query.patientId;
  } else {
    throw new ApiError(403, 'Your role cannot view medicine records.');
  }

  const medicines = await Medicine.find(filter)
    .populate({ path: 'patient', populate: { path: 'user', select: 'name email' } })
    .populate('doctor', 'name email')
    .sort({ status: 1, createdAt: -1 });
  return res.status(200).json(new ApiResponse(200, medicines, 'Medicines retrieved successfully.'));
});

export const getMedicineLogs = asyncHandler(async (req, res) => {
  let patient;
  if (req.user.role === 'Patient') {
    patient = await getOwnPatient(req.user);
  } else if (req.user.role === 'Doctor') {
    if (req.query.patientId) patient = await resolvePatientForCareRequest(req.user, req.query.patientId);
  } else if (req.user.role !== 'Admin') {
    throw new ApiError(403, 'Your role cannot view medicine logs.');
  }

  const filter = {};
  if (patient) filter.patient = patient._id;
  else if (req.user.role === 'Doctor') filter.patient = { $in: await resolvePatientIdsForDoctor(req.user._id) };
  else if (req.query.patientId) filter.patient = req.query.patientId;
  if (req.query.status) {
    if (!validStatuses.includes(req.query.status)) throw new ApiError(400, 'Invalid medicine log status filter.');
    filter.status = req.query.status;
  }

  const medicines = patient
    ? await Medicine.find({ patient: patient._id, status: 'Active' }).select('_id timing startDate endDate status')
    : [];
  if (patient) await ensureTodayDoseLogs(patient._id, medicines);

  const logs = await MedicineLog.find(filter)
    .populate('medicine')
    .populate({ path: 'patient', populate: { path: 'user', select: 'name' } })
    .sort({ scheduledTime: -1 })
    .limit(100);
  return res.status(200).json(new ApiResponse(200, logs, 'Medicine log history fetched.'));
});

export const addMedicine = asyncHandler(async (req, res) => {
  if (!['Doctor', 'Admin'].includes(req.user.role)) {
    throw new ApiError(403, 'Only an authorized doctor can add a prescription.');
  }

  const { patientId, name, dosage, frequency, timing, startDate, endDate, instructions } = req.body;
  const patient = await resolvePatientForCareRequest(req.user, patientId);
  const cleanName = String(name || '').trim();
  if (!cleanName || cleanName.length > 120) throw new ApiError(400, 'Medicine name is required and must be under 120 characters.');
  if (!['Once daily', 'Twice daily', 'Thrice daily', 'Every 8 hours', 'As needed'].includes(frequency || 'Twice daily')) {
    throw new ApiError(400, 'Select a valid medicine frequency.');
  }
  const medicineFrequency = frequency || 'Twice daily';
  const doseTimings = Array.isArray(timing) ? [...new Set(timing)] : defaultTimings[medicineFrequency];
  if (medicineFrequency !== 'As needed' && doseTimings.length === 0) throw new ApiError(400, 'Choose at least one scheduled dose time.');
  if (doseTimings.some((value) => !validTimings.includes(value))) throw new ApiError(400, 'Select valid dose timings.');
  const parsedStart = startDate ? new Date(startDate) : new Date();
  const parsedEnd = endDate ? new Date(endDate) : undefined;
  if (Number.isNaN(parsedStart.getTime()) || (parsedEnd && Number.isNaN(parsedEnd.getTime()))) {
    throw new ApiError(400, 'Enter valid prescription dates.');
  }
  if (parsedEnd && parsedEnd < parsedStart) throw new ApiError(400, 'Prescription end date must be after its start date.');

  const medicine = await Medicine.create({
    patient: patient._id,
    doctor: req.user._id,
    name: cleanName,
    dosage: String(dosage || '1 tablet').trim(),
    frequency: medicineFrequency,
    timing: doseTimings,
    startDate: parsedStart,
    endDate: parsedEnd,
    instructions: String(instructions || '').trim(),
    status: 'Active',
  });

  await ensureTodayDoseLogs(patient._id, [medicine]);
  return res.status(201).json(new ApiResponse(201, medicine, 'Medicine prescribed successfully.'));
});

export const updateMedicineStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, notes, logId } = req.body;
  if (!validStatuses.includes(status)) throw new ApiError(400, 'Invalid status value.');

  let log = logId ? await MedicineLog.findById(logId) : await MedicineLog.findById(id);
  if (!log && !logId) log = await MedicineLog.findOne({ medicine: id, status: 'Pending' }).sort({ scheduledTime: 1 });
  if (!log) throw new ApiError(404, 'Scheduled medicine dose not found. Refresh the schedule and try again.');
  if (logId && String(log.medicine) !== String(id)) throw new ApiError(400, 'Dose does not belong to the selected medicine.');

  const patient = await Patient.findById(log.patient);
  if (!patient) throw new ApiError(404, 'Patient record not found.');
  if (req.user.role === 'Patient') {
    const ownPatient = await getOwnPatient(req.user);
    if (String(ownPatient._id) !== String(patient._id)) throw new ApiError(403, 'You can only update your own medicine schedule.');
    if (!['Taken', 'Missed'].includes(status)) throw new ApiError(403, 'Patients can mark a dose as taken or missed.');
  } else if (req.user.role === 'Doctor') {
    await assertDoctorCanAccessPatient(req.user, patient);
  } else if (req.user.role !== 'Admin') {
    throw new ApiError(403, 'Your role cannot update medicine records.');
  }

  log.status = status;
  log.takenTime = status === 'Taken' ? new Date() : undefined;
  if (typeof notes === 'string') log.notes = notes.trim().slice(0, 500);
  await log.save();
  if (status === 'Missed') {
    const medicine = await Medicine.findById(log.medicine).select('name');
    await routeMissedMedicineAlert({ patientId: patient._id, medicineName: medicine?.name || 'Prescription Medicine', scheduledTime: log.scheduledTime });
  }
  const populated = await MedicineLog.findById(log._id).populate('medicine');
  return res.status(200).json(new ApiResponse(200, populated, `Dose marked as ${status}.`));
});

export const deleteMedicine = asyncHandler(async (req, res) => {
  const medicine = await Medicine.findById(req.params.id);
  if (!medicine) throw new ApiError(404, 'Prescription not found.');
  const patient = await Patient.findById(medicine.patient);
  if (req.user.role === 'Doctor') await assertDoctorCanAccessPatient(req.user, patient);
  else if (req.user.role !== 'Admin') throw new ApiError(403, 'Only an authorized doctor can discontinue a prescription.');

  medicine.status = 'Discontinued';
  await medicine.save();
  return res.status(200).json(new ApiResponse(200, medicine, 'Prescription discontinued. Dose history has been preserved.'));
});
