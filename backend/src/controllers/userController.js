import { User } from '../models/User.js';
import { Patient } from '../models/Patient.js';
import { Doctor } from '../models/Doctor.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncWrapper.js';

export const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, village, avatar } = req.body;

  const user = await User.findById(req.user._id);
  if (!user) throw new ApiError(404, 'User profile not found.');

  if (name) user.name = name;
  if (phone) user.phone = phone;
  // Make village immutable to ordinary staff users — only Admin can assign or alter administrative catchment
  if (village && req.user.role === 'Admin') user.village = village;
  if (avatar) user.avatar = avatar;

  await user.save();

  return res.status(200).json(new ApiResponse(200, user, 'Profile updated successfully.'));
});

export const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select('-passwordHash');
  return res.status(200).json(new ApiResponse(200, users, 'Users retrieved successfully.'));
});

export const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role = 'Patient', phone, village } = req.body;
  const allowedRoles = ['Patient', 'Doctor', 'CHO', 'Admin'];

  if (!name || !email || !password) {
    throw new ApiError(400, 'Name, email, and password are required fields.');
  }
  if (typeof password !== 'string' || password.length < 8) {
    throw new ApiError(400, 'Password must be at least 8 characters long.');
  }
  if (!allowedRoles.includes(role)) {
    throw new ApiError(400, 'Role must be Patient, Doctor, CHO, or Admin.');
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  if (await User.findOne({ email: normalizedEmail })) {
    throw new ApiError(400, 'A user account with this email already exists.');
  }

  const user = await User.create({
    name,
    email: normalizedEmail,
    passwordHash: password,
    role,
    phone,
    village,
    isEmailVerified: true,
    isVerified: true,
  });

  try {
    if (role === 'Patient') {
      await Patient.create({ user: user._id, village: village || user.village });
    } else if (role === 'Doctor') {
      await Doctor.create({ user: user._id });
    }
  } catch (error) {
    await User.deleteOne({ _id: user._id });
    throw error;
  }

  return res.status(201).json(new ApiResponse(201, user, 'User created successfully.'));
});

export const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await User.findByIdAndDelete(id);
  return res.status(200).json(new ApiResponse(200, {}, 'User deleted successfully.'));
});
