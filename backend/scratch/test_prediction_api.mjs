import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function testApi() {
  const token = jwt.sign(
    { _id: '6aa955a63a51275a2c02a989' },
    process.env.JWT_ACCESS_SECRET || 'your_super_secret_access_key_12345!',
    { expiresIn: '1d' }
  );

  const res = await fetch('http://localhost:5000/api/predictions/diabetes/latest', {
    headers: { Authorization: `Bearer ${token}` }
  });

  const data = await res.json();
  console.log('Status code:', res.status);
  console.log('Response data:', {
    status: data.data?.status,
    missingDomain: data.data?.missingDomain,
    canCalculate: data.data?.canCalculate,
    featureAvailability: {
      hasDemographic: data.data?.featureAvailability?.hasDemographic,
      hasPhysical: data.data?.featureAvailability?.hasPhysical,
      hasLaboratory: data.data?.featureAvailability?.hasLaboratory,
    },
    availableFeatures: data.data?.featureAvailability?.availableFeatures,
    missingFeatures: data.data?.featureAvailability?.missingFeatures,
    inputFeatures: data.data?.inputFeatures,
  });
}

testApi().catch((e) => console.error(e));
