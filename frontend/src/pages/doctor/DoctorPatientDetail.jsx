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
  RefreshCw,
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
import { appointmentService } from '../../services/appointmentService';
import { useToast } from '../../hooks/useToast';
import { resolveMediaUrl } from '../../services/api';

export const DoctorPatientDetail = () => {
  const { id } = useParams();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('personal');

  const [patient, setPatient] = useState(null);
  const [medicines, setMedicines] = useState([]);
  const [reports, setReports] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [updatingAppointmentId, setUpdatingAppointmentId] = useState(null);
  const [updatingMedicineId, setUpdatingMedicineId] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [heartDiseasePrediction, setHeartDiseasePrediction] = useState(null);
  const [hypertensionPrediction, setHypertensionPrediction] = useState({ status: 'LOADING' });
  const [ckdPrediction, setCkdPrediction] = useState({ status: 'LOADING' });
  const [runningNewDisease, setRunningNewDisease] = useState(null);
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

        const appointmentRes = await appointmentService.getAppointments(id);
        const appointmentData = appointmentRes?.data || appointmentRes;
        setAppointments(Array.isArray(appointmentData) ? appointmentData : appointmentData?.appointments || []);

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

        const [hypertensionResult, ckdResult] = await Promise.allSettled([
          predictionService.getLatestHypertensionPrediction(id),
          predictionService.getLatestCkdPrediction(id),
        ]);
        setHypertensionPrediction(hypertensionResult.status === 'fulfilled' ? hypertensionResult.value?.data || null : { status: 'LOAD_ERROR' });
        setCkdPrediction(ckdResult.status === 'fulfilled' ? ckdResult.value?.data || null : { status: 'LOAD_ERROR' });
      } catch (e) {
        addToast('Failed to load patient detail profile.', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const updateAppointment = async (appointment, status) => {
    setUpdatingAppointmentId(appointment._id);
    try {
      const response = await appointmentService.updateStatus(appointment._id, status);
      setAppointments((current) => current.map((item) => item._id === appointment._id ? (response?.data || { ...item, status }) : item));
      addToast(`Appointment marked ${status.toLowerCase()}.`, 'success');
    } catch (error) {
      addToast(error?.message || 'Could not update this appointment.', 'error');
    } finally {
      setUpdatingAppointmentId(null);
    }
  };

  const discontinueMedicine = async (medicine) => {
    setUpdatingMedicineId(medicine._id);
    try {
      const response = await medicineService.deleteMedicine(medicine._id);
      setMedicines((current) => current.map((item) => item._id === medicine._id ? (response?.data || { ...item, status: 'Discontinued' }) : item));
      addToast('Prescription discontinued. Dose history was preserved.', 'success');
    } catch (error) {
      addToast(error?.message || 'Could not discontinue this prescription.', 'error');
    } finally {
      setUpdatingMedicineId(null);
    }
  };

  const requestNewDiseasePrediction = async (disease) => {
    setRunningNewDisease(disease);
    try {
      const result = disease === 'hypertension'
        ? await predictionService.predictHypertension({ patientId: id })
        : await predictionService.predictCkd({ patientId: id });
      const predictionResult = result?.data || null;
      if (disease === 'hypertension') setHypertensionPrediction(predictionResult);
      else setCkdPrediction(predictionResult);
      addToast(predictionResult?.message || 'Model estimate generated.', predictionResult?.canCalculate ? 'success' : 'warning');
    } catch (error) {
      const errorResult = error?.data || error || {};
      const embeddedResult = errorResult?.data?.status ? errorResult.data : (errorResult?.status ? errorResult : null);
      const result = embeddedResult ? {
        ...embeddedResult,
        message: embeddedResult.message || errorResult.message || 'The model estimate is temporarily unavailable. No probability was generated.',
      } : {
        status: 'PREDICTION_ERROR',
        canCalculate: false,
        probability: null,
        message: errorResult?.message || error?.message || 'The estimate could not be generated. Check access and retry.',
      };
      if (disease === 'hypertension') setHypertensionPrediction(result);
      else setCkdPrediction(result);
      addToast(result.message, 'error');
    } finally {
      setRunningNewDisease(null);
    }
  };

  const renderResearchModelCard = (disease, title, result) => {
    const isLoading = runningNewDisease === disease;
    const isAvailable = result?.status === 'SUCCESS' && result?.canCalculate && Number.isFinite(result?.probability);
    const insufficient = result?.status === 'INSUFFICIENT_DATA';
    const unavailable = ['MODEL_UNAVAILABLE', 'SERVICE_UNAVAILABLE', 'PREDICTION_SERVICE_UNAVAILABLE'].includes(result?.status);
    return (
      <section key={disease} className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-2" aria-label={`${title} research estimate`}>
        <div className="flex items-center justify-between gap-2">
          <h5 className="text-xs font-bold text-white">{title}</h5>
          <span className="text-[9px] font-bold text-amber-300">Research estimate</span>
        </div>
        {isAvailable ? (
          <div role="status">
            <p className="text-xl font-black text-white">{(result.probability * 100).toFixed(1)}%</p>
            <p className="text-[10px] text-slate-300">{result.riskCategory === 'POSITIVE_CLASSIFICATION_ESTIMATE' ? 'Positive classification estimate' : 'Negative classification estimate'} · {result.modelVersion || 'model version unavailable'}{result.createdAt ? ` · ${new Date(result.createdAt).toLocaleString()}` : ''}</p>
            <p className="mt-1 text-[10px] text-slate-500">{result.explanationStatus === 'available' && result.topContributingFactors?.length ? result.topContributingFactors.map((factor) => factor.description || factor.feature).join('; ') : 'Individual contributing factors are unavailable.'}</p>
            <p className="mt-1 text-[10px] text-slate-500">{result.taskInterpretation || result.clinicalDisclaimer || 'Not a diagnosis or clinically validated estimate.'}</p>
          </div>
        ) : result?.status === 'LOADING' ? (
          <p className="text-[10px] text-slate-400" role="status">Loading the latest saved estimate…</p>
        ) : (
          <p className={`text-[10px] ${unavailable || result?.status === 'PREDICTION_ERROR' || result?.status === 'LOAD_ERROR' ? 'text-rose-300' : 'text-slate-400'}`} role={unavailable || result?.status === 'PREDICTION_ERROR' ? 'alert' : 'status'}>
            {insufficient ? result.message || `Confirmed data required: ${(result.missingDomain || result.missingFeatures || []).toString().replace(/_/g, ' ')}.` : unavailable || result?.status === 'PREDICTION_ERROR' ? result.message || 'Model estimate is temporarily unavailable. No probability was generated.' : result?.status === 'LOAD_ERROR' ? 'Could not load the latest estimate.' : 'No estimate yet. Generate one using eligible profile and confirmed report information.'}
          </p>
        )}
        <button type="button" disabled={isLoading || result?.status === 'LOADING' || Boolean(runningNewDisease)} onClick={() => requestNewDiseasePrediction(disease)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-2.5 py-1.5 text-[10px] font-bold text-slate-200 hover:border-cyan-500/50 disabled:opacity-60">
          {isLoading && <RefreshCw className="h-3 w-3 animate-spin" />}{isLoading ? 'Generating…' : result?.status === 'LOADING' ? 'Loading latest estimate…' : isAvailable ? 'Refresh estimate' : 'Generate estimate'}
        </button>
      </section>
    );
  };

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
        {patient?.user?.avatar ? <img src={patient.user.avatar} alt="" className="h-14 w-14 rounded-full object-cover" /> : <span aria-hidden="true" className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-100 text-lg font-semibold text-violet-800">{patient?.user?.name?.charAt(0) || 'P'}</span>}
        <div>
          <h1 className="text-xl font-black text-white">{patient?.user?.name || 'Patient record'}</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Age: <span className="text-white font-bold">{patient?.age ? `${patient.age} yrs` : 'Not recorded'}</span> • Gender: <span className="text-white font-bold">{patient?.gender || 'Not recorded'}</span> • Village: <span className="text-brand-400 font-bold">{patient?.village || 'Not recorded'}</span>
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
              <p className="text-lg font-black text-white mt-1">{patient?.bloodGroup || 'Not recorded'}</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <p className="text-slate-500 font-bold uppercase">Blood Pressure</p>
              <p className="text-lg font-black text-amber-400 mt-1">{patient?.systolicBP && patient?.diastolicBP ? `${patient.systolicBP}/${patient.diastolicBP} mmHg` : 'Not recorded'}</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <p className="text-slate-500 font-bold uppercase">Fasting Glucose</p>
              <p className="text-lg font-black text-rose-400 mt-1">{patient?.fastingSugar ? `${patient.fastingSugar} mg/dL` : 'Not recorded'}</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <p className="text-slate-500 font-bold uppercase">BMI</p>
              <p className="text-lg font-black text-cyan-400 mt-1">{patient?.bmi || 'Not recorded'}</p>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4 text-xs">
            <h4 className="font-bold text-white uppercase text-slate-400">Diagnosed Medical History</h4>
            <div className="flex flex-wrap gap-2">
              {(patient?.medicalHistory || []).map((h, i) => (
                <span key={i} className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-bold">
                  {h}
                </span>
              ))}
            </div>
            {!patient?.medicalHistory?.length && <p className="text-xs text-stone-500">No confirmed history recorded.</p>}
          </div>
        )}

        {activeTab === 'medicines' && (
          <div className="space-y-3 text-xs">
            <h4 className="font-bold text-white">Prescriptions</h4>
            {medicines.length === 0 && <p className="py-5 text-center text-slate-500">No prescriptions have been added for this patient.</p>}
            {medicines.map((m) => (
              <div key={m._id} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-white text-sm">{m.name}</p>
                  <p className="text-slate-400">{m.dosage} • {m.frequency}</p>
                  {m.instructions && <p className="mt-1 text-slate-500">{m.instructions}</p>}
                  {m.timing?.length > 0 && <p className="mt-1 capitalize text-slate-500">{m.timing.join(', ')}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-bold uppercase text-[10px]">{m.status}</span>
                  {m.status === 'Active' && <button type="button" disabled={updatingMedicineId === m._id} onClick={() => discontinueMedicine(m)} className="rounded-lg border border-rose-200 px-3 py-2 text-[10px] font-semibold text-rose-700 disabled:opacity-50">{updatingMedicineId === m._id ? 'Saving…' : 'Discontinue'}</button>}
                </div>
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
                <a href={resolveMediaUrl(r.fileUrl)} target="_blank" rel="noreferrer" className="text-brand-400 font-bold hover:underline">
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
            <section className="space-y-3">
              <div>
                <h4 className="text-sm font-bold text-white">Hypertension and CKD research estimates</h4>
                <p className="mt-1 text-[10px] text-slate-400">Uses this patient’s permitted profile and confirmed report values. Estimates are non-diagnostic and not clinically validated.</p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {renderResearchModelCard('hypertension', 'Hypertension classification', hypertensionPrediction)}
                {renderResearchModelCard('ckd', 'Chronic kidney disease classification', ckdPrediction)}
              </div>
            </section>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h4 className="font-extrabold text-white text-sm flex items-center space-x-2">
                  <Brain className="w-4 h-4 text-brand-400" />
                  <span>Scenario A — Model-Estimated Diabetes Risk</span>
                </h4>
                <p className="text-[11px] text-slate-400">
                  {prediction?.modelVersion ? `Model version: ${prediction.modelVersion}` : 'Model-estimated risk based on available confirmed information'}
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
                    <p className="text-[10px] text-slate-400">{heartDiseasePrediction?.modelVersion ? `Model version: ${heartDiseasePrediction.modelVersion}` : 'Model-estimated risk based on available confirmed information'}</p>
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
          <div className="space-y-3 text-xs"><h4 className="font-semibold text-stone-900">Appointments</h4>{appointments.length ? appointments.map((appointment) => <article key={appointment._id} className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 py-3"><div><p className="font-semibold text-stone-900">{appointment.reason || 'Appointment'}</p><p className="mt-1 text-stone-500">{appointment.date ? new Date(appointment.date).toLocaleDateString() : 'Date not provided'}{appointment.time ? ` · ${appointment.time}` : ''}</p>{appointment.notes && <p className="mt-1 text-stone-500">{appointment.notes}</p>}</div><div className="flex items-center gap-2"><span className="rounded-full bg-stone-100 px-2.5 py-1 text-[10px] text-stone-600">{appointment.status || 'Status unavailable'}</span>{appointment.status === 'Upcoming' && <><button type="button" disabled={updatingAppointmentId === appointment._id} onClick={() => updateAppointment(appointment, 'Completed')} className="rounded-lg bg-emerald-700 px-3 py-2 text-[10px] font-semibold text-white disabled:opacity-50">Complete</button><button type="button" disabled={updatingAppointmentId === appointment._id} onClick={() => updateAppointment(appointment, 'Cancelled')} className="rounded-lg border border-stone-200 px-3 py-2 text-[10px] font-semibold text-stone-600 disabled:opacity-50">Cancel</button></>}</div></article>) : <p className="py-5 text-center text-stone-500">No appointments available for this patient.</p>}</div>
        )}
      </div>
    </div>
  );
};
