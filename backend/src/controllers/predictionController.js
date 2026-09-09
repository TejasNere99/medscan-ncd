import { Prediction } from '../models/Prediction.js';
import { Patient } from '../models/Patient.js';
import { calculateDiseaseRisk } from '../services/predictionService.js';
import { routeHighRiskAlert } from '../services/notificationService.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncWrapper.js';

export const runPrediction = asyncHandler(async (req, res) => {
  const { patientId, age, systolicBP, diastolicBP, fastingSugar, bmi, symptoms = [] } = req.body;

  let targetPatientId = patientId;
  let patientDoc = null;

  if (req.user.role === 'Patient') {
    patientDoc = await Patient.findOne({ user: req.user._id });
    if (patientDoc) targetPatientId = patientDoc._id;
  } else if (targetPatientId) {
    patientDoc = await Patient.findById(targetPatientId);
  }

  if (!patientDoc && targetPatientId) {
    patientDoc = await Patient.findById(targetPatientId);
  }

  const pAge = age || patientDoc?.age || 45;
  const pSys = systolicBP || patientDoc?.systolicBP || 120;
  const pDia = diastolicBP || patientDoc?.diastolicBP || 80;
  const pSugar = fastingSugar || patientDoc?.fastingSugar || 100;
  const pBmi = bmi || patientDoc?.bmi || 24.5;

  // Run calculation via Service layer
  const result = await calculateDiseaseRisk({
    age: pAge,
    systolicBP: pSys,
    diastolicBP: pDia,
    fastingSugar: pSugar,
    bmi: pBmi,
    symptoms,
  });

  // Store in DB if patientId is linked
  let predictionRecord = null;
  if (targetPatientId) {
    predictionRecord = await Prediction.create({
      patient: targetPatientId,
      calculatedBy: req.user._id,
      inputs: {
        age: pAge,
        systolicBP: pSys,
        diastolicBP: pDia,
        fastingSugar: pSugar,
        bmi: pBmi,
        symptoms,
      },
      overallRiskPercent: result.overallRiskPercent,
      riskLevel: result.riskLevel,
      diseaseBreakdown: result.diseaseBreakdown,
      confidenceScore: result.confidenceScore,
      recommendations: result.recommendations,
      algorithmVersion: result.algorithmVersion,
      predictionDate: new Date(),
    });

    // High risk notification trigger
    if (['High', 'Critical'].includes(result.riskLevel)) {
      await routeHighRiskAlert({
        patientId: targetPatientId,
        riskPercent: result.overallRiskPercent,
        riskLevel: result.riskLevel,
        diseaseBreakdown: result.diseaseBreakdown,
      });
    }
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        prediction: predictionRecord || result,
        result,
      },
      'AI Disease Risk Prediction calculated successfully.'
    )
  );
});

export const getPredictionHistory = asyncHandler(async (req, res) => {
  let { patientId } = req.query;

  if (req.user.role === 'Patient') {
    const p = await Patient.findOne({ user: req.user._id });
    if (p) patientId = p._id;
  }

  const filter = {};
  if (patientId) filter.patient = patientId;

  const history = await Prediction.find(filter)
    .populate('patient')
    .sort({ predictionDate: -1 })
    .limit(20);

  return res.status(200).json(new ApiResponse(200, history, 'Prediction history retrieved.'));
});
