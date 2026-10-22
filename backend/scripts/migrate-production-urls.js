import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

async function migrate() {
  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected.');

  const reportsCol = mongoose.connection.collection('reports');
  const predictionsCol = mongoose.connection.collection('predictions');

  // 1. Update report fileUrl pointing to localhost or 127.0.0.1
  const reportsToUpdate = await reportsCol.find({
    fileUrl: { $regex: '^https?://(?:localhost|127\\.0\\.0\\.1)(?::\\d+)?' }
  }).toArray();

  console.log(`Found ${reportsToUpdate.length} reports with localhost fileUrl.`);
  for (const report of reportsToUpdate) {
    const newUrl = report.fileUrl.replace(
      /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/i,
      'https://medscan-backend-api.onrender.com'
    );
    await reportsCol.updateOne(
      { _id: report._id },
      { $set: { fileUrl: newUrl } }
    );
    console.log(`Updated report ${report._id}: ${report.fileUrl} -> ${newUrl}`);
  }

  // 2. Remove stale SERVICE_UNAVAILABLE or PREDICTION_SERVICE_UNAVAILABLE predictions
  const stalePredictions = await predictionsCol.deleteMany({
    status: { $in: ['SERVICE_UNAVAILABLE', 'PREDICTION_SERVICE_UNAVAILABLE', 'MODEL_UNAVAILABLE'] }
  });
  console.log(`Deleted ${stalePredictions.deletedCount} stale unavailable prediction records.`);

  // 3. For patient Tejas Nere (6aa278dba3b45cb76168bec3), trigger fresh calculations using live ML service
  const { Patient } = await import('../src/models/Patient.js');
  const { Report } = await import('../src/models/Report.js');
  const { triggerHypertensionRecalculation, triggerCkdRecalculation } = await import('../src/controllers/patientController.js');

  const patient = await Patient.findById('6aa278dba3b45cb76168bec3');
  if (patient) {
    console.log('Triggering fresh Hypertension and CKD calculations for Tejas Nere...');
    await triggerHypertensionRecalculation(patient._id, patient.user);
    await triggerCkdRecalculation(patient._id, patient.user);
    console.log('Recalculation complete.');
  }

  const newPredictions = await predictionsCol.find({ patient: patient._id }).toArray();
  console.log('Current predictions for Tejas Nere:');
  newPredictions.forEach(p => console.log(` - Disease: ${p.disease}, Status: ${p.status}, Probability: ${p.probability}`));

  await mongoose.disconnect();
  console.log('Migration finished successfully.');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
