import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncWrapper.js';

export const verifyJWT = asyncHandler(async (req, res, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      throw new ApiError(401, 'Unauthorized request. Authentication token missing.');
    }

    const decodedToken = jwt.verify(
      token,
      process.env.JWT_ACCESS_SECRET || 'your_super_secret_access_key_12345!'
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, 'Invalid Access Token. User no longer exists.');
    }

    const CANONICAL_ROLES = ['Patient', 'Doctor', 'CHO', 'Admin'];
    if (!CANONICAL_ROLES.includes(user.role)) {
      throw new ApiError(403, `Access forbidden. Account role '${user.role}' is deprecated and no longer supported.`);
    }

    // Enforce email verification on all protected endpoints
    if (user.isEmailVerified === false && user.isVerified === false) {
      throw new ApiError(403, 'Email verification required. Please verify your email address to access your account.');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(401, error?.message || 'Invalid or expired access token.');
  }
});
