import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },
    uploader: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    reportType: {
      type: String,
      default: 'General Laboratory Report',
      index: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    publicId: {
      type: String,
    },
    storageProvider: {
      type: String,
      enum: ['cloudinary', 'local'],
      default: 'local',
    },
    // Status state-machine: UPLOADED -> PROCESSING -> PENDING_REVIEW -> CONFIRMED
    status: {
      type: String,
      enum: ['UPLOADED', 'PROCESSING', 'PENDING_REVIEW', 'CONFIRMED', 'UPLOAD_FAILED', 'OCR_FAILED'],
      default: 'PENDING_REVIEW',
      index: true,
    },
    // Raw, unedited OCR text preserved for audit and future AI refinement (immutable)
    rawOcrText: {
      type: String,
      default: '',
    },
    // For backwards compatibility with older queries
    extractedText: {
      type: String,
      default: '',
    },
    // Pristine complete machine extraction snapshot immediately after OCR/parser/normalization (immutable)
    initialExtraction: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // Audit trail of human corrections before and upon confirmation
    corrections: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // Automatically machine-extracted structured medical JSON
    extractedData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // User-confirmed and validated parameters
    confirmedData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // Flat structuredData for backward compatibility with existing readers
    structuredData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    confidence: {
      type: Number,
      default: 0,
    },
    uploadDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    confirmedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

reportSchema.path('fileUrl').get(function (url) {
  if (!url || typeof url !== 'string') return url;
  if (/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/i.test(url)) {
    const base =
      (process.env.BACKEND_URL && !process.env.BACKEND_URL.includes('localhost') && !process.env.BACKEND_URL.includes('127.0.0.1'))
        ? process.env.BACKEND_URL.replace(/\/+$/, '')
        : process.env.RENDER_EXTERNAL_URL
        ? process.env.RENDER_EXTERNAL_URL.replace(/\/+$/, '')
        : (process.env.NODE_ENV === 'production' ? 'https://medscan-backend-api.onrender.com' : null);
    if (base) {
      return url.replace(/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/i, base);
    }
  }
  return url;
});

reportSchema.pre('validate', function (next) {
  if (!this.uploader && this.uploadedBy) {
    this.uploader = this.uploadedBy;
  }
  if (!this.uploadedBy && this.uploader) {
    this.uploadedBy = this.uploader;
  }
  next();
});

export const Report = mongoose.model('Report', reportSchema);
