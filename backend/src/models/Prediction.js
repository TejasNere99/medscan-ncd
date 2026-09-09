import mongoose from 'mongoose';

const predictionSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },
    calculatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    inputs: {
      age: Number,
      systolicBP: Number,
      diastolicBP: Number,
      fastingSugar: Number,
      bmi: Number,
      symptoms: [String],
    },
    overallRiskPercent: {
      type: Number,
      required: true,
    },
    riskLevel: {
      type: String,
      enum: ['Low', 'Moderate', 'High', 'Critical'],
      required: true,
    },
    diseaseBreakdown: {
      Diabetes: { type: Number, default: 0 },
      Hypertension: { type: Number, default: 0 },
      HeartDisease: { type: Number, default: 0 },
      KidneyDisease: { type: Number, default: 0 },
    },
    confidenceScore: {
      type: Number,
      default: 88.5,
    },
    recommendations: [
      {
        type: String,
      },
    ],
    algorithmVersion: {
      type: String,
      default: 'v1-rule-weighted-engine',
    },
    predictionDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Prediction = mongoose.model('Prediction', predictionSchema);
