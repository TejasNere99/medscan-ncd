import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { Patient } from '../src/models/Patient.js';
import { Report } from '../src/models/Report.js';
import { Prediction } from '../src/models/Prediction.js';
import { User } from '../src/models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);

  const patients = await Patient.find({}).sort({ updatedAt: -1 }).limit(3).lean();
  console.log('--- RECENT PATIENTS ---');
  for (const p of patients) {
    console.log(`Patient ID: ${p._id}, User: ${p.user}`);
    console.log(`  Age: ${p.age}, Gender: ${p.gender}`);
    console.log(`  BMI: ${p.bmi}, SystolicBP: ${p.systolicBP}, DiastolicBP: ${p.diastolicBP}`);
    console.log(`  FastingSugar: ${p.fastingSugar}, TotalCholesterol: ${p.totalCholesterol}, HDL: ${p.hdl}, Creatinine: ${p.serumCreatinine}`);

    const reports = await Report.find({ patient: p._id }).sort({ createdAt: -1 }).limit(3).lean();
    console.log(`  Reports (${reports.length}):`);
    for (const r of reports) {
      console.log(`    Report ID: ${r._id}, Title: ${r.title}, Status: ${r.status}`);
      console.log(`      confirmedData canonical:`, r.confirmedData ? Object.keys(r.confirmedData) : 'none');
      console.log(`      extractedData canonical:`, r.extractedData?.canonicalVitals ? Object.keys(r.extractedData.canonicalVitals) : 'none');
      if (r.confirmedData) {
        console.log(`      confirmedData values:`, {
          bmi: r.confirmedData.bmi,
          systolicBP: r.confirmedData.systolicBP,
          diastolicBP: r.confirmedData.diastolicBP,
        });
      }
    }

    const predictions = await Prediction.find({ patient: p._id }).sort({ createdAt: -1 }).limit(3).lean();
    console.log(`  Predictions (${predictions.length}):`);
    for (const pred of predictions) {
      console.log(`    Pred ID: ${pred._id}, Status: ${pred.status}, canCalculate: ${pred.canCalculate}, disease: ${pred.disease}`);
      console.log(`      featureAvailability:`, pred.featureAvailability);
      console.log(`      missingDomain:`, pred.missingDomain);
      console.log(`      inputFeatures:`, pred.inputFeatures);
    }
  }

  await mongoose.disconnect();
}

check().catch(console.error);
