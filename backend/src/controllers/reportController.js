import { Report } from '../models/Report.js';
import { Patient } from '../models/Patient.js';
import { uploadOnCloudinary } from '../config/cloudinary.js';
import { processReportOCR } from '../services/ocrService.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncWrapper.js';

export const uploadReport = asyncHandler(async (req, res) => {
  const { title, reportType = 'Blood Test', patientId } = req.body;

  if (!req.file) {
    throw new ApiError(400, 'Please select a lab report document/image to upload.');
  }

  let targetPatientId = patientId;
  if (!targetPatientId && req.user.role === 'Patient') {
    const p = await Patient.findOne({ user: req.user._id });
    if (p) targetPatientId = p._id;
  }

  if (!targetPatientId) {
    throw new ApiError(400, 'Target Patient ID is required.');
  }

  // 1. Process OCR on uploaded file path
  const ocrResult = await processReportOCR(req.file.path);

  // 2. Upload file to Cloudinary (or local storage fallback)
  const uploadResult = await uploadOnCloudinary(req.file.path);
  if (!uploadResult) {
    throw new ApiError(500, 'Failed to store report file.');
  }

  // 3. Save Report document to MongoDB
  const report = await Report.create({
    patient: targetPatientId,
    uploader: req.user._id,
    title: title || req.file.originalname,
    reportType,
    fileUrl: uploadResult.url,
    publicId: uploadResult.publicId,
    extractedText: ocrResult.rawText,
    structuredData: ocrResult.structuredData,
    confidence: ocrResult.confidence,
    uploadDate: new Date(),
  });

  // 4. Update Patient physiological vitals automatically if extracted by OCR
  if (ocrResult.structuredData && Object.keys(ocrResult.structuredData).length > 0) {
    const updateFields = {};
    if (ocrResult.structuredData.fastingSugar) updateFields.fastingSugar = ocrResult.structuredData.fastingSugar;
    if (ocrResult.structuredData.systolicBP) updateFields.systolicBP = ocrResult.structuredData.systolicBP;
    if (ocrResult.structuredData.diastolicBP) updateFields.diastolicBP = ocrResult.structuredData.diastolicBP;

    if (Object.keys(updateFields).length > 0) {
      await Patient.findByIdAndUpdate(targetPatientId, updateFields);
    }
  }

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        report,
        ocr: ocrResult,
      },
      'Report uploaded and OCR parsed successfully.'
    )
  );
});

export const getReports = asyncHandler(async (req, res) => {
  let { patientId } = req.query;

  if (req.user.role === 'Patient') {
    const p = await Patient.findOne({ user: req.user._id });
    if (p) patientId = p._id;
  }

  const filter = {};
  if (patientId) filter.patient = patientId;

  const reports = await Report.find(filter)
    .populate('patient')
    .populate('uploader', 'name email role')
    .sort({ uploadDate: -1 });

  return res.status(200).json(new ApiResponse(200, reports, 'Medical reports fetched successfully.'));
});

export const deleteReport = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await Report.findByIdAndDelete(id);
  return res.status(200).json(new ApiResponse(200, {}, 'Medical report deleted.'));
});
