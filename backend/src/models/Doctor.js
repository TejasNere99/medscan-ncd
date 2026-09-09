import mongoose from 'mongoose';

const doctorSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    specialization: {
      type: String,
      default: 'Cardiology & General Medicine',
    },
    licenseNumber: {
      type: String,
      default: 'MED-99201-US',
    },
    hospital: {
      type: String,
      default: 'Metropolitan Healthcare Center',
    },
    experienceYears: {
      type: Number,
      default: 12,
    },
    contactPhone: {
      type: String,
      default: '+1 555-0122',
    },
  },
  {
    timestamps: true,
  }
);

export const Doctor = mongoose.model('Doctor', doctorSchema);
