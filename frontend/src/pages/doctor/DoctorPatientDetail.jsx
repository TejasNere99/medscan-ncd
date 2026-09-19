import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  User,
  Activity,
  Pill,
  FileText,
  Cpu,
  Brain,
  Award,
  Calendar,
  ArrowLeft,
  Info,
  AlertTriangle,
  Lock,
  CheckCircle2,
  XCircle,
  HeartPulse,
} from 'lucide-react';
import { Tabs } from '../../components/common/Tabs';
import { StatCard } from '../../components/common/StatCard';
import { AdherenceChart } from '../../components/charts/AdherenceChart';
import { patientService } from '../../services/patientService';
import { medicineService } from '../../services/medicineService';
import { reportService } from '../../services/reportService';
import { predictionService } from '../../services/predictionService';
import { useToast } from '../../hooks/useToast';

export const DoctorPatientDetail = () => {
  const { id } = useParams();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('personal');

  const [patient, setPatient] = useState(null);
  const [medicines, setMedicines] = useState([]);
  const [reports, setReports] = useState([]);
  const [prediction, setPrediction] = useState(null);
  const [heartDiseasePrediction, setHeartDiseasePrediction] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const pRes = await patientService.getPatientById(id);
        if (pRes.data) setPatient(pRes.data);

        const mRes = await medicineService.getMedicines(id);
        if (mRes.data) setMedicines(mRes.data);

        const rRes = await reportService.getReports(id);
        if (rRes.data) setReports(rRes.data);

        try {
          const predRes = await predictionService.getLatestDiabetesPrediction(id);
          if (predRes.data) {
            setPrediction(predRes.data);
          } else {
            const histRes = await predictionService.getPredictionHistory(id);
            if (histRes.data && histRes.data.length > 0) {
              setPrediction(histRes.data[0]);
            } else {
              setPrediction(null);
            }
          }
        } catch {
          setPrediction(null);
        }

        try {
          const hdRes = await predictionService.getLatestHeartDiseasePrediction(id);
          if (hdRes.data) {
            setHeartDiseasePrediction(hdRes.data);
          } else {
            const hdHistRes = await predictionService.getHeartDiseasePredictionHistory(id);
            if (hdHistRes.data && hdHistRes.data.length > 0) {
              setHeartDiseasePrediction(hdHistRes.data[0]);
            } else {
              setHeartDiseasePrediction(null);
            }
          }
        } catch {
          setHeartDiseasePrediction(null);
        }
      } catch (e) {
        addToast('Failed to load patient detail profile.', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const tabItems = [
    { id: 'personal', label: 'Personal Info', icon: User },
    { id: 'history', label: 'Medical History', icon: Activity },
    { id: 'medicines', label: 'Prescribed Medicines', icon: Pill, badge: medicines.length },
    { id: 'reports', label: 'Lab Reports', icon: FileText, badge: reports.length },
    { id: 'ocr', label: 'OCR Data', icon: Cpu },
    { id: 'ai', label: 'AI Risk Predictions', icon: Brain },
    { id: 'adherence', label: 'Adherence Log', icon: Award },
    { id: 'appointments', label: 'Appointments', icon: Calendar },
  ];

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link to="/doctor/dashboard" className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white font-semibold">
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Patient Directory</span>
      </Link>

      {/* Patient Header Card */}
      <div className="glass-card p-6 rounded-3xl border border-slate-800 flex items-center space-x-4">
        <img
          src={patient?.user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256'}
          alt={patient?.user?.name}
          className="w-16 h-16 rounded-2xl object-cover border-2 border-brand-500/50 shadow-xl"
        />
        <div>
          <h1 className="text-xl font-black text-white">{patient?.user?.name || 'John Doe'}</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Age: <span className="text-white font-bold">{patient?.age || 52} yrs</span> • Gender: <span className="text-white font-bold">{patient?.gender || 'Male'}</span> • Village: <span className="text-brand-400 font-bold">{patient?.village}</span>
          </p>
        </div>
      </div>

      {/* Switchable Tabs Bar */}
      <Tabs tabs={tabItems} activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab Panels */}
      <div className="glass-card p-6 rounded-3xl border border-slate-800 min-h-[350px]">
        {activeTab === 'personal' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <p className="text-slate-500 font-bold uppercase">Blood Group</p>
              <p className="text-lg font-black text-white mt-1">{patient?.bloodGroup || 'A+'}</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <p className="text-slate-500 font-bold uppercase">Blood Pressure</p>
              <p className="text-lg font-black text-amber-400 mt-1">{patient?.systolicBP || 142}/{patient?.diastolicBP || 92} mmHg</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <p className="text-slate-500 font-bold uppercase">Fasting Glucose</p>
              <p className="text-lg font-black text-rose-400 mt-1">{patient?.fastingSugar || 148} mg/dL</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <p className="text-slate-500 font-bold uppercase">BMI</p>
              <p className="text-lg font-black text-cyan-400 mt-1">{patient?.bmi || 27.4}</p>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4 text-xs">
            <h4 className="font-bold text-white uppercase text-slate-400">Diagnosed Medical History</h4>
            <div className="flex flex-wrap gap-2">
              {(patient?.medicalHistory || ['Stage 1 Hypertension', 'Type-2 Diabetes Risk', 'Hyperlipidemia']).map((h, i) => (
                <span key={i} className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-bold">
                  {h}
                </span>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'medicines' && (
          <div className="space-y-3 text-xs">
            <h4 className="font-bold text-white">Active Prescriptions</h4>
            {medicines.map((m) => (
              <div key={m._id} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <p className="font-bold text-white text-sm">{m.name}</p>
                  <p className="text-slate-400">{m.dosage} • {m.frequency}</p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-bold uppercase text-[10px]">
                  {m.status}
                </span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-3 text-xs">
            {reports.map((r) => (
              <div key={r._id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <p className="font-bold text-white text-sm">{r.title}</p>
                  <p className="text-slate-400">{r.reportType} • {new Date(r.uploadDate).toLocaleDateString()}</p>
                </div>
                <a href={r.fileUrl} target="_blank" rel="noreferrer" className="text-brand-400 font-bold hover:underline">
                  View File
                </a>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'ocr' && (
          <div className="space-y-4 text-xs">
            <h4 className="font-bold text-white">Tesseract.js OCR Structured Extraction Output</h4>
            {reports.length > 0 && reports[0].extractedText ? (
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-slate-300 leading-relaxed whitespace-pre-wrap">
                {reports[0].extractedText}
              </div>
            ) : (
              <p className="text-slate-500">No OCR parsed report data available.</p>
            )}
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h4 className="font-extrabold text-white text-sm flex items-center space-x-2">
                  <Brain className="w-4 h-4 text-brand-400" />
                  <span>Scenario A — Model-Estimated Diabetes Risk</span>
                </h4>
                <p className="text-[11px] text-slate-400">
                  Algorithm: LightGBM + 5-Fold Platt Calibration • Decision Threshold: 0.210 • Version {prediction?.modelVersion || '1.0.0'}
                </p>
              </div>
              <span className="text-[10px] px-2.5 py-1 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/30 font-bold self-start sm:self-auto">
                Non-Diagnostic Clinical Decision Support
              </span>
            </div>

            {prediction && prediction.canCalculate && prediction.status === 'SUCCESS' ? (
              <div className="space-y-6">
                {/* Metric Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Estimated Probability
                    </span>
                    <span className="text-2xl font-black text-white mt-1 block">
                      {prediction.probability !== undefined && prediction.probability !== null
                        ? `${(prediction.probability * 100).toFixed(1)}%`
                        : `${prediction.overallRiskPercent}%`}
                    </span>
                    <span className="text-[10px] text-amber-400 mt-1 block font-mono">
                      Development threshold: 21.0%
                    </span>
                    <span className="text-[9px] text-slate-500 mt-0.5 block">
                      Requires external clinical validation
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Risk Stratification
                    </span>
                    <div className="mt-1">
                      <span
                        className={`inline-block text-xs px-2.5 py-1 rounded-full font-bold border ${
                          prediction.riskCategory === 'ELEVATED_MODEL_ESTIMATED_RISK'
                            ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                            : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        }`}
                      >
                        {prediction.riskCategory === 'ELEVATED_MODEL_ESTIMATED_RISK'
                          ? 'Elevated model-estimated risk'
                          : 'Lower model-estimated risk'}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Sensitivity: 81.8% • Specificity: 68.8%
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Data Completeness
                    </span>
                    <div className="mt-1">
                      <span
                        className={`inline-block text-xs px-2.5 py-1 rounded-full font-bold border ${
                          prediction.dataCompleteness === 'PARTIAL'
                            ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
                            : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        }`}
                      >
                        {prediction.dataCompleteness === 'PARTIAL' ? 'PARTIAL DATA' : 'FULL DATA (8/8)'}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      {prediction.dataCompleteness === 'PARTIAL'
                        ? 'Estimated using available health information.'
                        : 'Full cardiometabolic predictor panel observed.'}
                    </span>
                  </div>
                </div>

                {/* Top Contributing Factors (TreeSHAP Directional Attribution) */}
                {prediction.topContributingFactors && prediction.topContributingFactors.length > 0 && (
                  <div className="space-y-3">
                    <div>
                      <h5 className="font-bold text-white text-xs">Top Contributing Factors</h5>
                      <p className="text-[11px] text-slate-400">
                        Directional feature impact computed via TreeSHAP. Indicates directional influence on model output without causal attribution.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {prediction.topContributingFactors.map((f, i) => {
                        const isIncrease = f.impact?.includes('higher') || f.impact?.includes('increase');
                        return (
                          <div
                            key={i}
                            className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between"
                          >
                            <div>
                              <span className="font-bold text-white capitalize block">
                                {f.feature?.replace(/_/g, ' ')}
                              </span>
                              <span className="text-[11px] text-slate-400 block mt-0.5">
                                Observed Value: {f.value ?? 'N/A'}
                              </span>
                            </div>
                            <span
                              className={`text-[10px] px-2.5 py-1 rounded-full font-bold border ${
                                isIncrease
                                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              }`}
                            >
                              {isIncrease ? 'higher estimated risk' : 'lower estimated risk'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Input Features Observed */}
                {prediction.inputFeatures && (
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                    <h5 className="font-bold text-slate-300">Observed Clinical Predictors</h5>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                      {Object.entries(prediction.inputFeatures).map(([k, v]) => {
                        const prov = prediction.featureAvailability?.provenance?.[k];
                        const isObserved = v !== null && v !== undefined && !Number.isNaN(v);
                        return (
                          <div key={k} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80">
                            <span className="text-slate-400 capitalize block text-[10px]">{k.replace(/_/g, ' ')}</span>
                            <span className="font-bold text-white mt-0.5 block">
                              {isObserved ? v : <em className="text-slate-500 font-normal">Unobserved</em>}
                            </span>
                            {isObserved && (
                              <span className="text-[9px] text-slate-400 block mt-0.5">
                                {prov === 'report' ? 'Found in report' : 'Available from health profile'}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Clinical Disclaimer */}
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-[10px] text-slate-500 leading-relaxed italic">
                  {prediction.clinicalDisclaimer ||
                    'Model-estimated risk for clinical decision support. This tool provides non-diagnostic risk estimation derived from routine cardiometabolic parameters and does not substitute for clinical evaluation or diagnostic laboratory testing.'}
                </div>

                {/* Other Diseases Roadmap Section */}
                <div className="pt-4 border-t border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="font-bold text-white text-xs">Other Disease Risk Models (Roadmap)</h5>
                    <span className="text-[10px] font-mono text-slate-500">Under Development</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between opacity-75">
                      <div className="flex items-center space-x-2.5">
                        <Activity className="w-4 h-4 text-amber-400" />
                        <div>
                          <p className="text-xs font-bold text-white flex items-center space-x-1">
                            <span>Hypertension</span>
                            <Lock className="w-3 h-3 text-slate-500" />
                          </p>
                          <p className="text-[10px] text-slate-500">Model under development</p>
                        </div>
                      </div>
                      <span className="text-[9px] px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800 font-bold">
                        Coming Soon
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between opacity-75">
                      <div className="flex items-center space-x-2.5">
                        <FileText className="w-4 h-4 text-cyan-400" />
                        <div>
                          <p className="text-xs font-bold text-white flex items-center space-x-1">
                            <span>Kidney Disease</span>
                            <Lock className="w-3 h-3 text-slate-500" />
                          </p>
                          <p className="text-[10px] text-slate-500">Model under development</p>
                        </div>
                      </div>
                      <span className="text-[9px] px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800 font-bold">
                        Coming Soon
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : prediction && prediction.status === 'INSUFFICIENT_DATA' ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h5 className="text-sm font-bold text-white">Insufficient Data for Diabetes Risk Assessment</h5>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  {prediction.missingDomain
                    ? `Missing domain: ${prediction.missingDomain.toUpperCase()}. The model enforces minimum demographic (age >= 18 & sex), physical (BMI or BP), and routine laboratory parameters (Lipid panel or Creatinine).`
                    : 'The available confirmed report does not contain sufficient clinical data across required domains.'}
                </p>
              </div>
            ) : (
              <div className="p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 text-slate-500 flex items-center justify-center mx-auto border border-slate-800">
                  <Brain className="w-6 h-6" />
                </div>
                <h5 className="text-sm font-bold text-white">No Diabetes Prediction Available</h5>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  No confirmed medical report has been processed for diabetes risk estimation. Once a report is confirmed by the patient or clinician, the Scenario A LightGBM model will automatically evaluate calibrated risk.
                </p>
              </div>
            )}

            {/* Heart Disease Prediction Card in Doctor View */}
            <div className="pt-6 border-t border-slate-800">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                    <HeartPulse className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Framingham 10-Year CHD Risk Model</h4>
                    <p className="text-[10px] text-slate-400">Model Version: v{heartDiseasePrediction?.modelVersion || '1.0.0'} • Platt Calibrated Logistic Regression</p>
                  </div>
                </div>
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                  Active Clinical AI
                </span>
              </div>

              {heartDiseasePrediction && heartDiseasePrediction.canCalculate && heartDiseasePrediction.status === 'SUCCESS' ? (
                <div className="space-y-4">
                  <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Estimated 10-Year CHD Probability</span>
                      <span className="text-3xl font-black text-white mt-1 block">
                        {(heartDiseasePrediction.probability * 100).toFixed(1)}%
                      </span>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        Framingham 10-Year Coronary Heart Disease Risk
                      </span>
                    </div>

                    <div className="text-right space-y-1">
                      <span
                        className={`inline-block text-xs px-3 py-1 rounded-full border font-bold ${
                          heartDiseasePrediction.riskCategory === 'ELEVATED_MODEL_ESTIMATED_RISK'
                            ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                            : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        }`}
                      >
                        {heartDiseasePrediction.riskCategory === 'ELEVATED_MODEL_ESTIMATED_RISK'
                          ? 'Elevated model-estimated risk'
                          : 'Lower model-estimated risk'}
                      </span>
                      <div className="text-[10px] text-slate-400">
                        Threshold: <span className="font-mono text-amber-400 font-bold">11.0%</span>
                      </div>
                    </div>
                  </div>

                  {/* Contributing Factors */}
                  {heartDiseasePrediction.topContributingFactors && heartDiseasePrediction.topContributingFactors.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="font-bold text-white text-xs">Contributing Factors</h5>
                      <p className="text-[11px] text-slate-400">
                        Directional feature contributions toward model-estimated risk without causal attribution.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {heartDiseasePrediction.topContributingFactors.map((f, i) => {
                          const isIncrease = f.impact?.includes('higher') || f.impact?.includes('increase');
                          return (
                            <div key={i} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                              <div>
                                <span className="font-bold text-white capitalize block">{f.feature?.replace(/_/g, ' ')}</span>
                                <span className="text-[11px] text-slate-400 block">Observed: {f.value ?? 'N/A'}</span>
                              </div>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                                  isIncrease
                                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                }`}
                              >
                                {isIncrease ? 'higher estimated risk' : 'lower estimated risk'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Predictors Grid */}
                  {heartDiseasePrediction.inputFeatures && (
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                      <h5 className="font-bold text-slate-300">Observed Clinical Predictors (Framingham 8-Feature Contract)</h5>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                        {Object.entries(heartDiseasePrediction.inputFeatures).map(([k, v]) => {
                          const isObserved = v !== null && v !== undefined && !Number.isNaN(v);
                          let displayVal = v;
                          if (k === 'sex') displayVal = v === 1 ? 'Male' : (v === 0 ? 'Female' : v);
                          if (k === 'currentSmoker') displayVal = v === 1 ? 'Smoker' : (v === 0 ? 'Non-smoker' : v);

                          return (
                            <div key={k} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80">
                              <span className="text-slate-400 capitalize block text-[10px]">
                                {k === 'totChol' ? 'Total Cholesterol' : k === 'sysBP' ? 'Systolic BP' : k === 'diaBP' ? 'Diastolic BP' : k === 'currentSmoker' ? 'Smoking Status' : k.replace(/_/g, ' ')}
                              </span>
                              <span className="font-bold text-white mt-0.5 block">
                                {isObserved ? displayVal : <em className="text-slate-500 font-normal">Preprocessor Imputed</em>}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Clinical Disclaimer */}
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-[10px] text-slate-500 leading-relaxed italic">
                    {heartDiseasePrediction.clinicalDisclaimer ||
                      'Model-estimated risk for clinical decision support. This tool provides non-diagnostic risk estimation derived from routine cardiometabolic parameters and does not substitute for clinical evaluation or diagnostic laboratory testing.'}
                  </div>
                </div>
              ) : heartDiseasePrediction && heartDiseasePrediction.status === 'INSUFFICIENT_DATA' ? (
                <div className="p-6 text-center space-y-2 bg-slate-950/60 rounded-2xl border border-slate-800">
                  <AlertTriangle className="w-5 h-5 text-amber-400 mx-auto" />
                  <h5 className="text-xs font-bold text-white">Insufficient Data for Heart Disease Assessment</h5>
                  <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                    Required parameters missing: {heartDiseasePrediction.missingDomain || 'Age, Sex, Total Cholesterol, Systolic BP, Diastolic BP'}.
                  </p>
                </div>
              ) : (
                <div className="p-6 text-center space-y-2 bg-slate-950/60 rounded-2xl border border-slate-800">
                  <HeartPulse className="w-5 h-5 text-slate-500 mx-auto" />
                  <h5 className="text-xs font-bold text-white">No Heart Disease Assessment Available</h5>
                  <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                    A confirmed lab report with Total Cholesterol and Blood Pressure or complete patient profile vitals will automatically activate this model.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'adherence' && (
          <div>
            <h4 className="font-bold text-white text-xs mb-4">Adherence Compliance Visualization</h4>
            <AdherenceChart />
          </div>
        )}

        {activeTab === 'appointments' && (
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs">
            <p className="font-bold text-white">Upcoming Consultation</p>
            <p className="text-slate-400 mt-1">Scheduled for: Thursday 10:30 AM • Reason: Diabetes Follow-up</p>
          </div>
        )}
      </div>
    </div>
  );
};
