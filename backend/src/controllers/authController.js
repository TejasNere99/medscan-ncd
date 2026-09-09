import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from '../models/User.js';
import { Patient } from '../models/Patient.js';
import { Doctor } from '../models/Doctor.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncWrapper.js';
import { sendEmail } from '../config/email.js';

const generateAccessAndRefreshTokens = async (userId) => {
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

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, role = 'Patient', phone, village = 'Green Valley' } = req.body;

  if (!name || !email || !password) {
    throw new ApiError(400, 'Name, email, and password are required fields.');
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(400, 'A user account with this email already exists.');
  }

  const user = await User.create({
    name,
    email,
    passwordHash: password,
    role,
    phone,
    village,
  });

  // Automatically create linked Patient or Doctor document based on role
  if (role === 'Patient') {
    await Patient.create({
      user: user._id,
      village: user.village,
    });
  } else if (role === 'Doctor') {
    await Doctor.create({
      user: user._id,
    });
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

  const createdUser = await User.findById(user._id);

  return res.status(201).json(
    new ApiResponse(
      201,
      { user: createdUser, accessToken, refreshToken },
      'User registered successfully'
    )
  );
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, 'Please provide both email and password.');
  }

  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user) {
    throw new ApiError(401, 'Invalid email or password credentials.');
  }

  const isPasswordValid = await user.matchPassword(password);
  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid email or password credentials.');
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

  // Fetch patientId or doctorId if exists
  let extraInfo = {};
  if (user.role === 'Patient') {
    const patientDoc = await Patient.findOne({ user: user._id });
    if (patientDoc) extraInfo.patientId = patientDoc._id;
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

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    throw new ApiError(400, 'Please enter your registered email address.');
  }

  const user = await User.findOne({ email });
  if (!user) {
    // Return success to avoid email enumeration
    return res
      .status(200)
      .json(new ApiResponse(200, {}, 'If that email is registered, a password reset link has been sent.'));
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

  user.resetPasswordToken = resetTokenHash;
  user.resetPasswordExpire = Date.now() + 30 * 60 * 1000; // 30 mins
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;

  const emailResult = await sendEmail({
    to: user.email,
    subject: 'Password Reset Request — Smart Healthcare Platform',
    text: `You requested a password reset. Please click on the following link: ${resetUrl}`,
    html: `<div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>Password Reset Request</h2>
      <p>Hello ${user.name},</p>
      <p>Click the link below to set a new password for your account. This link will expire in 30 minutes.</p>
      <a href="${resetUrl}" style="display: inline-block; background: #06b6d4; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
      <p style="margin-top: 15px; font-size: 12px; color: #888;">If you did not request this, please ignore this email.</p>
    </div>`,
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      { resetToken: process.env.NODE_ENV !== 'production' ? resetToken : undefined },
      'If that email is registered, a password reset link has been sent.'
    )
  );
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    throw new ApiError(400, 'Password must be at least 6 characters long.');
  }

  const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    resetPasswordToken: resetTokenHash,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    throw new ApiError(400, 'Invalid or expired password reset token.');
  }

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
