import { ApiError } from '../utils/apiError.js';

export const errorHandler = (err, req, res, _next) => {
  let error = err;

  if (error.name === 'MulterError') {
    let msg = 'Malformed upload request.';
    if (error.code === 'LIMIT_FILE_SIZE') {
      msg = 'File exceeds configured size limit of 10MB.';
    } else if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      msg = `Unexpected field '${error.field}'. Please upload file under the 'report' field.`;
    }
    error = new ApiError(400, msg);
  } else if (!(error instanceof ApiError)) {
    const isClientError =
      error.name === 'ValidationError' ||
      error.statusCode === 400 ||
      (typeof error.message === 'string' && (
        error.message.includes('file format') ||
        error.message.includes('file type') ||
        error.message.includes('Unsupported file')
      ));

    const statusCode = isClientError ? 400 : (error.statusCode || 500);
    const message = error.message || 'Internal Server Error';
    error = new ApiError(statusCode, message, error?.errors || [], err.stack);
  }

  const response = {
    statusCode: error.statusCode,
    message: error.message,
    success: false,
    errors: error.errors || [],
    ...(process.env.NODE_ENV === 'development' && error.statusCode >= 500 ? { stack: error.stack } : {}),
  };

  return res.status(error.statusCode).json(response);
};
