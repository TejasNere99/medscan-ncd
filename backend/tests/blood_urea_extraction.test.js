import { parseGeneralLabDocument } from '../src/services/medicalReportParser.js';
import { CANONICAL_FIELDS, convertUnitSafely, normalizeUnit } from '../src/services/medicalNormalizer.js';
import { validateBiomarkerRange } from '../src/services/medicalValidation.js';

describe('blood urea parsing and units', () => {
  test.each([
    ['Blood Urea: 30 mg/dL', 30],
    ['Serum Urea 42 mg/dL', 42],
    ['Urea: 8 mmol/L', 48.05],
  ])('extracts unambiguous total urea: %s', (line, expected) => {
    const parsed = parseGeneralLabDocument(line);
    expect(parsed.canonicalVitals.bloodUrea.value).toBeCloseTo(expected, 1);
    expect(parsed.measurements.bloodUrea.unit).toBe('mg/dL');
    expect(parsed.measurements.bloodUrea.source.label).toContain(line.split(/[:\s]/)[0]);
  });

  test('keeps BUN separate from total blood urea', () => {
    const parsed = parseGeneralLabDocument('Blood Urea Nitrogen: 22 mg/dL\nBUN: 18 mg/dL');
    expect(parsed.canonicalVitals.bloodUrea).toBeUndefined();
    expect(parsed.measurements.bloodUrea).toBeUndefined();
    expect(parsed.measurements.bloodUreaNitrogen.value).toBe(22);
  });

  test('does not create a value when the analyte is absent', () => {
    const parsed = parseGeneralLabDocument('Serum creatinine: 1.1 mg/dL');
    expect(parsed.canonicalVitals.bloodUrea).toBeUndefined();
  });

  test('rejects negative values and retains extreme positive values with a warning', () => {
    const negative = parseGeneralLabDocument('Blood Urea: -5 mg/dL');
    expect(negative.canonicalVitals.bloodUrea).toBeUndefined();
    expect(negative.extractionWarnings.some((item) => item.field === 'bloodUrea')).toBe(true);

    const extreme = parseGeneralLabDocument('Blood Urea: 450 mg/dL');
    expect(extreme.canonicalVitals.bloodUrea.value).toBe(450);
    expect(extreme.canonicalVitals.bloodUrea.validationStatus).toBe('WARNING');
  });

  test('recognizes units and converts urea but never aliases BUN', () => {
    expect(normalizeUnit('mmol/L').unit).toBe('mmol/L');
    const urea = convertUnitSafely(CANONICAL_FIELDS.BLOOD_UREA, 10, 'mmol/L');
    expect(urea.normalizedValue).toBeCloseTo(60.06, 2);
    expect(urea.normalizedUnit).toBe('mg/dL');
    const bun = convertUnitSafely(CANONICAL_FIELDS.BLOOD_UREA_NITROGEN, 10, 'mg/dL');
    expect(bun.normalizedValue).toBe(10);
    expect(bun.normalizedUnit).toBe('mg/dL');
  });

  test('numeric and extreme-value validation is unit-aware', () => {
    expect(validateBiomarkerRange('bloodUrea', -1, 'mg/dL').status).toBe('INVALID');
    expect(validateBiomarkerRange('bloodUrea', 50, 'mmol/L').status).toBe('VALID');
    expect(validateBiomarkerRange('bloodUrea', 450, 'mg/dL').status).toBe('WARNING');
  });
});
