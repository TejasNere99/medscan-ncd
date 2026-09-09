import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { User } from '../models/User.js';
import { Patient } from '../models/Patient.js';
import { Doctor } from '../models/Doctor.js';
import { Medicine } from '../models/Medicine.js';
import { MedicineLog } from '../models/MedicineLog.js';
import { Report } from '../models/Report.js';
import { Prediction } from '../models/Prediction.js';
import { Notification } from '../models/Notification.js';
import { Appointment } from '../models/Appointment.js';
import { Setting } from '../models/Setting.js';

const seedDatabase = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ai-smart-healthcare';
    console.log(`[Seed Script] Connecting to MongoDB at ${mongoUri}...`);
    await mongoose.connect(mongoUri);

    console.log('[Seed Script] Clearing existing collections...');
    await User.deleteMany({});
    await Patient.deleteMany({});
    await Doctor.deleteMany({});
    await Medicine.deleteMany({});
    await MedicineLog.deleteMany({});
    await Report.deleteMany({});
    await Prediction.deleteMany({});
    await Notification.deleteMany({});
    await Appointment.deleteMany({});
    await Setting.deleteMany({});

    console.log('[Seed Script] Seeding Demo User Accounts (password: Password123!)...');

    // 1. Create Users
    const patientUser = await User.create({
      name: 'John Doe',
      email: 'patient@example.com',
      passwordHash: 'Password123!',
      role: 'Patient',
      phone: '+1 555-0101',
      village: 'Green Valley',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256',
    });

    const doctorUser = await User.create({
      name: 'Dr. Sarah Smith',
      email: 'doctor@example.com',
      passwordHash: 'Password123!',
      role: 'Doctor',
      phone: '+1 555-0102',
      village: 'Green Valley',
      avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=256',
    });

    const familyUser = await User.create({
      name: 'Mary Doe',
      email: 'family@example.com',
      passwordHash: 'Password123!',
      role: 'Family',
      phone: '+1 555-0103',
      village: 'Green Valley',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=256',
    });

    const nurseUser = await User.create({
      name: 'Nurse Emily Johnson',
      email: 'nurse@example.com',
      passwordHash: 'Password123!',
      role: 'Nurse',
      phone: '+1 555-0104',
      village: 'Green Valley',
      avatar: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&q=80&w=256',
    });

    const choUser = await User.create({
      name: 'Robert Davis (CHO)',
      email: 'cho@example.com',
      passwordHash: 'Password123!',
      role: 'CHO',
      phone: '+1 555-0105',
      village: 'Green Valley',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=256',
    });

    const adminUser = await User.create({
      name: 'Admin Supervisor',
      email: 'admin@example.com',
      passwordHash: 'Password123!',
      role: 'Admin',
      phone: '+1 555-0106',
      village: 'Green Valley',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=256',
    });

    // 2. Create Doctor & Patient Documents
    const doctorDoc = await Doctor.create({
      user: doctorUser._id,
      specialization: 'Cardiology & Endocrinology',
      licenseNumber: 'LIC-88392-US',
      hospital: 'St. Jude Community Health Center',
      experienceYears: 14,
    });

    const patientDoc = await Patient.create({
      user: patientUser._id,
      age: 52,
      gender: 'Male',
      bloodGroup: 'A+',
      heightCm: 175,
      weightKg: 84,
      bmi: 27.4,
      systolicBP: 142,
      diastolicBP: 92,
      fastingSugar: 148,
      address: '42 Pine Crest Road, Green Valley',
      village: 'Green Valley',
      assignedDoctor: doctorUser._id,
      assignedNurse: nurseUser._id,
      linkedFamilyMembers: [familyUser._id],
      emergencyContact: {
        name: 'Mary Doe',
        relation: 'Wife',
        phone: '+1 555-0103',
      },
      medicalHistory: ['Type-2 Diabetes Risk', 'Stage 1 Hypertension', 'Mild Hyperlipidemia'],
    });

    // 3. Create Medicines
    const med1 = await Medicine.create({
      patient: patientDoc._id,
      doctor: doctorUser._id,
      name: 'Metformin HCl',
      dosage: '500 mg',
      frequency: 'Twice daily',
      timing: ['morning', 'night'],
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      instructions: 'Take with morning and evening meals.',
      status: 'Active',
    });

    const med2 = await Medicine.create({
      patient: patientDoc._id,
      doctor: doctorUser._id,
      name: 'Amlodipine Besylate',
      dosage: '5 mg',
      frequency: 'Once daily',
      timing: ['morning'],
      startDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      instructions: 'Take after breakfast with water.',
      status: 'Active',
    });

    const med3 = await Medicine.create({
      patient: patientDoc._id,
      doctor: doctorUser._id,
      name: 'Atorvastatin Calcium',
      dosage: '10 mg',
      frequency: 'Once daily',
      timing: ['night'],
      startDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      instructions: 'Take before bedtime.',
      status: 'Active',
    });

    // 4. Create MedicineLogs (Adherence History)
    const now = new Date();
    const logsData = [
      { medicine: med1._id, hoursAgo: 2, status: 'Taken', source: 'App' },
      { medicine: med2._id, hoursAgo: 5, status: 'Taken', source: 'IoT_Device' },
      { medicine: med1._id, hoursAgo: 14, status: 'Taken', source: 'App' },
      { medicine: med3._id, hoursAgo: 22, status: 'Taken', source: 'App' },
      { medicine: med1._id, hoursAgo: 26, status: 'Missed', source: 'App' },
      { medicine: med2._id, hoursAgo: 30, status: 'Taken', source: 'IoT_Device' },
      { medicine: med1._id, hoursAgo: 48, status: 'Taken', source: 'App' },
      { medicine: med3._id, hoursAgo: 50, status: 'Taken', source: 'App' },
    ];

    for (const l of logsData) {
      await MedicineLog.create({
        patient: patientDoc._id,
        medicine: l.medicine,
        scheduledTime: new Date(now.getTime() - l.hoursAgo * 60 * 60 * 1000),
        takenTime: l.status === 'Taken' ? new Date(now.getTime() - (l.hoursAgo - 0.2) * 60 * 60 * 1000) : undefined,
        status: l.status,
        source: l.source,
      });
    }

    // 5. Create Sample Reports (with OCR text & structured JSON)
    await Report.create({
      patient: patientDoc._id,
      uploader: doctorUser._id,
      title: 'Comprehensive Metabolic & Lipid Panel',
      reportType: 'Blood Test',
      fileUrl: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&q=80&w=800',
      publicId: 'sample_report_01',
      extractedText: `LABORATORY EVALUATION REPORT
Patient: John Doe | Age: 52 | Gender: Male
Fasting Glucose: 148 mg/dL (High)
Blood Pressure: 142/92 mmHg (Stage 1 Hypertension)
Total Cholesterol: 215 mg/dL
Triglycerides: 165 mg/dL
Serum Creatinine: 1.1 mg/dL`,
      structuredData: {
        fastingSugar: 148,
        systolicBP: 142,
        diastolicBP: 92,
        cholesterol: 215,
        creatinine: 1.1,
      },
      confidence: 94,
    });

    // 6. Create AI Prediction Record
    await Prediction.create({
      patient: patientDoc._id,
      calculatedBy: doctorUser._id,
      inputs: {
        age: 52,
        systolicBP: 142,
        diastolicBP: 92,
        fastingSugar: 148,
        bmi: 27.4,
        symptoms: ['Frequent thirst', 'Mild morning dizziness'],
      },
      overallRiskPercent: 68,
      riskLevel: 'High',
      diseaseBreakdown: {
        Diabetes: 72,
        Hypertension: 68,
        HeartDisease: 45,
        KidneyDisease: 28,
      },
      confidenceScore: 89.4,
      recommendations: [
        'Maintain daily blood pressure and glucose logs.',
        'Adopt a low-sodium, reduced glycemic index diet.',
        'Schedule a 30-day follow-up consultation with Dr. Sarah Smith.',
      ],
      algorithmVersion: 'v1-rule-weighted-engine',
    });

    // 7. Create Notifications
    await Notification.create({
      recipient: patientUser._id,
      type: 'MedicineReminder',
      title: 'Upcoming Medicine Reminder',
      message: 'Time to take Metformin 500mg in 15 minutes (Night Dose).',
      priority: 'Medium',
      isRead: false,
    });

    await Notification.create({
      recipient: patientUser._id,
      type: 'HighRiskAlert',
      title: 'Elevated Risk Assessment',
      message: 'Your latest risk calculation rating is High (68%). Check doctor recommendations.',
      priority: 'Urgent',
      isRead: false,
    });

    await Notification.create({
      recipient: familyUser._id,
      type: 'MissedMedicineAlert',
      title: 'Family Health Alert: John Doe',
      message: 'John Doe missed scheduled dose of Metformin 500mg yesterday evening.',
      priority: 'High',
      isRead: false,
    });

    // 8. Create Appointment
    await Appointment.create({
      patient: patientDoc._id,
      doctor: doctorUser._id,
      date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      time: '10:30 AM',
      reason: 'Routine Diabetes & Blood Pressure Evaluation',
      status: 'Upcoming',
    });

    // 9. System Setting
    await Setting.create({
      systemName: 'Smart Medicine Reminder & AI Disease Prediction Platform',
      iotSyncIntervalSeconds: 15,
      emailNotificationsEnabled: true,
      ocrAutoTrigger: true,
    });

    console.log('======================================================');
    console.log('   DATABASE SEEDED SUCCESSFULLY WITH DEMO ACCOUNTS');
    console.log('======================================================');
    console.log(' Patient:  patient@example.com  | Password123!');
    console.log(' Doctor:   doctor@example.com   | Password123!');
    console.log(' Family:   family@example.com   | Password123!');
    console.log(' Nurse:    nurse@example.com    | Password123!');
    console.log(' CHO:      cho@example.com      | Password123!');
    console.log(' Admin:    admin@example.com    | Password123!');
    console.log('======================================================\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('[Seed Script Error]:', err);
    process.exit(1);
  }
};

seedDatabase();
