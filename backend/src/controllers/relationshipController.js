import mongoose from 'mongoose';
import { PatientRelationship } from '../models/PatientRelationship.js';
import { Patient } from '../models/Patient.js';
import { Doctor } from '../models/Doctor.js';
import { User } from '../models/User.js';
import { Invitation } from '../models/Invitation.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncWrapper.js';

/**
 * List available verified doctors for patient discovery
 * GET /api/relationships/doctors
 */
export const getAvailableDoctors = asyncHandler(async (req, res) => {
  const doctors = await Doctor.find()
    .populate('user', 'name email phone avatar village')
    .lean();

  const formatted = doctors
    .filter((doc) => doc.user) // Ensure linked user exists
    .map((doc) => ({
      doctorId: doc.user._id,
      name: doc.user.name,
      email: doc.user.email,
      avatar: doc.user.avatar,
      specialization: doc.specialization,
      hospital: doc.hospital,
      experienceYears: doc.experienceYears,
      contactPhone: doc.contactPhone,
    }));

  return res.status(200).json(
    new ApiResponse(200, { doctors: formatted }, 'Available doctors retrieved successfully.')
  );
});

/**
 * Flow A: Patient requests a connection with a specific Doctor
 * POST /api/relationships/doctor/request
 */
export const requestDoctor = asyncHandler(async (req, res) => {
  const { doctorId, isPrimary = false, relationshipLabel = 'Consulting Physician' } = req.body;

  if (!doctorId) {
    throw new ApiError(400, 'Doctor ID is required.');
  }

  // Caller must be a patient
  const patient = await Patient.findOne({ user: req.user._id });
  if (!patient) {
    throw new ApiError(404, 'Patient profile not found for authenticated user.');
  }

  // Verify target is an active Doctor
  const doctorUser = await User.findById(doctorId);
  if (!doctorUser || doctorUser.role !== 'Doctor') {
    throw new ApiError(404, 'Target doctor account not found or invalid.');
  }

  // Check if an ACTIVE or PENDING relationship already exists
  const existingRel = await PatientRelationship.findOne({
    patient: patient._id,
    relatedUser: doctorUser._id,
    relationshipType: 'DOCTOR',
    status: { $in: ['PENDING', 'ACTIVE'] },
  });

  if (existingRel) {
    throw new ApiError(
      400,
      `A ${existingRel.status.toLowerCase()} relationship already exists with Dr. ${doctorUser.name}.`
    );
  }

  const relationship = await PatientRelationship.create({
    patient: patient._id,
    relatedUser: doctorUser._id,
    relationshipType: 'DOCTOR',
    status: 'PENDING',
    initiatedBy: 'PATIENT',
    isPrimaryDoctor: Boolean(isPrimary),
    relationshipLabel: relationshipLabel.trim(),
  });

  const populated = await PatientRelationship.findById(relationship._id)
    .populate('relatedUser', 'name email avatar role')
    .populate({
      path: 'patient',
      populate: { path: 'user', select: 'name email phone village' },
    });

  return res.status(201).json(
    new ApiResponse(201, { relationship: populated }, 'Doctor connection request sent successfully.')
  );
});

/**
 * Flow B: Patient generates a temporary 6-digit consultation code
 * POST /api/relationships/doctor/generate-code
 */
export const generateDoctorCode = asyncHandler(async (req, res) => {
  const patient = await Patient.findOne({ user: req.user._id });
  if (!patient) {
    throw new ApiError(404, 'Patient profile not found for authenticated user.');
  }

  // Revoke any previous pending codes for this patient
  await Invitation.updateMany(
    {
      patient: patient._id,
      relationshipType: 'DOCTOR',
      status: 'PENDING',
    },
    {
      $set: { status: 'REVOKED' },
    }
  );

  const { rawCode, tokenHash } = Invitation.generateConnectionCode();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes validity

  await Invitation.create({
    tokenHash,
    relationshipType: 'DOCTOR',
    patient: patient._id,
    inviterUser: req.user._id,
    relationshipLabel: 'In-Clinic Consultation Code',
    status: 'PENDING',
    expiresAt,
  });

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        code: rawCode,
        expiresAt,
        validityMinutes: 15,
      },
      'Consultation code generated successfully. Share this with your doctor during visit.'
    )
  );
});

/**
 * Flow B: Doctor claims the patient-provided consultation code
 * POST /api/relationships/doctor/claim-code
 */
export const claimDoctorCode = asyncHandler(async (req, res) => {
  const { code, isPrimary = false, relationshipLabel = 'Attending Physician' } = req.body;

  if (!code || typeof code !== 'string') {
    throw new ApiError(400, 'Consultation code is required.');
  }

  if (req.user.role !== 'Doctor') {
    throw new ApiError(403, 'Only verified doctors can claim a consultation code.');
  }

  const tokenHash = Invitation.hashToken(code.trim().toUpperCase());

  // Find and consume invitation
  const invitation = await Invitation.findOneAndUpdate(
    {
      tokenHash,
      relationshipType: 'DOCTOR',
      status: 'PENDING',
      expiresAt: { $gt: new Date() },
    },
    {
      $set: {
        status: 'CONSUMED',
        consumedAt: new Date(),
        claimedBy: req.user._id,
      },
    },
    { new: true }
  );

  if (!invitation) {
    throw new ApiError(400, 'Invalid or expired consultation code. Please ask the patient for a new code.');
  }

  // Check if relationship already exists
  const existingRel = await PatientRelationship.findOne({
    patient: invitation.patient,
    relatedUser: req.user._id,
    relationshipType: 'DOCTOR',
    status: { $in: ['PENDING', 'ACTIVE'] },
  });

  if (existingRel) {
    throw new ApiError(400, `A ${existingRel.status.toLowerCase()} relationship already exists with this patient.`);
  }

  // Create PENDING relationship initiated by DOCTOR (requires patient explicit confirmation)
  // or if patient provided code live, patient can confirm in dashboard
  const relationship = await PatientRelationship.create({
    patient: invitation.patient,
    relatedUser: req.user._id,
    relationshipType: 'DOCTOR',
    status: 'PENDING',
    initiatedBy: 'DOCTOR',
    isPrimaryDoctor: Boolean(isPrimary),
    relationshipLabel: relationshipLabel.trim(),
  });

  const populated = await PatientRelationship.findById(relationship._id)
    .populate({
      path: 'patient',
      populate: { path: 'user', select: 'name email phone village' },
    })
    .populate('relatedUser', 'name email specialization');

  return res.status(201).json(
    new ApiResponse(
      201,
      { relationship: populated },
      'Code claimed successfully. Awaiting patient confirmation to activate clinical access.'
    )
  );
});

/**
 * Accept a pending relationship
 * PATCH /api/relationships/:id/accept
 * Must be executed by the designated counterparty
 */
export const acceptRelationship = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const relationship = await PatientRelationship.findById(id).populate('patient');

  if (!relationship) {
    throw new ApiError(404, 'Relationship record not found.');
  }

  if (relationship.status !== 'PENDING') {
    throw new ApiError(400, `Cannot accept a relationship with status: ${relationship.status}.`);
  }

  // Authorization check: only designated recipient can accept
  if (relationship.initiatedBy === 'PATIENT') {
    // Only the relatedUser (Doctor) can accept
    if (relationship.relatedUser.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'Unauthorized. Only the requested doctor can accept this request.');
    }
  } else if (relationship.initiatedBy === 'DOCTOR') {
    // Only the Patient can accept
    if (relationship.patient.user.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'Unauthorized. Only the patient can accept this doctor connection request.');
    }
  } else {
    throw new ApiError(403, 'This relationship cannot be accepted.');
  }

  // If DOCTOR and isPrimaryDoctor, manage database-level primary doctor invariant
  if (relationship.relationshipType === 'DOCTOR' && relationship.isPrimaryDoctor) {
    // Demote any existing active primary doctor for this patient
    await PatientRelationship.updateMany(
      {
        patient: relationship.patient._id,
        relationshipType: 'DOCTOR',
        status: 'ACTIVE',
        isPrimaryDoctor: true,
      },
      {
        $set: { isPrimaryDoctor: false },
      }
    );

    // Sync legacy assignedDoctor on Patient
    await Patient.findByIdAndUpdate(relationship.patient._id, {
      assignedDoctor: relationship.relatedUser,
    });
  }

  // If FAMILY, sync legacy linkedFamilyMembers
  if (relationship.relationshipType === 'FAMILY') {
    await Patient.findByIdAndUpdate(relationship.patient._id, {
      $addToSet: { linkedFamilyMembers: relationship.relatedUser },
    });
  }

  relationship.status = 'ACTIVE';
  relationship.activatedAt = new Date();
  await relationship.save();

  const populated = await PatientRelationship.findById(relationship._id)
    .populate('relatedUser', 'name email role avatar')
    .populate({
      path: 'patient',
      populate: { path: 'user', select: 'name email phone village' },
    });

  return res.status(200).json(
    new ApiResponse(200, { relationship: populated }, 'Relationship accepted and activated successfully.')
  );
});

/**
 * Reject a pending relationship
 * PATCH /api/relationships/:id/reject
 */
export const rejectRelationship = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const relationship = await PatientRelationship.findById(id).populate('patient');

  if (!relationship) {
    throw new ApiError(404, 'Relationship record not found.');
  }

  if (relationship.status !== 'PENDING') {
    throw new ApiError(400, `Cannot reject a relationship with status: ${relationship.status}.`);
  }

  // Authorization check: only designated recipient can reject
  if (relationship.initiatedBy === 'PATIENT') {
    if (relationship.relatedUser.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'Unauthorized. Only the requested doctor can reject this request.');
    }
  } else if (relationship.initiatedBy === 'DOCTOR') {
    if (relationship.patient.user.toString() !== req.user._id.toString()) {
      throw new ApiError(403, 'Unauthorized. Only the patient can reject this request.');
    }
  } else {
    throw new ApiError(403, 'Unauthorized.');
  }

  relationship.status = 'REJECTED';
  await relationship.save();

  return res.status(200).json(
    new ApiResponse(200, { relationship }, 'Relationship request rejected.')
  );
});

/**
 * Revoke an active or pending relationship
 * PATCH /api/relationships/:id/revoke
 * Can be performed by either Patient or Related User
 */
export const revokeRelationship = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const relationship = await PatientRelationship.findById(id).populate('patient');

  if (!relationship) {
    throw new ApiError(404, 'Relationship record not found.');
  }

  // Authorization: Caller must be either patient.user or relatedUser
  const isPatientOwner = relationship.patient.user.toString() === req.user._id.toString();
  const isRelatedUser = relationship.relatedUser.toString() === req.user._id.toString();

  if (!isPatientOwner && !isRelatedUser) {
    throw new ApiError(403, 'Unauthorized. You do not have permission to revoke this relationship.');
  }

  if (relationship.status === 'REVOKED') {
    throw new ApiError(400, 'Relationship is already revoked.');
  }

  // Legacy synchronization on revocation
  if (relationship.relationshipType === 'DOCTOR') {
    // If this was the primary doctor, set assignedDoctor to null (no silent promotion)
    if (relationship.isPrimaryDoctor || relationship.patient.assignedDoctor?.toString() === relationship.relatedUser.toString()) {
      await Patient.findByIdAndUpdate(relationship.patient._id, {
        assignedDoctor: null,
      });
      relationship.isPrimaryDoctor = false;
    }
  } else if (relationship.relationshipType === 'FAMILY') {
    // Pull from legacy linkedFamilyMembers
    await Patient.findByIdAndUpdate(relationship.patient._id, {
      $pull: { linkedFamilyMembers: relationship.relatedUser },
    });
  }

  relationship.status = 'REVOKED';
  relationship.revokedAt = new Date();
  await relationship.save();

  return res.status(200).json(
    new ApiResponse(200, { relationship }, 'Relationship revoked successfully.')
  );
});

/**
 * Set an active Doctor relationship as primary
 * PATCH /api/relationships/:id/set-primary
 * Patient-only
 */
export const setPrimaryDoctor = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const patient = await Patient.findOne({ user: req.user._id });
  if (!patient) {
    throw new ApiError(404, 'Patient profile not found.');
  }

  const relationship = await PatientRelationship.findOne({
    _id: id,
    patient: patient._id,
    relationshipType: 'DOCTOR',
    status: 'ACTIVE',
  });

  if (!relationship) {
    throw new ApiError(404, 'Active doctor relationship not found.');
  }

  // Demote previous primary doctor(s)
  await PatientRelationship.updateMany(
    {
      patient: patient._id,
      relationshipType: 'DOCTOR',
      status: 'ACTIVE',
      isPrimaryDoctor: true,
    },
    {
      $set: { isPrimaryDoctor: false },
    }
  );

  // Promote target relationship
  relationship.isPrimaryDoctor = true;
  await relationship.save();

  // Sync legacy assignedDoctor
  patient.assignedDoctor = relationship.relatedUser;
  await patient.save();

  return res.status(200).json(
    new ApiResponse(200, { relationship }, 'Primary doctor designated successfully.')
  );
});

/**
 * Get all relationships for the authenticated user
 * GET /api/relationships
 */
export const getMyRelationships = asyncHandler(async (req, res) => {
  const { role, _id } = req.user;

  if (role === 'Patient') {
    const patient = await Patient.findOne({ user: _id });
    if (!patient) {
      return res.status(200).json(new ApiResponse(200, { doctors: [], family: [] }));
    }

    const relationships = await PatientRelationship.find({
      patient: patient._id,
      status: { $in: ['ACTIVE', 'PENDING'] },
    })
      .populate('relatedUser', 'name email role phone avatar')
      .sort({ createdAt: -1 })
      .lean();

    const doctors = relationships.filter((r) => r.relationshipType === 'DOCTOR');
    const family = relationships.filter((r) => r.relationshipType === 'FAMILY');

    return res.status(200).json(
      new ApiResponse(200, { doctors, family }, 'Relationships retrieved successfully.')
    );
  }

  if (role === 'Doctor') {
    const relationships = await PatientRelationship.find({
      relatedUser: _id,
      relationshipType: 'DOCTOR',
      status: { $in: ['ACTIVE', 'PENDING'] },
    })
      .populate({
        path: 'patient',
        populate: { path: 'user', select: 'name email phone avatar village' },
      })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(
      new ApiResponse(200, { relationships }, 'Doctor relationships retrieved successfully.')
    );
  }

  if (role === 'Family') {
    const relationships = await PatientRelationship.find({
      relatedUser: _id,
      relationshipType: 'FAMILY',
      status: 'ACTIVE',
    })
      .populate({
        path: 'patient',
        populate: { path: 'user', select: 'name email phone avatar village' },
      })
      .lean();

    return res.status(200).json(
      new ApiResponse(200, { relationships }, 'Family relationships retrieved successfully.')
    );
  }

  return res.status(200).json(new ApiResponse(200, { relationships: [] }, 'No relationships.'));
});

/**
 * Get pending requests for the authenticated user
 * GET /api/relationships/pending
 */
export const getPendingRequests = asyncHandler(async (req, res) => {
  const { role, _id } = req.user;

  if (role === 'Doctor') {
    // Pending requests initiated by patients to this doctor
    const requests = await PatientRelationship.find({
      relatedUser: _id,
      relationshipType: 'DOCTOR',
      status: 'PENDING',
      initiatedBy: 'PATIENT',
    })
      .populate({
        path: 'patient',
        populate: { path: 'user', select: 'name email phone village avatar' },
      })
      .lean();

    return res.status(200).json(
      new ApiResponse(200, { requests }, 'Pending consultation requests retrieved successfully.')
    );
  }

  if (role === 'Patient') {
    const patient = await Patient.findOne({ user: _id });
    if (!patient) {
      return res.status(200).json(new ApiResponse(200, { requests: [] }));
    }

    // Pending requests initiated by doctors to this patient (e.g. from claimed code)
    const requests = await PatientRelationship.find({
      patient: patient._id,
      status: 'PENDING',
      initiatedBy: 'DOCTOR',
    })
      .populate('relatedUser', 'name email role phone avatar')
      .lean();

    return res.status(200).json(
      new ApiResponse(200, { requests }, 'Pending incoming connection requests retrieved successfully.')
    );
  }

  return res.status(200).json(new ApiResponse(200, { requests: [] }, 'No pending requests.'));
});
