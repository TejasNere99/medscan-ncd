/**
 * MedScan-NCD: Safe, Idempotent Faculty Demo Seed Script
 * =======================================================
 * Provisions synthetic demo patients and demonstration accounts for live faculty evaluation:
 * - Patient A: Aarav Sharma (Lower-Risk Sequential Reports, comparison, pending review, meds & appointments)
 * - Patient B: Rajesh Patel (Elevated Glucose / Cardiometabolic Profile, prescriptions & adherence)
 * - Patient C: Sunita Rao (Renal-Function / CKD Profile, pending referral & overdue follow-up)
 * - Patient D: Priya Nair (Pending clinician consultation request & accepted referral)
 * - Patient E: Karan Verma (Registered community patient awaiting first screening)
 * - Clinical Accounts:
 *     1. Doctor: Dr. Demo Clinician (Active patients, pending requests, appointments, prescriptions)
 *     2. CHO: Demo Community Health Officer (Coverage across 3 villages, follow-ups, referrals, population analytics)
 *     3. Admin: Demo Administrator (System configuration & global access directory)
 *
 * Strict Safety Invariants:
 * 1. Non-destructive: Never wipes database or resets real user records.
 * 2. Idempotent: Can be run repeatedly without duplicating records.
 * 3. Environment Guard: Requires local loopback database or DEMO_SEED_CONFIRM=true.
 * 4. Synthetic Safety: Every fixture is prominently labeled "SYNTHETIC — FOR DEMONSTRATION ONLY".
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { User } from '../src/models/User.js';
import { Patient } from '../src/models/Patient.js';
import { Doctor } from '../src/models/Doctor.js';
import { PatientRelationship } from '../src/models/PatientRelationship.js';
import { Report } from '../src/models/Report.js';
import { Prediction } from '../src/models/Prediction.js';
import { Setting } from '../src/models/Setting.js';
import { Medicine } from '../src/models/Medicine.js';
import { MedicineLog } from '../src/models/MedicineLog.js';
import { Notification } from '../src/models/Notification.js';
import { Appointment } from '../src/models/Appointment.js';
import { FollowUp } from '../src/models/FollowUp.js';
import { Referral } from '../src/models/Referral.js';
import { triggerDiabetesRecalculation, triggerHeartDiseaseRecalculation } from '../src/controllers/patientController.js';
import { callNewDiseasePredictionService } from '../src/services/newDiseasePredictionService.js';
import { buildHypertensionFeatures, buildCkdFeatures } from '../src/services/newDiseaseFeatureBuilder.js';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(backendRoot, '..');
dotenv.config({ path: path.join(backendRoot, '.env') });

const DEMO_PASSWORD = process.env.DEMO_USER_PASSWORD || 'MedScanDemo!2026';
const SYNTHETIC_TAG = 'SYNTHETIC — FOR DEMONSTRATION ONLY';

async function resolveAdminPassword(backendDir, repoDir) {
  if (process.env.ADMIN_DEMO_PASSWORD && process.env.ADMIN_DEMO_PASSWORD.trim() !== '') {
    return process.env.ADMIN_DEMO_PASSWORD.trim();
  }
  // Check if an existing private admin password was already generated and saved locally
  const credPathRoot = path.join(repoDir, '.demo_credentials.local.json');
  try {
    const raw = await fs.readFile(credPathRoot, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed?.admin?.password && typeof parsed.admin.password === 'string' && parsed.admin.password !== DEMO_PASSWORD) {
      return parsed.admin.password;
    }
  } catch {
    // File not found or unparseable - proceed to generate a fresh secure credential
  }

  // Generate a distinct, cryptographically strong random password
  const randomSuffix = crypto.randomBytes(6).toString('hex');
  return `AdminDemo!${randomSuffix}#2026`;
}

function parseMongoUri(uri) {
  if (!uri || typeof uri !== 'string') {
    throw new Error('MONGODB_URI is required to seed demo data.');
  }

  // 1. Try standard WHATWG URL parser (for mongodb+srv:// and single-host mongodb://)
  try {
    const parsed = new URL(uri);
    const dbName = (parsed.pathname || '').replace(/^\//, '').toLowerCase();
    const isLoopback = ['127.0.0.1', 'localhost', '[::1]', '::1'].includes(parsed.hostname.toLowerCase());
    return {
      hostDescription: parsed.hostname,
      dbName,
      isLoopback,
    };
  } catch {
    // 2. Parse multi-host replica set connection strings with comma-separated hosts
    const match = uri.match(/^(mongodb(?:\+srv)?):\/\/(?:([^:@]+)(?::([^@]+))?@)?([^/?#]+)(?:\/([^?#]*))?(?:\?(.*))?$/);
    if (!match) {
      throw new Error('Invalid MONGODB_URI format. Expected a valid mongodb:// or mongodb+srv:// connection string.');
    }

    const [, , , , hostsStr, dbPath] = match;
    const hosts = hostsStr.split(',').map((h) => h.trim()).filter(Boolean);
    const dbName = (dbPath || '').trim().toLowerCase();
    const isLoopback = hosts.every((h) => {
      const hostPart = h.split(':')[0].toLowerCase();
      return ['127.0.0.1', 'localhost', '[::1]', '::1'].includes(hostPart);
    });

    return {
      hostDescription: hosts.length > 1 ? `${hosts[0]} (+${hosts.length - 1} cluster nodes)` : hosts[0],
      dbName,
      isLoopback,
    };
  }
}

function checkDatabaseSafety(uri) {
  const { hostDescription, dbName, isLoopback } = parseMongoUri(uri);
  const explicitConfirm = process.env.DEMO_SEED_CONFIRM === 'true';

  const isLikelyProduction = dbName.includes('prod') || dbName.includes('production') || dbName.includes('live');

  if (isLikelyProduction) {
    throw new Error(
      `Safety Guard: MONGODB_URI targets '${dbName}', which appears to be a production database. ` +
      'Demo seeding cannot be run against production databases.'
    );
  }

  if (!isLoopback && !explicitConfirm) {
    throw new Error(
      `Safety Guard: MONGODB_URI points to remote host '${hostDescription}' (database: '${dbName || 'default'}'). ` +
      'Refusing to seed without explicit confirmation. To seed this remote database, run:\n' +
      '  $env:DEMO_SEED_CONFIRM="true"; npm run seed:faculty-demo   (PowerShell)\n' +
      'or add DEMO_SEED_CONFIRM=true to backend/.env'
    );
  }

  console.log(`[Safety Guard] Target database verified: Host='${hostDescription}', Database='${dbName || 'default'}' (Remote=${!isLoopback})`);
}

async function upsertDemoUser({ name, email, role, phone, village = 'Demo Community Central', communityVillages = [], avatar = '', password = DEMO_PASSWORD }) {
  let user = await User.findOne({ email }).select('+passwordHash');
  if (!user) {
    user = new User({ email, name, role, phone, village, communityVillages, avatar, passwordHash: password });
  } else if (user.role !== role) {
    throw new Error(`The reserved demo email ${email} is assigned to a different role.`);
  } else {
    user.name = name;
    user.phone = phone;
    user.village = village;
    user.communityVillages = communityVillages;
    if (avatar) user.avatar = avatar;
    user.passwordHash = password;
  }
  user.isEmailVerified = true;
  user.isVerified = true;
  await user.save();
  return user;
}

async function copyFixtureFile(srcRel, destFilename) {
  const src = path.join(repoRoot, 'ml_model', 'demo_fixtures', srcRel);
  const destDir = path.join(backendRoot, 'uploads');
  await fs.mkdir(destDir, { recursive: true });
  const dest = path.join(destDir, destFilename);
  await fs.copyFile(src, dest);
  return `http://127.0.0.1:5000/uploads/${destFilename}`;
}

async function seedFacultyDemo() {
  const isResetOnly = process.argv.includes('--reset-demo-only');
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/medscan_ncd_demo_local';
  checkDatabaseSafety(mongoUri);

  console.log('Connecting to database...');
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });

  try {
    if (isResetOnly) {
      console.log('Safe Demo Reset: Removing only synthetic demo records...');
      const demoUsers = await User.find({ email: { $regex: /^(synthetic\.|patient@|doctor@|cho@|admin@)/ } });
      const userIds = demoUsers.map((u) => u._id);
      const demoPatients = await Patient.find({ user: { $in: userIds } });
      const patientIds = demoPatients.map((p) => p._id);

      await Prediction.deleteMany({ patient: { $in: patientIds } });
      await Report.deleteMany({ patient: { $in: patientIds } });
      await PatientRelationship.deleteMany({ $or: [{ patient: { $in: patientIds } }, { relatedUser: { $in: userIds } }] });
      await MedicineLog.deleteMany({ patient: { $in: patientIds } });
      await Medicine.deleteMany({ patient: { $in: patientIds } });
      await Notification.deleteMany({ recipient: { $in: userIds } });
      await Appointment.deleteMany({ $or: [{ patient: { $in: patientIds } }, { doctor: { $in: userIds } }] });
      await FollowUp.deleteMany({ patient: { $in: patientIds } });
      await Referral.deleteMany({ patient: { $in: patientIds } });
      await Patient.deleteMany({ _id: { $in: patientIds } });
      await Doctor.deleteMany({ user: { $in: userIds } });
      await User.deleteMany({ _id: { $in: userIds } });

      console.log(`Reset completed: Removed ${demoUsers.length} synthetic demo accounts and related entities without touching real users.`);
      return;
    }

    console.log('--- 1. Provisioning Core Demonstration Clinical & Administrative Accounts ---');
    const adminPassword = await resolveAdminPassword(backendRoot, repoRoot);

    const doctorUser = await upsertDemoUser({
      name: 'Dr. Demo Clinician',
      email: 'doctor@example.com',
      role: 'Doctor',
      phone: '+1 555-0102',
      village: 'Demo Community Central',
      avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=256',
    });
    const doctor = await Doctor.findOneAndUpdate(
      { user: doctorUser._id },
      { $set: { specialization: 'Internal Medicine & Chronic Disease', licenseNumber: 'DEMO-MD-2026', hospital: 'District Demonstration Hospital', experienceYears: 12 } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const choUser = await upsertDemoUser({
      name: 'Demo Community Health Officer',
      email: 'cho@example.com',
      role: 'CHO',
      phone: '+1 555-0103',
      village: 'Demo Community Central',
      communityVillages: ['Demo Community Central', 'Demo Community South', 'Demo Community East'],
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=256',
    });

    const adminUser = await upsertDemoUser({
      name: 'Demo Administrator',
      email: 'admin@example.com',
      role: 'Admin',
      phone: '+1 555-0104',
      village: 'Demo Community Central',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=256',
      password: adminPassword,
    });

    // =========================================================================
    // 2. PATIENT A — Lower-Risk Demonstration Profile (Aarav Sharma)
    // =========================================================================
    console.log('--- 2. Seeding Patient A (Lower-Risk Sequential Reports + Pending Review) ---');
    const patientAUser = await upsertDemoUser({
      name: 'Aarav Sharma',
      email: 'synthetic.patient.a@example.com',
      role: 'Patient',
      phone: '+1 555-0111',
      village: 'Demo Community Central',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256',
    });
    // Provision alias patient@example.com pointing to an identical demo patient profile for convenience
    const patientAliasUser = await upsertDemoUser({
      name: 'Aarav Sharma (Demo Alias)',
      email: 'patient@example.com',
      role: 'Patient',
      phone: '+1 555-0111',
      village: 'Demo Community Central',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256',
    });

    const patientA = await Patient.findOneAndUpdate(
      { user: patientAUser._id },
      {
        $set: {
          age: 28, gender: 'Male', bmi: 22.1, systolicBP: 114, diastolicBP: 74,
          fastingSugar: 90, totalCholesterol: 160, hdl: 60, serumCreatinine: 0.82,
          bloodUrea: 22, hemoglobin: 14.4, heartRate: 70, isCurrentSmoker: false,
          village: 'Demo Community Central', assignedDoctor: doctorUser._id,
          medicalHistory: [`${SYNTHETIC_TAG}: Baseline lower-risk profile with sequential laboratory reports.`],
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    await Patient.findOneAndUpdate(
      { user: patientAliasUser._id },
      {
        $set: {
          age: 28, gender: 'Male', bmi: 22.1, systolicBP: 114, diastolicBP: 74,
          fastingSugar: 90, totalCholesterol: 160, hdl: 60, serumCreatinine: 0.82,
          bloodUrea: 22, hemoglobin: 14.4, heartRate: 70, isCurrentSmoker: false,
          village: 'Demo Community Central', assignedDoctor: doctorUser._id,
          medicalHistory: [`${SYNTHETIC_TAG}: Baseline lower-risk profile with sequential laboratory reports.`],
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await PatientRelationship.findOneAndUpdate(
      { patient: patientA._id, relatedUser: doctorUser._id, relationshipType: 'DOCTOR' },
      { $set: { status: 'ACTIVE', isPrimaryDoctor: true, relationshipLabel: 'Primary Clinician' } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Copy fixture PDFs
    const p1Url = await copyFixtureFile('patient_a_lower_risk/report_1_baseline.pdf', 'syn_pat_a_rep_1_baseline.pdf');
    const p2Url = await copyFixtureFile('patient_a_lower_risk/report_2_followup.pdf', 'syn_pat_a_rep_2_followup.pdf');

    // Report 1: Baseline (Jan 15, 2026, CONFIRMED)
    await Report.findOneAndUpdate(
      { patient: patientA._id, title: 'Comprehensive Laboratory Examination Report (Baseline)' },
      {
        $set: {
          uploader: doctorUser._id, reportType: 'General Laboratory Report', fileUrl: p1Url,
          publicId: 'syn_pat_a_rep_1_baseline.pdf', storageProvider: 'local', status: 'CONFIRMED',
          rawOcrText: `${SYNTHETIC_TAG}\nBaseline Laboratory Summary for Aarav Sharma`,
          extractedText: `${SYNTHETIC_TAG}\nBaseline Laboratory Summary for Aarav Sharma`,
          confirmedData: {
            patientContext: { age: { value: 28, unit: 'years', source: 'synthetic_demo' }, sex: 'Male' },
            measurements: {
              fastingSugar: { value: 88, unit: 'mg/dL', source: 'synthetic_demo', verified: true },
              systolicBP: { value: 116, unit: 'mmHg', source: 'synthetic_demo', verified: true },
              diastolicBP: { value: 76, unit: 'mmHg', source: 'synthetic_demo', verified: true },
              totalCholesterol: { value: 165, unit: 'mg/dL', source: 'synthetic_demo', verified: true },
              hdl: { value: 58, unit: 'mg/dL', source: 'synthetic_demo', verified: true },
              serumCreatinine: { value: 0.80, unit: 'mg/dL', source: 'synthetic_demo', verified: true },
              bloodUrea: { value: 24, unit: 'mg/dL', source: 'synthetic_demo', verified: true },
              hemoglobin: { value: 14.2, unit: 'g/dL', source: 'synthetic_demo', verified: true },
              bmi: { value: 22.4, unit: 'kg/m2', source: 'synthetic_demo', verified: true },
              heartRate: { value: 72, unit: 'BPM', source: 'synthetic_demo', verified: true },
            },
          },
          structuredData: { fastingSugar: 88, systolicBP: 116, diastolicBP: 76, totalCholesterol: 165, hdl: 58, serumCreatinine: 0.8, bloodUrea: 24, hemoglobin: 14.2, bmi: 22.4, heartRate: 72 },
          confidence: 99,
          uploadDate: new Date('2026-01-15T09:00:00.000Z'),
          confirmedAt: new Date('2026-01-15T09:30:00.000Z'),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Report 2: Follow-up (Jun 20, 2026, CONFIRMED)
    await Report.findOneAndUpdate(
      { patient: patientA._id, title: 'Comprehensive Laboratory Examination Report (Follow-up)' },
      {
        $set: {
          uploader: doctorUser._id, reportType: 'General Laboratory Report', fileUrl: p2Url,
          publicId: 'syn_pat_a_rep_2_followup.pdf', storageProvider: 'local', status: 'CONFIRMED',
          rawOcrText: `${SYNTHETIC_TAG}\nFollow-up Laboratory Summary for Aarav Sharma`,
          extractedText: `${SYNTHETIC_TAG}\nFollow-up Laboratory Summary for Aarav Sharma`,
          confirmedData: {
            patientContext: { age: { value: 28, unit: 'years', source: 'synthetic_demo' }, sex: 'Male' },
            measurements: {
              fastingSugar: { value: 90, unit: 'mg/dL', source: 'synthetic_demo', verified: true },
              systolicBP: { value: 114, unit: 'mmHg', source: 'synthetic_demo', verified: true },
              diastolicBP: { value: 74, unit: 'mmHg', source: 'synthetic_demo', verified: true },
              totalCholesterol: { value: 160, unit: 'mg/dL', source: 'synthetic_demo', verified: true },
              hdl: { value: 60, unit: 'mg/dL', source: 'synthetic_demo', verified: true },
              serumCreatinine: { value: 0.82, unit: 'mg/dL', source: 'synthetic_demo', verified: true },
              bloodUrea: { value: 22, unit: 'mg/dL', source: 'synthetic_demo', verified: true },
              hemoglobin: { value: 14.4, unit: 'g/dL', source: 'synthetic_demo', verified: true },
              bmi: { value: 22.1, unit: 'kg/m2', source: 'synthetic_demo', verified: true },
              heartRate: { value: 70, unit: 'BPM', source: 'synthetic_demo', verified: true },
            },
          },
          structuredData: { fastingSugar: 90, systolicBP: 114, diastolicBP: 74, totalCholesterol: 160, hdl: 60, serumCreatinine: 0.82, bloodUrea: 22, hemoglobin: 14.4, bmi: 22.1, heartRate: 70 },
          confidence: 99,
          uploadDate: new Date('2026-06-20T10:30:00.000Z'),
          confirmedAt: new Date('2026-06-20T11:00:00.000Z'),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Report 3: Ambulatory Health Screening Panel (Oct 18, 2026, PENDING_REVIEW)
    // Allows live demonstration of the pending review, edit, and confirmation workflow
    await Report.findOneAndUpdate(
      { patient: patientA._id, title: 'Ambulatory Health Screening Panel (Awaiting Review)' },
      {
        $set: {
          uploader: patientAUser._id, reportType: 'General Laboratory Report', fileUrl: p2Url,
          publicId: 'syn_pat_a_rep_pending_review.pdf', storageProvider: 'local', status: 'PENDING_REVIEW',
          rawOcrText: `${SYNTHETIC_TAG}\nAmbulatory Screening Panel for Aarav Sharma\nDate: Oct 18, 2026\nFasting Glucose: 89 mg/dL\nSystolic BP: 118 mmHg\nDiastolic BP: 76 mmHg\nTotal Cholesterol: 162 mg/dL\nSerum Creatinine: 0.81 mg/dL`,
          extractedText: `${SYNTHETIC_TAG}\nAmbulatory Screening Panel for Aarav Sharma`,
          extractedData: {
            patientContext: { age: { value: 28, unit: 'years' }, sex: 'Male' },
            measurements: {
              fastingSugar: { value: 89, unit: 'mg/dL', source: 'ocr', verified: false, validationStatus: 'VALID' },
              systolicBP: { value: 118, unit: 'mmHg', source: 'ocr', verified: false, validationStatus: 'VALID' },
              diastolicBP: { value: 76, unit: 'mmHg', source: 'ocr', verified: false, validationStatus: 'VALID' },
              totalCholesterol: { value: 162, unit: 'mg/dL', source: 'ocr', verified: false, validationStatus: 'VALID' },
              serumCreatinine: { value: 0.81, unit: 'mg/dL', source: 'ocr', verified: false, validationStatus: 'VALID' },
            },
          },
          structuredData: { fastingSugar: 89, systolicBP: 118, diastolicBP: 76, totalCholesterol: 162, serumCreatinine: 0.81 },
          confidence: 96,
          uploadDate: new Date('2026-10-18T14:20:00.000Z'),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Patient A Prescriptions & Adherence History
    const medA = await Medicine.findOneAndUpdate(
      { patient: patientA._id, name: 'Multivitamin & Zinc Chelate' },
      {
        $set: {
          doctor: doctorUser._id, dosage: '1 Tablet', frequency: 'Once daily', timing: ['morning'],
          startDate: new Date('2026-09-01'), instructions: 'Take with morning breakfast.', status: 'Active',
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const now = new Date();
    await MedicineLog.deleteMany({ patient: patientA._id });
    await MedicineLog.create([
      { patient: patientA._id, medicine: medA._id, scheduledTime: new Date(now.getTime() - 2 * 3600000), takenTime: new Date(now.getTime() - 1.8 * 3600000), status: 'Taken', source: 'App' },
      { patient: patientA._id, medicine: medA._id, scheduledTime: new Date(now.getTime() - 26 * 3600000), takenTime: new Date(now.getTime() - 25.9 * 3600000), status: 'Taken', source: 'App' },
      { patient: patientA._id, medicine: medA._id, scheduledTime: new Date(now.getTime() - 50 * 3600000), takenTime: new Date(now.getTime() - 49.8 * 3600000), status: 'Taken', source: 'App' },
    ]);

    // Patient A Notifications
    await Notification.deleteMany({ recipient: patientAUser._id });
    await Notification.create([
      { recipient: patientAUser._id, type: 'MedicineReminder', title: 'Daily Vitamin Reminder', message: 'Remember to take Multivitamin with breakfast.', priority: 'Low', isRead: true },
      { recipient: patientAUser._id, type: 'DoctorRecommendation', title: 'New Report Awaiting Confirmation', message: 'Your Oct 18 screening report has been extracted. Please review and confirm on your dashboard.', priority: 'Medium', isRead: false },
      { recipient: patientAUser._id, type: 'AppointmentReminder', title: 'Upcoming Clinic Appointment', message: 'Annual Preventative Health & Lab Review scheduled with Dr. Demo Clinician.', priority: 'Medium', isRead: false },
    ]);

    // Patient A Appointment
    await Appointment.findOneAndUpdate(
      { patient: patientA._id, doctor: doctorUser._id, reason: 'Annual Preventative Health & Lab Review' },
      {
        $set: {
          date: new Date(now.getTime() + 3 * 86400000), time: '10:30 AM',
          status: 'Upcoming', notes: 'Review longitudinal lab comparison and exercise recommendations.',
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // =========================================================================
    // 3. PATIENT B — Elevated Glucose / Cardiometabolic Profile (Rajesh Patel)
    // =========================================================================
    console.log('--- 3. Seeding Patient B (Elevated Glucose / Cardiometabolic Profile) ---');
    const patientBUser = await upsertDemoUser({
      name: 'Rajesh Patel',
      email: 'synthetic.patient.b@example.com',
      role: 'Patient',
      phone: '+1 555-0122',
      village: 'Demo Community South',
      avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=256',
    });
    const patientB = await Patient.findOneAndUpdate(
      { user: patientBUser._id },
      {
        $set: {
          age: 54, gender: 'Male', bmi: 31.0, systolicBP: 138, diastolicBP: 86,
          fastingSugar: 145, totalCholesterol: 240, hdl: 36, serumCreatinine: 1.10,
          bloodUrea: 32, hemoglobin: 13.2, heartRate: 82, isCurrentSmoker: true,
          village: 'Demo Community South', assignedDoctor: doctorUser._id,
          medicalHistory: [`${SYNTHETIC_TAG}: Cardiometabolic risk profile with elevated fasting glucose.`],
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    await PatientRelationship.findOneAndUpdate(
      { patient: patientB._id, relatedUser: doctorUser._id, relationshipType: 'DOCTOR' },
      { $set: { status: 'ACTIVE', isPrimaryDoctor: true, relationshipLabel: 'Primary Clinician' } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const pBUrl = await copyFixtureFile('patient_b_elevated_glucose/report_elevated_glucose.pdf', 'syn_pat_b_rep_elevated.pdf');
    await copyFixtureFile('patient_b_elevated_glucose/report_elevated_glucose.png', 'syn_pat_b_rep_elevated.png');

    await Report.findOneAndUpdate(
      { patient: patientB._id, title: 'Comprehensive Metabolic & Lipid Panel' },
      {
        $set: {
          uploader: doctorUser._id, reportType: 'General Laboratory Report', fileUrl: pBUrl,
          publicId: 'syn_pat_b_rep_elevated.pdf', storageProvider: 'local', status: 'CONFIRMED',
          rawOcrText: `${SYNTHETIC_TAG}\nCardiometabolic Laboratory Panel for Rajesh Patel`,
          extractedText: `${SYNTHETIC_TAG}\nCardiometabolic Laboratory Panel for Rajesh Patel`,
          confirmedData: {
            patientContext: { age: { value: 54, unit: 'years', source: 'synthetic_demo' }, sex: 'Male' },
            measurements: {
              fastingSugar: { value: 145, unit: 'mg/dL', source: 'synthetic_demo', verified: true },
              systolicBP: { value: 138, unit: 'mmHg', source: 'synthetic_demo', verified: true },
              diastolicBP: { value: 86, unit: 'mmHg', source: 'synthetic_demo', verified: true },
              totalCholesterol: { value: 240, unit: 'mg/dL', source: 'synthetic_demo', verified: true },
              hdl: { value: 36, unit: 'mg/dL', source: 'synthetic_demo', verified: true },
              serumCreatinine: { value: 1.10, unit: 'mg/dL', source: 'synthetic_demo', verified: true },
              bloodUrea: { value: 32, unit: 'mg/dL', source: 'synthetic_demo', verified: true },
              hemoglobin: { value: 13.2, unit: 'g/dL', source: 'synthetic_demo', verified: true },
              bmi: { value: 31.0, unit: 'kg/m2', source: 'synthetic_demo', verified: true },
              heartRate: { value: 82, unit: 'BPM', source: 'synthetic_demo', verified: true },
            },
          },
          structuredData: { fastingSugar: 145, systolicBP: 138, diastolicBP: 86, totalCholesterol: 240, hdl: 36, serumCreatinine: 1.1, bloodUrea: 32, hemoglobin: 13.2, bmi: 31.0, heartRate: 82 },
          confidence: 99,
          uploadDate: new Date('2026-10-10T11:15:00.000Z'),
          confirmedAt: new Date('2026-10-10T11:45:00.000Z'),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Patient B Prescriptions & Past Appointment
    const medB1 = await Medicine.findOneAndUpdate(
      { patient: patientB._id, name: 'Metformin HCl' },
      {
        $set: {
          doctor: doctorUser._id, dosage: '500 mg', frequency: 'Twice daily', timing: ['morning', 'night'],
          startDate: new Date('2026-09-15'), instructions: 'Take with morning and evening meals.', status: 'Active',
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    const medB2 = await Medicine.findOneAndUpdate(
      { patient: patientB._id, name: 'Atorvastatin Calcium' },
      {
        $set: {
          doctor: doctorUser._id, dosage: '10 mg', frequency: 'Once daily', timing: ['night'],
          startDate: new Date('2026-09-15'), instructions: 'Take before bedtime.', status: 'Active',
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await Appointment.findOneAndUpdate(
      { patient: patientB._id, doctor: doctorUser._id, reason: 'Cardiometabolic Risk Consultation' },
      {
        $set: {
          date: new Date(now.getTime() - 14 * 86400000), time: '11:00 AM',
          status: 'Completed', notes: 'Discussed glycemic management and initiated Metformin therapy.',
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Patient B Follow-up with CHO
    await FollowUp.findOneAndUpdate(
      { patient: patientB._id, reason: 'Post-consultation lifestyle and fasting glucose follow-up' },
      {
        $set: {
          dueAt: new Date(now.getTime() + 4 * 86400000), status: 'SCHEDULED',
          note: 'Assess adherence to glycemic dietary advice and Metformin tolerance.',
          createdBy: choUser._id,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // =========================================================================
    // 4. PATIENT C — Renal Profile (Sunita Rao)
    // =========================================================================
    console.log('--- 4. Seeding Patient C (Renal / CKD Profile) ---');
    const patientCUser = await upsertDemoUser({
      name: 'Sunita Rao',
      email: 'synthetic.patient.c@example.com',
      role: 'Patient',
      phone: '+1 555-0133',
      village: 'Demo Community East',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=256',
    });
    const patientC = await Patient.findOneAndUpdate(
      { user: patientCUser._id },
      {
        $set: {
          age: 62, gender: 'Female', bmi: 26.5, systolicBP: 148, diastolicBP: 92,
          fastingSugar: 112, totalCholesterol: 195, hdl: 42, serumCreatinine: 2.40,
          bloodUrea: 65, hemoglobin: 10.2, heartRate: 76, isCurrentSmoker: false,
          village: 'Demo Community East', assignedDoctor: doctorUser._id,
          medicalHistory: [`${SYNTHETIC_TAG}: Renal impairment profile with elevated creatinine.`],
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    await PatientRelationship.findOneAndUpdate(
      { patient: patientC._id, relatedUser: doctorUser._id, relationshipType: 'DOCTOR' },
      { $set: { status: 'ACTIVE', isPrimaryDoctor: true, relationshipLabel: 'Primary Clinician' } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const pCUrl = await copyFixtureFile('patient_c_renal/report_renal.pdf', 'syn_pat_c_rep_renal.pdf');

    await Report.findOneAndUpdate(
      { patient: patientC._id, title: 'Renal Function & Metabolic Panel' },
      {
        $set: {
          uploader: doctorUser._id, reportType: 'General Laboratory Report', fileUrl: pCUrl,
          publicId: 'syn_pat_c_rep_renal.pdf', storageProvider: 'local', status: 'CONFIRMED',
          rawOcrText: `${SYNTHETIC_TAG}\nRenal Function Panel for Sunita Rao`,
          extractedText: `${SYNTHETIC_TAG}\nRenal Function Panel for Sunita Rao`,
          confirmedData: {
            patientContext: { age: { value: 62, unit: 'years', source: 'synthetic_demo' }, sex: 'Female' },
            measurements: {
              serumCreatinine: { value: 2.40, unit: 'mg/dL', source: 'synthetic_demo', verified: true },
              bloodUrea: { value: 65, unit: 'mg/dL', source: 'synthetic_demo', verified: true },
              fastingSugar: { value: 112, unit: 'mg/dL', source: 'synthetic_demo', verified: true },
              totalCholesterol: { value: 195, unit: 'mg/dL', source: 'synthetic_demo', verified: true },
              hdl: { value: 42, unit: 'mg/dL', source: 'synthetic_demo', verified: true },
              systolicBP: { value: 148, unit: 'mmHg', source: 'synthetic_demo', verified: true },
              diastolicBP: { value: 92, unit: 'mmHg', source: 'synthetic_demo', verified: true },
              hemoglobin: { value: 10.2, unit: 'g/dL', source: 'synthetic_demo', verified: true },
              bmi: { value: 26.5, unit: 'kg/m2', source: 'synthetic_demo', verified: true },
              heartRate: { value: 76, unit: 'BPM', source: 'synthetic_demo', verified: true },
            },
          },
          structuredData: { serumCreatinine: 2.4, bloodUrea: 65, fastingSugar: 112, totalCholesterol: 195, hdl: 42, systolicBP: 148, diastolicBP: 92, hemoglobin: 10.2, bmi: 26.5, heartRate: 76 },
          confidence: 99,
          uploadDate: new Date('2026-09-14T08:45:00.000Z'),
          confirmedAt: new Date('2026-09-14T09:15:00.000Z'),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Patient C Overdue Follow-up & Pending Referral with CHO
    await FollowUp.findOneAndUpdate(
      { patient: patientC._id, reason: 'Renal function re-evaluation and nephrology referral check' },
      {
        $set: {
          dueAt: new Date(now.getTime() - 3 * 86400000), // OVERDUE
          status: 'SCHEDULED',
          note: 'Confirm nephrology consultation date; review blood pressure and serum creatinine monitoring.',
          createdBy: choUser._id,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await Referral.findOneAndUpdate(
      { patient: patientC._id, reason: 'Renal impairment; elevated serum creatinine (2.4 mg/dL)' },
      {
        $set: {
          destinationFacility: 'District Demonstration Hospital - Nephrology Unit',
          originatingFacility: 'Demo Community East Sub-Center',
          referredAt: new Date(now.getTime() - 5 * 86400000),
          status: 'PENDING',
          notes: 'Stage 3b CKD probability flag in decision-support engine. Patient alerted for secondary specialist workup.',
          createdBy: choUser._id,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // =========================================================================
    // 5. PATIENT D & E — Community Cohort for Rich Doctor & CHO Workflows
    // =========================================================================
    console.log('--- 5. Seeding Community Beneficiaries D & E ---');
    // Patient D: Has a PENDING consultation request to Dr. Demo Clinician
    const patientDUser = await upsertDemoUser({
      name: 'Priya Nair',
      email: 'synthetic.patient.d@example.com',
      role: 'Patient',
      phone: '+1 555-0144',
      village: 'Demo Community Central',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=256',
    });
    const patientD = await Patient.findOneAndUpdate(
      { user: patientDUser._id },
      {
        $set: {
          age: 41, gender: 'Female', bmi: 24.8, systolicBP: 132, diastolicBP: 84,
          fastingSugar: 98, totalCholesterol: 188, hdl: 52, serumCreatinine: 0.88,
          bloodUrea: 26, hemoglobin: 12.8, heartRate: 74, isCurrentSmoker: false,
          village: 'Demo Community Central',
          medicalHistory: [`${SYNTHETIC_TAG}: Community health screening cohort; pending clinical consultation.`],
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    // PENDING Doctor-Patient Relationship (Renders in Doctor dashboard pending request banner!)
    await PatientRelationship.findOneAndUpdate(
      { patient: patientD._id, relatedUser: doctorUser._id, relationshipType: 'DOCTOR' },
      { $set: { status: 'PENDING', isPrimaryDoctor: false, relationshipLabel: 'Consulting Physician', initiatedBy: 'PATIENT' } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Patient D Referral & Completed Follow-up
    await Referral.findOneAndUpdate(
      { patient: patientD._id, reason: 'Hypertension screening evaluation' },
      {
        $set: {
          destinationFacility: 'Community Cardiology Clinic',
          originatingFacility: 'Demo Community Central Health Center',
          referredAt: new Date(now.getTime() - 10 * 86400000),
          status: 'ACCEPTED',
          notes: 'Referral acknowledged by cardiology clinic; consultation scheduled.',
          createdBy: choUser._id,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    await FollowUp.findOneAndUpdate(
      { patient: patientD._id, reason: 'Blood pressure stabilization check' },
      {
        $set: {
          dueAt: new Date(now.getTime() - 8 * 86400000),
          status: 'COMPLETED',
          outcome: 'Home BP measurements checked: 122/78 mmHg. Patient adhering to sodium restriction.',
          note: 'Follow-up successfully completed by CHO.',
          createdBy: choUser._id,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Patient E: Registered patient with NO report on file (exercises CHO data-quality metric)
    const patientEUser = await upsertDemoUser({
      name: 'Karan Verma',
      email: 'synthetic.patient.e@example.com',
      role: 'Patient',
      phone: '+1 555-0155',
      village: 'Demo Community South',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=256',
    });
    await Patient.findOneAndUpdate(
      { user: patientEUser._id },
      {
        $set: {
          age: 35, gender: 'Male', bmi: 25.2,
          village: 'Demo Community South',
          medicalHistory: [`${SYNTHETIC_TAG}: Newly registered beneficiary awaiting initial laboratory panel.`],
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // =========================================================================
    // 6. Trigger Real ML Predictions
    // =========================================================================
    console.log('--- 6. Triggering Real ML Predictions for Demo Patients ---');
    for (const [pDoc, pUser] of [
      [patientA, patientAUser],
      [patientB, patientBUser],
      [patientC, patientCUser],
    ]) {
      try {
        await triggerDiabetesRecalculation(pDoc._id, pUser._id);
        await triggerHeartDiseaseRecalculation(pDoc._id, pUser._id);

        const reports = await Report.find({ patient: pDoc._id, status: 'CONFIRMED' }).sort({ confirmedAt: -1 });
        const htFeats = buildHypertensionFeatures(reports, pDoc);
        if (htFeats.canCalculate) {
          const res = await callNewDiseasePredictionService('hypertension', htFeats.featureVector);
          if (res.canCalculate) {
            await Prediction.create({
              patient: pDoc._id, calculatedBy: pUser._id, disease: 'hypertension',
              modelVersion: res.modelVersion, featureSchemaVersion: res.featureSchemaVersion,
              probability: res.probability, threshold: res.threshold, riskCategory: res.riskCategory,
              status: 'SUCCESS', canCalculate: true, dataCompleteness: res.dataCompleteness,
              inputFeatures: htFeats.featureVector, clinicalDisclaimer: res.clinicalDisclaimer,
              predictionDate: new Date(),
            });
          }
        }

        const ckdFeats = buildCkdFeatures(reports, pDoc, ['age', 'serum_creatinine']);
        if (ckdFeats.canCalculate) {
          const res = await callNewDiseasePredictionService('chronic_kidney_disease', ckdFeats.featureVector);
          if (res.canCalculate) {
            await Prediction.create({
              patient: pDoc._id, calculatedBy: pUser._id, disease: 'chronic_kidney_disease',
              modelVersion: res.modelVersion, featureSchemaVersion: res.featureSchemaVersion,
              probability: res.probability, threshold: res.threshold, riskCategory: res.riskCategory,
              status: 'SUCCESS', canCalculate: true, dataCompleteness: res.dataCompleteness,
              inputFeatures: ckdFeats.featureVector, clinicalDisclaimer: res.clinicalDisclaimer,
              predictionDate: new Date(),
            });
          }
        }
      } catch (err) {
        console.warn(`[ML Trigger] Prediction deferred for ${pDoc.name || pUser.name}:`, err.message);
      }
    }

    if (!(await Setting.exists({}))) {
      await Setting.create({
        systemName: 'MedScan-NCD Faculty Demonstration',
        iotSyncIntervalSeconds: 30,
        emailNotificationsEnabled: false,
        ocrAutoTrigger: true,
      });
    }

    const localCredentialPayload = {
      notice: 'CONFIDENTIAL: Local demonstration credentials for faculty evaluation only. NEVER commit to Git.',
      generatedAt: new Date().toISOString(),
      admin: {
        email: adminUser.email,
        role: 'Admin',
        password: adminPassword,
        loginUrl: '/login',
        dashboardUrl: '/admin/dashboard',
        instructions: 'Sign in at /login with these credentials. For security, Admin login is not exposed as a public shortcut in the UI.'
      },
      doctor: {
        email: doctorUser.email,
        role: 'Doctor',
        password: DEMO_PASSWORD,
        dashboardUrl: '/doctor/dashboard'
      },
      cho: {
        email: choUser.email,
        role: 'CHO',
        password: DEMO_PASSWORD,
        dashboardUrl: '/cho/dashboard'
      },
      patient: {
        email: patientAUser.email,
        role: 'Patient',
        password: DEMO_PASSWORD,
        dashboardUrl: '/patient/dashboard'
      }
    };

    const credPathBackend = path.join(backendRoot, '.demo_credentials.local.json');
    const credPathRoot = path.join(repoRoot, '.demo_credentials.local.json');
    await fs.writeFile(credPathBackend, JSON.stringify(localCredentialPayload, null, 2), 'utf-8');
    await fs.writeFile(credPathRoot, JSON.stringify(localCredentialPayload, null, 2), 'utf-8');

    console.log('\n===================================================================');
    console.log('FACULTY DEMONSTRATION SEEDING COMPLETED SUCCESSFULLY');
    console.log('===================================================================');
    console.log('[Security] Private demonstration credentials recorded in Git-ignored files:');
    console.log(`  -> ${credPathRoot}`);
    console.log('Role Accounts Seeded:');
    console.log('  1. Patient Demo:  synthetic.patient.a@example.com (or patient@example.com)');
    console.log('  2. Doctor Demo:   doctor@example.com');
    console.log('  3. CHO Demo:      cho@example.com');
    console.log('  4. Admin Demo:    admin@example.com (Password stored privately in .demo_credentials.local.json)');
    console.log('Additional Demonstration Personas:');
    console.log('  5. Patient B:     synthetic.patient.b@example.com (Elevated glucose profile)');
    console.log('  6. Patient C:     synthetic.patient.c@example.com (Renal impairment profile)');
    console.log('  7. Patient D:     synthetic.patient.d@example.com (Pending doctor request)');
    console.log('  8. Patient E:     synthetic.patient.e@example.com (Unscreened community member)');
    console.log('\nDemo files copied to backend/uploads/.');
    console.log('To reset demo accounts safely at any time:');
    console.log('  node scripts/seed-faculty-demo.js --reset-demo-only');
  } finally {
    await mongoose.disconnect();
  }
}

seedFacultyDemo().catch((error) => {
  console.error(`[Faculty Demo Seed Error] ${error.message}`);
  process.exitCode = 1;
});
