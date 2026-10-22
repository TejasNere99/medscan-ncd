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
    },
    dob: {
      type: Date,
    },
    age: {
      type: Number,
    },
    bloodGroup: {
      type: String,
    },
    heightCm: {
      type: Number,
    },
    weightKg: {
      type: Number,
    },
    bmi: {
      type: Number,
    },
    systolicBP: {
      type: Number,
    },
    diastolicBP: {
      type: Number,
    },
    heartRate: {
      type: Number,
    },
    fastingSugar: {
      type: Number,
    },
    totalCholesterol: {
      type: Number,
    },
    hdl: {
      type: Number,
    },
    serumCreatinine: {
      type: Number,
    },
    bloodUrea: {
      type: Number,
    },
    hemoglobin: {
      type: Number,
    },
    isCurrentSmoker: {
      type: Boolean,
      default: null,
    },
    address: {
      type: String,
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
    emergencyContact: {
      name: { type: String },
      relation: { type: String },
      phone: { type: String },
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
