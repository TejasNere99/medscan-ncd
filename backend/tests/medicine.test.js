import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/server.js';

describe('Medicine & IoT Telemetry API Tests', () => {
  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ai-smart-healthcare-test';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('POST /api/iot/medicine-status - Should record telemetry event from ESP32', async () => {
    const res = await request(app).post('/api/iot/medicine-status').send({
      deviceId: 'ESP32_TEST_001',
      status: 'Taken',
      timestamp: new Date().toISOString(),
    });

    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.deviceId).toEqual('ESP32_TEST_001');
  });
});
