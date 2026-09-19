import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  FileSearch,
  ExternalLink,
  Activity,
  Sun,
  Moon,
  TrendingUp,
  Code2,
  Eye,
} from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import { reportService } from '../../services/reportService';

export const OcrViewerModal = ({ isOpen, onClose, report, onReportConfirmed }) => {
  const [showRawText, setShowRawText] = useState(false);
  const [showJson, setShowJson] = useState(false);
  const [abpmTab, setAbpmTab] = useState('overall');
  const [confirming, setConfirming] = useState(false);
  const { addToast } = useToast();

  if (!report) return null;

  const {
    title,
    reportType,
    fileUrl,
    rawOcrText,
    confirmedData,
    extractedData,
    structuredData,
    confidence,
    status,
    uploadDate,
    storageProvider,
  } = report;

  const doc = confirmedData || extractedData || {};
  const measurements = doc.measurements || extractedData?.measurements || {};
  const ind = doc.hypertensionIndicators || extractedData?.hypertensionIndicators || {};
  const bp = measurements.bloodPressure || {};

  const isAbpm =
    reportType === 'Ambulatory Blood Pressure Monitoring' ||
    doc.document?.reportType?.value === 'ambulatory_blood_pressure_monitoring' ||
    Boolean(bp.overall?.average || ind.aasi);

  const isCbc =
    reportType === 'Complete Blood Count' ||
    doc.document?.reportType?.value === 'complete_blood_count' ||
    Boolean(measurements.rbcCount || measurements.wbcCount || measurements.plateletCount);

  const patientContext = doc.patientContext || extractedData?.patientContext || {};
  const displayVitals = confirmedData?.canonicalVitals || extractedData?.canonicalVitals || structuredData || confirmedData || {};

  const isPdf = fileUrl?.toLowerCase().endsWith('.pdf') || report?.fileType === 'pdf';
  const isLocalStorage = storageProvider === 'local' || fileUrl?.includes('localhost');

  const handleConfirm = async () => {
    if (!report?._id) return;
    setConfirming(true);
    try {
      const payload = {
        canonicalVitals: report.confirmedData?.canonicalVitals || report.structuredData || report.extractedData?.canonicalVitals || {},
        measurements: report.extractedData?.measurements || report.confirmedData?.measurements || {},
        hypertensionIndicators: report.extractedData?.hypertensionIndicators || report.confirmedData?.hypertensionIndicators || null,
        document: report.extractedData?.document || report.confirmedData?.document || null,
        patientContext: report.extractedData?.patientContext || report.confirmedData?.patientContext || null,
      };

      await reportService.confirmReport(report._id, payload);
      addToast('Medical report confirmed! AI Risk Assessment updated.', 'success');
      if (onReportConfirmed) {
        onReportConfirmed();
      }
      onClose();
    } catch (err) {
      console.error(err);
      addToast(err.response?.data?.message || 'Failed to confirm report.', 'error');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Medical Report — ${title}`} maxWidth="max-w-4xl">
      <div className="space-y-6">
        {/* Status & Metadata Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-950 border border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
              <FileSearch className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <p className="text-xs font-bold text-white">{reportType || 'Clinical Medical Report'}</p>
                {isAbpm && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-bold">
                    ABPM Intelligence
                  </span>
                )}
                {isCbc && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-bold">
                    CBC Hematology Panel
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {patientContext.age || patientContext.sex ? (
                  <span className="text-cyan-300 font-semibold mr-1.5">
                    Patient: {patientContext.age ? `Age ${patientContext.age} ${patientContext.ageUnit || 'years'}` : ''}
                    {patientContext.age && patientContext.sex ? ' • ' : ''}
                    {patientContext.sex ? `Sex: ${patientContext.sex.charAt(0).toUpperCase() + patientContext.sex.slice(1)}` : ''} •
                  </span>
                ) : null}
                Uploaded: {new Date(uploadDate || Date.now()).toLocaleDateString()} • Storage: {storageProvider || 'cloud'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <span
              className={`text-[11px] px-2.5 py-0.5 rounded-full border font-bold uppercase tracking-wider ${
                status === 'CONFIRMED'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : status === 'PENDING_REVIEW'
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {status || 'CONFIRMED'}
            </span>
            <div className="text-right pl-2 border-l border-slate-800">
              <p className="text-[10px] text-slate-500 font-semibold uppercase">Extraction Confidence</p>
              <span className="text-xs font-black text-cyan-400">{confidence || 92}%</span>
            </div>
          </div>
        </div>

        {/* PENDING REVIEW ACTION BANNER */}
        {status === 'PENDING_REVIEW' && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 to-orange-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg shadow-amber-500/5">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-amber-300">Action Needed: Medical Report Awaiting Confirmation</p>
                <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                  To ensure clinical safety, AI models only process verified lab data. Review the extracted parameters below and click confirm to update your health profile and generate AI disease predictions.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={confirming}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-600 hover:to-emerald-600 shadow-md shadow-amber-500/20 flex items-center justify-center space-x-2 shrink-0 transition-all disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{confirming ? 'Confirming...' : 'Confirm & Run AI Assessment'}</span>
            </button>
          </div>
        )}

        {/* IF ABPM REPORT: DISPLAY DETAILED MULTI-PERIOD STRUCTURED STATS */}
        {isAbpm ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-2">
              {[
                { id: 'overall', label: '24h Overall Summary', icon: Activity },
                { id: 'wake', label: 'Wake Periods (Day)', icon: Sun },
                { id: 'sleep', label: 'Sleep Periods (Night)', icon: Moon },
                { id: 'indicators', label: 'Hypertension Indicators', icon: TrendingUp },
              ].map((tab) => {
                const Icon = tab.icon;
                const active = abpmTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setAbpmTab(tab.id)}
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

            {abpmTab === 'overall' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <p className="text-[10px] uppercase font-bold text-slate-500">24h Average BP</p>
                    <p className="text-base font-black text-white mt-0.5">
                      {bp.overall?.average?.systolic?.value || displayVitals.systolicBP || '--'} / {bp.overall?.average?.diastolic?.value || displayVitals.diastolicBP || '--'}{' '}
                      <span className="text-xs font-normal text-slate-400">mmHg</span>
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <p className="text-[10px] uppercase font-bold text-slate-500">Mean Arterial Press.</p>
                    <p className="text-base font-black text-white mt-0.5">
                      {measurements.map?.overallAverage?.value || '--'} <span className="text-xs font-normal text-slate-400">mmHg</span>
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <p className="text-[10px] uppercase font-bold text-slate-500">Pulse Pressure</p>
                    <p className="text-base font-black text-white mt-0.5">
                      {measurements.pulsePressure?.overallAverage?.value || '--'} <span className="text-xs font-normal text-slate-400">mmHg</span>
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <p className="text-[10px] uppercase font-bold text-slate-500">Heart Rate</p>
                    <p className="text-base font-black text-white mt-0.5">
                      {measurements.heartRate?.overallAverage?.value || displayVitals.heartRate || '--'} <span className="text-xs font-normal text-slate-400">BPM</span>
                    </p>
                  </div>
                </div>

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
                        <td className="py-2 text-white font-bold">{bp.overall?.systolic?.average ?? displayVitals.systolicBP ?? '--'}</td>
                        <td className="py-2 text-slate-400">{bp.overall?.systolic?.standardDeviation ?? '--'}</td>
                        <td className="py-2 text-slate-400">{bp.overall?.systolic?.minimum ?? '--'}</td>
                        <td className="py-2 text-slate-400">{bp.overall?.systolic?.maximum ?? '--'}</td>
                        <td className="py-2 text-cyan-400">{ind.systolicDippingPercent ? `${ind.systolicDippingPercent}%` : '--'}</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-slate-300 font-sans font-bold">Diastolic (mmHg)</td>
                        <td className="py-2 text-white font-bold">{bp.overall?.diastolic?.average ?? displayVitals.diastolicBP ?? '--'}</td>
                        <td className="py-2 text-slate-400">{bp.overall?.diastolic?.standardDeviation ?? '--'}</td>
                        <td className="py-2 text-slate-400">{bp.overall?.diastolic?.minimum ?? '--'}</td>
                        <td className="py-2 text-slate-400">{bp.overall?.diastolic?.maximum ?? '--'}</td>
                        <td className="py-2 text-cyan-400">{ind.diastolicDippingPercent ? `${ind.diastolicDippingPercent}%` : '--'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {abpmTab === 'wake' && (
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                    <Sun className="w-4 h-4 text-amber-400" />
                    <span>Wake Periods Summary (Daytime)</span>
                  </span>
                  <span className="text-xs font-black text-amber-300 font-mono">
                    Avg: {bp.wake?.average?.systolic ?? '--'} / {bp.wake?.average?.diastolic ?? '--'} mmHg
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-900/80">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Wake Systolic Avg</p>
                    <p className="text-sm font-bold text-white mt-0.5">{bp.wake?.systolic?.average ?? '--'} mmHg</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">SD: {bp.wake?.systolic?.standardDeviation ?? '--'}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/80">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Wake Diastolic Avg</p>
                    <p className="text-sm font-bold text-white mt-0.5">{bp.wake?.diastolic?.average ?? '--'} mmHg</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">SD: {bp.wake?.diastolic?.standardDeviation ?? '--'}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/80">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Systolic &gt; 135 Load</p>
                    <p className="text-sm font-bold text-rose-400 mt-0.5">{bp.wake?.loadAboveThreshold?.systolicPercent ? `${bp.wake.loadAboveThreshold.systolicPercent}%` : '--'}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/80">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Diastolic &gt; 85 Load</p>
                    <p className="text-sm font-bold text-rose-400 mt-0.5">{bp.wake?.loadAboveThreshold?.diastolicPercent ? `${bp.wake.loadAboveThreshold.diastolicPercent}%` : '--'}</p>
                  </div>
                </div>
              </div>
            )}

            {abpmTab === 'sleep' && (
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                    <Moon className="w-4 h-4 text-indigo-400" />
                    <span>Sleep Periods Summary (Nocturnal)</span>
                  </span>
                  <span className="text-xs font-black text-indigo-300 font-mono">
                    Avg: {bp.sleep?.average?.systolic ?? '--'} / {bp.sleep?.average?.diastolic ?? '--'} mmHg
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-900/80">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Sleep Systolic Avg</p>
                    <p className="text-sm font-bold text-white mt-0.5">{bp.sleep?.systolic?.average ?? '--'} mmHg</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">SD: {bp.sleep?.systolic?.standardDeviation ?? '--'}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/80">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Sleep Diastolic Avg</p>
                    <p className="text-sm font-bold text-white mt-0.5">{bp.sleep?.diastolic?.average ?? '--'} mmHg</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">SD: {bp.sleep?.diastolic?.standardDeviation ?? '--'}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/80">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Systolic &gt; 120 Load</p>
                    <p className="text-sm font-bold text-rose-400 mt-0.5">{bp.sleep?.loadAboveThreshold?.systolicPercent ? `${bp.sleep.loadAboveThreshold.systolicPercent}%` : '--'}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/80">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Diastolic &gt; 70 Load</p>
                    <p className="text-sm font-bold text-rose-400 mt-0.5">{bp.sleep?.loadAboveThreshold?.diastolicPercent ? `${bp.sleep.loadAboveThreshold.diastolicPercent}%` : '--'}</p>
                  </div>
                </div>
              </div>
            )}

            {abpmTab === 'indicators' && (() => {
              const aasiVal = typeof ind.aasi === 'object' ? ind.aasi?.value : ind.aasi;
              const msiVal = typeof ind.msi === 'object' ? ind.msi?.value : ind.msi;
              const sysDipping = typeof ind.systolicDippingPercent === 'object' ? ind.systolicDippingPercent?.value : ind.systolicDippingPercent;
              const diaDipping = typeof ind.diastolicDippingPercent === 'object' ? ind.diastolicDippingPercent?.value : ind.diastolicDippingPercent;
              const sysLoad = typeof ind.systolicLoadPercent === 'object' ? ind.systolicLoadPercent?.value : ind.systolicLoadPercent;
              const diaLoad = typeof ind.diastolicLoadPercent === 'object' ? ind.diastolicLoadPercent?.value : ind.diastolicLoadPercent;

              return (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Systolic Dipping</p>
                    <p className="text-base font-black text-emerald-400 mt-0.5">{sysDipping ? `${sysDipping}%` : '--'}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Normal dipper threshold: 10-20%</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Diastolic Dipping</p>
                    <p className="text-base font-black text-emerald-400 mt-0.5">{diaDipping ? `${diaDipping}%` : '--'}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Nocturnal recovery indicator</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">AASI Stiffness Index</p>
                    <p className="text-base font-black text-white mt-0.5">{aasiVal ?? '--'}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Arterial compliance marker</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Morning Surge (MSI)</p>
                    <p className="text-base font-black text-white mt-0.5">{msiVal ?? '--'}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Surge velocity indicator</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Systolic Load</p>
                    <p className="text-base font-black text-rose-400 mt-0.5">{sysLoad ? `${sysLoad}%` : '--'}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Total readings above limits</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Diastolic Load</p>
                    <p className="text-base font-black text-rose-400 mt-0.5">{diaLoad ? `${diaLoad}%` : '--'}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Total readings above limits</p>
                  </div>
                </div>
              );
            })()}
          </div>
        ) : (
          /* GENERAL LAB REPORT & CBC STRUCTURED PARAMETERS */
          <div className="space-y-4">
            {/* IF CBC: DISPLAY COMPLETE HEMATOLOGY INTELLIGENCE */}
            {isCbc && measurements && (
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    <span>Complete Blood Count (CBC) Laboratory Intelligence</span>
                  </span>
                  <span className="text-[11px] text-emerald-400 font-mono font-bold">
                    {Object.keys(measurements).length} Parameters Detected
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
                    const item = measurements[key];
                    if (!item) return null;
                    const val = typeof item === 'object' ? item.value : item;
                    const unit = typeof item === 'object' ? item.unit : defaultUnit;
                    const section = item.source?.section || 'CBC';

                    return (
                      <div key={key} className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] text-slate-400 font-bold uppercase truncate">{label}</p>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                            {section}
                          </span>
                        </div>
                        <p className="text-sm font-black text-white mt-1">
                          {val} <span className="text-xs font-normal text-slate-400">{unit}</span>
                        </p>
                        {item.warning && (
                          <p className="text-[10px] text-amber-400 mt-0.5">{item.warning}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Confirmed Vitals for Patient Profile</span>
              </h4>

            {displayVitals && Object.keys(displayVitals).length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { key: 'fastingSugar', label: 'Fasting Glucose', unit: 'mg/dL' },
                  { key: 'systolicBP', label: 'Systolic BP', unit: 'mmHg' },
                  { key: 'diastolicBP', label: 'Diastolic BP', unit: 'mmHg' },
                  { key: 'heartRate', label: 'Heart Rate', unit: 'BPM' },
                  { key: 'totalCholesterol', label: 'Total Cholesterol', unit: 'mg/dL' },
                  { key: 'hdl', label: 'HDL Cholesterol', unit: 'mg/dL' },
                  { key: 'serumCreatinine', label: 'Serum Creatinine', unit: 'mg/dL' },
                  { key: 'hemoglobin', label: 'Hemoglobin', unit: 'g/dL' },
                  { key: 'bmi', label: 'Body Mass Index', unit: 'kg/m²' },
                ].map(({ key, label, unit }) => {
                  const raw = displayVitals[key];
                  const val = typeof raw === 'object' && raw !== null ? raw.value : raw;
                  if (val === null || val === undefined || val === '') return null;

                  const source = typeof raw === 'object' ? raw.source : null;
                  const originalVal = typeof raw === 'object' ? raw.originalValue : null;

                  return (
                    <div key={key} className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] uppercase font-bold text-slate-500 truncate">{label}</p>
                        {source === 'manual_correction' && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 font-semibold">
                            Corrected
                          </span>
                        )}
                        {source === 'manual' && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/30 font-semibold">
                            Added
                          </span>
                        )}
                        {source === 'report' && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold">
                            Report
                          </span>
                        )}
                      </div>
                      <p className="text-base font-extrabold text-white mt-0.5">
                        {String(val)} <span className="text-xs font-normal text-slate-400">{unit}</span>
                      </p>
                      {source === 'manual_correction' && originalVal !== null && originalVal !== undefined && (
                        <p className="text-[10px] text-slate-400 mt-1">
                          Original OCR: <span className="text-amber-200 font-mono">{String(originalVal)}</span> {unit}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-500 text-center">
                No specific parameters recorded for this report.
              </div>
            )}
            </div>
          </div>
        )}

        {/* Action Toggle Bar for Raw OCR & Debug JSON */}
        <div className="flex items-center space-x-3 pt-2">
          <button
            type="button"
            onClick={() => setShowRawText(!showRawText)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 flex items-center space-x-1.5"
          >
            <Eye className="w-3.5 h-3.5 text-slate-400" />
            <span>{showRawText ? 'Hide Raw OCR' : 'View Original OCR Output'}</span>
          </button>
          <button
            type="button"
            onClick={() => setShowJson(!showJson)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-700 flex items-center space-x-1.5"
          >
            <Code2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>{showJson ? 'Hide JSON' : 'Technical JSON View'}</span>
          </button>
        </div>

        {/* Collapsible Original OCR Output */}
        {showRawText && (
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-slate-300">Original OCR Output (Unedited)</span>
              <span className="text-slate-500">Immutable for audit compliance</span>
            </div>
            <textarea
              readOnly
              value={rawOcrText || 'No raw OCR text available.'}
              rows={6}
              className="w-full bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-[11px] font-mono text-slate-300 focus:outline-none resize-y"
            />
          </div>
        )}

        {/* Collapsible Technical JSON View */}
        {showJson && (
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-cyan-500/20 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-cyan-300">Structured Medical JSON Representation</span>
              <span className="text-slate-500">Document Understanding Data</span>
            </div>
            <pre className="w-full max-h-56 overflow-auto bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-[10px] font-mono text-cyan-200">
              {JSON.stringify(doc, null, 2)}
            </pre>
          </div>
        )}

        {/* Document Preview */}
        {fileUrl && (
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase">Document File Preview</span>
              <a
                href={fileUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-brand-400 hover:text-brand-300 font-semibold flex items-center space-x-1"
              >
                <span>Open in New Tab</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Local storage: PDFs cannot be embedded in iframes cross-origin */}
            {isLocalStorage && isPdf ? (
              <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-6 flex flex-col items-center justify-center gap-3 text-center">
                <div className="p-3 rounded-xl bg-brand-500/10 border border-brand-500/20">
                  <FileText className="w-8 h-8 text-brand-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">PDF Report Stored Locally</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    This report is saved on the local server. In-app preview is not available for local PDF files.
                  </p>
                </div>
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-brand-500 to-cyan-500 flex items-center space-x-2"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open PDF in Browser Tab</span>
                </a>
                <p className="text-[10px] text-slate-500">
                  💡 Configure real Cloudinary credentials in <code className="text-brand-400">.env</code> for cloud-hosted previews.
                </p>
              </div>
            ) : (
              <div className="rounded-xl overflow-hidden border border-slate-800 max-h-64 flex items-center justify-center bg-slate-950">
                {isPdf ? (
                  <iframe src={fileUrl} title="Document Preview" className="w-full h-64 border-none" />
                ) : (
                  <img src={fileUrl} alt="Report Document" className="max-h-64 w-auto object-contain" />
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <div>
            {status === 'PENDING_REVIEW' && (
              <span className="text-xs text-amber-400 flex items-center gap-1.5 font-semibold">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Pending Review — Values not yet confirmed into patient record</span>
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700"
            >
              Close Viewer
            </button>
            {status === 'PENDING_REVIEW' && (
              <button
                type="button"
                onClick={handleConfirm}
                disabled={confirming}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-90 flex items-center space-x-1.5 shadow-lg shadow-emerald-500/20"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{confirming ? 'Confirming...' : 'Confirm Report'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
