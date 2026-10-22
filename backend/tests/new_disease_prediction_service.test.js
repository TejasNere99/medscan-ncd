import http from 'node:http';
import { once } from 'node:events';
import { callNewDiseasePredictionService } from '../src/services/newDiseasePredictionService.js';

const savedEnv = {};

beforeEach(() => {
  savedEnv.key = process.env.ML_INTERNAL_API_KEY;
  savedEnv.url = process.env.DIABETES_ML_SERVICE_URL;
  process.env.ML_INTERNAL_API_KEY = 'synthetic-backend-test-token';
});

afterEach(() => {
  if (savedEnv.key === undefined) delete process.env.ML_INTERNAL_API_KEY;
  else process.env.ML_INTERNAL_API_KEY = savedEnv.key;
  if (savedEnv.url === undefined) delete process.env.DIABETES_ML_SERVICE_URL;
  else process.env.DIABETES_ML_SERVICE_URL = savedEnv.url;
});

describe('Express research model service client', () => {
  test('does not call FastAPI when the internal key is missing', async () => {
    delete process.env.ML_INTERNAL_API_KEY;
    const result = await callNewDiseasePredictionService('hypertension', { age: 50, sex: 1 });
    expect(result.status).toBe('PREDICTION_SERVICE_UNAVAILABLE');
    expect(result.probability).toBeNull();
  });

  test('sends the key only as the internal header and preserves unavailable explanation status', async () => {
    let recordRequest;
    const received = new Promise((resolve) => { recordRequest = resolve; });
    const server = http.createServer((req, res) => {
      const chunks = [];
      req.on('data', (chunk) => chunks.push(chunk));
      req.on('end', () => {
        recordRequest({ method: req.method, url: req.url, token: req.headers['x-ml-internal-token'], body: Buffer.concat(chunks).toString() });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          canCalculate: true,
          probability: 0.4,
          developmentThreshold: 0.33,
          riskCategory: 'POSITIVE_CLASSIFICATION_ESTIMATE',
          explanationStatus: 'unavailable',
          topContributingFactors: [],
        }));
      });
    });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    process.env.DIABETES_ML_SERVICE_URL = `http://127.0.0.1:${server.address().port}`;
    try {
      const result = await callNewDiseasePredictionService('hypertension', { age: 50, sex: 1 });
      const request = await received;
      expect(request.method).toBe('POST');
      expect(request.url).toBe('/predict/hypertension');
      expect(request.token).toBe(process.env.ML_INTERNAL_API_KEY);
      expect(request.body).toBe(JSON.stringify({ features: { age: 50, sex: 1 } }));
      expect(result.explanationStatus).toBe('unavailable');
      expect(JSON.stringify(result)).not.toContain(process.env.ML_INTERNAL_API_KEY);
    } finally {
      server.close();
      await once(server, 'close');
    }
  });

  test('returns a controlled unavailable result when FastAPI refuses the connection', async () => {
    process.env.DIABETES_ML_SERVICE_URL = 'http://127.0.0.1:1';
    const result = await callNewDiseasePredictionService('chronic_kidney_disease', { age: 50, serum_creatinine: 1.1 });
    expect(result.status).toBe('PREDICTION_SERVICE_UNAVAILABLE');
    expect(result.probability).toBeNull();
  });

  test('does not expose an upstream inference error or its response body', async () => {
    const server = http.createServer((_req, res) => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ detail: 'private traceback and synthetic upstream secret' }));
    });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    process.env.DIABETES_ML_SERVICE_URL = `http://127.0.0.1:${server.address().port}`;
    try {
      const result = await callNewDiseasePredictionService('hypertension', { age: 50, sex: 1 });
      expect(result.status).toBe('PREDICTION_SERVICE_UNAVAILABLE');
      expect(result.probability).toBeNull();
      expect(JSON.stringify(result)).not.toContain('private traceback');
      expect(JSON.stringify(result)).not.toContain(process.env.ML_INTERNAL_API_KEY);
    } finally {
      server.close();
      await once(server, 'close');
    }
  });

  test('converts the 15-second abort into a no-probability timeout result', async () => {
    const server = http.createServer(() => {});
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    process.env.DIABETES_ML_SERVICE_URL = `http://127.0.0.1:${server.address().port}`;
    try {
      const result = await callNewDiseasePredictionService('hypertension', { age: 50, sex: 1 });
      expect(result.message).toBe('Disease model request timed out.');
      expect(result.probability).toBeNull();
    } finally {
      server.closeAllConnections?.();
      server.close();
      await once(server, 'close');
    }
  }, 20000);
});
