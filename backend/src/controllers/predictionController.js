import { Prediction } from '../models/Prediction.js';
import { Patient } from '../models/Patient.js';
import { PatientRelationship } from '../models/PatientRelationship.js';
import { Report } from '../models/Report.js';
import { buildDiabetesFeatures } from '../services/diabetesFeatureBuilder.js';
import { callDiabetesPredictionService } from '../services/diabetesPredictionService.js';
import { triggerDiabetesRecalculation, triggerHeartDiseaseRecalculation } from './patientController.js';
import { buildHeartDiseaseFeatures } from '../services/heartDiseaseFeatureBuilder.js';
import { callHeartDiseasePredictionService } from '../services/heartDiseasePredictionService.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncWrapper.js';

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
  } else if (req.user.role === 'Nurse') {
    if (isTrigger) {
      throw new ApiError(403, 'Your role is not authorized to trigger disease predictions.');
    }
    const nurseId = patient.assignedNurse?._id || patient.assignedNurse;
    if (!nurseId || String(nurseId) !== String(req.user._id)) {
      throw new ApiError(403, 'Unauthorized. You are not assigned to this patient.');
    }
  } else if (req.user.role === 'Family') {
    if (isTrigger) {
      throw new ApiError(403, 'Your role is not authorized to trigger disease predictions.');
    }
    const isLinked = patient.linkedFamilyMembers?.some((f) => String(f._id || f) === String(req.user._id));
    const hasActiveRel = await PatientRelationship.exists({
      patient: patient._id,
      relatedUser: req.user._id,
      relationshipType: 'FAMILY',
      status: 'ACTIVE',
    });
    if (!isLinked && !hasActiveRel) {
      throw new ApiError(403, 'Unauthorized. You are not linked to this patient.');
    }
  } else if (req.user.role === 'CHO') {
    // CHO is authorized to view and trigger community patient predictions
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

  // Self-healing synchronization: if latest prediction is missing or INSUFFICIENT_DATA,
  // ensure it reflects newly added patient profile vitals (BMI, BP, age, sex).
  if (!latest || latest.status === 'INSUFFICIENT_DATA') {
    const patient = await Patient.findById(patientId);
    if (patient) {
      const hasPhysicalInProfile = Boolean(patient.bmi || (patient.systolicBP && patient.diastolicBP));
      const hasDemographicInProfile = Boolean(patient.age && patient.gender);

      if (
        !latest ||
        (hasPhysicalInProfile && !latest.featureAvailability?.hasPhysical) ||
        (hasDemographicInProfile && !latest.featureAvailability?.hasDemographic)
      ) {
        await triggerDiabetesRecalculation(patientId, req.user._id);
        latest = await Prediction.findOne({
          patient: patientId,
          disease: 'diabetes',
        })
          .populate('report', 'title reportType fileUrl status confirmedAt uploadDate')
          .sort({ createdAt: -1 });
      }
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

  // Self-healing synchronization: if latest prediction is missing or INSUFFICIENT_DATA,
  // check if newly added patient profile vitals (age, sex, BP, totChol) enable prediction.
  if (!latest || latest.status === 'INSUFFICIENT_DATA') {
    const patient = await Patient.findById(patientId);
    if (patient) {
      const hasCardioInProfile = Boolean(patient.totalCholesterol || (patient.systolicBP && patient.diastolicBP));
      const hasDemographicInProfile = Boolean(patient.age && patient.gender);

      if (
        !latest ||
        (hasCardioInProfile && (!latest.inputFeatures?.totChol || !latest.inputFeatures?.sysBP)) ||
        (hasDemographicInProfile && (!latest.inputFeatures?.age || latest.inputFeatures?.sex === null))
      ) {
        await triggerHeartDiseaseRecalculation(patientId, req.user._id);
        latest = await Prediction.findOne({
          patient: patientId,
          disease: 'heart_disease',
        })
          .populate('report', 'title reportType fileUrl status confirmedAt uploadDate')
          .sort({ createdAt: -1 });
      }
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
