import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/server.js';
import { User } from '../src/models/User.js';
import { Patient } from '../src/models/Patient.js';
import { _getSentEmails, _clearSentEmails } from '../src/services/emailService.js';

describe('Email Verification & Password Recovery Lifecycle Tests', () => {
  const TEST_EMAIL = 'lifecycle_user@medscan-test.com';
  const TEST_PASSWORD = 'SecurePassword123!';
  const NEW_PASSWORD = 'UpdatedPassword456!';
  let verificationToken = '';
  let resetToken = '';

  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ai-smart-healthcare-test';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }
    await User.deleteMany({ email: TEST_EMAIL });
    _clearSentEmails();
  });

  afterAll(async () => {
    await User.deleteMany({ email: TEST_EMAIL });
    await mongoose.connection.close();
  });

  beforeEach(() => {
    _clearSentEmails();
  });

  // --------------------------------------------------------------------------
  // 1. REGISTRATION & VERIFICATION LIFECYCLE
  // --------------------------------------------------------------------------
  describe('1. Registration and Verification', () => {
    it('creates an unverified user account and dispatches verification email', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Lifecycle Patient',
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        village: 'Alpha Community',
        role: 'Patient',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(TEST_EMAIL);
      expect(res.body.data.user.isEmailVerified).toBe(false);
      // Ensure no tokens issued upon registration
      expect(res.body.data.accessToken).toBeUndefined();
      expect(res.body.data.refreshToken).toBeUndefined();

      // Ensure verification email was captured by emailService
      const sent = _getSentEmails();
      expect(sent.length).toBe(1);
      expect(sent[0].to).toBe(TEST_EMAIL);
      expect(sent[0].subject).toContain('Verify your email');

      verificationToken = res.body.data.verificationToken;
      expect(verificationToken).toBeDefined();

      // Verify in DB that only a token hash is stored, not plaintext
      const dbUser = await User.findOne({ email: TEST_EMAIL }).select('+emailVerificationToken +emailVerificationExpire');
      expect(dbUser).toBeDefined();
      expect(dbUser.isEmailVerified).toBe(false);
      expect(dbUser.emailVerificationToken).toBeDefined();
      expect(dbUser.emailVerificationToken).not.toBe(verificationToken);
      expect(dbUser.emailVerificationExpire.getTime()).toBeGreaterThan(Date.now());
    });

    it('rejects duplicate registration with identical email', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Duplicate Patient',
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        role: 'Patient',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already exists');
    });

    it('blocks unverified user from logging in with 403 EMAIL_NOT_VERIFIED', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.data.code).toBe('EMAIL_NOT_VERIFIED');
      expect(res.body.data.accessToken).toBeUndefined();
    });

    it('rejects verification with malformed or invalid token', async () => {
      const res = await request(app).post('/api/auth/verify-email').send({
        token: 'invalid-nonexistent-token-12345',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid or expired');
    });

    it('resends verification email with new token and invalidates old one', async () => {
      // Fast-forward or trigger resend after cooldown
      const dbUser = await User.findOne({ email: TEST_EMAIL }).select('+emailVerificationExpire');
      // Set expired time in the past to satisfy cooldown in test
      dbUser.emailVerificationExpire = new Date(Date.now() + 28 * 60 * 1000); // 2 mins ago
      await dbUser.save();

      const res = await request(app).post('/api/auth/resend-verification').send({
        email: TEST_EMAIL,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(_getSentEmails().length).toBe(1);

      const newToken = res.body.data.verificationToken;
      expect(newToken).toBeDefined();
      expect(newToken).not.toBe(verificationToken);

      // Verify the old token is now invalid
      const oldVerifyRes = await request(app).post('/api/auth/verify-email').send({
        token: verificationToken,
      });
      expect(oldVerifyRes.status).toBe(400);

      // Update pointer to new token
      verificationToken = newToken;
    });

    it('enforces 60-second cooldown on repeated resend requests', async () => {
      const res = await request(app).post('/api/auth/resend-verification').send({
        email: TEST_EMAIL,
      });

      expect(res.status).toBe(429);
      expect(res.body.message).toContain('wait');
    });

    it('successfully verifies email with the active token', async () => {
      const res = await request(app).post('/api/auth/verify-email').send({
        token: verificationToken,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isEmailVerified).toBe(true);

      const dbUser = await User.findOne({ email: TEST_EMAIL }).select('+emailVerificationToken +emailVerificationExpire');
      expect(dbUser.isEmailVerified).toBe(true);
      expect(dbUser.isVerified).toBe(true);
      expect(dbUser.emailVerificationToken).toBeUndefined();
      expect(dbUser.emailVerificationExpire).toBeUndefined();
    });

    it('rejects reuse of the already-consumed verification token', async () => {
      const res = await request(app).post('/api/auth/verify-email').send({
        token: verificationToken,
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid or expired');
    });

    it('allows normal login once account is verified', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.data.user.email).toBe(TEST_EMAIL);
    });
  });

  // --------------------------------------------------------------------------
  // 2. PASSWORD RECOVERY LIFECYCLE
  // --------------------------------------------------------------------------
  describe('2. Forgot Password and Password Reset', () => {
    it('returns generic response for forgot-password on non-existent email', async () => {
      const res = await request(app).post('/api/auth/forgot-password').send({
        email: 'nobody_exists@medscan-test.com',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(_getSentEmails().length).toBe(0);
    });

    it('dispatches password reset email for registered verified account', async () => {
      const res = await request(app).post('/api/auth/forgot-password').send({
        email: TEST_EMAIL,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const sent = _getSentEmails();
      expect(sent.length).toBe(1);
      expect(sent[0].to).toBe(TEST_EMAIL);
      expect(sent[0].subject).toContain('Password reset');

      resetToken = res.body.data.resetToken;
      expect(resetToken).toBeDefined();

      // Check DB storage is hashed
      const dbUser = await User.findOne({ email: TEST_EMAIL }).select('+resetPasswordToken +resetPasswordExpire');
      expect(dbUser.resetPasswordToken).toBeDefined();
      expect(dbUser.resetPasswordToken).not.toBe(resetToken);
    });

    it('rejects password reset with invalid token', async () => {
      const res = await request(app).post('/api/auth/reset-password').send({
        token: 'fake-invalid-reset-token-999',
        newPassword: NEW_PASSWORD,
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid or expired');
    });

    it('rejects password reset if new password is too short', async () => {
      const res = await request(app).post('/api/auth/reset-password').send({
        token: resetToken,
        newPassword: 'short',
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('at least 8 characters');
    });

    it('successfully resets password with valid token and consumes token', async () => {
      const res = await request(app).post('/api/auth/reset-password').send({
        token: resetToken,
        newPassword: NEW_PASSWORD,
        confirmPassword: NEW_PASSWORD,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // DB check: token cleared
      const dbUser = await User.findOne({ email: TEST_EMAIL }).select('+resetPasswordToken +resetPasswordExpire');
      expect(dbUser.resetPasswordToken).toBeUndefined();
      expect(dbUser.resetPasswordExpire).toBeUndefined();
    });

    it('cannot reuse the consumed password reset token', async () => {
      const res = await request(app).post('/api/auth/reset-password').send({
        token: resetToken,
        newPassword: 'AnotherPassword999!',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('blocks login with old password and accepts new password', async () => {
      // Old password should fail
      const oldRes = await request(app).post('/api/auth/login').send({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });
      expect(oldRes.status).toBe(401);

      // New password should succeed
      const newRes = await request(app).post('/api/auth/login').send({
        email: TEST_EMAIL,
        password: NEW_PASSWORD,
      });
      expect(newRes.status).toBe(200);
      expect(newRes.body.success).toBe(true);
      expect(newRes.body.data.accessToken).toBeDefined();
    });
  });

  // --------------------------------------------------------------------------
  // 3. PROTECTED API ACCESS CONTROL & SECURITY ENFORCEMENT
  // --------------------------------------------------------------------------
  describe('3. Protected API Enforcement for Unverified Users', () => {
    it('blocks unverified user from accessing protected APIs even if possessing a forged/old token', async () => {
      // Create temporary unverified user
      const unverifiedUser = await User.create({
        name: 'Unverified Access Test',
        email: 'unverified_access@medscan-test.com',
        passwordHash: 'Pass12345!',
        role: 'Patient',
        isEmailVerified: false,
        isVerified: false,
      });

      // Sign a token for this unverified user
      const jwt = (await import('jsonwebtoken')).default;
      const unverifiedToken = jwt.sign(
        { _id: unverifiedUser._id, email: unverifiedUser.email, role: unverifiedUser.role },
        process.env.JWT_ACCESS_SECRET || 'your_super_secret_access_key_12345!',
        { expiresIn: '1h' }
      );

      // Attempt protected call to /api/auth/me
      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${unverifiedToken}`);

      expect(meRes.status).toBe(403);
      expect(meRes.body.message).toContain('Email verification required');

      // Clean up
      await User.deleteOne({ _id: unverifiedUser._id });
    });
  });
});
