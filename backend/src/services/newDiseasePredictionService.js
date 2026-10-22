const DEFAULT_SERVICE_URL = 'http://127.0.0.1:8000';
const REQUEST_TIMEOUT_MS = 15000;

function getBaseMlUrl() {
  const raw = process.env.DIABETES_ML_SERVICE_URL || process.env.ML_SERVICE_URL || DEFAULT_SERVICE_URL;
  return raw.replace(/\/predict(?:\/.*)?\/?$/, '').replace(/\/$/, '');
}

const routes = {
  hypertension: '/predict/hypertension',
  chronic_kidney_disease: '/predict/ckd',
};

export async function callNewDiseasePredictionService(disease, featureVector) {
  const endpointPath = routes[disease];
  const internalToken = process.env.ML_INTERNAL_API_KEY;
  if (!endpointPath || !internalToken) {
    return {
      success: false,
      disease,
      status: 'PREDICTION_SERVICE_UNAVAILABLE',
      canCalculate: false,
      probability: null,
      message: 'The protected disease-model service is not configured.',
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${getBaseMlUrl()}${endpointPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-ML-Internal-Token': internalToken,
      },
      body: JSON.stringify({ features: featureVector }),
      signal: controller.signal,
    });
    if (!response.ok) {
      return {
        success: false,
        disease,
        status: response.status === 503 ? 'MODEL_UNAVAILABLE' : 'PREDICTION_SERVICE_UNAVAILABLE',
        canCalculate: false,
        probability: null,
        statusCode: response.status,
        message: 'The protected disease-model service did not return a prediction.',
      };
    }
    const result = await response.json();
    return {
      success: Boolean(result.success),
      disease,
      status: result.status || (result.canCalculate ? 'SUCCESS' : 'INSUFFICIENT_DATA'),
      canCalculate: Boolean(result.canCalculate),
      probability: typeof result.probability === 'number' ? result.probability : null,
      threshold: typeof result.developmentThreshold === 'number' ? result.developmentThreshold : null,
      riskCategory: result.riskCategory || null,
      modelVersion: result.modelVersion || null,
      featureSchemaVersion: result.featureSchemaVersion || null,
      message: result.message || null,
      missingFeatures: Array.isArray(result.missingFeatures) ? result.missingFeatures : [],
      dataCompleteness: result.dataCompleteness || 'PARTIAL',
      topContributingFactors: Array.isArray(result.topContributingFactors) ? result.topContributingFactors : [],
      explanationStatus: result.explanationStatus === 'available' ? 'available' : 'unavailable',
      clinicalDisclaimer: result.clinicalDisclaimer || 'Non-diagnostic model estimate; not clinically validated.',
      taskInterpretation: result.taskInterpretation || null,
    };
  } catch (error) {
    const timeoutFailure = error?.name === 'AbortError';
    return {
      success: false,
      disease,
      status: timeoutFailure ? 'PREDICTION_SERVICE_UNAVAILABLE' : 'PREDICTION_SERVICE_UNAVAILABLE',
      canCalculate: false,
      probability: null,
      message: timeoutFailure ? 'Disease model request timed out.' : 'Disease model service is unavailable.',
    };
  } finally {
    clearTimeout(timeout);
  }
}
