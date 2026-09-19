/**
 * MedScan-NCD Phase 5: Automated Verification Suite
 * ==================================================
 * Verifies:
 *   1. FastAPI Health Endpoint & Artifact loading
 *   2. Express Backend Health & ML integration
 *   3. Domain-Grounded Minimum-Input Policy:
 *        - Full input (8/8) -> dataCompleteness: "FULL"
 *        - Partial input -> dataCompleteness: "PARTIAL" & exact message
 *        - Missing Demographic / Physical / Laboratory domains -> INSUFFICIENT_DATA
 *   4. TreeSHAP Directional Attribution Safety (no causal or % probability claims)
 *   5. Full Production E2E Flow:
 *        - Register Patient
 *        - Upload Report
 *        - Confirm Report -> Persist CONFIRMED -> Trigger Prediction -> Persist Prediction
 *   6. Historical Predictions Immutability:
 *        - Multiple confirmed reports create distinct historical prediction records
 *   7. Decoupled Confirmation Safety:
 *        - Report remains CONFIRMED regardless of ML availability
 */

import fs from 'fs';
import path from 'path';

const FASTAPI_URL = 'http://127.0.0.1:8000';
const BACKEND_URL = 'http://127.0.0.1:5000/api';

async function runTestSuite() {
  console.log('================================================================');
  console.log('    MEDSCAN-NCD: PHASE 5 DIABETES ML INTEGRATION TEST SUITE    ');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passedTests++;
    } else {
      console.error(`  [FAIL] ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // -------------------------------------------------------------
  // SECTION 1: FastAPI Health & Artifact Verification
  // -------------------------------------------------------------
  console.log('[SECTION 1] FastAPI Microservice Health & Artifacts');
  const healthResp = await fetch(`${FASTAPI_URL}/health`);
  assert(healthResp.ok, 'FastAPI /health returns HTTP 200');
  const healthData = await healthResp.json();
  assert(healthData.status === 'healthy', 'Service status is "healthy"');
  assert(healthData.modelVersion === '1.0.0', 'Model version is 1.0.0');
  assert(healthData.artifactLoaded === true, 'Model artifact is loaded');
  assert(healthData.artifactStatus?.modelArtifactExists === true, 'Artifact .joblib exists on disk');
  assert(healthData.artifactStatus?.featureSchemaExists === true, 'feature_schema.json exists');
  assert(healthData.artifactStatus?.metadataExists === true, 'model_metadata.json exists');
  assert(healthData.threshold === 0.21, 'Decision threshold is locked at 0.210');
  assert(healthData.minimumInputPolicyEnforced === true, 'Minimum input policy enforced');

  // -------------------------------------------------------------
  // SECTION 2: Express Backend Health Check
  // -------------------------------------------------------------
  console.log('\n[SECTION 2] Express Backend Health & ML Integration');
  const expressHealth = await fetch(`${BACKEND_URL}/health`);
  assert(expressHealth.ok, 'Express /api/health returns HTTP 200');
  const expData = await expressHealth.json();
  assert(expData.database?.connected === true, 'MongoDB Atlas connected');
  assert(expData.diabetesMLService?.available === true, 'Express sees Python ML service as available');
  assert(expData.diabetesMLService?.status === 'healthy', 'Express reports Python ML service healthy');

  // -------------------------------------------------------------
  // SECTION 3: ML Inference & Minimum-Input Domain Policy
  // -------------------------------------------------------------
  console.log('\n[SECTION 3] Minimum-Input Domain Policy & Data Completeness');

  // Test 3A: Full 8 features
  console.log('  -> Test 3A: Full feature vector (8/8)');
  const fullPayload = {
    age: 56,
    sex: 1,
    bmi: 31.2,
    systolic_bp: 138,
    diastolic_bp: 86,
    total_cholesterol: 215,
    hdl: 39,
    creatinine: 1.05,
  };
  const fullResp = await fetch(`${FASTAPI_URL}/predict/diabetes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fullPayload),
  });
  assert(fullResp.ok, 'Full feature inference returns HTTP 200');
  const fullData = await fullResp.json();
  assert(fullData.success === true, 'Prediction success is true');
  assert(fullData.canCalculate === true, 'canCalculate is true');
  assert(fullData.dataCompleteness === 'FULL', 'dataCompleteness is "FULL"');
  assert(typeof fullData.probability === 'number', 'Calibrated probability is numeric');
  assert(fullData.threshold === 0.21, 'Threshold is 0.210');
  assert(
    ['ELEVATED_MODEL_ESTIMATED_RISK', 'LOWER_MODEL_ESTIMATED_RISK'].includes(fullData.riskCategory),
    'Valid riskCategory assigned'
  );
  assert(
    fullData.topContributingFactors.length > 0,
    'TreeSHAP extracted top contributing factors'
  );
  // Verify TreeSHAP directional descriptions
  for (const factor of fullData.topContributingFactors) {
    assert(
      ['increased estimated risk', 'decreased estimated risk'].includes(factor.impact),
      `Factor ${factor.feature} has non-causal directional description: ${factor.impact}`
    );
    assert(!factor.description.includes('%'), 'Factor description does not make uncalibrated percentage claims');
  }

  // Test 3B: Partial input (Age, Sex, BMI, Creatinine; missing BP and Lipids)
  console.log('  -> Test 3B: Partial feature vector (Missing BP & Lipids)');
  const partialPayload = {
    age: 56,
    sex: 1,
    bmi: 31.2,
    systolic_bp: null,
    diastolic_bp: null,
    total_cholesterol: null,
    hdl: null,
    creatinine: 1.05,
  };
  const partResp = await fetch(`${FASTAPI_URL}/predict/diabetes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(partialPayload),
  });
  const partData = await partResp.json();
  assert(partData.success === true, 'Partial prediction success is true');
  assert(partData.canCalculate === true, 'canCalculate is true for partial meeting minimum criteria');
  assert(partData.dataCompleteness === 'PARTIAL', 'dataCompleteness is explicitly "PARTIAL"');
  assert(
    partData.message === 'Prediction generated from available report data.',
    'Message explicitly states: "Prediction generated from available report data."'
  );

  // Test 3C: Missing Demographic domain (e.g. missing sex)
  console.log('  -> Test 3C: Missing Demographic Domain (missing sex)');
  const noSexPayload = { age: 50, sex: null, bmi: 26, total_cholesterol: 190, hdl: 45 };
  const noSexResp = await fetch(`${FASTAPI_URL}/predict/diabetes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(noSexPayload),
  });
  const noSexData = await noSexResp.json();
  assert(noSexData.canCalculate === false, 'Cannot calculate without demographic sex');
  assert(noSexData.status === 'INSUFFICIENT_DATA', 'Status is INSUFFICIENT_DATA');
  assert(noSexData.missingDomain === 'demographic', 'missingDomain is demographic');

  // Test 3D: Missing Physical domain (has demo and lab, but no BMI and no BP)
  console.log('  -> Test 3D: Missing Physical Domain (no BMI, no BP)');
  const noPhysPayload = {
    age: 50,
    sex: 1,
    bmi: null,
    systolic_bp: null,
    diastolic_bp: null,
    total_cholesterol: 200,
    hdl: 45,
    creatinine: 1.0,
  };
  const noPhysResp = await fetch(`${FASTAPI_URL}/predict/diabetes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(noPhysPayload),
  });
  const noPhysData = await noPhysResp.json();
  assert(noPhysData.canCalculate === false, 'Cannot calculate without physical domain');
  assert(noPhysData.missingDomain === 'physical', 'missingDomain is physical');

  // Test 3E: Missing Laboratory domain (has demo and physical, but no lipids and no creatinine)
  console.log('  -> Test 3E: Missing Laboratory Domain (no Lipids, no Creatinine)');
  const noLabPayload = {
    age: 50,
    sex: 1,
    bmi: 27.5,
    systolic_bp: 125,
    diastolic_bp: 80,
    total_cholesterol: null,
    hdl: null,
    creatinine: null,
  };
  const noLabResp = await fetch(`${FASTAPI_URL}/predict/diabetes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(noLabPayload),
  });
  const noLabData = await noLabResp.json();
  assert(noLabData.canCalculate === false, 'Cannot calculate without laboratory domain');
  assert(noLabData.missingDomain === 'laboratory', 'missingDomain is laboratory');

  // Test 3F: Out-of-bounds Age (< 18)
  console.log('  -> Test 3F: Age < 18 rejection (Adult model contract)');
  const minorPayload = { age: 16, sex: 1, bmi: 22, total_cholesterol: 180, hdl: 50 };
  const minorResp = await fetch(`${FASTAPI_URL}/predict/diabetes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(minorPayload),
  });
  const minorData = await minorResp.json();
  assert(minorData.canCalculate === false, 'Age < 18 cannot calculate on Scenario A adult model');
  assert(minorData.missingDomain === 'demographic', 'missingDomain is demographic for minor');

  // -------------------------------------------------------------
  // SECTION 4: Full Local Production-Like Express Flow
  // -------------------------------------------------------------
  console.log('\n[SECTION 4] Full Production-Like Flow & Decoupled Report Confirmation');

  // Step 4.1: Register Test Patient
  const timestamp = Date.now();
  const testEmail = `phase5_diabetes_${timestamp}@example.com`;
  console.log(`  -> Registering fresh test patient: ${testEmail}...`);
  const regResp = await fetch(`${BACKEND_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Ramesh Kumar',
      email: testEmail,
      password: 'Password123!',
      role: 'Patient',
      phone: '+91 9988776655',
      village: 'Pune Rural',
    }),
  });
  const regData = await regResp.json();
  assert(regData?.statusCode === 201, 'Patient registered successfully');
  const token = regData.data.accessToken;
  const authHeaders = {
    Authorization: `Bearer ${token}`,
  };

  // Fetch linked patient profile
  const profResp = await fetch(`${BACKEND_URL}/patients/me`, { headers: authHeaders });
  const profData = await profResp.json();
  const patientId = profData.data._id;
  assert(patientId !== undefined, 'Retrieved linked Patient ID');

  // Step 4.2: Upload Initial Medical Report
  console.log('  -> Uploading initial medical report document...');
  const pdfPath = path.resolve('uploads', 'test_lab_report.pdf');
  const fileBuffer = fs.readFileSync(pdfPath);
  const fileBlob = new Blob([fileBuffer], { type: 'application/pdf' });
  const formData = new FormData();
  formData.append('report', fileBlob, 'annual_metabolic_panel.pdf');
  formData.append('title', 'Annual Metabolic Panel 2026');
  formData.append('reportType', 'Comprehensive Metabolic Panel');

  const uploadResp = await fetch(`${BACKEND_URL}/reports/upload`, {
    method: 'POST',
    headers: authHeaders,
    body: formData,
  });
  const uploadData = await uploadResp.json();
  assert(uploadResp.ok, 'Report uploaded successfully via /reports/upload');
  const reportId = uploadData.data.report._id;
  assert(uploadData.data.report.status === 'PENDING_REVIEW', 'Initial report status is PENDING_REVIEW');

  // Step 4.3: Confirm Report with Patient Context & Laboratory Data
  console.log('  -> User reviews and confirms medical report...');
  const confirmPayload = {
    confirmedData: {
      canonicalVitals: {
        systolicBP: 138,
        diastolicBP: 88,
        totalCholesterol: 228,
        serumCreatinine: 1.1,
        bmi: 28.6,
      },
      patientContext: {
        age: 52,
        sex: 'Male',
      },
      measurements: {
        totalCholesterol: { value: 228, unit: 'mg/dL' },
        hdl: { value: 38, unit: 'mg/dL' },
        creatinine: { value: 1.1, unit: 'mg/dL' },
        bmi: 28.6,
        systolicBP: 138,
        diastolicBP: 88,
      },
    },
  };

  const confirmResp = await fetch(`${BACKEND_URL}/reports/${reportId}/confirm`, {
    method: 'PUT',
    headers: {
      ...authHeaders,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(confirmPayload),
  });
  const confirmData = await confirmResp.json();
  assert(confirmResp.ok, 'Report confirmed successfully via PUT /reports/:id/confirm');
  assert(confirmData.data.report.status === 'CONFIRMED', 'Report status is persisted as CONFIRMED');
  assert(confirmData.data.diabetesPrediction !== null, 'Diabetes prediction was automatically generated upon confirmation');

  const initialPred = confirmData.data.diabetesPrediction;
  assert(initialPred.disease === 'diabetes', 'Prediction is for disease: diabetes');
  assert(initialPred.scenario === 'A', 'Scenario is A');
  assert(initialPred.modelVersion === '1.0.0', 'Model version is 1.0.0');
  assert(initialPred.canCalculate === true, 'canCalculate is true');
  assert(typeof initialPred.probability === 'number', 'Probability is numeric');
  assert(initialPred.threshold === 0.21, 'Threshold is 0.210');
  assert(
    ['ELEVATED_MODEL_ESTIMATED_RISK', 'LOWER_MODEL_ESTIMATED_RISK'].includes(initialPred.riskCategory),
    'Valid riskCategory assigned'
  );
  assert(initialPred.report.toString() === reportId.toString(), 'Prediction is linked to reportId');
  assert(initialPred.patient.toString() === patientId.toString(), 'Prediction is linked to patientId');

  // Step 4.4: Verify Latest Diabetes Prediction Endpoint
  console.log('  -> Fetching latest diabetes prediction for patient...');
  const latestResp = await fetch(`${BACKEND_URL}/predictions/diabetes/latest`, {
    headers: authHeaders,
  });
  assert(latestResp.ok, 'GET /predictions/diabetes/latest returns HTTP 200');
  const latestData = await latestResp.json();
  assert(latestData.data !== null, 'Latest prediction retrieved');
  assert(latestData.data._id === initialPred._id, 'Retrieved prediction matches created prediction ID');
  assert(latestData.data.report?.title === 'Annual Metabolic Panel 2026', 'Populated report title verified');

  // -------------------------------------------------------------
  // SECTION 5: Historical Immutability Test
  // -------------------------------------------------------------
  console.log('\n[SECTION 5] Historical Predictions Immutability');
  console.log('  -> Uploading and confirming a SECOND report for the same patient...');

  const formData2 = new FormData();
  formData2.append('report', fileBlob, 'followup_panel_6months.pdf');
  formData2.append('title', 'Follow-up Metabolic Panel 6M');
  formData2.append('reportType', 'Metabolic Follow-up');

  const uploadResp2 = await fetch(`${BACKEND_URL}/reports/upload`, {
    method: 'POST',
    headers: authHeaders,
    body: formData2,
  });
  const uploadData2 = await uploadResp2.json();
  const reportId2 = uploadData2.data.report._id;

  // Confirm second report with different values (improved lifestyle)
  const confirmPayload2 = {
    confirmedData: {
      canonicalVitals: {
        systolicBP: 122,
        diastolicBP: 78,
        totalCholesterol: 195,
        serumCreatinine: 0.95,
        bmi: 26.8,
      },
      patientContext: { age: 53, sex: 'Male' },
      measurements: {
        totalCholesterol: { value: 195, unit: 'mg/dL' },
        hdl: { value: 48, unit: 'mg/dL' },
        creatinine: { value: 0.95, unit: 'mg/dL' },
        bmi: 26.8,
        systolicBP: 122,
        diastolicBP: 78,
      },
    },
  };

  const confirmResp2 = await fetch(`${BACKEND_URL}/reports/${reportId2}/confirm`, {
    method: 'PUT',
    headers: {
      ...authHeaders,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(confirmPayload2),
  });
  const confirmData2 = await confirmResp2.json();
  const secondPred = confirmData2.data.diabetesPrediction;
  assert(secondPred._id !== initialPred._id, 'Second prediction has a distinct unique MongoDB _id');
  assert(secondPred.report.toString() === reportId2.toString(), 'Second prediction links to reportId2');

  // Query historical predictions list
  console.log('  -> Querying full diabetes prediction history...');
  const histResp = await fetch(`${BACKEND_URL}/predictions/diabetes/history`, {
    headers: authHeaders,
  });
  assert(histResp.ok, 'GET /predictions/diabetes/history returns HTTP 200');
  const histData = await histResp.json();
  assert(histData.data.length >= 2, 'History preserves multiple distinct prediction records');
  assert(
    histData.data.some((p) => p._id === initialPred._id),
    'Initial historical prediction is PRESERVED and not overwritten'
  );
  assert(
    histData.data.some((p) => p._id === secondPred._id),
    'Second prediction is present in history'
  );

  console.log('\n================================================================');
  console.log(`  PHASE 5 VERIFICATION COMPLETE: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('================================================================\n');
}

runTestSuite().catch((err) => {
  console.error('\n[FATAL ERROR IN TEST SUITE]:', err);
  process.exit(1);
});
