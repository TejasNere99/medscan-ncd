/**
 * Medical Report Intelligence & Document Understanding Parser
 *
 * Responsibilities:
 * - Report type classification with extraction confidence
 * - Logical section detection (Overall, Wake, Sleep, Labs)
 * - Table & context-aware statistical reconstruction
 * - Multi-period ABPM extraction (Overall, Wake, Sleep, Dipping, AASI, MSI, Loads)
 * - General laboratory entity extraction with unit preservation & source traceability
 * - Conflict detection & zero-fabrication guarantee
 */

import {
  CANONICAL_FIELDS,
  normalizeUnit,
  convertUnitSafely,
  normalizeOcrNumericString,
} from './medicalNormalizer.js';
import {
  VALIDATION_STATUS,
  validateBiomarkerRange,
  detectConflicts,
  calculateExtractionConfidence,
} from './medicalValidation.js';

/**
 * Classifies document type based on characteristic medical terminology and keywords.
 * Returns { value: string, confidence: number }.
 */
export const classifyReportType = (text) => {
  if (!text || typeof text !== 'string' || text.trim().length < 15) {
    return { value: 'unknown', confidence: 0.1 };
  }

  const lower = text.toLowerCase();

  // 1. Ambulatory Blood Pressure Monitoring (ABPM)
  const abpmSignals = [
    'ambulatory blood pressure',
    'sentinel',
    'abpm',
    'abp report',
    '24-hour bp',
    '24 hour blood pressure',
    'dipping',
    'aasi',
    'wake periods',
    'sleep periods',
    'hourly avg',
    'spacelabs',
    'welch allyn',
  ];
  let abpmMatches = 0;
  for (const sig of abpmSignals) {
    if (lower.includes(sig)) abpmMatches++;
  }
  if (abpmMatches >= 2 || lower.includes('ambulatory blood pressure') || lower.includes('sentinel abp')) {
    const conf = Math.min(0.98, 0.75 + abpmMatches * 0.05);
    return { value: 'ambulatory_blood_pressure_monitoring', confidence: conf };
  }

  // 2. Complete Blood Count (CBC)
  const cbcSignals = ['complete blood count', 'cbc', 'haemogram', 'hemogram', 'leukocytes', 'platelet count', 'mcv', 'mch', 'mchc'];
  let cbcMatches = 0;
  for (const sig of cbcSignals) {
    if (lower.includes(sig)) cbcMatches++;
  }
  if (cbcMatches >= 2 || lower.includes('complete blood count')) {
    return { value: 'complete_blood_count', confidence: Math.min(0.97, 0.8 + cbcMatches * 0.04) };
  }

  // 3. Lipid Profile
  const lipidSignals = ['lipid profile', 'lipid panel', 'triglycerides', 'hdl cholesterol', 'ldl cholesterol', 'vldl'];
  let lipidMatches = 0;
  for (const sig of lipidSignals) {
    if (lower.includes(sig)) lipidMatches++;
  }
  if (lipidMatches >= 2 || lower.includes('lipid profile')) {
    return { value: 'lipid_profile', confidence: Math.min(0.97, 0.8 + lipidMatches * 0.04) };
  }

  // 4. Renal Function / Kidney Profile
  const renalSignals = ['renal function', 'kidney function', 'kft', 'rft', 'serum creatinine', 'blood urea', 'uric acid', 'egfr'];
  let renalMatches = 0;
  for (const sig of renalSignals) {
    if (lower.includes(sig)) renalMatches++;
  }
  if (renalMatches >= 2 || lower.includes('renal function') || lower.includes('kidney function')) {
    return { value: 'renal_function', confidence: Math.min(0.96, 0.8 + renalMatches * 0.04) };
  }

  // 5. Metabolic Panel / Glucose Report
  const metabolicSignals = ['metabolic panel', 'glucose tolerance', 'fasting blood sugar', 'fbs', 'glycated hemoglobin', 'hba1c', 'comprehensive metabolic'];
  let metabolicMatches = 0;
  for (const sig of metabolicSignals) {
    if (lower.includes(sig)) metabolicMatches++;
  }
  if (metabolicMatches >= 1 || lower.includes('metabolic panel')) {
    return { value: 'metabolic_panel', confidence: Math.min(0.95, 0.8 + metabolicMatches * 0.05) };
  }

  // 6. General Lab Report
  if (lower.includes('laboratory') || lower.includes('diagnostic') || lower.includes('pathology') || lower.includes('patient report')) {
    return { value: 'general_lab_report', confidence: 0.72 };
  }

  return { value: 'unknown', confidence: 0.25 };
};

/**
 * Extracts patient demographic context (age, ageUnit, sex) when explicitly present.
 * Does NOT invent missing demographics.
 */
export const extractPatientContext = (rawText) => {
  if (!rawText || typeof rawText !== 'string') return {};

  const context = {};

  // Age extraction: e.g. "Age : 21 Years", "Age: 42", "Age / Gender: 21 Y / M"
  const ageMatch = rawText.match(/(?:age|patient\s*age)\s*[:\-\s]*(\d{1,3})\s*(years?|yrs?|y|months?|m)?/i);
  if (ageMatch) {
    const ageVal = parseInt(ageMatch[1], 10);
    if (!isNaN(ageVal) && ageVal >= 0 && ageVal <= 130) {
      context.age = ageVal;
      context.ageUnit = (ageMatch[2] && ageMatch[2].toLowerCase().startsWith('m')) ? 'months' : 'years';
    }
  }

  // Sex / Gender extraction: e.g. "Sex : Male", "Gender: Female", "Sex: M"
  const sexMatch = rawText.match(/(?:sex|gender)\s*[:\-\s]*([a-z]+)/i);
  if (sexMatch) {
    const rawSex = sexMatch[1].toLowerCase();
    if (rawSex === 'male' || rawSex === 'm') {
      context.sex = 'male';
    } else if (rawSex === 'female' || rawSex === 'f') {
      context.sex = 'female';
    } else if (rawSex === 'other') {
      context.sex = 'other';
    }
  }

  return context;
};

/**
 * Segments document into identified logical blocks/sections.
 */
export const detectDocumentSections = (lines) => {
  const sections = [];
  let currentSection = { name: 'Header / General', startIndex: 0, lines: [] };

  const sectionHeaders = [
    { name: 'Complete Blood Count', pattern: /(?:complete\s*blood\s*count(?:\s*\(cbc\))?|^cbc$|hemogram|haemogram|hematology|haematology)/i },
    { name: 'Blood Indices', pattern: /(?:blood\s*indices|rbc\s*indices|erythrocyte\s*indices)/i },
    { name: 'Differential WBC Count', pattern: /(?:differential\s*(?:wbc|leucocyte|leukocyte)\s*count|differential\s*count|dlc)/i },
    { name: 'RBC Count', pattern: /(?:total\s*rbc\s*count|rbc\s*count|erythrocyte\s*count)/i },
    { name: 'WBC Count', pattern: /(?:total\s*wbc\s*count|wbc\s*count|leucocyte\s*count)/i },
    { name: 'Platelet Count', pattern: /(?:platelet\s*count|thrombocyte\s*count)/i },
    { name: 'Overall Summary', pattern: /(?:overall\s*summary|24[\-\s]*hour\s*summary|overall\s*statistics)/i },
    { name: 'Wake Periods Summary', pattern: /(?:wake\s*periods?\s*summary|wake\s*period|awake|day\s*time)/i },
    { name: 'Sleep Periods Summary', pattern: /(?:sleep\s*periods?\s*summary|sleep\s*period|asleep|night\s*time)/i },
    { name: 'Hypertension Indicators', pattern: /(?:hypertension\s*indicators?|blood\s*pressure\s*indices|abpm\s*indices|nocturnal\s*dipping|arterial\s*stiffness\s*index)/i },
    { name: 'Patient Information', pattern: /(?:patient\s*(?:information|details|demographics)|patient\s*name)/i },
    { name: 'Recording Information', pattern: /(?:recording\s*information|recording\s*parameters|device\s*info)/i },
    { name: 'Laboratory Results', pattern: /(?:laboratory\s*results|test\s*results|biochemistry|investigations)/i },
  ];

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    let matchedHeader = null;
    for (const h of sectionHeaders) {
      if (h.pattern.test(trimmed) && trimmed.length < 50) {
        matchedHeader = h.name;
        break;
      }
    }

    if (matchedHeader && matchedHeader !== currentSection.name) {
      if (currentSection.lines.length > 0) {
        currentSection.endIndex = idx - 1;
        sections.push(currentSection);
      }
      currentSection = { name: matchedHeader, startIndex: idx, lines: [trimmed] };
    } else {
      currentSection.lines.push(trimmed);
    }
  });

  if (currentSection.lines.length > 0) {
    currentSection.endIndex = lines.length - 1;
    sections.push(currentSection);
  }

  return sections;
};

/**
 * Parses numeric stats from a text row or block that follows:
 * Label -> Avg -> SD -> Min -> Max -> (optional Dipping / Load %)
 */
export const parseStatsRow = (text, labelPattern) => {
  if (!text) return null;
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (/\(\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}\)/.test(line)) continue;

    if (labelPattern.test(line)) {
      const cleaned = line.replace(labelPattern, '').replace(/\b\d{1,2}:\d{2}\b/g, '');
      const numbers = [];
      const numMatches = cleaned.matchAll(/(?:\d+(?:\.\d+)?|\d+)\s*%?/g);
      for (const m of numMatches) {
        const val = parseFloat(m[0].replace('%', ''));
        if (!isNaN(val)) numbers.push(val);
      }

      if (numbers.length >= 4) {
        return {
          average: numbers[0],
          standardDeviation: numbers[1],
          minimum: numbers[2],
          maximum: numbers[3],
          dippingPercent: numbers[4] !== undefined ? numbers[4] : null,
        };
      }

      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        if (!/\(\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}\)/.test(nextLine)) {
          const nextMatches = nextLine.matchAll(/(?:\d+(?:\.\d+)?|\d+)\s*%?/g);
          const nextNums = [];
          for (const m of nextMatches) {
            const val = parseFloat(m[0].replace('%', ''));
            if (!isNaN(val)) nextNums.push(val);
          }
          if (nextNums.length >= 4) {
            return {
              average: nextNums[0],
              standardDeviation: nextNums[1],
              minimum: nextNums[2],
              maximum: nextNums[3],
              dippingPercent: nextNums[4] !== undefined ? nextNums[4] : null,
            };
          }
        }
      }
    }
  }
  return null;
};

/**
 * Dedicated parser for Ambulatory Blood Pressure Monitoring (ABPM) reports.
 * Extracts multi-period stats (Overall, Wake, Sleep), AASI, MSI, Dipping %, and Loads.
 * NEVER hardcodes values: derives them dynamically from table and text context.
 */
export const parseAbpmDocument = (rawText, ocrConfidence = 90) => {
  const lines = rawText.split('\n');
  const sections = detectDocumentSections(lines);

  const result = {
    documentType: 'ambulatory_blood_pressure_monitoring',
    measurements: {
      bloodPressure: {
        overall: {},
        wake: {},
        sleep: {},
      },
      heartRate: {},
      map: {},
      pulsePressure: {},
    },
    hypertensionIndicators: {
      systolicLoadPercent: null,
      diastolicLoadPercent: null,
      systolicDippingPercent: null,
      diastolicDippingPercent: null,
      aasi: null,
      msi: null,
    },
    canonicalVitals: {},
    extractionWarnings: [],
  };

  // Helper to extract a number right after a regex pattern
  const findValue = (text, pattern) => {
    const match = text.match(pattern);
    if (match && match[1]) {
      const num = parseFloat(match[1]);
      return isNaN(num) ? null : num;
    }
    return null;
  };

  // 1. Overall Summary Table Analysis
  const overallBpMatch = rawText.match(/(?:24[\-\s]*hour\s*avg|overall\s*avg|average\s*bp|hourly\s*avg[^\n]*\n[^\n]*\b)?\s*(\d{2,3})\s*[\/\\]\s*(\d{2,3})\s*(?:mm\s*hg|mmhg)?/i);

  const systolicStats =
    parseStatsRow(rawText, /(?:^|\s)systolic(?:\s*\(?mm\s*hg\)?)?/i) ||
    (() => {
      const avg = findValue(rawText, /systolic[^\d]*(\d{2,3})/i);
      return avg ? { average: avg, standardDeviation: null, minimum: null, maximum: null } : null;
    })();

  const diastolicStats =
    parseStatsRow(rawText, /(?:^|\s)diastolic(?:\s*\(?mm\s*hg\)?)?/i) ||
    (() => {
      const avg = findValue(rawText, /diastolic[^\d]*(\d{2,3})/i);
      return avg ? { average: avg, standardDeviation: null, minimum: null, maximum: null } : null;
    })();

  const mapStats = parseStatsRow(rawText, /\b(?:map|mean\s*arterial\s*pressure)\b/i);
  const pulsePressureStats = parseStatsRow(rawText, /\bpulse\s*pressure\b/i);
  const hrStats = parseStatsRow(rawText, /\b(?:heart\s*rate|pulse)\b(?!\s*pressure)/i);

  // Reconcile Overall BP
  const overallSys = systolicStats?.average || (overallBpMatch ? parseInt(overallBpMatch[1], 10) : null);
  const overallDia = diastolicStats?.average || (overallBpMatch ? parseInt(overallBpMatch[2], 10) : null);

  if (overallSys !== null && overallDia !== null) {
    result.measurements.bloodPressure.overall = {
      average: {
        systolic: {
          value: overallSys,
          unit: 'mmHg',
          confidence: calculateExtractionConfidence({ ocrEngineConfidence: ocrConfidence, exactLabelMatch: true, unitDetected: true }),
          validationStatus: validateBiomarkerRange('systolicBP', overallSys, 'mmHg').status,
          source: { section: 'Overall Summary', label: 'Average BP', context: '24-hour average systolic' },
        },
        diastolic: {
          value: overallDia,
          unit: 'mmHg',
          confidence: calculateExtractionConfidence({ ocrEngineConfidence: ocrConfidence, exactLabelMatch: true, unitDetected: true }),
          validationStatus: validateBiomarkerRange('diastolicBP', overallDia, 'mmHg').status,
          source: { section: 'Overall Summary', label: 'Average BP', context: '24-hour average diastolic' },
        },
      },
      systolic: {
        average: systolicStats?.average || overallSys,
        standardDeviation: systolicStats?.standardDeviation || null,
        minimum: systolicStats?.minimum || null,
        maximum: systolicStats?.maximum || null,
        unit: 'mmHg',
      },
      diastolic: {
        average: diastolicStats?.average || overallDia,
        standardDeviation: diastolicStats?.standardDeviation || null,
        minimum: diastolicStats?.minimum || null,
        maximum: diastolicStats?.maximum || null,
        unit: 'mmHg',
      },
    };

    result.canonicalVitals.systolicBP = {
      value: overallSys,
      unit: 'mmHg',
      confidence: calculateExtractionConfidence({ ocrEngineConfidence: ocrConfidence, exactLabelMatch: true, unitDetected: true }),
      validationStatus: validateBiomarkerRange('systolicBP', overallSys, 'mmHg').status,
      source: 'ABPM 24-Hour Overall Average',
    };
    result.canonicalVitals.diastolicBP = {
      value: overallDia,
      unit: 'mmHg',
      confidence: calculateExtractionConfidence({ ocrEngineConfidence: ocrConfidence, exactLabelMatch: true, unitDetected: true }),
      validationStatus: validateBiomarkerRange('diastolicBP', overallDia, 'mmHg').status,
      source: 'ABPM 24-Hour Overall Average',
    };
  }

  // 2. Wake Periods Section Analysis
  const wakeSection = sections.find((s) => /wake/i.test(s.name)) || { lines: [] };
  const wakeLines = wakeSection.lines.filter((l) => !/\(\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}\)/.test(l));
  const wakeText = wakeLines.join('\n');
  const wakeBpMatch =
    wakeText.match(/(?:average\s*bp|wake\s*avg|avg)?[^\d]*(\d{2,3})\s*[\/\\]\s*(\d{2,3})/i) ||
    rawText.match(/(?:wake\s*periods?[^\n]*\n[^\n]*\b)?(?:average\s*bp)?\s*[:\-\s]*(\d{2,3})\s*[\/\\]\s*(\d{2,3})\s*(?:mm\s*hg|mmhg)?/i);

  const wakeSysStats = parseStatsRow(wakeText, /systolic/i);
  const wakeDiaStats = parseStatsRow(wakeText, /diastolic/i);
  const wakeSys = wakeSysStats?.average || (wakeBpMatch ? parseInt(wakeBpMatch[1], 10) : null);
  const wakeDia = wakeDiaStats?.average || (wakeBpMatch ? parseInt(wakeBpMatch[2], 10) : null);

  const wakeSysLoad = findValue(wakeText || rawText, /(?:systolic\s*>|sys\s*>)\s*(?:135|limit)[^\d]*(\d+(?:\.\d+)?)\s*%/i);
  const wakeDiaLoad = findValue(wakeText || rawText, /(?:diastolic\s*>|dia\s*>)\s*(?:85|limit)[^\d]*(\d+(?:\.\d+)?)\s*%/i);

  if (wakeSys !== null || wakeDia !== null) {
    result.measurements.bloodPressure.wake = {
      average: {
        systolic: wakeSys,
        diastolic: wakeDia,
        unit: 'mmHg',
      },
      systolic: wakeSysStats || { average: wakeSys, standardDeviation: null, minimum: null, maximum: null },
      diastolic: wakeDiaStats || { average: wakeDia, standardDeviation: null, minimum: null, maximum: null },
      loadAboveThreshold: {
        systolicPercent: wakeSysLoad,
        diastolicPercent: wakeDiaLoad,
      },
    };
  }

  // 3. Sleep Periods Section Analysis
  const sleepSection = sections.find((s) => /sleep/i.test(s.name)) || { lines: [] };
  const sleepLines = sleepSection.lines.filter((l) => !/\(\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}\)/.test(l));
  const sleepText = sleepLines.join('\n');
  const sleepBpMatch =
    sleepText.match(/(?:average\s*bp|sleep\s*avg|avg)?[^\d]*(\d{2,3})\s*[\/\\]\s*(\d{2,3})/i) ||
    rawText.match(/(?:sleep\s*periods?[^\n]*\n[^\n]*\b)?(?:average\s*bp)?\s*[:\-\s]*(\d{2,3})\s*[\/\\]\s*(\d{2,3})\s*(?:mm\s*hg|mmhg)?/i);

  const sleepSysStats = parseStatsRow(sleepText, /systolic/i);
  const sleepDiaStats = parseStatsRow(sleepText, /diastolic/i);
  const sleepSys = sleepSysStats?.average || (sleepBpMatch ? parseInt(sleepBpMatch[1], 10) : null);
  const sleepDia = sleepDiaStats?.average || (sleepBpMatch ? parseInt(sleepBpMatch[2], 10) : null);

  const sleepSysLoad = findValue(sleepText || rawText, /(?:systolic\s*>|sys\s*>)\s*(?:120|limit)[^\d]*(\d+(?:\.\d+)?)\s*%/i);
  const sleepDiaLoad = findValue(sleepText || rawText, /(?:diastolic\s*>|dia\s*>)\s*(?:70|limit)[^\d]*(\d+(?:\.\d+)?)\s*%/i);

  if (sleepSys !== null || sleepDia !== null) {
    result.measurements.bloodPressure.sleep = {
      average: {
        systolic: sleepSys,
        diastolic: sleepDia,
        unit: 'mmHg',
      },
      systolic: sleepSysStats || { average: sleepSys, standardDeviation: null, minimum: null, maximum: null },
      diastolic: sleepDiaStats || { average: sleepDia, standardDeviation: null, minimum: null, maximum: null },
      loadAboveThreshold: {
        systolicPercent: sleepSysLoad,
        diastolicPercent: sleepDiaLoad,
      },
    };
  }

  // 4. Hypertension Indicators (Dipping, AASI, MSI, Overall Loads)
  const aasi = findValue(rawText, /(?:aasi|ambulatory\s*arterial\s*stiffness\s*index)\s*[:\-\s]*(\d+(?:\.\d+)?)/i);
  const msi = findValue(rawText, /(?:msi|morning\s*surge\s*index|morning\s*surge)\s*[:\-\s]*(\d+(?:\.\d+)?)/i);
  const sysDipping =
    systolicStats?.dippingPercent || findValue(rawText, /(?:systolic\s*dipping|dipping\s*sys)[^\d]*(\d+(?:\.\d+)?)\s*%/i);
  const diaDipping =
    diastolicStats?.dippingPercent || findValue(rawText, /(?:diastolic\s*dipping|dipping\s*dia)[^\d]*(\d+(?:\.\d+)?)\s*%/i);

  const sysOverallLoad = findValue(rawText, /(?:systolic\s*above\s*limits?|systolic\s*load)[^\d]*(\d+(?:\.\d+)?)\s*%/i);
  const diaOverallLoad = findValue(rawText, /(?:diastolic\s*above\s*limits?|diastolic\s*load)[^\d]*(\d+(?:\.\d+)?)\s*%/i);

  result.hypertensionIndicators = {
    systolicLoadPercent: sysOverallLoad,
    diastolicLoadPercent: diaOverallLoad,
    systolicDippingPercent: sysDipping,
    diastolicDippingPercent: diaDipping,
    aasi,
    msi,
  };

  // 5. Heart Rate & MAP & Pulse Pressure
  if (hrStats?.average) {
    result.measurements.heartRate = {
      overallAverage: {
        value: hrStats.average,
        standardDeviation: hrStats.standardDeviation,
        minimum: hrStats.minimum,
        maximum: hrStats.maximum,
        unit: 'BPM',
      },
    };
    result.canonicalVitals.heartRate = {
      value: hrStats.average,
      unit: 'BPM',
      confidence: calculateExtractionConfidence({ ocrEngineConfidence: ocrConfidence, exactLabelMatch: true, unitDetected: true }),
      validationStatus: validateBiomarkerRange('heartRate', hrStats.average, 'BPM').status,
      source: 'ABPM Heart Rate Table',
    };
  } else {
    const directHr = findValue(rawText, /(?:heart\s*rate|hr|pulse)\s*[:\-\s]*(\d{2,3})\s*(?:bpm)?/i);
    if (directHr) {
      result.measurements.heartRate = { overallAverage: { value: directHr, unit: 'BPM' } };
      result.canonicalVitals.heartRate = {
        value: directHr,
        unit: 'BPM',
        confidence: calculateExtractionConfidence({ ocrEngineConfidence: ocrConfidence, exactLabelMatch: true, unitDetected: true }),
        validationStatus: validateBiomarkerRange('heartRate', directHr, 'BPM').status,
        source: 'ABPM Heart Rate Summary',
      };
    }
  }

  if (mapStats?.average) {
    result.measurements.map = {
      overallAverage: {
        value: mapStats.average,
        standardDeviation: mapStats.standardDeviation,
        minimum: mapStats.minimum,
        maximum: mapStats.maximum,
        unit: 'mmHg',
      },
    };
  }

  if (pulsePressureStats?.average) {
    result.measurements.pulsePressure = {
      overallAverage: {
        value: pulsePressureStats.average,
        standardDeviation: pulsePressureStats.standardDeviation,
        minimum: pulsePressureStats.minimum,
        maximum: pulsePressureStats.maximum,
        unit: 'mmHg',
      },
    };
  }

  return result;
};

/**
 * General Laboratory Report entity extractor.
 * Supports Fasting Glucose, Blood Pressure, Total Cholesterol, Creatinine, Hemoglobin, BMI.
 * Preserves source traceability, unit conversion, and conflict detection.
 */
export const parseGeneralLabDocument = (rawText, ocrConfidence = 90) => {
  const lines = rawText.split('\n');
  const sections = detectDocumentSections(lines);

  const measurements = {};
  const canonicalVitals = {};
  const extractionWarnings = [];

  // Helper to extract candidates for a biomarker
  const extractCandidates = (patterns, fieldName) => {
    const candidates = [];

    lines.forEach((line, lineIdx) => {
      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match) {
          const rawValStr = match[1];
          let rawUnitStr = match[2] || null;
          if (!rawUnitStr) {
            const lineUnits = line.match(/(?:mg\/dl|mmol\/l|mmhg|g\/dl|gm\/dl|g\/l|kg\/m2|kg\/m²|bpm|µmol\/l|umol\/l|mill\/cumm|cumm|fl|pg|%)\b|%/i);
            if (lineUnits) rawUnitStr = lineUnits[0];
          }

          // Check for OCR typo (e.g. 1O8)
          const typoCheck = normalizeOcrNumericString(rawValStr);
          const valNum = typoCheck.value;
          if (valNum === null || isNaN(valNum)) continue;

          // Find containing section
          const section = sections.find((s) => lineIdx >= s.startIndex && lineIdx <= s.endIndex) || { name: 'General Lab' };

          // Safe unit conversion
          const converted = convertUnitSafely(fieldName, valNum, rawUnitStr);

          // Validation
          const validation = validateBiomarkerRange(fieldName, converted.normalizedValue, converted.normalizedUnit);

          const candidateConfidence = calculateExtractionConfidence({
            ocrEngineConfidence: ocrConfidence,
            exactLabelMatch: true,
            unitDetected: Boolean(converted.unit),
            ocrTypoCorrected: typoCheck.ocrTypoCorrected,
          });

          candidates.push({
            value: converted.normalizedValue,
            unit: converted.normalizedUnit || converted.unit,
            originalValue: valNum,
            originalUnit: converted.unit,
            rawText: typoCheck.originalText,
            ocrTypoCorrected: typoCheck.ocrTypoCorrected,
            conversionApplied: converted.conversionApplied,
            confidence: candidateConfidence,
            validationStatus: validation.status,
            warning: validation.status === VALIDATION_STATUS.WARNING ? validation.message : null,
            source: {
              section: section.name,
              label: line.trim(),
              context: `Line ${lineIdx + 1}`,
            },
          });
          break; // First match per line
        }
      }
    });

    return candidates;
  };

  // 1. Fasting Glucose / Blood Sugar
  const glucosePatterns = [
    /(?:fasting\s*(?:blood)?\s*(?:sugar|glucose)|fbs|glucose[,\s\-]+fasting|blood\s*sugar\s*\(?f\)?)(?:\s*\([a-z0-9\s]+\))?\s*[:\-\s]*([0-9OoIl]+(?:\.\d+)?)\s*(mg\/dl|mmol\/l|mg%)?/i,
    /(?:glucose|blood\s*sugar)(?:\s*\([a-z0-9\s]+\))?\s*[:\-\s]*([0-9OoIl]+(?:\.\d+)?)\s*(mg\/dl|mmol\/l|mg%)?/i,
  ];
  const glucoseCandidates = extractCandidates(glucosePatterns, CANONICAL_FIELDS.FASTING_GLUCOSE);
  const glucoseConflict = detectConflicts(glucoseCandidates);

  if (glucoseCandidates.length > 0) {
    const chosen = glucoseCandidates[0];
    if (glucoseConflict.hasConflict) {
      chosen.validationStatus = VALIDATION_STATUS.WARNING;
      chosen.warning = glucoseConflict.warningMessage;
      chosen.conflictingCandidates = glucoseConflict.distinctValues;
      extractionWarnings.push({ field: 'fastingGlucose', message: glucoseConflict.warningMessage });
    }
    measurements.fastingGlucose = chosen;
    canonicalVitals.fastingSugar = chosen.value;
    canonicalVitals.fastingGlucose = chosen;
  }

  // 2. Blood Pressure (e.g. 120/80 mmHg or Systolic: 120, Diastolic: 80)
  let bpFound = false;
  const bpRatioPatterns = [
    /(?:bp|blood\s*pressure|b\.p\.)(?:\s*\([a-z0-9\s]+\))?\s*[:\-\s]*([0-9OoIl]{2,3})\s*[\/\\]\s*([0-9OoIl]{2,3})\s*(mm\s*hg|mmhg)?/i,
    /(?:^|\s)([0-9OoIl]{2,3})\s*[\/\\]\s*([0-9OoIl]{2,3})\s*(?:mm\s*hg|mmhg)(?:\s|$)/i,
  ];

  for (const pattern of bpRatioPatterns) {
    const match = rawText.match(pattern);
    if (match) {
      const sysParsed = normalizeOcrNumericString(match[1]);
      const diaParsed = normalizeOcrNumericString(match[2]);

      if (sysParsed.value !== null && diaParsed.value !== null) {
        const sysVal = validateBiomarkerRange(CANONICAL_FIELDS.SYSTOLIC_BP, sysParsed.value, 'mmHg');
        const diaVal = validateBiomarkerRange(CANONICAL_FIELDS.DIASTOLIC_BP, diaParsed.value, 'mmHg');

        const conf = calculateExtractionConfidence({
          ocrEngineConfidence: ocrConfidence,
          exactLabelMatch: true,
          unitDetected: Boolean(match[3]),
          ocrTypoCorrected: sysParsed.ocrTypoCorrected || diaParsed.ocrTypoCorrected,
        });

        const sysEntry = {
          value: sysParsed.value,
          unit: 'mmHg',
          confidence: conf,
          validationStatus: sysVal.status,
          warning: sysVal.status === VALIDATION_STATUS.WARNING ? sysVal.message : null,
          source: { section: 'Vital Signs', label: 'Blood Pressure', context: 'Systolic' },
        };
        const diaEntry = {
          value: diaParsed.value,
          unit: 'mmHg',
          confidence: conf,
          validationStatus: diaVal.status,
          warning: diaVal.status === VALIDATION_STATUS.WARNING ? diaVal.message : null,
          source: { section: 'Vital Signs', label: 'Blood Pressure', context: 'Diastolic' },
        };

        measurements.bloodPressure = { systolic: sysEntry, diastolic: diaEntry };
        canonicalVitals.systolicBP = sysParsed.value;
        canonicalVitals.diastolicBP = diaParsed.value;
        bpFound = true;
        break;
      }
    }
  }

  // 3. Total Cholesterol
  const cholPatterns = [
    /(?:total\s*cholesterol|serum\s*cholesterol|cholesterol[,\s\-]+total|cholesterol)(?:\s*\([a-z0-9\s]+\))?\s*[:\-\s]*([0-9OoIl]+(?:\.\d+)?)\s*(mg\/dl|mmol\/l)?/i,
  ];
  const cholCandidates = extractCandidates(cholPatterns, CANONICAL_FIELDS.TOTAL_CHOLESTEROL);
  if (cholCandidates.length > 0) {
    const chosen = cholCandidates[0];
    measurements.totalCholesterol = chosen;
    canonicalVitals.totalCholesterol = chosen.value;
  }

  // 4. Serum Creatinine
  const creatPatterns = [
    /(?:serum\s*creatinine|s\.\s*creatinine|creatinine)(?:\s*\([a-z0-9\s]+\))?\s*[:\-\s]*([0-9OoIl]+(?:\.\d+)?)\s*(mg\/dl|µmol\/l|umol\/l)?/i,
  ];
  const creatCandidates = extractCandidates(creatPatterns, CANONICAL_FIELDS.CREATININE);
  if (creatCandidates.length > 0) {
    const chosen = creatCandidates[0];
    measurements.creatinine = chosen;
    canonicalVitals.serumCreatinine = chosen.value;
    canonicalVitals.creatinine = chosen;
  }

  // 5. Hemoglobin
  const hbPatterns = [
    /(?:hemoglobin|haemoglobin|hb|hgb)(?:\s*\([a-z0-9\s]+\))?\s*[:\-\s]*([0-9OoIl]+(?:\.\d+)?)\s*(g\/dl|gm\/dl|g\/l)?/i,
  ];
  const hbCandidates = extractCandidates(hbPatterns, CANONICAL_FIELDS.HEMOGLOBIN);
  if (hbCandidates.length > 0) {
    const chosen = hbCandidates[0];
    measurements.hemoglobin = chosen;
    canonicalVitals.hemoglobin = chosen.value;
  }

  // 6. Body Mass Index (BMI)
  const bmiPatterns = [
    /(?:body\s*mass\s*index|bmi)(?:\s*\([a-z0-9\s]+\))?\s*[:\-\s]*([0-9OoIl]+(?:\.\d+)?)\s*(kg\/m2|kg\/m²)?/i,
  ];
  const bmiCandidates = extractCandidates(bmiPatterns, CANONICAL_FIELDS.BMI);
  if (bmiCandidates.length > 0) {
    const chosen = bmiCandidates[0];
    measurements.bmi = chosen;
    canonicalVitals.bmi = chosen.value;
  }

  // 7. Heart Rate
  const hrPatterns = [
    /(?:heart\s*rate|hr|pulse|pulse\s*rate)(?:\s*\([a-z0-9\s]+\))?\s*[:\-\s]*([0-9OoIl]{2,3})\s*(bpm|beats\/min)?/i,
  ];
  const hrCandidates = extractCandidates(hrPatterns, CANONICAL_FIELDS.HEART_RATE);
  if (hrCandidates.length > 0) {
    const chosen = hrCandidates[0];
    measurements.heartRate = chosen;
    canonicalVitals.heartRate = chosen.value;
  }

  return {
    documentType: 'general_lab_report',
    measurements,
    canonicalVitals,
    structuredData: { ...canonicalVitals },
    extractionWarnings,
  };
};

// Complete Blood Count (CBC) Parameter Definitions
export const CBC_DEFINITIONS = [
  {
    field: 'hemoglobin',
    patterns: [/(?:hemoglobin(?:\s*\(hb\))?|haemoglobin|hb|hgb)\b/i],
    defaultUnit: 'g/dL',
    displayName: 'Hemoglobin (Hb)',
  },
  {
    field: 'rbcCount',
    patterns: [/(?:total\s*rbc\s*count|rbc\s*count|red\s*blood\s*cell\s*count|total\s*red\s*cell\s*count)\b/i, /\brbc\b/i],
    defaultUnit: 'mill/cumm',
    displayName: 'Total RBC count',
  },
  {
    field: 'wbcCount',
    patterns: [/(?:total\s*wbc\s*count|wbc\s*count|white\s*blood\s*cell\s*count|total\s*white\s*cell\s*count|total\s*leukocyte\s*count|total\s*leucocyte\s*count|tlc)\b/i, /\bwbc\b/i],
    defaultUnit: 'cumm',
    displayName: 'Total WBC count',
  },
  {
    field: 'neutrophils',
    patterns: [/\bneutrophils?\b/i],
    defaultUnit: '%',
    displayName: 'Neutrophils',
  },
  {
    field: 'lymphocytes',
    patterns: [/\blymphocytes?\b/i],
    defaultUnit: '%',
    displayName: 'Lymphocytes',
  },
  {
    field: 'eosinophils',
    patterns: [/\beosinophils?\b/i],
    defaultUnit: '%',
    displayName: 'Eosinophils',
  },
  {
    field: 'monocytes',
    patterns: [/\bmonocytes?\b/i],
    defaultUnit: '%',
    displayName: 'Monocytes',
  },
  {
    field: 'basophils',
    patterns: [/\bbasophils?\b/i],
    defaultUnit: '%',
    displayName: 'Basophils',
  },
  {
    field: 'plateletCount',
    patterns: [/(?:platelet\s*count|total\s*platelet\s*count|platelets?|thrombocyte\s*count|thrombocytes?)\b/i],
    defaultUnit: 'cumm',
    displayName: 'Platelet Count',
  },
  {
    field: 'pcv',
    patterns: [/(?:packed\s*cell\s*volume(?:\s*\(pcv\))?|pcv|hematocrit|haematocrit|hct)\b/i],
    defaultUnit: '%',
    displayName: 'Packed Cell Volume (PCV)',
  },
  {
    field: 'mcv',
    patterns: [/(?:mean\s*corpuscular\s*volume(?:\s*\(mcv\))?|\bmcv\b)/i],
    defaultUnit: 'fL',
    displayName: 'Mean Corpuscular Volume (MCV)',
  },
  {
    field: 'mch',
    patterns: [/(?:mean\s*corpuscular\s*hemoglobin(?:\s*\(mch\))?|\bmch\b)/i],
    defaultUnit: 'pg',
    displayName: 'MCH',
  },
  {
    field: 'mchc',
    patterns: [/(?:mean\s*corpuscular\s*hemoglobin\s*concentration(?:\s*\(mchc\))?|\bmchc\b)/i],
    defaultUnit: 'g/dL',
    displayName: 'MCHC',
  },
  {
    field: 'rdw',
    patterns: [/(?:red\s*cell\s*distribution\s*width|\brdw(?:[\-\s]*(?:cv|sd))?\b)/i],
    defaultUnit: '%',
    displayName: 'RDW',
  },
];

/**
 * Complete Blood Count (CBC) Specialized Document Extractor
 * Extracts all 14 standard CBC biomarkers with complete source traceability,
 * unit detection, validation, and strict separation from canonical vitals.
 */
export const parseCbcDocument = (rawText, ocrConfidence = 90) => {
  const lines = rawText.split('\n');
  const sections = detectDocumentSections(lines);

  const measurements = {};
  const structuredData = {};
  const extractionWarnings = [];

  const UNIT_REGEX = /(?:mill\/cumm|million\/cumm|cumm|\/cumm|cells\/cumm|10\^3\/[uµ]l|10\^6\/[uµ]l|g\/dl|gm\/dl|g\/l|fl|pg|%|percent)\b|%/i;

  for (const def of CBC_DEFINITIONS) {
    let bestCandidate = null;

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx];
      let matchedPattern = null;
      for (const p of def.patterns) {
        if (p.test(line)) {
          matchedPattern = p;
          break;
        }
      }
      if (!matchedPattern) continue;

      // Extract after matched pattern to avoid matching numbers in the label itself
      const matchIndex = line.search(matchedPattern);
      const matchedStr = line.match(matchedPattern)[0];
      const afterMatch = line.substring(matchIndex + matchedStr.length).trim();

      // Find first number after label
      const numMatch = afterMatch.match(/([0-9]+(?:\.[0-9]+)?)/);
      if (!numMatch) continue;

      const rawValStr = numMatch[1];
      const typoCheck = normalizeOcrNumericString(rawValStr);
      const valNum = typoCheck.value;
      if (valNum === null || isNaN(valNum)) continue;

      // Detect unit: check remainder of line, or whole line, or fallback to default
      const unitMatch = line.match(UNIT_REGEX);
      const rawUnitStr = unitMatch ? unitMatch[0] : def.defaultUnit;
      const normalizedUnitObj = normalizeUnit(rawUnitStr);
      const standardUnit = normalizedUnitObj.unit || def.defaultUnit;

      // Find containing section
      const section = sections.find((s) => lineIdx >= s.startIndex && lineIdx <= s.endIndex) || { name: 'Complete Blood Count' };
      const sectionName = (section.name === 'Header / General' || !section.name) ? 'Complete Blood Count' : section.name;

      // Clinical three-tier validation
      const validation = validateBiomarkerRange(def.field, valNum, standardUnit);

      const candidateConfidence = calculateExtractionConfidence({
        ocrEngineConfidence: ocrConfidence,
        exactLabelMatch: true,
        unitDetected: Boolean(unitMatch),
        ocrTypoCorrected: typoCheck.ocrTypoCorrected,
      });

      bestCandidate = {
        value: valNum,
        unit: standardUnit,
        originalValue: valNum,
        originalUnit: rawUnitStr,
        normalizedValue: valNum,
        normalizedUnit: standardUnit,
        rawText: line.trim(),
        confidence: candidateConfidence,
        validationStatus: validation.status,
        warning: validation.status === VALIDATION_STATUS.WARNING ? validation.message : null,
        source: {
          section: sectionName,
          label: def.displayName || matchedStr.trim(),
          context: `Line ${lineIdx + 1}`,
        },
      };

      break; // Stop after first valid line for this definition
    }

    if (bestCandidate) {
      measurements[def.field] = bestCandidate;
      structuredData[def.field] = bestCandidate.value;
      if (bestCandidate.warning) {
        extractionWarnings.push({ field: def.field, message: bestCandidate.warning });
      }
    }
  }

  // Canonical Vitals: strictly map only canonical profile vitals.
  // Missing vitals (systolicBP, diastolicBP, heartRate, fastingGlucose, totalCholesterol, serumCreatinine, bmi)
  // MUST remain null.
  const canonicalVitals = {
    systolicBP: null,
    diastolicBP: null,
    heartRate: null,
    fastingGlucose: null,
    totalCholesterol: null,
    serumCreatinine: null,
    hemoglobin: measurements.hemoglobin ? measurements.hemoglobin.value : null,
    bmi: null,
  };

  return {
    documentType: 'complete_blood_count',
    measurements,
    canonicalVitals,
    structuredData,
    extractionWarnings,
  };
};

/**
 * Master document understanding entry point.
 * Coordinates classification, section detection, specialized ABPM vs Lab parsers,
 * and builds the standard Structured Medical JSON.
 */
export const parseMedicalDocument = (rawOcrText, ocrMetadata = {}) => {
  if (!rawOcrText || typeof rawOcrText !== 'string' || rawOcrText.trim().length === 0) {
    return {
      document: {
        reportType: { value: 'unknown', confidence: 0 },
        reportDate: null,
        source: ocrMetadata.fileType || 'unknown',
      },
      patientContext: {},
      measurements: {},
      canonicalVitals: {},
      structuredData: {},
      sections: [],
      extractionWarnings: ['No OCR text available for parsing.'],
      overallConfidence: 0,
    };
  }

  const ocrConfidence = ocrMetadata.confidence || 88;
  const classification = classifyReportType(rawOcrText);
  const lines = rawOcrText.split('\n');
  const sections = detectDocumentSections(lines);

  let structuredResult;
  if (classification.value === 'ambulatory_blood_pressure_monitoring') {
    structuredResult = parseAbpmDocument(rawOcrText, ocrConfidence);
  } else if (classification.value === 'complete_blood_count') {
    structuredResult = parseCbcDocument(rawOcrText, ocrConfidence);
  } else {
    structuredResult = parseGeneralLabDocument(rawOcrText, ocrConfidence);
    // If general lab report also contains CBC biomarkers, augment measurements
    const cbcAugment = parseCbcDocument(rawOcrText, ocrConfidence);
    if (cbcAugment.measurements && Object.keys(cbcAugment.measurements).length > 0) {
      structuredResult.measurements = {
        ...structuredResult.measurements,
        ...cbcAugment.measurements,
      };
      structuredResult.structuredData = {
        ...(structuredResult.structuredData || {}),
        ...cbcAugment.structuredData,
      };
    }
  }

  // Calculate overall extraction confidence
  const confValues = [];
  if (structuredResult.measurements) {
    const collectConfidences = (obj) => {
      if (!obj || typeof obj !== 'object') return;
      if (typeof obj.confidence === 'number') confValues.push(obj.confidence);
      for (const k of Object.keys(obj)) {
        if (typeof obj[k] === 'object') collectConfidences(obj[k]);
      }
    };
    collectConfidences(structuredResult.measurements);
  }

  const overallConfidence =
    confValues.length > 0
      ? Math.round((confValues.reduce((a, b) => a + b, 0) / confValues.length) * 100) / 100
      : Math.round((classification.confidence || 0.5) * 100) / 100;

  return {
    document: {
      reportType: classification,
      reportDate: null,
      source: ocrMetadata.fileType || 'medical_report',
    },
    patientContext: extractPatientContext(rawOcrText),
    measurements: structuredResult.measurements || {},
    hypertensionIndicators: structuredResult.hypertensionIndicators || null,
    canonicalVitals: structuredResult.canonicalVitals || {},
    structuredData: structuredResult.structuredData || {},
    sections: sections.map((s) => ({ name: s.name, lineCount: s.lines.length })),
    extractionWarnings: structuredResult.extractionWarnings || [],
    overallConfidence,
  };
};
