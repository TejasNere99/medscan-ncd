import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { User } from '../src/models/User.js';
import { Patient } from '../src/models/Patient.js';
import { Doctor } from '../src/models/Doctor.js';
import { PatientRelationship } from '../src/models/PatientRelationship.js';
import { Medicine } from '../src/models/Medicine.js';
import { MedicineLog } from '../src/models/MedicineLog.js';
import { Report } from '../src/models/Report.js';
import { Appointment } from '../src/models/Appointment.js';
import { Notification } from '../src/models/Notification.js';
import { Setting } from '../src/models/Setting.js';
import { Prediction } from '../src/models/Prediction.js';
import { FollowUp } from '../src/models/FollowUp.js';
import { Referral } from '../src/models/Referral.js';
import { triggerDiabetesRecalculation, triggerHeartDiseaseRecalculation } from '../src/controllers/patientController.js';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(backendRoot, '.env') });

const EXPECTED_DATABASE = 'medscan_ncd_demo_local';
const DEMO_PASSWORD = 'MedScanDemo!2026';
const SYNTHETIC_LABEL = 'Synthetic demonstration data — not a real patient record.';
const DEMO_REPORT_TITLE = 'Synthetic demo — metabolic and lipid panel';
const DEMO_REPORT_FILENAME = 'medscan-demo-report.pdf';

function requireSafeDemoUri(uri) {
  if (!uri) throw new Error('Set MONGODB_URI to the dedicated local demo database before seeding.');

  let parsed;
  try {
    parsed = new URL(uri);
  } catch {
    throw new Error('MONGODB_URI must be a valid MongoDB URI for the local demo database.');
  }

  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  const isLoopback = ['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname);
  const hasCredentials = Boolean(parsed.username || parsed.password);
  if (
    parsed.protocol !== 'mongodb:' ||
    !isLoopback ||
    hasCredentials ||
    databaseName !== EXPECTED_DATABASE
  ) {
    throw new Error(`Refusing to seed. This script only accepts the unauthenticated loopback database ${EXPECTED_DATABASE}.`);
  }
}

function buildDemoPdf() {
  const lines = [
    'FICTIONAL DEMONSTRATION ONLY - NOT A REAL MEDICAL RECORD',
    'MedScan Sample Laboratory Summary',
    '',
    'Patient: Demo Patient',
    'Date: 2026-10-18',
    '',
    'HbA1c: 5.8 percent',
    'Fasting glucose: 112 mg/dL',
    'Total cholesterol: 205 mg/dL',
    'HDL cholesterol: 48 mg/dL',
    'Blood pressure: 138/86 mmHg',
    'BMI: 27.4 kg/m2',
    'Serum creatinine: 0.9 mg/dL',
    '',
    'All values on this page are invented for a software demonstration.',
    'This document is not for diagnosis or clinical decision-making.',
  ];
  const escapePdfText = (value) => value.replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)');
  const textCommands = lines
    .map((line, index) => `${index === 0 ? '72 750 Td' : '0 -30 Td'} (${escapePdfText(line)}) Tj`)
    .join('\n');
  const stream = `BT\n/F1 12 Tf\n${textCommands}\nET`;
  const streamLength = Buffer.byteLength(stream, 'ascii');
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj',
    `5 0 obj\n<< /Length ${streamLength} >>\nstream\n${stream}\nendstream\nendobj`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, 'ascii'));
    pdf += `${object}\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf, 'ascii');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(pdf, 'ascii');
}

async function upsertDemoUser({ name, email, role, phone, village = 'Demo Community', communityVillages = [] }) {
  let user = await User.findOne({ email }).select('+passwordHash');
  if (!user) {
    user = new User({ email, name, role, phone, village, communityVillages, avatar: '', passwordHash: DEMO_PASSWORD });
  } else if (user.role !== role) {
    throw new Error(`The reserved demo email ${email} is already assigned a different role.`);
  } else {
    user.name = name;
    user.phone = phone;
    user.village = village;
    user.communityVillages = communityVillages;
    user.avatar = '';
    user.isEmailVerified = true;
    user.isVerified = true;
    user.passwordHash = DEMO_PASSWORD;
  }
  user.isEmailVerified = true;
  user.isVerified = true;
  await user.save();
  return user;
}

async function seedDemo() {
  const mongoUri = process.env.MONGODB_URI;
  requireSafeDemoUri(mongoUri);

  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });

    const patientUser = await upsertDemoUser({
      name: 'Demo Patient', email: 'patient@example.com', role: 'Patient', phone: '+1 555-0101', village: 'Demo Community Central',
    });
    const doctorUser = await upsertDemoUser({
      name: 'Dr. Demo Clinician', email: 'doctor@example.com', role: 'Doctor', phone: '+1 555-0102',
    });
    const choUser = await upsertDemoUser({
      name: 'Demo Community Health Officer', email: 'cho@example.com', role: 'CHO', phone: '+1 555-0103',
      village: 'Demo Community Central', communityVillages: ['Demo Community North', 'Demo Community South', 'Demo Community East'],
    });
    await upsertDemoUser({
      name: 'Demo Administrator', email: 'admin@example.com', role: 'Admin', phone: '+1 555-0104',
    });

    const doctor = await Doctor.findOneAndUpdate(
      { user: doctorUser._id },
      { $set: { specialization: 'General Medicine', licenseNumber: 'DEMO-LICENSE-001', hospital: 'Demo Community Clinic', experienceYears: 8 } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    const patient = await Patient.findOneAndUpdate(
      { user: patientUser._id },
      {
        $set: {
          age: 52,
          gender: 'Male',
          bloodGroup: 'O+',
          heightCm: 174,
          weightKg: 83,
          bmi: 27.4,
          systolicBP: 138,
          diastolicBP: 86,
          fastingSugar: 112,
          totalCholesterol: 205,
          hdl: 48,
          serumCreatinine: 0.9,
          isCurrentSmoker: false,
          village: 'Demo Community Central',
          assignedDoctor: doctorUser._id,
          medicalHistory: ['Synthetic sample profile for demonstration'],
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const communityFixtures = [
      { name: 'Synthetic Demo Patient 01', village: 'Demo Community North', age: 29, gender: 'Female', fastingSugar: 91, systolicBP: 112, diastolicBP: 72, bmi: 21.8 },
      { name: 'Synthetic Demo Patient 02', village: 'Demo Community South', age: 43, gender: 'Male', fastingSugar: 132, systolicBP: 146, diastolicBP: 92, bmi: 29.1 },
      { name: 'Synthetic Demo Patient 03', village: 'Demo Community East', age: 67, gender: 'Female', fastingSugar: 118, systolicBP: 138, diastolicBP: 84, bmi: 26.2 },
      { name: 'Synthetic Demo Patient 04', village: 'Demo Community Central', age: 54, gender: 'Male', fastingSugar: null, systolicBP: 128, diastolicBP: 82, bmi: 24.6 },
      { name: 'Synthetic Demo Patient 05', village: 'Demo Community North', age: 36, gender: 'Female', fastingSugar: 106, systolicBP: null, diastolicBP: null, bmi: 23.7 },
      { name: 'Synthetic Demo Patient 06', village: 'Demo Community South', age: 73, gender: 'Male', fastingSugar: 154, systolicBP: 158, diastolicBP: 96, bmi: 31.4 },
      { name: 'Synthetic Demo Patient 07', village: 'Demo Community East', age: 48, gender: 'Female', fastingSugar: 99, systolicBP: 122, diastolicBP: 78, bmi: null },
      { name: 'Synthetic Demo Patient 08', village: 'Demo Community Central', age: 61, gender: 'Other', fastingSugar: 127, systolicBP: 142, diastolicBP: 88, bmi: 28.0 },
    ];
    const communityPatients = [];
    for (const [index, fixture] of communityFixtures.entries()) {
      const sampleUser = await upsertDemoUser({
        name: fixture.name,
        email: `synthetic.cho.patient.${String(index + 1).padStart(2, '0')}@example.com`,
        role: 'Patient',
        phone: `+1 555-02${String(index + 1).padStart(2, '0')}`,
        village: fixture.village,
      });
      const sample = await Patient.findOneAndUpdate({ user: sampleUser._id }, { $set: {
        village: fixture.village, age: fixture.age, gender: fixture.gender, bmi: fixture.bmi,
        fastingSugar: fixture.fastingSugar, systolicBP: fixture.systolicBP, diastolicBP: fixture.diastolicBP,
        medicalHistory: ['Synthetic demonstration record — not a real patient.'],
      } }, { upsert: true, new: true, setDefaultsOnInsert: true });
      communityPatients.push(sample);
    }

    await PatientRelationship.findOneAndUpdate(
      { patient: patient._id, relatedUser: doctorUser._id, relationshipType: 'DOCTOR' },
      {
        $set: { status: 'ACTIVE', initiatedBy: 'MIGRATION', isPrimaryDoctor: true, relationshipLabel: 'Demo primary clinician', activatedAt: new Date() },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const medicineFixtures = [
      { name: 'Demo Metformin', dosage: '500 mg', frequency: 'Twice daily', timing: ['morning', 'night'], instructions: 'Synthetic demo prescription. Not medical advice.' },
      { name: 'Demo Amlodipine', dosage: '5 mg', frequency: 'Once daily', timing: ['morning'], instructions: 'Synthetic demo prescription. Not medical advice.' },
    ];
    const medicines = [];
    for (const fixture of medicineFixtures) {
      const medicine = await Medicine.findOneAndUpdate(
        { patient: patient._id, name: fixture.name },
        { $set: { ...fixture, doctor: doctorUser._id, status: 'Active' } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      medicines.push(medicine);
    }

    for (const [index, status] of ['Taken', 'Missed'].entries()) {
      const note = `Synthetic demo adherence sample ${index + 1}`;
      const exists = await MedicineLog.exists({ patient: patient._id, notes: note });
      if (!exists) {
        const scheduledTime = new Date(Date.now() - (index + 1) * 24 * 60 * 60 * 1000);
        await MedicineLog.create({
          patient: patient._id,
          medicine: medicines[index]._id,
          scheduledTime,
          takenTime: status === 'Taken' ? new Date(scheduledTime.getTime() + 15 * 60 * 1000) : undefined,
          status,
          source: 'App',
          notes: note,
        });
      }
    }

    const demoReportPath = path.join(backendRoot, 'uploads', DEMO_REPORT_FILENAME);
    await fs.mkdir(path.dirname(demoReportPath), { recursive: true });
    await fs.writeFile(demoReportPath, buildDemoPdf());

    const confirmedData = {
      patientContext: { age: { value: 52, unit: 'years', source: 'synthetic_demo' }, sex: 'Male' },
      measurements: {
        bmi: { value: 27.4, unit: 'kg/m2', source: 'synthetic_demo' },
        systolicBP: { value: 138, unit: 'mmHg', source: 'synthetic_demo' },
        diastolicBP: { value: 86, unit: 'mmHg', source: 'synthetic_demo' },
        totalCholesterol: { value: 205, unit: 'mg/dL', source: 'synthetic_demo' },
        hdl: { value: 48, unit: 'mg/dL', source: 'synthetic_demo' },
        fastingSugar: { value: 112, unit: 'mg/dL', source: 'synthetic_demo' },
        serumCreatinine: { value: 0.9, unit: 'mg/dL', source: 'synthetic_demo' },
        isCurrentSmoker: { value: false, source: 'synthetic_demo' },
      },
    };
    const reportText = `${SYNTHETIC_LABEL}\nFictional values for a software demonstration only.`;
    const report = await Report.findOneAndUpdate(
      { patient: patient._id, title: DEMO_REPORT_TITLE },
      {
        $set: {
          uploader: doctorUser._id,
          reportType: 'Synthetic Demonstration Summary',
          fileUrl: `http://127.0.0.1:5000/uploads/${DEMO_REPORT_FILENAME}`,
          publicId: DEMO_REPORT_FILENAME,
          storageProvider: 'local',
          status: 'CONFIRMED',
          rawOcrText: reportText,
          extractedText: reportText,
          initialExtraction: confirmedData,
          extractedData: confirmedData,
          confirmedData,
          structuredData: {
            age: 52, gender: 'Male', bmi: 27.4, systolicBP: 138, diastolicBP: 86,
            totalCholesterol: 205, hdl: 48, fastingSugar: 112, serumCreatinine: 0.9,
          },
          confidence: 100,
          confirmedAt: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    for (const [index, sample] of communityPatients.entries()) {
      const reportStatus = index < 4 ? 'CONFIRMED' : index < 6 ? 'PENDING_REVIEW' : 'UPLOAD_FAILED';
      const title = `Synthetic CHO sample report ${String(index + 1).padStart(2, '0')}`;
      const historicalDate = new Date(Date.now() - (index + 1) * 28 * 86400000);
      const sampleValues = {
        patientContext: { age: { value: communityFixtures[index].age, unit: 'years', source: 'synthetic_demo' }, sex: communityFixtures[index].gender },
        measurements: {
          fastingSugar: communityFixtures[index].fastingSugar == null ? undefined : { value: communityFixtures[index].fastingSugar, unit: 'mg/dL', source: 'synthetic_demo' },
          systolicBP: communityFixtures[index].systolicBP == null ? undefined : { value: communityFixtures[index].systolicBP, unit: 'mmHg', source: 'synthetic_demo' },
          diastolicBP: communityFixtures[index].diastolicBP == null ? undefined : { value: communityFixtures[index].diastolicBP, unit: 'mmHg', source: 'synthetic_demo' },
          bmi: communityFixtures[index].bmi == null ? undefined : { value: communityFixtures[index].bmi, unit: 'kg/m2', source: 'synthetic_demo' },
        },
      };
      const reportSample = await Report.findOneAndUpdate({ patient: sample._id, title }, { $set: {
        uploader: doctorUser._id, reportType: 'Synthetic CHO demonstration report',
        fileUrl: `http://127.0.0.1:5000/uploads/${DEMO_REPORT_FILENAME}`, publicId: DEMO_REPORT_FILENAME,
        storageProvider: 'local', status: reportStatus, rawOcrText: SYNTHETIC_LABEL,
        extractedText: SYNTHETIC_LABEL, initialExtraction: sampleValues, extractedData: sampleValues,
        confirmedData: reportStatus === 'CONFIRMED' ? sampleValues : {},
        confirmedAt: reportStatus === 'CONFIRMED' ? historicalDate : undefined,
        uploadDate: historicalDate,
      } }, { upsert: true, new: true, setDefaultsOnInsert: true });
      if (reportStatus === 'CONFIRMED' && !(await Prediction.exists({ patient: sample._id, report: reportSample._id, disease: 'diabetes', status: 'SUCCESS' }))) {
        await triggerDiabetesRecalculation(sample._id, doctorUser._id);
      }
      if (reportStatus === 'CONFIRMED' && !(await Prediction.exists({ patient: sample._id, report: reportSample._id, disease: 'heart_disease', status: 'SUCCESS' }))) {
        await triggerHeartDiseaseRecalculation(sample._id, doctorUser._id);
      }
    }

    const demoFollowUps = [
      { patient: communityPatients[1], offsetDays: -8, reason: 'Synthetic overdue outreach review', status: 'SCHEDULED' },
      { patient: communityPatients[2], offsetDays: 2, reason: 'Synthetic due-soon screening follow-up', status: 'SCHEDULED' },
      { patient: communityPatients[3], offsetDays: -16, reason: 'Synthetic completed follow-up', status: 'COMPLETED' },
    ];
    for (const fixture of demoFollowUps) {
      const dueAt = new Date(Date.now() + fixture.offsetDays * 86400000);
      await FollowUp.findOneAndUpdate({ patient: fixture.patient._id, reason: fixture.reason }, {
        $set: { dueAt, status: fixture.status, note: SYNTHETIC_LABEL, outcome: fixture.status === 'COMPLETED' ? 'Synthetic outreach completed for demonstration.' : undefined, createdBy: choUser._id },
        $setOnInsert: { history: [{ action: fixture.status === 'COMPLETED' ? 'COMPLETED' : 'SCHEDULED', date: dueAt, note: SYNTHETIC_LABEL, changedBy: choUser._id }] },
      }, { upsert: true, new: true, setDefaultsOnInsert: true });
    }

    const demoReferrals = [
      { patient: communityPatients[5], destinationFacility: 'Demo District Clinic', reason: 'Synthetic elevated measurements referral', status: 'PENDING' },
      { patient: communityPatients[7], destinationFacility: 'Demo Community Hospital', reason: 'Synthetic completed referral example', status: 'COMPLETED' },
    ];
    for (const fixture of demoReferrals) {
      await Referral.findOneAndUpdate({ patient: fixture.patient._id, reason: fixture.reason }, {
        $set: { destinationFacility: fixture.destinationFacility, originatingFacility: 'Demo Community Health Post', referredAt: new Date(Date.now() - 5 * 86400000), status: fixture.status, notes: SYNTHETIC_LABEL, outcome: fixture.status === 'COMPLETED' ? 'Synthetic referral outcome for demo only.' : undefined, createdBy: choUser._id },
        $setOnInsert: { history: [{ status: 'PENDING', note: SYNTHETIC_LABEL, changedBy: choUser._id }, ...(fixture.status === 'COMPLETED' ? [{ status: 'COMPLETED', note: SYNTHETIC_LABEL, changedBy: choUser._id }] : [])] },
      }, { upsert: true, new: true, setDefaultsOnInsert: true });
    }

    if (!(await Prediction.exists({ patient: patient._id, report: report._id, disease: 'diabetes', status: 'SUCCESS' }))) {
      await triggerDiabetesRecalculation(patient._id, patientUser._id);
    }
    if (!(await Prediction.exists({ patient: patient._id, report: report._id, disease: 'heart_disease', status: 'SUCCESS' }))) {
      await triggerHeartDiseaseRecalculation(patient._id, patientUser._id);
    }

    const appointmentReason = 'Synthetic demo follow-up';
    if (!(await Appointment.exists({ patient: patient._id, doctor: doctorUser._id, reason: appointmentReason }))) {
      await Appointment.create({
        patient: patient._id,
        doctor: doctorUser._id,
        date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        time: '10:30 AM',
        reason: appointmentReason,
        status: 'Upcoming',
        notes: SYNTHETIC_LABEL,
      });
    }

    const notificationTitle = 'Demo reminder — sample data';
    if (!(await Notification.exists({ recipient: patientUser._id, title: notificationTitle }))) {
      await Notification.create({
        recipient: patientUser._id,
        type: 'SystemNotification',
        title: notificationTitle,
        message: SYNTHETIC_LABEL,
        priority: 'Low',
        isRead: false,
        data: { demoKey: 'patient-synthetic-reminder' },
      });
    }

    if (!(await Setting.exists({}))) {
      await Setting.create({
        systemName: 'MedScan-NCD Local Demonstration',
        iotSyncIntervalSeconds: 30,
        emailNotificationsEnabled: false,
        ocrAutoTrigger: true,
      });
    }

    console.log('Local synthetic demo data is ready for Patient, Doctor, CHO, and Admin accounts.');
    console.log('Demo account emails are listed in DEMO_GUIDE.md; the sign-in page offers development-only quick-fill buttons.');
    console.log(`Demo PDF created at backend/uploads/${DEMO_REPORT_FILENAME}.`);
  } finally {
    await mongoose.disconnect();
  }
}

seedDemo().catch((error) => {
  console.error(`[Demo seed] ${error.message}`);
  process.exitCode = 1;
});
