import { Medicine } from '../models/Medicine.js';
import { MedicineLog } from '../models/MedicineLog.js';
import { Patient } from '../models/Patient.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncWrapper.js';
import { routeMissedMedicineAlert } from '../services/notificationService.js';

export const getMedicines = asyncHandler(async (req, res) => {
  let { patientId } = req.query;

  if (req.user.role === 'Patient') {
    const p = await Patient.findOne({ user: req.user._id });
    if (!p) throw new ApiError(404, 'Patient profile record not found.');
    patientId = p._id;
  } else if (req.user.role === 'Family' && !patientId) {
    const linked = await Patient.findOne({ linkedFamilyMembers: req.user._id });
    if (linked) patientId = linked._id;
  }

  const filter = {};
  if (patientId) filter.patient = patientId;

  const medicines = await Medicine.find(filter)
    .populate('patient')
    .populate('doctor', 'name email');

  return res.status(200).json(new ApiResponse(200, medicines, 'Medicines retrieved successfully.'));
});

export const getMedicineLogs = asyncHandler(async (req, res) => {
  let { patientId, status } = req.query;

  if (req.user.role === 'Patient') {
    const p = await Patient.findOne({ user: req.user._id });
    if (p) patientId = p._id;
  }

  const filter = {};
  if (patientId) filter.patient = patientId;
  if (status) filter.status = status;

  const logs = await MedicineLog.find(filter)
    .populate('medicine')
    .sort({ scheduledTime: -1 })
    .limit(50);

  return res.status(200).json(new ApiResponse(200, logs, 'Medicine log history fetched.'));
});

export const addMedicine = asyncHandler(async (req, res) => {
  const { patientId, name, dosage, frequency, timing, startDate, endDate, instructions } = req.body;

  let targetPatientId = patientId;
  if (!targetPatientId && req.user.role === 'Patient') {
    const p = await Patient.findOne({ user: req.user._id });
    if (p) targetPatientId = p._id;
  }

  if (!targetPatientId || !name) {
    throw new ApiError(400, 'Patient ID and medicine name are required.');
  }

  const medicine = await Medicine.create({
    patient: targetPatientId,
    doctor: req.user._id,
    name,
    dosage: dosage || '1 tablet',
    frequency: frequency || 'Twice daily',
    timing: timing || ['morning', 'night'],
    startDate: startDate || new Date(),
    endDate,
    instructions: instructions || 'Take after meals',
    status: 'Active',
  });

  // Automatically generate today's scheduled MedicineLogs
  const today = new Date();
  const times = timing && timing.length > 0 ? timing : ['morning', 'night'];

  for (const t of times) {
    let hour = 9;
    if (t === 'afternoon') hour = 14;
    if (t === 'night') hour = 21;

    const scheduledDate = new Date(today);
    scheduledDate.setHours(hour, 0, 0, 0);

    await MedicineLog.create({
      patient: targetPatientId,
      medicine: medicine._id,
      scheduledTime: scheduledDate,
      status: 'Pending',
      source: 'App',
    });
  }

  return res.status(201).json(new ApiResponse(201, medicine, 'Medicine prescribed and scheduled successfully.'));
});

export const updateMedicineStatus = asyncHandler(async (req, res) => {
  const { id } = req.params; // Medicine log ID or Medicine ID
  const { status, notes, logId } = req.body; // 'Taken', 'Missed'

  if (!['Taken', 'Missed', 'Pending', 'Delayed'].includes(status)) {
    throw new ApiError(400, 'Invalid status value.');
  }

  let log = null;

  if (logId) {
    log = await MedicineLog.findById(logId).populate('medicine patient');
  } else {
    log = await MedicineLog.findOne({ medicine: id, status: 'Pending' }).sort({ scheduledTime: 1 }).populate('medicine patient');
    if (!log) {
      log = await MedicineLog.create({
        medicine: id,
        patient: req.body.patientId,
        scheduledTime: new Date(),
        status: 'Pending',
      });
    }
  }

  if (log) {
    log.status = status;
    log.takenTime = status === 'Taken' ? new Date() : undefined;
    if (notes) log.notes = notes;
    await log.save();

    // Trigger Notification Routing if status is Missed
    if (status === 'Missed' && log.patient) {
      await routeMissedMedicineAlert({
        patientId: log.patient._id || log.patient,
        medicineName: log.medicine?.name || 'Prescription Medicine',
        scheduledTime: log.scheduledTime,
      });
    }
  }

  return res.status(200).json(new ApiResponse(200, log, `Medicine dose marked as ${status}.`));
});

export const deleteMedicine = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await Medicine.findByIdAndDelete(id);
  await MedicineLog.deleteMany({ medicine: id });
  return res.status(200).json(new ApiResponse(200, {}, 'Medicine and logs removed successfully.'));
});
