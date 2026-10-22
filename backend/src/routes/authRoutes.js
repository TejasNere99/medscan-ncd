import express from 'express';
import {
  register,
  verifyEmail,
  resendVerification,
  login,
  logout,
  forgotPassword,
  resetPassword,
  getCurrentUser,
} from '../controllers/authController.js';
import { verifyJWT } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';

const router = express.Router();

// Registration & Verification
router.post('/register', register);
router.post('/verify-email', verifyEmail);
router.post('/verify-email/:token', verifyEmail);
router.get('/verify-email/:token', verifyEmail);
router.post('/resend-verification', authLimiter, resendVerification);

// Authentication & Session
router.post('/login', authLimiter, login);
router.post('/logout', verifyJWT, logout);
router.get('/me', verifyJWT, getCurrentUser);

// Password Recovery
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);
router.post('/reset-password/:token', authLimiter, resetPassword);

export default router;
