import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/server.js';
import { User } from '../src/models/User.js';

describe('Auth API Integration Tests', () => {
  let verificationToken;

  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ai-smart-healthcare-test';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }
  });

  afterAll(async () => {
    await User.deleteMany({ email: 'testuser@example.com' });
    await mongoose.connection.close();
  });

  it('POST /api/auth/register - Should register a new user in unverified state', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test Patient',
      email: 'testuser@example.com',
      password: 'Password123!',
      role: 'Patient',
    });

    expect(res.statusCode).toEqual(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toEqual('testuser@example.com');
    expect(res.body.data.user.isEmailVerified).toBe(false);
    expect(res.body.data.accessToken).toBeUndefined();

    // In test environment, verification token is returned for automated test assertions
    verificationToken = res.body.data.verificationToken;
    expect(verificationToken).toBeDefined();
  });

  it('POST /api/auth/login - Should reject unverified user with 403 EMAIL_NOT_VERIFIED', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'testuser@example.com',
      password: 'Password123!',
    });

    expect(res.statusCode).toEqual(403);
    expect(res.body.success).toBe(false);
    expect(res.body.data.code).toBe('EMAIL_NOT_VERIFIED');
  });

  it('POST /api/auth/verify-email - Should verify email with valid token', async () => {
    const res = await request(app).post('/api/auth/verify-email').send({
      token: verificationToken,
    });

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isEmailVerified).toBe(true);
  });

  it('POST /api/auth/login - Should authenticate valid credentials after verification and return access token', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'testuser@example.com',
      password: 'Password123!',
    });

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
  });

  it('POST /api/auth/login - Should reject invalid password with 401 Unauthorized', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'testuser@example.com',
      password: 'WrongPassword123!',
    });

    expect(res.statusCode).toEqual(401);
    expect(res.body.success).toBe(false);
  });
});
