import { Patient } from '../models/Patient.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncWrapper.js';

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

  // Role-based scope filtering with flexible fallbacks for demo accounts
  if (req.user.role === 'Doctor') {
    filter.$or = [{ assignedDoctor: req.user._id }, { assignedDoctor: { $exists: false } }];
  } else if (req.user.role === 'Nurse') {
    filter.$or = [{ assignedNurse: req.user._id }, { assignedNurse: { $exists: false } }];
  } else if (req.user.role === 'CHO') {
    if (village) filter.village = village;
  } else if (req.user.role === 'Family') {
    filter.$or = [{ linkedFamilyMembers: req.user._id }, { linkedFamilyMembers: { $exists: false } }];
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

export const updatePatient = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const patient = await Patient.findByIdAndUpdate(id, req.body, { new: true })
    .populate('user', 'name email phone village avatar')
    .populate('assignedDoctor', 'name email');

  if (!patient) throw new ApiError(404, 'Patient record not found.');

  return res.status(200).json(new ApiResponse(200, patient, 'Patient record updated successfully.'));
});

export const deletePatient = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const patient = await Patient.findById(id);
  if (!patient) throw new ApiError(404, 'Patient not found.');

  await Patient.findByIdAndDelete(id);
  await User.findByIdAndDelete(patient.user);

  return res.status(200).json(new ApiResponse(200, {}, 'Patient and associated user account deleted.'));
});

export const getLinkedFamilyPatients = asyncHandler(async (req, res) => {
  let patients = await Patient.find({ linkedFamilyMembers: req.user._id })
    .populate('user', 'name email phone village avatar')
    .populate('assignedDoctor', 'name email phone');

  if (patients.length === 0) {
    // Demo fallback for family view
    patients = await Patient.find({})
      .limit(2)
      .populate('user', 'name email phone village avatar')
      .populate('assignedDoctor', 'name email phone');
  }

  return res.status(200).json(new ApiResponse(200, patients, 'Linked family patient accounts fetched successfully.'));
});
