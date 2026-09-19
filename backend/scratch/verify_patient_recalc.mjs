import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { Patient } from '../src/models/Patient.js';
import { Report } from '../src/models/Report.js';
import { Prediction } from '../src/models/Prediction.js';
import { triggerDiabetesRecalculation } from '../src/controllers/patientController.js';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB connected to:', mongoose.connection.name);

  const patientId = '6aa955a63a51275a2c02a98b';
  const userId = '6aa955a63a51275a2c02a989';

  console.log('Triggering diabetes recalculation for user patient...');
  await triggerDiabetesRecalculation(patientId, userId);

  const updatedPred = await Prediction.findOne({
    patient: patientId,
    disease: 'diabetes',
  }).sort({ createdAt: -1 });

  console.log('Updated Prediction Record:');
  console.log({
    id: updatedPred._id,
    status: updatedPred.status,
    canCalculate: updatedPred.canCalculate,
    missingDomain: updatedPred.missingDomain,
    hasDemographic: updatedPred.featureAvailability?.hasDemographic,
    hasPhysical: updatedPred.featureAvailability?.hasPhysical,
    hasLaboratory: updatedPred.featureAvailability?.hasLaboratory,
    availableFeatures: updatedPred.featureAvailability?.availableFeatures,
    missingFeatures: updatedPred.featureAvailability?.missingFeatures,
    inputFeatures: updatedPred.inputFeatures,
  });

  await mongoose.disconnect();
  console.log('Done.');
}

run().catch(console.error);
