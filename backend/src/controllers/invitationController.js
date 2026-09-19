import mongoose from 'mongoose';
import { Invitation } from '../models/Invitation.js';
import { Patient } from '../models/Patient.js';
import { PatientRelationship } from '../models/PatientRelationship.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncWrapper.js';
import { generateAccessAndRefreshTokens } from './authController.js';

/**
 * Create a new Family Member invitation (Patient-only)
 * POST /api/invitations/family
 */
export const createFamilyInvite = asyncHandler(async (req, res) => {
  const { recipientEmail, relationshipLabel = 'Family Member' } = req.body;

  if (!recipientEmail) {
    throw new ApiError(400, 'Recipient email is required.');
  }

  const cleanEmail = recipientEmail.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    throw new ApiError(400, 'Please provide a valid email address.');
  }

  // Caller must be a patient
  const patient = await Patient.findOne({ user: req.user._id });
  if (!patient) {
    throw new ApiError(404, 'Patient profile not found for authenticated user.');
  }

  // Prevent duplicate active relationship
  const existingUser = await User.findOne({ email: cleanEmail });
  if (existingUser) {
    const activeRel = await PatientRelationship.findOne({
      patient: patient._id,
      relatedUser: existingUser._id,
      relationshipType: 'FAMILY',
      status: { $in: ['PENDING', 'ACTIVE'] },
    });
    if (activeRel) {
      throw new ApiError(400, 'A pending or active family relationship already exists with this user.');
    }
  }

  // Revoke any previous pending invitations to the same email for this patient
  await Invitation.updateMany(
    {
      patient: patient._id,
      recipientEmail: cleanEmail,
      status: 'PENDING',
    },
    {
      $set: { status: 'REVOKED' },
    }
  );

  // Generate cryptographic token
  const { rawToken, tokenHash } = Invitation.generateToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7-day expiry

  const invitation = await Invitation.create({
    tokenHash,
    relationshipType: 'FAMILY',
    patient: patient._id,
    inviterUser: req.user._id,
    recipientEmail: cleanEmail,
    relationshipLabel: relationshipLabel.trim(),
    expiresAt,
    status: 'PENDING',
  });

  const clientBaseUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const inviteUrl = `${clientBaseUrl}/invite/family/${rawToken}`;

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        invitation: {
          _id: invitation._id,
          recipientEmail: invitation.recipientEmail,
          relationshipLabel: invitation.relationshipLabel,
          status: invitation.status,
          expiresAt: invitation.expiresAt,
          createdAt: invitation.createdAt,
        },
        token: rawToken,
        inviteUrl,
      },
      'Family invitation created successfully.'
    )
  );
});

/**
 * Validate Family Invitation token (Public endpoint)
 * GET /api/invitations/family/:token
 * Strictly returns minimal non-PHI identity details
 */
export const validateFamilyInvite = asyncHandler(async (req, res) => {
  const { token } = req.params;
  if (!token) {
    throw new ApiError(400, 'Invitation token is required.');
  }

  const tokenHash = Invitation.hashToken(token);
  const invitation = await Invitation.findOne({ tokenHash })
    .populate('inviterUser', 'name')
    .lean();

  if (!invitation || invitation.relationshipType !== 'FAMILY') {
    return res.status(404).json({
      success: false,
      valid: false,
      reason: 'NOT_FOUND',
      message: 'Invitation not found or invalid.',
    });
  }

  if (invitation.status === 'CONSUMED') {
    return res.status(400).json({
      success: false,
      valid: false,
      reason: 'ALREADY_CONSUMED',
      message: 'This invitation has already been redeemed.',
    });
  }

  if (invitation.status === 'REVOKED') {
    return res.status(400).json({
      success: false,
      valid: false,
      reason: 'REVOKED',
      message: 'This invitation has been revoked by the patient.',
    });
  }

  if (new Date(invitation.expiresAt) < new Date() || invitation.status === 'EXPIRED') {
    return res.status(400).json({
      success: false,
      valid: false,
      reason: 'EXPIRED',
      message: 'This invitation has expired.',
    });
  }

  // Return strictly minimal non-PHI details
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        valid: true,
        invitation: {
          recipientEmail: invitation.recipientEmail,
          relationshipLabel: invitation.relationshipLabel,
          inviterName: invitation.inviterUser?.name || 'Your family member',
          expiresAt: invitation.expiresAt,
        },
      },
      'Invitation token is valid.'
    )
  );
});

/**
 * Redeem Family Invitation (Public or Authenticated)
 * POST /api/invitations/family/:token/redeem
 * MANDATORY: Executes invitation-consume + Family User creation +
 * PatientRelationship creation + legacy linkedFamilyMembers synchronization
 * as one atomic MongoDB transaction. If any step fails, entire operation rolls back.
 */
export const redeemFamilyInvite = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { name, password, phone } = req.body;

  if (!token) {
    throw new ApiError(400, 'Invitation token is required.');
  }

  if (!name || !password) {
    throw new ApiError(400, 'Name and password are required to activate your Family account.');
  }

  const tokenHash = Invitation.hashToken(token);

  // MongoDB Multi-Document Transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  let createdUser;
  let createdRelationship;

  try {
    // 1. Atomic claim: find and update status to CONSUMED in session
    const invitation = await Invitation.findOneAndUpdate(
      {
        tokenHash,
        status: 'PENDING',
        expiresAt: { $gt: new Date() },
      },
      {
        $set: {
          status: 'CONSUMED',
          consumedAt: new Date(),
        },
      },
      { session, new: true }
    );

    if (!invitation) {
      // Investigate why claim failed
      const existing = await Invitation.findOne({ tokenHash }).session(session);
      if (!existing) {
        throw new ApiError(404, 'Invitation not found or invalid.');
      }
      if (existing.status === 'CONSUMED') {
        throw new ApiError(400, 'This invitation has already been redeemed.');
      }
      if (existing.status === 'REVOKED') {
        throw new ApiError(400, 'This invitation has been revoked by the patient.');
      }
      if (existing.expiresAt <= new Date()) {
        throw new ApiError(400, 'This invitation has expired.');
      }
      throw new ApiError(400, 'Invitation cannot be redeemed.');
    }

    const targetEmail = invitation.recipientEmail.toLowerCase();

    // Check if user already exists
    const existingUser = await User.findOne({ email: targetEmail }).session(session);
    if (existingUser) {
      throw new ApiError(
        400,
        `An account with email ${targetEmail} already exists. Please log in or contact support.`
      );
    }

    // 2. Create Family User within session
    const [newUser] = await User.create(
      [
        {
          name: name.trim(),
          email: targetEmail,
          passwordHash: password, // userSchema pre-save will hash this
          role: 'Family',
          phone: phone?.trim(),
        },
      ],
      { session }
    );
    createdUser = newUser;

    // 3. Create PatientRelationship within session
    const [relationship] = await PatientRelationship.create(
      [
        {
          patient: invitation.patient,
          relatedUser: createdUser._id,
          relationshipType: 'FAMILY',
          status: 'ACTIVE',
          initiatedBy: 'PATIENT',
          relationshipLabel: invitation.relationshipLabel || 'Family Member',
          activatedAt: new Date(),
        },
      ],
      { session }
    );
    createdRelationship = relationship;

    // Link claimedBy to invitation
    invitation.claimedBy = createdUser._id;
    await invitation.save({ session });

    // 4. Synchronize legacy linkedFamilyMembers on Patient document within session
    await Patient.findByIdAndUpdate(
      invitation.patient,
      {
        $addToSet: { linkedFamilyMembers: createdUser._id },
      },
      { session }
    );

    // Commit transaction atomically
    await session.commitTransaction();
  } catch (error) {
    // Abort transaction and roll back all mutations
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }

  // Issue authentication tokens for new family user
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(createdUser._id);
  const safeUser = await User.findById(createdUser._id);

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        user: safeUser,
        relationship: createdRelationship,
        accessToken,
        refreshToken,
      },
      'Family account created and relationship activated successfully.'
    )
  );
});

/**
 * List all invitations issued by the authenticated patient
 * GET /api/invitations/family
 */
export const getPatientFamilyInvitations = asyncHandler(async (req, res) => {
  const patient = await Patient.findOne({ user: req.user._id });
  if (!patient) {
    throw new ApiError(404, 'Patient profile not found.');
  }

  const invitations = await Invitation.find({
    patient: patient._id,
    relationshipType: 'FAMILY',
  })
    .sort({ createdAt: -1 })
    .lean();

  return res.status(200).json(
    new ApiResponse(
      200,
      { invitations },
      'Invitations retrieved successfully.'
    )
  );
});

/**
 * Revoke a pending invitation
 * PATCH /api/invitations/family/:id/revoke
 */
export const revokeFamilyInvite = asyncHandler(async (req, res) => {
  const patient = await Patient.findOne({ user: req.user._id });
  if (!patient) {
    throw new ApiError(404, 'Patient profile not found.');
  }

  const invitation = await Invitation.findOne({
    _id: req.params.id,
    patient: patient._id,
    status: 'PENDING',
  });

  if (!invitation) {
    throw new ApiError(404, 'Pending invitation not found or already processed.');
  }

  invitation.status = 'REVOKED';
  await invitation.save();

  return res.status(200).json(
    new ApiResponse(200, { invitation }, 'Invitation revoked successfully.')
  );
});
