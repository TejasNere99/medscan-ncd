import { buildDiabetesFeatures } from '../src/services/diabetesFeatureBuilder.js';
import { validateBiomarkerRange, VALIDATION_STATUS } from '../src/services/medicalValidation.js';

describe('Human-in-the-Loop OCR Value Editing & Data Integrity', () => {
  test('TEST 1: Unedited extraction produces confirmed source = "report"', () => {
    const report = {
      status: 'CONFIRMED',
      confirmedData: {
        bmi: { value: 24.5, unit: 'kg/m²', source: 'report' },
      },
    };
    const patient = { age: 35, gender: 'Male', bmi: 24.5 };
    const res = buildDiabetesFeatures(report, patient);
    expect(res.featureAvailability.provenance.bmi).toBe('report');
    expect(res.featureAvailability.featureDetails.bmi.sourceLabel).toBe('Found in this report');
  });

  test('TEST 2: Edited extraction produces confirmed source = "manual_correction"', () => {
    const report = {
      status: 'CONFIRMED',
      confirmedData: {
        bmi: { value: 29.4, unit: 'kg/m²', source: 'manual_correction' },
      },
    };
    const patient = { age: 45, gender: 'Male', bmi: 29.4 };
    const res = buildDiabetesFeatures(report, patient);
    expect(res.featureVector.bmi).toBe(29.4);
    expect(res.featureAvailability.provenance.bmi).toBe('manual_correction');
    expect(res.featureAvailability.featureDetails.bmi.sourceLabel).toBe('Corrected manually');
  });

  test('TEST 3: Unconfirmed edit NEVER enters ML feature builder', () => {
    const unconfirmedReport = {
      status: 'PENDING_REVIEW',
      rawOcrText: 'BMI: 32.4 kg/m2',
      initialExtraction: {
        canonicalVitals: { bmi: { value: 32.4, unit: 'kg/m²' } },
      },
      extractedData: {
        canonicalVitals: { bmi: { value: 29.4, unit: 'kg/m²' } },
      },
      confirmedData: {},
    };
    const patientWithoutEdit = { age: 45, gender: 'Male', bmi: null };

    const res = buildDiabetesFeatures(unconfirmedReport, patientWithoutEdit);
    expect(res.featureVector.bmi).toBeNull();
    expect(res.featureVector.bmi).not.toBe(29.4);
  });

  test('TEST 4: Confirmed edit enters feature builder with updated patient snapshot', () => {
    const confirmedReport = {
      status: 'CONFIRMED',
      rawOcrText: 'BMI: 32.4 kg/m2',
      initialExtraction: {
        canonicalVitals: { bmi: { value: 32.4, unit: 'kg/m²' } },
      },
      confirmedData: {
        bmi: { value: 29.4, unit: 'kg/m²', source: 'manual_correction', originalValue: 32.4 },
        systolicBP: { value: 126, unit: 'mmHg', source: 'manual_correction', originalValue: 140 },
        diastolicBP: { value: 82, unit: 'mmHg', source: 'manual_correction', originalValue: 90 },
        totalCholesterol: { value: 195, unit: 'mg/dL', source: 'manual_correction', originalValue: 220 },
        hdl: { value: 48, unit: 'mg/dL', source: 'manual_correction', originalValue: 38 },
        serumCreatinine: { value: 0.95, unit: 'mg/dL', source: 'manual_correction', originalValue: 1.3 },
      },
    };
    const patientWithEdit = {
      age: 45,
      gender: 'Male',
      bmi: 29.4,
      systolicBP: 126,
      diastolicBP: 82,
      totalCholesterol: 195,
      hdl: 48,
      serumCreatinine: 0.95,
    };

    const res = buildDiabetesFeatures(confirmedReport, patientWithEdit);
    expect(res.canCalculate).toBe(true);
    expect(res.featureVector.bmi).toBe(29.4);
    expect(res.featureVector.systolic_bp).toBe(126);
    expect(res.featureVector.diastolic_bp).toBe(82);
    expect(res.featureVector.total_cholesterol).toBe(195);
    expect(res.featureVector.hdl).toBe(48);
    expect(res.featureVector.creatinine).toBe(0.95);
    expect(res.featureAvailability.provenance.bmi).toBe('manual_correction');
  });

  test('TEST 5: Validation rejects non-numeric and negative values', () => {
    const invalidText = validateBiomarkerRange('bmi', 'invalid_str', 'kg/m²');
    expect(invalidText.status).toBe(VALIDATION_STATUS.INVALID);

    const negativeNum = validateBiomarkerRange('bmi', -10, 'kg/m²');
    expect(negativeNum.status).toBe(VALIDATION_STATUS.INVALID);

    const negativeBP = validateBiomarkerRange('systolicBP', -120, 'mmHg');
    expect(negativeBP.status).toBe(VALIDATION_STATUS.INVALID);
  });

  test('TEST 6: Validation issues WARNING without rejection for extreme values', () => {
    const extremeBmi = validateBiomarkerRange('bmi', 75, 'kg/m²');
    expect(extremeBmi.status).toBe(VALIDATION_STATUS.WARNING);

    const extremeSys = validateBiomarkerRange('systolicBP', 240, 'mmHg');
    expect(extremeSys.status).toBe(VALIDATION_STATUS.WARNING);

    const extremeChol = validateBiomarkerRange('totalCholesterol', 500, 'mg/dL');
    expect(extremeChol.status).toBe(VALIDATION_STATUS.WARNING);

    const extremeHdl = validateBiomarkerRange('hdl', 180, 'mg/dL');
    expect(extremeHdl.status).toBe(VALIDATION_STATUS.WARNING);
  });

  test('TEST 7: Manual addition is distinguishable from correction', () => {
    const reportWithAddition = {
      status: 'CONFIRMED',
      confirmedData: {
        hdl: { value: 55, unit: 'mg/dL', source: 'manual', originalValue: null },
      },
    };
    const patient = { age: 45, gender: 'Male' };
    const res = buildDiabetesFeatures(reportWithAddition, patient);
    expect(res.featureAvailability.provenance.hdl).toBe('manual');
    expect(res.featureAvailability.featureDetails.hdl.sourceLabel).toBe('Added manually');
  });
});
