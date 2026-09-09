import mongoose from 'mongoose';

const settingSchema = new mongoose.Schema(
  {
    systemName: {
      type: String,
      default: 'Smart Medicine Reminder & AI Disease Prediction System',
    },
    iotSyncIntervalSeconds: {
      type: Number,
      default: 30,
    },
    emailNotificationsEnabled: {
      type: Boolean,
      default: true,
    },
    ocrAutoTrigger: {
      type: Boolean,
      default: true,
    },
    aiModelVersion: {
      type: String,
      default: 'v1.2.4-rule-weighted',
    },
  },
  {
    timestamps: true,
  }
);

export const Setting = mongoose.model('Setting', settingSchema);
