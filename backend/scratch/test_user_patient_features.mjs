import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { Patient } from '../src/models/Patient.js';
import { Report } from '../src/models/Report.js';
import { buildDiabetesFeatures } from '../src/services/diabetesFeatureBuilder.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);

  const patient = await Patient.findById('6aa955a63a51275a2c02a98b');
  const report = await Report.findById('6aaa50e163f055c26527005e');

  console.log('Patient values:');
  console.log('  Age:', patient.age, 'Gender:', patient.gender, 'BMI:', patient.bmi, 'BP:', patient.systolicBP, patient.diastolicBP);

  console.log('\nRunning buildDiabetesFeatures:');
  const extraction = buildDiabetesFeatures(report, patient);
  console.log('  canCalculate:', extraction.canCalculate);
  console.log('  missingDomain:', extraction.missingDomain);
  console.log('  featureAvailability:');
  console.log('    hasDemographic:', extraction.featureAvailability.hasDemographic);
  console.log('    hasPhysical:', extraction.featureAvailability.hasPhysical);
  console.log('    hasLaboratory:', extraction.featureAvailability.hasLaboratory);
  console.log('  featureVector:', extraction.featureVector);

  await mongoose.disconnect();
}

check().catch(console.error);
