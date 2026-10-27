import { Prediction } from '../models/Prediction.js';
import { Patient } from '../models/Patient.js';
import { PatientRelationship } from '../models/PatientRelationship.js';
import { Report } from '../models/Report.js';
import { buildDiabetesFeatures } from '../services/diabetesFeatureBuilder.js';
import { callDiabetesPredictionService } from '../services/diabetesPredictionService.js';
import {
  triggerDiabetesRecalculation,
  triggerHeartDiseaseRecalculation,
  triggerHypertensionRecalculation,
  triggerCkdRecalculation,
} from './patientController.js';
import { buildHeartDiseaseFeatures } from '../services/heartDiseaseFeatureBuilder.js';
import { callHeartDiseasePredictionService } from '../services/heartDiseasePredictionService.js';
import { buildCkdFeatures, buildHypertensionFeatures } from '../services/newDiseaseFeatureBuilder.js';
import { callNewDiseasePredictionService } from '../services/newDiseasePredictionService.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncWrapper.js';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const researchModelSchemas = JSON.parse(readFileSync(
  path.resolve(currentDirectory, '../config/researchModelSchemas.json'),
  'utf8',
));

/**
 * Phase P1: Helper to verify that requester has legitimate access to target patient for predictions.
 */
const verifyPatientAccessForPrediction = async (req, patientId, isTrigger = false) => {
  if (!patientId) {
    throw new ApiError(400, 'Patient ID is required.');
  }

  const patient = await Patient.findById(patientId);
  if (!patient) {
    throw new ApiError(404, 'Target patient record not found.');
  }

  if (req.user.role === 'Patient') {
    const patientUserId = patient.user?._id || patient.user;
    if (String(patientUserId) !== String(req.user._id)) {
      throw new ApiError(403, 'Unauthorized. You may only access predictions for your own profile.');
    }
  } else if (req.user.role === 'Doctor') {
    const docId = patient.assignedDoctor?._id || patient.assignedDoctor;
    const isAssigned = docId && String(docId) === String(req.user._id);
    const hasActiveRel = await PatientRelationship.exists({
      patient: patient._id,
      relatedUser: req.user._id,
      relationshipType: 'DOCTOR',
      status: 'ACTIVE',
    });
    if (!isAssigned && !hasActiveRel) {
      throw new ApiError(403, 'Unauthorized. You are not assigned to this patient.');
    }
  } else if (req.user.role === 'CHO') {
    const choVillage = String(req.user.village || '').trim().toLowerCase();
    const patientVillage = String(patient.village || '').trim().toLowerCase();
    if (!choVillage || !patientVillage || choVillage !== patientVillage) {
      throw new ApiError(403, 'Unauthorized. This patient is outside your assigned community.');
    }
  } else if (req.user.role === 'Admin') {
    throw new ApiError(403, 'Administrative accounts cannot access clinical prediction records.');
  } else {
    throw new ApiError(403, 'Unauthorized to access predictions for this patient.');
  }

  return patient;
};

/**
 * Executes or re-runs Diabetes Scenario A ML risk assessment.
 * Can be invoked with a reportId (must be CONFIRMED) or direct clinical features.
 * Historical records are NEVER overwritten; new immutable prediction record is appended.
 */
export const predictDiabetes = asyncHandler(async (req, res) => {
  const { reportId, patientId, features } = req.body;

  if (req.user.role === 'Nurse' || req.user.role === 'Family' || req.user.role === 'Admin') {
    throw new ApiError(403, 'Your role is not authorized to trigger disease predictions.');
  }

  let targetPatientId = patientId;
  let reportDoc = null;

  if (reportId) {
    reportDoc = await Report.findById(reportId);
    if (!reportDoc) {
      throw new ApiError(404, 'Referenced medical report not found.');
    }
    if (reportDoc.status !== 'CONFIRMED') {
      throw new ApiError(400, 'Medical report must be CONFIRMED by user before running diabetes risk assessment.');
    }
    targetPatientId = reportDoc.patient;
  }

  if (req.user.role === 'Patient') {
    const ownPatient = await Patient.findOne({ user: req.user._id });
    if (!ownPatient) {
      throw new ApiError(404, 'Patient profile record not found.');
    }
    if (targetPatientId && String(targetPatientId) !== String(ownPatient._id)) {
      throw new ApiError(403, 'Unauthorized. You may only trigger predictions for your own profile.');
    }
    targetPatientId = ownPatient._id;
  }

  if (!targetPatientId) {
    throw new ApiError(400, 'Either a valid confirmed reportId or features object with patientId is required.');
  }

  const patientDoc = await verifyPatientAccessForPrediction(req, targetPatientId, true);

  let featureVector = null;
  let canCalculate = false;
  let missingDomain = null;
  let dataCompleteness = 'INSUFFICIENT';
  let featureAvailability = {};

  if (reportDoc) {
    const extraction = buildDiabetesFeatures(reportDoc, patientDoc);
    featureVector = extraction.featureVector;
    canCalculate = extraction.canCalculate;
    missingDomain = extraction.missingDomain;
    dataCompleteness = extraction.dataCompleteness;
    featureAvailability = extraction.featureAvailability;
  } else if (features && typeof features === 'object') {
    // Direct feature payload
    const extraction = buildDiabetesFeatures({ confirmedData: features }, patientDoc);
    featureVector = extraction.featureVector;
    canCalculate = extraction.canCalculate;
    missingDomain = extraction.missingDomain;
    dataCompleteness = extraction.dataCompleteness;
    featureAvailability = extraction.featureAvailability;
  } else {
    throw new ApiError(400, 'Either a valid confirmed reportId or features object is required.');
  }

  let predictionDoc = null;

  if (canCalculate) {
    const mlResult = await callDiabetesPredictionService(featureVector);

    if (mlResult.success && mlResult.canCalculate) {
      predictionDoc = await Prediction.create({
        patient: targetPatientId,
        report: reportDoc?._id || null,
        calculatedBy: req.user._id,
        disease: 'diabetes',
        scenario: 'A',
        modelVersion: mlResult.modelVersion || '1.0.0',
        probability: mlResult.probability,
        threshold: mlResult.threshold || 0.21,
        riskCategory: mlResult.riskCategory,
        status: 'SUCCESS',
        canCalculate: true,
        dataCompleteness: mlResult.dataCompleteness || dataCompleteness,
        missingDomain: null,
        inputFeatures: featureVector,
        featureAvailability: { ...(featureAvailability || {}), ...(mlResult.featureAvailability || {}) },
        topContributingFactors: mlResult.topContributingFactors || [],
        clinicalDisclaimer: mlResult.clinicalDisclaimer,
        overallRiskPercent: Math.round(mlResult.probability * 100),
        riskLevel: mlResult.riskCategory === 'ELEVATED_MODEL_ESTIMATED_RISK' ? 'High' : 'Low',
        confidenceScore: 82.8,
        recommendations: mlResult.riskCategory === 'ELEVATED_MODEL_ESTIMATED_RISK'
          ? [
              'Model-estimated diabetes risk is elevated (probability exceeds development decision threshold 0.210).',
              'Recommend clinical follow-up with confirmatory laboratory diagnostics (HbA1c or Fasting Plasma Glucose).',
              'Lifestyle evaluation and metabolic screening recommended.',
            ]
          : [
              'Model-estimated diabetes risk is within lower baseline range.',
              'Maintain routine preventative health monitoring and healthy lifestyle practices.',
            ],
        algorithmVersion: 'diabetes_scenario_a_v1.0.0',
        predictionDate: new Date(),
      });
    } else {
      predictionDoc = await Prediction.create({
        patient: targetPatientId,
        report: reportDoc?._id || null,
        calculatedBy: req.user._id,
        disease: 'diabetes',
        scenario: 'A',
        modelVersion: mlResult.modelVersion || '1.0.0',
        status: mlResult.status || 'INSUFFICIENT_DATA',
        canCalculate: false,
        dataCompleteness: 'INSUFFICIENT',
        missingDomain: mlResult.missingDomain || missingDomain,
        inputFeatures: featureVector,
        featureAvailability: { ...(featureAvailability || {}), ...(mlResult.featureAvailability || {}) },
        clinicalDisclaimer: 'Model-estimated risk for clinical decision support. Not a diagnosis.',
        predictionDate: new Date(),
      });
    }
  } else {
    // Insufficient input domain
    predictionDoc = await Prediction.create({
      patient: targetPatientId,
      report: reportDoc?._id || null,
      calculatedBy: req.user._id,
      disease: 'diabetes',
      scenario: 'A',
      modelVersion: '1.0.0',
      status: 'INSUFFICIENT_DATA',
      canCalculate: false,
      dataCompleteness: 'INSUFFICIENT',
      missingDomain,
      inputFeatures: featureVector,
      featureAvailability,
      clinicalDisclaimer: 'Model-estimated risk for clinical decision support. Not a diagnosis.',
      predictionDate: new Date(),
    });
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      predictionDoc,
      'Diabetes model-estimated risk assessment executed.'
    )
  );
});

/**
 * Retrieves the latest diabetes prediction for a patient.
 */
export const getLatestDiabetesPrediction = asyncHandler(async (req, res) => {
  let { patientId } = req.query;

  if (req.user.role === 'Patient') {
    const p = await Patient.findOne({ user: req.user._id });
    if (!p) throw new ApiError(404, 'Patient profile not found.');
    if (patientId && String(patientId) !== String(p._id)) {
      throw new ApiError(403, 'Unauthorized. You may only access predictions for your own profile.');
    }
    patientId = p._id;
  }

  if (!patientId) {
    throw new ApiError(400, 'Patient ID is required.');
  }

  await verifyPatientAccessForPrediction(req, patientId, false);

  let latest = await Prediction.findOne({
    patient: patientId,
    disease: 'diabetes',
  })
    .populate('report', 'title reportType fileUrl status confirmedAt uploadDate')
    .sort({ createdAt: -1 });

  // Self-healing synchronization: if latest prediction is missing, INSUFFICIENT_DATA, or service was unavailable,
  // attempt recalculation to upgrade stale service-unavailable states or reflect newly confirmed vitals.
  const isStaleOrIncomplete =
    !latest ||
    latest.status === 'INSUFFICIENT_DATA' ||
    latest.status === 'PREDICTION_SERVICE_UNAVAILABLE' ||
    latest.status === 'SERVICE_UNAVAILABLE' ||
    latest.status === 'FAILED';

  if (isStaleOrIncomplete) {
    const patient = await Patient.findById(patientId);
    if (patient) {
      await triggerDiabetesRecalculation(patientId, req.user._id);
      latest = await Prediction.findOne({
        patient: patientId,
        disease: 'diabetes',
      })
        .populate('report', 'title reportType fileUrl status confirmedAt uploadDate')
        .sort({ createdAt: -1 });
    }
  }

  return res.status(200).json(
    new ApiResponse(200, latest, 'Latest diabetes risk prediction retrieved.')
  );
});

/**
 * Retrieves full historical diabetes predictions for a patient.
 */
export const getDiabetesPredictionHistory = asyncHandler(async (req, res) => {
  let { patientId } = req.query;

  if (req.user.role === 'Patient') {
    const p = await Patient.findOne({ user: req.user._id });
    if (!p) throw new ApiError(404, 'Patient profile not found.');
    if (patientId && String(patientId) !== String(p._id)) {
      throw new ApiError(403, 'Unauthorized. You may only access predictions for your own profile.');
    }
    patientId = p._id;
  }

  if (!patientId) {
    throw new ApiError(400, 'Patient ID is required.');
  }

  await verifyPatientAccessForPrediction(req, patientId, false);

  const history = await Prediction.find({
    patient: patientId,
    disease: 'diabetes',
  })
    .populate('report', 'title reportType status confirmedAt uploadDate')
    .sort({ createdAt: -1 })
    .limit(30);

  return res.status(200).json(
    new ApiResponse(200, history, 'Historical diabetes predictions retrieved.')
  );
});

/**
 * Executes or re-runs Framingham Heart Disease 10-Year CHD ML risk assessment.
 * Can be invoked with a reportId (must be CONFIRMED) or direct clinical features.
 * Historical records are NEVER overwritten; new immutable prediction record is appended.
 * Decoupled: NEVER returns fake probabilities on service failures.
 */
export const predictHeartDisease = asyncHandler(async (req, res) => {
  const { reportId, patientId, features } = req.body;

  if (req.user.role === 'Nurse' || req.user.role === 'Family' || req.user.role === 'Admin') {
    throw new ApiError(403, 'Your role is not authorized to trigger disease predictions.');
  }

  let targetPatientId = patientId;
  let reportDoc = null;

  if (reportId) {
    reportDoc = await Report.findById(reportId);
    if (!reportDoc) {
      throw new ApiError(404, 'Referenced medical report not found.');
    }
    if (reportDoc.status !== 'CONFIRMED') {
      throw new ApiError(400, 'Medical report must be CONFIRMED by user before running heart disease risk assessment.');
    }
    targetPatientId = reportDoc.patient;
  }

  if (req.user.role === 'Patient') {
    const ownPatient = await Patient.findOne({ user: req.user._id });
    if (!ownPatient) {
      throw new ApiError(404, 'Patient profile record not found.');
    }
    if (targetPatientId && String(targetPatientId) !== String(ownPatient._id)) {
      throw new ApiError(403, 'Unauthorized. You may only trigger predictions for your own profile.');
    }
    targetPatientId = ownPatient._id;
  }

  if (!targetPatientId) {
    throw new ApiError(400, 'Either a valid confirmed reportId or features object with patientId is required.');
  }

  const patientDoc = await verifyPatientAccessForPrediction(req, targetPatientId, true);

  let featureVector = null;
  let canCalculate = false;
  let missingRequired = [];
  let missingFeatures = [];
  let dataCompleteness = 'INSUFFICIENT';
  let featureDetails = {};
  let provenance = {};

  if (reportDoc) {
    const extraction = buildHeartDiseaseFeatures(reportDoc, patientDoc);
    featureVector = extraction.featureVector;
    canCalculate = extraction.canCalculate;
    missingRequired = extraction.missingRequired;
    missingFeatures = extraction.missingFeatures;
    dataCompleteness = extraction.dataCompleteness;
    featureDetails = extraction.featureDetails;
    provenance = extraction.provenance;
  } else if (features && typeof features === 'object') {
    const extraction = buildHeartDiseaseFeatures({ confirmedData: features, status: 'CONFIRMED' }, patientDoc);
    featureVector = extraction.featureVector;
    canCalculate = extraction.canCalculate;
    missingRequired = extraction.missingRequired;
    missingFeatures = extraction.missingFeatures;
    dataCompleteness = extraction.dataCompleteness;
    featureDetails = extraction.featureDetails;
    provenance = extraction.provenance;
  } else {
    throw new ApiError(400, 'Either a valid confirmed reportId or features object is required.');
  }

  let predictionDoc = null;

  if (canCalculate) {
    const mlResult = await callHeartDiseasePredictionService(featureVector);

    if (mlResult.success && mlResult.canCalculate) {
      predictionDoc = await Prediction.create({
        patient: targetPatientId,
        report: reportDoc?._id || null,
        calculatedBy: req.user._id,
        disease: 'heart_disease',
        scenario: 'framingham_chd_10yr',
        modelVersion: mlResult.modelVersion || '1.0.0',
        probability: mlResult.probability,
        threshold: mlResult.threshold || 0.110,
        riskCategory: mlResult.riskCategory,
        status: 'SUCCESS',
        canCalculate: true,
        dataCompleteness: mlResult.dataCompleteness || dataCompleteness,
        missingDomain: null,
        inputFeatures: featureVector,
        featureAvailability: { ...(featureDetails || {}), ...(mlResult.features || {}) },
        topContributingFactors: mlResult.topContributingFactors || [],
        clinicalDisclaimer: mlResult.clinicalDisclaimer,
        overallRiskPercent: Math.round(mlResult.probability * 100),
        riskLevel: mlResult.riskCategory === 'ELEVATED_MODEL_ESTIMATED_RISK' ? 'High' : 'Low',
        confidenceScore: 71.4,
        recommendations: mlResult.riskCategory === 'ELEVATED_MODEL_ESTIMATED_RISK'
          ? [
              'Model-estimated 10-year CHD risk is elevated (probability exceeds development decision threshold 0.110).',
              'Recommend comprehensive cardiovascular evaluation, fasting lipid panel, and blood pressure monitoring.',
              'Cardiovascular lifestyle interventions, physical activity, and dietary consultation recommended.',
            ]
          : [
              'Model-estimated 10-year CHD risk is within lower baseline range.',
              'Maintain routine cardiovascular health monitoring and healthy lifestyle practices.',
            ],
        algorithmVersion: 'framingham_chd_v1.0.0',
        predictionDate: new Date(),
      });
    } else {
      // Service error or unreachability - Strict: NEVER generate fallback probability!
      const isUnavailable = mlResult.status === 'PREDICTION_SERVICE_UNAVAILABLE';
      predictionDoc = await Prediction.create({
        patient: targetPatientId,
        report: reportDoc?._id || null,
        calculatedBy: req.user._id,
        disease: 'heart_disease',
        scenario: 'framingham_chd_10yr',
        modelVersion: mlResult.modelVersion || '1.0.0',
        status: isUnavailable ? 'PREDICTION_SERVICE_UNAVAILABLE' : (mlResult.status || 'FAILED'),
        canCalculate: false,
        dataCompleteness: dataCompleteness,
        missingDomain: mlResult.message || 'Heart disease prediction microservice error.',
        inputFeatures: featureVector,
        featureAvailability: featureDetails,
        clinicalDisclaimer: 'Model-estimated risk for clinical decision support. Not a diagnosis.',
        predictionDate: new Date(),
      });
    }
  } else {
    // Insufficient input parameters (e.g. missing totChol or BP)
    const missingText = missingRequired.join(', ');
    predictionDoc = await Prediction.create({
      patient: targetPatientId,
      report: reportDoc?._id || null,
      calculatedBy: req.user._id,
      disease: 'heart_disease',
      scenario: 'framingham_chd_10yr',
      modelVersion: '1.0.0',
      status: 'INSUFFICIENT_DATA',
      canCalculate: false,
      dataCompleteness: 'INSUFFICIENT',
      missingDomain: missingText,
      inputFeatures: featureVector,
      featureAvailability: featureDetails,
      clinicalDisclaimer: 'Model-estimated risk for clinical decision support. Not a diagnosis.',
      predictionDate: new Date(),
    });
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      predictionDoc,
      'Heart disease model-estimated risk assessment executed.'
    )
  );
});

/**
 * Retrieves the latest heart disease prediction for a patient.
 */
export const getLatestHeartDiseasePrediction = asyncHandler(async (req, res) => {
  let { patientId } = req.query;

  if (req.user.role === 'Patient') {
    const p = await Patient.findOne({ user: req.user._id });
    if (!p) throw new ApiError(404, 'Patient profile not found.');
    if (patientId && String(patientId) !== String(p._id)) {
      throw new ApiError(403, 'Unauthorized. You may only access predictions for your own profile.');
    }
    patientId = p._id;
  }

  if (!patientId) {
    throw new ApiError(400, 'Patient ID is required.');
  }

  await verifyPatientAccessForPrediction(req, patientId, false);

  let latest = await Prediction.findOne({
    patient: patientId,
    disease: 'heart_disease',
  })
    .populate('report', 'title reportType fileUrl status confirmedAt uploadDate')
    .sort({ createdAt: -1 });

  // Self-healing synchronization: if latest prediction is missing, INSUFFICIENT_DATA, or service was unavailable,
  // attempt recalculation to upgrade stale service-unavailable states or reflect newly confirmed vitals.
  const isStaleOrIncomplete =
    !latest ||
    latest.status === 'INSUFFICIENT_DATA' ||
    latest.status === 'PREDICTION_SERVICE_UNAVAILABLE' ||
    latest.status === 'SERVICE_UNAVAILABLE' ||
    latest.status === 'FAILED';

  if (isStaleOrIncomplete) {
    const patient = await Patient.findById(patientId);
    if (patient) {
      await triggerHeartDiseaseRecalculation(patientId, req.user._id);
      latest = await Prediction.findOne({
        patient: patientId,
        disease: 'heart_disease',
      })
        .populate('report', 'title reportType fileUrl status confirmedAt uploadDate')
        .sort({ createdAt: -1 });
    }
  }

  return res.status(200).json(
    new ApiResponse(200, latest, 'Latest heart disease risk prediction retrieved.')
  );
});

/**
 * Retrieves full historical heart disease predictions for a patient.
 */
export const getHeartDiseasePredictionHistory = asyncHandler(async (req, res) => {
  let { patientId } = req.query;

  if (req.user.role === 'Patient') {
    const p = await Patient.findOne({ user: req.user._id });
    if (!p) throw new ApiError(404, 'Patient profile not found.');
    if (patientId && String(patientId) !== String(p._id)) {
      throw new ApiError(403, 'Unauthorized. You may only access predictions for your own profile.');
    }
    patientId = p._id;
  }

  if (!patientId) {
    throw new ApiError(400, 'Patient ID is required.');
  }

  await verifyPatientAccessForPrediction(req, patientId, false);

  const history = await Prediction.find({
    patient: patientId,
    disease: 'heart_disease',
  })
    .populate('report', 'title reportType status confirmedAt uploadDate')
    .sort({ createdAt: -1 })
    .limit(30);

  return res.status(200).json(
    new ApiResponse(200, history, 'Historical heart disease predictions retrieved.')
  );
});

const runNewDiseasePrediction = async (req, res, disease) => {
  const { reportId, patientId } = req.body || {};
  if (req.body?.features) {
    throw new ApiError(400, 'Direct feature payloads are not accepted; prediction inputs come from confirmed records.');
  }
  if (['Nurse', 'Family', 'Admin'].includes(req.user.role)) {
    throw new ApiError(403, 'Your role is not authorized to trigger disease predictions.');
  }

  let targetPatientId = patientId;
  let referencedReport = null;
  if (reportId) {
    referencedReport = await Report.findById(reportId);
    if (!referencedReport) throw new ApiError(404, 'Referenced medical report not found.');
    if (referencedReport.status !== 'CONFIRMED') {
      throw new ApiError(400, 'Prediction inputs must come from confirmed medical records.');
    }
    if (patientId && String(patientId) !== String(referencedReport.patient)) {
      throw new ApiError(403, 'The report does not belong to the requested patient.');
    }
    targetPatientId = referencedReport.patient;
  }

  if (req.user.role === 'Patient') {
    const ownPatient = await Patient.findOne({ user: req.user._id });
    if (!ownPatient) throw new ApiError(404, 'Patient profile record not found.');
    if (targetPatientId && String(targetPatientId) !== String(ownPatient._id)) {
      throw new ApiError(403, 'You may only request predictions for your own profile.');
    }
    targetPatientId = ownPatient._id;
  }
  if (!targetPatientId) throw new ApiError(400, 'A patientId or confirmed reportId is required.');

  const patient = await verifyPatientAccessForPrediction(req, targetPatientId, true);
  const confirmedReports = await Report.find({ patient: targetPatientId, status: 'CONFIRMED' })
    .sort({ confirmedAt: -1, createdAt: -1 })
    .limit(100);
  const extraction = disease === 'hypertension'
    ? buildHypertensionFeatures(confirmedReports, patient)
    : buildCkdFeatures(confirmedReports, patient, researchModelSchemas.chronic_kidney_disease.ordered_features);

  let modelResult;
  if (!extraction.canCalculate) {
    modelResult = {
      success: false,
      status: 'INSUFFICIENT_DATA',
      canCalculate: false,
      probability: null,
      threshold: null,
      missingFeatures: extraction.missingRequired,
      message: `Required confirmed information is missing: ${extraction.missingRequired.join(', ')}.`,
    };
  } else {
    modelResult = await callNewDiseasePredictionService(disease, extraction.featureVector);
  }

  if (modelResult.canCalculate && (
    typeof modelResult.probability !== 'number'
    || !Number.isFinite(modelResult.probability)
    || modelResult.probability < 0
    || modelResult.probability > 1
    || !['POSITIVE_CLASSIFICATION_ESTIMATE', 'NEGATIVE_CLASSIFICATION_ESTIMATE'].includes(modelResult.riskCategory)
  )) {
    modelResult = {
      ...modelResult,
      success: false,
      status: 'PREDICTION_SERVICE_UNAVAILABLE',
      canCalculate: false,
      probability: null,
      riskCategory: null,
      message: 'The model service returned an invalid prediction response. No probability was stored.',
    };
  }

  const statusValue = modelResult.canCalculate
    ? 'SUCCESS'
    : modelResult.status === 'INSUFFICIENT_DATA'
    ? 'INSUFFICIENT_DATA'
    : 'SERVICE_UNAVAILABLE';
  const prediction = await Prediction.create({
    patient: targetPatientId,
    report: referencedReport?._id || null,
    calculatedBy: req.user._id,
    disease,
    modelVersion: modelResult.modelVersion || null,
    featureSchemaVersion: modelResult.featureSchemaVersion || null,
    probability: modelResult.canCalculate ? modelResult.probability : null,
    threshold: typeof modelResult.threshold === 'number' ? modelResult.threshold : null,
    riskCategory: modelResult.canCalculate ? modelResult.riskCategory : (statusValue === 'INSUFFICIENT_DATA' ? 'INSUFFICIENT_DATA' : 'FAILED'),
    status: statusValue,
    canCalculate: Boolean(modelResult.canCalculate),
    dataCompleteness: modelResult.canCalculate ? (modelResult.dataCompleteness || extraction.dataCompleteness) : 'INSUFFICIENT',
    missingDomain: modelResult.canCalculate ? null : (modelResult.message || extraction.missingRequired.join(', ')),
    inputFeatures: extraction.featureVector,
    featureAvailability: {
      availableFeatures: Object.keys(extraction.featureVector).filter((key) => extraction.featureVector[key] !== null),
      missingFeatures: Object.keys(extraction.featureVector).filter((key) => extraction.featureVector[key] === null),
      provenance: extraction.provenance,
    },
    featureProvenance: extraction.provenance,
    topContributingFactors: modelResult.topContributingFactors || [],
    explanationStatus: modelResult.explanationStatus || 'unavailable',
    taskInterpretation: modelResult.taskInterpretation || (disease === 'hypertension'
      ? 'Classification of current diagnosed/treated hypertension; not future-onset prediction.'
      : 'Classification of the UCI CKD dataset label; not future-onset prediction.'),
    clinicalDisclaimer: modelResult.clinicalDisclaimer || 'Statistical model estimate only. Not a diagnosis and not clinically validated.',
    overallRiskPercent: modelResult.canCalculate ? Math.round(modelResult.probability * 100) : null,
    riskLevel: modelResult.canCalculate
      ? (['ELEVATED_MODEL_ESTIMATED_RISK', 'POSITIVE_CLASSIFICATION_ESTIMATE'].includes(modelResult.riskCategory) ? 'Elevated model estimate' : 'Lower model estimate')
      : 'Unknown',
    confidenceScore: null,
    diseaseBreakdown: { Diabetes: null, Hypertension: null, HeartDisease: null, KidneyDisease: null },
    algorithmVersion: modelResult.modelVersion || `${disease}_unavailable`,
    predictionDate: new Date(),
  });

  if (statusValue === 'SERVICE_UNAVAILABLE') {
    return res.status(503).json(new ApiResponse(503, prediction, modelResult.message || 'Disease model is unavailable. No probability was generated.'));
  }
  return res.status(200).json(new ApiResponse(200, prediction, modelResult.message || `${disease} model estimate generated.`));
};

export const predictHypertension = asyncHandler((req, res) => runNewDiseasePrediction(req, res, 'hypertension'));
export const predictCkd = asyncHandler((req, res) => runNewDiseasePrediction(req, res, 'chronic_kidney_disease'));

const getLatestNewDiseasePrediction = (disease) => asyncHandler(async (req, res) => {
  let { patientId } = req.query;
  if (req.user.role === 'Patient') {
    const ownPatient = await Patient.findOne({ user: req.user._id });
    if (!ownPatient) throw new ApiError(404, 'Patient profile not found.');
    if (patientId && String(patientId) !== String(ownPatient._id)) throw new ApiError(403, 'You may only access your own prediction.');
    patientId = ownPatient._id;
  }
  if (!patientId) throw new ApiError(400, 'Patient ID is required.');
  await verifyPatientAccessForPrediction(req, patientId, false);
  let latest = await Prediction.findOne({ patient: patientId, disease }).sort({ createdAt: -1 });

  // Self-healing synchronization: if latest prediction is missing or INSUFFICIENT_DATA / canCalculate === false or service was unavailable,
  // check if patient profile vitals or confirmed reports satisfy model requirements.
  const isStaleOrIncomplete =
    !latest ||
    !latest.canCalculate ||
    latest.status === 'INSUFFICIENT_DATA' ||
    latest.status === 'SERVICE_UNAVAILABLE' ||
    latest.status === 'PREDICTION_SERVICE_UNAVAILABLE' ||
    latest.status === 'MODEL_UNAVAILABLE' ||
    latest.status === 'FAILED';

  if (isStaleOrIncomplete) {
    if (disease === 'hypertension') {
      await triggerHypertensionRecalculation(patientId, req.user._id);
    } else if (disease === 'chronic_kidney_disease') {
      await triggerCkdRecalculation(patientId, req.user._id);
    }
    latest = await Prediction.findOne({ patient: patientId, disease }).sort({ createdAt: -1 });
  }

  return res.status(200).json(new ApiResponse(200, latest, `Latest ${disease} model estimate retrieved.`));
});

const getNewDiseasePredictionHistory = (disease) => asyncHandler(async (req, res) => {
  let { patientId } = req.query;
  if (req.user.role === 'Patient') {
    const ownPatient = await Patient.findOne({ user: req.user._id });
    if (!ownPatient) throw new ApiError(404, 'Patient profile not found.');
    if (patientId && String(patientId) !== String(ownPatient._id)) throw new ApiError(403, 'You may only access your own prediction history.');
    patientId = ownPatient._id;
  }
  if (!patientId) throw new ApiError(400, 'Patient ID is required.');
  await verifyPatientAccessForPrediction(req, patientId, false);
  const history = await Prediction.find({ patient: patientId, disease }).sort({ createdAt: -1 }).limit(30);
  return res.status(200).json(new ApiResponse(200, history, `${disease} model estimate history retrieved.`));
});

export const getLatestHypertensionPrediction = getLatestNewDiseasePrediction('hypertension');
export const getHypertensionPredictionHistory = getNewDiseasePredictionHistory('hypertension');
export const getLatestCkdPrediction = getLatestNewDiseasePrediction('chronic_kidney_disease');
export const getCkdPredictionHistory = getNewDiseasePredictionHistory('chronic_kidney_disease');
