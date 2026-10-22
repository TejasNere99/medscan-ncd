import { buildCkdFeatures, buildHypertensionFeatures } from '../src/services/newDiseaseFeatureBuilder.js';

describe('new disease feature builders', () => {
  test('hypertension uses required confirmed profile data and omits BP fields', () => {
    const result = buildHypertensionFeatures([], { age: 52, gender: 'female', systolicBP: 160, diastolicBP: 95 });
    expect(result.canCalculate).toBe(true);
    expect(result.featureVector.age).toBe(52);
    expect(result.featureVector.sex).toBe(0);
    expect(Object.keys(result.featureVector)).not.toContain('systolic_bp');
    expect(Object.keys(result.featureVector)).not.toContain('diastolic_bp');
  });

  test('CKD consumes only the selected ordered schema and confirmed values', () => {
    const features = ['age', 'serum_creatinine'];
    const unconfirmedReport = {
      _id: 'unconfirmed',
      status: 'PENDING_REVIEW',
      confirmedData: { bloodUrea: { value: 50, verified: true, unit: 'mg/dL' } },
    };
    const patient = { age: 44, serumCreatinine: 1.7, bloodUrea: 52 };
    const result = buildCkdFeatures([unconfirmedReport], patient, features);
    expect(Object.keys(result.featureVector)).toEqual(features);
    expect(result.featureVector).toEqual({ age: 44, serum_creatinine: 1.7 });
    expect(result.canCalculate).toBe(true);
  });

  test('missing required CKD features are not fabricated from OCR context', () => {
    const result = buildCkdFeatures([{
      status: 'PENDING_REVIEW',
      patientContext: { age: 60 },
      extractedData: { serumCreatinine: 2.1 },
    }], {}, ['age', 'serum_creatinine']);
    expect(result.canCalculate).toBe(false);
    expect(result.featureVector).toEqual({ age: null, serum_creatinine: null });
    expect(result.missingRequired).toEqual(['age', 'serum_creatinine']);
  });

  test('confirmed total blood urea is normalized; BUN remains distinct', () => {
    const reports = [{
      _id: 'confirmed',
      status: 'CONFIRMED',
      confirmedData: { measurements: {
        bloodUrea: { value: 10, unit: 'mmol/L', verified: true, source: 'manual_correction' },
        bloodUreaNitrogen: { value: 22, unit: 'mg/dL', verified: true },
      } },
    }];
    const result = buildCkdFeatures(reports, { age: 50, serumCreatinine: 1.4 }, ['age', 'serum_creatinine', 'blood_urea']);
    expect(result.featureVector.blood_urea).toBeCloseTo(60.06, 2);
    expect(result.provenance.blood_urea.conversionApplied).toBe(true);
    expect(result.featureVector).not.toHaveProperty('blood_urea_nitrogen');
  });
});
