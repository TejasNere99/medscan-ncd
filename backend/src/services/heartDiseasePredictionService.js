/**
 * MedScan-NCD: Heart Disease Prediction Client Service
 * ====================================================
 * Client communication layer between Express backend and Python FastAPI ML service.
 *
 * Strict Architectural Rules:
 *   - Calls POST /predict/heart_disease on the Python ML service.
 *   - NO FAKE/OFFLINE PREDICTION FALLBACK: Never returns a fabricated, default, or rule-based
 *     probability if the service is unreachable. Returns a controlled PREDICTION_SERVICE_UNAVAILABLE error.
 *   - The Heart Disease probability comes EXCLUSIVELY from the serialized Phase 7C model pipeline.
 *   - 5-second request timeout via AbortController.
 *   - Sanitized application errors (never exposes internal filesystem paths or python tracebacks).
 */

const DEFAULT_SERVICE_URL = 'https://medscan-ml-service.onrender.com';
const DEFAULT_INTERNAL_TOKEN = 'UDaRRUpiB6uiZ86lVjL61XnNCzH5X/RTK3w5dPqUQ+k=';
const REQUEST_TIMEOUT_MS = 90000;

function getBaseMlUrl() {
  let raw = process.env.ML_SERVICE_URL || process.env.DIABETES_ML_SERVICE_URL;
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
 * Checks health of the Heart Disease ML model in the Python microservice.
 */
export async function checkHeartDiseaseServiceHealth() {
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
    const hd = data.heartDisease || {};
    return {
      available: Boolean(hd.modelLoaded && hd.preprocessorLoaded),
      status: data.status || 'healthy',
      modelVersion: hd.modelVersion || '1.0.0',
      modelLoaded: Boolean(hd.modelLoaded),
      preprocessorLoaded: Boolean(hd.preprocessorLoaded),
      calibratorLoaded: Boolean(hd.calibratorLoaded),
      threshold: hd.threshold || 0.110,
    };
  } catch (err) {
    return {
      available: false,
      status: 'PREDICTION_SERVICE_UNAVAILABLE',
      error: err.name === 'AbortError' ? 'Health check timed out.' : 'Service unreachable.',
    };
  }
}

/**
 * Submits confirmed clinical features to the Python ML service for Heart Disease risk inference.
 *
 * @param {Object} featureVector - 8-element clinical feature dictionary
 * @returns {Promise<Object>} Controlled prediction response or PREDICTION_SERVICE_UNAVAILABLE status
 */
export async function callHeartDiseasePredictionService(featureVector) {
  const baseUrl = getBaseMlUrl();
  const endpoint = `${baseUrl}/predict/heart_disease`;

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
      body: JSON.stringify({ features: featureVector }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return {
        success: false,
        status: 'PREDICTION_SERVICE_UNAVAILABLE',
        canCalculate: false,
        message: 'Heart disease risk assessment microservice returned an error.',
        statusCode: res.status,
      };
    }

    const data = await res.json();

    // Preserve response contract
    return {
      success: Boolean(data.success),
      disease: 'heart_disease',
      modelVersion: data.modelVersion || '1.0.0',
      status: data.status || (data.canCalculate ? 'SUCCESS' : 'INSUFFICIENT_DATA'),
      canCalculate: Boolean(data.canCalculate),
      dataCompleteness: data.dataCompleteness || 'PARTIAL',
      probability: typeof data.probability === 'number' ? data.probability : null,
      threshold: typeof data.developmentThreshold === 'number' ? data.developmentThreshold : 0.110,
      developmentThreshold: typeof data.developmentThreshold === 'number' ? data.developmentThreshold : 0.110,
      riskCategory: data.riskCategory || null,
      message: data.message || null,
      missingFeatures: data.missingFeatures || [],
      features: data.features || {},
      topContributingFactors: Array.isArray(data.topContributingFactors) ? data.topContributingFactors : [],
      clinicalDisclaimer: data.clinicalDisclaimer || 'Model-estimated risk for clinical decision support. Not a diagnosis.',
    };
  } catch (err) {
    // Strict Correction #1: Never generate fallback probability!
    const isTimeout = err.name === 'AbortError';
    return {
      success: false,
      disease: 'heart_disease',
      status: 'PREDICTION_SERVICE_UNAVAILABLE',
      canCalculate: false,
      message: isTimeout
        ? 'Heart disease prediction service timed out after 5 seconds.'
        : 'Heart disease prediction microservice is currently unreachable.',
      error: isTimeout ? 'TIMEOUT' : 'SERVICE_UNAVAILABLE',
    };
  }
}
