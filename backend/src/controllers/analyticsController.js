import { Patient } from '../models/Patient.js';
import { MedicineLog } from '../models/MedicineLog.js';
import { Prediction } from '../models/Prediction.js';
import { Report } from '../models/Report.js';
import { FollowUp } from '../models/FollowUp.js';
import { Referral } from '../models/Referral.js';
import { PatientRelationship } from '../models/PatientRelationship.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncWrapper.js';

export const getAdherenceAnalytics = asyncHandler(async (req, res) => {
  let { patientId } = req.query;
  if (req.user.role === 'Patient') patientId = (await Patient.findOne({ user: req.user._id }))?._id;
  const filter = patientId ? { patient: patientId } : {};
  if (req.user.role === 'CHO') {
    const villages = [...(req.user.communityVillages || []), req.user.village].filter(Boolean);
    const allowedPatients = await Patient.find({ village: { $in: villages } }).distinct('_id');
    filter.patient = { $in: allowedPatients };
  }
  const totalLogs = await MedicineLog.countDocuments(filter);
  const takenLogs = await MedicineLog.countDocuments({ ...filter, status: 'Taken' });
  const missedLogs = await MedicineLog.countDocuments({ ...filter, status: 'Missed' });
  const pendingLogs = await MedicineLog.countDocuments({ ...filter, status: 'Pending' });
  const denominator = takenLogs + missedLogs;
  return res.json(new ApiResponse(200, { adherencePercent: denominator ? Math.round((takenLogs / denominator) * 100) : null, totalLogs, takenLogs, missedLogs, pendingLogs, weeklyData: [] }, 'Adherence analytics calculated from recorded dose logs.'));
});

export const getPopulationHealthStats = asyncHandler(async (req, res) => {
  if (!['CHO', 'Doctor', 'Admin'].includes(req.user.role)) throw new ApiError(403, 'Your role cannot view population analytics.');
  const patientFilter = {};
  if (req.user.role === 'CHO') {
    const villages = [...new Set([...(req.user.communityVillages || []), req.user.village].map((name) => String(name || '').trim()).filter(Boolean))];
    if (!villages.length) patientFilter._id = null;
    else patientFilter.village = { $in: villages };
    if (req.query.village) {
      if (!villages.some((name) => name.toLowerCase() === String(req.query.village).trim().toLowerCase())) patientFilter._id = null;
      else patientFilter.village = { $in: [req.query.village] };
    }
  } else if (req.user.role === 'Doctor') {
    const relationships = await PatientRelationship.find({ relatedUser: req.user._id, relationshipType: 'DOCTOR', status: 'ACTIVE' }).distinct('patient');
    patientFilter.$or = [{ assignedDoctor: req.user._id }, { _id: { $in: relationships } }];
  }
  if (req.query.village && req.user.role !== 'CHO') patientFilter.village = req.query.village;
  const from = req.query.from ? new Date(req.query.from) : null;
  const to = req.query.to ? new Date(req.query.to) : null;
  if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime()))) throw new ApiError(400, 'Invalid date range.');

  const patients = await Patient.find(patientFilter).select('village age dob gender fastingSugar systolicBP diastolicBP').lean();
  const ids = patients.map(({ _id }) => _id);
  const scoped = { patient: { $in: ids } };
  const supportedDiseases = [
    { key: 'diabetes', name: 'Diabetes' },
    { key: 'heart_disease', name: 'Heart disease' },
    { key: 'hypertension', name: 'Hypertension' },
    { key: 'chronic_kidney_disease', name: 'Chronic kidney disease' },
  ];
  const diseaseKeys = supportedDiseases.map((d) => d.key);
  const [reportRecords, latestPredictions, followUps, referralRecords] = await Promise.all([
    Report.find(scoped).select('patient status confirmedAt uploadDate').lean(),
    Prediction.find({ ...scoped, disease: { $in: diseaseKeys }, status: 'SUCCESS' }).sort({ predictionDate: -1 }).select('patient disease riskCategory probability threshold modelVersion predictionDate').lean(),
    FollowUp.find({ ...scoped, status: 'SCHEDULED' }).select('patient dueAt').lean(),
    Referral.find({ ...scoped, status: { $in: ['PENDING', 'ACCEPTED'] } }).select('patient status referredAt').lean(),
  ]);
  const confirmedReports = reportRecords.filter((r) => r.status === 'CONFIRMED' && (!from && !to || ((r.confirmedAt || r.uploadDate) && (!from || new Date(r.confirmedAt || r.uploadDate) >= from) && (!to || new Date(r.confirmedAt || r.uploadDate) <= to))));
  const pendingReports = reportRecords.filter((r) => r.status === 'PENDING_REVIEW').length;
  const pendingReferrals = referralRecords.length;
  const seenAssessments = new Set();
  const currentAssessments = latestPredictions.filter((p) => {
    const key = `${p.patient}:${p.disease}`;
    if (seenAssessments.has(key)) return false;
    seenAssessments.add(key);
    return true;
  });
  const screened = new Set(confirmedReports.map((r) => String(r.patient))).size;
  const villages = new Map();
  for (const p of patients) {
    const key = p.village || 'Not recorded';
    const entry = villages.get(key) || { name: key, registered: 0, screenedPatients: new Set() };
    entry.registered += 1;
    villages.set(key, entry);
  }
  for (const r of confirmedReports) {
    const patient = patients.find((p) => String(p._id) === String(r.patient));
    if (patient) villages.get(patient.village || 'Not recorded')?.screenedPatients.add(String(r.patient));
  }
  const villageStats = [...villages.values()].map((v) => ({ name: v.name, patients: v.registered, registered: v.registered, screened: v.screenedPatients.size, remaining: Math.max(0, v.registered - v.screenedPatients.size), coveragePercent: v.registered ? Math.round(v.screenedPatients.size / v.registered * 100) : null }));
  const ageGroups = [{ name: '18–39', min: 18, max: 39 }, { name: '40–59', min: 40, max: 59 }, { name: '60+', min: 60, max: 120 }].map((g) => ({ name: g.name, value: patients.filter((p) => { const age = Number(p.age) || (p.dob ? Math.floor((Date.now() - new Date(p.dob)) / 31557600000) : null); return age !== null && age >= g.min && age <= g.max; }).length }));
  const diseaseDistribution = supportedDiseases.map(({ key, name }) => {
    const records = currentAssessments.filter((p) => p.disease === key);
    return {
      name,
      disease: key,
      assessed: records.length,
      elevated: records.filter((p) => ['ELEVATED_MODEL_ESTIMATED_RISK', 'POSITIVE_CLASSIFICATION_ESTIMATE'].includes(p.riskCategory)).length,
      lower: records.filter((p) => ['LOWER_MODEL_ESTIMATED_RISK', 'NEGATIVE_CLASSIFICATION_ESTIMATE'].includes(p.riskCategory)).length,
      unassessed: Math.max(0, patients.length - records.length),
    };
  });
  const now = new Date();
  const dueSoon = followUps.filter((f) => f.dueAt >= now && f.dueAt <= new Date(now.getTime() + 7 * 86400000)).length;
  const overdue = followUps.filter((f) => f.dueAt < now).length;
  const monthly = new Map();
  for (const report of confirmedReports) {
    const date = report.confirmedAt || report.uploadDate;
    if (!date) continue;
    const key = new Date(date).toISOString().slice(0, 7);
    monthly.set(key, (monthly.get(key) || 0) + 1);
  }
  const signalByPatient = new Map();
  const signalsFor = (patientId) => {
    const id = String(patientId);
    if (!signalByPatient.has(id)) signalByPatient.set(id, { patientId: id, hasConfirmedReport: false, pendingReportReviews: 0, diabetesAssessment: 'Unassessed', heartDiseaseAssessment: 'Unassessed', hypertensionAssessment: 'Unassessed', ckdAssessment: 'Unassessed', nextFollowUp: null, followUpStatus: 'None scheduled', referralStatus: 'None' });
    return signalByPatient.get(id);
  };
  for (const report of reportRecords) {
    const signal = signalsFor(report.patient);
    if (report.status === 'CONFIRMED') signal.hasConfirmedReport = true;
    if (report.status === 'PENDING_REVIEW') signal.pendingReportReviews += 1;
  }
  for (const assessment of currentAssessments) signalForPatientAssessment(signalsFor, assessment);
  for (const followUp of followUps) {
    const signal = signalsFor(followUp.patient);
    if (!signal.nextFollowUp || new Date(followUp.dueAt) < new Date(signal.nextFollowUp)) signal.nextFollowUp = followUp.dueAt;
  }
  for (const referral of referralRecords) {
    const signal = signalsFor(referral.patient);
    signal.referralStatus = signal.referralStatus === 'None' || referral.status === 'PENDING' ? referral.status : signal.referralStatus;
  }
  for (const signal of signalByPatient.values()) {
    if (signal.pendingReportReviews) signal.reportReviewStatus = 'Pending clinician review';
    signal.followUpStatus = signal.nextFollowUp ? (new Date(signal.nextFollowUp) < now ? 'Overdue' : 'Scheduled') : 'None scheduled';
  }
  return res.json(new ApiResponse(200, {
    totalPatients: patients.length,
    registeredPatients: patients.length,
    eligiblePopulation: null,
    screeningCoverage: patients.length ? Math.round(screened / patients.length * 100) : null,
    screeningDenominator: 'Registered patients with a confirmed report; eligible population is not configured.',
    screenedPatients: screened,
    pendingScreenings: Math.max(0, patients.length - screened),
    pendingReportReviews: pendingReports,
    followUpsDueSoon: dueSoon,
    followUpsOverdue: overdue,
    pendingReferrals,
    patientSignals: [...signalByPatient.values()],
    villageStats,
    ageDistribution: ageGroups,
    monthlyScreenings: [...monthly.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, count]) => ({ month, count })),
    diseaseDistribution,
    recentAssessments: currentAssessments,
    dataQuality: { missingVillage: patients.filter((p) => !p.village).length, missingAge: patients.filter((p) => !p.age && !p.dob).length, patientsWithNoConfirmedReport: Math.max(0, patients.length - screened) },
  }, 'Community analytics calculated from authorized patient records.'));
});

function signalForPatientAssessment(signalsFor, assessment) {
  const signal = signalsFor(assessment.patient);
  const category = assessment.riskCategory || 'Assessment unavailable';
  if (assessment.disease === 'diabetes') signal.diabetesAssessment = category;
  if (assessment.disease === 'heart_disease') signal.heartDiseaseAssessment = category;
  if (assessment.disease === 'hypertension') signal.hypertensionAssessment = category;
  if (['chronic_kidney_disease', 'kidney_disease', 'ckd'].includes(assessment.disease)) signal.ckdAssessment = category;
}
