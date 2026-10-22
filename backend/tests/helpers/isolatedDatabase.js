import mongoose from 'mongoose';

const TEST_DATABASE_PREFIX = 'medscan_ncd_test_';
const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);

export async function connectToIsolatedTestDatabase() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/medscan_ncd_test_manual';
  let parsed;

  try {
    parsed = new URL(mongoUri);
  } catch {
    throw new Error('Backend integration tests require a valid local test MongoDB URI.');
  }

  const dbName = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  if (
    !['mongodb:', 'mongodb+srv:'].includes(parsed.protocol) ||
    !LOCAL_HOSTS.has(parsed.hostname.toLowerCase()) ||
    !dbName.startsWith(TEST_DATABASE_PREFIX)
  ) {
    throw new Error(
      `Refusing to run database integration tests outside a loopback MongoDB database named ${TEST_DATABASE_PREFIX}…`,
    );
  }

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(mongoUri);
  } else if (mongoose.connection.readyState === 2) {
    await mongoose.connection.asPromise();
  }

  if (
    mongoose.connection.readyState !== 1 ||
    !LOCAL_HOSTS.has(String(mongoose.connection.host).toLowerCase()) ||
    mongoose.connection.name !== dbName
  ) {
    throw new Error('Refusing to run tests on an already-open non-isolated MongoDB connection.');
  }

  return { dbName };
}
