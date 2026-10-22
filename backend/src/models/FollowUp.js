import mongoose from 'mongoose';

const historySchema = new mongoose.Schema({
  action: { type: String, required: true, enum: ['SCHEDULED', 'RESCHEDULED', 'COMPLETED', 'CANCELLED'] },
  date: { type: Date, required: true },
  outcome: { type: String, trim: true, maxlength: 1000 },
  note: { type: String, trim: true, maxlength: 1000 },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { _id: false, timestamps: true });

const followUpSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  dueAt: { type: Date, required: true, index: true },
  status: { type: String, enum: ['SCHEDULED', 'COMPLETED', 'CANCELLED'], default: 'SCHEDULED', index: true },
  reason: { type: String, required: true, trim: true, maxlength: 200 },
  outcome: { type: String, trim: true, maxlength: 1000 },
  note: { type: String, trim: true, maxlength: 1000 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  history: { type: [historySchema], default: [] },
}, { timestamps: true });

followUpSchema.index({ patient: 1, status: 1, dueAt: 1 });
export const FollowUp = mongoose.model('FollowUp', followUpSchema);
