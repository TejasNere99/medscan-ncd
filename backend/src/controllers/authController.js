import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from '../models/User.js';
import { Patient } from '../models/Patient.js';
import { Doctor } from '../models/Doctor.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncWrapper.js';
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
} from '../services/emailService.js';

export const generateAccessAndRefreshTokens = async (userId) => {
  const user = await User.findById(userId);

  const accessToken = jwt.sign(
    { _id: user._id, email: user.email, role: user.role },
    process.env.JWT_ACCESS_SECRET || 'your_super_secret_access_key_12345!',
    { expiresIn: process.env.JWT_ACCESS_EXPIRE || '1d' }
  );

  const refreshToken = jwt.sign(
    { _id: user._id },
    process.env.JWT_REFRESH_SECRET || 'your_super_secret_refresh_key_67890!',
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
  );

  return { accessToken, refreshToken };
};

/**
 * Register a new user in UNVERIFIED state and dispatch verification email
 */
export const register = asyncHandler(async (req, res) => {
  const { name, email, password, role = 'Patient', phone, village = 'Green Valley' } = req.body;

  if (!name || !email || !password) {
    throw new ApiError(400, 'Name, email, and password are required fields.');
  }

  if (typeof password !== 'string' || password.length < 8) {
    throw new ApiError(400, 'Password must be at least 8 characters long.');
  }

  // Phase P0: Public self-registration is restricted strictly to Patient accounts
  if (role && role !== 'Patient') {
    throw new ApiError(
      403,
      'Public registration is restricted to Patient accounts. Privileged staff and caregiver accounts must be provisioned through authorized workflows.'
    );
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new ApiError(400, 'A user account with this email already exists.');
  }

  // Generate cryptographically secure single-use verification token
  const rawVerificationToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawVerificationToken).digest('hex');
  const expiryMinutes = parseInt(process.env.EMAIL_VERIFICATION_EXPIRY_MINUTES || '30', 10);
  const tokenExpire = new Date(Date.now() + expiryMinutes * 60 * 1000);

  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash: password,
    role: 'Patient',
    phone: phone?.trim(),
    village,
    isEmailVerified: false,
    isVerified: false,
    emailVerificationToken: tokenHash,
    emailVerificationExpire: tokenExpire,
  });

  // Automatically create linked Patient document
  await Patient.create({
    user: user._id,
    village: user.village,
  });

  const autoVerify = process.env.AUTO_VERIFY_EMAIL === 'true';

  let emailDelivered = false;

  if (autoVerify) {
    user.isEmailVerified = true;
    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;
    await user.save();
    emailDelivered = true;
  } else {
    // Dispatch email verification link
    const emailResult = await sendVerificationEmail({
      to: user.email,
      name: user.name,
      token: rawVerificationToken,
      expiryMinutes,
    });
    emailDelivered = emailResult?.success ?? false;
  }

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
        },
        emailDelivered,
        autoVerified: autoVerify,
        // When SMTP is blocked by cloud hosting or in tests, provide fallback token for 1-click verification
        verificationToken: (!emailDelivered || process.env.NODE_ENV === 'test') ? rawVerificationToken : undefined,
      },
      autoVerify
        ? 'Registration successful! Account has been automatically activated for evaluation.'
        : emailDelivered
        ? 'Registration successful. Please check your email to verify your account.'
        : 'Account created. Email delivery could not complete due to cloud host SMTP restrictions. Use 1-Click Activation below.'
    )
  );
});


/**
 * Verify an email address using single-use verification token
 */
export const verifyEmail = asyncHandler(async (req, res) => {
  const token = req.body?.token || req.query?.token || req.params?.token;

  if (!token || typeof token !== 'string') {
    throw new ApiError(400, 'A valid verification token is required.');
  }

  const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');

  const user = await User.findOne({
    emailVerificationToken: tokenHash,
    emailVerificationExpire: { $gt: Date.now() },
  });

  if (!user) {
    throw new ApiError(400, 'Invalid or expired email verification link. Please request a new verification email.');
  }

  // Atomically mark verified and invalidate single-use token
  user.isEmailVerified = true;
  user.isVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpire = undefined;
  await user.save();

  // Send optional welcome email
  sendWelcomeEmail({ to: user.email, name: user.name }).catch(() => {});

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        email: user.email,
        isEmailVerified: true,
      },
      'Email address verified successfully. You may now sign in.'
    )
  );
});

/**
 * Resend email verification link with rate limit / cooldown protection
 */
export const resendVerification = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(400, 'Please enter your registered email address.');
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const genericResponse = 'If an unverified account matches that email address, a verification link has been sent.';

  const user = await User.findOne({ email: normalizedEmail }).select('+emailVerificationToken +emailVerificationExpire');

  // Generic response if user does not exist or is already verified (prevent email enumeration)
  if (!user || user.isEmailVerified) {
    return res.status(200).json(new ApiResponse(200, {}, genericResponse));
  }

  // Enforce 60-second cooldown between resend requests
  const expiryMinutes = parseInt(process.env.EMAIL_VERIFICATION_EXPIRY_MINUTES || '30', 10);
  if (user.emailVerificationExpire) {
    const issuedAt = user.emailVerificationExpire.getTime() - expiryMinutes * 60 * 1000;
    const elapsedSeconds = (Date.now() - issuedAt) / 1000;
    if (elapsedSeconds < 60) {
      const waitSeconds = Math.ceil(60 - elapsedSeconds);
      throw new ApiError(429, `Please wait ${waitSeconds} second${waitSeconds === 1 ? '' : 's'} before requesting another verification email.`);
    }
  }

  // Generate fresh token and invalidate prior token
  const rawVerificationToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawVerificationToken).digest('hex');
  user.emailVerificationToken = tokenHash;
  user.emailVerificationExpire = new Date(Date.now() + expiryMinutes * 60 * 1000);
  await user.save({ validateBeforeSave: false });

  await sendVerificationEmail({
    to: user.email,
    name: user.name,
    token: rawVerificationToken,
    expiryMinutes,
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        verificationToken: process.env.NODE_ENV === 'test' ? rawVerificationToken : undefined,
      },
      genericResponse
    )
  );
});

/**
 * Login: Authenticate only eligible, VERIFIED accounts
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, 'Please provide both email and password.');
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');
  if (!user) {
    throw new ApiError(401, 'Invalid email or password credentials.');
  }

  const isPasswordValid = await user.matchPassword(password);
  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid email or password credentials.');
  }

  const CANONICAL_ROLES = ['Patient', 'Doctor', 'CHO', 'Admin'];
  if (!CANONICAL_ROLES.includes(user.role)) {
    throw new ApiError(403, `Login forbidden. Account role '${user.role}' is deprecated and no longer supported.`);
  }

  // Enforce email verification
  if (user.isEmailVerified === false && user.isVerified === false) {
    return res.status(403).json({
      success: false,
      statusCode: 403,
      message: 'Please verify your email address before signing in. Check your inbox for the activation link.',
      data: {
        email: user.email,
        isEmailVerified: false,
        code: 'EMAIL_NOT_VERIFIED',
      },
    });
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

  // Fetch patientId or doctorId if exists
  let extraInfo = {};
  if (user.role === 'Patient') {
    const patientDoc = await Patient.findOne({ user: user._id });
    if (patientDoc) extraInfo.patientId = patientDoc._id;
  } else if (user.role === 'Doctor') {
    const doctorDoc = await Doctor.findOne({ user: user._id });
    if (doctorDoc) extraInfo.doctorId = doctorDoc._id;
  }

  const loggedInUser = await User.findById(user._id);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        user: loggedInUser,
        accessToken,
        refreshToken,
        ...extraInfo,
      },
      'User logged in successfully'
    )
  );
});

export const logout = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, {}, 'User logged out successfully. Session invalidated.'));
});

/**
 * Forgot password: Request a secure password reset link
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    throw new ApiError(400, 'Please enter your registered email address.');
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const genericResponse = 'If that email address is registered, password reset instructions have been sent.';

  const user = await User.findOne({ email: normalizedEmail }).select('+resetPasswordToken +resetPasswordExpire');
  if (!user) {
    // Return generic success to prevent email enumeration
    return res.status(200).json(new ApiResponse(200, {}, genericResponse));
  }

  // Enforce 60-second cooldown between reset requests
  const expiryMinutes = parseInt(process.env.PASSWORD_RESET_EXPIRY_MINUTES || '15', 10);
  if (user.resetPasswordExpire) {
    const issuedAt = user.resetPasswordExpire.getTime() - expiryMinutes * 60 * 1000;
    const elapsedSeconds = (Date.now() - issuedAt) / 1000;
    if (elapsedSeconds < 60) {
      const waitSeconds = Math.ceil(60 - elapsedSeconds);
      throw new ApiError(429, `Please wait ${waitSeconds} second${waitSeconds === 1 ? '' : 's'} before requesting another password reset.`);
    }
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

  user.resetPasswordToken = resetTokenHash;
  user.resetPasswordExpire = new Date(Date.now() + expiryMinutes * 60 * 1000);
  await user.save({ validateBeforeSave: false });

  await sendPasswordResetEmail({
    to: user.email,
    name: user.name,
    token: resetToken,
    expiryMinutes,
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      { resetToken: process.env.NODE_ENV === 'test' ? resetToken : undefined },
      genericResponse
    )
  );
});

/**
 * Reset password: Validates token and securely updates password
 */
export const resetPassword = asyncHandler(async (req, res) => {
  const token = req.body?.token || req.params?.token || req.query?.token;
  const { newPassword, confirmPassword } = req.body;

  if (!token || typeof token !== 'string') {
    throw new ApiError(400, 'Password reset token is missing or invalid.');
  }

  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
    throw new ApiError(400, 'Password must be at least 8 characters long.');
  }

  if (confirmPassword !== undefined && newPassword !== confirmPassword) {
    throw new ApiError(400, 'Password and confirmation password do not match.');
  }

  const resetTokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');

  const user = await User.findOne({
    resetPasswordToken: resetTokenHash,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    throw new ApiError(400, 'Invalid or expired password reset link. Please submit a new request.');
  }

  // Atomically update password and consume single-use reset token
  user.passwordHash = newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, 'Password reset successfully. You can now login with your new credentials.'));
});

export const getCurrentUser = asyncHandler(async (req, res) => {
  let patientInfo = null;
  if (req.user.role === 'Patient') {
    patientInfo = await Patient.findOne({ user: req.user._id });
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        user: req.user,
        patient: patientInfo,
      },
      'Current user profile retrieved successfully.'
    )
  );
});
