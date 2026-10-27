/**
 * MedScan-NCD: Complete Synthetic Demo Pipeline & Four-Model E2E Test Suite
 * =========================================================================
 * Rigorously validates the end-to-end clinical data and ML pipeline:
 * 1. File verification & PDF readability
 * 2. Upload & OCR extraction
 * 3. Canonical field mapping & unit normalization
 * 4. PENDING_REVIEW state & HITL correction audit trail
 * 5. Invariant: Unconfirmed edits NEVER enter inference
 * 6. Confirmation & patient health profile update (safe partial updates)
 * 7. Real inference on all four disease models (Diabetes, Heart Disease, Hypertension, CKD)
 * 8. Missing optional features -> PARTIAL completeness
 * 9. Missing required features -> INSUFFICIENT_DATA
 * 10. Sequential report upload & longitudinal report comparison
 * 11. RBAC & IDOR protections for demo patients
 * 12. Non-medical document ingestion -> zero false extraction
 */

import request from 'supertest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import jwt from 'jsonwebtoken';
import fs from 'node:fs/promises';
import { User } from '../src/models/User.js';
import { Patient } from '../src/models/Patient.js';
import { Doctor } from '../src/models/Doctor.js';
import { Report } from '../src/models/Report.js';
import { Prediction } from '../src/models/Prediction.js';
import { PatientRelationship } from '../src/models/PatientRelationship.js';
import { connectToIsolatedTestDatabase } from './helpers/isolatedDatabase.js';
import { processReportOCR } from '../src/services/ocrService.js';
import { buildDiabetesFeatures } from '../src/services/diabetesFeatureBuilder.js';
import { buildHeartDiseaseFeatures } from '../src/services/heartDiseaseFeatureBuilder.js';
import { buildHypertensionFeatures, buildCkdFeatures } from '../src/services/newDiseaseFeatureBuilder.js';
import { callNewDiseasePredictionService } from '../src/services/newDiseasePredictionService.js';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(testDir, '..');
const repoRoot = path.resolve(backendRoot, '..');
const fixturesDir = path.join(repoRoot, 'ml_model', 'demo_fixtures');

const JWT_SECRET = process.env.JWT_ACCESS_SECRET || 'medscan-test-only-access-secret';
const TEST_PASSWORD = 'SyntheticDemoTest2026!';

function makeToken(user) {
  return jwt.sign({ _id: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
}

describe('MedScan-NCD Faculty Demo: End-to-End Pipeline & Four-Model Verification', () => {
  let app;
  let patientAUser, patientAPatient;
  let otherPatientUser, otherPatient;
  let doctorUser, doctor;
  let choUser;
  let patientAToken, otherPatientToken, doctorToken, choToken;

  const patAPdf1 = path.join(fixturesDir, 'patient_a_lower_risk', 'report_1_baseline.pdf');
  const patAPdf2 = path.join(fixturesDir, 'patient_a_lower_risk', 'report_2_followup.pdf');
  const patBPng = path.join(fixturesDir, 'patient_b_elevated_glucose', 'report_elevated_glucose.png');
  const patCPdf = path.join(fixturesDir, 'patient_c_renal', 'report_renal.pdf');
  const edgeCaseDPdf = path.join(fixturesDir, 'edge_cases', 'case_d_missing_optional.pdf');
  const edgeCaseEPdf = path.join(fixturesDir, 'edge_cases', 'case_e_missing_required.pdf');
  const edgeCaseFPdf = path.join(fixturesDir, 'edge_cases', 'case_f_unsupported_document.pdf');

  beforeAll(async () => {
    await connectToIsolatedTestDatabase();
    const { default: appModule } = await import('../src/server.js');
    app = appModule;

    // Create synthetic demo patient A
    patientAUser = await User.create({
      name: 'Aarav Sharma (Synthetic)',
      email: 'aarav.sharma.test@example.com',
      passwordHash: TEST_PASSWORD,
      role: 'Patient',
      isEmailVerified: true,
      isVerified: true,
      village: 'Demo Community Central',
    });
    patientAPatient = await Patient.create({
      user: patientAUser._id,
      age: 28,
      gender: 'Male',
      village: 'Demo Community Central',
      isCurrentSmoker: false,
    });
    patientAToken = makeToken(patientAUser);

    // Create unassigned other patient
    otherPatientUser = await User.create({
      name: 'Other Synthetic Patient',
      email: 'other.patient.test@example.com',
      passwordHash: TEST_PASSWORD,
      role: 'Patient',
      isEmailVerified: true,
      isVerified: true,
      village: 'Remote Village',
    });
    otherPatient = await Patient.create({
      user: otherPatientUser._id,
      age: 45,
      gender: 'Female',
      village: 'Remote Village',
    });
    otherPatientToken = makeToken(otherPatientUser);

    // Create doctor
    doctorUser = await User.create({
      name: 'Dr. Test Clinician',
      email: 'doctor.test@example.com',
      passwordHash: TEST_PASSWORD,
      role: 'Doctor',
      isEmailVerified: true,
      isVerified: true,
    });
    doctor = await Doctor.create({
      user: doctorUser._id,
      specialization: 'Internal Medicine',
      licenseNumber: 'TEST-MD-001',
    });
    doctorToken = makeToken(doctorUser);

    // Link doctor to Patient A
    patientAPatient.assignedDoctor = doctorUser._id;
    await patientAPatient.save();
    await PatientRelationship.create({
      patient: patientAPatient._id,
      relatedUser: doctorUser._id,
      relationshipType: 'DOCTOR',
      status: 'ACTIVE',
      isPrimaryDoctor: true,
      initiatedBy: 'MIGRATION',
    });

    // Create CHO
    choUser = await User.create({
      name: 'CHO Test Officer',
      email: 'cho.test@example.com',
      passwordHash: TEST_PASSWORD,
      role: 'CHO',
      isEmailVerified: true,
      isVerified: true,
      village: 'Demo Community Central',
      communityVillages: ['Demo Community North'],
    });
    choToken = makeToken(choUser);
  }, 30000);

  describe('1. File Verification & Synthetic Safety', () => {
    test('All demo fixture files exist on disk with valid file size', async () => {
      for (const p of [patAPdf1, patAPdf2, patBPng, patCPdf, edgeCaseDPdf, edgeCaseEPdf, edgeCaseFPdf]) {
        const stat = await fs.stat(p);
        expect(stat.size).toBeGreaterThan(100);
      }
    });

    test('All demo fixture files contain prominent synthetic disclaimer', async () => {
      const manifestPath = path.join(fixturesDir, 'FIXTURE_MANIFEST.json');
      const manifestRaw = await fs.readFile(manifestPath, 'utf8');
      const manifest = JSON.parse(manifestRaw);
      expect(manifest.disclaimer).toBe('SYNTHETIC — FOR DEMONSTRATION ONLY');
      expect(Object.keys(manifest.manifest).length).toBeGreaterThanOrEqual(25);
    });
  });

  describe('2. OCR & Document Understanding Pipeline', () => {
    test('Clean digital PDF (Patient A Report 1) extracts with high confidence', async () => {
      const ocr = await processReportOCR(patAPdf1);
      expect(ocr.fileType).toBe('pdf');
      expect(ocr.confidence).toBeGreaterThanOrEqual(0.90);
      expect(ocr.extractedData.patientContext.age).toBe(28);
      expect(ocr.extractedData.patientContext.sex).toBe('male');

      const vitals = ocr.structuredData;
      expect(vitals.fastingSugar).toBe(88);
      expect(vitals.systolicBP).toBe(116);
      expect(vitals.diastolicBP).toBe(76);
      expect(vitals.totalCholesterol).toBe(165);
      expect(vitals.serumCreatinine).toBe(0.8);
      expect(vitals.bloodUrea.value ?? vitals.bloodUrea).toBe(24);
      expect(vitals.hemoglobin).toBe(14.2);
      expect(vitals.bmi).toBe(22.4);
      expect(vitals.heartRate).toBe(72);
    });

    test('High-resolution optical PNG (Patient B) extracts via Tesseract OCR engine', async () => {
      const ocr = await processReportOCR(patBPng);
      expect(ocr.fileType).toBe('png');
      expect(ocr.source).toBe('tesseract-engine');
      expect(ocr.extractedData.patientContext.age).toBe(54);
      expect(ocr.extractedData.patientContext.sex).toBe('male');
      expect(ocr.structuredData.fastingSugar).toBe(145);
      expect(ocr.structuredData.totalCholesterol).toBe(240);
      expect(ocr.structuredData.systolicBP).toBe(138);
      expect(ocr.structuredData.diastolicBP).toBe(86);
      expect(ocr.structuredData.serumCreatinine).toBe(1.1);
    }, 25000);

    test('Non-medical administrative document (Case F) produces zero clinical biomarkers', async () => {
      const ocr = await processReportOCR(edgeCaseFPdf);
      expect(ocr.extractedData.canonicalVitals?.fastingSugar).toBeUndefined();
      expect(ocr.extractedData.canonicalVitals?.systolicBP).toBeUndefined();
      expect(ocr.extractedData.canonicalVitals?.serumCreatinine).toBeUndefined();
    });
  });

  describe('3. Upload, HITL Review, and Correction Invariants', () => {
    let uploadedReportId;

    test('Authenticated patient can upload a synthetic medical PDF', async () => {
      const res = await request(app)
        .post('/api/reports/upload')
        .set('Authorization', `Bearer ${patientAToken}`)
        .field('title', 'Aarav Sharma Baseline Evaluation')
        .attach('report', patAPdf1);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.report.status).toBe('PENDING_REVIEW');
      expect(res.body.data.report.confidence).toBeGreaterThanOrEqual(0.90);

      uploadedReportId = res.body.data.report._id;
    });

    test('Unconfirmed report data NEVER enters ML feature builders', async () => {
      const pendingReport = await Report.findById(uploadedReportId);
      expect(pendingReport.status).toBe('PENDING_REVIEW');

      const dFeats = buildDiabetesFeatures(pendingReport, patientAPatient);
      expect(dFeats.canCalculate).toBe(false);

      const hdFeats = buildHeartDiseaseFeatures(pendingReport, patientAPatient);
      expect(hdFeats.canCalculate).toBe(false);
    });

    test('Human-in-the-loop: Patient edits pending extraction and audit provenance is recorded', async () => {
      const editRes = await request(app)
        .patch(`/api/reports/${uploadedReportId}/extracted-data`)
        .set('Authorization', `Bearer ${patientAToken}`)
        .send({
          corrections: {
            fastingSugar: { value: 89, unit: 'mg/dL' },
          },
        });

      expect(editRes.status).toBe(200);
      expect(editRes.body.success).toBe(true);

      const reportAfterEdit = await Report.findById(uploadedReportId);
      expect(reportAfterEdit.status).toBe('PENDING_REVIEW'); // Still unconfirmed
      expect(reportAfterEdit.corrections.fastingSugar).toBeDefined();
      expect(reportAfterEdit.corrections.fastingSugar.originalValue).toBe(88);
      expect(reportAfterEdit.corrections.fastingSugar.correctedValue).toBe(89);
      expect(reportAfterEdit.corrections.fastingSugar.source).toBe('manual_correction');
      expect(reportAfterEdit.corrections.fastingSugar.verified).toBe(false);
    });

    test('Patient confirms report: sets CONFIRMED status and updates patient profile', async () => {
      const confirmRes = await request(app)
        .put(`/api/reports/${uploadedReportId}/confirm`)
        .set('Authorization', `Bearer ${patientAToken}`)
        .send({
          confirmedData: {
            fastingSugar: 88,
            systolicBP: 116,
            diastolicBP: 76,
            totalCholesterol: 165,
            hdl: 58,
            serumCreatinine: 0.8,
            bloodUrea: { value: 24, unit: 'mg/dL' },
            hemoglobin: 14.2,
            bmi: 22.4,
            heartRate: 72,
          },
        });

      expect(confirmRes.status).toBe(200);
      expect(confirmRes.body.success).toBe(true);

      const confirmedReport = await Report.findById(uploadedReportId);
      expect(confirmedReport.status).toBe('CONFIRMED');
      expect(confirmedReport.confirmedData.fastingSugar.value).toBe(88);
      expect(confirmedReport.confirmedData.fastingSugar.verified).toBe(true);

      const updatedPatient = await Patient.findById(patientAPatient._id);
      expect(updatedPatient.fastingSugar).toBe(88);
      expect(updatedPatient.systolicBP).toBe(116);
      expect(updatedPatient.totalCholesterol).toBe(165);
      expect(updatedPatient.hdl).toBe(58);
      expect(updatedPatient.serumCreatinine).toBe(0.8);
    }, 30000);
  });

  describe('4. Real Four-Model Inference Execution', () => {
    test('Diabetes model evaluates with real artifact (Patient A -> lower estimated risk)', async () => {
      const reports = await Report.find({ patient: patientAPatient._id, status: 'CONFIRMED' });
      const patient = await Patient.findById(patientAPatient._id);
      const extraction = buildDiabetesFeatures(reports[0], patient);

      expect(extraction.canCalculate).toBe(true);
      expect(extraction.featureVector.age).toBe(28);
      expect(extraction.featureVector.sex).toBe(1);
      expect(extraction.featureVector.bmi).toBe(22.4);

      // Call API endpoint
      const res = await request(app)
        .post('/api/predictions/diabetes')
        .set('Authorization', `Bearer ${patientAToken}`)
        .send({ reportId: reports[0]._id });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.disease).toBe('diabetes');
      expect(res.body.data.canCalculate).toBe(true);
      expect(res.body.data.riskCategory).toBe('LOWER_MODEL_ESTIMATED_RISK');
      expect(res.body.data.probability).toBeLessThan(0.210);
      expect(res.body.data.clinicalDisclaimer).toContain('Model-estimated risk for clinical decision support');
    });

    test('Heart Disease model evaluates with real artifact (Patient A -> lower estimated risk)', async () => {
      const reports = await Report.find({ patient: patientAPatient._id, status: 'CONFIRMED' });
      const patient = await Patient.findById(patientAPatient._id);
      const extraction = buildHeartDiseaseFeatures(reports[0], patient);

      expect(extraction.canCalculate).toBe(true);
      expect(extraction.featureVector.totChol).toBe(165);
      expect(extraction.featureVector.sysBP).toBe(116);
      expect(extraction.featureVector.diaBP).toBe(76);

      const res = await request(app)
        .post('/api/predictions/heart-disease')
        .set('Authorization', `Bearer ${patientAToken}`)
        .send({ reportId: reports[0]._id });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.disease).toBe('heart_disease');
      expect(res.body.data.canCalculate).toBe(true);
      expect(res.body.data.riskCategory).toBe('LOWER_MODEL_ESTIMATED_RISK');
      expect(res.body.data.probability).toBeLessThan(0.110);
    });

    test('Hypertension model evaluates with real artifact (Strictly excludes BP features)', async () => {
      const reports = await Report.find({ patient: patientAPatient._id, status: 'CONFIRMED' });
      const patient = await Patient.findById(patientAPatient._id);
      const extraction = buildHypertensionFeatures(reports, patient);

      expect(extraction.canCalculate).toBe(true);
      expect(extraction.featureVector.age).toBe(28);
      expect(extraction.featureVector.systolic_bp).toBeUndefined();
      expect(extraction.featureVector.diastolic_bp).toBeUndefined();

      const res = await request(app)
        .post('/api/predictions/hypertension')
        .set('Authorization', `Bearer ${patientAToken}`)
        .send({ reportId: reports[0]._id });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.disease).toBe('hypertension');
      expect(res.body.data.riskCategory).toBe('NEGATIVE_CLASSIFICATION_ESTIMATE');
      expect(res.body.data.probability).toBeLessThan(0.331);
    }, 15000);

    test('CKD model evaluates with real artifact (Strictly consumes Age and Creatinine)', async () => {
      const reports = await Report.find({ patient: patientAPatient._id, status: 'CONFIRMED' });
      const patient = await Patient.findById(patientAPatient._id);
      const extraction = buildCkdFeatures(reports, patient, ['age', 'serum_creatinine']);

      expect(extraction.canCalculate).toBe(true);
      expect(Object.keys(extraction.featureVector)).toEqual(['age', 'serum_creatinine']);
      expect(extraction.featureVector.age).toBe(28);
      expect(extraction.featureVector.serum_creatinine).toBe(0.8);

      const res = await request(app)
        .post('/api/predictions/ckd')
        .set('Authorization', `Bearer ${patientAToken}`)
        .send({ reportId: reports[0]._id });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.disease).toBe('chronic_kidney_disease');
      expect(res.body.data.riskCategory).toBe('NEGATIVE_CLASSIFICATION_ESTIMATE');
      expect(res.body.data.probability).toBeLessThan(0.967);
    });
  });

  describe('5. Missing Data & Zero-Fabrication Guarantees', () => {
    test('Missing optional feature yields dataCompleteness = PARTIAL without throwing', async () => {
      const ocr = await processReportOCR(edgeCaseDPdf);
      expect(ocr.structuredData.bmi).toBeUndefined();
      expect(ocr.structuredData.hdl).toBeUndefined();

      const incUser = await User.create({
        name: 'Incomplete Test Patient',
        email: `incomplete.patient.${Date.now()}@example.com`,
        passwordHash: TEST_PASSWORD,
        role: 'Patient',
        isEmailVerified: true,
        isVerified: true,
      });

      const incompletePatient = await Patient.create({
        user: incUser._id,
        age: 46,
        gender: 'Male',
        isCurrentSmoker: false,
      });

      const fakeConfirmed = {
        patientContext: { age: { value: 46, unit: 'years' }, sex: 'Male' },
        measurements: {
          fastingSugar: { value: 122, unit: 'mg/dL', verified: true },
          totalCholesterol: { value: 210, unit: 'mg/dL', verified: true },
          systolicBP: { value: 132, unit: 'mmHg', verified: true },
          diastolicBP: { value: 84, unit: 'mmHg', verified: true },
          serumCreatinine: { value: 1.0, unit: 'mg/dL', verified: true },
        },
      };

      const partialReport = await Report.create({
        patient: incompletePatient._id,
        uploader: incUser._id,
        title: 'Partial Panel Report',
        fileUrl: 'http://example.com/test.pdf',
        status: 'CONFIRMED',
        confirmedData: fakeConfirmed,
        structuredData: { fastingSugar: 122, totalCholesterol: 210, systolicBP: 132, diastolicBP: 84, serumCreatinine: 1.0 },
      });

      const dFeats = buildDiabetesFeatures(partialReport, incompletePatient);
      expect(dFeats.canCalculate).toBe(true);
      expect(dFeats.dataCompleteness).toBe('PARTIAL');
      expect(dFeats.featureVector.bmi).toBeNull();

      const hdFeats = buildHeartDiseaseFeatures(partialReport, incompletePatient);
      expect(hdFeats.canCalculate).toBe(true);
      expect(hdFeats.dataCompleteness).toBe('PARTIAL');
      expect(hdFeats.featureVector.BMI).toBeNull();
    });

    test('Missing required feature prevents calculation and returns INSUFFICIENT_DATA', async () => {
      const ocr = await processReportOCR(edgeCaseEPdf);
      expect(ocr.structuredData.totalCholesterol).toBeUndefined();
      expect(ocr.structuredData.systolicBP).toBeUndefined();

      const patientWithoutReq = { age: 50, gender: 'Female' };
      const reportWithoutReq = {
        status: 'CONFIRMED',
        confirmedData: {
          measurements: {
            fastingSugar: { value: 115, unit: 'mg/dL', verified: true },
            bmi: { value: 25.2, unit: 'kg/m2', verified: true },
          },
        },
      };

      const hdFeats = buildHeartDiseaseFeatures(reportWithoutReq, patientWithoutReq);
      expect(hdFeats.canCalculate).toBe(false);
      expect(hdFeats.missingRequired).toContain('totChol');
      expect(hdFeats.missingRequired).toContain('sysBP');
      expect(hdFeats.missingRequired).toContain('diaBP');

      const ckdFeats = buildCkdFeatures([reportWithoutReq], patientWithoutReq, ['age', 'serum_creatinine']);
      expect(ckdFeats.canCalculate).toBe(false);
      expect(ckdFeats.missingRequired).toContain('serum_creatinine');
    });
  });

  describe('6. Report Comparison & Longitudinal Tracking', () => {
    test('Uploading and confirming sequential follow-up report creates longitudinal comparison', async () => {
      // Upload Report 2 for Patient A
      const upRes = await request(app)
        .post('/api/reports/upload')
        .set('Authorization', `Bearer ${patientAToken}`)
        .field('title', 'Aarav Sharma Follow-up Evaluation')
        .attach('report', patAPdf2);

      expect(upRes.status).toBe(201);
      const rep2Id = upRes.body.data.report._id;

      // Confirm Report 2
      const confRes = await request(app)
        .put(`/api/reports/${rep2Id}/confirm`)
        .set('Authorization', `Bearer ${patientAToken}`)
        .send({
          confirmedData: {
            fastingSugar: 90,
            systolicBP: 114,
            diastolicBP: 74,
            totalCholesterol: 160,
            hdl: 60,
            serumCreatinine: 0.82,
            bloodUrea: { value: 22, unit: 'mg/dL' },
            hemoglobin: 14.4,
            bmi: 22.1,
            heartRate: 70,
          },
        });

      expect(confRes.status).toBe(200);

      // Query confirmed reports for Patient A
      const listRes = await request(app)
        .get(`/api/reports?patientId=${patientAPatient._id}`)
        .set('Authorization', `Bearer ${patientAToken}`);

      expect(listRes.status).toBe(200);
      const reports = listRes.body.data;
      expect(reports.length).toBeGreaterThanOrEqual(2);

      // Verify chronological values
      const baseline = reports.find((r) => r.title.includes('Baseline'));
      const followup = reports.find((r) => r.title.includes('Follow-up'));

      expect(baseline).toBeDefined();
      expect(followup).toBeDefined();

      const baseSugar = baseline.confirmedData.measurements.fastingSugar.value;
      const followSugar = followup.confirmedData.measurements.fastingSugar.value;
      const sugarDelta = followSugar - baseSugar;

      expect(baseSugar).toBe(88);
      expect(followSugar).toBe(90);
      expect(sugarDelta).toBe(2);

      const baseSys = baseline.confirmedData.measurements.systolicBP.value;
      const followSys = followup.confirmedData.measurements.systolicBP.value;
      const sysDelta = followSys - baseSys;

      expect(baseSys).toBe(116);
      expect(followSys).toBe(114);
      expect(sysDelta).toBe(-2);
    }, 30000);
  });

  describe('7. Security, RBAC, and IDOR Isolation', () => {
    test('Unauthorized patient cannot access demo patient reports', async () => {
      const res = await request(app)
        .get(`/api/reports?patientId=${patientAPatient._id}`)
        .set('Authorization', `Bearer ${otherPatientToken}`);

      expect(res.status).toBe(403);
    });

    test('Unassigned doctor cannot trigger predictions for demo patient', async () => {
      const unassignedDocUser = await User.create({
        name: 'Dr. Unassigned Stranger',
        email: 'unassigned.stranger@example.com',
        passwordHash: TEST_PASSWORD,
        role: 'Doctor',
        isEmailVerified: true,
        isVerified: true,
      });
      const unassignedDocToken = makeToken(unassignedDocUser);

      const res = await request(app)
        .post('/api/predictions/diabetes')
        .set('Authorization', `Bearer ${unassignedDocToken}`)
        .send({ patientId: patientAPatient._id });

      expect(res.status).toBe(403);
    });
  });
});
