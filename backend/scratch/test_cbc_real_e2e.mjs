import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://127.0.0.1:5000/api';

async function runCbcE2ETest() {
  console.log('================================================================');
  console.log('  REAL E2E TEST: DRLOGY CBC PDF UPLOAD, EXTRACTION & PROFILE    ');
  console.log('================================================================\n');

  const results = {};
  const timestamp = Date.now();
  const testEmail = `cbc_patient_${timestamp}@example.com`;
  const testPassword = 'Password123!';

  // STEP 1: Register Fresh Patient
  console.log(`[STEP 1] Registering fresh test patient: ${testEmail}...`);
  const regResp = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Yash M. Patel',
      email: testEmail,
      password: testPassword,
      role: 'Patient',
      phone: '+91 9876543210',
      village: 'Mumbai',
    }),
  });
  const regData = await regResp.json();
  if (regData?.statusCode !== 201 || !regData?.data?.accessToken) {
    console.error('  -> Registration failed:', regData);
    return;
  }
  console.log('  -> PASS: Patient registered.');
  const token = regData.data.accessToken;
  const authHeaders = { Authorization: `Bearer ${token}` };

  // STEP 2: Verify Initial Profile Vitals are Unrecorded
  console.log('\n[STEP 2] Verifying initial Patient Profile has zero vitals recorded...');
  const initProfResp = await fetch(`${BASE_URL}/patients/me`, { headers: authHeaders });
  const initProf = (await initProfResp.json()).data;
  console.log('  -> Initial Hemoglobin:', initProf.hemoglobin);
  console.log('  -> Initial Systolic BP:', initProf.systolicBP);
  console.log('  -> Initial Fasting Sugar:', initProf.fastingSugar);

  // STEP 3: Upload the Real Drlogy CBC PDF
  console.log('\n[STEP 3] Uploading real Drlogy CBC PDF (report-1789003785441-663478401.pdf)...');
  const pdfPath = path.resolve('uploads', 'report-1789003785441-663478401.pdf');
  if (!fs.existsSync(pdfPath)) {
    console.error('  -> PDF file not found at:', pdfPath);
    return;
  }
  const fileBuffer = fs.readFileSync(pdfPath);
  const blob = new Blob([fileBuffer], { type: 'application/pdf' });
  const formData = new FormData();
  formData.append('report', blob, 'Drlogy_CBC_Report.pdf');
  formData.append('title', 'Drlogy CBC Blood Test');
  formData.append('reportType', 'Complete Blood Count');

  const uploadResp = await fetch(`${BASE_URL}/reports/upload`, {
    method: 'POST',
    headers: authHeaders,
    body: formData,
  });
  const uploadData = await uploadResp.json();
  if (uploadData?.statusCode !== 201) {
    console.error('  -> Upload failed:', uploadData);
    return;
  }

  const report = uploadData.data.report;
  const extData = report.extractedData;
  console.log('  -> Upload Successful! Report ID:', report._id);
  console.log('  -> Detected Report Type:', extData.document?.reportType);
  console.log('  -> Extracted Patient Context:', extData.patientContext);

  // STEP 4: Validate Extracted CBC Intelligence
  console.log('\n[STEP 4] Validating CBC Medical Intelligence...');
  const meas = extData.measurements || {};
  console.log('  -> Total CBC parameters in measurements:', Object.keys(meas).length);
  console.log('  -> Hemoglobin:', JSON.stringify(meas.hemoglobin, null, 2));

  const all14Present = [
    'hemoglobin', 'rbcCount', 'wbcCount', 'neutrophils', 'lymphocytes',
    'eosinophils', 'monocytes', 'basophils', 'plateletCount', 'pcv',
    'mcv', 'mch', 'mchc', 'rdw'
  ].every(k => meas[k] && meas[k].value !== undefined && meas[k].unit !== null);

  const hbUnitValid = meas.hemoglobin?.unit === 'g/dL';
  const hbSectionValid = meas.hemoglobin?.source?.section === 'Complete Blood Count';
  const notHypertension = !JSON.stringify(meas).includes('Hypertension Indicators');
  const patientContextValid = extData.patientContext?.age === 21 && extData.patientContext?.sex === 'male';

  console.log('  -> All 14 parameters with non-null units?:', all14Present);
  console.log('  -> Hemoglobin unit === "g/dL"?:', hbUnitValid);
  console.log('  -> Hemoglobin section === "Complete Blood Count"?:', hbSectionValid);
  console.log('  -> Zero "Hypertension Indicators"?:', notHypertension);
  console.log('  -> Patient context (Age: 21, Sex: male)?:', patientContextValid);

  if (all14Present && hbUnitValid && hbSectionValid && notHypertension && patientContextValid) {
    console.log('  -> PASS: CBC parameters, units, sections, and patientContext 100% verified.');
    results.extractionFidelity = 'PASS';
  } else {
    console.error('  -> FAIL: Extraction verification failed!');
    results.extractionFidelity = 'FAIL';
  }

  // STEP 5: Validate Canonical Vitals Separation
  console.log('\n[STEP 5] Validating Canonical Vitals Separation...');
  const cv = extData.canonicalVitals;
  console.log('  -> Canonical Vitals:', cv);

  const cvCheck =
    cv.hemoglobin === 12.5 &&
    cv.systolicBP === null &&
    cv.diastolicBP === null &&
    cv.heartRate === null &&
    cv.fastingGlucose === null &&
    cv.totalCholesterol === null &&
    cv.serumCreatinine === null &&
    cv.bmi === null;

  if (cvCheck) {
    console.log('  -> PASS: Canonical vitals has ONLY hemoglobin: 12.5; all unobserved vitals are null.');
    results.canonicalVitalsSeparation = 'PASS';
  } else {
    console.error('  -> FAIL: Canonical vitals check failed!');
    results.canonicalVitalsSeparation = 'FAIL';
  }

  // STEP 6: Confirm Report
  console.log('\n[STEP 6] Confirming report (Review & Confirm step)...');
  const confirmResp = await fetch(`${BASE_URL}/reports/${report._id}/confirm`, {
    method: 'PUT',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      confirmedData: {
        canonicalVitals: { hemoglobin: 12.5 },
        hemoglobin: 12.5,
        measurements: extData.measurements,
        patientContext: extData.patientContext,
        document: extData.document,
      },
    }),
  });
  const confirmData = await confirmResp.json();
  if (confirmData?.statusCode !== 200) {
    console.error('  -> Confirm failed:', confirmData);
    return;
  }
  console.log('  -> PASS: Report confirmed successfully. Status:', confirmData.data.report.status);

  // STEP 7: Verify Patient Profile Vitals
  console.log('\n[STEP 7] Verifying Patient Profile after confirmation...');
  const finalProfResp = await fetch(`${BASE_URL}/patients/me`, { headers: authHeaders });
  const finalProf = (await finalProfResp.json()).data;

  console.log('  -> Patient Profile Hemoglobin:', finalProf.hemoglobin);
  console.log('  -> Patient Profile Systolic BP:', finalProf.systolicBP ?? 'Not recorded');
  console.log('  -> Patient Profile Diastolic BP:', finalProf.diastolicBP ?? 'Not recorded');
  console.log('  -> Patient Profile Heart Rate:', finalProf.heartRate ?? 'Not recorded');
  console.log('  -> Patient Profile Fasting Sugar:', finalProf.fastingSugar ?? 'Not recorded');
  console.log('  -> Patient Profile Total Cholesterol:', finalProf.totalCholesterol ?? 'Not recorded');
  console.log('  -> Patient Profile Serum Creatinine:', finalProf.serumCreatinine ?? 'Not recorded');
  console.log('  -> Patient Profile BMI:', finalProf.bmi ?? 'Not recorded');

  const profileCheck =
    finalProf.hemoglobin === 12.5 &&
    (finalProf.systolicBP === undefined || finalProf.systolicBP === null) &&
    (finalProf.diastolicBP === undefined || finalProf.diastolicBP === null) &&
    (finalProf.heartRate === undefined || finalProf.heartRate === null) &&
    (finalProf.fastingSugar === undefined || finalProf.fastingSugar === null) &&
    (finalProf.totalCholesterol === undefined || finalProf.totalCholesterol === null) &&
    (finalProf.serumCreatinine === undefined || finalProf.serumCreatinine === null) &&
    (finalProf.bmi === undefined || finalProf.bmi === null);

  if (profileCheck) {
    console.log('  -> PASS: Patient Profile has ONLY Hemoglobin = 12.5; all other canonical vitals remain "Not recorded"!');
    results.patientProfileIntegrity = 'PASS';
  } else {
    console.error('  -> FAIL: Patient Profile vitals were inappropriately altered!');
    results.patientProfileIntegrity = 'FAIL';
  }

  // STEP 8: Verify Confirmed Report Document in DB
  console.log('\n[STEP 8] Verifying Confirmed Report in Database...');
  const reportResp = await fetch(`${BASE_URL}/reports/${report._id}`, { headers: authHeaders });
  const fetchedReport = (await reportResp.json()).data;

  const confirmedMeas = fetchedReport.confirmedData?.measurements || {};
  const confirmedContext = fetchedReport.confirmedData?.patientContext || {};
  console.log('  -> Confirmed measurements count:', Object.keys(confirmedMeas).length);
  console.log('  -> Confirmed patientContext:', confirmedContext);
  console.log('  -> Confirmed structuredData:', fetchedReport.structuredData);

  const reportCheck =
    Object.keys(confirmedMeas).length === 14 &&
    confirmedContext.age === 21 &&
    confirmedContext.sex === 'male' &&
    fetchedReport.structuredData?.hemoglobin === 12.5 &&
    fetchedReport.structuredData?.plateletCount === 150000;

  if (reportCheck) {
    console.log('  -> PASS: Confirmed report retains all 14 CBC parameters, patient context, and structured data in DB.');
    results.reportPersistence = 'PASS';
  } else {
    console.error('  -> FAIL: Confirmed report persistence check failed!');
    results.reportPersistence = 'FAIL';
  }

  console.log('\n================================================================');
  console.log('  REAL E2E TEST SUMMARY:                                        ');
  console.log('================================================================');
  console.log(JSON.stringify(results, null, 2));

  return results;
}

runCbcE2ETest().catch(console.error);
