import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OcrViewerModal } from '../components/ocr/OcrViewerModal';

// Mock reportService
vi.mock('../services/reportService', () => ({
  reportService: {
    confirmReport: vi.fn().mockResolvedValue({ success: true }),
  },
}));

// Mock useToast
vi.mock('../hooks/useToast', () => ({
  useToast: () => ({
    addToast: vi.fn(),
  }),
}));

describe('OcrViewerModal Component Tests', () => {
  const pendingReport = {
    _id: 'report-pending-123',
    title: 'Verification Multi-Disease Panel',
    reportType: 'Metabolic Panel',
    status: 'PENDING_REVIEW',
    confidence: 94,
    uploadDate: '2026-10-22T06:00:00.000Z',
    fileUrl: 'http://localhost:5000/uploads/test.pdf',
    extractedData: {
      canonicalVitals: {
        fastingSugar: 105,
        systolicBP: 122,
        diastolicBP: 78,
        totalCholesterol: 190,
        serumCreatinine: 0.95,
      },
    },
  };

  it('renders correctly when report status is PENDING_REVIEW without crashing', () => {
    const handleClose = vi.fn();
    const handleConfirmed = vi.fn();

    render(
      <OcrViewerModal
        isOpen={true}
        onClose={handleClose}
        report={pendingReport}
        onReportConfirmed={handleConfirmed}
      />
    );

    expect(screen.getByText(/Medical Report — Verification Multi-Disease Panel/i)).toBeInTheDocument();
    expect(screen.getByText(/Action Needed: Medical Report Awaiting Confirmation/i)).toBeInTheDocument();
    expect(screen.getByText(/Confirm & Run AI Assessment/i)).toBeInTheDocument();
    expect(screen.getByText(/Pending Review — Values not yet confirmed into patient record/i)).toBeInTheDocument();
  });

  it('renders correctly when report status is CONFIRMED', () => {
    const confirmedReport = {
      ...pendingReport,
      status: 'CONFIRMED',
    };

    render(
      <OcrViewerModal
        isOpen={true}
        onClose={vi.fn()}
        report={confirmedReport}
        onReportConfirmed={vi.fn()}
      />
    );

    expect(screen.getByText(/Medical Report — Verification Multi-Disease Panel/i)).toBeInTheDocument();
    expect(screen.queryByText(/Action Needed: Medical Report Awaiting Confirmation/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Close Viewer/i)).toBeInTheDocument();
  });
});
