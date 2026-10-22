import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import fs from 'node:fs/promises';
import path from 'node:path';
import { User } from '../src/models/User.js';
import { Patient } from '../src/models/Patient.js';
import { Prediction } from '../src/models/Prediction.js';
import { Notification } from '../src/models/Notification.js';
import { Doctor } from '../src/models/Doctor.js';
import { connectToIsolatedTestDatabase } from './helpers/isolatedDatabase.js';

const JWT_SECRET = process.env.JWT_ACCESS_SECRET || 'your_super_secret_access_key_12345!';
const TEST_PASSWORD = 'SyntheticTest123!';

function makeToken(user, expiresIn = '1h') {
  return jwt.sign(
    { _id: user._id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn },
  );
}

function makePdf(text) {
  const escapePdfText = (value) => value.replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)');
  const textOperations = text.split(/\r?\n/).map((line, index) =>
    `${index === 0 ? '50 740 Td' : '0 -16 Td'} (${escapePdfText(line)}) Tj`,
  ).join(' ');
  const stream = `BT /F1 11 Tf ${textOperations} ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, 'binary');
}

describe('Authenticated synthetic API workflows', () => {
  let app;
  let patientUser;
  let patient;
  let otherPatientUser;
  let otherPatient;
  let doctorUser;
  let adminUser;
  let patientToken;
  let doctorToken;
  let adminToken;
  let uploadedFilePath;
  let reportId;
  let isolatedDatabaseReady = false;

  beforeAll(async () => {
    await connectToIsolatedTestDatabase();
    isolatedDatabaseReady = true;
    const { default: appModule } = await import('../src/server.js');
    app = appModule;

    patientUser = await User.create({
      name: 'Synthetic Workflow Patient',
      email: 'synthetic_workflow_patient@medscan-test.invalid',
      passwordHash: TEST_PASSWORD,
      role: 'Patient', isEmailVerified: true, isVerified: true,
    });
    patient = await Patient.create({
      user: patientUser._id,
      age: 52,
      gender: 'Male',
      village: 'Synthetic Test Village',
      bmi: 26.5,
      isCurrentSmoker: false,
    });

    otherPatientUser = await User.create({
      name: 'Unrelated Synthetic Patient',
      email: 'synthetic_workflow_other@medscan-test.invalid',
      passwordHash: TEST_PASSWORD,
      role: 'Patient', isEmailVerified: true, isVerified: true,
    });
    otherPatient = await Patient.create({ user: otherPatientUser._id, age: 49, gender: 'Female' });

    doctorUser = await User.create({
      name: 'Synthetic Workflow Doctor',
      email: 'synthetic_workflow_doctor@medscan-test.invalid',
      passwordHash: TEST_PASSWORD,
      role: 'Doctor', isEmailVerified: true, isVerified: true,
    });
    await Doctor.create({ user: doctorUser._id, specialization: 'General Medicine', licenseNumber: 'SYNTHETIC-TEST-LICENSE' });
    patient.assignedDoctor = doctorUser._id;
    await patient.save();

    adminUser = await User.create({
      name: 'Synthetic Workflow Admin',
      email: 'synthetic_workflow_admin@medscan-test.invalid',
      passwordHash: TEST_PASSWORD,
      role: 'Admin', isEmailVerified: true, isVerified: true,
    });

    patientToken = makeToken(patientUser);
    doctorToken = makeToken(doctorUser);
    adminToken = makeToken(adminUser);
  }, 30000);

  afterAll(async () => {
    if (uploadedFilePath) await fs.unlink(uploadedFilePath).catch(() => {});
    if (isolatedDatabaseReady && mongoose.connection.readyState !== 0) await mongoose.disconnect();
  });

  test('login, current-user, invalid token, and expired token', async () => {
    const login = await request(app).post('/api/auth/login').send({
      email: patientUser.email,
      password: TEST_PASSWORD,
    });
    expect(login.status).toBe(200);
    expect(login.body.data.accessToken).toBeTruthy();

    const current = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${login.body.data.accessToken}`);
    expect(current.status).toBe(200);
    expect(current.body.data.user.email).toBe(patientUser.email);
    expect(current.body.data.patient._id).toBe(patient._id.toString());

    const invalid = await request(app).get('/api/patients/me').set('Authorization', 'Bearer invalid-token');
    expect(invalid.status).toBe(401);

    const expired = await request(app)
      .get('/api/patients/me')
      .set('Authorization', `Bearer ${makeToken(patientUser, '-1s')}`);
    expect(expired.status).toBe(401);
  });

  test('patient profile read/update and doctor patient scoping', async () => {
    const ownProfile = await request(app)
      .get('/api/patients/me')
      .set('Authorization', `Bearer ${patientToken}`);
    expect(ownProfile.status).toBe(200);
    expect(ownProfile.body.data._id).toBe(patient._id.toString());

    const updated = await request(app)
      .patch('/api/patients/me/demographics')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ age: 53, gender: 'Male', bmi: 27.1, village: 'Synthetic Test Village' });
    expect(updated.status).toBe(200);
    expect(updated.body.data.age).toBe(53);

    const assigned = await request(app)
      .get(`/api/patients/${patient._id}`)
      .set('Authorization', `Bearer ${doctorToken}`);
    expect(assigned.status).toBe(200);

    const unrelated = await request(app)
      .get(`/api/patients/${otherPatient._id}`)
      .set('Authorization', `Bearer ${doctorToken}`);
    expect(unrelated.status).toBe(403);
  });

  test('multipart PDF upload, OCR text extraction, review, and confirmation', async () => {
    const upload = await request(app)
      .post('/api/reports/upload')
      .set('Authorization', `Bearer ${patientToken}`)
      .field('title', 'Synthetic metabolic panel')
      .attach(
        'report',
        makePdf('Synthetic medical report.\nFasting blood glucose: 111 mg/dL.\nSystolic BP: 131 mmHg.\nDiastolic BP: 82 mmHg.\nTotal cholesterol: 218 mg/dL.\nHDL: 52 mg/dL.\nSerum Creatinine: 1.2 mg/dL.\nBlood Urea: 48.05 mg/dL.'),
        { filename: 'synthetic-metabolic-panel.pdf', contentType: 'application/pdf' },
      );

    expect(upload.status).toBe(201);
    expect(upload.body.data.report.status).toBe('PENDING_REVIEW');
    expect(upload.body.data.report.rawOcrText).toContain('Fasting blood glucose');
    expect(upload.body.data.report.storageProvider).toBe('local');
    reportId = upload.body.data.report._id;
    uploadedFilePath = path.join(process.cwd(), 'uploads', path.basename(upload.body.data.report.publicId));

    const predictionBeforeConfirmation = await request(app)
      .post('/api/predictions/ckd')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ reportId });
    expect(predictionBeforeConfirmation.status).toBe(400);

    const fetched = await request(app)
      .get(`/api/reports/${reportId}`)
      .set('Authorization', `Bearer ${patientToken}`);
    expect(fetched.status).toBe(200);
    expect(fetched.body.data.rawOcrText).toContain('Total cholesterol');

    const edited = await request(app)
      .patch(`/api/reports/${reportId}/extracted-data`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ corrections: {
        fastingSugar: { value: 111, unit: 'mg/dL' },
        bloodUrea: { value: 8.5, unit: 'mmol/L' },
      } });
    expect(edited.status).toBe(200);

    const confirmed = await request(app)
      .put(`/api/reports/${reportId}/confirm`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ confirmedData: {
        fastingSugar: { value: 111, unit: 'mg/dL' },
        systolicBP: { value: 131, unit: 'mmHg' },
        diastolicBP: { value: 82, unit: 'mmHg' },
        totalCholesterol: { value: 218, unit: 'mg/dL' },
        hdl: { value: 52, unit: 'mg/dL' },
        bmi: { value: 27.1, unit: 'kg/m2' },
        serumCreatinine: { value: 1.2, unit: 'mg/dL' },
        bloodUrea: { value: 8.5, unit: 'mmol/L' },
      } });
    expect(confirmed.status).toBe(200);
    expect(confirmed.body.data.report.status).toBe('CONFIRMED');
    expect(confirmed.body.data.report.confirmedData.fastingSugar.verified).toBe(true);
    expect(confirmed.body.data.report.confirmedData.bloodUrea.value).toBeCloseTo(51.05, 2);
    expect(confirmed.body.data.report.confirmedData.bloodUrea.verified).toBe(true);
    expect(confirmed.body.data.report.confirmedData.bloodUrea.source).toBe('manual_correction');
    expect(confirmed.body.data.report.confirmedData.bloodUrea.conversionApplied).toBe(true);
    const refreshedPatient = await Patient.findById(patient._id);
    expect(refreshedPatient.bloodUrea).toBeCloseTo(51.05, 2);
  }, 30000);

  test('confirmed report feeds authenticated diabetes and heart-disease inference', async () => {
    expect(reportId).toBeTruthy();

    const diabetes = await request(app)
      .post('/api/predictions/diabetes')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ reportId });
    expect(diabetes.status).toBe(200);
    expect(diabetes.body.data.canCalculate).toBe(true);
    expect(typeof diabetes.body.data.probability).toBe('number');

    const heartDisease = await request(app)
      .post('/api/predictions/heart-disease')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ reportId });
    expect(heartDisease.status).toBe(200);
    expect(heartDisease.body.data.canCalculate).toBe(true);
    expect(typeof heartDisease.body.data.probability).toBe('number');
  }, 30000);

  const researchModelE2e = process.env.RUN_RESEARCH_MODEL_E2E === 'true';
  (researchModelE2e ? test : test.skip)('confirmed report feeds authenticated hypertension and CKD model inference', async () => {
    const hypertension = await request(app)
      .post('/api/predictions/hypertension')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ reportId });
    expect(hypertension.status).toBe(200);
    expect(hypertension.body.data.disease).toBe('hypertension');
    expect(hypertension.body.data.featureSchemaVersion).toBe('hypertension.v1');
    expect(hypertension.body.data.modelVersion).toBe('1.0.0-research');
    expect(hypertension.body.data.probability).toBeGreaterThanOrEqual(0);
    expect(hypertension.body.data.probability).toBeLessThanOrEqual(1);
    expect(hypertension.body.data.threshold).toBeGreaterThanOrEqual(0);
    expect(hypertension.body.data.threshold).toBeLessThanOrEqual(1);
    expect(hypertension.body.data.riskCategory).toBe(
      hypertension.body.data.probability >= hypertension.body.data.threshold
        ? 'POSITIVE_CLASSIFICATION_ESTIMATE'
        : 'NEGATIVE_CLASSIFICATION_ESTIMATE',
    );
    expect(hypertension.body.data.explanationStatus).toBe('unavailable');
    expect(JSON.stringify(hypertension.body)).not.toContain(process.env.ML_INTERNAL_API_KEY);
    const hypertensionRecord = await Prediction.findById(hypertension.body.data._id);
    expect(String(hypertensionRecord.patient)).toBe(String(patient._id));
    expect(String(hypertensionRecord.report)).toBe(String(reportId));
    expect(hypertensionRecord.topContributingFactors).toHaveLength(0);
    expect(hypertensionRecord.explanationStatus).toBe('unavailable');

    const ckd = await request(app)
      .post('/api/predictions/ckd')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ reportId });
    expect(ckd.status).toBe(200);
    expect(ckd.body.data.disease).toBe('chronic_kidney_disease');
    expect(ckd.body.data.featureSchemaVersion).toBe('ckd.a_minimal.v1');
    expect(ckd.body.data.modelVersion).toBe('1.0.0-research');
    expect(ckd.body.data.probability).toBeGreaterThanOrEqual(0);
    expect(ckd.body.data.probability).toBeLessThanOrEqual(1);
    expect(ckd.body.data.threshold).toBeGreaterThanOrEqual(0);
    expect(ckd.body.data.threshold).toBeLessThanOrEqual(1);
    expect(ckd.body.data.riskCategory).toBe(
      ckd.body.data.probability >= ckd.body.data.threshold
        ? 'POSITIVE_CLASSIFICATION_ESTIMATE'
        : 'NEGATIVE_CLASSIFICATION_ESTIMATE',
    );
    expect(ckd.body.data.explanationStatus).toBe('unavailable');
    expect(JSON.stringify(ckd.body)).not.toContain(process.env.ML_INTERNAL_API_KEY);
    const ckdRecord = await Prediction.findById(ckd.body.data._id);
    expect(String(ckdRecord.patient)).toBe(String(patient._id));
    expect(String(ckdRecord.report)).toBe(String(reportId));
    expect(ckdRecord.topContributingFactors).toHaveLength(0);
    expect(ckdRecord.explanationStatus).toBe('unavailable');

    const unauthenticated = await request(app).post('/api/predictions/hypertension').send({ reportId });
    expect(unauthenticated.status).toBe(401);
    const spoofedPatient = await request(app)
      .post('/api/predictions/ckd')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ reportId, patientId: otherPatient._id });
    expect(spoofedPatient.status).toBe(403);
    const clientFeatures = await request(app)
      .post('/api/predictions/ckd')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ reportId, features: { age: 55, serum_creatinine: 99 } });
    expect(clientFeatures.status).toBe(400);

    const noKey = process.env.ML_INTERNAL_API_KEY;
    delete process.env.ML_INTERNAL_API_KEY;
    let missingKeyResponse;
    try {
      missingKeyResponse = await request(app)
        .post('/api/predictions/hypertension')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ reportId });
    } finally {
      process.env.ML_INTERNAL_API_KEY = noKey;
    }
    expect(missingKeyResponse.status).toBe(503);
    expect(JSON.stringify(missingKeyResponse.body)).not.toContain(noKey);

    const correctServiceUrl = process.env.DIABETES_ML_SERVICE_URL;
    process.env.DIABETES_ML_SERVICE_URL = 'http://127.0.0.1:1';
    let unavailableResponse;
    try {
      unavailableResponse = await request(app)
        .post('/api/predictions/ckd')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ reportId });
    } finally {
      process.env.DIABETES_ML_SERVICE_URL = correctServiceUrl;
    }
    expect(unavailableResponse.status).toBe(503);
    expect(unavailableResponse.body.data.probability).toBeNull();

    const correctKey = process.env.ML_INTERNAL_API_KEY;
    process.env.ML_INTERNAL_API_KEY = 'wrong-integration-test-token';
    let wrongTokenResponse;
    try {
      wrongTokenResponse = await request(app)
        .post('/api/predictions/hypertension')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ reportId });
    } finally {
      process.env.ML_INTERNAL_API_KEY = correctKey;
    }
    expect(wrongTokenResponse.status).toBe(503);
    expect(wrongTokenResponse.body.data.probability).toBeNull();
    expect(JSON.stringify(wrongTokenResponse.body)).not.toContain(correctKey);

    const missingUser = await User.create({
      name: 'Synthetic Missing Data Patient',
      email: 'synthetic_missing_data@medscan-test.invalid',
      passwordHash: TEST_PASSWORD,
      role: 'Patient', isEmailVerified: true, isVerified: true,
    });
    await Patient.create({ user: missingUser._id, village: 'Synthetic Test Village' });
    const missingData = await request(app)
      .post('/api/predictions/ckd')
      .set('Authorization', `Bearer ${makeToken(missingUser)}`)
      .send({});
    expect(missingData.status).toBe(200);
    expect(missingData.body.data.status).toBe('INSUFFICIENT_DATA');
    expect(missingData.body.data.probability).toBeNull();
  }, 30000);

  test('appointment list/create/update and notification list/read', async () => {
    const created = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ patientId: patient._id, doctorId: doctorUser._id, date: new Date(Date.now() + 14 * 86400000).toISOString(), time: '10:30 AM', reason: 'Synthetic test visit' });
    expect(created.status).toBe(201);
    expect(created.body.data.status).toBe('Upcoming');

    const listed = await request(app)
      .get('/api/appointments')
      .set('Authorization', `Bearer ${patientToken}`);
    expect(listed.status).toBe(200);
    expect(listed.body.data.some((item) => item._id === created.body.data._id)).toBe(true);

    const updated = await request(app)
      .put(`/api/appointments/${created.body.data._id}`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ status: 'Completed', notes: 'Synthetic workflow verification' });
    expect(updated.status).toBe(200);
    expect(updated.body.data.status).toBe('Completed');

    const notification = await Notification.create({
      recipient: patientUser._id,
      type: 'SystemNotification',
      title: 'Synthetic test alert',
      message: 'Local integration test only.',
    });
    const notifications = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${patientToken}`);
    expect(notifications.status).toBe(200);
    expect(notifications.body.data.notifications.some((item) => item._id === notification._id.toString())).toBe(true);

    const read = await request(app)
      .put(`/api/notifications/${notification._id}/read`)
      .set('Authorization', `Bearer ${patientToken}`);
    expect(read.status).toBe(200);
    expect(read.body.data.isRead).toBe(true);

    const secondNotification = await Notification.create({
      recipient: patientUser._id,
      type: 'SystemNotification',
      title: 'Synthetic test alert 2',
      message: 'Local integration test only.',
    });
    const readAll = await request(app)
      .put('/api/notifications/read-all')
      .set('Authorization', `Bearer ${patientToken}`);
    expect(readAll.status).toBe(200);
    expect(await Notification.findById(secondNotification._id).then((item) => item.isRead)).toBe(true);
  });

  test('Admin can list, create, and delete an account while non-admin creation is denied', async () => {
    const list = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(list.status).toBe(200);
    expect(list.body.data.some((user) => user._id === patientUser._id.toString())).toBe(true);

    const created = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Synthetic CHO', email: 'synthetic_workflow_cho@medscan-test.invalid', password: TEST_PASSWORD, role: 'CHO' });
    expect(created.status).toBe(201);
    expect(created.body.data.role).toBe('CHO');
    expect(created.body.data.passwordHash).toBeUndefined();

    const denied = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ name: 'Unauthorized', email: 'synthetic_unauthorized@medscan-test.invalid', password: TEST_PASSWORD, role: 'Admin' });
    expect(denied.status).toBe(403);

    const removed = await request(app)
      .delete(`/api/users/${created.body.data._id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(removed.status).toBe(200);
    expect(await User.findById(created.body.data._id)).toBeNull();
  });
});
