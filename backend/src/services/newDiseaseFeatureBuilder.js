const numeric = (entry) => {
  if (entry === null || entry === undefined || entry === '') return null;
  const raw = typeof entry === 'object' ? entry.value : entry;
  if (raw === null || raw === undefined || raw === '') return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
};

const isVerified = (entry) => Boolean(entry && typeof entry === 'object' && entry.verified === true);

const latestConfirmedValue = (reports, key, aliases = []) => {
  for (const report of reports || []) {
    if (report?.status !== 'CONFIRMED') continue;
    const confirmed = report.confirmedData || {};
    for (const field of [key, ...aliases]) {
      const entry = confirmed.measurements?.[field] ?? confirmed[field];
      if (!isVerified(entry)) continue;
      const value = numeric(entry);
      if (value === null) continue;
      return {
        value,
        source: entry.source || 'confirmed_report',
        verified: true,
        unit: entry.unit || null,
        reportId: String(report._id),
      };
    }
  }
  return null;
};

const profileValue = (patient, key, valid) => {
  const value = numeric(patient?.[key]);
  return value !== null && valid(value)
    ? { value, source: 'confirmed_profile_snapshot', verified: true }
    : null;
};

const sexValue = (value) => {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (['male', 'm', '1'].includes(normalized)) return { value: 1, source: 'profile', verified: true };
  if (['female', 'f', '0'].includes(normalized)) return { value: 0, source: 'profile', verified: true };
  return null;
};

const resolveField = (reports, patient, key, aliases, patientKey, valid) => {
  const reportValue = latestConfirmedValue(reports, key, aliases);
  if (reportValue && valid(reportValue.value)) return reportValue;
  return patientKey ? profileValue(patient, patientKey, valid) : null;
};

export function buildHypertensionFeatures(reports, patient) {
  const fields = {
    age: profileValue(patient, 'age', (v) => v >= 16 && v <= 130),
    sex: sexValue(patient?.gender),
    bmi: resolveField(reports, patient, 'bmi', [], 'bmi', (v) => v > 0),
    fasting_glucose: resolveField(reports, patient, 'fastingSugar', ['fastingGlucose'], 'fastingSugar', (v) => v > 0),
    total_cholesterol: resolveField(reports, patient, 'totalCholesterol', ['cholesterol'], 'totalCholesterol', (v) => v > 0),
    hdl: resolveField(reports, patient, 'hdl', ['hdlCholesterol'], 'hdl', (v) => v > 0),
    serum_creatinine: resolveField(reports, patient, 'serumCreatinine', ['creatinine'], 'serumCreatinine', (v) => v > 0),
    heart_rate: resolveField(reports, patient, 'heartRate', [], 'heartRate', (v) => v > 0),
    current_smoker: typeof patient?.isCurrentSmoker === 'boolean'
      ? { value: patient.isCurrentSmoker ? 1 : 0, source: 'profile', verified: true }
      : latestConfirmedValue(reports, 'currentSmoker'),
  };
  const featureVector = Object.fromEntries(Object.entries(fields).map(([key, entry]) => [key, entry?.value ?? null]));
  const provenance = Object.fromEntries(Object.entries(fields).map(([key, entry]) => [key, entry || { source: 'missing', verified: false }]));
  const missingRequired = ['age', 'sex'].filter((key) => featureVector[key] === null);
  return {
    featureVector,
    provenance,
    missingRequired,
    canCalculate: missingRequired.length === 0,
    dataCompleteness: Object.values(featureVector).every((v) => v !== null) ? 'FULL' : 'PARTIAL',
  };
}

export function buildCkdFeatures(reports, patient, orderedFeatures) {
  const age = profileValue(patient, 'age', (v) => v >= 0 && v <= 130);
  const creatinine = resolveField(reports, patient, 'serumCreatinine', ['creatinine'], 'serumCreatinine', (v) => v > 0);
  const urea = resolveField(reports, patient, 'bloodUrea', [], 'bloodUrea', (v) => v > 0);
  let ureaMgDl = urea;
  if (urea && urea.unit === 'mmol/L') {
    ureaMgDl = { ...urea, value: Math.round(urea.value * 6.006 * 100) / 100, normalizedUnit: 'mg/dL', conversionApplied: true };
  } else if (urea && urea.unit && urea.unit !== 'mg/dL') {
    ureaMgDl = null;
  }

  const approved = {
    age,
    serum_creatinine: creatinine,
    blood_urea: ureaMgDl,
    // UCI's blood pressure semantics are not mapped to systolic/diastolic fields.
    blood_pressure: null,
    // UCI bgr is random glucose; fasting-only app profile values are not substituted.
    blood_glucose: null,
    // UCI documents hemo in "gms" without a denominator; no unverified unit conversion.
    hemoglobin: null,
  };
  const featureVector = Object.fromEntries(orderedFeatures.map((key) => [key, approved[key]?.value ?? null]));
  const provenance = Object.fromEntries(orderedFeatures.map((key) => [
    key,
    approved[key] || { source: 'missing_or_unmapped', verified: false },
  ]));
  const missingRequired = ['age', 'serum_creatinine'].filter((key) => featureVector[key] === null);
  return {
    featureVector,
    provenance,
    missingRequired,
    canCalculate: missingRequired.length === 0,
    dataCompleteness: Object.values(featureVector).every((v) => v !== null) ? 'FULL' : 'PARTIAL',
  };
}
