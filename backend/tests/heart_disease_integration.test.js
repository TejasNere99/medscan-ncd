import { buildHeartDiseaseFeatures } from '../src/services/heartDiseaseFeatureBuilder.js';
import { callHeartDiseasePredictionService, checkHeartDiseaseServiceHealth } from '../src/services/heartDiseasePredictionService.js';

describe('Phase 7D: Heart Disease (Framingham 10-Year CHD) End-to-End Integration Tests', () => {

  // =========================================================================
  // 1. MINIMUM INPUT POLICY & HUMAN-IN-THE-LOOP CONFIRMATION GATE
  // =========================================================================

  test('TEST 1: Missing total cholesterol prevents prediction calculation (Minimum Input Policy)', () => {
    const report = {
      status: 'CONFIRMED',
      confirmedData: {
        systolicBP: { value: 130, unit: 'mmHg' },
        diastolicBP: { value: 85, unit: 'mmHg' },
      },
    };
    const patient = { age: 48, gender: 'Male' };
    const extraction = buildHeartDiseaseFeatures(report, patient);

    expect(extraction.canCalculate).toBe(false);
    expect(extraction.status).toBe('INSUFFICIENT_DATA');
    expect(extraction.missingRequired).toContain('totChol');
  });

  test('TEST 2: Missing blood pressure prevents calculation', () => {
    const report = {
      status: 'CONFIRMED',
      confirmedData: {
        totalCholesterol: { value: 220, unit: 'mg/dL' },
      },
    };
    const patient = { age: 50, gender: 'Female' };
    const extraction = buildHeartDiseaseFeatures(report, patient);

    expect(extraction.canCalculate).toBe(false);
    expect(extraction.missingRequired).toContain('sysBP');
    expect(extraction.missingRequired).toContain('diaBP');
  });

  test('TEST 3: Missing age or biological sex prevents calculation', () => {
    const report = {
      status: 'CONFIRMED',
      confirmedData: {
        totalCholesterol: { value: 210, unit: 'mg/dL' },
        systolicBP: { value: 125, unit: 'mmHg' },
        diastolicBP: { value: 80, unit: 'mmHg' },
      },
    };
    const patientWithoutAge = { gender: 'Male' };
    const extraction = buildHeartDiseaseFeatures(report, patientWithoutAge);

    expect(extraction.canCalculate).toBe(false);
    expect(extraction.missingRequired).toContain('age');
  });

  test('TEST 4: All 5 required vitals present satisfies Minimum Input Policy', () => {
    const report = {
      status: 'CONFIRMED',
      confirmedData: {
        totalCholesterol: { value: 215, unit: 'mg/dL' },
        systolicBP: { value: 135, unit: 'mmHg' },
        diastolicBP: { value: 88, unit: 'mmHg' },
      },
    };
    const patient = { age: 52, gender: 'Male' };
    const extraction = buildHeartDiseaseFeatures(report, patient);

    expect(extraction.canCalculate).toBe(true);
    expect(extraction.status).toBe('SUCCESS');
    expect(extraction.missingRequired).toHaveLength(0);
    expect(extraction.featureVector.age).toBe(52);
    expect(extraction.featureVector.sex).toBe(1);
    expect(extraction.featureVector.totChol).toBe(215);
    expect(extraction.featureVector.sysBP).toBe(135);
    expect(extraction.featureVector.diaBP).toBe(88);
  });

  test('TEST 5: Unconfirmed report NEVER enters feature builder', () => {
    const unconfirmedReport = {
      status: 'PENDING_REVIEW',
      confirmedData: {
        totalCholesterol: { value: 240, unit: 'mg/dL' },
        systolicBP: { value: 140, unit: 'mmHg' },
        diastolicBP: { value: 90, unit: 'mmHg' },
      },
    };
    const patient = { age: 55, gender: 'Male' };
    const extraction = buildHeartDiseaseFeatures(unconfirmedReport, patient);

    expect(extraction.canCalculate).toBe(false);
    expect(extraction.featureVector.totChol).toBeNull();
    expect(extraction.featureVector.sysBP).toBeNull();
  });

  // =========================================================================
  // 2. SMOKING STATUS MISSINGNESS & PROVENANCE (STRICT RULE #2)
  // =========================================================================

  test('TEST 6: Missing currentSmoker is NOT defaulted to 0; maintains provenance with value: null', () => {
    const report = {
      status: 'CONFIRMED',
      confirmedData: {
        totalCholesterol: { value: 200, unit: 'mg/dL' },
        systolicBP: { value: 120, unit: 'mmHg' },
        diastolicBP: { value: 80, unit: 'mmHg' },
      },
    };
    const patient = { age: 40, gender: 'Female' };
    const extraction = buildHeartDiseaseFeatures(report, patient);

    expect(extraction.featureVector.currentSmoker).toBeNull();
    expect(extraction.featureVector.currentSmoker).not.toBe(0);
    expect(extraction.provenance.currentSmoker.value).toBeNull();
    expect(extraction.provenance.currentSmoker.source).toBe('missing');
    expect(extraction.provenance.currentSmoker.verified).toBe(false);
  });

  test('TEST 7: Explicit smoker affirmation correctly normalizes to 1 with verified provenance', () => {
    const report = {
      status: 'CONFIRMED',
      confirmedData: {
        totalCholesterol: { value: 210, unit: 'mg/dL' },
        systolicBP: { value: 130, unit: 'mmHg' },
        diastolicBP: { value: 85, unit: 'mmHg' },
        smoking: { value: 'smoker', source: 'report' },
      },
    };
    const patient = { age: 45, gender: 'Male' };
    const extraction = buildHeartDiseaseFeatures(report, patient);

    expect(extraction.featureVector.currentSmoker).toBe(1);
    expect(extraction.provenance.currentSmoker.value).toBe(1);
    expect(extraction.provenance.currentSmoker.verified).toBe(true);
  });

  test('TEST 8: Explicit non-smoker negation normalizes to 0 with verified provenance', () => {
    const report = {
      status: 'CONFIRMED',
      confirmedData: {
        totalCholesterol: { value: 195, unit: 'mg/dL' },
        systolicBP: { value: 118, unit: 'mmHg' },
        diastolicBP: { value: 76, unit: 'mmHg' },
      },
    };
    const patient = { age: 39, gender: 'Female', isCurrentSmoker: false };
    const extraction = buildHeartDiseaseFeatures(report, patient);

    expect(extraction.featureVector.currentSmoker).toBe(0);
    expect(extraction.provenance.currentSmoker.value).toBe(0);
    expect(extraction.provenance.currentSmoker.source).toBe('profile');
    expect(extraction.provenance.currentSmoker.verified).toBe(true);
  });

  // =========================================================================
  // 3. OPTIONAL FEATURES IMPUTATION & COMPLETENESS CONTRACT
  // =========================================================================

  test('TEST 9: Missing optional features (BMI, glucose, currentSmoker) set dataCompleteness to PARTIAL', () => {
    const report = {
      status: 'CONFIRMED',
      confirmedData: {
        totalCholesterol: { value: 220, unit: 'mg/dL' },
        systolicBP: { value: 130, unit: 'mmHg' },
        diastolicBP: { value: 85, unit: 'mmHg' },
      },
    };
    const patient = { age: 50, gender: 'Male' };
    const extraction = buildHeartDiseaseFeatures(report, patient);

    expect(extraction.canCalculate).toBe(true);
    expect(extraction.dataCompleteness).toBe('PARTIAL');
    expect(extraction.missingFeatures).toContain('BMI');
    expect(extraction.missingFeatures).toContain('glucose');
    expect(extraction.missingFeatures).toContain('currentSmoker');
  });

  test('TEST 10: Complete 8-feature panel yields dataCompleteness = FULL', () => {
    const report = {
      status: 'CONFIRMED',
      confirmedData: {
        totalCholesterol: { value: 218, unit: 'mg/dL' },
        systolicBP: { value: 142, unit: 'mmHg' },
        diastolicBP: { value: 84, unit: 'mmHg' },
        fastingSugar: { value: 108, unit: 'mg/dL' },
        bmi: { value: 27.4, unit: 'kg/m²' },
        smoking: { value: '1', source: 'report' },
      },
    };
    const patient = { age: 52, gender: 'Male' };
    const extraction = buildHeartDiseaseFeatures(report, patient);

    expect(extraction.canCalculate).toBe(true);
    expect(extraction.dataCompleteness).toBe('FULL');
    expect(extraction.missingFeatures).toHaveLength(0);
  });

  // =========================================================================
  // 4. LIVE FASTAPI MICROSERVICE INFERENCE & CALIBRATION CONTRACT
  // =========================================================================

  test('TEST 11: FastAPI health check reports Heart Disease model and preprocessor loaded', async () => {
    const health = await checkHeartDiseaseServiceHealth();
    expect(health.available).toBe(true);
    expect(health.modelLoaded).toBe(true);
    expect(health.preprocessorLoaded).toBe(true);
    expect(health.threshold).toBe(0.110);
  });

  test('TEST 12: Acceptance Test with synthetic patient (Age 52, Male, totChol 218, sysBP 142, diaBP 84, BMI 27.4, glucose 108, Smoker 1)', async () => {
    const featureVector = {
      age: 52,
      sex: 1,
      totChol: 218,
      sysBP: 142,
      diaBP: 84,
      BMI: 27.4,
      glucose: 108,
      currentSmoker: 1,
    };

    const res = await callHeartDiseasePredictionService(featureVector);

    expect(res.success).toBe(true);
    expect(res.disease).toBe('heart_disease');
    expect(res.canCalculate).toBe(true);
    expect(typeof res.probability).toBe('number');
    expect(res.probability).toBeGreaterThan(0);
    expect(res.probability).toBeLessThan(1);
    expect(res.threshold).toBe(0.110);

    // Development threshold evaluation
    if (res.probability > 0.110) {
      expect(res.riskCategory).toBe('ELEVATED_MODEL_ESTIMATED_RISK');
    } else {
      expect(res.riskCategory).toBe('LOWER_MODEL_ESTIMATED_RISK');
    }
  });

  test('TEST 13: Optional features null values are imputed by FastAPI preprocessor without throwing', async () => {
    const partialFeatureVector = {
      age: 48,
      sex: 0,
      totChol: 195,
      sysBP: 122,
      diaBP: 78,
      BMI: null,
      glucose: null,
      currentSmoker: null,
    };

    const res = await callHeartDiseasePredictionService(partialFeatureVector);

    expect(res.success).toBe(true);
    expect(res.canCalculate).toBe(true);
    expect(typeof res.probability).toBe('number');
    expect(res.dataCompleteness).toBe('PARTIAL');
  });

  test('TEST 14: Linear factor contributions use non-causal phrasing ("contributed toward")', async () => {
    const featureVector = {
      age: 62,
      sex: 1,
      totChol: 260,
      sysBP: 160,
      diaBP: 95,
      BMI: 31.0,
      glucose: 140,
      currentSmoker: 1,
    };

    const res = await callHeartDiseasePredictionService(featureVector);

    expect(res.success).toBe(true);
    expect(Array.isArray(res.topContributingFactors)).toBe(true);
    expect(res.topContributingFactors.length).toBeGreaterThan(0);

    res.topContributingFactors.forEach((factor) => {
      expect(factor.description).toMatch(/contributed toward (higher|lower) model-estimated risk/i);
      expect(factor.description).not.toMatch(/caused|proves|guarantees/i);
    });
  });

  test('TEST 15: Zero SHAP label in user-facing model response metadata', async () => {
    const featureVector = {
      age: 50,
      sex: 0,
      totChol: 210,
      sysBP: 130,
      diaBP: 80,
      BMI: 25.0,
      glucose: 90,
      currentSmoker: 0,
    };

    const res = await callHeartDiseasePredictionService(featureVector);
    const jsonStr = JSON.stringify(res);

    // Strict Rule #3: Do NOT expose SHAP acronym in user-facing fields
    expect(jsonStr).not.toMatch(/"shap"/i);
    expect(jsonStr).not.toMatch(/"TreeSHAP"/i);
  });

  test('TEST 16: Clinical disclaimer is non-diagnostic', async () => {
    const featureVector = {
      age: 55,
      sex: 1,
      totChol: 225,
      sysBP: 138,
      diaBP: 86,
      BMI: null,
      glucose: null,
      currentSmoker: null,
    };

    const res = await callHeartDiseasePredictionService(featureVector);
    expect(res.clinicalDisclaimer).toMatch(/non-diagnostic/i);
    expect(res.clinicalDisclaimer).toMatch(/does not replace comprehensive clinical examination/i);
  });

  test('TEST 17: Extreme clinical ranges reject gracefully in microservice validation', async () => {
    const invalidVector = {
      age: 150, // exceeds biologically plausible human lifespan
      sex: 1,
      totChol: 210,
      sysBP: 130,
      diaBP: 80,
      BMI: 25.0,
      glucose: 90,
      currentSmoker: 0,
    };

    const res = await callHeartDiseasePredictionService(invalidVector);
    expect(res.canCalculate).toBe(false);
  });
});
