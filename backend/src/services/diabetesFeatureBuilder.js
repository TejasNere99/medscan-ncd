/**
 * MedScan-NCD: Diabetes Scenario A Feature Builder
 * =================================================
 * Maps confirmed structured report data + patient demographic context
 * into the exact 8-element predictor feature vector for Python ML inference.
 *
 * Predictors:
 *   1. age (years, integer >= 18)
 *   2. sex (0=Female, 1=Male)
 *   3. bmi (kg/m^2)
 *   4. systolic_bp (mmHg)
 *   5. diastolic_bp (mmHg)
 *   6. total_cholesterol (mg/dL)
 *   7. hdl (mg/dL)
 *   8. creatinine (mg/dL)
 *
 * Strict Rules:
 *   - Human-in-the-loop: Operates exclusively on confirmed medical data.
 *   - Minimum Input Domain Policy:
 *       Demographic: age + sex mandatory
 *       Physical: BMI OR (Systolic BP + Diastolic BP) mandatory
 *       Laboratory: (Total Cholesterol + HDL) OR Creatinine mandatory
 *   - Zero fabrication: missing features remain null/NaN.
 *   - Data completeness explicitly flagged: 'FULL' vs 'PARTIAL'.
 */

/**
 * Safely extracts a numeric value from varied structured shapes:
 * - { value: 120, unit: 'mmHg' }
 * - 120
 * - "120"
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

/**
 * Normalizes biological sex to binary integer:
 * 0 = Female, 1 = Male, null = Unspecified/Other
 */
function normalizeSex(sexVal) {
  if (sexVal === undefined || sexVal === null) return null;
  const s = String(sexVal).trim().toLowerCase();
  if (s === 'male' || s === 'm' || s === '1') return 1;
  if (s === 'female' || s === 'f' || s === '0') return 0;
  return null;
}

/**
 * Builds the Scenario A diabetes feature vector from confirmed report and patient profile.
 *
 * @param {Object} report - MongoDB Report document (must be CONFIRMED)
 * @param {Object} patient - MongoDB Patient document
 * @returns {Object} Feature extraction payload and domain validation status
 */
export function buildDiabetesFeatures(report, patient = null) {
  // STRICT PREDICTION RULE 7: UNCONFIRMED report data NEVER enters ML feature builder!
  // Only CONFIRMED reports (or synthetic direct payloads without a status) are eligible.
  const isReportConfirmed = !report || !report.status || report.status === 'CONFIRMED';
  const confirmed = isReportConfirmed ? (report?.confirmedData || {}) : {};
  const measurements = confirmed.measurements || {};
  const patientContext = confirmed.patientContext || {};
  const flatStructured = isReportConfirmed ? (report?.structuredData || {}) : {};

  const provenance = {
    age: null,
    sex: null,
    bmi: null,
    systolic_bp: null,
    diastolic_bp: null,
    total_cholesterol: null,
    hdl: null,
    creatinine: null,
  };

  // 1. Demographic Domain
  let age = null;
  const repAge = extractNumeric(patientContext.age) ?? extractNumeric(confirmed.age);
  if (repAge !== null && repAge >= 18 && repAge <= 125) {
    age = repAge;
    provenance.age = patientContext.age?.source || confirmed.age?.source || 'report';
  } else {
    const profAge = extractNumeric(patient?.age);
    if (profAge !== null && profAge >= 18 && profAge <= 125) {
      age = profAge;
      provenance.age = 'profile';
    }
  }

  let sex = null;
  const repSexRaw = patientContext.sex || patientContext.gender;
  const repSex = normalizeSex(repSexRaw);
  if (repSex !== null) {
    sex = repSex;
    provenance.sex = patientContext.sex?.source || patientContext.gender?.source || confirmed.gender?.source || confirmed.sex?.source || 'report';
  } else {
    const profSex = normalizeSex(patient?.gender);
    if (profSex !== null) {
      sex = profSex;
      provenance.sex = 'profile';
    }
  }

  // 2. Physical Domain
  let bmi = null;
  const repBmi = extractNumeric(measurements.bmi) ??
                 extractNumeric(confirmed.bmi) ??
                 extractNumeric(flatStructured.bmi);
  if (repBmi !== null && repBmi >= 10.0 && repBmi <= 90.0) {
    bmi = repBmi;
    provenance.bmi = measurements.bmi?.source || confirmed.bmi?.source || 'report';
  } else {
    const profBmi = extractNumeric(patient?.bmi);
    if (profBmi !== null && profBmi >= 10.0 && profBmi <= 90.0) {
      bmi = profBmi;
      provenance.bmi = 'profile';
    }
  }

  let systolic_bp = null;
  const repSys = extractNumeric(measurements.systolicBP) ??
                 extractNumeric(measurements.overall?.meanSystolic) ??
                 extractNumeric(confirmed.systolicBP) ??
                 extractNumeric(flatStructured.systolicBP);
  if (repSys !== null && repSys >= 60.0 && repSys <= 260.0) {
    systolic_bp = repSys;
    provenance.systolic_bp = measurements.systolicBP?.source || confirmed.systolicBP?.source || 'report';
  } else {
    const profSys = extractNumeric(patient?.systolicBP);
    if (profSys !== null && profSys >= 60.0 && profSys <= 260.0) {
      systolic_bp = profSys;
      provenance.systolic_bp = 'profile';
    }
  }

  let diastolic_bp = null;
  const repDia = extractNumeric(measurements.diastolicBP) ??
                 extractNumeric(measurements.overall?.meanDiastolic) ??
                 extractNumeric(confirmed.diastolicBP) ??
                 extractNumeric(flatStructured.diastolicBP);
  if (repDia !== null && repDia >= 30.0 && repDia <= 150.0) {
    diastolic_bp = repDia;
    provenance.diastolic_bp = measurements.diastolicBP?.source || confirmed.diastolicBP?.source || 'report';
  } else {
    const profDia = extractNumeric(patient?.diastolicBP);
    if (profDia !== null && profDia >= 30.0 && profDia <= 150.0) {
      diastolic_bp = profDia;
      provenance.diastolic_bp = 'profile';
    }
  }

  // 3. Laboratory Domain
  let total_cholesterol = null;
  const repTc = extractNumeric(measurements.totalCholesterol) ??
                extractNumeric(confirmed.totalCholesterol) ??
                extractNumeric(flatStructured.totalCholesterol);
  const tcUnit = extractUnit(measurements.totalCholesterol) || extractUnit(confirmed.totalCholesterol);
  let convertedTc = repTc;
  if (convertedTc !== null && tcUnit && (tcUnit === 'mmol/l' || tcUnit === 'mmol/l')) {
    convertedTc = Math.round(convertedTc * 38.67 * 10) / 10;
  }
  if (convertedTc !== null && convertedTc >= 50.0 && convertedTc <= 600.0) {
    total_cholesterol = convertedTc;
    provenance.total_cholesterol = measurements.totalCholesterol?.source || confirmed.totalCholesterol?.source || 'report';
  } else {
    const profTc = extractNumeric(patient?.totalCholesterol);
    if (profTc !== null && profTc >= 50.0 && profTc <= 600.0) {
      total_cholesterol = profTc;
      provenance.total_cholesterol = 'profile';
    }
  }

  let hdl = null;
  const repHdl = extractNumeric(measurements.hdl) ??
                 extractNumeric(confirmed.hdl) ??
                 extractNumeric(flatStructured.hdl);
  const hdlUnit = extractUnit(measurements.hdl) || extractUnit(confirmed.hdl);
  let convertedHdl = repHdl;
  if (convertedHdl !== null && hdlUnit && (hdlUnit === 'mmol/l' || hdlUnit === 'mmol/l')) {
    convertedHdl = Math.round(convertedHdl * 38.67 * 10) / 10;
  }
  if (convertedHdl !== null && convertedHdl >= 10.0 && convertedHdl <= 200.0) {
    hdl = convertedHdl;
    provenance.hdl = measurements.hdl?.source || confirmed.hdl?.source || 'report';
  } else {
    const profHdl = extractNumeric(patient?.hdl);
    if (profHdl !== null && profHdl >= 10.0 && profHdl <= 200.0) {
      hdl = profHdl;
      provenance.hdl = 'profile';
    }
  }

  let creatinine = null;
  const repCr = extractNumeric(measurements.creatinine) ??
                extractNumeric(measurements.serumCreatinine) ??
                extractNumeric(confirmed.serumCreatinine) ??
                extractNumeric(confirmed.creatinine) ??
                extractNumeric(flatStructured.serumCreatinine) ??
                extractNumeric(flatStructured.creatinine);
  const crUnit = extractUnit(measurements.creatinine) || extractUnit(confirmed.serumCreatinine);
  let convertedCr = repCr;
  if (convertedCr !== null && crUnit && (crUnit.includes('umol') || crUnit.includes('μmol'))) {
    convertedCr = Math.round((convertedCr / 88.4) * 100) / 100;
  }
  if (convertedCr !== null && convertedCr >= 0.1 && convertedCr <= 20.0) {
    creatinine = convertedCr;
    provenance.creatinine = measurements.creatinine?.source || measurements.serumCreatinine?.source || confirmed.creatinine?.source || confirmed.serumCreatinine?.source || 'report';
  } else {
    const profCr = extractNumeric(patient?.serumCreatinine);
    if (profCr !== null && profCr >= 0.1 && profCr <= 20.0) {
      creatinine = profCr;
      provenance.creatinine = 'profile';
    }
  }

  // Domain presence evaluation
  const hasDemographic = (age !== null && sex !== null);
  const hasPhysical = (bmi !== null) || (systolic_bp !== null && diastolic_bp !== null);
  const hasLaboratory = (total_cholesterol !== null && hdl !== null) || (creatinine !== null);

  const canCalculate = Boolean(hasDemographic && hasPhysical && hasLaboratory);

  let missingDomain = null;
  let domainMessage = null;
  if (!hasDemographic) {
    missingDomain = 'demographic';
    domainMessage = 'Adult age (>= 18 years) and biological sex are mandatory.';
  } else if (!hasPhysical) {
    missingDomain = 'physical';
    domainMessage = 'At least one physical parameter (BMI or Resting Blood Pressure) is required.';
  } else if (!hasLaboratory) {
    missingDomain = 'laboratory';
    domainMessage = 'At least one routine laboratory test (Lipid Panel: Total Cholesterol & HDL, or Serum Creatinine) is required.';
  }

  const featureVector = {
    age,
    sex,
    bmi,
    systolic_bp,
    diastolic_bp,
    total_cholesterol,
    hdl,
    creatinine,
  };

  const featureKeys = ['age', 'sex', 'bmi', 'systolic_bp', 'diastolic_bp', 'total_cholesterol', 'hdl', 'creatinine'];
  const availableFeatures = featureKeys.filter((k) => featureVector[k] !== null);
  const missingFeatures = featureKeys.filter((k) => featureVector[k] === null);
  const reportFeatures = featureKeys.filter((k) => ['report', 'manual_correction', 'manual'].includes(provenance[k]));
  const profileFeatures = featureKeys.filter((k) => provenance[k] === 'profile');

  const dataCompleteness = !canCalculate
    ? 'INSUFFICIENT'
    : (missingFeatures.length === 0 ? 'FULL' : 'PARTIAL');

  // Detailed source descriptors
  const featureDetails = {};
  featureKeys.forEach((k) => {
    const val = featureVector[k];
    const prov = provenance[k];
    let sourceLabel = 'Missing';
    if (prov === 'report') sourceLabel = 'Found in this report';
    else if (prov === 'manual_correction') sourceLabel = 'Corrected manually';
    else if (prov === 'manual') sourceLabel = 'Added manually';
    else if (prov === 'profile') sourceLabel = 'Available from your health information';
    featureDetails[k] = {
      value: val,
      provenance: prov,
      sourceLabel,
    };
  });

  return {
    featureVector,
    canCalculate,
    missingDomain,
    domainMessage,
    dataCompleteness,
    featureAvailability: {
      hasDemographic,
      hasPhysical,
      hasLaboratory,
      availableCount: availableFeatures.length,
      availableFeatures,
      missingFeatures,
      reportFeatures,
      profileFeatures,
      provenance,
      featureDetails,
      dataCompleteness,
    },
  };
}
