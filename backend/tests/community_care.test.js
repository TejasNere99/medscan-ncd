import request from 'supertest';
import jwt from 'jsonwebtoken';
import { jest } from '@jest/globals';
import { connectToIsolatedTestDatabase } from './helpers/isolatedDatabase.js';
import { User } from '../src/models/User.js';
import { Patient } from '../src/models/Patient.js';
import { FollowUp } from '../src/models/FollowUp.js';
import { Referral } from '../src/models/Referral.js';

const tokenFor = (user) => jwt.sign({ _id: user._id, role: user.role, email: user.email }, process.env.JWT_ACCESS_SECRET, { expiresIn: '1h' });

describe('CHO community care workflows', () => {
  jest.setTimeout(30000);
  let app;
  let cho;
  let inVillage;
  let outOfVillage;
  let choToken;
  let otherChoToken;

  beforeAll(async () => {
    await connectToIsolatedTestDatabase();
    ({ default: app } = await import('../src/server.js'));
    cho = await User.create({ name: 'Synthetic CHO', email: 'community-care-cho@medscan-test.invalid', passwordHash: 'SyntheticTest123!', role: 'CHO', isEmailVerified: true, isVerified: true, village: 'Test Village' });
    const otherCho = await User.create({ name: 'Synthetic Other CHO', email: 'community-care-other-cho@medscan-test.invalid', passwordHash: 'SyntheticTest123!', role: 'CHO', isEmailVerified: true, isVerified: true, village: 'Elsewhere' });
    const userA = await User.create({ name: 'Synthetic Village Patient', email: 'community-care-patient@medscan-test.invalid', passwordHash: 'SyntheticTest123!', role: 'Patient', isEmailVerified: true, isVerified: true, village: 'Test Village' });
    const userB = await User.create({ name: 'Synthetic Outside Patient', email: 'community-care-outside@medscan-test.invalid', passwordHash: 'SyntheticTest123!', role: 'Patient', isEmailVerified: true, isVerified: true, village: 'Elsewhere' });
    inVillage = await Patient.create({ user: userA._id, village: 'Test Village', age: 50 });
    outOfVillage = await Patient.create({ user: userB._id, village: 'Elsewhere', age: 60 });
    choToken = tokenFor(cho);
    otherChoToken = tokenFor(otherCho);
  });

  test('CHO can schedule, complete and audit a follow-up in their village', async () => {
    const invalid = await request(app).post('/api/community-care/follow-ups').set('Authorization', `Bearer ${choToken}`).send({ patientId: inVillage._id, dueAt: 'not-a-date', reason: '' });
    expect(invalid.status).toBe(400);
    const created = await request(app).post('/api/community-care/follow-ups').set('Authorization', `Bearer ${choToken}`).send({ patientId: inVillage._id, dueAt: new Date(Date.now() + 86400000).toISOString(), reason: 'Synthetic test follow-up', note: 'Initial note' });
    expect(created.status).toBe(201);
    expect(created.body.data.status).toBe('SCHEDULED');
    const rescheduled = await request(app).patch(`/api/community-care/follow-ups/${created.body.data._id}`).set('Authorization', `Bearer ${choToken}`).send({ dueAt: new Date(Date.now() + 2 * 86400000).toISOString(), note: 'Synthetic reschedule' });
    expect(rescheduled.status).toBe(200);
    const completed = await request(app).patch(`/api/community-care/follow-ups/${created.body.data._id}`).set('Authorization', `Bearer ${choToken}`).send({ status: 'COMPLETED', outcome: 'Synthetic test completed' });
    expect(completed.status).toBe(200);
    expect(completed.body.data.history).toHaveLength(3);
    expect((await FollowUp.findById(created.body.data._id)).status).toBe('COMPLETED');
  });

  test('CHO referral transitions are persisted and terminal state cannot be overwritten', async () => {
    const created = await request(app).post('/api/community-care/referrals').set('Authorization', `Bearer ${choToken}`).send({ patientId: inVillage._id, reason: 'Synthetic test referral', destinationFacility: 'Synthetic clinic' });
    expect(created.status).toBe(201);
    expect(created.body.data.status).toBe('PENDING');
    const accepted = await request(app).patch(`/api/community-care/referrals/${created.body.data._id}`).set('Authorization', `Bearer ${choToken}`).send({ status: 'ACCEPTED' });
    expect(accepted.status).toBe(200);
    const done = await request(app).patch(`/api/community-care/referrals/${created.body.data._id}`).set('Authorization', `Bearer ${choToken}`).send({ status: 'COMPLETED', outcome: 'Synthetic completion' });
    expect(done.status).toBe(200);
    const invalid = await request(app).patch(`/api/community-care/referrals/${created.body.data._id}`).set('Authorization', `Bearer ${choToken}`).send({ status: 'PENDING' });
    expect(invalid.status).toBe(409);
    expect((await Referral.findById(created.body.data._id)).history).toHaveLength(3);
  });

  test('CHO cannot use patient IDs to cross village boundaries or access another CHO catchment', async () => {
    const outsidePatient = await request(app).get(`/api/patients/${outOfVillage._id}`).set('Authorization', `Bearer ${choToken}`);
    expect(outsidePatient.status).toBe(403);
    const createOutside = await request(app).post('/api/community-care/follow-ups').set('Authorization', `Bearer ${choToken}`).send({ patientId: outOfVillage._id, dueAt: new Date(Date.now() + 86400000).toISOString(), reason: 'Should be forbidden' });
    expect(createOutside.status).toBe(403);
    const list = await request(app).get('/api/patients').set('Authorization', `Bearer ${choToken}`).query({ village: 'Elsewhere' });
    expect(list.status).toBe(200);
    expect(list.body.data.patients).toHaveLength(0);
    const outsideFollowup = await request(app).get('/api/community-care/follow-ups').set('Authorization', `Bearer ${otherChoToken}`).query({ patientId: inVillage._id.toString() });
    expect(outsideFollowup.status).toBe(403);
  });

  test('CHO analytics only includes their community and marks eligible population unknown', async () => {
    const response = await request(app).get('/api/analytics/population').set('Authorization', `Bearer ${choToken}`);
    expect(response.status).toBe(200);
    expect(response.body.data.totalPatients).toBe(1);
    expect(response.body.data.eligiblePopulation).toBeNull();
    expect(response.body.data.screeningDenominator).toMatch(/registered patients/i);
  });
});
