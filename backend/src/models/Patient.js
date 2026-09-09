import mongoose from 'mongoose';

const patientSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other'],
      default: 'Male',
    },
    dob: {
      type: Date,
    },
    age: {
      type: Number,
      default: 45,
    },
    bloodGroup: {
      type: String,
      default: 'O+',
    },
    heightCm: {
      type: Number,
      default: 170,
    },
    weightKg: {
      type: Number,
      default: 75,
    },
    bmi: {
      type: Number,
      default: 25.9,
    },
    systolicBP: {
      type: Number,
      default: 135,
    },
    diastolicBP: {
      type: Number,
      default: 85,
    },
    fastingSugar: {
      type: Number,
      default: 140,
    },
    address: {
      type: String,
      default: '123 Health Ave',
    },
    village: {
      type: String,
      default: 'Green Valley',
      index: true,
    },
    assignedDoctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    assignedNurse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    linkedFamilyMembers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    emergencyContact: {
      name: { type: String, default: 'Jane Doe' },
      relation: { type: String, default: 'Spouse' },
      phone: { type: String, default: '+1 555-0199' },
    },
    medicalHistory: [
      {
        type: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

export const Patient = mongoose.model('Patient', patientSchema);
