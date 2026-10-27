import { Report } from '../models/Report.js';
import { Patient } from '../models/Patient.js';
import { PatientRelationship } from '../models/PatientRelationship.js';
import { Prediction } from '../models/Prediction.js';
import { uploadOnCloudinary } from '../config/cloudinary.js';
import { processReportOCR, validateBiomarker } from '../services/ocrService.js';
import { CANONICAL_FIELDS, convertUnitSafely } from '../services/medicalNormalizer.js';
import { buildDiabetesFeatures } from '../services/diabetesFeatureBuilder.js';
import { callDiabetesPredictionService } from '../services/diabetesPredictionService.js';
import { buildHeartDiseaseFeatures } from '../services/heartDiseaseFeatureBuilder.js';
import { callHeartDiseasePredictionService, checkHeartDiseaseServiceHealth } from '../services/heartDiseasePredictionService.js';
import { buildCkdFeatures, buildHypertensionFeatures } from '../services/newDiseaseFeatureBuilder.js';
import { callNewDiseasePredictionService } from '../services/newDiseasePredictionService.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncWrapper.js';

const isDoctorAuthorizedForPatient = async (patientRecord, doctorUserId) => {
  if (!patientRecord) return false;
  const isAssigned = patientRecord.assignedDoctor && String(patientRecord.assignedDoctor) === String(doctorUserId);
  if (isAssigned) return true;
  const hasActiveRel = await PatientRelationship.exists({
    patient: patientRecord._id,
    relatedUser: doctorUserId,
    relationshipType: 'DOCTOR',
    status: 'ACTIVE',
  });
  return Boolean(hasActiveRel);
};

export const uploadReport = asyncHandler(async (req, res) => {
  const { title, reportType = 'Blood Test', patientId } = req.body;

  if (!req.file) {
    throw new ApiError(400, 'Please select a lab report document (PNG, JPG, JPEG, WEBP, or PDF) to upload.');
  }

  // Phase P0: Strict server-side authorization for upload
  let targetPatientId = null;
  if (req.user.role === 'Patient') {
    const patientRecord = await Patient.findOne({ user: req.user._id });
    if (!patientRecord) {
      throw new ApiError(404, 'Patient profile not found for the authenticated user.');
    }
    targetPatientId = patientRecord._id;
  } else if (req.user.role === 'Doctor') {
    if (!patientId) {
      throw new ApiError(400, 'patientId parameter is required for healthcare providers.');
    }
    const patientRecord = await Patient.findById(patientId);
    if (!patientRecord) {
      throw new ApiError(404, 'Patient record not found.');
    }
    const isAuthorized = await isDoctorAuthorizedForPatient(patientRecord, req.user._id);
    if (!isAuthorized) {
      throw new ApiError(403, 'Unauthorized. You are not the assigned doctor for this patient.');
    }
    targetPatientId = patientRecord._id;
  } else {
    // Admin, CHO (untrusted catchment) or unrecognized/deprecated roles: 403
    throw new ApiError(403, 'Your role is not authorized to upload clinical laboratory reports.');
  }

  let ocrResult = null;
  let uploadResult = null;

  try {
    // 1. Process OCR on uploaded file path
    ocrResult = await processReportOCR(req.file.path);
  } catch (ocrErr) {
    console.error('[Report Controller] OCR Error:', ocrErr.message);
    ocrResult = {
      rawText: 'OCR extraction encountered an error.',
      confidence: 0,
      extractedData: {},
      structuredData: {},
      status: 'OCR_FAILED',
    };
  }

  try {
    // 2. Upload file to Cloudinary (or controlled local fallback)
    uploadResult = await uploadOnCloudinary(req.file.path);
  } catch (uploadErr) {
    console.error('[Report Controller] Storage Error:', uploadErr.message);
    throw new ApiError(500, uploadErr.message);
  }

  // 3. Save initial Report document with PENDING_REVIEW status
  // Note: Patient health snapshot is NOT updated here; it updates ONLY upon user confirmation!
  const detectedDocType = ocrResult.extractedData?.document?.reportType?.value;
  let classifiedTitleType = reportType;
  if (detectedDocType === 'ambulatory_blood_pressure_monitoring') {
    classifiedTitleType = 'Ambulatory Blood Pressure Monitoring';
  } else if (detectedDocType && detectedDocType !== 'unknown' && (!reportType || reportType === 'Blood Test' || reportType === 'Other')) {
    classifiedTitleType = detectedDocType.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  // Preserve complete pristine machine-generated extraction snapshot immediately after OCR/parser/normalization
  const initialExtractionSnapshot = JSON.parse(JSON.stringify(ocrResult.extractedData || {}));

  const report = await Report.create({
    patient: targetPatientId,
    uploader: req.user._id,
    title: title || req.file.originalname,
    reportType: classifiedTitleType || 'General Laboratory Report',
    fileUrl: uploadResult.url,
    publicId: uploadResult.publicId,
    storageProvider: uploadResult.storageProvider || 'local',
    status: ocrResult.status === 'OCR_FAILED' ? 'OCR_FAILED' : 'PENDING_REVIEW',
    rawOcrText: ocrResult.rawText || '',
    extractedText: ocrResult.rawText || '',
    initialExtraction: initialExtractionSnapshot,
    corrections: {},
    extractedData: ocrResult.extractedData || {},
    structuredData: ocrResult.structuredData || {},
    confidence: ocrResult.confidence || 0,
    uploadDate: new Date(),
  });

  // Non-blocking proactive warmup of Python ML microservice so cold-start delay is eliminated
  checkHeartDiseaseServiceHealth().catch(() => {});

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        report,
        ocr: ocrResult,
      },
      'Report uploaded and OCR extracted. Awaiting review and confirmation.'
    )
  );
});

/**
 * Human-in-the-loop: Updates pending extracted medical values before confirmation.
 * Enforces:
 * 1. User authentication and authorization (patient ownership or assigned clinician/admin).
 * 2. Status check: Report must be in PENDING_REVIEW or unconfirmed state.
 * 3. Complete immutability of rawOcrText and initialExtraction.
 * 4. Full audit trail of corrections in report.corrections:
 *    - field
 *    - original extracted value (preserved from initialExtraction even across repeated edits)
 *    - corrected value
 *    - unit
 *    - source ('manual_correction' or 'manual')
 *    - correctedAt
 *    - correctedBy
 *    - verified: false (until explicitly confirmed)
 * 5. Three-tier biological range re-validation (reusing validateBiomarker).
 * 6. Zero mutation of confirmedData and zero update to Patient snapshot or ML predictions.
 */
/**
 * Extracts numeric value from report's initialExtraction snapshot for a given clinical parameter.
 */
const getInitialValueFromReport = (report, key) => {
  const init = report?.initialExtraction || {};
  const initVitals = init.canonicalVitals || {};
  const initMeasurements = init.measurements || {};

  const candidates = [
    initVitals[key],
    init[key],
    initMeasurements[key],
  ];

  if (key === 'fastingSugar') candidates.push(initVitals.fastingGlucose, init.fastingGlucose, initMeasurements.fastingGlucose);
  if (key === 'fastingGlucose') candidates.push(initVitals.fastingSugar, init.fastingSugar, initMeasurements.fastingSugar);
  if (key === 'serumCreatinine') candidates.push(initVitals.creatinine, init.creatinine, initMeasurements.creatinine);
  if (key === 'bloodUrea') candidates.push(initVitals.bloodUrea, init.bloodUrea, initMeasurements.bloodUrea);
  if (key === 'creatinine') candidates.push(initVitals.serumCreatinine, init.serumCreatinine, initMeasurements.serumCreatinine);
  if (key === 'totalCholesterol' || key === 'cholesterol') candidates.push(initVitals.totalCholesterol, initVitals.cholesterol, init.cholesterol, initMeasurements.cholesterol, initMeasurements.totalCholesterol);
  if (key === 'hdl' || key === 'hdlCholesterol') candidates.push(initVitals.hdl, init.hdl, initMeasurements.hdl, initMeasurements.hdlCholesterol);
  if (key === 'gender') candidates.push(init.patientContext?.sex, init.patientContext?.gender);
  if (key === 'age') candidates.push(init.patientContext?.age);

  for (const c of candidates) {
    if (c !== undefined && c !== null && c !== '') {
      const val = typeof c === 'object' ? c.value : c;
      if (val !== undefined && val !== null && val !== '') {
        const num = Number(val);
        return isNaN(num) ? val : num;
      }
    }
  }
  return null;
};

export const updateExtractedData = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { corrections, field, value, unit } = req.body;

  const report = await Report.findById(id);
  if (!report) {
    throw new ApiError(404, 'Medical report not found.');
  }

  const patientRecord = await Patient.findById(report.patient);
  if (!patientRecord) {
    throw new ApiError(404, 'Associated patient record not found.');
  }

  // Phase P1: Strict reviewer authorization (Patient owner or assigned Doctor only; Nurse/Family/Admin/untrusted CHO rejected)
  if (req.user.role === 'Patient') {
    if (String(patientRecord.user) !== String(req.user._id)) {
      throw new ApiError(403, 'Unauthorized. You may only edit reports associated with your profile.');
    }
  } else if (req.user.role === 'Doctor') {
    const isAuthorized = await isDoctorAuthorizedForPatient(patientRecord, req.user._id);
    if (!isAuthorized) {
      throw new ApiError(403, 'Unauthorized. You are not the assigned doctor for this patient.');
    }
  } else {
    throw new ApiError(403, 'Your role is not authorized to edit report OCR extractions.');
  }

  if (report.status === 'CONFIRMED') {
    throw new ApiError(400, 'Report has already been confirmed. Confirmed clinical records cannot be modified via pending extraction edits.');
  }

  // Normalize incoming corrections payload: support both { corrections: { ... } } and single { field, value, unit }
  const incomingCorrections = {};
  if (corrections && typeof corrections === 'object') {
    Object.assign(incomingCorrections, corrections);
  } else if (field !== undefined && value !== undefined) {
    incomingCorrections[field] = { value, unit };
  } else {
    throw new ApiError(400, 'Please provide valid field corrections.');
  }

  const allowedFields = [
    'fastingSugar',
    'fastingGlucose',
    'systolicBP',
    'diastolicBP',
    'heartRate',
    'totalCholesterol',
    'cholesterol',
    'hdl',
    'hdlCholesterol',
    'serumCreatinine',
    'creatinine',
    'bloodUrea',
    'hemoglobin',
    'bmi',
    'age',
    'gender',
    'sex',
  ];

  if (!report.corrections) report.corrections = {};
  if (!report.extractedData) report.extractedData = {};
  if (!report.extractedData.canonicalVitals) report.extractedData.canonicalVitals = {};
  if (!report.extractedData.measurements) report.extractedData.measurements = {};
  if (!report.structuredData) report.structuredData = {};

  const warnings = [];
  const updatedCorrections = {};

  for (const [rawKey, entryVal] of Object.entries(incomingCorrections)) {
    if (!allowedFields.includes(rawKey)) {
      throw new ApiError(400, `Field '${rawKey}' is not an editable clinical parameter.`);
    }

    const canonicalKey = (rawKey === 'fastingGlucose')
      ? 'fastingSugar'
      : (rawKey === 'creatinine')
      ? 'serumCreatinine'
      : (rawKey === 'cholesterol')
      ? 'totalCholesterol'
      : (rawKey === 'hdlCholesterol')
      ? 'hdl'
      : (rawKey === 'sex')
      ? 'gender'
      : rawKey;

    let targetVal = entryVal;
    let targetUnit = null;

    if (typeof entryVal === 'object' && entryVal !== null) {
      targetVal = entryVal.value;
      targetUnit = entryVal.unit || (canonicalKey === 'bloodUrea' ? null : getDefaultUnit(canonicalKey));
    } else {
      targetUnit = canonicalKey === 'bloodUrea' ? null : getDefaultUnit(canonicalKey);
    }

    if (targetVal === undefined || targetVal === null || targetVal === '') {
      throw new ApiError(400, `No value provided for field '${rawKey}'.`);
    }

    let parsedVal = targetVal;
    const submittedValue = targetVal;
    const submittedUnit = targetUnit;
    if (canonicalKey !== 'gender') {
      parsedVal = Number(targetVal);
      if (isNaN(parsedVal)) {
        throw new ApiError(400, `Invalid numeric value '${targetVal}' provided for ${canonicalKey}.`);
      }
      if (parsedVal < 0) {
        throw new ApiError(400, `Value cannot be negative for ${canonicalKey}.`);
      }

      if (canonicalKey === 'bloodUrea') {
        if (!targetUnit) throw new ApiError(400, 'Select an explicit unit for blood urea (mg/dL or mmol/L).');
        const converted = convertUnitSafely(CANONICAL_FIELDS.BLOOD_UREA, parsedVal, targetUnit);
        if (!['mg/dL', 'mmol/L'].includes(converted.unit)) {
          throw new ApiError(400, 'Blood urea unit must be mg/dL or mmol/L.');
        }
        parsedVal = converted.normalizedValue;
        targetUnit = converted.normalizedUnit;
      }

      // Three-tier clinical validation using existing medicalValidation.js
      const validation = validateBiomarker(canonicalKey, parsedVal, targetUnit);
      if (validation.status === 'INVALID') {
        throw new ApiError(400, `Invalid value for ${canonicalKey}: ${validation.message}`);
      }
      if (validation.status === 'WARNING') {
        warnings.push({ field: canonicalKey, message: validation.message });
      }
    }

    // Determine original extracted value
    // Rule 5: If edited multiple times before confirmation, DO NOT lose the original OCR value!
    const existingCorrection = report.corrections[canonicalKey];
    let originalExtractedVal = null;

    if (existingCorrection && existingCorrection.originalValue !== undefined) {
      originalExtractedVal = existingCorrection.originalValue;
    } else {
      originalExtractedVal = getInitialValueFromReport(report, canonicalKey);
    }

    const isAddition = (originalExtractedVal === null || originalExtractedVal === undefined);
    const provenanceSource = isAddition ? 'manual' : 'manual_correction';

    const correctionRecord = {
      field: canonicalKey,
      originalValue: originalExtractedVal,
      correctedValue: parsedVal,
      unit: targetUnit || getDefaultUnit(canonicalKey),
      submittedValue,
      submittedUnit,
      conversionApplied: canonicalKey === 'bloodUrea' && submittedUnit !== targetUnit,
      source: provenanceSource,
      correctedAt: new Date(),
      correctedBy: req.user._id,
      verified: false,
    };

    report.corrections[canonicalKey] = correctionRecord;
    updatedCorrections[canonicalKey] = correctionRecord;

    // Update pending extractedData.canonicalVitals and structuredData
    report.extractedData.canonicalVitals[canonicalKey] = {
      value: parsedVal,
      unit: targetUnit || getDefaultUnit(canonicalKey),
      originalValueUnit: submittedUnit,
      source: provenanceSource,
      originalValue: originalExtractedVal,
      verified: false,
    };

    if (canonicalKey === 'fastingSugar') {
      report.extractedData.canonicalVitals.fastingGlucose = report.extractedData.canonicalVitals[canonicalKey];
    }

    if (!report.extractedData.measurements) report.extractedData.measurements = {};
    report.extractedData.measurements[canonicalKey] = {
      ...(report.extractedData.measurements[canonicalKey] || {}),
      value: parsedVal,
      unit: targetUnit || getDefaultUnit(canonicalKey),
      originalValueUnit: submittedUnit,
      source: provenanceSource,
      originalValue: originalExtractedVal,
      verified: false,
    };

    // Strict Data-Integrity Rule: pending edits live in extractedData and corrections.
    // structuredData is updated ONLY upon explicit user confirmation!
  }

  // Cross-parameter biological check: Systolic BP must be greater than Diastolic BP
  const curSys = report.extractedData.canonicalVitals?.systolicBP?.value ?? report.extractedData.canonicalVitals?.systolicBP;
  const curDia = report.extractedData.canonicalVitals?.diastolicBP?.value ?? report.extractedData.canonicalVitals?.diastolicBP;
  if (curSys !== undefined && curDia !== undefined && curSys !== null && curDia !== null) {
    if (Number(curSys) <= Number(curDia)) {
      throw new ApiError(400, `Systolic blood pressure (${curSys} mmHg) must be greater than diastolic blood pressure (${curDia} mmHg).`);
    }
  }

  report.markModified('extractedData');
  report.markModified('corrections');
  await report.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        report,
        corrections: report.corrections,
        warnings,
      },
      'Pending report extraction data updated successfully.'
    )
  );
});

/**
 * User reviews/edits extracted values and confirms report.
 * Validates data types/ranges, updates report status to CONFIRMED,
 * and updates Patient's latest snapshot without overwriting unobserved fields with null.
 */
export const confirmReport = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { confirmedData } = req.body;

  const report = await Report.findById(id);
  if (!report) {
    throw new ApiError(404, 'Medical report not found.');
  }

  const patientRecord = await Patient.findById(report.patient);
  if (!patientRecord) {
    throw new ApiError(404, 'Associated patient record not found.');
  }

  // Phase P0: Report confirmation authority (Patient owner or assigned Doctor only; Nurse/Family/Admin/untrusted CHO rejected)
  if (req.user.role === 'Patient') {
    if (String(patientRecord.user) !== String(req.user._id)) {
      throw new ApiError(403, 'Unauthorized. You may only confirm reports associated with your profile.');
    }
  } else if (req.user.role === 'Doctor') {
    const isAuthorized = await isDoctorAuthorizedForPatient(patientRecord, req.user._id);
    if (!isAuthorized) {
      throw new ApiError(403, 'Unauthorized. You are not the assigned doctor for this patient.');
    }
  } else {
    throw new ApiError(403, 'User role lacks clinical confirmation authority.');
  }

  const validatedConfirmed = {};
  const flatConfirmed = {};
  const warnings = [];

  const allowedFields = [
    'fastingSugar',
    'fastingGlucose',
    'systolicBP',
    'diastolicBP',
    'heartRate',
    'totalCholesterol',
    'cholesterol',
    'hdl',
    'hdlCholesterol',
    'serumCreatinine',
    'creatinine',
    'bloodUrea',
    'hemoglobin',
    'bmi',
  ];

  if (confirmedData && typeof confirmedData === 'object') {
    // If incoming data has canonicalVitals or flat fields
    const sourceMap = (Object.keys(confirmedData).length > 0)
      ? (confirmedData.canonicalVitals || confirmedData)
      : (report.extractedData?.canonicalVitals || {});

    for (const field of allowedFields) {
      const fieldEntry = sourceMap[field];
      if (fieldEntry !== undefined && fieldEntry !== null && fieldEntry !== '') {
        let numVal = Number(typeof fieldEntry === 'object' ? fieldEntry.value : fieldEntry);
        let unit = typeof fieldEntry === 'object' ? fieldEntry.unit : null;

        if (field === 'bloodUrea') {
          if (!unit) throw new ApiError(400, 'Select an explicit unit for blood urea (mg/dL or mmol/L).');
          const converted = convertUnitSafely(CANONICAL_FIELDS.BLOOD_UREA, numVal, unit);
          if (!['mg/dL', 'mmol/L'].includes(converted.unit)) {
            throw new ApiError(400, 'Blood urea unit must be mg/dL or mmol/L.');
          }
          numVal = converted.normalizedValue;
          unit = converted.normalizedUnit;
        }

        if (isNaN(numVal) || numVal < 0) {
          throw new ApiError(400, `Invalid numeric value provided for ${field}.`);
        }

        const validation = validateBiomarker(field, numVal, unit);
        if (validation.status === 'INVALID') {
          throw new ApiError(400, `Invalid value for ${field}: ${validation.message}`);
        }

        if (validation.status === 'WARNING') {
          warnings.push({ field, message: validation.message });
        }

        const canonicalKey = (field === 'fastingGlucose')
          ? 'fastingSugar'
          : (field === 'creatinine')
          ? 'serumCreatinine'
          : (field === 'cholesterol')
          ? 'totalCholesterol'
          : (field === 'hdlCholesterol')
          ? 'hdl'
          : field;

        // Trace provenance from corrections if available
        const correction = report.corrections?.[canonicalKey] || report.corrections?.[field];
        let fieldSource = 'report';
        let originalVal = numVal;

        if (correction) {
          fieldSource = correction.source || 'manual_correction';
          originalVal = correction.originalValue !== undefined ? correction.originalValue : numVal;
          correction.verified = true;
          correction.confirmedAt = new Date();
          correction.correctedValue = numVal;
        } else {
          const initVal = getInitialValueFromReport(report, canonicalKey);
          if (initVal !== null && initVal !== undefined) {
            originalVal = initVal;
            fieldSource = (Number(initVal) !== numVal) ? 'manual_correction' : 'report';
          } else {
            fieldSource = 'manual';
            originalVal = null;
          }

          if (fieldSource !== 'report') {
            if (!report.corrections) report.corrections = {};
            report.corrections[canonicalKey] = {
              field: canonicalKey,
              originalValue: originalVal,
              correctedValue: numVal,
              unit: unit || getDefaultUnit(canonicalKey),
              source: fieldSource,
              correctedAt: new Date(),
              correctedBy: req.user._id,
              verified: true,
            };
          }
        }

        validatedConfirmed[canonicalKey] = {
          value: numVal,
          unit: unit || getDefaultUnit(canonicalKey),
          source: fieldSource,
          originalValue: originalVal,
          originalValueUnit: correction?.submittedUnit || (typeof fieldEntry === 'object' ? fieldEntry.unit : null),
          conversionApplied: Boolean(correction?.conversionApplied),
          verified: true,
          validationStatus: validation.status,
          warning: validation.status === 'WARNING' ? validation.message : null,
        };
        flatConfirmed[canonicalKey] = numVal;

        if (!validatedConfirmed.measurements) validatedConfirmed.measurements = {};
        validatedConfirmed.measurements[canonicalKey] = {
          ...(report.extractedData?.measurements?.[canonicalKey] || {}),
          value: numVal,
          unit: unit || getDefaultUnit(canonicalKey),
          source: fieldSource,
          originalValue: originalVal,
          verified: true,
          validationStatus: validation.status,
          warning: validation.status === 'WARNING' ? validation.message : null,
        };
      }
    }

    // Preserve complex sub-structures (e.g. ABPM measurements, hypertensionIndicators) if provided
    if (confirmedData.measurements) {
      validatedConfirmed.measurements = { ...validatedConfirmed.measurements, ...confirmedData.measurements };
    } else if (report.extractedData?.measurements) {
      validatedConfirmed.measurements = { ...report.extractedData.measurements, ...validatedConfirmed.measurements };
    }

    if (confirmedData.hypertensionIndicators) {
      validatedConfirmed.hypertensionIndicators = confirmedData.hypertensionIndicators;
    } else if (report.extractedData?.hypertensionIndicators) {
      validatedConfirmed.hypertensionIndicators = report.extractedData.hypertensionIndicators;
    }

    if (confirmedData.document) {
      validatedConfirmed.document = confirmedData.document;
    } else if (report.extractedData?.document) {
      validatedConfirmed.document = report.extractedData.document;
    }

    if (confirmedData.patientContext) {
      validatedConfirmed.patientContext = confirmedData.patientContext;
    } else if (report.extractedData?.patientContext) {
      validatedConfirmed.patientContext = report.extractedData.patientContext;
    }
  }

  // 1. Update and persist report document FIRST (Strict Requirement: Decoupled Confirmation)
  if (!report.uploader) {
    report.uploader = report.uploadedBy || req.user._id;
  }
  report.confirmedData = validatedConfirmed;
  report.structuredData = { ...(report.structuredData || {}), ...flatConfirmed };
  report.status = 'CONFIRMED';
  report.confirmedAt = new Date();
  report.markModified('confirmedData');
  report.markModified('corrections');
  report.markModified('structuredData');
  await report.save();

  // 2. Update Patient latest health snapshot
  // PARTIAL UPDATE RULE: Only update fields that were confirmed in this report.
  // Never replace existing known patient values with null!
  const patientUpdates = {};
  if (flatConfirmed.fastingSugar !== undefined) patientUpdates.fastingSugar = flatConfirmed.fastingSugar;
  if (flatConfirmed.systolicBP !== undefined) patientUpdates.systolicBP = flatConfirmed.systolicBP;
  if (flatConfirmed.diastolicBP !== undefined) patientUpdates.diastolicBP = flatConfirmed.diastolicBP;
  if (flatConfirmed.heartRate !== undefined) patientUpdates.heartRate = flatConfirmed.heartRate;
  if (flatConfirmed.totalCholesterol !== undefined) patientUpdates.totalCholesterol = flatConfirmed.totalCholesterol;
  if (flatConfirmed.hdl !== undefined) patientUpdates.hdl = flatConfirmed.hdl;
  if (flatConfirmed.serumCreatinine !== undefined) patientUpdates.serumCreatinine = flatConfirmed.serumCreatinine;
  if (flatConfirmed.bloodUrea !== undefined) patientUpdates.bloodUrea = flatConfirmed.bloodUrea;
  if (flatConfirmed.hemoglobin !== undefined) patientUpdates.hemoglobin = flatConfirmed.hemoglobin;
  if (flatConfirmed.bmi !== undefined) patientUpdates.bmi = flatConfirmed.bmi;

  let updatedPatient = null;
  if (Object.keys(patientUpdates).length > 0) {
    updatedPatient = await Patient.findByIdAndUpdate(report.patient, patientUpdates, { new: true });
  } else {
    updatedPatient = await Patient.findById(report.patient);
  }

  // 3. Decoupled Diabetes ML Risk Assessment
  // Mandatory: Failure or outage of ML service MUST NEVER roll back the confirmed report!
  let diabetesPrediction = null;
  try {
    const {
      featureVector,
      canCalculate,
      missingDomain,
      dataCompleteness,
      featureAvailability,
    } = buildDiabetesFeatures(report, updatedPatient);

    if (canCalculate) {
      const mlResult = await callDiabetesPredictionService(featureVector);
      if (mlResult.success && mlResult.canCalculate) {
        diabetesPrediction = await Prediction.create({
          patient: report.patient,
          report: report._id,
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
        // Record insufficient or service error prediction record linked to report
        diabetesPrediction = await Prediction.create({
          patient: report.patient,
          report: report._id,
          calculatedBy: req.user._id,
          disease: 'diabetes',
          scenario: 'A',
          modelVersion: mlResult.modelVersion || '1.0.0',
          status: mlResult.status || 'INSUFFICIENT_DATA',
          canCalculate: false,
          dataCompleteness: 'INSUFFICIENT',
          missingDomain: mlResult.missingDomain || missingDomain,
          inputFeatures: featureVector,
          featureAvailability: mlResult.featureAvailability || featureAvailability,
          clinicalDisclaimer: 'Model-estimated risk for clinical decision support. Not a diagnosis.',
          predictionDate: new Date(),
        });
      }
    } else {
      // Domain-grounded minimum input not met in this report
      diabetesPrediction = await Prediction.create({
        patient: report.patient,
        report: report._id,
        calculatedBy: req.user._id,
        disease: 'diabetes',
        scenario: 'A',
        modelVersion: '1.0.0',
        status: 'INSUFFICIENT_DATA',
        canCalculate: false,
        dataCompleteness: 'INSUFFICIENT',
        missingDomain: missingDomain,
        inputFeatures: featureVector,
        featureAvailability,
        clinicalDisclaimer: 'Model-estimated risk for clinical decision support. Not a diagnosis.',
        predictionDate: new Date(),
      });
    }
  } catch (mlErr) {
    console.error('[Report Confirmation] Diabetes ML assessment deferred/failed:', mlErr.message);
    // Report is ALREADY saved as CONFIRMED in MongoDB. We log and proceed safely.
  }

  // 4. Decoupled Heart Disease ML Risk Assessment
  // Mandatory: Failure or outage of ML service MUST NEVER roll back the confirmed report!
  let heartDiseasePrediction = null;
  try {
    const {
      featureVector,
      canCalculate,
      missingRequired,
      dataCompleteness,
      featureDetails,
    } = buildHeartDiseaseFeatures(report, updatedPatient);

    if (canCalculate) {
      const mlResult = await callHeartDiseasePredictionService(featureVector);
      if (mlResult.success && mlResult.canCalculate) {
        heartDiseasePrediction = await Prediction.create({
          patient: report.patient,
          report: report._id,
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
        const isUnavailable = mlResult.status === 'PREDICTION_SERVICE_UNAVAILABLE';
        heartDiseasePrediction = await Prediction.create({
          patient: report.patient,
          report: report._id,
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
      heartDiseasePrediction = await Prediction.create({
        patient: report.patient,
        report: report._id,
        calculatedBy: req.user._id,
        disease: 'heart_disease',
        scenario: 'framingham_chd_10yr',
        modelVersion: '1.0.0',
        status: 'INSUFFICIENT_DATA',
        canCalculate: false,
        dataCompleteness: 'INSUFFICIENT',
        missingDomain: missingRequired.join(', '),
        inputFeatures: featureVector,
        featureAvailability: featureDetails,
        clinicalDisclaimer: 'Model-estimated risk for clinical decision support. Not a diagnosis.',
        predictionDate: new Date(),
      });
    }
  } catch (hdErr) {
    console.error('[Report Confirmation] Heart Disease ML assessment deferred/failed:', hdErr.message);
  }

  // 5. Decoupled Hypertension ML Risk Assessment
  // Mandatory: Failure or outage of ML service MUST NEVER roll back the confirmed report!
  let hypertensionPrediction = null;
  try {
    const confirmedReports = await Report.find({ patient: report.patient, status: 'CONFIRMED' })
      .sort({ confirmedAt: -1, createdAt: -1 })
      .limit(100);
    const allConfirmedReports = confirmedReports.some((r) => String(r._id) === String(report._id))
      ? confirmedReports
      : [report, ...confirmedReports];

    const hypExtraction = buildHypertensionFeatures(allConfirmedReports, updatedPatient);
    if (hypExtraction.canCalculate) {
      const mlResult = await callNewDiseasePredictionService('hypertension', hypExtraction.featureVector);
      if (mlResult.success && mlResult.canCalculate) {
        hypertensionPrediction = await Prediction.create({
          patient: report.patient,
          report: report._id,
          calculatedBy: req.user._id,
          disease: 'hypertension',
          modelVersion: mlResult.modelVersion || '1.0.0-research',
          featureSchemaVersion: mlResult.featureSchemaVersion || 'hypertension.v1',
          probability: mlResult.probability,
          threshold: typeof mlResult.threshold === 'number' ? mlResult.threshold : 0.33,
          riskCategory: mlResult.riskCategory,
          status: 'SUCCESS',
          canCalculate: true,
          dataCompleteness: mlResult.dataCompleteness || hypExtraction.dataCompleteness,
          missingDomain: null,
          inputFeatures: hypExtraction.featureVector,
          featureAvailability: {
            availableFeatures: Object.keys(hypExtraction.featureVector).filter((k) => hypExtraction.featureVector[k] !== null),
            missingFeatures: Object.keys(hypExtraction.featureVector).filter((k) => hypExtraction.featureVector[k] === null),
            provenance: hypExtraction.provenance,
          },
          featureProvenance: hypExtraction.provenance,
          topContributingFactors: mlResult.topContributingFactors || [],
          explanationStatus: mlResult.explanationStatus || 'unavailable',
          taskInterpretation: mlResult.taskInterpretation || 'Classification of current diagnosed/treated hypertension; not future-onset prediction.',
          clinicalDisclaimer: mlResult.clinicalDisclaimer || 'Statistical model estimate only. Not a diagnosis and not clinically validated.',
          overallRiskPercent: Math.round(mlResult.probability * 100),
          riskLevel: ['ELEVATED_MODEL_ESTIMATED_RISK', 'POSITIVE_CLASSIFICATION_ESTIMATE'].includes(mlResult.riskCategory)
            ? 'Elevated model estimate'
            : 'Lower model estimate',
          confidenceScore: null,
          diseaseBreakdown: { Diabetes: null, Hypertension: null, HeartDisease: null, KidneyDisease: null },
          algorithmVersion: mlResult.modelVersion || 'hypertension_v1.0.0',
          predictionDate: new Date(),
        });
      } else {
        const isUnavailable = ['MODEL_UNAVAILABLE', 'SERVICE_UNAVAILABLE', 'PREDICTION_SERVICE_UNAVAILABLE'].includes(mlResult.status);
        hypertensionPrediction = await Prediction.create({
          patient: report.patient,
          report: report._id,
          calculatedBy: req.user._id,
          disease: 'hypertension',
          modelVersion: mlResult.modelVersion || null,
          featureSchemaVersion: mlResult.featureSchemaVersion || null,
          probability: null,
          threshold: null,
          riskCategory: isUnavailable ? 'FAILED' : 'INSUFFICIENT_DATA',
          status: isUnavailable ? 'SERVICE_UNAVAILABLE' : (mlResult.status || 'INSUFFICIENT_DATA'),
          canCalculate: false,
          dataCompleteness: 'INSUFFICIENT',
          missingDomain: mlResult.message || hypExtraction.missingRequired.join(', '),
          inputFeatures: hypExtraction.featureVector,
          featureAvailability: {
            availableFeatures: Object.keys(hypExtraction.featureVector).filter((k) => hypExtraction.featureVector[k] !== null),
            missingFeatures: Object.keys(hypExtraction.featureVector).filter((k) => hypExtraction.featureVector[k] === null),
            provenance: hypExtraction.provenance,
          },
          featureProvenance: hypExtraction.provenance,
          topContributingFactors: [],
          explanationStatus: 'unavailable',
          taskInterpretation: 'Classification of current diagnosed/treated hypertension; not future-onset prediction.',
          clinicalDisclaimer: 'Statistical model estimate only. Not a diagnosis and not clinically validated.',
          overallRiskPercent: null,
          riskLevel: 'Unknown',
          confidenceScore: null,
          diseaseBreakdown: { Diabetes: null, Hypertension: null, HeartDisease: null, KidneyDisease: null },
          algorithmVersion: 'hypertension_unavailable',
          predictionDate: new Date(),
        });
      }
    } else {
      hypertensionPrediction = await Prediction.create({
        patient: report.patient,
        report: report._id,
        calculatedBy: req.user._id,
        disease: 'hypertension',
        modelVersion: null,
        featureSchemaVersion: null,
        probability: null,
        threshold: null,
        riskCategory: 'INSUFFICIENT_DATA',
        status: 'INSUFFICIENT_DATA',
        canCalculate: false,
        dataCompleteness: 'INSUFFICIENT',
        missingDomain: hypExtraction.missingRequired.join(', '),
        inputFeatures: hypExtraction.featureVector,
        featureAvailability: {
          availableFeatures: Object.keys(hypExtraction.featureVector).filter((k) => hypExtraction.featureVector[k] !== null),
          missingFeatures: Object.keys(hypExtraction.featureVector).filter((k) => hypExtraction.featureVector[k] === null),
          provenance: hypExtraction.provenance,
        },
        featureProvenance: hypExtraction.provenance,
        topContributingFactors: [],
        explanationStatus: 'unavailable',
        taskInterpretation: 'Classification of current diagnosed/treated hypertension; not future-onset prediction.',
        clinicalDisclaimer: 'Statistical model estimate only. Not a diagnosis and not clinically validated.',
        overallRiskPercent: null,
        riskLevel: 'Unknown',
        confidenceScore: null,
        diseaseBreakdown: { Diabetes: null, Hypertension: null, HeartDisease: null, KidneyDisease: null },
        algorithmVersion: 'hypertension_unavailable',
        predictionDate: new Date(),
      });
    }
  } catch (hypErr) {
    console.error('[Report Confirmation] Hypertension ML assessment deferred/failed:', hypErr.message);
  }

  // 6. Decoupled Chronic Kidney Disease ML Risk Assessment
  // Mandatory: Failure or outage of ML service MUST NEVER roll back the confirmed report!
  let ckdPrediction = null;
  try {
    const confirmedReports = await Report.find({ patient: report.patient, status: 'CONFIRMED' })
      .sort({ confirmedAt: -1, createdAt: -1 })
      .limit(100);
    const allConfirmedReports = confirmedReports.some((r) => String(r._id) === String(report._id))
      ? confirmedReports
      : [report, ...confirmedReports];

    const ckdExtraction = buildCkdFeatures(allConfirmedReports, updatedPatient, ['age', 'serum_creatinine']);
    if (ckdExtraction.canCalculate) {
      const mlResult = await callNewDiseasePredictionService('chronic_kidney_disease', ckdExtraction.featureVector);
      if (mlResult.success && mlResult.canCalculate) {
        ckdPrediction = await Prediction.create({
          patient: report.patient,
          report: report._id,
          calculatedBy: req.user._id,
          disease: 'chronic_kidney_disease',
          modelVersion: mlResult.modelVersion || '1.0.0-research',
          featureSchemaVersion: mlResult.featureSchemaVersion || 'ckd.a_minimal.v1',
          probability: mlResult.probability,
          threshold: typeof mlResult.threshold === 'number' ? mlResult.threshold : 0.967,
          riskCategory: mlResult.riskCategory,
          status: 'SUCCESS',
          canCalculate: true,
          dataCompleteness: mlResult.dataCompleteness || ckdExtraction.dataCompleteness,
          missingDomain: null,
          inputFeatures: ckdExtraction.featureVector,
          featureAvailability: {
            availableFeatures: Object.keys(ckdExtraction.featureVector).filter((k) => ckdExtraction.featureVector[k] !== null),
            missingFeatures: Object.keys(ckdExtraction.featureVector).filter((k) => ckdExtraction.featureVector[k] === null),
            provenance: ckdExtraction.provenance,
          },
          featureProvenance: ckdExtraction.provenance,
          topContributingFactors: mlResult.topContributingFactors || [],
          explanationStatus: mlResult.explanationStatus || 'unavailable',
          taskInterpretation: mlResult.taskInterpretation || 'Classification of the UCI CKD dataset label; not future-onset prediction.',
          clinicalDisclaimer: mlResult.clinicalDisclaimer || 'Statistical model estimate only. Not a diagnosis and not clinically validated.',
          overallRiskPercent: Math.round(mlResult.probability * 100),
          riskLevel: ['ELEVATED_MODEL_ESTIMATED_RISK', 'POSITIVE_CLASSIFICATION_ESTIMATE'].includes(mlResult.riskCategory)
            ? 'Elevated model estimate'
            : 'Lower model estimate',
          confidenceScore: null,
          diseaseBreakdown: { Diabetes: null, Hypertension: null, HeartDisease: null, KidneyDisease: null },
          algorithmVersion: mlResult.modelVersion || 'ckd_v1.0.0',
          predictionDate: new Date(),
        });
      } else {
        const isUnavailable = ['MODEL_UNAVAILABLE', 'SERVICE_UNAVAILABLE', 'PREDICTION_SERVICE_UNAVAILABLE'].includes(mlResult.status);
        ckdPrediction = await Prediction.create({
          patient: report.patient,
          report: report._id,
          calculatedBy: req.user._id,
          disease: 'chronic_kidney_disease',
          modelVersion: mlResult.modelVersion || null,
          featureSchemaVersion: mlResult.featureSchemaVersion || null,
          probability: null,
          threshold: null,
          riskCategory: isUnavailable ? 'FAILED' : 'INSUFFICIENT_DATA',
          status: isUnavailable ? 'SERVICE_UNAVAILABLE' : (mlResult.status || 'INSUFFICIENT_DATA'),
          canCalculate: false,
          dataCompleteness: 'INSUFFICIENT',
          missingDomain: mlResult.message || ckdExtraction.missingRequired.join(', '),
          inputFeatures: ckdExtraction.featureVector,
          featureAvailability: {
            availableFeatures: Object.keys(ckdExtraction.featureVector).filter((k) => ckdExtraction.featureVector[k] !== null),
            missingFeatures: Object.keys(ckdExtraction.featureVector).filter((k) => ckdExtraction.featureVector[k] === null),
            provenance: ckdExtraction.provenance,
          },
          featureProvenance: ckdExtraction.provenance,
          topContributingFactors: [],
          explanationStatus: 'unavailable',
          taskInterpretation: 'Classification of the UCI CKD dataset label; not future-onset prediction.',
          clinicalDisclaimer: 'Statistical model estimate only. Not a diagnosis and not clinically validated.',
          overallRiskPercent: null,
          riskLevel: 'Unknown',
          confidenceScore: null,
          diseaseBreakdown: { Diabetes: null, Hypertension: null, HeartDisease: null, KidneyDisease: null },
          algorithmVersion: 'ckd_unavailable',
          predictionDate: new Date(),
        });
      }
    } else {
      ckdPrediction = await Prediction.create({
        patient: report.patient,
        report: report._id,
        calculatedBy: req.user._id,
        disease: 'chronic_kidney_disease',
        modelVersion: null,
        featureSchemaVersion: null,
        probability: null,
        threshold: null,
        riskCategory: 'INSUFFICIENT_DATA',
        status: 'INSUFFICIENT_DATA',
        canCalculate: false,
        dataCompleteness: 'INSUFFICIENT',
        missingDomain: ckdExtraction.missingRequired.join(', '),
        inputFeatures: ckdExtraction.featureVector,
        featureAvailability: {
          availableFeatures: Object.keys(ckdExtraction.featureVector).filter((k) => ckdExtraction.featureVector[k] !== null),
          missingFeatures: Object.keys(ckdExtraction.featureVector).filter((k) => ckdExtraction.featureVector[k] === null),
          provenance: ckdExtraction.provenance,
        },
        featureProvenance: ckdExtraction.provenance,
        topContributingFactors: [],
        explanationStatus: 'unavailable',
        taskInterpretation: 'Classification of the UCI CKD dataset label; not future-onset prediction.',
        clinicalDisclaimer: 'Statistical model estimate only. Not a diagnosis and not clinically validated.',
        overallRiskPercent: null,
        riskLevel: 'Unknown',
        confidenceScore: null,
        diseaseBreakdown: { Diabetes: null, Hypertension: null, HeartDisease: null, KidneyDisease: null },
        algorithmVersion: 'ckd_unavailable',
        predictionDate: new Date(),
      });
    }
  } catch (ckdErr) {
    console.error('[Report Confirmation] CKD ML assessment deferred/failed:', ckdErr.message);
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        report,
        patient: updatedPatient,
        warnings,
        diabetesPrediction,
        heartDiseasePrediction,
        hypertensionPrediction,
        ckdPrediction,
      },
      'Medical report confirmed and saved to patient health profile.'
    )
  );
});

export const getReports = asyncHandler(async (req, res) => {
  let { patientId } = req.query;

  // Phase P0: Eliminate global report disclosure. Enforce strict patient scoping.
  if (req.user.role === 'Patient') {
    const p = await Patient.findOne({ user: req.user._id });
    if (!p) {
      return res.status(200).json(new ApiResponse(200, [], 'No patient profile found.'));
    }
    if (patientId && String(patientId) !== String(p._id)) {
      throw new ApiError(403, 'Unauthorized. You may only view reports for your own profile.');
    }
    patientId = p._id;
  } else if (req.user.role === 'Doctor') {
    if (!patientId) {
      throw new ApiError(400, 'patientId parameter is required');
    }
    const p = await Patient.findById(patientId);
    if (!p) throw new ApiError(404, 'Patient record not found.');
    const isAuthorized = await isDoctorAuthorizedForPatient(p, req.user._id);
    if (!isAuthorized) {
      throw new ApiError(403, 'Unauthorized. You are not assigned to this patient.');
    }
  } else if (req.user.role === 'CHO') {
    if (!patientId) {
      throw new ApiError(400, 'patientId parameter is required');
    }
    const p = await Patient.findById(patientId);
    if (!p) throw new ApiError(404, 'Patient record not found.');
    const allowedVillages = [...(req.user.communityVillages || []), req.user.village].map((village) => String(village || '').trim().toLowerCase()).filter(Boolean);
    if (!allowedVillages.includes(String(p.village || '').trim().toLowerCase())) {
      throw new ApiError(403, 'Unauthorized. This patient is outside your assigned community.');
    }
  } else if (req.user.role === 'Admin') {
    throw new ApiError(403, 'Administrative access to clinical reports is prohibited.');
  } else {
    throw new ApiError(403, 'Unauthorized to access clinical reports.');
  }

  if (!patientId) {
    throw new ApiError(400, 'patientId parameter is required');
  }

  // Never execute Report.find({}) with an empty filter
  const filter = { patient: patientId };

  const reports = await Report.find(filter)
    .populate('patient')
    .populate('uploader', 'name email role')
    .sort({ uploadDate: -1 });

  return res.status(200).json(new ApiResponse(200, reports, 'Medical reports fetched successfully.'));
});

export const getReportById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const report = await Report.findById(id)
    .populate('patient')
    .populate('uploader', 'name email role');

  if (!report) {
    throw new ApiError(404, 'Medical report not found.');
  }

  const patientRecord = await Patient.findById(report.patient?._id || report.patient);
  if (!patientRecord) {
    throw new ApiError(404, 'Associated patient record not found.');
  }

  // Phase P0: Strict server-side authorization before returning report
  if (req.user.role === 'Patient') {
    if (String(patientRecord.user) !== String(req.user._id)) {
      throw new ApiError(403, 'Unauthorized to view this medical report.');
    }
  } else if (req.user.role === 'Doctor') {
    const isAuthorized = await isDoctorAuthorizedForPatient(patientRecord, req.user._id);
    if (!isAuthorized) {
      throw new ApiError(403, 'Unauthorized. You are not assigned to this patient.');
    }
  } else if (req.user.role === 'CHO') {
    const allowedVillages = [...(req.user.communityVillages || []), req.user.village].map((village) => String(village || '').trim().toLowerCase()).filter(Boolean);
    if (!allowedVillages.includes(String(patientRecord.village || '').trim().toLowerCase())) {
      throw new ApiError(403, 'Unauthorized. This patient is outside your assigned community.');
    }
  } else if (req.user.role === 'Admin') {
    throw new ApiError(403, 'Administrative access to clinical reports is prohibited.');
  } else {
    throw new ApiError(403, 'Unauthorized to view this medical report.');
  }

  return res.status(200).json(new ApiResponse(200, report, 'Report retrieved successfully.'));
});

export const deleteReport = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const report = await Report.findById(id);
  if (!report) {
    throw new ApiError(404, 'Report not found.');
  }

  const patientRecord = await Patient.findById(report.patient);
  if (!patientRecord) {
    throw new ApiError(404, 'Associated patient record not found.');
  }

  // Phase P0: Report deletion authorization
  if (req.user.role === 'Patient') {
    if (String(patientRecord.user) !== String(req.user._id)) {
      throw new ApiError(403, 'Unauthorized to delete this medical report.');
    }
  } else if (req.user.role === 'Doctor') {
    const isAuthorized = await isDoctorAuthorizedForPatient(patientRecord, req.user._id);
    if (
      !isAuthorized ||
      String(report.uploader) !== String(req.user._id) ||
      report.status === 'CONFIRMED'
    ) {
      throw new ApiError(403, 'Unauthorized. Doctors may only delete unconfirmed draft reports that they uploaded.');
    }
  } else {
    // Nurse, CHO, Family, Admin: 403
    throw new ApiError(403, 'Your role is not authorized to delete medical reports.');
  }

  // Clean up file from Cloudinary if stored there
  if (report.storageProvider === 'cloudinary' && report.publicId) {
    try {
      const { isCloudinaryConfigured } = await import('../config/cloudinary.js');
      if (isCloudinaryConfigured()) {
        const { default: cloudinary } = await import('../config/cloudinary.js');
        await cloudinary.uploader.destroy(report.publicId, { resource_type: 'raw' });
      }
    } catch (cloudErr) {
      console.warn('[Delete Report] Cloudinary cleanup failed (non-blocking):', cloudErr.message);
    }
  }

  // Also delete associated Prediction records for this report
  await Prediction.deleteMany({ report: id });

  await Report.findByIdAndDelete(id);
  return res.status(200).json(new ApiResponse(200, {}, 'Medical report deleted successfully.'));
});

const getDefaultUnit = (field) => {
  switch (field) {
    case 'fastingSugar':
    case 'fastingGlucose': return 'mg/dL';
    case 'systolicBP': return 'mmHg';
    case 'diastolicBP': return 'mmHg';
    case 'heartRate': return 'BPM';
    case 'totalCholesterol':
    case 'cholesterol': return 'mg/dL';
    case 'hdl':
    case 'hdlCholesterol': return 'mg/dL';
    case 'serumCreatinine':
    case 'creatinine': return 'mg/dL';
    case 'bloodUrea': return 'mg/dL';
    case 'hemoglobin': return 'g/dL';
    case 'bmi': return 'kg/m²';
    default: return '';
  }
};
