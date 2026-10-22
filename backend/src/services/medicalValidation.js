/**
 * Medical Validation Service
 * Implements three-tier clinical data-quality validation (VALID, WARNING, INVALID),
 * conflict candidate detection, and extraction confidence scoring.
 *
 * NOTE: Validation is a data-quality and plausible-range check for extraction fidelity.
 * It is NOT an AI diagnosis or a medical certainty assertion.
 */

export const VALIDATION_STATUS = {
  VALID: 'VALID',
  WARNING: 'WARNING',
  INVALID: 'INVALID',
};

/**
 * Validates extracted numerical biomarker against physiological plausibility.
 * Does NOT discard extreme values — extreme values receive WARNING for manual verification.
 */
export const validateBiomarkerRange = (field, value, unit) => {
  if (value === null || value === undefined || isNaN(value)) {
    return {
      status: VALIDATION_STATUS.INVALID,
      message: 'Value is not a valid number.',
      severity: 'error',
    };
  }

  const num = Number(value);

  // Negative values are physically impossible for these biomarkers
  if (num < 0) {
    return {
      status: VALIDATION_STATUS.INVALID,
      message: 'Value cannot be negative.',
      severity: 'error',
    };
  }

  switch (field) {
    case 'fastingGlucose':
    case 'fastingSugar':
      if (unit === 'mmol/L') {
        if (num > 25) {
          return { status: VALIDATION_STATUS.WARNING, message: 'Unusually high glucose (>25 mmol/L). Please verify against report.' };
        }
        if (num < 2.5) {
          return { status: VALIDATION_STATUS.WARNING, message: 'Unusually low glucose (<2.5 mmol/L). Please verify against report.' };
        }
        return { status: VALIDATION_STATUS.VALID, message: 'Standard mmol/L reading.' };
      }
      if (num > 400) {
        return { status: VALIDATION_STATUS.WARNING, message: 'Unusually high glucose (>400 mg/dL). Please verify against report.' };
      }
      if (num < 40) {
        return { status: VALIDATION_STATUS.WARNING, message: 'Unusually low glucose (<40 mg/dL). Please verify against report.' };
      }
      return { status: VALIDATION_STATUS.VALID, message: 'Within expected physiological range.' };

    case 'systolicBP':
      if (num > 220) {
        return { status: VALIDATION_STATUS.WARNING, message: 'Unusually high systolic BP (>220 mmHg). Please verify against report.' };
      }
      if (num < 65) {
        return { status: VALIDATION_STATUS.WARNING, message: 'Unusually low systolic BP (<65 mmHg). Please verify against report.' };
      }
      return { status: VALIDATION_STATUS.VALID, message: 'Within expected physiological range.' };

    case 'diastolicBP':
      if (num > 130) {
        return { status: VALIDATION_STATUS.WARNING, message: 'Unusually high diastolic BP (>130 mmHg). Please verify against report.' };
      }
      if (num < 40) {
        return { status: VALIDATION_STATUS.WARNING, message: 'Unusually low diastolic BP (<40 mmHg). Please verify against report.' };
      }
      return { status: VALIDATION_STATUS.VALID, message: 'Within expected physiological range.' };

    case 'cholesterol':
    case 'totalCholesterol':
      if (unit === 'mmol/L') {
        if (num > 12) return { status: VALIDATION_STATUS.WARNING, message: 'Unusually high cholesterol (>12 mmol/L). Verify against report.' };
        if (num < 2) return { status: VALIDATION_STATUS.WARNING, message: 'Unusually low cholesterol (<2 mmol/L). Verify against report.' };
        return { status: VALIDATION_STATUS.VALID, message: 'Valid mmol/L reading.' };
      }
      if (num > 450) {
        return { status: VALIDATION_STATUS.WARNING, message: 'Unusually elevated cholesterol (>450 mg/dL). Verify against report.' };
      }
      if (num < 70) {
        return { status: VALIDATION_STATUS.WARNING, message: 'Unusually low cholesterol (<70 mg/dL). Verify against report.' };
      }
      return { status: VALIDATION_STATUS.VALID, message: 'Within expected physiological range.' };

    case 'hdl':
    case 'hdlCholesterol':
      if (unit === 'mmol/L') {
        if (num > 4.5) return { status: VALIDATION_STATUS.WARNING, message: 'Unusually high HDL (>4.5 mmol/L). Verify against report.' };
        if (num < 0.4) return { status: VALIDATION_STATUS.WARNING, message: 'Unusually low HDL (<0.4 mmol/L). Verify against report.' };
        return { status: VALIDATION_STATUS.VALID, message: 'Valid mmol/L reading.' };
      }
      if (num > 150) {
        return { status: VALIDATION_STATUS.WARNING, message: 'Unusually high HDL (>150 mg/dL). Verify against report.' };
      }
      if (num < 15) {
        return { status: VALIDATION_STATUS.WARNING, message: 'Unusually low HDL (<15 mg/dL). Verify against report.' };
      }
      return { status: VALIDATION_STATUS.VALID, message: 'Within expected physiological range.' };

    case 'creatinine':
    case 'serumCreatinine':
      if (unit === 'µmol/L' || unit === 'umol/L') {
        if (num > 1200) return { status: VALIDATION_STATUS.WARNING, message: 'Unusually high creatinine (>1200 µmol/L). Verify against report.' };
        if (num < 20) return { status: VALIDATION_STATUS.WARNING, message: 'Unusually low creatinine (<20 µmol/L). Verify against report.' };
        return { status: VALIDATION_STATUS.VALID, message: 'Valid µmol/L reading.' };
      }
      if (num > 15) {
        return { status: VALIDATION_STATUS.WARNING, message: 'Unusually high creatinine (>15 mg/dL). Verify against report.' };
      }
      if (num < 0.2) {
        return { status: VALIDATION_STATUS.WARNING, message: 'Unusually low creatinine (<0.2 mg/dL). Verify against report.' };
      }
      return { status: VALIDATION_STATUS.VALID, message: 'Within expected physiological range.' };

    case 'hemoglobin':
      if (num > 22) {
        return { status: VALIDATION_STATUS.WARNING, message: 'Unusually high hemoglobin (>22 g/dL). Verify against report.' };
      }
      if (num < 4) {
        return { status: VALIDATION_STATUS.WARNING, message: 'Critically low hemoglobin (<4 g/dL). Verify against report.' };
      }
      return { status: VALIDATION_STATUS.VALID, message: 'Within expected physiological range.' };

    case 'bloodUrea':
      if (unit === 'mmol/L') {
        if (num > 50) return { status: VALIDATION_STATUS.WARNING, message: 'Unusually high blood urea (>50 mmol/L). Verify the original report.' };
        if (num < 1) return { status: VALIDATION_STATUS.WARNING, message: 'Unusually low blood urea (<1 mmol/L). Verify the original report.' };
        return { status: VALIDATION_STATUS.VALID, message: 'Blood urea recorded in mmol/L.' };
      }
      if (num > 300) return { status: VALIDATION_STATUS.WARNING, message: 'Unusually high blood urea (>300 mg/dL). Verify the original report.' };
      if (num < 5) return { status: VALIDATION_STATUS.WARNING, message: 'Unusually low blood urea (<5 mg/dL). Verify the original report.' };
      return { status: VALIDATION_STATUS.VALID, message: 'Blood urea recorded in mg/dL.' };

    case 'bloodUreaNitrogen':
      if (unit === 'mmol/L') {
        if (num > 50) return { status: VALIDATION_STATUS.WARNING, message: 'Unusually high BUN. Verify the original report.' };
        return { status: VALIDATION_STATUS.VALID, message: 'BUN remains distinct from total blood urea.' };
      }
      if (num > 150) return { status: VALIDATION_STATUS.WARNING, message: 'Unusually high BUN (>150 mg/dL). Verify the original report.' };
      return { status: VALIDATION_STATUS.VALID, message: 'BUN remains distinct from total blood urea.' };

    case 'bmi':
      if (num > 60) {
        return { status: VALIDATION_STATUS.WARNING, message: 'BMI > 60 is extreme. Please verify against report.' };
      }
      if (num < 10) {
        return { status: VALIDATION_STATUS.WARNING, message: 'BMI < 10 is unusually low. Please verify against report.' };
      }
      return { status: VALIDATION_STATUS.VALID, message: 'Within expected physiological range.' };

    case 'heartRate':
      if (num > 200) {
        return { status: VALIDATION_STATUS.WARNING, message: 'Unusually high heart rate (>200 BPM). Verify against report.' };
      }
      if (num < 35) {
        return { status: VALIDATION_STATUS.WARNING, message: 'Unusually low heart rate (<35 BPM). Verify against report.' };
      }
      return { status: VALIDATION_STATUS.VALID, message: 'Within expected physiological range.' };

    case 'map':
      if (num > 180 || num < 40) {
        return { status: VALIDATION_STATUS.WARNING, message: 'Unusual Mean Arterial Pressure. Please verify against report.' };
      }
      return { status: VALIDATION_STATUS.VALID, message: 'Valid' };

    case 'pulsePressure':
      if (num > 120 || num < 15) {
        return { status: VALIDATION_STATUS.WARNING, message: 'Unusual Pulse Pressure. Please verify against report.' };
      }
      return { status: VALIDATION_STATUS.VALID, message: 'Valid' };

    case 'dippingPercent':
      if (num < -20 || num > 50) {
        return { status: VALIDATION_STATUS.WARNING, message: 'Extreme dipping percentage. Please verify against report.' };
      }
      return { status: VALIDATION_STATUS.VALID, message: 'Valid' };

    case 'rbcCount':
      if (num > 9.0) return { status: VALIDATION_STATUS.WARNING, message: 'Unusually high RBC count (>9.0 mill/cumm). Verify against report.' };
      if (num < 2.0) return { status: VALIDATION_STATUS.WARNING, message: 'Unusually low RBC count (<2.0 mill/cumm). Verify against report.' };
      return { status: VALIDATION_STATUS.VALID, message: 'Within expected physiological range.' };

    case 'wbcCount':
      if (num > 50000) return { status: VALIDATION_STATUS.WARNING, message: 'Unusually high WBC count (>50,000 cumm). Verify against report.' };
      if (num < 1500) return { status: VALIDATION_STATUS.WARNING, message: 'Unusually low WBC count (<1,500 cumm). Verify against report.' };
      return { status: VALIDATION_STATUS.VALID, message: 'Within expected physiological range.' };

    case 'neutrophils':
    case 'lymphocytes':
    case 'eosinophils':
    case 'monocytes':
    case 'basophils':
    case 'pcv':
    case 'rdw':
      if (num > 100) return { status: VALIDATION_STATUS.WARNING, message: 'Percentage value cannot exceed 100%. Verify against report.' };
      return { status: VALIDATION_STATUS.VALID, message: 'Valid percentage reading.' };

    case 'plateletCount':
      if (num > 1000000) return { status: VALIDATION_STATUS.WARNING, message: 'Unusually high platelet count (>1,000,000 cumm). Verify against report.' };
      if (num < 20000) return { status: VALIDATION_STATUS.WARNING, message: 'Critically low platelet count (<20,000 cumm). Verify against report.' };
      return { status: VALIDATION_STATUS.VALID, message: 'Within expected physiological range.' };

    case 'mcv':
      if (num > 140) return { status: VALIDATION_STATUS.WARNING, message: 'Unusually high MCV (>140 fL). Verify against report.' };
      if (num < 50) return { status: VALIDATION_STATUS.WARNING, message: 'Unusually low MCV (<50 fL). Verify against report.' };
      return { status: VALIDATION_STATUS.VALID, message: 'Within expected physiological range.' };

    case 'mch':
      if (num > 50) return { status: VALIDATION_STATUS.WARNING, message: 'Unusually high MCH (>50 pg). Verify against report.' };
      if (num < 15) return { status: VALIDATION_STATUS.WARNING, message: 'Unusually low MCH (<15 pg). Verify against report.' };
      return { status: VALIDATION_STATUS.VALID, message: 'Within expected physiological range.' };

    case 'mchc':
      if (num > 45) return { status: VALIDATION_STATUS.WARNING, message: 'Unusually high MCHC (>45 g/dL). Verify against report.' };
      if (num < 20) return { status: VALIDATION_STATUS.WARNING, message: 'Unusually low MCHC (<20 g/dL). Verify against report.' };
      return { status: VALIDATION_STATUS.VALID, message: 'Within expected physiological range.' };

    default:
      return { status: VALIDATION_STATUS.VALID, message: 'Valid format' };
  }
};

/**
 * Checks for conflicting candidate values for the same parameter.
 * If multiple distinct values are found in the same context, returns WARNING with conflict details.
 */
export const detectConflicts = (candidates) => {
  if (!Array.isArray(candidates) || candidates.length <= 1) {
    return { hasConflict: false, candidates: candidates || [] };
  }

  // Filter distinct numeric values
  const distinctValues = [...new Set(candidates.map((c) => (typeof c === 'object' ? c.value : c)))];

  if (distinctValues.length > 1) {
    return {
      hasConflict: true,
      distinctValues,
      candidates,
      warningMessage: `Conflicting values detected (${distinctValues.join(', ')}). Manual verification required.`,
    };
  }

  return { hasConflict: false, candidates };
};

/**
 * Calculates extraction confidence score for a candidate parameter.
 * Evaluates OCR clarity, exact label matching, unit presence, context, and conflict status.
 */
export const calculateExtractionConfidence = ({
  ocrEngineConfidence = 85,
  exactLabelMatch = true,
  unitDetected = true,
  ocrTypoCorrected = false,
  tableCoherent = true,
  hasConflict = false,
}) => {
  let score = Math.max(0.3, Math.min(0.98, ocrEngineConfidence / 100));

  if (exactLabelMatch) score += 0.08;
  if (unitDetected) score += 0.06;
  if (tableCoherent) score += 0.05;

  if (ocrTypoCorrected) score -= 0.22;
  if (!unitDetected) score -= 0.12;
  if (hasConflict) score -= 0.25;

  // Clamp confidence between 0.10 and 0.99
  const clamped = Math.min(0.99, Math.max(0.1, score));
  return Math.round(clamped * 100) / 100;
};
