import mongoose from 'mongoose';

const statusHistorySchema = new mongoose.Schema({
  status: { type: String, required: true, enum: ['PENDING', 'ACCEPTED', 'COMPLETED', 'CANCELLED'] },
  note: { type: String, trim: true, maxlength: 1000 },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

const referralSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  reason: { type: String, required: true, trim: true, maxlength: 300 },
  originatingFacility: { type: String, trim: true, maxlength: 200 },
  destinationFacility: { type: String, required: true, trim: true, maxlength: 200 },
  referredAt: { type: Date, default: Date.now, index: true },
  status: { type: String, enum: ['PENDING', 'ACCEPTED', 'COMPLETED', 'CANCELLED'], default: 'PENDING', index: true },
  notes: { type: String, trim: true, maxlength: 1000 },
  outcome: { type: String, trim: true, maxlength: 1000 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  history: { type: [statusHistorySchema], default: [] },
}, { timestamps: true });

referralSchema.index({ patient: 1, status: 1, referredAt: -1 });
export const Referral = mongoose.model('Referral', referralSchema);
