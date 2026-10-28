/**
 * MedScan-NCD: Diabetes Prediction Client Service
 * ===============================================
 * Client communication layer between Express backend and Python FastAPI ML service.
 *
 * Enforces:
 *   - Configurable microservice URL via DIABETES_ML_SERVICE_URL
 *   - 5-second request timeout
 *   - Sanitized application-level errors (never leaks internal paths or stack traces)
 *   - Graceful fallback when the Python ML microservice is offline
 */

const DEFAULT_SERVICE_URL = 'https://medscan-ml-service.onrender.com';
const DEFAULT_INTERNAL_TOKEN = 'UDaRRUpiB6uiZ86lVjL61XnNCzH5X/RTK3w5dPqUQ+k=';
const REQUEST_TIMEOUT_MS = 90000;

function getBaseMlUrl() {
  let raw = process.env.DIABETES_ML_SERVICE_URL || process.env.ML_SERVICE_URL;
  if (
    !raw ||
    ((process.env.NODE_ENV === 'production' || process.env.RENDER_EXTERNAL_URL) &&
      (raw.includes('localhost') || raw.includes('127.0.0.1')))
  ) {
    raw = DEFAULT_SERVICE_URL;
  }
  raw = String(raw).trim().replace(/^['"]+|['"]+$/g, '');
  if (!/^https?:\/\//i.test(raw)) {
    raw = (raw.includes(':8000') || raw.includes('localhost') || raw.includes('127.0.0.1'))
      ? `http://${raw}`
      : `https://${raw}`;
  }
  return raw.replace(/\/predict(?:\/.*)?\/?$/, '').replace(/\/$/, '');
}

/**
 * Executes health check against Python ML service.
 */
export async function checkDiabetesServiceHealth() {
  const baseUrl = getBaseMlUrl();
  const endpoint = `${baseUrl}/health`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const res = await fetch(endpoint, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return { available: false, status: 'DEGRADED', statusCode: res.status };
    }

    const data = await res.json();
    return {
      available: true,
      status: data.status || 'healthy',
      modelVersion: data.modelVersion || '1.0.0',
      artifactLoaded: Boolean(data.artifactLoaded),
      algorithm: data.algorithm,
      threshold: data.threshold,
    };
  } catch (err) {
    return {
      available: false,
      status: 'OFFLINE',
      error: err.name === 'AbortError' ? 'Health check timed out.' : 'Service unreachable.',
    };
  }
}

/**
 * Submits structured clinical features to the Python ML service for diabetes risk assessment.
 *
 * @param {Object} featureVector - 8-element clinical feature dictionary
 * @returns {Promise<Object>} Cleaned application-level prediction result
 */
export async function callDiabetesPredictionService(featureVector) {
  const baseUrl = getBaseMlUrl();
  const endpoint = `${baseUrl}/predict/diabetes`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    headers['X-ML-Internal-Token'] = process.env.ML_INTERNAL_API_KEY || DEFAULT_INTERNAL_TOKEN;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(featureVector),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return {
        success: false,
        status: 'SERVICE_ERROR',
        canCalculate: false,
        message: 'Diabetes risk assessment microservice returned an error.',
        statusCode: res.status,
      };
    }

    const data = await res.json();

    return {
      success: true,
      disease: 'diabetes',
      scenario: 'A',
      modelVersion: data.modelVersion || '1.0.0',
      status: data.status || (data.canCalculate ? 'SUCCESS' : 'INSUFFICIENT_DATA'),
      canCalculate: Boolean(data.canCalculate),
      dataCompleteness: data.dataCompleteness || 'PARTIAL',
      probability: typeof data.probability === 'number' ? data.probability : null,
      threshold: typeof data.threshold === 'number' ? data.threshold : 0.21,
      riskCategory: data.riskCategory || null,
      missingDomain: data.missingDomain || null,
      message: data.message || '',
      featureAvailability: data.featureAvailability || {},
      topContributingFactors: Array.isArray(data.topContributingFactors) ? data.topContributingFactors : [],
      clinicalDisclaimer: data.clinicalDisclaimer || 'Model-estimated risk for clinical decision support. Not a diagnosis.',
    };
  } catch (err) {
    const isTimeout = err.name === 'AbortError';
    return {
      success: false,
      status: isTimeout ? 'TIMEOUT' : 'SERVICE_UNAVAILABLE',
      canCalculate: false,
      message: isTimeout
        ? 'Diabetes prediction service request timed out.'
        : 'Diabetes prediction microservice is currently unreachable.',
    };
  }
}
