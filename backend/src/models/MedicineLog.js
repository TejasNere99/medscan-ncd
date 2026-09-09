import mongoose from 'mongoose';

const medicineLogSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },
    medicine: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Medicine',
      required: true,
      index: true,
    },
    scheduledTime: {
      type: Date,
      required: true,
      index: true,
    },
    takenTime: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['Taken', 'Missed', 'Pending', 'Delayed'],
      default: 'Pending',
      index: true,
    },
    source: {
      type: String,
      enum: ['App', 'IoT_Device', 'Doctor_Manual'],
      default: 'App',
    },
    notes: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

export const MedicineLog = mongoose.model('MedicineLog', medicineLogSchema);
