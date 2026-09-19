/**
 * MedScan-NCD: Heart Disease Feature Builder
 * ===========================================
 * Maps confirmed structured report data + patient demographic context
 * into the exact 8-element predictor feature vector for Python ML inference.
 *
 * Feature Vector Order:
 *   1. age (years, 18-100)
 *   2. sex (0=Female, 1=Male)
 *   3. totChol (mg/dL)
 *   4. sysBP (mmHg)
 *   5. diaBP (mmHg)
 *   6. BMI (kg/m^2)
 *   7. glucose (mg/dL)
 *   8. currentSmoker (0=Non-smoker, 1=Smoker)
 *
 * Strict Architectural Rules:
 *   - Human-in-the-loop: Operates EXCLUSIVELY on CONFIRMED medical data.
 *   - Unconfirmed OCR extraction, pending edits, or rawOcrText NEVER enter ML input.
 *   - Minimum Input Policy:
 *       Required: age, sex, totChol, sysBP, diaBP
 *       Optional: BMI, glucose, currentSmoker
 *   - Zero value fabrication: missing optional features remain null.
 *   - Preprocessor Imputation Rule: missing optional features (including currentSmoker)
 *     are passed as null, delegating imputation strictly to the serialized training preprocessor.
 *   - Auditability: every single feature maintains complete provenance metadata.
 */

function extractNumeric(entry) {
  if (entry === undefined || entry === null || entry === '') return null;
  if (typeof entry === 'object' && entry !== null) {
    if (entry.value !== undefined && entry.value !== null && entry.value !== '') {
      const n = Number(entry.value);
      return isNaN(n) ? null : n;
    }
    return null;
  }
  const n = Number(entry);
  return isNaN(n) ? null : n;
}

function extractUnit(entry) {
  if (entry && typeof entry === 'object' && entry.unit) {
    return String(entry.unit).trim().toLowerCase();
  }
  return null;
}

function normalizeSex(sexVal) {
  if (sexVal === undefined || sexVal === null) return null;
  const s = String(sexVal).trim().toLowerCase();
  if (s === 'male' || s === 'm' || s === '1') return 1;
  if (s === 'female' || s === 'f' || s === '0') return 0;
  return null;
}

function normalizeSmoker(val) {
  if (val === undefined || val === null || val === '') return null;
  if (typeof val === 'object' && val !== null) {
    val = val.value !== undefined ? val.value : val;
  }
  if (val === undefined || val === null || val === '') return null;
  if (typeof val === 'boolean') return val ? 1 : 0;
  const s = String(val).trim().toLowerCase();
  if (['1', 'true', 'yes', 'smoker', 'current', 'current_smoker'].includes(s)) return 1;
  if (['0', 'false', 'no', 'non-smoker', 'never', 'former'].includes(s)) return 0;
  return null;
}

/**
 * Builds the Heart Disease feature vector from confirmed report and patient profile.
 *
 * @param {Object} report - MongoDB Report document (must be CONFIRMED)
 * @param {Object} patient - MongoDB Patient document
 * @returns {Object} Feature extraction payload, provenance, and validation status
 */
export function buildHeartDiseaseFeatures(report, patient = null) {
  // STRICT RULE: Unconfirmed report data NEVER enters ML feature builder!
  const isReportConfirmed = !report || !report.status || report.status === 'CONFIRMED';
  const confirmed = isReportConfirmed ? (report?.confirmedData || {}) : {};
  const measurements = confirmed.measurements || {};
  const patientContext = confirmed.patientContext || {};
  const flatStructured = isReportConfirmed ? (report?.structuredData || {}) : {};

  const provenance = {
    age: { value: null, source: 'missing', verified: false },
    sex: { value: null, source: 'missing', verified: false },
    totChol: { value: null, source: 'missing', verified: false },
    sysBP: { value: null, source: 'missing', verified: false },
    diaBP: { value: null, source: 'missing', verified: false },
    BMI: { value: null, source: 'missing', verified: false },
    glucose: { value: null, source: 'missing', verified: false },
    currentSmoker: { value: null, source: 'missing', verified: false },
  };

  // 1. Mandatory Demographic: Age
  let age = null;
  const repAge = extractNumeric(patientContext.age) ?? extractNumeric(confirmed.age);
  if (repAge !== null && repAge >= 18 && repAge <= 100) {
    age = repAge;
    const src = patientContext.age?.source || confirmed.age?.source || 'report';
    provenance.age = { value: age, source: src, verified: true };
  } else {
    const profAge = extractNumeric(patient?.age);
    if (profAge !== null && profAge >= 18 && profAge <= 100) {
      age = profAge;
      provenance.age = { value: age, source: 'profile', verified: true };
    }
  }

  // 2. Mandatory Demographic: Sex
  let sex = null;
  const repSexRaw = patientContext.sex || patientContext.gender;
  const repSex = normalizeSex(repSexRaw);
  if (repSex !== null) {
    sex = repSex;
    const src = patientContext.sex?.source || patientContext.gender?.source || confirmed.gender?.source || 'report';
    provenance.sex = { value: sex, source: src, verified: true };
  } else {
    const profSex = normalizeSex(patient?.gender);
    if (profSex !== null) {
      sex = profSex;
      provenance.sex = { value: sex, source: 'profile', verified: true };
    }
  }

  // 3. Mandatory Laboratory: Total Cholesterol (totChol)
  let totChol = null;
  const repTc = extractNumeric(measurements.totalCholesterol) ??
                extractNumeric(measurements.cholesterol) ??
                extractNumeric(confirmed.totalCholesterol) ??
                extractNumeric(confirmed.cholesterol) ??
                extractNumeric(flatStructured.totalCholesterol);
  const tcUnit = extractUnit(measurements.totalCholesterol) || extractUnit(confirmed.totalCholesterol);
  let convertedTc = repTc;
  if (convertedTc !== null && tcUnit && tcUnit === 'mmol/l') {
    convertedTc = Math.round(convertedTc * 38.67 * 10) / 10;
  }
  if (convertedTc !== null && convertedTc >= 50.0 && convertedTc <= 600.0) {
    totChol = convertedTc;
    const src = measurements.totalCholesterol?.source || confirmed.totalCholesterol?.source || 'report';
    provenance.totChol = { value: totChol, source: src, verified: true };
  } else {
    const profTc = extractNumeric(patient?.totalCholesterol);
    if (profTc !== null && profTc >= 50.0 && profTc <= 600.0) {
      totChol = profTc;
      provenance.totChol = { value: totChol, source: 'profile', verified: true };
    }
  }

  // 4. Mandatory Physical: Systolic BP (sysBP)
  let sysBP = null;
  const repSys = extractNumeric(measurements.systolicBP) ??
                 extractNumeric(measurements.overall?.meanSystolic) ??
                 extractNumeric(confirmed.systolicBP) ??
                 extractNumeric(flatStructured.systolicBP);
  if (repSys !== null && repSys >= 60.0 && repSys <= 260.0) {
    sysBP = repSys;
    const src = measurements.systolicBP?.source || confirmed.systolicBP?.source || 'report';
    provenance.sysBP = { value: sysBP, source: src, verified: true };
  } else {
    const profSys = extractNumeric(patient?.systolicBP);
    if (profSys !== null && profSys >= 60.0 && profSys <= 260.0) {
      sysBP = profSys;
      provenance.sysBP = { value: sysBP, source: 'profile', verified: true };
    }
  }

  // 5. Mandatory Physical: Diastolic BP (diaBP)
  let diaBP = null;
  const repDia = extractNumeric(measurements.diastolicBP) ??
                 extractNumeric(measurements.overall?.meanDiastolic) ??
                 extractNumeric(confirmed.diastolicBP) ??
                 extractNumeric(flatStructured.diastolicBP);
  if (repDia !== null && repDia >= 30.0 && repDia <= 150.0) {
    diaBP = repDia;
    const src = measurements.diastolicBP?.source || confirmed.diastolicBP?.source || 'report';
    provenance.diaBP = { value: diaBP, source: src, verified: true };
  } else {
    const profDia = extractNumeric(patient?.diastolicBP);
    if (profDia !== null && profDia >= 30.0 && profDia <= 150.0) {
      diaBP = profDia;
      provenance.diaBP = { value: diaBP, source: 'profile', verified: true };
    }
  }

  // 6. Optional Physical: BMI
  let BMI = null;
  const repBmi = extractNumeric(measurements.bmi) ??
                 extractNumeric(confirmed.bmi) ??
                 extractNumeric(flatStructured.bmi);
  if (repBmi !== null && repBmi >= 10.0 && repBmi <= 90.0) {
    BMI = repBmi;
    const src = measurements.bmi?.source || confirmed.bmi?.source || 'report';
    provenance.BMI = { value: BMI, source: src, verified: true };
  } else {
    const profBmi = extractNumeric(patient?.bmi);
    if (profBmi !== null && profBmi >= 10.0 && profBmi <= 90.0) {
      BMI = profBmi;
      provenance.BMI = { value: BMI, source: 'profile', verified: true };
    }
  }

  // 7. Optional Laboratory: Glucose
  let glucose = null;
  const repGluc = extractNumeric(measurements.fastingGlucose) ??
                  extractNumeric(measurements.fastingSugar) ??
                  extractNumeric(measurements.glucose) ??
                  extractNumeric(confirmed.fastingGlucose) ??
                  extractNumeric(confirmed.fastingSugar) ??
                  extractNumeric(flatStructured.fastingSugar);
  const glucUnit = extractUnit(measurements.fastingGlucose) || extractUnit(confirmed.fastingGlucose);
  let convertedGluc = repGluc;
  if (convertedGluc !== null && glucUnit && glucUnit === 'mmol/l') {
    convertedGluc = Math.round(convertedGluc * 18.0182 * 10) / 10;
  }
  if (convertedGluc !== null && convertedGluc >= 40.0 && convertedGluc <= 500.0) {
    glucose = convertedGluc;
    const src = measurements.fastingGlucose?.source || measurements.fastingSugar?.source || confirmed.fastingSugar?.source || 'report';
    provenance.glucose = { value: glucose, source: src, verified: true };
  } else {
    const profGluc = extractNumeric(patient?.fastingSugar);
    if (profGluc !== null && profGluc >= 40.0 && profGluc <= 500.0) {
      glucose = profGluc;
      provenance.glucose = { value: glucose, source: 'profile', verified: true };
    }
  }

  // 8. Optional Behavioral: currentSmoker
  // Architectural Correction #2: Never default unstated smoking to 0; pass null if missing.
  let currentSmoker = null;
  const rawSmokerEntry =
    patientContext.currentSmoker ??
    patientContext.isCurrentSmoker ??
    patientContext.smoking ??
    confirmed.currentSmoker ??
    confirmed.isCurrentSmoker ??
    confirmed.smoking;
  const repSmoker = normalizeSmoker(rawSmokerEntry);
  if (repSmoker !== null) {
    currentSmoker = repSmoker;
    const src = rawSmokerEntry?.source || 'report';
    provenance.currentSmoker = { value: currentSmoker, source: src, verified: true };
  } else if (patient && (patient.isCurrentSmoker !== undefined && patient.isCurrentSmoker !== null)) {
    currentSmoker = normalizeSmoker(patient.isCurrentSmoker);
    if (currentSmoker !== null) {
      provenance.currentSmoker = { value: currentSmoker, source: 'profile', verified: true };
    }
  } else if (patient && Array.isArray(patient.medicalHistory)) {
    const histLower = patient.medicalHistory.map((h) => String(h).toLowerCase());
    if (histLower.some((h) => h.includes('smoker') || h.includes('smoking') || h.includes('tobacco'))) {
      currentSmoker = 1;
      provenance.currentSmoker = { value: 1, source: 'profile', verified: true };
    }
  }

  // Minimum Input Policy Evaluation
  const requiredKeys = ['age', 'sex', 'totChol', 'sysBP', 'diaBP'];
  const missingRequired = requiredKeys.filter((k) => provenance[k].value === null);
  const canCalculate = missingRequired.length === 0;

  // Exact 8-Element Feature Vector matching locked model contract
  const featureVector = {
    age,
    sex,
    totChol,
    sysBP,
    diaBP,
    BMI,
    glucose,
    currentSmoker,
  };

  const featureKeys = ['age', 'sex', 'totChol', 'sysBP', 'diaBP', 'BMI', 'glucose', 'currentSmoker'];
  const availableFeatures = featureKeys.filter((k) => featureVector[k] !== null);
  const missingFeatures = featureKeys.filter((k) => featureVector[k] === null);

  const dataCompleteness = !canCalculate
    ? 'INSUFFICIENT'
    : (missingFeatures.length === 0 ? 'FULL' : 'PARTIAL');

  // Human-readable feature source descriptors for presentation
  const featureDetails = {};
  featureKeys.forEach((k) => {
    const p = provenance[k];
    let sourceLabel = 'Missing';
    if (p.source === 'report') sourceLabel = 'Found in confirmed report';
    else if (p.source === 'manual_correction') sourceLabel = 'Manually corrected & confirmed';
    else if (p.source === 'manual') sourceLabel = 'Manually entered';
    else if (p.source === 'profile') sourceLabel = 'Available from patient profile';
    featureDetails[k] = {
      value: p.value,
      source: p.source,
      sourceLabel,
      verified: p.verified,
    };
  });

  return {
    featureVector,
    canCalculate,
    status: canCalculate ? 'SUCCESS' : 'INSUFFICIENT_DATA',
    dataCompleteness,
    missingRequired,
    missingFeatures,
    availableFeatures,
    provenance,
    featureDetails,
    message: canCalculate
      ? (dataCompleteness === 'FULL'
          ? 'Complete feature profile available.'
          : 'Required clinical vitals present; optional features will be imputed by model preprocessor.')
      : `Missing required clinical parameters: ${missingRequired.join(', ')}.`,
  };
}
