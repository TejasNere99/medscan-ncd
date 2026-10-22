import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { User } from '../src/models/User.js';
import { Patient } from '../src/models/Patient.js';
import { Report } from '../src/models/Report.js';
import { Prediction } from '../src/models/Prediction.js';
import { connectToIsolatedTestDatabase } from './helpers/isolatedDatabase.js';

const JWT_SECRET = process.env.JWT_ACCESS_SECRET || 'your_super_secret_access_key_12345!';

const createAuthHeader = (user) => {
  const token = jwt.sign(
    { _id: user._id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
  return `Bearer ${token}`;
};

describe('Phase P0: Critical RBAC & IDOR Security Test Suite', () => {
  let app;
  let patientAUser, patientBUser, doctorUser, unassignedDoctorUser;
  let choUser, adminUser;
  let patientADoc, patientBDoc, unassignedPatientDoc;
  let reportADoc;
  let isolatedDatabaseReady = false;

  beforeAll(async () => {
    await connectToIsolatedTestDatabase();
    isolatedDatabaseReady = true;
    const { default: appModule } = await import('../src/server.js');
    app = appModule;

    // Clean test artifacts
    await User.deleteMany({ email: { $regex: /@p0test\.com$/ } });
    await Patient.deleteMany({ village: 'P0_Test_Village' });
    await Report.deleteMany({ title: { $regex: /^P0_Test_/ } });
    await Prediction.deleteMany({ clinicalDisclaimer: 'P0_TEST_PREDICTION' });

    // 1. Create Users
    patientAUser = await User.create({
      name: 'Patient A',
      email: 'patient_a@p0test.com',
      passwordHash: 'hashed123',
      role: 'Patient', isEmailVerified: true, isVerified: true,
      village: 'P0_Test_Village',
    });

    patientBUser = await User.create({
      name: 'Patient B',
      email: 'patient_b@p0test.com',
      passwordHash: 'hashed123',
      role: 'Patient', isEmailVerified: true, isVerified: true,
      village: 'P0_Test_Village',
    });

    doctorUser = await User.create({
      name: 'Doctor Assigned',
      email: 'doctor_assigned@p0test.com',
      passwordHash: 'hashed123',
      role: 'Doctor', isEmailVerified: true, isVerified: true,
    });

    unassignedDoctorUser = await User.create({
      name: 'Doctor Unassigned',
      email: 'doctor_unassigned@p0test.com',
      passwordHash: 'hashed123',
      role: 'Doctor', isEmailVerified: true, isVerified: true,
    });

    choUser = await User.create({
      name: 'CHO User',
      email: 'cho_user@p0test.com',
      passwordHash: 'hashed123',
      role: 'CHO', isEmailVerified: true, isVerified: true,
      village: 'P0_Test_Village',
    });

    adminUser = await User.create({
      name: 'Admin User',
      email: 'admin_user@p0test.com',
      passwordHash: 'hashed123',
      role: 'Admin', isEmailVerified: true, isVerified: true,
    });

    // 2. Create Patients
    patientADoc = await Patient.create({
      user: patientAUser._id,
      age: 48,
      gender: 'Male',
      village: 'P0_Test_Village',
      systolicBP: 135,
      diastolicBP: 88,
      fastingSugar: 130,
      bmi: 26.5,
      assignedDoctor: doctorUser._id,
    });

    patientBDoc = await Patient.create({
      user: patientBUser._id,
      age: 55,
      gender: 'Female',
      village: 'P0_Test_Village',
      systolicBP: 145,
      diastolicBP: 92,
      fastingSugar: 160,
      bmi: 28.0,
      // Not assigned to doctorUser or nurseUser
    });

    unassignedPatientDoc = await Patient.create({
      user: new mongoose.Types.ObjectId(),
      age: 60,
      gender: 'Male',
      village: 'P0_Test_Village',
    });

    // 3. Create a pending report for Patient A
    reportADoc = await Report.create({
      patient: patientADoc._id,
      uploader: patientAUser._id,
      title: 'P0_Test_CBC_Report',
      reportType: 'General Laboratory Report',
      fileUrl: 'http://localhost/test.pdf',
      status: 'PENDING_REVIEW',
      rawOcrText: 'ORIGINAL_RAW_OCR_CONTENT_123',
      initialExtraction: {
        canonicalVitals: {
          fastingSugar: 130,
          systolicBP: 135,
          diastolicBP: 88,
        },
      },
      extractedData: {
        canonicalVitals: {
          fastingSugar: 130,
          systolicBP: 135,
          diastolicBP: 88,
        },
      },
      corrections: {},
    });
  }, 30000);

  afterAll(async () => {
    if (!isolatedDatabaseReady) return;
    await User.deleteMany({ email: { $regex: /@p0test\.com$/ } });
    await Patient.deleteMany({ village: 'P0_Test_Village' });
    await Report.deleteMany({ title: { $regex: /^P0_Test_/ } });
    await Prediction.deleteMany({ clinicalDisclaimer: 'P0_TEST_PREDICTION' });
    await mongoose.connection.close();
  });

  // ==========================================
  // 1. PUBLIC REGISTRATION ROLE QUARANTINE
  // ==========================================
  describe('1. Public Registration Role Quarantine', () => {
    it('1. Patient registration succeeds', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'New Patient',
        email: 'new_patient_reg@p0test.com',
        password: 'Password123!',
        role: 'Patient',
      });
      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('2. Doctor registration rejected with 403', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Fake Doctor',
        email: 'fake_doctor_reg@p0test.com',
        password: 'Password123!',
        role: 'Doctor',
      });
      expect(res.statusCode).toBe(403);
      expect(res.body.message).toContain('Public registration is restricted to Patient accounts');
    });

    it('3. Nurse registration rejected with 403', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Fake Nurse',
        email: 'fake_nurse_reg@p0test.com',
        password: 'Password123!',
        role: 'Nurse',
      });
      expect(res.statusCode).toBe(403);
    });

    it('4. CHO registration rejected with 403', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Fake CHO',
        email: 'fake_cho_reg@p0test.com',
        password: 'Password123!',
        role: 'CHO',
      });
      expect(res.statusCode).toBe(403);
    });

    it('5. Admin registration rejected with 403', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Fake Admin',
        email: 'fake_admin_reg@p0test.com',
        password: 'Password123!',
        role: 'Admin',
      });
      expect(res.statusCode).toBe(403);
    });

    it('6. Family registration rejected with 403', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Fake Family',
        email: 'fake_family_reg@p0test.com',
        password: 'Password123!',
        role: 'Family',
      });
      expect(res.statusCode).toBe(403);
    });
  });

  describe('Admin user provisioning', () => {
    it('allows Admin to create a canonical-role account with a linked patient profile', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', createAuthHeader(adminUser))
        .send({
          name: 'Admin Provisioned Patient',
          email: 'admin_created@p0test.com',
          password: 'Temporary123!',
          role: 'Patient',
          village: 'P0_Test_Village',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.role).toBe('Patient');
      expect(res.body.data.passwordHash).toBeUndefined();
      expect(await Patient.findOne({ user: res.body.data._id })).not.toBeNull();
    });

    it('blocks non-Admin users from provisioning accounts', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', createAuthHeader(patientAUser))
        .send({
          name: 'Unauthorized Account',
          email: 'unauthorized_created@p0test.com',
          password: 'Temporary123!',
          role: 'Doctor',
        });

      expect(res.statusCode).toBe(403);
      expect(await User.findOne({ email: 'unauthorized_created@p0test.com' })).toBeNull();
    });
  });

  // ==========================================
  // 2. PATIENT PROFILE IDOR
  // ==========================================
  describe('2. Patient Profile IDOR Controls', () => {
    it('7. Patient A -> own profile succeeds (200)', async () => {
      const res = await request(app)
        .get(`/api/patients/${patientADoc._id}`)
        .set('Authorization', createAuthHeader(patientAUser));
      expect(res.statusCode).toBe(200);
      expect(res.body.data._id.toString()).toBe(patientADoc._id.toString());
    });

    it('8. Patient A -> Patient B profile is blocked (403)', async () => {
      const res = await request(app)
        .get(`/api/patients/${patientBDoc._id}`)
        .set('Authorization', createAuthHeader(patientAUser));
      expect(res.statusCode).toBe(403);
    });

    it('9. Admin -> patient profile is blocked (403)', async () => {
      const res = await request(app)
        .get(`/api/patients/${patientADoc._id}`)
        .set('Authorization', createAuthHeader(adminUser));
      expect(res.statusCode).toBe(403);
      expect(res.body.message).toContain('Administrative accounts cannot access clinical patient profiles');
    });

    it('10. Unassigned Doctor -> patient is blocked (403)', async () => {
      const res = await request(app)
        .get(`/api/patients/${patientADoc._id}`)
        .set('Authorization', createAuthHeader(unassignedDoctorUser));
      expect(res.statusCode).toBe(403);
    });

    it('11. CHO can read a patient profile in the community', async () => {
      const res = await request(app)
        .get(`/api/patients/${patientBDoc._id}`)
        .set('Authorization', createAuthHeader(choUser));
      expect(res.statusCode).toBe(200);
    });
  });

  // ==========================================
  // 3. REPORT DISCLOSURE & IDOR
  // ==========================================
  describe('3. Report Disclosure & Scoping', () => {
    it('12. Global GET /api/reports without patientId rejected for Doctor (400)', async () => {
      const res = await request(app)
        .get('/api/reports')
        .set('Authorization', createAuthHeader(doctorUser));
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('patientId parameter is required');
    });

    it('13. Patient A -> Patient B reports query is blocked or isolated (403)', async () => {
      const res = await request(app)
        .get(`/api/reports/${reportADoc._id}`)
        .set('Authorization', createAuthHeader(patientBUser));
      expect(res.statusCode).toBe(403);
    });

    it('14. Unassigned Doctor -> report access blocked (403)', async () => {
      const res = await request(app)
        .get(`/api/reports/${reportADoc._id}`)
        .set('Authorization', createAuthHeader(unassignedDoctorUser));
      expect(res.statusCode).toBe(403);
    });

    it('15. Admin -> clinical report blocked (403)', async () => {
      const res = await request(app)
        .get(`/api/reports/${reportADoc._id}`)
        .set('Authorization', createAuthHeader(adminUser));
      expect(res.statusCode).toBe(403);
    });

    it('16. Nurse and Family are rejected by the current User schema', () => {
      for (const role of ['Nurse', 'Family']) {
        const invalidUser = new User({
          name: 'Deprecated Role',
          email: `${role.toLowerCase()}_schema@p0test.com`,
          passwordHash: 'hash',
          role,
        });
        expect(invalidUser.validateSync()?.errors.role).toBeDefined();
      }
    });
  });

  // ==========================================
  // 4. GHOST CLINICIAN PATIENT POOL CLOSURE
  // ==========================================
  describe('4. Ghost Clinician Patient Pool', () => {
    it('17. Doctor does not receive unassigned patients in GET /api/patients', async () => {
      const res = await request(app)
        .get('/api/patients')
        .set('Authorization', createAuthHeader(unassignedDoctorUser));
      expect(res.statusCode).toBe(200);
      const returnedIds = res.body.data.patients.map((p) => p._id.toString());
      expect(returnedIds).not.toContain(unassignedPatientDoc._id.toString());
      expect(returnedIds).not.toContain(patientBDoc._id.toString());
    });

    it('18. CHO can query the community patient directory', async () => {
      const res = await request(app)
        .get('/api/patients?village=P0_Test_Village')
        .set('Authorization', createAuthHeader(choUser));
      expect(res.statusCode).toBe(200);
      const returnedIds = res.body.data.patients.map((p) => p._id.toString());
      expect(returnedIds).toContain(patientBDoc._id.toString());
    });
  });

  // ==========================================
  // 5. OCR EXTRACTION EDIT AUTHORIZATION
  // ==========================================
  describe('5. OCR Extraction Edit Authorization', () => {
    it('20. Patient edits own pending OCR extraction is allowed', async () => {
      const res = await request(app)
        .patch(`/api/reports/${reportADoc._id}/extracted-data`)
        .set('Authorization', createAuthHeader(patientAUser))
        .send({
          field: 'fastingSugar',
          value: 138,
          unit: 'mg/dL',
        });
      expect(res.statusCode).toBe(200);
      expect(res.body.data.corrections.fastingSugar).toBeDefined();
    });

    it('21. Patient A edits Patient B extraction is blocked (403)', async () => {
      const res = await request(app)
        .patch(`/api/reports/${reportADoc._id}/extracted-data`)
        .set('Authorization', createAuthHeader(patientBUser))
        .send({
          field: 'fastingSugar',
          value: 150,
          unit: 'mg/dL',
        });
      expect(res.statusCode).toBe(403);
    });

    it('22. Unassigned Doctor edits report is blocked (403)', async () => {
      const res = await request(app)
        .patch(`/api/reports/${reportADoc._id}/extracted-data`)
        .set('Authorization', createAuthHeader(unassignedDoctorUser))
        .send({
          field: 'fastingSugar',
          value: 150,
          unit: 'mg/dL',
        });
      expect(res.statusCode).toBe(403);
    });

    it('25. Admin edits OCR extraction is blocked (403)', async () => {
      const res = await request(app)
        .patch(`/api/reports/${reportADoc._id}/extracted-data`)
        .set('Authorization', createAuthHeader(adminUser))
        .send({
          field: 'fastingSugar',
          value: 150,
          unit: 'mg/dL',
        });
      expect(res.statusCode).toBe(403);
    });
  });

  // ==========================================
  // 6. REPORT CONFIRMATION AUTHORIZATION
  // ==========================================
  describe('6. Report Confirmation Authorization', () => {
    let unconfirmedReport;

    beforeEach(async () => {
      unconfirmedReport = await Report.create({
        patient: patientADoc._id,
        uploader: patientAUser._id,
        title: 'P0_Test_Confirm_Report',
        fileUrl: 'http://localhost/test_confirm.pdf',
        status: 'PENDING_REVIEW',
        rawOcrText: 'RAW_CONFIRM_TEST',
        initialExtraction: { canonicalVitals: { systolicBP: 132, diastolicBP: 86 } },
        extractedData: { canonicalVitals: { systolicBP: 132, diastolicBP: 86 } },
      });
    });

    it('26. Patient confirms own report is allowed (200)', async () => {
      const res = await request(app)
        .put(`/api/reports/${unconfirmedReport._id}/confirm`)
        .set('Authorization', createAuthHeader(patientAUser))
        .send({
          confirmedData: {
            canonicalVitals: { systolicBP: 132, diastolicBP: 86 },
          },
        });
      expect(res.statusCode).toBe(200);
      expect(res.body.data.report.status).toBe('CONFIRMED');
    }, 15000);

    it('27. Patient B confirms Patient A report is blocked (403)', async () => {
      const res = await request(app)
        .put(`/api/reports/${unconfirmedReport._id}/confirm`)
        .set('Authorization', createAuthHeader(patientBUser))
        .send({
          confirmedData: { canonicalVitals: { systolicBP: 132, diastolicBP: 86 } },
        });
      expect(res.statusCode).toBe(403);
    });

    it('28. Unassigned Doctor confirms report is blocked (403)', async () => {
      const res = await request(app)
        .put(`/api/reports/${unconfirmedReport._id}/confirm`)
        .set('Authorization', createAuthHeader(unassignedDoctorUser))
        .send({
          confirmedData: { canonicalVitals: { systolicBP: 132, diastolicBP: 86 } },
        });
      expect(res.statusCode).toBe(403);
    });

    it('31. Admin confirms report is blocked (403)', async () => {
      const res = await request(app)
        .put(`/api/reports/${unconfirmedReport._id}/confirm`)
        .set('Authorization', createAuthHeader(adminUser))
        .send({
          confirmedData: { canonicalVitals: { systolicBP: 132, diastolicBP: 86 } },
        });
      expect(res.statusCode).toBe(403);
      expect(res.body.message).toContain('User role lacks clinical confirmation authority');
    });
  });

  // ==========================================
  // 7. PREDICTION AUTHORIZATION & IDOR
  // ==========================================
  describe('7. Prediction Authorization & IDOR', () => {
    it('32. Patient A triggers prediction for Patient B is blocked (403)', async () => {
      const res = await request(app)
        .post('/api/predictions/diabetes')
        .set('Authorization', createAuthHeader(patientAUser))
        .send({
          patientId: patientBDoc._id,
          features: { fastingSugar: 160 },
        });
      expect(res.statusCode).toBe(403);
    });

    it('33. Patient A reads Patient B prediction is blocked (403)', async () => {
      const res = await request(app)
        .get(`/api/predictions/diabetes/latest?patientId=${patientBDoc._id}`)
        .set('Authorization', createAuthHeader(patientAUser));
      expect(res.statusCode).toBe(403);
    });

    it('34. Unassigned Doctor triggers prediction for Patient A is blocked (403)', async () => {
      const res = await request(app)
        .post('/api/predictions/diabetes')
        .set('Authorization', createAuthHeader(unassignedDoctorUser))
        .send({
          patientId: patientADoc._id,
          features: { fastingSugar: 130 },
        });
      expect(res.statusCode).toBe(403);
    });

    it('36. Admin reads prediction history is blocked (403)', async () => {
      const res = await request(app)
        .get(`/api/predictions/diabetes/history?patientId=${patientADoc._id}`)
        .set('Authorization', createAuthHeader(adminUser));
      expect(res.statusCode).toBe(403);
    });
  });

  // ==========================================
  // 8. PATIENT ACCOUNT DELETION PROTECTION
  // ==========================================
  describe('8. Patient Account Deletion Protection', () => {
    it('37. Doctor deletes patient is blocked (403)', async () => {
      const res = await request(app)
        .delete(`/api/patients/${patientADoc._id}`)
        .set('Authorization', createAuthHeader(doctorUser));
      expect(res.statusCode).toBe(403);
    });

    it('39. CHO deletes patient is blocked (403)', async () => {
      const res = await request(app)
        .delete(`/api/patients/${patientADoc._id}`)
        .set('Authorization', createAuthHeader(choUser));
      expect(res.statusCode).toBe(403);
    });

    it('41. Patient deletes own account is allowed', async () => {
      // Create temporary patient to delete
      const tempUser = await User.create({
        name: 'Temp Patient',
        email: 'temp_del@p0test.com',
        passwordHash: 'hash',
        role: 'Patient', isEmailVerified: true, isVerified: true,
      });
      const tempPatient = await Patient.create({
        user: tempUser._id,
        village: 'P0_Test_Village',
      });

      const res = await request(app)
        .delete(`/api/patients/${tempPatient._id}`)
        .set('Authorization', createAuthHeader(tempUser));
      expect(res.statusCode).toBe(200);

      const checkP = await Patient.findById(tempPatient._id);
      expect(checkP).toBeNull();
    });
  });

  // ==========================================
  // 9. DATA INTEGRITY & HITL INVARIANTS
  // ==========================================
  describe('9. Data Integrity & HITL Invariants', () => {
    it('42. rawOcrText remains immutable after edit', async () => {
      const reportBefore = await Report.findById(reportADoc._id);
      expect(reportBefore.rawOcrText).toBe('ORIGINAL_RAW_OCR_CONTENT_123');

      await request(app)
        .patch(`/api/reports/${reportADoc._id}/extracted-data`)
        .set('Authorization', createAuthHeader(patientAUser))
        .send({ field: 'fastingSugar', value: 140, unit: 'mg/dL' });

      const reportAfter = await Report.findById(reportADoc._id);
      expect(reportAfter.rawOcrText).toBe('ORIGINAL_RAW_OCR_CONTENT_123');
    });

    it('43. initialExtraction remains immutable after edit', async () => {
      const reportAfter = await Report.findById(reportADoc._id);
      expect(reportAfter.initialExtraction.canonicalVitals.fastingSugar).toBe(130);
    });

    it('44. Unconfirmed OCR edits do not alter Patient profile vitals snapshot', async () => {
      const patientSnapshot = await Patient.findById(patientADoc._id);
      expect(patientSnapshot.fastingSugar).toBe(130); // Unchanged from initial 130
    });
  });
});
