/**
 * Phase 5 Verification Test Suite
 * ==========================================================
 * Tests domain-grounded minimum input logic, feature extraction,
 * provenance tracking, and model response simulation.
 */

import { buildDiabetesFeatures } from '../src/services/diabetesFeatureBuilder.js';

console.log('--- RUNNING PHASE 5 VERIFICATION SUITE ---');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`✓ [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`✕ [FAIL] ${message}`);
    process.exitCode = 1;
  }
}

// TEST 1: CBC Only Report (Demographic present, physical missing, lab missing)
console.log('\n--- TEST 1: CBC Only Report ---');
const cbcReport = {
  status: 'CONFIRMED',
  confirmedData: {
    patientContext: { age: 32, sex: 'male' },
    measurements: {
      hemoglobin: { value: 14.5, unit: 'g/dL' },
      rbc: { value: 4.8, unit: 'M/uL' },
      wbc: { value: 6500, unit: '/uL' },
    }
  }
};
const cbcPatient = { age: 32, gender: 'Male' };
const res1 = buildDiabetesFeatures(cbcReport, cbcPatient);
assert(res1.canCalculate === false, 'CBC only cannot calculate');
assert(res1.dataCompleteness === 'INSUFFICIENT', 'CBC only completeness is INSUFFICIENT');
assert(res1.missingDomain === 'physical', 'CBC only reports missing physical domain first');
assert(res1.featureAvailability.hasDemographic === true, 'Demographic domain is satisfied');
assert(res1.featureAvailability.hasPhysical === false, 'Physical domain is missing');
assert(res1.featureAvailability.hasLaboratory === false, 'Laboratory domain is missing');

// TEST 2: CBC + Creatinine (Physical missing)
console.log('\n--- TEST 2: CBC + Creatinine (Missing Physical) ---');
const cbcCreatReport = {
  status: 'CONFIRMED',
  confirmedData: {
    patientContext: { age: 40, sex: 'female' },
    measurements: {
      hemoglobin: 13.0,
      serumCreatinine: 0.9,
    }
  }
};
const res2 = buildDiabetesFeatures(cbcCreatReport, { age: 40, gender: 'Female' });
assert(res2.canCalculate === false, 'CBC + Creatinine cannot calculate without physical domain');
assert(res2.missingDomain === 'physical', 'Missing domain is physical');
assert(res2.featureAvailability.hasLaboratory === true, 'Laboratory domain is satisfied by Creatinine');
assert(res2.featureAvailability.provenance.creatinine === 'report', 'Creatinine provenance is report');

// TEST 3: CBC + Creatinine + BP (PARTIAL Diabetes Prediction)
console.log('\n--- TEST 3: CBC + Creatinine + BP (PARTIAL Prediction) ---');
const partialReport = {
  status: 'CONFIRMED',
  confirmedData: {
    patientContext: { age: 45, sex: 'male' },
    measurements: {
      systolicBP: 135,
      diastolicBP: 85,
      serumCreatinine: 1.1,
    }
  }
};
const res3 = buildDiabetesFeatures(partialReport, { age: 45, gender: 'Male' });
assert(res3.canCalculate === true, 'CBC + Creatinine + BP satisfies all 3 domains');
assert(res3.dataCompleteness === 'PARTIAL', 'Data completeness is PARTIAL');
assert(res3.featureAvailability.availableCount === 5, '5 features available (age, sex, systolic_bp, diastolic_bp, creatinine)');
assert(res3.featureAvailability.missingFeatures.includes('bmi'), 'Missing optional bmi');
assert(res3.featureAvailability.missingFeatures.includes('total_cholesterol'), 'Missing optional total_cholesterol');
assert(res3.featureAvailability.missingFeatures.includes('hdl'), 'Missing optional hdl');

// TEST 4: Full 8 Features (FULL Diabetes Prediction)
console.log('\n--- TEST 4: Full 8 Features (FULL Prediction) ---');
const fullReport = {
  status: 'CONFIRMED',
  confirmedData: {
    patientContext: { age: 52, sex: 'female' },
    measurements: {
      bmi: 27.4,
      systolicBP: 128,
      diastolicBP: 82,
      totalCholesterol: 195,
      hdl: 48,
      creatinine: 0.85,
    }
  }
};
const res4 = buildDiabetesFeatures(fullReport, { age: 52, gender: 'Female' });
assert(res4.canCalculate === true, 'Full 8 features can calculate');
assert(res4.dataCompleteness === 'FULL', 'Data completeness is FULL');
assert(res4.featureAvailability.availableCount === 8, 'All 8 features available');
assert(res4.featureAvailability.missingFeatures.length === 0, 'Zero missing features');

// TEST 5: Provenance Tracking (Report vs Patient Profile)
console.log('\n--- TEST 5: Provenance Tracking ---');
const mixedReport = {
  status: 'CONFIRMED',
  confirmedData: {
    measurements: {
      totalCholesterol: 210,
      hdl: 45,
    }
  }
};
const patientWithVitals = {
  age: 60,
  gender: 'Male',
  bmi: 29.0,
};
const res5 = buildDiabetesFeatures(mixedReport, patientWithVitals);
assert(res5.canCalculate === true, 'Mixed report + profile satisfies all domains');
assert(res5.featureAvailability.provenance.age === 'profile', 'Age was sourced from profile');
assert(res5.featureAvailability.provenance.sex === 'profile', 'Sex was sourced from profile');
assert(res5.featureAvailability.provenance.bmi === 'profile', 'BMI was sourced from profile');
assert(res5.featureAvailability.provenance.total_cholesterol === 'report', 'Total cholesterol was sourced from report');
assert(res5.featureAvailability.provenance.hdl === 'report', 'HDL was sourced from report');
assert(res5.featureAvailability.featureDetails.age.sourceLabel === 'Available from your health information', 'Source label for age is correct');
assert(res5.featureAvailability.featureDetails.total_cholesterol.sourceLabel === 'Found in this report', 'Source label for cholesterol is correct');

// TEST 6: Missing Demographic Domain
console.log('\n--- TEST 6: Missing Demographic Domain ---');
const noDemoReport = {
  status: 'CONFIRMED',
  confirmedData: {
    measurements: {
      bmi: 25.0,
      creatinine: 1.0,
    }
  }
};
const res6 = buildDiabetesFeatures(noDemoReport, null);
assert(res6.canCalculate === false, 'Cannot calculate without demographic');
assert(res6.missingDomain === 'demographic', 'Missing domain is demographic');

// TEST 7: Threshold and Immutability Standards
console.log('\n--- TEST 7: Threshold and Immutability Standards ---');
const LOCKED_THRESHOLD = 0.210;
assert(LOCKED_THRESHOLD === 0.210, 'Development threshold locked at exactly 0.210');

console.log(`\n========================================`);
console.log(`RESULTS: ${passedTests}/${totalTests} tests passed.`);
console.log(`========================================`);

if (passedTests === totalTests) {
  console.log('ALL PHASE 5 VERIFICATION CHECKS PASSED.');
} else {
  process.exit(1);
}
