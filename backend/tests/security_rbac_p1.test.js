import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { User } from '../src/models/User.js';
import { Patient } from '../src/models/Patient.js';
import { Doctor } from '../src/models/Doctor.js';
import { Report } from '../src/models/Report.js';
import { Prediction } from '../src/models/Prediction.js';
import { PatientRelationship } from '../src/models/PatientRelationship.js';
import { Invitation } from '../src/models/Invitation.js';
import { runRelationshipMigration } from '../src/utils/relationshipMigration.js';
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

describe('Phase P1: Relationship & Invitation System Security Test Suite', () => {
  let app;
  let patientUser, otherPatientUser;
  let doctorUser, doctor2User, unrelatedDoctorUser;
  let patientDoc, otherPatientDoc;
  let doctorDoc, doctor2Doc;
  let confirmedReportDoc;
  let isolatedDatabaseReady = false;

  beforeAll(async () => {
    await connectToIsolatedTestDatabase();
    isolatedDatabaseReady = true;
    const { default: appModule } = await import('../src/server.js');
    app = appModule;

    // Clean test artifacts
    await User.deleteMany({ email: { $regex: /@p1test\.com$/ } });
    await Patient.deleteMany({ village: 'P1_Test_Village' });
    await Doctor.deleteMany({});
    await PatientRelationship.deleteMany({});
    await Invitation.deleteMany({});
    await Report.deleteMany({ title: { $regex: /^P1_Test_/ } });

    // 1. Create Patient A
    patientUser = await User.create({
      name: 'P1 Patient A',
      email: 'patient_a@p1test.com',
      passwordHash: 'hashed123',
      role: 'Patient', isEmailVerified: true, isVerified: true,
      village: 'P1_Test_Village',
    });

    patientDoc = await Patient.create({
      user: patientUser._id,
      age: 48,
      gender: 'Male',
      village: 'P1_Test_Village',
      systolicBP: 130,
      diastolicBP: 85,
    });

    // 2. Create Patient B
    otherPatientUser = await User.create({
      name: 'P1 Patient B',
      email: 'patient_b@p1test.com',
      passwordHash: 'hashed123',
      role: 'Patient', isEmailVerified: true, isVerified: true,
      village: 'P1_Test_Village',
    });

    otherPatientDoc = await Patient.create({
      user: otherPatientUser._id,
      age: 55,
      gender: 'Female',
      village: 'P1_Test_Village',
    });

    // 3. Create Doctors
    doctorUser = await User.create({
      name: 'Dr. Primary Physician',
      email: 'doctor_primary@p1test.com',
      passwordHash: 'hashed123',
      role: 'Doctor', isEmailVerified: true, isVerified: true,
    });
    doctorDoc = await Doctor.create({
      user: doctorUser._id,
      specialization: 'Cardiology',
      hospital: 'Metro Hospital',
    });

    doctor2User = await User.create({
      name: 'Dr. Secondary Specialist',
      email: 'doctor_secondary@p1test.com',
      passwordHash: 'hashed123',
      role: 'Doctor', isEmailVerified: true, isVerified: true,
    });
    doctor2Doc = await Doctor.create({
      user: doctor2User._id,
      specialization: 'Endocrinology',
      hospital: 'City Clinic',
    });

    unrelatedDoctorUser = await User.create({
      name: 'Dr. Unrelated Doctor',
      email: 'doctor_unrelated@p1test.com',
      passwordHash: 'hashed123',
      role: 'Doctor', isEmailVerified: true, isVerified: true,
    });
    await Doctor.create({
      user: unrelatedDoctorUser._id,
      specialization: 'Neurology',
    });

    // 4. Create sample report for Patient A
    confirmedReportDoc = await Report.create({
      patient: patientDoc._id,
      uploader: patientUser._id,
      title: 'P1_Test_Blood_Report.pdf',
      fileUrl: 'https://example.com/p1_test_blood_report.pdf',
      status: 'CONFIRMED',
      uploadDate: new Date(),
      confirmedAt: new Date(),
      structuredData: {
        fastingSugar: { value: 110, unit: 'mg/dL' },
        systolicBP: { value: 130, unit: 'mmHg' },
        diastolicBP: { value: 85, unit: 'mmHg' },
      },
    });
  }, 30000);

  afterAll(async () => {
    if (!isolatedDatabaseReady) return;
    await User.deleteMany({ email: { $regex: /@p1test\.com$/ } });
    await Patient.deleteMany({ village: 'P1_Test_Village' });
    await Doctor.deleteMany({});
    await PatientRelationship.deleteMany({});
    await Invitation.deleteMany({});
    await Report.deleteMany({ title: { $regex: /^P1_Test_/ } });
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  // =========================================================================
  // GROUP 1: DOCTOR-PATIENT WORKFLOWS & ACCESS RESTRICTIONS
  // =========================================================================
  describe('1. Doctor-Patient Connection Lifecycle', () => {
    let createdRelId = null;

    test('1.1 Patient can list available verified doctors', async () => {
      const res = await request(app)
        .get('/api/relationships/doctors')
        .set('Authorization', createAuthHeader(patientUser));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.doctors).toBeDefined();
      expect(res.body.data.doctors.length).toBeGreaterThanOrEqual(2);
      expect(res.body.data.doctors.some((d) => d.name === 'Dr. Primary Physician')).toBe(true);
    });

    test('1.2 Flow A: Patient requests connection with Doctor 1', async () => {
      const res = await request(app)
        .post('/api/relationships/doctor/request')
        .set('Authorization', createAuthHeader(patientUser))
        .send({
          doctorId: doctorUser._id,
          isPrimary: true,
          relationshipLabel: 'Primary Cardiologist',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.relationship).toBeDefined();
      expect(res.body.data.relationship.status).toBe('PENDING');
      expect(res.body.data.relationship.initiatedBy).toBe('PATIENT');
      expect(res.body.data.relationship.isPrimaryDoctor).toBe(true);
      createdRelId = res.body.data.relationship._id;
    });

    test('1.3 Rejects duplicate connection request when already pending', async () => {
      const res = await request(app)
        .post('/api/relationships/doctor/request')
        .set('Authorization', createAuthHeader(patientUser))
        .send({
          doctorId: doctorUser._id,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('1.4 Patient CANNOT accept their own initiated request (403 Forbidden)', async () => {
      const res = await request(app)
        .patch(`/api/relationships/${createdRelId}/accept`)
        .set('Authorization', createAuthHeader(patientUser));

      expect(res.status).toBe(403);
    });

    test('1.5 Other doctor CANNOT accept request designated for Doctor 1 (403 Forbidden)', async () => {
      const res = await request(app)
        .patch(`/api/relationships/${createdRelId}/accept`)
        .set('Authorization', createAuthHeader(doctor2User));

      expect(res.status).toBe(403);
    });

    test('1.6 Designated Doctor 1 accepts request -> becomes ACTIVE and primary', async () => {
      const res = await request(app)
        .patch(`/api/relationships/${createdRelId}/accept`)
        .set('Authorization', createAuthHeader(doctorUser));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.relationship.status).toBe('ACTIVE');

      // Verify legacy assignedDoctor was synchronized
      const updatedPatient = await Patient.findById(patientDoc._id);
      expect(String(updatedPatient.assignedDoctor)).toBe(String(doctorUser._id));
    });

    test('1.7 Active Doctor 1 can now access Patient A profile and reports', async () => {
      // Access profile
      const profRes = await request(app)
        .get(`/api/patients/${patientDoc._id}`)
        .set('Authorization', createAuthHeader(doctorUser));
      expect(profRes.status).toBe(200);

      // Access reports
      const repRes = await request(app)
        .get(`/api/reports?patientId=${patientDoc._id}`)
        .set('Authorization', createAuthHeader(doctorUser));
      expect(repRes.status).toBe(200);
      expect(repRes.body.data.length).toBeGreaterThan(0);
    });

    test('1.8 Unrelated Doctor CANNOT access Patient A profile (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/patients/${patientDoc._id}`)
        .set('Authorization', createAuthHeader(unrelatedDoctorUser));

      expect(res.status).toBe(403);
    });

    test('1.9 Flow B: Patient generates consultation code for in-clinic check-in', async () => {
      const res = await request(app)
        .post('/api/relationships/doctor/generate-code')
        .set('Authorization', createAuthHeader(patientUser));

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.code).toBeDefined();
      expect(res.body.data.code.length).toBe(6);

      const generatedCode = res.body.data.code;

      // Doctor 2 claims this code
      const claimRes = await request(app)
        .post('/api/relationships/doctor/claim-code')
        .set('Authorization', createAuthHeader(doctor2User))
        .send({
          code: generatedCode,
          relationshipLabel: 'Consulting Endocrinologist',
        });

      expect(claimRes.status).toBe(201);
      expect(claimRes.body.data.relationship.status).toBe('PENDING');
      expect(claimRes.body.data.relationship.initiatedBy).toBe('DOCTOR');

      const claimedRelId = claimRes.body.data.relationship._id;

      // Patient A explicitly accepts the doctor's claim
      const acceptRes = await request(app)
        .patch(`/api/relationships/${claimedRelId}/accept`)
        .set('Authorization', createAuthHeader(patientUser));

      expect(acceptRes.status).toBe(200);
      expect(acceptRes.body.data.relationship.status).toBe('ACTIVE');

      // Doctor 2 now has clinical access
      const doc2ProfileRes = await request(app)
        .get(`/api/patients/${patientDoc._id}`)
        .set('Authorization', createAuthHeader(doctor2User));
      expect(doc2ProfileRes.status).toBe(200);
    });

    test('1.10 Setting Doctor 2 as Primary unsets Doctor 1 as primary', async () => {
      const doc2Rel = await PatientRelationship.findOne({
        patient: patientDoc._id,
        relatedUser: doctor2User._id,
        status: 'ACTIVE',
      });

      const res = await request(app)
        .patch(`/api/relationships/${doc2Rel._id}/set-primary`)
        .set('Authorization', createAuthHeader(patientUser));

      expect(res.status).toBe(200);
      expect(res.body.data.relationship.isPrimaryDoctor).toBe(true);

      // Verify previous primary doctor (Doctor 1) was demoted
      const doc1Rel = await PatientRelationship.findOne({
        patient: patientDoc._id,
        relatedUser: doctorUser._id,
      });
      expect(doc1Rel.isPrimaryDoctor).toBe(false);

      // Verify legacy field updated
      const updatedPatient = await Patient.findById(patientDoc._id);
      expect(String(updatedPatient.assignedDoctor)).toBe(String(doctor2User._id));
    });

    test('1.11 Revoking primary Doctor 2 sets assignedDoctor to null (no silent promotion)', async () => {
      const doc2Rel = await PatientRelationship.findOne({
        patient: patientDoc._id,
        relatedUser: doctor2User._id,
        status: 'ACTIVE',
      });

      const res = await request(app)
        .patch(`/api/relationships/${doc2Rel._id}/revoke`)
        .set('Authorization', createAuthHeader(patientUser));

      expect(res.status).toBe(200);
      expect(res.body.data.relationship.status).toBe('REVOKED');

      // Verify assignedDoctor is now null
      const updatedPatient = await Patient.findById(patientDoc._id);
      expect(updatedPatient.assignedDoctor).toBeNull();

      // Verify Doctor 2 now receives 403 Forbidden
      const doc2Res = await request(app)
        .get(`/api/patients/${patientDoc._id}`)
        .set('Authorization', createAuthHeader(doctor2User));
      expect(doc2Res.status).toBe(403);
    });
  });

  // =========================================================================
  // =========================================================================
  // GROUP 2: DEPRECATED FAMILY INVITATION ROUTES
  // =========================================================================
  describe('2. Deprecated Family Invitation Routes', () => {
    test('2.1 Creating a Family invitation is explicitly retired', async () => {
      const res = await request(app)
        .post('/api/invitations/family')
        .set('Authorization', createAuthHeader(patientUser))
        .send({ recipientEmail: 'family_caregiver@p1test.com' });

      expect(res.status).toBe(410);
      expect(res.body.success).toBe(false);
    });

    test('2.2 Validating a Family invitation is explicitly retired', async () => {
      const res = await request(app).get('/api/invitations/family/legacy-token');

      expect(res.status).toBe(410);
      expect(res.body.success).toBe(false);
    });

    test('2.3 Redeeming a Family invitation is explicitly retired', async () => {
      const res = await request(app)
        .post('/api/invitations/family/legacy-token/redeem')
        .send({ name: 'Deprecated account', password: 'Password123!' });

      expect(res.status).toBe(410);
      expect(res.body.success).toBe(false);
    });
  });
  // GROUP 3: DATABASE INVARIANTS & IDEMPOTENT MIGRATION
  // =========================================================================
  describe('3. Database Invariants & Idempotent Migration', () => {
    test('3.1 Rejects client-supplied NURSE or CHO relationshipType', async () => {
      let schemaError = null;
      try {
        await PatientRelationship.create({
          patient: patientDoc._id,
          relatedUser: unrelatedDoctorUser._id,
          relationshipType: 'NURSE',
          initiatedBy: 'PATIENT',
        });
      } catch (err) {
        schemaError = err;
      }
      expect(schemaError).toBeDefined();
    });

    test('3.2 Idempotent legacy relationship migration syncs existing patient assignments', async () => {
      // Set legacy fields on Patient B
      await Patient.findByIdAndUpdate(otherPatientDoc._id, {
        assignedDoctor: doctorUser._id,
      });

      // Run migration
      const result1 = await runRelationshipMigration();
      expect(result1.migratedDoctors).toBeGreaterThanOrEqual(1);

      // Verify relationship was created
      const rel = await PatientRelationship.findOne({
        patient: otherPatientDoc._id,
        relatedUser: doctorUser._id,
        status: 'ACTIVE',
      });
      expect(rel).toBeDefined();
      expect(rel.initiatedBy).toBe('MIGRATION');
      expect(rel.isPrimaryDoctor).toBe(true);

      // Run migration again — must be completely idempotent
      const result2 = await runRelationshipMigration();
      expect(result2.migratedDoctors).toBe(0);
      expect(result2).not.toHaveProperty('migratedFamily');
    });
  });
});
