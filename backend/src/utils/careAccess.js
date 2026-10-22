import { Patient } from '../models/Patient.js';
import { PatientRelationship } from '../models/PatientRelationship.js';
import { ApiError } from './apiError.js';

export async function getOwnPatient(user) {
  const patient = await Patient.findOne({ user: user._id });
  if (!patient) throw new ApiError(404, 'Patient profile record not found.');
  return patient;
}

export async function assertDoctorCanAccessPatient(user, patient) {
  if (user.role !== 'Doctor') return;
  const isAssigned = String(patient.assignedDoctor || '') === String(user._id);
  const hasActiveRelationship = await PatientRelationship.exists({
    patient: patient._id,
    relatedUser: user._id,
    relationshipType: 'DOCTOR',
    status: 'ACTIVE',
  });
  if (!isAssigned && !hasActiveRelationship) {
    throw new ApiError(403, 'Access forbidden. You are not assigned to this patient.');
  }
}

export async function assertChoCanAccessPatient(user, patient) {
  if (user.role !== 'CHO') return;
  const patientVillage = String(patient.village || '').trim().toLowerCase();
  const catchment = [...(user.communityVillages || []), user.village].map((name) => String(name || '').trim().toLowerCase()).filter(Boolean);
  if (!patientVillage || !catchment.includes(patientVillage)) {
    throw new ApiError(403, 'Access forbidden. This patient is outside your assigned community.');
  }
}

export async function resolvePatientForCareRequest(user, patientId) {
  if (user.role === 'Patient') return getOwnPatient(user);
  if (!patientId) throw new ApiError(400, 'Patient ID is required.');
  const patient = await Patient.findById(patientId);
  if (!patient) throw new ApiError(404, 'Patient record not found.');
  await assertDoctorCanAccessPatient(user, patient);
  return patient;
}
