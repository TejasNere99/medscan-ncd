import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PatientDashboard } from '../pages/patient/PatientDashboard';
import { patientService } from '../services/patientService';
import { reportService } from '../services/reportService';
import { predictionService } from '../services/predictionService';

vi.mock('../hooks/useToast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('../components/ocr/ReportUploadModal', () => ({ ReportUploadModal: () => null }));
vi.mock('../components/ocr/OcrViewerModal', () => ({ OcrViewerModal: () => null }));
vi.mock('../components/relationships/CareTeamSection', () => ({ CareTeamSection: () => null }));

vi.mock('../services/patientService', () => ({
  patientService: {
    getMyProfile: vi.fn(),
    updateMyDemographics: vi.fn(),
    updatePatient: vi.fn(),
  },
}));
vi.mock('../services/reportService', () => ({
  reportService: { getReports: vi.fn(), deleteReport: vi.fn() },
}));
vi.mock('../services/predictionService', () => ({
  predictionService: {
    getLatestDiabetesPrediction: vi.fn(),
    getPredictionHistory: vi.fn(),
    getLatestHeartDiseasePrediction: vi.fn(),
    getHeartDiseasePredictionHistory: vi.fn(),
    getLatestHypertensionPrediction: vi.fn(),
    getLatestCkdPrediction: vi.fn(),
    predictHypertension: vi.fn(),
    predictCkd: vi.fn(),
  },
}));

describe('unified disease risk assessment cards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    patientService.getMyProfile.mockResolvedValue({
      data: {
        _id: 'synthetic-patient',
        age: 52,
        gender: 'Male',
        systolicBP: 140,
        diastolicBP: 90,
        user: { name: 'Synthetic Patient' },
      },
    });
    reportService.getReports.mockResolvedValue({ data: [] });
    predictionService.getLatestDiabetesPrediction.mockResolvedValue({ data: null });
    predictionService.getPredictionHistory.mockResolvedValue({ data: [] });
    predictionService.getLatestHeartDiseasePrediction.mockResolvedValue({ data: null });
    predictionService.getHeartDiseasePredictionHistory.mockResolvedValue({ data: [] });
    predictionService.getLatestHypertensionPrediction.mockResolvedValue({ data: null });
    predictionService.getLatestCkdPrediction.mockResolvedValue({ data: null });
  });

  it('renders all four risk assessment cards with identical layout and without additional disease labels or generate estimate buttons', async () => {
    render(
      <MemoryRouter>
        <PatientDashboard />
      </MemoryRouter>
    );

    expect(await screen.findByText('AI Health Risk Intelligence')).toBeInTheDocument();
    expect(screen.queryByText('Additional Disease Model Estimates')).not.toBeInTheDocument();
    expect(screen.queryByText('Generate estimate')).not.toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Diabetes Risk Assessment' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Heart Disease Risk Assessment' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Hypertension Risk Assessment' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Chronic Kidney Disease Risk Assessment' })).toBeInTheDocument();

    // Verify all four cards display Active AI badges
    const activeAiBadges = screen.getAllByText('Active AI');
    expect(activeAiBadges.length).toBeGreaterThanOrEqual(4);
  });

  it('displays calculated hypertension risk percentage and clinical guidance matching heart disease card style', async () => {
    predictionService.getLatestHypertensionPrediction.mockResolvedValue({
      data: {
        status: 'SUCCESS',
        canCalculate: true,
        probability: 0.365,
        riskCategory: 'POSITIVE_CLASSIFICATION_ESTIMATE',
        modelVersion: '1.0.0',
        threshold: 0.50,
        dataCompleteness: 'FULL',
        topContributingFactors: [
          { feature: 'systolic_bp', description: 'Resting systolic BP contributed toward higher estimated risk.', impact: 'higher' },
        ],
      },
    });

    render(
      <MemoryRouter>
        <PatientDashboard />
      </MemoryRouter>
    );

    expect(await screen.findByText('36.5%')).toBeInTheDocument();
    expect(screen.getByText('Model-estimated hypertension risk')).toBeInTheDocument();
    expect(screen.getByText('Elevated model risk')).toBeInTheDocument();
    expect(screen.getByText('NHANES development cohort')).toBeInTheDocument();
  });
});
