import mongoose from 'mongoose';

const medicineSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    name: {
      type: String,
      required: [true, 'Medicine name is required'],
      trim: true,
    },
    dosage: {
      type: String,
      required: true,
      default: '500 mg',
    },
    frequency: {
      type: String,
      enum: ['Once daily', 'Twice daily', 'Thrice daily', 'Every 8 hours', 'As needed'],
      default: 'Twice daily',
    },
    timing: [
      {
        type: String,
        enum: ['morning', 'afternoon', 'night'],
      },
    ],
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
    },
    instructions: {
      type: String,
      default: 'Take after meals with warm water.',
    },
    status: {
      type: String,
      enum: ['Active', 'Completed', 'Discontinued'],
      default: 'Active',
    },
  },
  {
    timestamps: true,
  }
);

export const Medicine = mongoose.model('Medicine', medicineSchema);
