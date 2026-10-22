import mongoose from 'mongoose';
import { FollowUp } from '../models/FollowUp.js';
import { Referral } from '../models/Referral.js';
import { Patient } from '../models/Patient.js';
import { PatientRelationship } from '../models/PatientRelationship.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncWrapper.js';
import { assertChoCanAccessPatient, assertDoctorCanAccessPatient } from '../utils/careAccess.js';

async function resolveCarePatient(user, patientId) {
  if (!mongoose.isValidObjectId(patientId)) throw new ApiError(400, 'A valid patient ID is required.');
  const patient = await Patient.findById(patientId);
  if (!patient) throw new ApiError(404, 'Patient record not found.');
  if (user.role === 'CHO') await assertChoCanAccessPatient(user, patient);
  else if (user.role === 'Doctor') await assertDoctorCanAccessPatient(user, patient);
  else throw new ApiError(403, 'Your role cannot access community care records.');
  return patient;
}

export const listFollowUps = asyncHandler(async (req, res) => {
  let filter;
  if (req.user.role === 'CHO') {
    const villages = [...new Set([...(req.user.communityVillages || []), req.user.village].map((name) => String(name || '').trim()).filter(Boolean))];
    const patients = villages.length ? await Patient.find({ village: { $in: villages } }).distinct('_id') : [];
    filter = { patient: { $in: patients } };
  } else if (req.user.role === 'Doctor') {
    const related = await PatientRelationship.find({ relatedUser: req.user._id, relationshipType: 'DOCTOR', status: 'ACTIVE' }).distinct('patient');
    const patients = await Patient.find({ $or: [{ assignedDoctor: req.user._id }, { _id: { $in: related } }] }).distinct('_id');
    filter = { patient: { $in: patients } };
  } else throw new ApiError(403, 'Your role cannot view follow-ups.');
  if (req.query.patientId) {
    await resolveCarePatient(req.user, req.query.patientId);
    filter.patient = req.query.patientId;
  }
  if (['SCHEDULED', 'COMPLETED', 'CANCELLED'].includes(req.query.status)) filter.status = req.query.status;
  if (req.query.due === 'overdue') filter.dueAt = { $lt: new Date() }, filter.status = 'SCHEDULED';
  const rows = await FollowUp.find(filter).populate({ path: 'patient', populate: { path: 'user', select: 'name' } }).sort({ dueAt: 1 }).limit(300);
  return res.json(new ApiResponse(200, rows, 'Follow-ups retrieved.'));
});

export const createFollowUp = asyncHandler(async (req, res) => {
  const patient = await resolveCarePatient(req.user, req.body.patientId);
  const dueAt = new Date(req.body.dueAt);
  const reason = String(req.body.reason || '').trim();
  if (!req.body.dueAt || Number.isNaN(dueAt.getTime())) throw new ApiError(400, 'Enter a valid follow-up date.');
  if (dueAt.getTime() < Date.now() - 86400000) throw new ApiError(400, 'Follow-up date cannot be in the past.');
  if (!reason || reason.length > 200) throw new ApiError(400, 'Enter a follow-up reason (up to 200 characters).');
  const followUp = await FollowUp.create({ patient: patient._id, dueAt, reason, note: String(req.body.note || '').trim().slice(0, 1000), createdBy: req.user._id,
    history: [{ action: 'SCHEDULED', date: dueAt, note: String(req.body.note || '').trim().slice(0, 1000), changedBy: req.user._id }] });
  const populated = await FollowUp.findById(followUp._id).populate({ path: 'patient', populate: { path: 'user', select: 'name' } });
  return res.status(201).json(new ApiResponse(201, populated, 'Follow-up scheduled.'));
});

export const updateFollowUp = asyncHandler(async (req, res) => {
  const followUp = await FollowUp.findById(req.params.id);
  if (!followUp) throw new ApiError(404, 'Follow-up not found.');
  await resolveCarePatient(req.user, followUp.patient);
  const { dueAt, status, outcome, note } = req.body;
  if (dueAt !== undefined) {
    const date = new Date(dueAt);
    if (Number.isNaN(date.getTime()) || date.getTime() < Date.now() - 86400000) throw new ApiError(400, 'Enter a valid current or future follow-up date.');
    followUp.dueAt = date;
    followUp.history.push({ action: 'RESCHEDULED', date, note: String(note || '').trim().slice(0, 1000), changedBy: req.user._id });
  }
  if (status !== undefined) {
    if (!['COMPLETED', 'CANCELLED', 'SCHEDULED'].includes(status)) throw new ApiError(400, 'Invalid follow-up status.');
    if (followUp.status === 'CANCELLED' && status !== 'SCHEDULED') throw new ApiError(409, 'Cancelled follow-ups must be rescheduled before completion.');
    followUp.status = status;
    followUp.history.push({ action: status, date: followUp.dueAt, outcome: String(outcome || '').trim().slice(0, 1000), note: String(note || '').trim().slice(0, 1000), changedBy: req.user._id });
  }
  if (outcome !== undefined) followUp.outcome = String(outcome).trim().slice(0, 1000);
  if (note !== undefined) followUp.note = String(note).trim().slice(0, 1000);
  await followUp.save();
  const populated = await FollowUp.findById(followUp._id).populate({ path: 'patient', populate: { path: 'user', select: 'name' } });
  return res.json(new ApiResponse(200, populated, 'Follow-up updated.'));
});

export const listReferrals = asyncHandler(async (req, res) => {
  let filter;
  if (req.user.role === 'CHO') {
    const villages = [...new Set([...(req.user.communityVillages || []), req.user.village].map((name) => String(name || '').trim()).filter(Boolean))];
    const patients = villages.length ? await Patient.find({ village: { $in: villages } }).distinct('_id') : [];
    filter = { patient: { $in: patients } };
  } else if (req.user.role === 'Doctor') {
    const related = await PatientRelationship.find({ relatedUser: req.user._id, relationshipType: 'DOCTOR', status: 'ACTIVE' }).distinct('patient');
    const patients = await Patient.find({ $or: [{ assignedDoctor: req.user._id }, { _id: { $in: related } }] }).distinct('_id');
    filter = { patient: { $in: patients } };
  } else throw new ApiError(403, 'Your role cannot view referrals.');
  if (req.query.patientId) {
    await resolveCarePatient(req.user, req.query.patientId);
    filter.patient = req.query.patientId;
  }
  if (['PENDING', 'ACCEPTED', 'COMPLETED', 'CANCELLED'].includes(req.query.status)) filter.status = req.query.status;
  const rows = await Referral.find(filter).populate({ path: 'patient', populate: { path: 'user', select: 'name' } }).sort({ referredAt: -1 }).limit(300);
  return res.json(new ApiResponse(200, rows, 'Referrals retrieved.'));
});

export const createReferral = asyncHandler(async (req, res) => {
  const patient = await resolveCarePatient(req.user, req.body.patientId);
  const reason = String(req.body.reason || '').trim();
  const destinationFacility = String(req.body.destinationFacility || '').trim();
  const referredAt = req.body.referredAt ? new Date(req.body.referredAt) : new Date();
  if (!reason || reason.length > 300) throw new ApiError(400, 'Enter a referral reason (up to 300 characters).');
  if (!destinationFacility || destinationFacility.length > 200) throw new ApiError(400, 'Enter a destination facility.');
  if (Number.isNaN(referredAt.getTime())) throw new ApiError(400, 'Enter a valid referral date.');
  const referral = await Referral.create({ patient: patient._id, reason, destinationFacility,
    originatingFacility: String(req.body.originatingFacility || '').trim().slice(0, 200), referredAt,
    notes: String(req.body.notes || '').trim().slice(0, 1000), createdBy: req.user._id,
    history: [{ status: 'PENDING', note: 'Referral created; awaiting facility update.', changedBy: req.user._id }] });
  const populated = await Referral.findById(referral._id).populate({ path: 'patient', populate: { path: 'user', select: 'name' } });
  return res.status(201).json(new ApiResponse(201, populated, 'Referral recorded as pending.'));
});

export const updateReferral = asyncHandler(async (req, res) => {
  const referral = await Referral.findById(req.params.id);
  if (!referral) throw new ApiError(404, 'Referral not found.');
  await resolveCarePatient(req.user, referral.patient);
  const allowed = { PENDING: ['ACCEPTED', 'COMPLETED', 'CANCELLED'], ACCEPTED: ['COMPLETED', 'CANCELLED'], COMPLETED: [], CANCELLED: [] };
  const { status, outcome, notes } = req.body;
  if (status !== undefined) {
    if (!allowed[referral.status]?.includes(status)) throw new ApiError(409, `Referral cannot move from ${referral.status} to ${status}.`);
    referral.status = status;
    referral.history.push({ status, note: String(req.body.note || '').trim().slice(0, 1000), changedBy: req.user._id });
  }
  if (outcome !== undefined) referral.outcome = String(outcome).trim().slice(0, 1000);
  if (notes !== undefined) referral.notes = String(notes).trim().slice(0, 1000);
  await referral.save();
  const populated = await Referral.findById(referral._id).populate({ path: 'patient', populate: { path: 'user', select: 'name' } });
  return res.json(new ApiResponse(200, populated, 'Referral updated.'));
});
