import rateLimit from 'express-rate-limit';

const isDev = process.env.NODE_ENV !== 'production';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 10000 : (Number(process.env.RATE_LIMIT_MAX) || 1500),
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // In local development/testing, skip IP throttling on localhost to prevent blocking active development
    if (isDev) {
      const ip = req.ip || req.connection?.remoteAddress || '';
      if (ip.includes('127.0.0.1') || ip.includes('::1') || ip === 'localhost') {
        return true;
      }
    }
    return false;
  },
  message: {
    statusCode: 429,
    message: 'Too many requests from this IP address, please try again after 15 minutes.',
    success: false,
  },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 500 : (Number(process.env.AUTH_RATE_LIMIT_MAX) || 30),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    statusCode: 429,
    message: 'Too many login attempts. Please wait 15 minutes before retrying.',
    success: false,
  },
});
