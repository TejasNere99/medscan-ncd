import mongoose from 'mongoose';

const predictionSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },
    report: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Report',
      index: true,
    },
    calculatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    disease: {
      type: String,
      default: 'diabetes',
      index: true,
    },
    scenario: {
      type: String,
      default: 'A',
    },
    modelVersion: {
      type: String,
      default: '1.0.0',
    },
    probability: {
      type: Number,
    },
    threshold: {
      type: Number,
      default: 0.21,
    },
    riskCategory: {
      type: String,
      enum: ['ELEVATED_MODEL_ESTIMATED_RISK', 'LOWER_MODEL_ESTIMATED_RISK', 'INSUFFICIENT_DATA', 'FAILED'],
      default: 'LOWER_MODEL_ESTIMATED_RISK',
      index: true,
    },
    status: {
      type: String,
      enum: ['SUCCESS', 'INSUFFICIENT_DATA', 'FAILED', 'SERVICE_UNAVAILABLE', 'PREDICTION_SERVICE_UNAVAILABLE'],
      default: 'SUCCESS',
      index: true,
    },
    canCalculate: {
      type: Boolean,
      default: true,
    },
    dataCompleteness: {
      type: String,
      enum: ['FULL', 'PARTIAL', 'INSUFFICIENT'],
      default: 'FULL',
    },
    missingDomain: {
      type: String,
      default: null,
    },
    inputFeatures: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    featureAvailability: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    topContributingFactors: [
      {
        feature: String,
        value: Number,
        impact: String,
        description: String,
      },
    ],
    clinicalDisclaimer: {
      type: String,
      default:
        'Model-estimated risk for clinical decision support. This tool provides non-diagnostic risk estimation derived from routine cardiometabolic parameters and does not substitute for clinical evaluation or diagnostic laboratory testing.',
    },
    // Backwards compatibility with legacy rule-engine predictions
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
      default: function () {
        return this.probability !== undefined && this.probability !== null
          ? Math.round(this.probability * 100)
          : 0;
      },
    },
    riskLevel: {
      type: String,
      default: function () {
        if (this.riskCategory === 'ELEVATED_MODEL_ESTIMATED_RISK') return 'High';
        return 'Low';
      },
    },
    diseaseBreakdown: {
      Diabetes: { type: Number, default: 0 },
      Hypertension: { type: Number, default: 0 },
      HeartDisease: { type: Number, default: 0 },
      KidneyDisease: { type: Number, default: 0 },
    },
    confidenceScore: {
      type: Number,
      default: 82.8,
    },
    recommendations: [
      {
        type: String,
      },
    ],
    algorithmVersion: {
      type: String,
      default: 'diabetes_scenario_a_v1.0.0',
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
