import { Patient } from '../models/Patient.js';
import { PatientRelationship } from '../models/PatientRelationship.js';
import { User } from '../models/User.js';
import { Report } from '../models/Report.js';
import { Prediction } from '../models/Prediction.js';
import { buildDiabetesFeatures } from '../services/diabetesFeatureBuilder.js';
import { callDiabetesPredictionService } from '../services/diabetesPredictionService.js';
import { buildHeartDiseaseFeatures } from '../services/heartDiseaseFeatureBuilder.js';
import { callHeartDiseasePredictionService } from '../services/heartDiseasePredictionService.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncWrapper.js';

export async function triggerDiabetesRecalculation(patientId, userId) {
  try {
    const patient = await Patient.findById(patientId);
    if (!patient) return;

    const latestConfirmedReport = await Report.findOne({
      patient: patientId,
      status: 'CONFIRMED',
    }).sort({ confirmedAt: -1, createdAt: -1 });

    if (!latestConfirmedReport) return;

    const extraction = buildDiabetesFeatures(latestConfirmedReport, patient);
    if (extraction.canCalculate) {
      const mlResult = await callDiabetesPredictionService(extraction.featureVector);
      if (mlResult.success && mlResult.canCalculate) {
        await Prediction.create({
          patient: patientId,
          report: latestConfirmedReport._id,
          calculatedBy: userId,
          disease: 'diabetes',
          scenario: 'A',
          modelVersion: mlResult.modelVersion || '1.0.0',
          probability: mlResult.probability,
          threshold: mlResult.threshold || 0.21,
          riskCategory: mlResult.riskCategory,
          status: 'SUCCESS',
          canCalculate: true,
          dataCompleteness: mlResult.dataCompleteness || extraction.dataCompleteness,
          missingDomain: null,
          inputFeatures: extraction.featureVector,
          featureAvailability: { ...(extraction.featureAvailability || {}), ...(mlResult.featureAvailability || {}) },
          topContributingFactors: mlResult.topContributingFactors || [],
          clinicalDisclaimer: mlResult.clinicalDisclaimer,
          overallRiskPercent: Math.round(mlResult.probability * 100),
          riskLevel: mlResult.riskCategory === 'ELEVATED_MODEL_ESTIMATED_RISK' ? 'High' : 'Low',
          confidenceScore: 82.8,
          recommendations:
            mlResult.riskCategory === 'ELEVATED_MODEL_ESTIMATED_RISK'
              ? [
                  'Model-estimated diabetes risk is elevated (probability exceeds development decision threshold 0.210).',
                  'Recommend clinical follow-up with confirmatory laboratory diagnostics (HbA1c or Fasting Plasma Glucose).',
                  'Lifestyle evaluation and metabolic screening recommended.',
                ]
              : [
                  'Model-estimated diabetes risk is within lower baseline range.',
                  'Maintain routine preventative health monitoring and healthy lifestyle practices.',
                ],
          algorithmVersion: 'diabetes_scenario_a_v1.0.0',
          predictionDate: new Date(),
        });
      }
    } else {
      // Minimum input domain requirement not yet satisfied
      const existingPred = await Prediction.findOne({
        patient: patientId,
        disease: 'diabetes',
        report: latestConfirmedReport._id,
        status: 'INSUFFICIENT_DATA',
      }).sort({ createdAt: -1 });

      if (existingPred) {
        existingPred.missingDomain = extraction.missingDomain;
        existingPred.inputFeatures = extraction.featureVector;
        existingPred.featureAvailability = extraction.featureAvailability;
        existingPred.predictionDate = new Date();
        await existingPred.save();
      } else {
        await Prediction.create({
          patient: patientId,
          report: latestConfirmedReport._id,
          calculatedBy: userId,
          disease: 'diabetes',
          scenario: 'A',
          modelVersion: '1.0.0',
          status: 'INSUFFICIENT_DATA',
          canCalculate: false,
          dataCompleteness: 'INSUFFICIENT',
          missingDomain: extraction.missingDomain,
          inputFeatures: extraction.featureVector,
          featureAvailability: extraction.featureAvailability,
          clinicalDisclaimer: 'Model-estimated risk for clinical decision support. Not a diagnosis.',
          predictionDate: new Date(),
        });
      }
    }
  } catch (err) {
    console.warn('Recalculation of diabetes prediction skipped:', err?.message || err);
  }
}

export async function triggerHeartDiseaseRecalculation(patientId, userId) {
  try {
    const patient = await Patient.findById(patientId);
    if (!patient) return;

    const latestConfirmedReport = await Report.findOne({
      patient: patientId,
      status: 'CONFIRMED',
    }).sort({ confirmedAt: -1, createdAt: -1 });

    if (!latestConfirmedReport) return;

    const extraction = buildHeartDiseaseFeatures(latestConfirmedReport, patient);
    if (extraction.canCalculate) {
      const mlResult = await callHeartDiseasePredictionService(extraction.featureVector);
      if (mlResult.success && mlResult.canCalculate) {
        await Prediction.create({
          patient: patientId,
          report: latestConfirmedReport._id,
          calculatedBy: userId,
          disease: 'heart_disease',
          scenario: 'framingham_chd_10yr',
          modelVersion: mlResult.modelVersion || '1.0.0',
          probability: mlResult.probability,
          threshold: mlResult.threshold || 0.110,
          riskCategory: mlResult.riskCategory,
          status: 'SUCCESS',
          canCalculate: true,
          dataCompleteness: mlResult.dataCompleteness || extraction.dataCompleteness,
          missingDomain: null,
          inputFeatures: extraction.featureVector,
          featureAvailability: { ...(extraction.featureDetails || {}), ...(mlResult.features || {}) },
          topContributingFactors: mlResult.topContributingFactors || [],
          clinicalDisclaimer: mlResult.clinicalDisclaimer,
          overallRiskPercent: Math.round(mlResult.probability * 100),
          riskLevel: mlResult.riskCategory === 'ELEVATED_MODEL_ESTIMATED_RISK' ? 'High' : 'Low',
          confidenceScore: 71.4,
          recommendations:
            mlResult.riskCategory === 'ELEVATED_MODEL_ESTIMATED_RISK'
              ? [
                  'Model-estimated 10-year CHD risk is elevated (probability exceeds development decision threshold 0.110).',
                  'Recommend comprehensive cardiovascular evaluation, fasting lipid panel, and blood pressure monitoring.',
                  'Cardiovascular lifestyle interventions, physical activity, and dietary consultation recommended.',
                ]
              : [
                  'Model-estimated 10-year CHD risk is within lower baseline range.',
                  'Maintain routine cardiovascular health monitoring and healthy lifestyle practices.',
                ],
          algorithmVersion: 'framingham_chd_v1.0.0',
          predictionDate: new Date(),
        });
      }
    } else {
      // Minimum input domain requirement not yet satisfied
      const existingPred = await Prediction.findOne({
        patient: patientId,
        disease: 'heart_disease',
        report: latestConfirmedReport._id,
        status: 'INSUFFICIENT_DATA',
      }).sort({ createdAt: -1 });

      const missingText = extraction.missingRequired.join(', ');
      if (existingPred) {
        existingPred.missingDomain = missingText;
        existingPred.inputFeatures = extraction.featureVector;
        existingPred.featureAvailability = extraction.featureDetails;
        existingPred.predictionDate = new Date();
        await existingPred.save();
      } else {
        await Prediction.create({
          patient: patientId,
          report: latestConfirmedReport._id,
          calculatedBy: userId,
          disease: 'heart_disease',
          scenario: 'framingham_chd_10yr',
          modelVersion: '1.0.0',
          status: 'INSUFFICIENT_DATA',
          canCalculate: false,
          dataCompleteness: 'INSUFFICIENT',
          missingDomain: missingText,
          inputFeatures: extraction.featureVector,
          featureAvailability: extraction.featureDetails,
          clinicalDisclaimer: 'Model-estimated risk for clinical decision support. Not a diagnosis.',
          predictionDate: new Date(),
        });
      }
    }
  } catch (err) {
    console.warn('Recalculation of heart disease prediction skipped:', err?.message || err);
  }
}

export const getMyPatientProfile = asyncHandler(async (req, res) => {
  let patient = await Patient.findOne({ user: req.user._id })
    .populate('user', 'name email phone village avatar')
    .populate('assignedDoctor', 'name email phone')
    .populate('assignedNurse', 'name email')
    .populate('linkedFamilyMembers', 'name email phone');

  if (!patient) {
    // If patient document doesn't exist yet for this user, create default demo patient profile
    patient = await Patient.create({
      user: req.user._id,
      age: 52,
      gender: 'Male',
      bloodGroup: 'A+',
      village: req.user.village || 'Green Valley',
      systolicBP: 142,
      diastolicBP: 92,
      fastingSugar: 148,
      bmi: 27.4,
      medicalHistory: ['Stage 1 Hypertension', 'Type-2 Diabetes Risk'],
    });
    patient = await Patient.findById(patient._id).populate('user', 'name email phone village avatar');
  }

  return res.status(200).json(new ApiResponse(200, patient, 'Patient profile fetched successfully.'));
});

export const getPatients = asyncHandler(async (req, res) => {
  const { search, village, gender, page = 1, limit = 10 } = req.query;
  const filter = {};

  // Phase P1: Active PatientRelationship queries with legacy fallback
  if (req.user.role === 'Doctor') {
    const rels = await PatientRelationship.find({
      relatedUser: req.user._id,
      relationshipType: 'DOCTOR',
      status: 'ACTIVE',
    }).select('patient');
    const relPatientIds = rels.map((r) => r.patient);
    filter.$or = [{ assignedDoctor: req.user._id }, { _id: { $in: relPatientIds } }];
  } else if (req.user.role === 'Nurse') {
    filter.assignedNurse = req.user._id;
  } else if (req.user.role === 'Family') {
    const rels = await PatientRelationship.find({
      relatedUser: req.user._id,
      relationshipType: 'FAMILY',
      status: 'ACTIVE',
    }).select('patient');
    const relPatientIds = rels.map((r) => r.patient);
    filter.$or = [{ linkedFamilyMembers: req.user._id }, { _id: { $in: relPatientIds } }];
  } else if (req.user.role === 'CHO') {
    // CHO community view: filter by requested village if specified, otherwise include all community patients
    if (village && village !== 'All') {
      filter.village = village;
    }
  } else {
    // Admins, Patients, or unrecognized roles cannot list clinical patient records
    filter._id = null;
  }

  if (village && req.user.role !== 'CHO') filter.village = village;
  if (gender) filter.gender = gender;

  if (search) {
    const matchingUsers = await User.find({ name: { $regex: search, $options: 'i' } }).select('_id');
    const userIds = matchingUsers.map((u) => u._id);
    filter.$or = [...(filter.$or || []), { user: { $in: userIds } }];
  }

  const count = await Patient.countDocuments(filter);
  const patients = await Patient.find(filter)
    .populate('user', 'name email phone village avatar')
    .populate('assignedDoctor', 'name email')
    .populate('assignedNurse', 'name email')
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        patients,
        totalPages: Math.ceil(count / limit) || 1,
        currentPage: parseInt(page),
        totalPatients: count,
      },
      'Patients list retrieved successfully.'
    )
  );
});

export const getPatientById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const patient = await Patient.findById(id)
    .populate('user', 'name email phone village avatar')
    .populate('assignedDoctor', 'name email phone')
    .populate('assignedNurse', 'name email phone')
    .populate('linkedFamilyMembers', 'name email phone');

  if (!patient) {
    throw new ApiError(404, 'Patient record not found.');
  }

  // Phase P1: Dual-layer authorization (Active PatientRelationship or legacy bridge)
  if (req.user.role === 'Patient') {
    const patientUserId = patient.user?._id || patient.user;
    if (String(patientUserId) !== String(req.user._id)) {
      throw new ApiError(403, 'Unauthorized. You may only view your own patient profile.');
    }
  } else if (req.user.role === 'Doctor') {
    const docId = patient.assignedDoctor?._id || patient.assignedDoctor;
    const isAssigned = docId && String(docId) === String(req.user._id);
    const hasActiveRel = await PatientRelationship.exists({
      patient: patient._id,
      relatedUser: req.user._id,
      relationshipType: 'DOCTOR',
      status: 'ACTIVE',
    });
    if (!isAssigned && !hasActiveRel) {
      throw new ApiError(403, 'Unauthorized. You are not assigned to this patient.');
    }
  } else if (req.user.role === 'Nurse') {
    const nurseId = patient.assignedNurse?._id || patient.assignedNurse;
    if (!nurseId || String(nurseId) !== String(req.user._id)) {
      throw new ApiError(403, 'Unauthorized. You are not assigned to this patient.');
    }
  } else if (req.user.role === 'Family') {
    const isLinked = patient.linkedFamilyMembers?.some((f) => String(f._id || f) === String(req.user._id));
    const hasActiveRel = await PatientRelationship.exists({
      patient: patient._id,
      relatedUser: req.user._id,
      relationshipType: 'FAMILY',
      status: 'ACTIVE',
    });
    if (!isLinked && !hasActiveRel) {
      throw new ApiError(403, 'Unauthorized. You are not linked to this patient.');
    }
  } else if (req.user.role === 'CHO') {
    // CHO is authorized to view community patient health profiles
  } else if (req.user.role === 'Admin') {
    throw new ApiError(403, 'Administrative accounts cannot access clinical patient profiles.');
  } else {
    throw new ApiError(403, 'Unauthorized to view this patient profile.');
  }

  return res.status(200).json(new ApiResponse(200, patient, 'Patient details retrieved successfully.'));
});

export const createPatient = asyncHandler(async (req, res) => {
  const { name, email, password, age, gender, bloodGroup, village, systolicBP, diastolicBP, fastingSugar, bmi, medicalHistory } = req.body;

  if (!name || !email) {
    throw new ApiError(400, 'Patient name and email are required.');
  }

  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({
      name,
      email,
      passwordHash: password || 'Password123!',
      role: 'Patient',
      village: village || 'Green Valley',
    });
  }

  const patient = await Patient.create({
    user: user._id,
    age: age || 45,
    gender: gender || 'Male',
    bloodGroup: bloodGroup || 'O+',
    village: village || user.village,
    systolicBP: systolicBP || 120,
    diastolicBP: diastolicBP || 80,
    fastingSugar: fastingSugar || 100,
    bmi: bmi || 24.5,
    assignedDoctor: req.user.role === 'Doctor' ? req.user._id : undefined,
    medicalHistory: medicalHistory || ['Hypertension Risk'],
  });

  return res.status(201).json(new ApiResponse(201, patient, 'New patient created successfully.'));
});

export const updateMyDemographics = asyncHandler(async (req, res) => {
  const { age, gender, bloodGroup, village, systolicBP, diastolicBP, bmi, totalCholesterol, isCurrentSmoker } = req.body;

  const updateData = {};
  if (age !== undefined && age !== '') {
    const ageNum = Number(age);
    if (isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
      throw new ApiError(400, 'Age must be a valid number between 1 and 120.');
    }
    updateData.age = ageNum;
  }
  if (gender !== undefined && gender !== '') {
    if (!['Male', 'Female', 'Other'].includes(gender)) {
      throw new ApiError(400, "Gender must be 'Male', 'Female', or 'Other'.");
    }
    updateData.gender = gender;
  }
  if (bloodGroup !== undefined) updateData.bloodGroup = bloodGroup;
  if (village !== undefined) updateData.village = village;
  if (systolicBP !== undefined && systolicBP !== '') {
    const s = Number(systolicBP);
    if (!isNaN(s) && s > 0) updateData.systolicBP = s;
  }
  if (diastolicBP !== undefined && diastolicBP !== '') {
    const d = Number(diastolicBP);
    if (!isNaN(d) && d > 0) updateData.diastolicBP = d;
  }
  if (bmi !== undefined && bmi !== '') {
    const b = Number(bmi);
    if (!isNaN(b) && b > 0) updateData.bmi = b;
  }
  if (totalCholesterol !== undefined && totalCholesterol !== '') {
    const tc = Number(totalCholesterol);
    if (!isNaN(tc) && tc > 0) updateData.totalCholesterol = tc;
  }
  if (isCurrentSmoker !== undefined && isCurrentSmoker !== null && isCurrentSmoker !== '') {
    if (typeof isCurrentSmoker === 'boolean') {
      updateData.isCurrentSmoker = isCurrentSmoker;
    } else if (isCurrentSmoker === 'true' || isCurrentSmoker === 1 || isCurrentSmoker === '1') {
      updateData.isCurrentSmoker = true;
    } else if (isCurrentSmoker === 'false' || isCurrentSmoker === 0 || isCurrentSmoker === '0') {
      updateData.isCurrentSmoker = false;
    }
  }

  let patient = await Patient.findOneAndUpdate(
    { user: req.user._id },
    { $set: updateData },
    { new: true }
  )
    .populate('user', 'name email phone village avatar')
    .populate('assignedDoctor', 'name email');

  if (!patient) {
    throw new ApiError(404, 'Patient profile not found.');
  }

  if (
    updateData.age !== undefined ||
    updateData.gender !== undefined ||
    updateData.systolicBP !== undefined ||
    updateData.diastolicBP !== undefined ||
    updateData.bmi !== undefined ||
    updateData.totalCholesterol !== undefined ||
    updateData.isCurrentSmoker !== undefined
  ) {
    await triggerDiabetesRecalculation(patient._id, req.user._id);
    await triggerHeartDiseaseRecalculation(patient._id, req.user._id);
  }

  return res.status(200).json(new ApiResponse(200, patient, 'Patient health profile updated successfully.'));
});

export const updatePatient = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // If requester is a Patient, enforce ownership and safe field restrictions
  if (req.user.role === 'Patient') {
    const existing = await Patient.findById(id);
    if (!existing) throw new ApiError(404, 'Patient record not found.');
    if (String(existing.user) !== String(req.user._id)) {
      throw new ApiError(403, 'Access forbidden. You are only authorized to update your own patient profile.');
    }

    const { age, gender, bloodGroup, village, bmi, systolicBP, diastolicBP, fastingSugar, totalCholesterol, isCurrentSmoker } = req.body;
    const safeUpdates = {};
    if (age !== undefined) {
      const ageNum = Number(age);
      if (isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
        throw new ApiError(400, 'Age must be a valid number between 1 and 120.');
      }
      safeUpdates.age = ageNum;
    }
    if (gender !== undefined) {
      if (!['Male', 'Female', 'Other'].includes(gender)) {
        throw new ApiError(400, "Gender must be 'Male', 'Female', or 'Other'.");
      }
      safeUpdates.gender = gender;
    }
    if (bloodGroup !== undefined) safeUpdates.bloodGroup = bloodGroup;
    if (village !== undefined) safeUpdates.village = village;
    if (bmi !== undefined) safeUpdates.bmi = bmi;
    if (systolicBP !== undefined) safeUpdates.systolicBP = systolicBP;
    if (diastolicBP !== undefined) safeUpdates.diastolicBP = diastolicBP;
    if (fastingSugar !== undefined) safeUpdates.fastingSugar = fastingSugar;
    if (totalCholesterol !== undefined) safeUpdates.totalCholesterol = totalCholesterol;
    if (isCurrentSmoker !== undefined) safeUpdates.isCurrentSmoker = isCurrentSmoker;

    const patient = await Patient.findByIdAndUpdate(id, { $set: safeUpdates }, { new: true })
      .populate('user', 'name email phone village avatar')
      .populate('assignedDoctor', 'name email');

    if (
      safeUpdates.age !== undefined ||
      safeUpdates.gender !== undefined ||
      safeUpdates.bmi !== undefined ||
      safeUpdates.systolicBP !== undefined ||
      safeUpdates.diastolicBP !== undefined ||
      safeUpdates.totalCholesterol !== undefined ||
      safeUpdates.isCurrentSmoker !== undefined
    ) {
      await triggerDiabetesRecalculation(patient._id, req.user._id);
      await triggerHeartDiseaseRecalculation(patient._id, req.user._id);
    }

    return res.status(200).json(new ApiResponse(200, patient, 'Patient profile updated successfully.'));
  }

  // Doctor/Nurse update flow
  const existing = await Patient.findById(id);
  if (!existing) throw new ApiError(404, 'Patient record not found.');

  if (req.user.role === 'Doctor') {
    const isAssigned = existing.assignedDoctor && String(existing.assignedDoctor) === String(req.user._id);
    const hasActiveRel = await PatientRelationship.exists({
      patient: existing._id,
      relatedUser: req.user._id,
      relationshipType: 'DOCTOR',
      status: 'ACTIVE',
    });
    if (!isAssigned && !hasActiveRel) {
      throw new ApiError(403, 'Access forbidden. You are not assigned to this patient.');
    }
  } else if (req.user.role === 'Nurse') {
    if (!existing.assignedNurse || String(existing.assignedNurse) !== String(req.user._id)) {
      throw new ApiError(403, 'Access forbidden. You are not assigned to this patient.');
    }
  } else if (req.user.role === 'Admin') {
    throw new ApiError(403, 'Administrative accounts cannot access or modify clinical patient profiles.');
  } else {
    // Family, CHO or other roles fail closed
    throw new ApiError(403, 'Access forbidden. Your role is not authorized to modify patient records.');
  }

  const patient = await Patient.findByIdAndUpdate(id, req.body, { new: true })
    .populate('user', 'name email phone village avatar')
    .populate('assignedDoctor', 'name email');

  if (!patient) throw new ApiError(404, 'Patient record not found.');

  if (
    req.body.age !== undefined ||
    req.body.gender !== undefined ||
    req.body.bmi !== undefined ||
    req.body.systolicBP !== undefined ||
    req.body.diastolicBP !== undefined ||
    req.body.totalCholesterol !== undefined ||
    req.body.isCurrentSmoker !== undefined
  ) {
    await triggerDiabetesRecalculation(patient._id, req.user._id);
    await triggerHeartDiseaseRecalculation(patient._id, req.user._id);
  }

  return res.status(200).json(new ApiResponse(200, patient, 'Patient record updated successfully.'));
});

export const deletePatient = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const patient = await Patient.findById(id);
  if (!patient) throw new ApiError(404, 'Patient not found.');

  if (req.user.role === 'Doctor' || req.user.role === 'Nurse' || req.user.role === 'CHO' || req.user.role === 'Family') {
    throw new ApiError(403, 'Clinicians and caregivers are not authorized to delete patient accounts.');
  }

  if (req.user.role === 'Patient') {
    if (String(patient.user) !== String(req.user._id)) {
      throw new ApiError(403, 'Unauthorized. You may only delete your own patient profile.');
    }
  }

  await Patient.findByIdAndDelete(id);
  await User.findByIdAndDelete(patient.user);

  return res.status(200).json(new ApiResponse(200, {}, 'Patient and associated user account deleted.'));
});

export const getLinkedFamilyPatients = asyncHandler(async (req, res) => {
  let patients = await Patient.find({ linkedFamilyMembers: req.user._id })
    .populate('user', 'name email phone village avatar')
    .populate('assignedDoctor', 'name email phone');

  return res.status(200).json(new ApiResponse(200, patients, 'Linked family patient accounts fetched successfully.'));
});
