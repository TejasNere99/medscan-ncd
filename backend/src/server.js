import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import swaggerUi from 'swagger-ui-express';

import { connectDB } from './config/db.js';
import mongoose from 'mongoose';
import { swaggerDocument } from './config/swagger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { checkDiabetesServiceHealth } from './services/diabetesPredictionService.js';

import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import patientRoutes from './routes/patientRoutes.js';
import medicineRoutes from './routes/medicineRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import predictionRoutes from './routes/predictionRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import iotRoutes from './routes/iotRoutes.js';
import settingRoutes from './routes/settingRoutes.js';
import relationshipRoutes from './routes/relationshipRoutes.js';
import invitationRoutes from './routes/invitationRoutes.js';
import communityCareRoutes from './routes/communityCareRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.set('trust proxy', 1);

const sanitizeOrigin = (url) => (url ? url.trim().replace(/\/+$/, '') : null);

const defaultOrigins = [
  sanitizeOrigin(process.env.CLIENT_URL),
  sanitizeOrigin(process.env.FRONTEND_URL),
  'http://localhost:5173',
].filter(Boolean);

const extraOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => sanitizeOrigin(s))
  .filter(Boolean);

const allowedClientOrigins = new Set([...defaultOrigins, ...extraOrigins]);

if (process.env.NODE_ENV !== 'production') {
  for (const host of ['localhost', '127.0.0.1']) {
    for (let port = 5173; port <= 5179; port += 1) {
      allowedClientOrigins.add(`http://${host}:${port}`);
    }
  }
}

// Global Middlewares
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const normalized = origin.trim().replace(/\/+$/, '');
      if (allowedClientOrigins.has(normalized)) return callback(null, true);
      return callback(new Error(`Origin '${origin}' is not allowed by CORS`));
    },
    credentials: true,
  })
);
app.use(morgan('dev'));
app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: true, limit: '16kb' }));

// Static uploads directory
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Swagger API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Rate Limiting
app.use('/api/', apiLimiter);

// Health Check Endpoint
app.get('/health', (req, res) => res.status(200).json({ status: 'OK', uptime: process.uptime() }));

app.get('/api/health', async (req, res) => {
  const diabetesService = await checkDiabetesServiceHealth();
  res.status(200).json({
    status: 'OK',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: {
      connected: mongoose.connection.readyState === 1,
      readyState: mongoose.connection.readyState,
      ...(process.env.NODE_ENV === 'production' ? {} : {
        host: mongoose.connection.host || null,
        name: mongoose.connection.name || null,
      }),
    },
    diabetesMLService: diabetesService,
    service: 'MedScan-NCD Backend API',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/iot', iotRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/relationships', relationshipRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/community-care', communityCareRoutes);

// Global Centralized Error Handler
app.use(errorHandler);

function validateProductionEnv() {
  if (process.env.NODE_ENV !== 'production') return;

  const errors = [];
  if (!process.env.MONGODB_URI) {
    errors.push('MONGODB_URI is missing. Please configure your MongoDB Atlas connection string.');
  }
  if (!process.env.JWT_ACCESS_SECRET || process.env.JWT_ACCESS_SECRET.includes('your_super_secret')) {
    errors.push('JWT_ACCESS_SECRET must be set to a secure custom secret in production.');
  }
  if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.includes('your_super_secret')) {
    errors.push('JWT_REFRESH_SECRET must be set to a secure custom secret in production.');
  }

  if (errors.length > 0) {
    console.error('\n======================================================');
    console.error('   [FATAL] PRODUCTION CONFIGURATION VALIDATION FAILED');
    errors.forEach((err) => console.error(`   - ${err}`));
    console.error('   Please set these variables in your hosting dashboard.');
    console.error('======================================================\n');
    process.exit(1);
  }
}

// Start Express Server only when executed directly (not when required in Jest tests)
if (process.env.NODE_ENV !== 'test' && !process.env.JEST_WORKER_ID) {
  validateProductionEnv();
  // Connect only when starting the server, not when importing the Express app in tests.
  connectDB();
  app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`   AI SMART HEALTHCARE BACKEND SERVER RUNNING`);
    console.log(`   URL: http://localhost:${PORT}`);
    console.log(`   API Docs: http://localhost:${PORT}/api-docs`);
    console.log(`======================================================\n`);
  });
}

export default app;
