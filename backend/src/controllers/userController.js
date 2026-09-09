import { User } from '../models/User.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncWrapper.js';

export const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, village, avatar } = req.body;

  const user = await User.findById(req.user._id);
  if (!user) throw new ApiError(404, 'User profile not found.');

  if (name) user.name = name;
  if (phone) user.phone = phone;
  if (village) user.village = village;
  if (avatar) user.avatar = avatar;

  await user.save();

  return res.status(200).json(new ApiResponse(200, user, 'Profile updated successfully.'));
});

export const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select('-passwordHash');
  return res.status(200).json(new ApiResponse(200, users, 'Users retrieved successfully.'));
});

export const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await User.findByIdAndDelete(id);
  return res.status(200).json(new ApiResponse(200, {}, 'User deleted successfully.'));
});
