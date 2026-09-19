import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { ApiError } from '../utils/apiError.js';

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];

  const ext = path.extname(file.originalname || '').toLowerCase();
  const mime = (file.mimetype || '').toLowerCase();

  if (allowedMimeTypes.includes(mime) && allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, 'Unsupported file type. Please upload PNG, JPG, JPEG, WEBP, or PDF.'), false);
  }
};

export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter,
});

/**
 * Upload middleware wrapper ensuring all client-side upload errors
 * (invalid type, size limit, malformed request) cleanly return HTTP 400 Bad Request.
 */
export const handleReportUpload = (req, res, next) => {
  upload.single('report')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(new ApiError(400, 'File exceeds configured size limit of 10MB.'));
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return next(new ApiError(400, `Unexpected field '${err.field}'. Please upload file under the 'report' field.`));
        }
        return next(new ApiError(400, `Upload error: ${err.message}`));
      }
      if (err instanceof ApiError) {
        return next(err);
      }
      return next(new ApiError(400, err.message || 'Unsupported file type. Please upload PNG, JPG, JPEG, WEBP, or PDF.'));
    }
    next();
  });
};
