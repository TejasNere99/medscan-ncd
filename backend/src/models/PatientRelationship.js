import mongoose from 'mongoose';

const patientRelationshipSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },
    relatedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    relationshipType: {
      type: String,
      enum: ['DOCTOR'], // Final 4-role architecture strictly supports DOCTOR relationships
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'ACTIVE', 'REJECTED', 'REVOKED', 'EXPIRED'],
      default: 'PENDING',
      required: true,
      index: true,
    },
    initiatedBy: {
      type: String,
      enum: ['PATIENT', 'DOCTOR', 'MIGRATION'],
      required: true,
    },
    isPrimaryDoctor: {
      type: Boolean,
      default: false,
    },
    relationshipLabel: {
      type: String,
      trim: true,
    },
    activatedAt: {
      type: Date,
    },
    revokedAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// 1. Compound Partial Unique Index: Only one PENDING or ACTIVE relationship between a patient and user
patientRelationshipSchema.index(
  { patient: 1, relatedUser: 1, relationshipType: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ['PENDING', 'ACTIVE'] } },
  }
);

// 2. Database-Level Primary Doctor Invariant (Partial Unique Index)
// Enforces that exactly ONE ACTIVE Doctor relationship per Patient can be primary
patientRelationshipSchema.index(
  { patient: 1, isPrimaryDoctor: 1 },
  {
    unique: true,
    partialFilterExpression: {
      relationshipType: 'DOCTOR',
      status: 'ACTIVE',
      isPrimaryDoctor: true,
    },
  }
);

// 3. High-Performance Query Indexes
patientRelationshipSchema.index({ relatedUser: 1, status: 1 });
patientRelationshipSchema.index({ patient: 1, status: 1, relationshipType: 1 });

export const PatientRelationship = mongoose.model('PatientRelationship', patientRelationshipSchema);
