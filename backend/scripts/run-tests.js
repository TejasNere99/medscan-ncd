import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MongoClient } from 'mongodb';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbName = `medscan_ncd_test_${randomUUID().replaceAll('-', '')}`;
const mongoUri = `mongodb://127.0.0.1:27017/${dbName}`;
const jestEntrypoint = path.join(backendRoot, 'node_modules', 'jest', 'bin', 'jest.js');

const child = spawn(
  process.execPath,
  ['--experimental-vm-modules', jestEntrypoint, '--runInBand', '--forceExit', ...process.argv.slice(2)],
  {
    cwd: backendRoot,
    env: {
      ...process.env,
      NODE_ENV: 'test',
      MONGODB_URI: mongoUri,
      JWT_ACCESS_SECRET: 'medscan-test-only-access-secret',
      JWT_REFRESH_SECRET: 'medscan-test-only-refresh-secret',
      DIABETES_ML_SERVICE_URL: process.env.DIABETES_ML_SERVICE_URL || process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000',
      ML_SERVICE_URL: process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000',
      ML_INTERNAL_API_KEY: process.env.ML_INTERNAL_API_KEY || '',
      RUN_RESEARCH_MODEL_E2E: process.env.RUN_RESEARCH_MODEL_E2E || '',
      LOCAL_STORAGE_FALLBACK: 'true',
      BACKEND_URL: 'http://127.0.0.1:5001',
      CLOUDINARY_CLOUD_NAME: '',
      CLOUDINARY_API_KEY: '',
      CLOUDINARY_API_SECRET: '',
    },
    stdio: 'inherit',
  },
);

let exitCode = 1;
try {
  exitCode = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', (code) => resolve(code ?? 1));
  });
} catch (error) {
  console.error(`[Test runner] Jest could not start: ${error.message}`);
}

const client = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 1500 });
try {
  await client.connect();
  await client.db(dbName).dropDatabase();
  console.log('[Test runner] Removed the temporary isolated test database.');
} catch {
  console.warn('[Test runner] Local MongoDB was unavailable; no remote database was contacted.');
} finally {
  await client.close().catch(() => {});
}

process.exitCode = exitCode;
