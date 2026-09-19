import { parseMedicalDocument, extractPatientContext, detectDocumentSections } from '../src/services/medicalReportParser.js';
import { VALIDATION_STATUS } from '../src/services/medicalValidation.js';

describe('Complete Blood Count (CBC) Medical Intelligence Parser', () => {
  const drlogyCbcOcrText = `
Smart Pathology Laboratory
Drlogy.com
BLOOD INDICES
Packed Cell Volume (PCV) \t57.5 \tHigh \t40 - 50 \t%
Mean Corpuscular Volume (MCV) \t87.75 \t83 - 101 \tfL
MCH \t27.2 \t27 - 32 \tpg
MCHC \t32.8 \t32.5 - 34.5 \tg/dL
RDW \t13.6 \t11.6 - 14.0 \t%
Dr. Vimal Shah
(MD, Pathologist)
Medical Lab Technician
(DMLT, BMLT)
Dr. Payal Shah
(MD, Pathologist)
Yash M. Patel
Age : 21 Years
Sex : Male
PID : 555
Sample Collected At:
125, Shivam Bungalow, S G Road,
Mumbai
Ref. By: \tDr. Hiren Shah
Investigation \tResult \tReference Value \tUnit
Primary Sample Type : \tBlood
Complete Blood Count (CBC)
HEMOGLOBIN
Hemoglobin (Hb) \t12.5 \tLow 13.0 - 17.0 \tg/dL
RBC COUNT
Total RBC count \t5.2 \t4.5 - 5.5 \tmill/cumm
WBC COUNT
Total WBC count \t9000 \t4000-11000 \tcumm
DIFFERENTIAL WBC COUNT
Neutrophils \t60 \t50 - 62 \t%
Lymphocytes \t31 \t20 - 40 \t%
Eosinophils \t1 \t00 - 06 \t%
Monocytes \t7 \t00 - 10 \t%
Basophils \t1 \t00 - 02 \t%
PLATELET COUNT
Platelet Count \t150000 \tBorderline 150000 - 410000 \tcumm
Instruments: Fully automated cell counter - Mindray 300
Interpretation: Further confirm for Anemia
Thanks for Reference \t****End of Report****
  `;

  test('Document Type Classification identifies complete_blood_count', () => {
    const parsed = parseMedicalDocument(drlogyCbcOcrText, { confidence: 95 });
    expect(parsed.document.reportType.value).toBe('complete_blood_count');
    expect(parsed.document.reportType.confidence).toBeGreaterThan(0.85);
  });

  test('Patient Context extracts Age 21 years and Sex male without fabricating other demographics', () => {
    const context = extractPatientContext(drlogyCbcOcrText);
    expect(context).toEqual({
      age: 21,
      ageUnit: 'years',
      sex: 'male',
    });

    const parsed = parseMedicalDocument(drlogyCbcOcrText);
    expect(parsed.patientContext).toEqual({
      age: 21,
      ageUnit: 'years',
      sex: 'male',
    });
  });

  test('Section Detection does NOT classify CBC sections as "Hypertension Indicators"', () => {
    const lines = drlogyCbcOcrText.split('\n');
    const sections = detectDocumentSections(lines);
    const sectionNames = sections.map((s) => s.name);

    expect(sectionNames).not.toContain('Hypertension Indicators');
    expect(sectionNames).toContain('Blood Indices');
    expect(sectionNames).toContain('Complete Blood Count');
  });

  test('Extracts and preserves all 14 CBC parameters in measurements with correct units and values', () => {
    const parsed = parseMedicalDocument(drlogyCbcOcrText, { confidence: 95 });
    const m = parsed.measurements;

    // 1. Hemoglobin
    expect(m.hemoglobin).toBeDefined();
    expect(m.hemoglobin.value).toBe(12.5);
    expect(m.hemoglobin.unit).toBe('g/dL');
    expect(m.hemoglobin.originalUnit).toBe('g/dL');
    expect(m.hemoglobin.source.section).toBe('Complete Blood Count');

    // 2. RBC Count
    expect(m.rbcCount).toBeDefined();
    expect(m.rbcCount.value).toBe(5.2);
    expect(m.rbcCount.unit).toBe('mill/cumm');

    // 3. WBC Count
    expect(m.wbcCount).toBeDefined();
    expect(m.wbcCount.value).toBe(9000);
    expect(m.wbcCount.unit).toBe('cumm');

    // 4. Neutrophils
    expect(m.neutrophils).toBeDefined();
    expect(m.neutrophils.value).toBe(60);
    expect(m.neutrophils.unit).toBe('%');

    // 5. Lymphocytes
    expect(m.lymphocytes).toBeDefined();
    expect(m.lymphocytes.value).toBe(31);
    expect(m.lymphocytes.unit).toBe('%');

    // 6. Eosinophils
    expect(m.eosinophils).toBeDefined();
    expect(m.eosinophils.value).toBe(1);
    expect(m.eosinophils.unit).toBe('%');

    // 7. Monocytes
    expect(m.monocytes).toBeDefined();
    expect(m.monocytes.value).toBe(7);
    expect(m.monocytes.unit).toBe('%');

    // 8. Basophils
    expect(m.basophils).toBeDefined();
    expect(m.basophils.value).toBe(1);
    expect(m.basophils.unit).toBe('%');

    // 9. Platelet Count
    expect(m.plateletCount).toBeDefined();
    expect(m.plateletCount.value).toBe(150000);
    expect(m.plateletCount.unit).toBe('cumm');

    // 10. PCV
    expect(m.pcv).toBeDefined();
    expect(m.pcv.value).toBe(57.5);
    expect(m.pcv.unit).toBe('%');

    // 11. MCV
    expect(m.mcv).toBeDefined();
    expect(m.mcv.value).toBe(87.75);
    expect(m.mcv.unit).toBe('fL');

    // 12. MCH
    expect(m.mch).toBeDefined();
    expect(m.mch.value).toBe(27.2);
    expect(m.mch.unit).toBe('pg');

    // 13. MCHC
    expect(m.mchc).toBeDefined();
    expect(m.mchc.value).toBe(32.8);
    expect(m.mchc.unit).toBe('g/dL');

    // 14. RDW
    expect(m.rdw).toBeDefined();
    expect(m.rdw.value).toBe(13.6);
    expect(m.rdw.unit).toBe('%');
  });

  test('Canonical Vitals: ONLY hemoglobin is recorded; BP, glucose, cholesterol, creatinine, BMI remain null', () => {
    const parsed = parseMedicalDocument(drlogyCbcOcrText, { confidence: 95 });
    const cv = parsed.canonicalVitals;

    // Hemoglobin is present
    expect(cv.hemoglobin).toBe(12.5);

    // All unobserved canonical vitals remain strictly null
    expect(cv.systolicBP).toBeNull();
    expect(cv.diastolicBP).toBeNull();
    expect(cv.heartRate).toBeNull();
    expect(cv.fastingGlucose).toBeNull();
    expect(cv.totalCholesterol).toBeNull();
    expect(cv.serumCreatinine).toBeNull();
    expect(cv.bmi).toBeNull();
  });

  test('All CBC measurements remain available in structuredData', () => {
    const parsed = parseMedicalDocument(drlogyCbcOcrText, { confidence: 95 });
    const sd = parsed.structuredData;

    expect(sd.hemoglobin).toBe(12.5);
    expect(sd.rbcCount).toBe(5.2);
    expect(sd.wbcCount).toBe(9000);
    expect(sd.neutrophils).toBe(60);
    expect(sd.lymphocytes).toBe(31);
    expect(sd.eosinophils).toBe(1);
    expect(sd.monocytes).toBe(7);
    expect(sd.basophils).toBe(1);
    expect(sd.plateletCount).toBe(150000);
    expect(sd.pcv).toBe(57.5);
    expect(sd.mcv).toBe(87.75);
    expect(sd.mch).toBe(27.2);
    expect(sd.mchc).toBe(32.8);
    expect(sd.rdw).toBe(13.6);
  });

  test('Every measurement preserves source traceability, rawText, validationStatus and confidence', () => {
    const parsed = parseMedicalDocument(drlogyCbcOcrText, { confidence: 95 });
    for (const [key, meas] of Object.entries(parsed.measurements)) {
      expect(typeof meas.value).toBe('number');
      expect(typeof meas.unit).toBe('string');
      expect(meas.unit.length).toBeGreaterThan(0);
      expect(typeof meas.rawText).toBe('string');
      expect(meas.rawText.length).toBeGreaterThan(0);
      expect([VALIDATION_STATUS.VALID, VALIDATION_STATUS.WARNING]).toContain(meas.validationStatus);
      expect(meas.confidence).toBeGreaterThan(0.5);
      expect(meas.source).toBeDefined();
      expect(typeof meas.source.section).toBe('string');
      expect(meas.source.section).not.toBe('Hypertension Indicators');
      expect(typeof meas.source.label).toBe('string');
      expect(typeof meas.source.context).toBe('string');
    }
  });
});
