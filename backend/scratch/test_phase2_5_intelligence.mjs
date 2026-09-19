import { parseMedicalDocument } from '../src/services/medicalReportParser.js';
import { convertUnitSafely, normalizeOcrNumericString, normalizeUnit } from '../src/services/medicalNormalizer.js';
import { validateBiomarkerRange, VALIDATION_STATUS } from '../src/services/medicalValidation.js';

async function runPhase25Tests() {
  console.log('================================================================');
  console.log('  PHASE 2.5: MEDICAL REPORT INTELLIGENCE & EXTRACTION TESTS     ');
  console.log('================================================================\n');

  const results = {};

  // TEST 1: Simple Laboratory Report
  console.log('[TEST 1] Testing Simple Laboratory Report Extraction...');
  const labReportText = `
METROPOLITAN DIAGNOSTIC HEALTHCARE
Patient: Jane Miller, Age: 42, Sex: Female
Date: 12-Jan-2026

LABORATORY INVESTIGATION REPORT
Biochemistry & Hematology
------------------------------------------------------------
Test Description              Result       Unit     Ref. Range
------------------------------------------------------------
Fasting Blood Sugar (FBS)     108          mg/dL    70 - 99
Blood Pressure (BP)           128/82       mmHg     120/80
Total Cholesterol             185          mg/dL    < 200
Serum Creatinine              0.9          mg/dL    0.6 - 1.2
Hemoglobin (Hb)               13.6         g/dL     12.0 - 15.5
Body Mass Index (BMI)         24.6         kg/m²    18.5 - 24.9
------------------------------------------------------------
  `;

  const labParsed = parseMedicalDocument(labReportText, { confidence: 92 });
  const labMeas = labParsed.measurements;
  console.log('  -> Lab Classification:', labParsed.document.reportType.value, `(conf: ${labParsed.document.reportType.confidence})`);
  console.log('  -> Fasting Glucose:', labMeas.fastingGlucose?.value, labMeas.fastingGlucose?.unit, 'Status:', labMeas.fastingGlucose?.validationStatus);
  console.log('  -> BP Systolic:', labMeas.bloodPressure?.systolic?.value, 'Diastolic:', labMeas.bloodPressure?.diastolic?.value);
  console.log('  -> Total Cholesterol:', labMeas.totalCholesterol?.value, labMeas.totalCholesterol?.unit);
  console.log('  -> Creatinine:', labMeas.creatinine?.value, labMeas.creatinine?.unit);
  console.log('  -> Hemoglobin:', labMeas.hemoglobin?.value, labMeas.hemoglobin?.unit);
  console.log('  -> BMI:', labMeas.bmi?.value, labMeas.bmi?.unit);

  if (
    labMeas.fastingGlucose?.value === 108 &&
    labMeas.bloodPressure?.systolic?.value === 128 &&
    labMeas.bloodPressure?.diastolic?.value === 82 &&
    labMeas.totalCholesterol?.value === 185 &&
    labMeas.creatinine?.value === 0.9 &&
    labMeas.hemoglobin?.value === 13.6 &&
    labMeas.bmi?.value === 24.6
  ) {
    console.log('  -> PASS: Simple lab report successfully extracted all parameters with units and context.');
    results.simpleLabExtraction = 'PASS';
  } else {
    console.error('  -> FAIL: Simple lab report extraction mismatch!');
    results.simpleLabExtraction = 'FAIL';
  }

  // TEST 2: Complex ABPM (Sentinel ABP) Report
  console.log('\n[TEST 2] Testing Complex Sentinel ABPM Report Extraction...');
  const abpmReportText = `
SENTINEL ABP REPORT - 24-HOUR AMBULATORY BLOOD PRESSURE MONITORING
Patient Name: Jane Miller    ID: 90210    Recorder: Sentinel 90207
Recording Duration: 24 Hours

OVERALL SUMMARY
----------------------------------------------------------------------
Hourly avg. | Std. dev. | Min. | Max. | Dipping
Systolic (mmHg)      142     23.38     103    191    10.39%
Diastolic (mmHg)      79     13.06      48    107    14.43%
MAP (mmHg)           101     16.20      69    143
Pulse pressure (mmHg) 63     13.50      37     89
Heart rate (BPM)      66      6.55      57     84
----------------------------------------------------------------------
24-Hour Average BP: 142/79 mmHg
Systolic above limits: 67.57%
Diastolic above limits: 54.05%
Systolic dipping: 10.39%
Diastolic dipping: 14.43%
AASI: 0.51
MSI: 28.97

WAKE PERIODS SUMMARY (07:00 - 22:59)
----------------------------------------------------------------------
Hourly avg. | Std. dev. | Min. | Max.
Average BP: 147/83 mmHg
Systolic (mmHg)      147     24.06     112    191
Diastolic (mmHg)      83     12.29      62    107
Systolic > 135: 65.52%
Diastolic > 85: 51.72%

SLEEP PERIODS SUMMARY (23:00 - 06:59)
----------------------------------------------------------------------
Hourly avg. | Std. dev. | Min. | Max.
Average BP: 133/72 mmHg
Systolic (mmHg)      133     16.87     103    152
Diastolic (mmHg)      72     11.90      48     86
Systolic > 120: 75%
Diastolic > 70: 62.50%
  `;

  const abpmParsed = parseMedicalDocument(abpmReportText, { confidence: 94 });
  const bp = abpmParsed.measurements.bloodPressure;
  const ind = abpmParsed.hypertensionIndicators;
  const hr = abpmParsed.measurements.heartRate;

  console.log('  -> Report Type:', abpmParsed.document.reportType.value, `(conf: ${abpmParsed.document.reportType.confidence})`);
  console.log('  -> Overall Avg BP:', bp.overall?.average?.systolic?.value, '/', bp.overall?.average?.diastolic?.value);
  console.log('  -> Overall Systolic Stats:', bp.overall?.systolic);
  console.log('  -> Overall Diastolic Stats:', bp.overall?.diastolic);
  console.log('  -> Wake Period Avg BP:', bp.wake?.average?.systolic, '/', bp.wake?.average?.diastolic);
  console.log('  -> Wake Systolic Stats:', bp.wake?.systolic);
  console.log('  -> Wake Diastolic Stats:', bp.wake?.diastolic);
  console.log('  -> Wake Thresholds:', bp.wake?.loadAboveThreshold);
  console.log('  -> Sleep Period Avg BP:', bp.sleep?.average?.systolic, '/', bp.sleep?.average?.diastolic);
  console.log('  -> Sleep Systolic Stats:', bp.sleep?.systolic);
  console.log('  -> Sleep Diastolic Stats:', bp.sleep?.diastolic);
  console.log('  -> Sleep Thresholds:', bp.sleep?.loadAboveThreshold);
  console.log('  -> MAP:', abpmParsed.measurements.map?.overallAverage);
  console.log('  -> Pulse Pressure:', abpmParsed.measurements.pulsePressure?.overallAverage);
  console.log('  -> Heart Rate:', hr.overallAverage?.value, hr.overallAverage?.unit);
  console.log('  -> Hypertension Indicators:', ind);

  const abpmChecks =
    abpmParsed.document.reportType.value === 'ambulatory_blood_pressure_monitoring' &&
    bp.overall?.average?.systolic?.value === 142 &&
    bp.overall?.average?.diastolic?.value === 79 &&
    bp.overall?.systolic?.standardDeviation === 23.38 &&
    bp.overall?.systolic?.minimum === 103 &&
    bp.overall?.systolic?.maximum === 191 &&
    bp.overall?.diastolic?.standardDeviation === 13.06 &&
    bp.overall?.diastolic?.minimum === 48 &&
    bp.overall?.diastolic?.maximum === 107 &&
    bp.wake?.average?.systolic === 147 &&
    bp.wake?.average?.diastolic === 83 &&
    bp.wake?.systolic?.standardDeviation === 24.06 &&
    bp.wake?.systolic?.minimum === 112 &&
    bp.wake?.systolic?.maximum === 191 &&
    bp.wake?.loadAboveThreshold?.systolicPercent === 65.52 &&
    bp.wake?.loadAboveThreshold?.diastolicPercent === 51.72 &&
    bp.sleep?.average?.systolic === 133 &&
    bp.sleep?.average?.diastolic === 72 &&
    bp.sleep?.systolic?.standardDeviation === 16.87 &&
    bp.sleep?.systolic?.minimum === 103 &&
    bp.sleep?.systolic?.maximum === 152 &&
    bp.sleep?.loadAboveThreshold?.systolicPercent === 75 &&
    bp.sleep?.loadAboveThreshold?.diastolicPercent === 62.5 &&
    abpmParsed.measurements.map?.overallAverage?.value === 101 &&
    abpmParsed.measurements.pulsePressure?.overallAverage?.value === 63 &&
    hr.overallAverage?.value === 66 &&
    ind.systolicLoadPercent === 67.57 &&
    ind.diastolicLoadPercent === 54.05 &&
    ind.systolicDippingPercent === 10.39 &&
    ind.diastolicDippingPercent === 14.43 &&
    ind.aasi === 0.51 &&
    ind.msi === 28.97;

  if (abpmChecks) {
    console.log('  -> PASS: All Sentinel ABPM structured parameters, statistics, and indicators extracted accurately!');
    results.abpmExtraction = 'PASS';
  } else {
    console.error('  -> FAIL: ABPM extraction mismatch!');
    results.abpmExtraction = 'FAIL';
  }

  // TEST 3: OCR Typo Handling ("1O8")
  console.log('\n[TEST 3] Testing OCR Typo Handling ("1O8" -> 108)...');
  const typoResult = normalizeOcrNumericString('1O8');
  const typoReportText = 'Fasting Blood Sugar: 1O8 mg/dL';
  const typoParsed = parseMedicalDocument(typoReportText, { confidence: 90 });
  const typoGlucose = typoParsed.measurements.fastingGlucose;

  console.log('  -> normalizeOcrNumericString:', typoResult);
  console.log('  -> Extracted Glucose:', typoGlucose?.value, 'Original:', typoGlucose?.rawText, 'TypoCorrected:', typoGlucose?.ocrTypoCorrected, 'Confidence:', typoGlucose?.confidence);

  if (
    typoGlucose?.value === 108 &&
    typoGlucose?.rawText === '1O8' &&
    typoGlucose?.ocrTypoCorrected === true &&
    typoGlucose?.confidence < 0.9
  ) {
    console.log('  -> PASS: OCR typo normalized to 108 with originalText preserved and confidence penalized.');
    results.ocrTypoHandling = 'PASS';
  } else {
    console.error('  -> FAIL: OCR typo handling failed:', typoGlucose);
    results.ocrTypoHandling = 'FAIL';
  }

  // TEST 4: Missing Value Test (Zero Fabrication)
  console.log('\n[TEST 4] Testing Missing Value Guarantee (Zero Fabrication)...');
  const missingCreatinineText = `
LABORATORY REPORT
Fasting Blood Sugar: 104 mg/dL
Blood Pressure: 120/80 mmHg
Total Cholesterol: 190 mg/dL
  `;
  const missingParsed = parseMedicalDocument(missingCreatinineText);
  console.log('  -> Creatinine in measurements?:', 'creatinine' in missingParsed.measurements);
  console.log('  -> Canonical vitals serumCreatinine:', missingParsed.canonicalVitals.serumCreatinine);

  if (!missingParsed.measurements.creatinine && missingParsed.canonicalVitals.serumCreatinine === undefined) {
    console.log('  -> PASS: Omitted creatinine remains strictly absent/null. Zero fabrication confirmed.');
    results.missingValueHandling = 'PASS';
  } else {
    console.error('  -> FAIL: Missing value was fabricated!');
    results.missingValueHandling = 'FAIL';
  }

  // TEST 5: Conflicting Values Test
  console.log('\n[TEST 5] Testing Conflicting Candidates Detection...');
  const conflictReportText = `
LAB REPORT
Fasting Blood Sugar: 108 mg/dL
Random Blood Sugar: 180 mg/dL
Glucose: 108 mg/dL
Glucose: 180 mg/dL
  `;
  const conflictParsed = parseMedicalDocument(conflictReportText);
  const conflictGlucose = conflictParsed.measurements.fastingGlucose;

  console.log('  -> Glucose Validation Status:', conflictGlucose?.validationStatus);
  console.log('  -> Glucose Warning:', conflictGlucose?.warning);
  console.log('  -> Conflicting Candidates:', conflictGlucose?.conflictingCandidates);

  if (
    conflictGlucose?.validationStatus === VALIDATION_STATUS.WARNING &&
    conflictGlucose?.conflictingCandidates?.length > 1
  ) {
    console.log('  -> PASS: Conflicting values flagged with WARNING and candidate list for user review.');
    results.conflictDetection = 'PASS';
  } else {
    console.error('  -> FAIL: Conflict not flagged:', conflictGlucose);
    results.conflictDetection = 'FAIL';
  }

  // TEST 6: Unit Conversion (6.0 mmol/L -> 108.1 mg/dL)
  console.log('\n[TEST 6] Testing Safe Unit Conversion (6.0 mmol/L -> mg/dL)...');
  const mmolReportText = 'Fasting Blood Sugar: 6.0 mmol/L';
  const mmolParsed = parseMedicalDocument(mmolReportText);
  const mmolGlucose = mmolParsed.measurements.fastingGlucose;

  console.log('  -> Normalized Value:', mmolGlucose?.value, mmolGlucose?.unit);
  console.log('  -> Original Value:', mmolGlucose?.originalValue, mmolGlucose?.originalUnit);
  console.log('  -> Conversion Applied:', mmolGlucose?.conversionApplied);

  if (
    mmolGlucose?.originalValue === 6.0 &&
    mmolGlucose?.originalUnit === 'mmol/L' &&
    mmolGlucose?.value === 108.1 &&
    mmolGlucose?.unit === 'mg/dL' &&
    mmolGlucose?.conversionApplied === true
  ) {
    console.log('  -> PASS: 6.0 mmol/L safely converted to 108.1 mg/dL while retaining original representation.');
    results.unitConversion = 'PASS';
  } else {
    console.error('  -> FAIL: Unit conversion failed:', mmolGlucose);
    results.unitConversion = 'FAIL';
  }

  // TEST 7: Unknown / Unstandardized Unit Test
  console.log('\n[TEST 7] Testing Unknown Unit Handling...');
  const unkUnitResult = normalizeUnit('xyz-units');
  const convertedUnk = convertUnitSafely('fastingGlucose', 108, 'xyz-units');
  console.log('  -> normalizeUnit("xyz-units"):', unkUnitResult);
  console.log('  -> convertUnitSafely result:', convertedUnk);

  if (unkUnitResult.unitStatus === 'unstandardized' && convertedUnk.conversionApplied === false) {
    console.log('  -> PASS: Unknown unit not silently assumed as mg/dL; conversion not applied.');
    results.unknownUnitHandling = 'PASS';
  } else {
    console.error('  -> FAIL: Unknown unit was misclassified or assumed!');
    results.unknownUnitHandling = 'FAIL';
  }

  // TEST 8: Extreme Value Warning (Glucose 500 mg/dL)
  console.log('\n[TEST 8] Testing Extreme Value Handling (Glucose = 500 mg/dL)...');
  const extremeText = 'Fasting Blood Sugar: 500 mg/dL';
  const extremeParsed = parseMedicalDocument(extremeText);
  const extremeGlucose = extremeParsed.measurements.fastingGlucose;

  console.log('  -> Extreme Glucose Value:', extremeGlucose?.value);
  console.log('  -> Validation Status:', extremeGlucose?.validationStatus);
  console.log('  -> Warning Message:', extremeGlucose?.warning);

  if (
    extremeGlucose?.value === 500 &&
    extremeGlucose?.validationStatus === VALIDATION_STATUS.WARNING &&
    extremeGlucose?.warning?.includes('Unusually high')
  ) {
    console.log('  -> PASS: Extreme value 500 mg/dL preserved and flagged with WARNING (not discarded).');
    results.extremeValueValidation = 'PASS';
  } else {
    console.error('  -> FAIL: Extreme value was discarded or not warned:', extremeGlucose);
    results.extremeValueValidation = 'FAIL';
  }

  // TEST 9: Real Drlogy CBC Extraction (All 14 Parameters + Units)
  console.log('\n[TEST 9] Testing Real Drlogy CBC Parameter & Unit Extraction...');
  const drlogyCbcText = `
Smart Pathology Laboratory
Drlogy.com
BLOOD INDICES
Packed Cell Volume (PCV) \t57.5 \tHigh \t40 - 50 \t%
Mean Corpuscular Volume (MCV) \t87.75 \t83 - 101 \tfL
MCH \t27.2 \t27 - 32 \tpg
MCHC \t32.8 \t32.5 - 34.5 \tg/dL
RDW \t13.6 \t11.6 - 14.0 \t%
Dr. Vimal Shah (MD, Pathologist)
Yash M. Patel
Age : 21 Years
Sex : Male
PID : 555
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
  `;

  const cbcParsed = parseMedicalDocument(drlogyCbcText, { confidence: 95, fileType: 'pdf' });
  const cbcMeas = cbcParsed.measurements;

  console.log('  -> Report Type:', cbcParsed.document.reportType.value);
  console.log('  -> Hemoglobin:', cbcMeas.hemoglobin?.value, cbcMeas.hemoglobin?.unit, 'Section:', cbcMeas.hemoglobin?.source?.section);
  console.log('  -> RBC Count:', cbcMeas.rbcCount?.value, cbcMeas.rbcCount?.unit);
  console.log('  -> WBC Count:', cbcMeas.wbcCount?.value, cbcMeas.wbcCount?.unit);
  console.log('  -> Platelets:', cbcMeas.plateletCount?.value, cbcMeas.plateletCount?.unit);
  console.log('  -> PCV:', cbcMeas.pcv?.value, cbcMeas.pcv?.unit);
  console.log('  -> MCV:', cbcMeas.mcv?.value, cbcMeas.mcv?.unit);
  console.log('  -> MCH:', cbcMeas.mch?.value, cbcMeas.mch?.unit);
  console.log('  -> MCHC:', cbcMeas.mchc?.value, cbcMeas.mchc?.unit);
  console.log('  -> RDW:', cbcMeas.rdw?.value, cbcMeas.rdw?.unit);

  const cbcParamsPass =
    cbcMeas.hemoglobin?.value === 12.5 && cbcMeas.hemoglobin?.unit === 'g/dL' &&
    cbcMeas.rbcCount?.value === 5.2 && cbcMeas.rbcCount?.unit === 'mill/cumm' &&
    cbcMeas.wbcCount?.value === 9000 && cbcMeas.wbcCount?.unit === 'cumm' &&
    cbcMeas.neutrophils?.value === 60 && cbcMeas.neutrophils?.unit === '%' &&
    cbcMeas.lymphocytes?.value === 31 && cbcMeas.lymphocytes?.unit === '%' &&
    cbcMeas.eosinophils?.value === 1 && cbcMeas.eosinophils?.unit === '%' &&
    cbcMeas.monocytes?.value === 7 && cbcMeas.monocytes?.unit === '%' &&
    cbcMeas.basophils?.value === 1 && cbcMeas.basophils?.unit === '%' &&
    cbcMeas.plateletCount?.value === 150000 && cbcMeas.plateletCount?.unit === 'cumm' &&
    cbcMeas.pcv?.value === 57.5 && cbcMeas.pcv?.unit === '%' &&
    cbcMeas.mcv?.value === 87.75 && cbcMeas.mcv?.unit === 'fL' &&
    cbcMeas.mch?.value === 27.2 && cbcMeas.mch?.unit === 'pg' &&
    cbcMeas.mchc?.value === 32.8 && cbcMeas.mchc?.unit === 'g/dL' &&
    cbcMeas.rdw?.value === 13.6 && cbcMeas.rdw?.unit === '%';

  if (cbcParamsPass) {
    console.log('  -> PASS: All 14 CBC parameters and correct units extracted without data loss.');
    results.cbcParameterExtraction = 'PASS';
  } else {
    console.error('  -> FAIL: CBC parameter or unit extraction mismatch!');
    results.cbcParameterExtraction = 'FAIL';
  }

  // TEST 10: Patient Context Extraction
  console.log('\n[TEST 10] Testing Patient Context Extraction...');
  console.log('  -> Extracted patientContext:', cbcParsed.patientContext);
  if (
    cbcParsed.patientContext?.age === 21 &&
    cbcParsed.patientContext?.ageUnit === 'years' &&
    cbcParsed.patientContext?.sex === 'male'
  ) {
    console.log('  -> PASS: Report-level patient context accurately captured (Age: 21 years, Sex: male).');
    results.patientContextExtraction = 'PASS';
  } else {
    console.error('  -> FAIL: Patient context extraction failed:', cbcParsed.patientContext);
    results.patientContextExtraction = 'FAIL';
  }

  // TEST 11: Section Classification Accuracy
  console.log('\n[TEST 11] Testing Dynamic Section Classification (No Hypertension Re-use)...');
  const sectionsFound = cbcParsed.sections.map((s) => s.name);
  console.log('  -> Document Sections:', sectionsFound);
  console.log('  -> Hemoglobin Section:', cbcMeas.hemoglobin?.source?.section);

  const noHypertensionSection = !sectionsFound.includes('Hypertension Indicators') &&
    cbcMeas.hemoglobin?.source?.section !== 'Hypertension Indicators';

  if (noHypertensionSection) {
    console.log('  -> PASS: CBC section correctly classified as hematology / Complete Blood Count (not Hypertension).');
    results.sectionClassification = 'PASS';
  } else {
    console.error('  -> FAIL: Section incorrectly classified as Hypertension!');
    results.sectionClassification = 'FAIL';
  }

  // TEST 12: Architectural Separation (Canonical Vitals vs Structured Data)
  console.log('\n[TEST 12] Testing Architectural Separation of Canonical Vitals vs Structured Data...');
  const cv = cbcParsed.canonicalVitals;
  const sd = cbcParsed.structuredData;

  console.log('  -> Canonical Vitals:', cv);
  console.log('  -> Structured Data Key Count:', Object.keys(sd).length);

  const canonicalChecks =
    cv.hemoglobin === 12.5 &&
    cv.systolicBP === null &&
    cv.diastolicBP === null &&
    cv.heartRate === null &&
    cv.fastingGlucose === null &&
    cv.totalCholesterol === null &&
    cv.serumCreatinine === null &&
    cv.bmi === null;

  const structuredChecks =
    sd.hemoglobin === 12.5 &&
    sd.rbcCount === 5.2 &&
    sd.wbcCount === 9000 &&
    sd.plateletCount === 150000;

  if (canonicalChecks && structuredChecks) {
    console.log('  -> PASS: Architectural separation verified: canonicalVitals only maps hemoglobin and leaves unobserved vitals null; structuredData preserves all CBC parameters.');
    results.architecturalSeparation = 'PASS';
  } else {
    console.error('  -> FAIL: Architectural separation check failed!');
    results.architecturalSeparation = 'FAIL';
  }

  console.log('\n================================================================');
  console.log('  PHASE 2.5 ALL 12 MANDATORY TESTS SUMMARY:                     ');
  console.log('================================================================');
  console.log(JSON.stringify(results, null, 2));

  return results;
}

runPhase25Tests().catch(console.error);

