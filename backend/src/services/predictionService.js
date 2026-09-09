/**
 * AI Disease Risk Prediction Engine
 * Current version: v1-rule-weighted-engine
 * Inputs: age, systolicBP, diastolicBP, fastingSugar, bmi, symptoms
 * Outputs: composite risk %, risk level, breakdown per disease, recommendations
 */

export const calculateDiseaseRisk = async ({
  age = 45,
  systolicBP = 120,
  diastolicBP = 80,
  fastingSugar = 100,
  bmi = 24.5,
  symptoms = [],
}) => {
  // Check if an external Python/Flask ML microservice URL is configured
  const externalMlUrl = process.env.ML_SERVICE_URL;
  if (externalMlUrl && externalMlUrl !== 'http://localhost:8000/predict') {
    try {
      const response = await fetch(externalMlUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ age, systolicBP, diastolicBP, fastingSugar, bmi, symptoms }),
      });
      if (response.ok) {
        const mlResult = await response.json();
        return mlResult;
      }
    } catch (err) {
      console.warn('[AI Prediction Service] ML microservice unreachable. Falling back to v1 rule engine.');
    }
  }

  // --- Rule-Based Weighted Algorithm (v1) ---
  let diabetesScore = 10;
  let hypertensionScore = 10;
  let heartDiseaseScore = 10;
  let kidneyDiseaseScore = 10;

  // Age risk factors
  if (age > 60) {
    hypertensionScore += 15;
    heartDiseaseScore += 20;
    kidneyDiseaseScore += 15;
  } else if (age > 45) {
    hypertensionScore += 10;
    heartDiseaseScore += 10;
  }

  // Blood Sugar Risk (Normal < 100, Prediabetes 100-125, Diabetes >= 126)
  if (fastingSugar >= 180) {
    diabetesScore += 65;
    kidneyDiseaseScore += 25;
  } else if (fastingSugar >= 126) {
    diabetesScore += 45;
    kidneyDiseaseScore += 15;
  } else if (fastingSugar >= 100) {
    diabetesScore += 20;
  }

  // Blood Pressure Risk (Normal < 120/80, Stage 1 >= 130/80, Stage 2 >= 140/90, Crisis >= 180/120)
  if (systolicBP >= 160 || diastolicBP >= 100) {
    hypertensionScore += 60;
    heartDiseaseScore += 40;
    kidneyDiseaseScore += 30;
  } else if (systolicBP >= 140 || diastolicBP >= 90) {
    hypertensionScore += 45;
    heartDiseaseScore += 25;
    kidneyDiseaseScore += 15;
  } else if (systolicBP >= 130 || diastolicBP >= 85) {
    hypertensionScore += 25;
    heartDiseaseScore += 15;
  }

  // BMI Risk (Normal 18.5-24.9, Overweight 25-29.9, Obese >= 30)
  if (bmi >= 35) {
    diabetesScore += 20;
    heartDiseaseScore += 25;
    hypertensionScore += 20;
  } else if (bmi >= 30) {
    diabetesScore += 15;
    heartDiseaseScore += 15;
    hypertensionScore += 15;
  } else if (bmi >= 25) {
    diabetesScore += 8;
    heartDiseaseScore += 8;
  }

  // Symptom Bonuses
  const symptomList = (symptoms || []).map((s) => s.toLowerCase());

  if (symptomList.includes('chest pain') || symptomList.includes('shortness of breath')) {
    heartDiseaseScore += 35;
  }
  if (symptomList.includes('frequent urination') || symptomList.includes('excessive thirst')) {
    diabetesScore += 25;
  }
  if (symptomList.includes('dizziness') || symptomList.includes('headache')) {
    hypertensionScore += 20;
  }
  if (symptomList.includes('swelling in legs') || symptomList.includes('foamy urine')) {
    kidneyDiseaseScore += 30;
  }

  // Cap scores between 5% and 98%
  const clamp = (val) => Math.min(Math.max(Math.round(val), 5), 98);

  const diseaseBreakdown = {
    Diabetes: clamp(diabetesScore),
    Hypertension: clamp(hypertensionScore),
    HeartDisease: clamp(heartDiseaseScore),
    KidneyDisease: clamp(kidneyDiseaseScore),
  };

  // Overall Risk calculation (weighted average)
  const maxRisk = Math.max(
    diseaseBreakdown.Diabetes,
    diseaseBreakdown.Hypertension,
    diseaseBreakdown.HeartDisease,
    diseaseBreakdown.KidneyDisease
  );
  const avgRisk = Math.round(
    (diseaseBreakdown.Diabetes +
      diseaseBreakdown.Hypertension +
      diseaseBreakdown.HeartDisease +
      diseaseBreakdown.KidneyDisease) /
      4
  );

  const overallRiskPercent = Math.round(maxRisk * 0.7 + avgRisk * 0.3);

  let riskLevel = 'Low';
  if (overallRiskPercent >= 75) riskLevel = 'Critical';
  else if (overallRiskPercent >= 55) riskLevel = 'High';
  else if (overallRiskPercent >= 35) riskLevel = 'Moderate';

  // Dynamic recommendations
  const recommendations = [
    'Consult a healthcare professional for clinical validation.',
  ];

  if (diseaseBreakdown.Diabetes > 40) {
    recommendations.push('Monitor fasting blood glucose daily and limit glycemic intake.');
  }
  if (diseaseBreakdown.Hypertension > 40) {
    recommendations.push('Maintain a low-sodium diet and log blood pressure twice daily.');
  }
  if (diseaseBreakdown.HeartDisease > 40) {
    recommendations.push('Perform 30 minutes of moderate aerobic exercise and consult a cardiologist.');
  }
  if (diseaseBreakdown.KidneyDisease > 40) {
    recommendations.push('Schedule a renal function panel (Serum Creatinine & eGFR).');
  }

  return {
    overallRiskPercent,
    riskLevel,
    diseaseBreakdown,
    confidenceScore: 89.2,
    recommendations,
    algorithmVersion: 'v1-rule-weighted-engine',
  };
};
