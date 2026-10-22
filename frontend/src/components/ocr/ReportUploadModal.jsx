import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Eye,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sparkles,
  Activity,
  Moon,
  Sun,
  TrendingUp,
  Code2,
  Edit3,
  Undo2,
  Save,
  Check,
} from 'lucide-react';
import { reportService } from '../../services/reportService';
import { useToast } from '../../hooks/useToast';

export const ReportUploadModal = ({ isOpen, onClose, patientId, onReportUploaded }) => {
  const { addToast } = useToast();

  // Step state: 'upload' | 'review'
  const [step, setStep] = useState('upload');

  // Step 1 Form state
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [reportType, setReportType] = useState('General Laboratory Report');
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('');

  // Step 2 Review state
  const [uploadedReport, setUploadedReport] = useState(null);
  const [extractedDoc, setExtractedDoc] = useState(null);
  const [rawOcrText, setRawOcrText] = useState('');
  const [showRawText, setShowRawText] = useState(false);
  const [showDebugJson, setShowDebugJson] = useState(false);
  const [activeAbpmTab, setActiveAbpmTab] = useState('overall'); // 'overall' | 'wake' | 'sleep' | 'indicators'

  // Confirmed form state
  const [confirmedForm, setConfirmedForm] = useState({
    fastingSugar: '',
    systolicBP: '',
    diastolicBP: '',
    heartRate: '',
    totalCholesterol: '',
    hdl: '',
    serumCreatinine: '',
    bloodUrea: '',
    hemoglobin: '',
    bmi: '',
  });
  const [bloodUreaUnit, setBloodUreaUnit] = useState('');
  const [initialOcrUnits, setInitialOcrUnits] = useState({});

  // Pristine machine OCR extraction snapshot for provenance tracking and comparison
  const [initialOcrValues, setInitialOcrValues] = useState({});
  const [savingField, setSavingField] = useState({});
  const [savedPendingField, setSavedPendingField] = useState({});

  const [confirming, setConfirming] = useState(false);

  const resetModal = () => {
    setStep('upload');
    setFile(null);
    setTitle('');
    setReportType('General Laboratory Report');
    setLoading(false);
    setLoadingStage('');
    setUploadedReport(null);
    setExtractedDoc(null);
    setRawOcrText('');
    setShowRawText(false);
    setShowDebugJson(false);
    setActiveAbpmTab('overall');
    setConfirmedForm({
      fastingSugar: '',
      systolicBP: '',
      diastolicBP: '',
      heartRate: '',
      totalCholesterol: '',
      hdl: '',
      serumCreatinine: '',
      bloodUrea: '',
      hemoglobin: '',
      bmi: '',
    });
    setBloodUreaUnit('');
    setInitialOcrUnits({});
    setInitialOcrValues({});
    setSavingField({});
    setSavedPendingField({});
    setConfirming(false);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      const validExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.pdf'];
      const ext = selected.name.substring(selected.name.lastIndexOf('.')).toLowerCase();

      if (!validExtensions.includes(ext)) {
        addToast('Unsupported file format. Please upload a PNG, JPG, JPEG, WEBP, or PDF medical report.', 'error');
        return;
      }

      if (selected.size > 10 * 1024 * 1024) {
        addToast('File size exceeds 10MB limit. Please upload a smaller document.', 'error');
        return;
      }

      setFile(selected);
      if (!title) {
        setTitle(selected.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  // Step 1: Upload & OCR execution
  const handleUploadAndProcess = async (e) => {
    e.preventDefault();
    if (!file) {
      addToast('Please select a medical report document to upload.', 'warning');
      return;
    }

    setLoading(true);
    setLoadingStage('Uploading document to secure storage...');

    try {
      const formData = new FormData();
      formData.append('report', file);
      formData.append('title', title);
      formData.append('reportType', reportType);
      if (patientId) formData.append('patientId', patientId);

      setTimeout(() => setLoadingStage('Processing OCR & Document Understanding...'), 1200);
      setTimeout(() => setLoadingStage('Reconstructing clinical tables & sections...'), 2800);

      const res = await reportService.uploadReport(formData);
      const report = res.data?.report;
      const ocr = res.data?.ocr;

      if (!report) {
        throw new Error('Report data missing from server response.');
      }

      const doc = ocr?.extractedData || report?.extractedData || {};
      const canonical = doc.canonicalVitals || ocr?.structuredData || report?.structuredData || {};

      setUploadedReport(report);
      setExtractedDoc(doc);
      setRawOcrText(ocr?.rawText || report?.rawOcrText || '');

      /**
       * Safely converts a canonical vital entry to a display string.
       * Handles three shapes:
       *   { value: 12.5, unit: 'g/dL' }  → "12.5"
       *   12.5 (plain number)             → "12.5"
       *   null | undefined | ''           → ''  (blank — not recorded)
       *
       * IMPORTANT: String(null) === "null" which would fail numeric validation.
       * We must guard against null/undefined before calling String().
       */
      const safeVitalStr = (entry) => {
        if (entry === null || entry === undefined || entry === '') return '';
        if (typeof entry === 'object') {
          const v = entry.value;
          if (v === null || v === undefined || v === '') return '';
          return String(v);
        }
        return String(entry);
      };

      // Populate review form with detected canonical vitals (missing remain '')
      const initialSnapshot = {
        fastingSugar: safeVitalStr(canonical.fastingSugar ?? canonical.fastingGlucose),
        systolicBP: safeVitalStr(canonical.systolicBP),
        diastolicBP: safeVitalStr(canonical.diastolicBP),
        heartRate: safeVitalStr(canonical.heartRate),
        totalCholesterol: safeVitalStr(canonical.totalCholesterol ?? canonical.cholesterol),
        hdl: safeVitalStr(canonical.hdl ?? canonical.hdlCholesterol),
        serumCreatinine: safeVitalStr(canonical.serumCreatinine ?? canonical.creatinine),
        bloodUrea: safeVitalStr(canonical.bloodUrea),
        hemoglobin: safeVitalStr(canonical.hemoglobin),
        bmi: safeVitalStr(canonical.bmi),
      };

      setInitialOcrValues(initialSnapshot);
      setConfirmedForm(initialSnapshot);
      const originalBloodUreaUnit = canonical.bloodUrea?.unit || doc.measurements?.bloodUrea?.unit || '';
      setBloodUreaUnit(originalBloodUreaUnit);
      setInitialOcrUnits({ bloodUrea: originalBloodUreaUnit });

      setStep('review');
      addToast('Medical document understanding complete. Please review and correct any values.', 'info');
    } catch (err) {
      addToast(err.response?.data?.message || err.message || 'Report upload and processing failed.', 'error');
    } finally {
      setLoading(false);
      setLoadingStage('');
    }
  };

  const handleFieldChange = (field, val) => {
    setConfirmedForm((prev) => ({ ...prev, [field]: val }));
  };

  // Human-in-the-Loop: Saves pending correction to server without confirming report
  const handleSaveFieldCorrection = async (field, val, unit) => {
    if (!uploadedReport?._id) return;
    if (val === '' || val === null || val === undefined) return;

    const validation = getFieldValidation(field, String(val), unit);
    if (validation?.type === 'INVALID') {
      addToast(`Invalid value: ${validation.text}`, 'error');
      return;
    }

    setSavingField((prev) => ({ ...prev, [field]: true }));
    try {
      const res = await reportService.updateExtractedData(uploadedReport._id, {
        [field]: { value: Number(val), unit },
      });
      if (res.data?.report) {
        setUploadedReport(res.data.report);
      }
      setSavedPendingField((prev) => ({ ...prev, [field]: true }));
      addToast(`Saved pending correction for ${field}.`, 'success');
      setTimeout(() => {
        setSavedPendingField((prev) => ({ ...prev, [field]: false }));
      }, 2500);
    } catch (err) {
      addToast(err.response?.data?.message || err.message || `Failed to update ${field}.`, 'error');
    } finally {
      setSavingField((prev) => ({ ...prev, [field]: false }));
    }
  };

  const handleRevertField = async (field, unit) => {
    const orig = initialOcrValues[field];
    const targetVal = orig !== undefined ? orig : '';
    const revertUnit = field === 'bloodUrea' ? (initialOcrUnits.bloodUrea || '') : unit;
    setConfirmedForm((prev) => ({ ...prev, [field]: targetVal }));
    if (field === 'bloodUrea') setBloodUreaUnit(initialOcrUnits.bloodUrea || '');
    if (uploadedReport?._id && targetVal !== '') {
      await handleSaveFieldCorrection(field, targetVal, revertUnit);
    }
    addToast(`Reverted ${field} to original OCR value (${targetVal || 'None'}).`, 'info');
  };

  // Value warning helper (Three-tier validation: VALID, WARNING, INVALID)
  const getFieldValidation = (field, valStr, unit = null) => {
    if (!valStr || String(valStr).trim() === '') return null;
    const num = Number(valStr);
    if (isNaN(num)) return { type: 'INVALID', text: 'Must be a numeric value.' };
    if (num < 0) return { type: 'INVALID', text: 'Value cannot be negative.' };

    switch (field) {
      case 'fastingSugar':
        if (num > 400) return { type: 'WARNING', text: 'Unusually high glucose (>400 mg/dL). Verify against report.' };
        if (num < 40) return { type: 'WARNING', text: 'Unusually low glucose (<40 mg/dL). Verify against report.' };
        return null;
      case 'systolicBP':
        if (num > 220) return { type: 'WARNING', text: 'Unusually high systolic BP (>220 mmHg). Verify against report.' };
        if (num < 65) return { type: 'WARNING', text: 'Unusually low systolic BP (<65 mmHg). Verify against report.' };
        return null;
      case 'diastolicBP':
        if (num > 130) return { type: 'WARNING', text: 'Unusually high diastolic BP (>130 mmHg). Verify against report.' };
        if (num < 40) return { type: 'WARNING', text: 'Unusually low diastolic BP (<40 mmHg). Verify against report.' };
        return null;
      case 'heartRate':
        if (num > 200 || num < 35) return { type: 'WARNING', text: 'Unusual heart rate. Verify against report.' };
        return null;
      case 'totalCholesterol':
        if (num > 450) return { type: 'WARNING', text: 'Elevated cholesterol (>450 mg/dL). Verify against report.' };
        if (num < 70) return { type: 'WARNING', text: 'Unusually low cholesterol (<70 mg/dL). Verify against report.' };
        return null;
      case 'hdl':
        if (num > 150) return { type: 'WARNING', text: 'Unusually high HDL (>150 mg/dL). Verify against report.' };
        if (num < 15) return { type: 'WARNING', text: 'Unusually low HDL (<15 mg/dL). Verify against report.' };
        return null;
      case 'serumCreatinine':
        if (num > 15) return { type: 'WARNING', text: 'Elevated creatinine (>15 mg/dL). Verify against report.' };
        if (num < 0.2) return { type: 'WARNING', text: 'Unusually low creatinine (<0.2 mg/dL). Verify against report.' };
        return null;
      case 'bloodUrea': {
        if (!['mg/dL', 'mmol/L'].includes(unit)) return { type: 'INVALID', text: 'Select the reported blood urea unit.' };
        const ureaValue = unit === 'mmol/L' ? num * 6.006 : num;
        if (ureaValue > 300) return { type: 'WARNING', text: 'Unusually high blood urea. Verify against the original report.' };
        if (ureaValue < 5) return { type: 'WARNING', text: 'Unusually low blood urea. Verify against the original report.' };
        return null;
      }
      case 'hemoglobin':
        if (num > 22 || num < 4) return { type: 'WARNING', text: 'Extreme hemoglobin value. Verify against report.' };
        return null;
      case 'bmi':
        if (num > 60 || num < 10) return { type: 'WARNING', text: 'Extreme BMI reading. Verify against report.' };
        return null;
      default:
        return null;
    }
  };

  // Step 2: Confirm & Save
  const handleConfirmReport = async () => {
    if (!uploadedReport?._id) {
      addToast('No active report session found to confirm.', 'error');
      return;
    }

    // Check for any INVALID fields
    for (const [key, val] of Object.entries(confirmedForm)) {
      const valStatus = getFieldValidation(key, val, key === 'bloodUrea' ? bloodUreaUnit : null);
      if (valStatus?.type === 'INVALID') {
        addToast(`Please correct invalid value for ${key}: ${valStatus.text}`, 'error');
        return;
      }
    }

    setConfirming(true);
    try {
      // Build confirmed payload preserving rich structures
      const payload = {
        canonicalVitals: {},
        measurements: extractedDoc?.measurements || {},
        hypertensionIndicators: extractedDoc?.hypertensionIndicators || null,
        document: extractedDoc?.document || null,
        patientContext: extractedDoc?.patientContext || null,
      };

      Object.entries(confirmedForm).forEach(([k, v]) => {
        if (v !== '' && v !== null && v !== undefined) {
          const value = k === 'bloodUrea' ? { value: Number(v), unit: bloodUreaUnit } : Number(v);
          payload[k] = value;
          payload.canonicalVitals[k] = value;
        }
      });

      const res = await reportService.confirmReport(uploadedReport._id, payload);
      addToast('Medical report confirmed and saved to your health profile!', 'success');

      if (onReportUploaded) {
        onReportUploaded(res.data);
      }
      handleClose();
    } catch (err) {
      addToast(err.response?.data?.message || err.message || 'Failed to confirm report.', 'error');
    } finally {
      setConfirming(false);
    }
  };

  const isAbpm = extractedDoc?.document?.reportType?.value === 'ambulatory_blood_pressure_monitoring' || Boolean(extractedDoc?.measurements?.bloodPressure?.overall?.average);
  const isCbc = extractedDoc?.document?.reportType?.value === 'complete_blood_count' || Boolean(extractedDoc?.measurements?.rbcCount || extractedDoc?.measurements?.plateletCount);
  const docType = extractedDoc?.document?.reportType?.value ? extractedDoc.document.reportType.value.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'Clinical Report';
  const docConfidence = extractedDoc?.document?.reportType?.confidence ? Math.round(extractedDoc.document.reportType.confidence * 100) : 90;
  const patientContext = extractedDoc?.patientContext || {};

  const abpmBp = extractedDoc?.measurements?.bloodPressure || {};
  const abpmInd = extractedDoc?.hypertensionIndicators || {};
  const abpmHr = extractedDoc?.measurements?.heartRate?.overallAverage || {};

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={step === 'upload' ? 'Upload Medical Report' : 'Review & Confirm Medical Data'}
      maxWidth={step === 'upload' ? 'max-w-lg' : 'max-w-4xl'}
    >
      {step === 'upload' ? (
        /* STEP 1: UPLOAD FORM */
        <form onSubmit={handleUploadAndProcess} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">Report Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Annual Metabolic Panel or Sentinel ABPM"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">Report Category</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:border-brand-500 focus:outline-none"
            >
              <option value="General Laboratory Report">General Laboratory Report</option>
              <option value="Ambulatory Blood Pressure Monitoring">Ambulatory Blood Pressure Monitoring (ABPM)</option>
              <option value="Metabolic Panel">Metabolic Panel / Diabetes</option>
              <option value="Lipid Profile">Lipid Profile</option>
              <option value="Complete Blood Count">Complete Blood Count (CBC)</option>
              <option value="Renal Function">Renal Function Profile</option>
              <option value="Other">Other Diagnostic Report</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Select Document Image or PDF
            </label>
            <div className="border-2 border-dashed border-slate-800 hover:border-brand-500/50 rounded-2xl p-6 text-center cursor-pointer transition-all bg-slate-950/60 relative">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,application/pdf"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              {file ? (
                <div className="flex flex-col items-center text-emerald-400">
                  <CheckCircle2 className="w-8 h-8 mb-2" />
                  <span className="text-xs font-bold text-white">{file.name}</span>
                  <span className="text-[10px] text-slate-400 mt-1">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB • Ready for scanning
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center text-slate-400">
                  <Upload className="w-8 h-8 mb-2 text-brand-400" />
                  <span className="text-xs font-semibold text-slate-200">
                    Click to browse or drag & drop report here
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1">
                    Supported: PNG, JPG, JPEG, WEBP, and PDF up to 10MB
                  </span>
                </div>
              )}
            </div>
          </div>

          {loading && (
            <div className="p-3.5 rounded-xl bg-cyan-50 border border-cyan-300 flex items-center space-x-3">
              <div className="w-4 h-4 rounded-full border-2 border-cyan-700 border-t-transparent animate-spin shrink-0" />
              <div className="text-xs text-cyan-900 font-bold">{loadingStage}</div>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !file}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-brand-500 to-cyan-500 hover:from-brand-600 hover:to-cyan-600 shadow-lg shadow-brand-500/20 flex items-center space-x-2 disabled:opacity-50"
            >
              <FileText className="w-4 h-4" />
              <span>{loading ? 'Processing Document...' : 'Upload & Run OCR'}</span>
            </button>
          </div>
        </form>
      ) : (
        /* STEP 2: REVIEW & CONFIRM FORM */
        <div className="space-y-5">
          {/* Document Intelligence Header */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h4 className="text-xs font-bold text-white">{docType}</h4>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-100/70 text-cyan-800 border border-cyan-300 font-bold">
                    {docConfidence}% Confidence
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {(() => {
                    const rawAge = typeof patientContext.age === 'object' && patientContext.age !== null ? patientContext.age.value : patientContext.age;
                    const rawSex = typeof patientContext.sex === 'object' && patientContext.sex !== null ? patientContext.sex.value : patientContext.sex;
                    const ageUnit = (typeof patientContext.age === 'object' && patientContext.age?.unit) || patientContext.ageUnit || 'years';
                    if (!rawAge && !rawSex) return null;
                    return (
                      <span className="text-cyan-800 font-bold mr-1.5">
                        Patient: {rawAge ? `Age ${rawAge} ${ageUnit}` : ''}
                        {rawAge && rawSex ? ' • ' : ''}
                        {rawSex ? `Sex: ${String(rawSex).charAt(0).toUpperCase() + String(rawSex).slice(1)}` : ''} •
                      </span>
                    );
                  })()}
                  Extracted via Medical Intelligence Layer • Review values before confirming
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setShowRawText(!showRawText)}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 flex items-center space-x-1"
              >
                <Eye className="w-3.5 h-3.5 text-slate-400" />
                <span>{showRawText ? 'Hide OCR' : 'View Raw OCR'}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowDebugJson(!showDebugJson)}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-slate-900 hover:bg-slate-800 text-cyan-800 border border-slate-700 flex items-center space-x-1"
              >
                <Code2 className="w-3.5 h-3.5 text-cyan-700" />
                <span>{showDebugJson ? 'Hide JSON' : 'JSON Preview'}</span>
              </button>
            </div>
          </div>

          {/* Raw OCR Collapsible Panel */}
          {showRawText && (
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-slate-300">Original OCR Output (Unedited)</span>
                <span className="text-slate-500">Immutable for audit compliance</span>
              </div>
              <textarea
                readOnly
                value={rawOcrText || 'No raw OCR text available.'}
                rows={5}
                className="w-full bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-[11px] font-mono text-slate-300 focus:outline-none resize-y"
              />
            </div>
          )}

          {/* Debug JSON Collapsible Panel */}
          {showDebugJson && (
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-cyan-500/20 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-cyan-800">Structured Medical JSON (Intelligence Layer Output)</span>
                <span className="text-slate-500">Technical view</span>
              </div>
              <pre className="w-full max-h-48 overflow-auto bg-stone-100 border border-stone-200 rounded-xl p-3 text-[11px] font-mono text-slate-900 font-medium">
                {JSON.stringify(extractedDoc, null, 2)}
              </pre>
            </div>
          )}

          {/* IF ABPM REPORT: TABBED / SECTIONAL MEDICAL INTELLIGENCE VIEW */}
          {isAbpm ? (
            <div className="space-y-4">
              {/* Navigation Switcher */}
              <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-2">
                {[
                  { id: 'overall', label: '24h Overall Summary', icon: Activity },
                  { id: 'wake', label: 'Wake Periods (Day)', icon: Sun },
                  { id: 'sleep', label: 'Sleep Periods (Night)', icon: Moon },
                  { id: 'indicators', label: 'Hypertension Indicators', icon: TrendingUp },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const active = activeAbpmTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveAbpmTab(tab.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all ${
                        active
                          ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                          : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* TAB 1: OVERALL SUMMARY */}
              {activeAbpmTab === 'overall' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <p className="text-[10px] uppercase font-bold text-slate-500">24h Average BP</p>
                      <p className="text-base font-black text-white mt-0.5">
                        {abpmBp.overall?.average?.systolic?.value || '--'} / {abpmBp.overall?.average?.diastolic?.value || '--'} <span className="text-xs font-normal text-slate-400">mmHg</span>
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <p className="text-[10px] uppercase font-bold text-slate-500">Mean Arterial Press.</p>
                      <p className="text-base font-black text-white mt-0.5">
                        {extractedDoc?.measurements?.map?.overallAverage?.value || '--'} <span className="text-xs font-normal text-slate-400">mmHg</span>
                      </p>
                      {extractedDoc?.measurements?.map?.overallAverage?.standardDeviation && (
                        <p className="text-[10px] text-slate-400">SD: {extractedDoc.measurements.map.overallAverage.standardDeviation}</p>
                      )}
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <p className="text-[10px] uppercase font-bold text-slate-500">Pulse Pressure</p>
                      <p className="text-base font-black text-white mt-0.5">
                        {extractedDoc?.measurements?.pulsePressure?.overallAverage?.value || '--'} <span className="text-xs font-normal text-slate-400">mmHg</span>
                      </p>
                      {extractedDoc?.measurements?.pulsePressure?.overallAverage?.standardDeviation && (
                        <p className="text-[10px] text-slate-400">SD: {extractedDoc.measurements.pulsePressure.overallAverage.standardDeviation}</p>
                      )}
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <p className="text-[10px] uppercase font-bold text-slate-500">Average Heart Rate</p>
                      <p className="text-base font-black text-white mt-0.5">
                        {abpmHr.value || confirmedForm.heartRate || '--'} <span className="text-xs font-normal text-slate-400">BPM</span>
                      </p>
                      {abpmHr.standardDeviation && (
                        <p className="text-[10px] text-slate-400">SD: {abpmHr.standardDeviation}</p>
                      )}
                    </div>
                  </div>

                  {/* Detailed Overall Statistics Table */}
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 overflow-x-auto">
                    <table className="w-full text-[11px] text-left">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-500 uppercase">
                          <th className="py-1.5 font-bold">Parameter</th>
                          <th className="py-1.5 font-bold">Hourly Avg</th>
                          <th className="py-1.5 font-bold">Std Dev</th>
                          <th className="py-1.5 font-bold">Min</th>
                          <th className="py-1.5 font-bold">Max</th>
                          <th className="py-1.5 font-bold">Dipping</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono">
                        <tr>
                          <td className="py-2 text-slate-300 font-sans font-bold">Systolic (mmHg)</td>
                          <td className="py-2 text-white font-bold">{abpmBp.overall?.systolic?.average ?? '--'}</td>
                          <td className="py-2 text-slate-400">{abpmBp.overall?.systolic?.standardDeviation ?? '--'}</td>
                          <td className="py-2 text-slate-400">{abpmBp.overall?.systolic?.minimum ?? '--'}</td>
                          <td className="py-2 text-slate-400">{abpmBp.overall?.systolic?.maximum ?? '--'}</td>
                          <td className="py-2 text-cyan-400">{abpmInd.systolicDippingPercent ? `${abpmInd.systolicDippingPercent}%` : '--'}</td>
                        </tr>
                        <tr>
                          <td className="py-2 text-slate-300 font-sans font-bold">Diastolic (mmHg)</td>
                          <td className="py-2 text-white font-bold">{abpmBp.overall?.diastolic?.average ?? '--'}</td>
                          <td className="py-2 text-slate-400">{abpmBp.overall?.diastolic?.standardDeviation ?? '--'}</td>
                          <td className="py-2 text-slate-400">{abpmBp.overall?.diastolic?.minimum ?? '--'}</td>
                          <td className="py-2 text-slate-400">{abpmBp.overall?.diastolic?.maximum ?? '--'}</td>
                          <td className="py-2 text-cyan-400">{abpmInd.diastolicDippingPercent ? `${abpmInd.diastolicDippingPercent}%` : '--'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 2: WAKE PERIODS */}
              {activeAbpmTab === 'wake' && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                      <Sun className="w-4 h-4 text-amber-400" />
                      <span>Wake Periods Summary (07:00 - 22:59)</span>
                    </span>
                    <span className="text-xs font-black text-amber-300 font-mono">
                      Avg: {abpmBp.wake?.average?.systolic ?? '--'} / {abpmBp.wake?.average?.diastolic ?? '--'} mmHg
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-900/80">
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Wake Systolic Avg</p>
                      <p className="text-sm font-bold text-white mt-0.5">{abpmBp.wake?.systolic?.average ?? '--'} mmHg</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">SD: {abpmBp.wake?.systolic?.standardDeviation ?? '--'} • Range: {abpmBp.wake?.systolic?.minimum ?? '--'}-{abpmBp.wake?.systolic?.maximum ?? '--'}</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900/80">
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Wake Diastolic Avg</p>
                      <p className="text-sm font-bold text-white mt-0.5">{abpmBp.wake?.diastolic?.average ?? '--'} mmHg</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">SD: {abpmBp.wake?.diastolic?.standardDeviation ?? '--'} • Range: {abpmBp.wake?.diastolic?.minimum ?? '--'}-{abpmBp.wake?.diastolic?.maximum ?? '--'}</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900/80">
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Systolic &gt; 135 Load</p>
                      <p className="text-sm font-bold text-rose-400 mt-0.5">{abpmBp.wake?.loadAboveThreshold?.systolicPercent ? `${abpmBp.wake.loadAboveThreshold.systolicPercent}%` : '--'}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Time above threshold</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900/80">
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Diastolic &gt; 85 Load</p>
                      <p className="text-sm font-bold text-rose-400 mt-0.5">{abpmBp.wake?.loadAboveThreshold?.diastolicPercent ? `${abpmBp.wake.loadAboveThreshold.diastolicPercent}%` : '--'}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Time above threshold</p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: SLEEP PERIODS */}
              {activeAbpmTab === 'sleep' && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                      <Moon className="w-4 h-4 text-indigo-400" />
                      <span>Sleep Periods Summary (23:00 - 06:59)</span>
                    </span>
                    <span className="text-xs font-black text-indigo-300 font-mono">
                      Avg: {abpmBp.sleep?.average?.systolic ?? '--'} / {abpmBp.sleep?.average?.diastolic ?? '--'} mmHg
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-900/80">
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Sleep Systolic Avg</p>
                      <p className="text-sm font-bold text-white mt-0.5">{abpmBp.sleep?.systolic?.average ?? '--'} mmHg</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">SD: {abpmBp.sleep?.systolic?.standardDeviation ?? '--'} • Range: {abpmBp.sleep?.systolic?.minimum ?? '--'}-{abpmBp.sleep?.systolic?.maximum ?? '--'}</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900/80">
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Sleep Diastolic Avg</p>
                      <p className="text-sm font-bold text-white mt-0.5">{abpmBp.sleep?.diastolic?.average ?? '--'} mmHg</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">SD: {abpmBp.sleep?.diastolic?.standardDeviation ?? '--'} • Range: {abpmBp.sleep?.diastolic?.minimum ?? '--'}-{abpmBp.sleep?.diastolic?.maximum ?? '--'}</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900/80">
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Systolic &gt; 120 Load</p>
                      <p className="text-sm font-bold text-rose-400 mt-0.5">{abpmBp.sleep?.loadAboveThreshold?.systolicPercent ? `${abpmBp.sleep.loadAboveThreshold.systolicPercent}%` : '--'}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Nocturnal threshold</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900/80">
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Diastolic &gt; 70 Load</p>
                      <p className="text-sm font-bold text-rose-400 mt-0.5">{abpmBp.sleep?.loadAboveThreshold?.diastolicPercent ? `${abpmBp.sleep.loadAboveThreshold.diastolicPercent}%` : '--'}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Nocturnal threshold</p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: HYPERTENSION INDICATORS */}
              {activeAbpmTab === 'indicators' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Systolic Dipping</p>
                    <p className="text-base font-black text-emerald-400 mt-0.5">{abpmInd.systolicDippingPercent ? `${abpmInd.systolicDippingPercent}%` : '--'}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">10-20% indicates normal dipper</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Diastolic Dipping</p>
                    <p className="text-base font-black text-emerald-400 mt-0.5">{abpmInd.diastolicDippingPercent ? `${abpmInd.diastolicDippingPercent}%` : '--'}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Nocturnal pressure drop</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">AASI Stiffness Index</p>
                    <p className="text-base font-black text-white mt-0.5">{abpmInd.aasi ?? '--'}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Ambulatory arterial stiffness</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Morning Surge (MSI)</p>
                    <p className="text-base font-black text-white mt-0.5">{abpmInd.msi ?? '--'}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Morning blood pressure surge</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">24h Systolic Load</p>
                    <p className="text-base font-black text-rose-400 mt-0.5">{abpmInd.systolicLoadPercent ? `${abpmInd.systolicLoadPercent}%` : '--'}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Readings above normal limit</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">24h Diastolic Load</p>
                    <p className="text-base font-black text-rose-400 mt-0.5">{abpmInd.diastolicLoadPercent ? `${abpmInd.diastolicLoadPercent}%` : '--'}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Readings above normal limit</p>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {/* COMPLETE BLOOD COUNT (CBC) STRUCTURED INTELLIGENCE PANEL */}
          {isCbc && extractedDoc?.measurements ? (
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                  <Activity className="w-4 h-4 text-brand-400" />
                  <span>Complete Blood Count Intelligence (Extracted Parameters)</span>
                </span>
                <span className="text-[11px] text-cyan-400 font-bold">
                  {Object.keys(extractedDoc.measurements).length} Parameters Detected
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { key: 'hemoglobin', label: 'Hemoglobin (Hb)', defaultUnit: 'g/dL' },
                  { key: 'rbcCount', label: 'Total RBC Count', defaultUnit: 'mill/cumm' },
                  { key: 'wbcCount', label: 'Total WBC Count', defaultUnit: 'cumm' },
                  { key: 'plateletCount', label: 'Platelet Count', defaultUnit: 'cumm' },
                  { key: 'neutrophils', label: 'Neutrophils', defaultUnit: '%' },
                  { key: 'lymphocytes', label: 'Lymphocytes', defaultUnit: '%' },
                  { key: 'eosinophils', label: 'Eosinophils', defaultUnit: '%' },
                  { key: 'monocytes', label: 'Monocytes', defaultUnit: '%' },
                  { key: 'basophils', label: 'Basophils', defaultUnit: '%' },
                  { key: 'pcv', label: 'PCV (Hematocrit)', defaultUnit: '%' },
                  { key: 'mcv', label: 'MCV', defaultUnit: 'fL' },
                  { key: 'mch', label: 'MCH', defaultUnit: 'pg' },
                  { key: 'mchc', label: 'MCHC', defaultUnit: 'g/dL' },
                  { key: 'rdw', label: 'RDW', defaultUnit: '%' },
                ].map(({ key, label, defaultUnit }) => {
                  const item = extractedDoc.measurements[key];
                  if (!item) return null;
                  return (
                    <div key={key} className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] text-slate-400 font-bold uppercase truncate">{label}</p>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                          {item.source?.section || 'CBC'}
                        </span>
                      </div>
                      <p className="text-sm font-extrabold text-white mt-1">
                        {item.value} <span className="text-xs font-normal text-slate-400">{item.unit || defaultUnit}</span>
                      </p>
                      {item.warning && (
                        <p className="text-[10px] text-amber-400 mt-0.5">{item.warning}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* EDITABLE CONFIRMED HEALTH SNAPSHOT VITALS */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-brand-400" />
                <span>Confirmed Vitals for Patient Profile</span>
              </h4>
              <span className="text-[11px] text-slate-400">Values can be edited before confirmation</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { key: 'systolicBP', label: 'Systolic BP', unit: 'mmHg' },
                { key: 'diastolicBP', label: 'Diastolic BP', unit: 'mmHg' },
                { key: 'heartRate', label: 'Heart Rate', unit: 'BPM' },
                { key: 'fastingSugar', label: 'Fasting Glucose', unit: 'mg/dL' },
                { key: 'totalCholesterol', label: 'Total Cholesterol', unit: 'mg/dL' },
                { key: 'hdl', label: 'HDL Cholesterol', unit: 'mg/dL' },
                { key: 'serumCreatinine', label: 'Serum Creatinine', unit: 'mg/dL' },
                { key: 'bloodUrea', label: 'Blood Urea (not BUN)', unit: '' },
                { key: 'hemoglobin', label: 'Hemoglobin', unit: 'g/dL' },
                { key: 'bmi', label: 'Body Mass Index', unit: 'kg/m²' },
              ].map(({ key, label, unit }) => {
                const val = confirmedForm[key];
                const fieldUnit = key === 'bloodUrea' ? bloodUreaUnit : unit;
                const initialVal = initialOcrValues[key];
                const validation = getFieldValidation(key, val, fieldUnit);
                const hasValue = val !== '' && val !== null && val !== undefined;
                const hasInitial = initialVal !== '' && initialVal !== null && initialVal !== undefined;
                const bloodUreaUnitChanged = key === 'bloodUrea' && hasInitial && fieldUnit !== (initialOcrUnits.bloodUrea || '');

                const isCorrected = hasInitial && hasValue && (String(val).trim() !== String(initialVal).trim() || bloodUreaUnitChanged);
                const isAdded = !hasInitial && hasValue;
                const isFound = hasInitial && hasValue && String(val).trim() === String(initialVal).trim() && !bloodUreaUnitChanged;
                const isModified = (isCorrected || isAdded) && hasValue;

                return (
                  <div
                    key={key}
                    className={`p-3 rounded-2xl border transition-all ${
                      validation?.type === 'WARNING'
                        ? 'bg-amber-500/5 border-amber-500/40'
                        : validation?.type === 'INVALID'
                        ? 'bg-rose-500/5 border-rose-500/40'
                        : isCorrected
                        ? 'bg-amber-500/5 border-amber-500/30'
                        : isAdded
                        ? 'bg-blue-500/5 border-blue-500/30'
                        : hasValue
                        ? 'bg-slate-950/80 border-slate-700/80'
                        : 'bg-slate-950/40 border-slate-800/60 opacity-80'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-slate-300 truncate max-w-[120px]">{label}</span>
                      {isCorrected && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-bold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                          Corrected
                        </span>
                      )}
                      {isAdded && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-300 font-bold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                          Added
                        </span>
                      )}
                      {isFound && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Found in report
                        </span>
                      )}
                      {!hasValue && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-600 border border-slate-300 font-semibold">
                          Not detected
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          step="any"
                          placeholder="Not recorded"
                          value={val}
                          onChange={(e) => handleFieldChange(key, e.target.value)}
                  onBlur={() => {
                            if (isModified && val !== '') {
                              handleSaveFieldCorrection(key, val, fieldUnit);
                            }
                          }}
                          className={`w-full bg-slate-900 border rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none ${
                            isCorrected
                              ? 'border-amber-400 bg-amber-50/50 text-amber-950 focus:border-amber-500'
                              : isAdded
                              ? 'border-blue-400 bg-blue-50/50 text-blue-950 focus:border-blue-500'
                              : 'border-slate-700/80 text-white focus:border-brand-500'
                          }`}
                        />
                      </div>
                      {key === 'bloodUrea' ? (
                        <select
                          aria-label="Blood urea unit"
                          value={bloodUreaUnit}
                          onChange={(e) => setBloodUreaUnit(e.target.value)}
                          className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-[10px] text-slate-300"
                        >
                          <option value="">Select unit</option>
                          <option value="mg/dL">mg/dL</option>
                          <option value="mmol/L">mmol/L</option>
                        </select>
                      ) : <span className="text-[10px] text-slate-500 font-mono shrink-0">{unit}</span>}
                      {isModified && (
                        <button
                          type="button"
                          onClick={() => handleSaveFieldCorrection(key, val, fieldUnit)}
                          disabled={savingField[key]}
                          title="Save pending correction"
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1 shrink-0 ${
                            savedPendingField[key]
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-brand-500/20 text-brand-300 hover:bg-brand-500/30 border-brand-500/40'
                          }`}
                        >
                          {savingField[key] ? (
                            '...'
                          ) : savedPendingField[key] ? (
                            <Check className="w-3 h-3" />
                          ) : (
                            <Save className="w-3 h-3" />
                          )}
                        </button>
                      )}
                    </div>

                    {isCorrected && (
                      <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-slate-800 text-[10px] text-slate-400">
                        <span>Original OCR: <strong className="text-amber-800 font-bold font-mono">{initialVal}</strong> {unit}</span>
                        <button
                          type="button"
                          onClick={() => handleRevertField(key, unit)}
                          className="text-cyan-800 hover:text-cyan-950 underline font-bold cursor-pointer flex items-center gap-0.5"
                        >
                          <Undo2 className="w-2.5 h-2.5" /> Revert
                        </button>
                      </div>
                    )}

                    {validation?.type === 'WARNING' && (
                      <p className="text-[10px] text-amber-800 font-medium mt-1 leading-tight flex items-start space-x-1">
                        <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5 text-amber-600" />
                        <span>{validation.text}</span>
                      </p>
                    )}
                    {validation?.type === 'INVALID' && (
                      <p className="text-[10px] text-rose-400 mt-1 leading-tight flex items-start space-x-1">
                        <AlertCircle className="w-3 h-3 shrink-0 mt-0.5 text-rose-400" />
                        <span>{validation.text}</span>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setStep('upload')}
              disabled={confirming}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 flex items-center space-x-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Back to Upload</span>
            </button>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={confirming}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReport}
                disabled={confirming}
                className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-brand-500 to-cyan-500 hover:from-brand-600 hover:to-cyan-600 shadow-lg shadow-brand-500/20 flex items-center space-x-2 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{confirming ? 'Saving to Profile...' : 'Confirm & Save to Health Profile'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};
