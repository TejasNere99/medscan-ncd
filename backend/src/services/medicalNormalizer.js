/**
 * Medical Normalizer Service
 * Handles canonical field naming, unit detection, safe unit conversions,
 * and OCR digit confusion normalization with full audit traceability.
 */

// Canonical biomarker name registry
export const CANONICAL_FIELDS = {
  FASTING_GLUCOSE: 'fastingGlucose',
  SYSTOLIC_BP: 'systolicBP',
  DIASTOLIC_BP: 'diastolicBP',
  TOTAL_CHOLESTEROL: 'totalCholesterol',
  CREATININE: 'creatinine',
  BLOOD_UREA: 'bloodUrea',
  BLOOD_UREA_NITROGEN: 'bloodUreaNitrogen',
  HEMOGLOBIN: 'hemoglobin',
  BMI: 'bmi',
  HEART_RATE: 'heartRate',
  MAP: 'map',
  PULSE_PRESSURE: 'pulsePressure',
};

// Complete Blood Count (CBC) specific field registry
export const CBC_FIELDS = {
  HEMOGLOBIN: 'hemoglobin',
  RBC_COUNT: 'rbcCount',
  WBC_COUNT: 'wbcCount',
  NEUTROPHILS: 'neutrophils',
  LYMPHOCYTES: 'lymphocytes',
  EOSINOPHILS: 'eosinophils',
  MONOCYTES: 'monocytes',
  BASOPHILS: 'basophils',
  PLATELET_COUNT: 'plateletCount',
  PCV: 'pcv',
  MCV: 'mcv',
  MCH: 'mch',
  MCHC: 'mchc',
  RDW: 'rdw',
};

// Recognized clinical units by parameter
export const STANDARD_UNITS = {
  [CANONICAL_FIELDS.FASTING_GLUCOSE]: ['mg/dL', 'mmol/L'],
  [CANONICAL_FIELDS.SYSTOLIC_BP]: ['mmHg'],
  [CANONICAL_FIELDS.DIASTOLIC_BP]: ['mmHg'],
  [CANONICAL_FIELDS.TOTAL_CHOLESTEROL]: ['mg/dL', 'mmol/L'],
  [CANONICAL_FIELDS.CREATININE]: ['mg/dL', 'µmol/L', 'umol/L'],
  [CANONICAL_FIELDS.BLOOD_UREA]: ['mg/dL', 'mmol/L'],
  [CANONICAL_FIELDS.BLOOD_UREA_NITROGEN]: ['mg/dL', 'mmol/L'],
  [CANONICAL_FIELDS.HEMOGLOBIN]: ['g/dL', 'gm/dL', 'g/L'],
  [CANONICAL_FIELDS.BMI]: ['kg/m²'],
  [CANONICAL_FIELDS.HEART_RATE]: ['BPM'],
  [CANONICAL_FIELDS.MAP]: ['mmHg'],
  [CANONICAL_FIELDS.PULSE_PRESSURE]: ['mmHg'],
  [CBC_FIELDS.RBC_COUNT]: ['mill/cumm', 'million/cumm', '10^6/µL', 'M/µL'],
  [CBC_FIELDS.WBC_COUNT]: ['cumm', '/cumm', 'cells/cumm', '10^3/µL', '/µL'],
  [CBC_FIELDS.NEUTROPHILS]: ['%'],
  [CBC_FIELDS.LYMPHOCYTES]: ['%'],
  [CBC_FIELDS.EOSINOPHILS]: ['%'],
  [CBC_FIELDS.MONOCYTES]: ['%'],
  [CBC_FIELDS.BASOPHILS]: ['%'],
  [CBC_FIELDS.PLATELET_COUNT]: ['cumm', '/cumm', 'cells/cumm', '10^3/µL', 'lakh/cumm'],
  [CBC_FIELDS.PCV]: ['%'],
  [CBC_FIELDS.MCV]: ['fL'],
  [CBC_FIELDS.MCH]: ['pg'],
  [CBC_FIELDS.MCHC]: ['g/dL', 'gm/dL', '%'],
  [CBC_FIELDS.RDW]: ['%'],
};

/**
 * Normalizes raw unit string into standardized clinical notation.
 * If unrecognized or missing, returns null without guessing.
 */
export const normalizeUnit = (rawUnit) => {
  if (!rawUnit || typeof rawUnit !== 'string') {
    return { unit: null, unitStatus: 'unknown' };
  }

  const cleaned = rawUnit.trim().toLowerCase().replace(/\s+/g, '');

  if (cleaned.includes('mg/dl') || cleaned === 'mg%' || cleaned.includes('mgl/dl')) {
    return { unit: 'mg/dL', unitStatus: 'standard' };
  }
  if (cleaned.includes('mmol/l') || cleaned === 'mmoll') {
    return { unit: 'mmol/L', unitStatus: 'standard' };
  }
  if (cleaned.includes('mmhg') || cleaned.includes('mm-hg') || cleaned === 'mm') {
    return { unit: 'mmHg', unitStatus: 'standard' };
  }
  if (cleaned.includes('g/dl') || cleaned.includes('gm/dl') || cleaned === 'gm%') {
    return { unit: 'g/dL', unitStatus: 'standard' };
  }
  if (cleaned.includes('g/l')) {
    return { unit: 'g/L', unitStatus: 'standard' };
  }
  if (cleaned.includes('kg/m') || cleaned.includes('kg/m2') || cleaned.includes('kg/m²')) {
    return { unit: 'kg/m²', unitStatus: 'standard' };
  }
  if (cleaned.includes('bpm') || cleaned.includes('beats/min') || cleaned.includes('min-1')) {
    return { unit: 'BPM', unitStatus: 'standard' };
  }
  if (cleaned.includes('umol/l') || cleaned.includes('µmol/l')) {
    return { unit: 'µmol/L', unitStatus: 'standard' };
  }
  if (cleaned.includes('mill/cumm') || cleaned.includes('million/cumm') || cleaned.includes('mil/cumm') || cleaned.includes('10^6/ul') || cleaned.includes('10^6/µl') || cleaned.includes('m/µl') || cleaned.includes('m/ul')) {
    return { unit: 'mill/cumm', unitStatus: 'standard' };
  }
  if (cleaned === 'cumm' || cleaned === '/cumm' || cleaned === 'cells/cumm' || cleaned.includes('10^3/ul') || cleaned.includes('10^3/µl') || cleaned === '/ul' || cleaned === '/µl') {
    return { unit: 'cumm', unitStatus: 'standard' };
  }
  if (cleaned === 'fl') {
    return { unit: 'fL', unitStatus: 'standard' };
  }
  if (cleaned === 'pg') {
    return { unit: 'pg', unitStatus: 'standard' };
  }
  if (cleaned.includes('%') || cleaned.includes('percent')) {
    return { unit: '%', unitStatus: 'standard' };
  }

  return { unit: rawUnit.trim(), unitStatus: 'unstandardized' };
};

/**
 * Safely converts clinical values between mathematically well-defined units.
 * NEVER fabricates an assumption if the source unit is unknown.
 */
export const convertUnitSafely = (parameter, value, sourceUnit) => {
  if (value === null || value === undefined || isNaN(value)) {
    return { value: null, unit: null, normalizedValue: null, normalizedUnit: null, conversionApplied: false };
  }

  const num = Number(value);
  const normalizedSource = normalizeUnit(sourceUnit).unit;

  if (!normalizedSource) {
    return {
      value: num,
      unit: null,
      unitStatus: 'unknown',
      normalizedValue: num,
      normalizedUnit: null,
      conversionApplied: false,
    };
  }

  // Glucose: mmol/L -> mg/dL (1 mmol/L = 18.0182 mg/dL)
  if (parameter === CANONICAL_FIELDS.FASTING_GLUCOSE) {
    if (normalizedSource === 'mmol/L') {
      const converted = Math.round(num * 18.0182 * 10) / 10;
      return {
        value: num,
        unit: 'mmol/L',
        normalizedValue: converted,
        normalizedUnit: 'mg/dL',
        conversionApplied: true,
      };
    }
    if (normalizedSource === 'mg/dL') {
      return {
        value: num,
        unit: 'mg/dL',
        normalizedValue: num,
        normalizedUnit: 'mg/dL',
        conversionApplied: false,
      };
    }
  }

  // Creatinine: µmol/L -> mg/dL (1 mg/dL = 88.4 µmol/L)
  if (parameter === CANONICAL_FIELDS.CREATININE) {
    if (normalizedSource === 'µmol/L') {
      const converted = Math.round((num / 88.4) * 100) / 100;
      return {
        value: num,
        unit: 'µmol/L',
        normalizedValue: converted,
        normalizedUnit: 'mg/dL',
        conversionApplied: true,
      };
    }
    if (normalizedSource === 'mg/dL') {
      return {
        value: num,
        unit: 'mg/dL',
        normalizedValue: num,
        normalizedUnit: 'mg/dL',
        conversionApplied: false,
      };
    }
  }

  // Urea (not BUN): mmol/L -> mg/dL using urea molecular mass 60.06 g/mol.
  // BUN is a distinct canonical analyte and is deliberately not converted here.
  if (parameter === CANONICAL_FIELDS.BLOOD_UREA) {
    if (normalizedSource === 'mmol/L') {
      const converted = Math.round(num * 6.006 * 100) / 100;
      return { value: num, unit: 'mmol/L', normalizedValue: converted, normalizedUnit: 'mg/dL', conversionApplied: true };
    }
    if (normalizedSource === 'mg/dL') {
      return { value: num, unit: 'mg/dL', normalizedValue: num, normalizedUnit: 'mg/dL', conversionApplied: false };
    }
  }

  // Cholesterol: mmol/L -> mg/dL (1 mmol/L = 38.67 mg/dL)
  if (parameter === CANONICAL_FIELDS.TOTAL_CHOLESTEROL) {
    if (normalizedSource === 'mmol/L') {
      const converted = Math.round(num * 38.67 * 10) / 10;
      return {
        value: num,
        unit: 'mmol/L',
        normalizedValue: converted,
        normalizedUnit: 'mg/dL',
        conversionApplied: true,
      };
    }
    if (normalizedSource === 'mg/dL') {
      return {
        value: num,
        unit: 'mg/dL',
        normalizedValue: num,
        normalizedUnit: 'mg/dL',
        conversionApplied: false,
      };
    }
  }

  return {
    value: num,
    unit: normalizedSource,
    normalizedValue: num,
    normalizedUnit: normalizedSource,
    conversionApplied: false,
  };
};

/**
 * Normalizes typical OCR character substitution errors in numeric strings.
 * e.g. "1O8" (letter O) -> 108.
 * Preserves originalText and tracks confidence penalty.
 */
export const normalizeOcrNumericString = (rawString) => {
  if (typeof rawString !== 'string') {
    return { value: Number(rawString), originalText: String(rawString), ocrTypoCorrected: false, penalty: 0 };
  }

  const originalText = rawString.trim();
  let cleaned = originalText;
  let ocrTypoCorrected = false;
  let penalty = 0;

  // Replace capital O, lowercase o with zero between digits or at end of digits
  if (/\b\d+[Oo]+\d*\b/.test(cleaned) || /\b[Oo]+\d+\b/.test(cleaned)) {
    cleaned = cleaned.replace(/[Oo]/g, '0');
    ocrTypoCorrected = true;
    penalty += 0.15;
  }

  // Replace capital I or lowercase l with 1 between digits
  if (/\b\d+[Il]+\d*\b/.test(cleaned) || /\b[Il]+\d+\b/.test(cleaned)) {
    cleaned = cleaned.replace(/[Il]/g, '1');
    ocrTypoCorrected = true;
    penalty += 0.12;
  }

  // Replace capital S with 5 in numeric sequences
  if (/\b\d+S+\d*\b/.test(cleaned)) {
    cleaned = cleaned.replace(/S/g, '5');
    ocrTypoCorrected = true;
    penalty += 0.15;
  }

  const parsed = parseFloat(cleaned);
  return {
    value: isNaN(parsed) ? null : parsed,
    originalText,
    normalizedText: cleaned,
    ocrTypoCorrected,
    confidencePenalty: penalty,
  };
};
