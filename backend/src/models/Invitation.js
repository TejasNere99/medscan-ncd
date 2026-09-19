import mongoose from 'mongoose';
import crypto from 'crypto';

const invitationSchema = new mongoose.Schema(
  {
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    relationshipType: {
      type: String,
      enum: ['FAMILY', 'DOCTOR'],
      required: true,
      index: true,
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },
    inviterUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    recipientEmail: {
      type: String,
      lowercase: true,
      trim: true,
    },
    relationshipLabel: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'CONSUMED', 'REVOKED', 'EXPIRED'],
      default: 'PENDING',
      required: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    consumedAt: {
      type: Date,
    },
    claimedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

invitationSchema.statics.hashToken = function (rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
};

invitationSchema.statics.generateToken = function () {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  return { rawToken, tokenHash };
};

invitationSchema.statics.generateConnectionCode = function () {
  const rawCode = crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
  const tokenHash = crypto.createHash('sha256').update(rawCode).digest('hex');
  return { rawCode, tokenHash };
};

export const Invitation = mongoose.model('Invitation', invitationSchema);
