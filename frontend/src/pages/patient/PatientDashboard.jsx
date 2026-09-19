import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  FileText,
  AlertCircle,
  Brain,
  Upload,
  RefreshCw,
  Activity,
  HeartPulse,
  TrendingUp,
  CheckCircle2,
  Calendar,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  ShieldAlert,
  Info,
  AlertTriangle,
  Trash2,
  X,
  UserCog,
  Save,
  Lock,
  XCircle,
  ChevronDown,
  ChevronUp,
  PlusCircle,
  ShieldCheck,
  Stethoscope,
  Users,
} from 'lucide-react';
import { StatCard } from '../../components/common/StatCard';
import { ReportUploadModal } from '../../components/ocr/ReportUploadModal';
import { OcrViewerModal } from '../../components/ocr/OcrViewerModal';
import { patientService } from '../../services/patientService';
import { reportService } from '../../services/reportService';
import { predictionService } from '../../services/predictionService';
import { CareTeamSection } from '../../components/relationships/CareTeamSection';
import { useToast } from '../../hooks/useToast';

export const PatientDashboard = () => {
  const { addToast } = useToast();
  const location = useLocation();

  const [patient, setPatient] = useState(null);
  const [reports, setReports] = useState([]);
  const [prediction, setPrediction] = useState(null);
  const [heartDiseasePrediction, setHeartDiseasePrediction] = useState(null);
  const [predictionHistory, setPredictionHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Progressive disclosure states for AI cards
  const [expandedDiabetesDetails, setExpandedDiabetesDetails] = useState(false);
  const [expandedHeartDetails, setExpandedHeartDetails] = useState(false);

  // Modals & interactive state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [ocrModalOpen, setOcrModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [showWhyInfo, setShowWhyInfo] = useState(false);

  // Demographic & Physical vitals edit state
  const [editDemoOpen, setEditDemoOpen] = useState(false);
  const [demoForm, setDemoForm] = useState({
    age: '',
    gender: '',
    systolicBP: '',
    diastolicBP: '',
    bmi: '',
    totalCholesterol: '',
    isCurrentSmoker: '',
  });
  const [savingDemo, setSavingDemo] = useState(false);

  const handleOpenDemoEdit = () => {
    setDemoForm({
      age: patient?.age || '',
      gender: patient?.gender || '',
      systolicBP: patient?.systolicBP || '',
      diastolicBP: patient?.diastolicBP || '',
      bmi: patient?.bmi || '',
      totalCholesterol: patient?.totalCholesterol || '',
      isCurrentSmoker:
        patient?.isCurrentSmoker === null || patient?.isCurrentSmoker === undefined
          ? ''
          : String(patient.isCurrentSmoker),
    });
    setEditDemoOpen(true);
  };

  const handleSaveDemographics = async () => {
    const ageNum = Number(demoForm.age);
    if (!demoForm.gender) {
      addToast('Please select your biological sex.', 'warning');
      return;
    }
    if (!demoForm.age || isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
      addToast('Please enter a valid age (1–120).', 'warning');
      return;
    }
    setSavingDemo(true);
    try {
      const payload = {
        age: ageNum,
        gender: demoForm.gender,
      };
      if (demoForm.systolicBP) payload.systolicBP = Number(demoForm.systolicBP);
      if (demoForm.diastolicBP) payload.diastolicBP = Number(demoForm.diastolicBP);
      if (demoForm.bmi) payload.bmi = Number(demoForm.bmi);
      if (demoForm.totalCholesterol) payload.totalCholesterol = Number(demoForm.totalCholesterol);
      if (demoForm.isCurrentSmoker !== '') {
        payload.isCurrentSmoker = demoForm.isCurrentSmoker === 'true';
      }

      let res;
      try {
        res = await patientService.updateMyDemographics(payload);
      } catch (patchErr) {
        res = await patientService.updatePatient(patient._id, payload);
      }

      setPatient((prev) => ({
        ...prev,
        ...(res?.data || {}),
        age: ageNum,
        gender: demoForm.gender,
        systolicBP: payload.systolicBP ?? prev.systolicBP,
        diastolicBP: payload.diastolicBP ?? prev.diastolicBP,
        bmi: payload.bmi ?? prev.bmi,
        totalCholesterol: payload.totalCholesterol ?? prev.totalCholesterol,
        isCurrentSmoker: payload.isCurrentSmoker ?? prev.isCurrentSmoker,
      }));
      setEditDemoOpen(false);
      addToast('Health profile updated successfully! AI risk assessment updated.', 'success');
      fetchData();
    } catch (err) {
      console.error(err);
      addToast(err.response?.data?.message || 'Failed to update profile.', 'error');
    } finally {
      setSavingDemo(false);
    }
  };

  const handleDeleteReport = async (reportId, e) => {
    e.stopPropagation();
    if (confirmDeleteId !== reportId) {
      setConfirmDeleteId(reportId);
      return;
    }
    setConfirmDeleteId(null);
    setDeletingId(reportId);
    try {
      await reportService.deleteReport(reportId);
      setReports((prev) => prev.filter((r) => r._id !== reportId));
      addToast('Report deleted successfully.', 'success');
    } catch (err) {
      console.error(err);
      addToast(err.response?.data?.message || 'Failed to delete report.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const cancelDelete = (e) => {
    e.stopPropagation();
    setConfirmDeleteId(null);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const profileRes = await patientService.getMyProfile();
      if (profileRes.data) setPatient(profileRes.data);

      const repRes = await reportService.getReports();
      if (repRes.data) setReports(repRes.data);

      try {
        const predRes = await predictionService.getLatestDiabetesPrediction();
        if (predRes.data) {
          setPrediction(predRes.data);
        } else {
          const histRes = await predictionService.getPredictionHistory();
          if (histRes.data && histRes.data.length > 0) {
            setPrediction(histRes.data[0]);
          } else {
            setPrediction(null);
          }
        }
      } catch (pErr) {
        setPrediction(null);
      }

      try {
        const hdRes = await predictionService.getLatestHeartDiseasePrediction();
        if (hdRes.data) {
          setHeartDiseasePrediction(hdRes.data);
        } else {
          const hdHistRes = await predictionService.getHeartDiseasePredictionHistory();
          if (hdHistRes.data && hdHistRes.data.length > 0) {
            setHeartDiseasePrediction(hdHistRes.data[0]);
          } else {
            setHeartDiseasePrediction(null);
          }
        }
      } catch (hdErr) {
        setHeartDiseasePrediction(null);
      }
    } catch (err) {
      console.error(err);
      addToast('Failed to sync patient health profile data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle automatic scrolling/focus based on sub-route
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/reports')) {
      document.getElementById('patient-reports-section')?.scrollIntoView({ behavior: 'smooth' });
    } else if (path.includes('/predictions')) {
      document.getElementById('patient-ai-risk-section')?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [location.pathname]);

  const handleReportUploaded = (data) => {
    fetchData();
    if (data?.report) {
      setSelectedReport(data.report);
      setOcrModalOpen(true);
    }
  };

  const bpFormatted =
    patient?.systolicBP && patient?.diastolicBP
      ? `${patient.systolicBP}/${patient.diastolicBP} mmHg`
      : 'Not recorded';

  const pendingReports = reports.filter((r) => r.status === 'PENDING_REVIEW');
  const confirmedReports = reports.filter((r) => r.status !== 'PENDING_REVIEW');

  const renderReportCard = (rep, isPending = false) => {
    const confirmedMetrics = rep.confirmedData || rep.structuredData || {};
    const isAbpm =
      rep.reportType === 'ambulatory_blood_pressure_monitoring' ||
      rep.reportType === 'Ambulatory Blood Pressure Monitoring' ||
      Boolean(rep.confirmedData?.measurements?.bloodPressure || rep.extractedData?.measurements?.bloodPressure);

    const getVal = (v) => (v && typeof v === 'object' ? (v.value ?? null) : (v ?? null));

    const measurements = rep.confirmedData?.measurements || rep.extractedData?.measurements;
    const bpMeas = measurements?.bloodPressure;
    const overallSys =
      getVal(bpMeas?.overall?.average?.systolic) ??
      getVal(measurements?.overall?.avgSystolic) ??
      getVal(confirmedMetrics?.systolicBP);
    const overallDia =
      getVal(bpMeas?.overall?.average?.diastolic) ??
      getVal(measurements?.overall?.avgDiastolic) ??
      getVal(confirmedMetrics?.diastolicBP);
    const wakeSys =
      getVal(bpMeas?.wake?.average?.systolic) ??
      getVal(measurements?.wake?.avgSystolic);
    const wakeDia =
      getVal(bpMeas?.wake?.average?.diastolic) ??
      getVal(measurements?.wake?.avgDiastolic);
    const sleepSys =
      getVal(bpMeas?.sleep?.average?.systolic) ??
      getVal(measurements?.sleep?.avgSystolic);
    const sleepDia =
      getVal(bpMeas?.sleep?.average?.diastolic) ??
      getVal(measurements?.sleep?.avgDiastolic);
    const hr =
      getVal(measurements?.heartRate?.overallAverage) ??
      getVal(measurements?.overall?.heartRate) ??
      getVal(confirmedMetrics?.heartRate);

    const glucoseVal = getVal(confirmedMetrics.fastingGlucose) ?? getVal(confirmedMetrics.fastingSugar);
    const sysVal = getVal(confirmedMetrics.systolicBP);
    const diaVal = getVal(confirmedMetrics.diastolicBP);
    const cholVal = getVal(confirmedMetrics.totalCholesterol);
    const creatVal = getVal(confirmedMetrics.serumCreatinine) ?? getVal(confirmedMetrics.creatinine);
    const hbVal = getVal(confirmedMetrics.hemoglobin);

    return (
      <div
        key={rep._id}
        onClick={() => {
          setSelectedReport(rep);
          setOcrModalOpen(true);
        }}
        className={`p-4 sm:p-5 rounded-2xl border transition-all space-y-3 group cursor-pointer ${
          isPending
            ? 'bg-amber-500/5 border-amber-500/30 hover:border-amber-500/60'
            : 'bg-slate-950/80 border-slate-800 hover:border-brand-500/50'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center flex-wrap gap-2">
              <span
                className={`text-xs sm:text-sm font-bold truncate ${
                  isPending ? 'text-amber-200' : 'text-white group-hover:text-cyan-400'
                } transition-colors`}
              >
                {rep.title}
              </span>
              <span
                className={`text-[10px] px-2.5 py-0.5 rounded-full border font-bold uppercase tracking-wider ${
                  isPending
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    : rep.status === 'CONFIRMED'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {isPending ? 'Pending Verification' : rep.status || 'CONFIRMED'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {rep.reportType?.replace(/_/g, ' ') || 'Diagnostic Report'} • Uploaded:{' '}
              {new Date(rep.uploadDate).toLocaleDateString()}
            </p>
          </div>

          <div className="flex items-center space-x-2 shrink-0 self-start sm:self-auto">
            {/* Delete controls */}
            {confirmDeleteId === rep._id ? (
              <div className="flex items-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
                <span className="text-[10px] text-rose-400 font-bold">Delete?</span>
                <button
                  onClick={(e) => handleDeleteReport(rep._id, e)}
                  disabled={deletingId === rep._id}
                  className="px-2 py-1 rounded-lg text-[10px] font-bold text-white bg-rose-500 hover:bg-rose-600 transition-all cursor-pointer"
                >
                  Yes, Delete
                </button>
                <button
                  onClick={cancelDelete}
                  className="p-1 rounded-lg text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-all cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={(e) => handleDeleteReport(rep._id, e)}
                disabled={deletingId === rep._id}
                title="Delete this report"
                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 transition-all opacity-80 sm:opacity-0 group-hover:opacity-100 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}

            {isPending ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedReport(rep);
                  setOcrModalOpen(true);
                }}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-300 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 hover:border-amber-500/60 shadow-sm transition-all cursor-pointer"
              >
                <span>Review &amp; Confirm</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
              </button>
            ) : (
              <div className="flex items-center space-x-1.5 text-xs text-brand-400 font-semibold group-hover:text-cyan-400 transition-colors">
                <span>View Report</span>
                <Eye className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        </div>

        {/* Human-Readable Summary */}
        {isAbpm && (overallSys || wakeSys || sleepSys) ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/80">
            <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800/60">
              <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400 block">
                24h Average BP
              </span>
              <span className="text-xs font-black text-white mt-0.5 block">
                {overallSys && overallDia ? `${overallSys}/${overallDia} mmHg` : 'Not recorded'}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800/60">
              <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400 block">
                Wake Average
              </span>
              <span className="text-xs font-black text-amber-300 mt-0.5 block">
                {wakeSys && wakeDia ? `${wakeSys}/${wakeDia} mmHg` : 'Not recorded'}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800/60">
              <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400 block">
                Sleep Average
              </span>
              <span className="text-xs font-black text-indigo-300 mt-0.5 block">
                {sleepSys && sleepDia ? `${sleepSys}/${sleepDia} mmHg` : 'Not recorded'}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800/60">
              <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400 block">
                Heart Rate
              </span>
              <span className="text-xs font-black text-rose-300 mt-0.5 block">
                {hr ? `${hr} BPM` : 'Not recorded'}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-800/60">
            {glucoseVal !== null && glucoseVal !== undefined && (
              <span className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-900 text-slate-300 border border-slate-800">
                Glucose: <strong className="text-white">{glucoseVal} mg/dL</strong>
              </span>
            )}
            {sysVal !== null && sysVal !== undefined && (
              <span className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-900 text-slate-300 border border-slate-800">
                BP: <strong className="text-white">{sysVal}/{diaVal || '—'} mmHg</strong>
              </span>
            )}
            {cholVal !== null && cholVal !== undefined && (
              <span className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-900 text-slate-300 border border-slate-800">
                Cholesterol: <strong className="text-white">{cholVal} mg/dL</strong>
              </span>
            )}
            {creatVal !== null && creatVal !== undefined && (
              <span className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-900 text-slate-300 border border-slate-800">
                Creatinine: <strong className="text-white">{creatVal} mg/dL</strong>
              </span>
            )}
            {hbVal !== null && hbVal !== undefined && (
              <span className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-900 text-slate-300 border border-slate-800">
                Hb: <strong className="text-white">{hbVal} g/dL</strong>
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-8">
      {/* ── Demographic Profile Incomplete Warning Banner ── */}
      {patient && (!patient.age || !patient.gender) && !editDemoOpen && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg shadow-amber-500/5">
          <div className="flex items-start space-x-3">
            <div className="p-2 rounded-xl bg-amber-500/15 shrink-0 mt-0.5">
              <UserCog className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-300">Complete your profile to enable AI Risk Assessment</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                The validated models require your <span className="text-white font-semibold">age</span> and{' '}
                <span className="text-white font-semibold">biological sex</span> for accurate risk calculation.
                {!patient.age && !patient.gender
                  ? ' Both are missing.'
                  : !patient.age
                  ? ' Age is missing.'
                  : ' Biological sex is missing.'}
              </p>
            </div>
          </div>
          <button
            onClick={handleOpenDemoEdit}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 transition-all shrink-0 flex items-center space-x-1.5 cursor-pointer"
          >
            <UserCog className="w-3.5 h-3.5" />
            <span>Set Age &amp; Sex</span>
          </button>
        </div>
      )}

      {/* ── Physical Domain Missing Warning Banner ── */}
      {patient &&
        patient.age &&
        patient.gender &&
        !patient.bmi &&
        (!patient.systolicBP || !patient.diastolicBP) &&
        !editDemoOpen && (
          <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg shadow-cyan-500/5">
            <div className="flex items-start space-x-3">
              <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400 shrink-0 mt-0.5">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-cyan-300">
                  Action Needed: Add Resting Blood Pressure or BMI to calculate AI Diabetes Risk
                </p>
                <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                  Your demographics (Age {patient.age}, {patient.gender}) are confirmed. The AI model requires at least one
                  physical indicator (<span className="text-white font-semibold">Resting BP</span> or{' '}
                  <span className="text-white font-semibold">BMI</span>) to generate your calibrated risk score.
                </p>
              </div>
            </div>
            <button
              onClick={handleOpenDemoEdit}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-brand-500 hover:from-cyan-600 hover:to-brand-600 shadow-md shadow-cyan-500/20 transition-all shrink-0 flex items-center space-x-1.5 cursor-pointer"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Enter BP / BMI</span>
            </button>
          </div>
        )}

      {/* ── Demographic & Physical Vitals Edit Inline Modal ── */}
      {editDemoOpen && (
        <div className="p-5 rounded-3xl bg-slate-950 border border-brand-500/40 shadow-2xl shadow-brand-500/10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <UserCog className="w-4 h-4 text-brand-400" />
              <h4 className="text-sm font-bold text-white">Update Clinical Profile &amp; Physiological Vitals</h4>
            </div>
            <button onClick={() => setEditDemoOpen(false)} className="p-1 text-slate-500 hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            MedScan-NCD requires demographic data (age &amp; sex), at least one physical measurement (Blood Pressure or
            BMI), and routine laboratory values from confirmed diagnostic reports to calculate clinical risk.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1.5">Age (years) *</label>
              <input
                type="number"
                min="1"
                max="120"
                placeholder="e.g. 45"
                value={demoForm.age}
                onChange={(e) => setDemoForm((p) => ({ ...p, age: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1.5">Biological Sex *</label>
              <select
                value={demoForm.gender}
                onChange={(e) => setDemoForm((p) => ({ ...p, gender: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-brand-500 focus:outline-none"
              >
                <option value="">Select sex</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1.5">Resting BP (Systolic/Dia)</label>
              <div className="flex items-center space-x-1.5">
                <input
                  type="number"
                  min="60"
                  max="260"
                  placeholder="Sys (120)"
                  value={demoForm.systolicBP}
                  onChange={(e) => setDemoForm((p) => ({ ...p, systolicBP: e.target.value }))}
                  className="w-1/2 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white focus:border-brand-500 focus:outline-none"
                />
                <span className="text-slate-500 text-xs">/</span>
                <input
                  type="number"
                  min="30"
                  max="150"
                  placeholder="Dia (80)"
                  value={demoForm.diastolicBP}
                  onChange={(e) => setDemoForm((p) => ({ ...p, diastolicBP: e.target.value }))}
                  className="w-1/2 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white focus:border-brand-500 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1.5">Body Mass Index (BMI)</label>
              <input
                type="number"
                step="0.1"
                min="10"
                max="80"
                placeholder="e.g. 24.5 kg/m²"
                value={demoForm.bmi}
                onChange={(e) => setDemoForm((p) => ({ ...p, bmi: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1.5">Total Cholesterol (mg/dL)</label>
              <input
                type="number"
                min="50"
                max="600"
                placeholder="e.g. 210"
                value={demoForm.totalCholesterol}
                onChange={(e) => setDemoForm((p) => ({ ...p, totalCholesterol: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1.5">Smoking Status</label>
              <select
                value={demoForm.isCurrentSmoker}
                onChange={(e) => setDemoForm((p) => ({ ...p, isCurrentSmoker: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-brand-500 focus:outline-none"
              >
                <option value="">Not Specified</option>
                <option value="false">Non-smoker</option>
                <option value="true">Current Smoker</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end space-x-3 pt-2">
            <button
              onClick={() => setEditDemoOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveDemographics}
              disabled={savingDemo}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-brand-500 to-cyan-500 hover:from-brand-600 hover:to-cyan-600 flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingDemo ? 'Saving...' : 'Save Profile & Calculate AI Risk'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Section 1: Top Header Banner & Quick Actions ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 glass-card p-6 rounded-3xl border border-slate-800 shadow-xl">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-500/20 to-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-black text-xl shadow-lg shrink-0">
            {patient?.user?.name ? patient.user.name.charAt(0).toUpperCase() : 'P'}
          </div>
          <div>
            <div className="flex items-center flex-wrap gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Welcome, {patient?.user?.name || 'Patient'}
              </h1>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold">
                Patient Portal
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 flex items-center flex-wrap gap-x-3 gap-y-1">
              <span>
                Village: <strong className="text-white">{patient?.village || 'Not specified'}</strong>
              </span>
              <span>•</span>
              <span>
                Blood Group: <strong className="text-cyan-400">{patient?.bloodGroup || 'Not recorded'}</strong>
              </span>
              <span>•</span>
              <span>
                Age/Sex:{' '}
                <strong className="text-slate-200">
                  {patient?.age ? `${patient.age} yrs` : 'Age needed'} / {patient?.gender || 'Sex needed'}
                </strong>
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-3">
          {/* Primary Action */}
          <button
            onClick={() => setUploadModalOpen(true)}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-brand-500 to-cyan-500 hover:from-brand-600 hover:to-cyan-600 shadow-lg shadow-brand-500/25 flex items-center space-x-2 transition-all active:scale-95 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Lab Report</span>
          </button>

          {/* Secondary Actions */}
          <button
            onClick={handleOpenDemoEdit}
            className="px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/80 transition-all flex items-center space-x-1.5 cursor-pointer"
            title="Update Profile & Vitals"
          >
            <UserCog className="w-4 h-4 text-brand-400" />
            <span>Update Profile</span>
          </button>

          <button
            onClick={fetchData}
            className="p-2.5 rounded-xl text-slate-400 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/80 transition-all cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Section 2: Top Stat Cards (Responsive Typography) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Lab Reports"
          value={reports.length}
          icon={FileText}
          color="cyan"
          description={reports.length === 0 ? 'No reports uploaded yet' : `${reports.length} diagnostic document(s)`}
        />
        <StatCard
          title="Fasting Glucose"
          value={patient?.fastingSugar ? `${patient.fastingSugar} mg/dL` : 'Not recorded'}
          icon={Activity}
          color={patient?.fastingSugar && patient.fastingSugar > 125 ? 'amber' : 'emerald'}
          description={patient?.fastingSugar ? 'From confirmed lab report' : 'Upload report to record'}
        />
        <StatCard
          title="Blood Pressure"
          value={bpFormatted}
          icon={HeartPulse}
          color={patient?.systolicBP && patient.systolicBP > 130 ? 'amber' : 'cyan'}
          description={patient?.systolicBP ? 'From confirmed lab report' : 'Upload report to record'}
        />
        <StatCard
          title="Risk Assessment"
          value={prediction ? `${prediction.overallRiskPercent}%` : 'Awaiting Reports'}
          icon={Brain}
          color={prediction ? (prediction.riskLevel === 'High' ? 'rose' : 'emerald') : 'slate'}
          description={prediction ? `${prediction.riskLevel} Risk Evaluation` : 'Upload report to evaluate'}
        />
      </div>

      {/* ── Section 3: AI Health Risk Intelligence (Symmetrical 2-Column with Progressive Disclosure) ── */}
      <div id="patient-ai-risk-section" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div>
            <h2 className="text-base sm:text-lg font-black text-white flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-gradient-to-tr from-brand-500/20 to-rose-500/20 text-brand-400 border border-brand-500/30">
                <Brain className="w-5 h-5" />
              </div>
              <span>AI Health Risk Intelligence</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Multi-disease risk stratification evaluated via calibrated machine learning models
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Active AI Engines</span>
            </span>
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-slate-900 text-slate-400 border border-slate-800 font-medium">
              Clinical Decision Support
            </span>
          </div>
        </div>

        {/* Symmetrical 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Active Model 1: Type-2 Diabetes Risk */}
          <div id="patient-predictions-section" className="glass-card p-6 rounded-3xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
                  <Brain className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white">Diabetes Risk Assessment</h3>
                  <p className="text-[10px] text-slate-400">Model: Diabetes Risk Model v{prediction?.modelVersion || '1.0.0'}</p>
                </div>
              </div>
              <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                Active AI
              </span>
            </div>

            {prediction && prediction.canCalculate && prediction.status === 'SUCCESS' ? (
              <div className="space-y-4">
                {/* Primary Probability Box */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                        Estimated Probability
                      </span>
                      <span className="text-3xl font-black text-white mt-1 block tracking-tight">
                        {prediction.probability !== undefined && prediction.probability !== null
                          ? `${(prediction.probability * 100).toFixed(1)}%`
                          : `${prediction.overallRiskPercent}%`}
                      </span>
                      <span className="text-[11px] text-slate-400 block mt-0.5">Model-estimated diabetes risk</span>
                    </div>

                    <div className="text-right space-y-1.5">
                      <span
                        className={`inline-block text-xs px-3 py-1 rounded-full border font-bold ${
                          prediction.riskCategory === 'ELEVATED_MODEL_ESTIMATED_RISK'
                            ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                            : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        }`}
                      >
                        {prediction.riskCategory === 'ELEVATED_MODEL_ESTIMATED_RISK'
                          ? 'Elevated model risk'
                          : 'Lower model risk'}
                      </span>

                      <div>
                        <span
                          className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                            prediction.dataCompleteness === 'PARTIAL'
                              ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
                              : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          }`}
                        >
                          {prediction.dataCompleteness === 'PARTIAL' ? 'PARTIAL DATA' : 'FULL DATA'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Informational threshold */}
                  <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-[10px] text-slate-400">
                    <span>Threshold: 21.0%</span>
                    <span className="italic">Derived from development cohort</span>
                  </div>
                </div>

                {/* Key Contributing Factors (Directional & Non-Causal) */}
                {prediction.topContributingFactors && prediction.topContributingFactors.length > 0 && (
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-white">Contributing Factors</p>
                      <span className="text-[10px] text-slate-500">Directional impact</span>
                    </div>

                    <div className="space-y-1.5">
                      {(expandedDiabetesDetails
                        ? prediction.topContributingFactors
                        : prediction.topContributingFactors.slice(0, 2)
                      ).map((factor, idx) => {
                        const isIncrease =
                          factor.impact?.includes('higher') || factor.impact?.includes('increase');
                        return (
                          <div
                            key={idx}
                            className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                          >
                            <span className="text-slate-300 font-medium capitalize truncate flex-1">
                              {factor.description ||
                                `${factor.feature?.replace(/_/g, ' ')} contributed toward ${
                                  isIncrease ? 'higher' : 'lower'
                                } estimated risk.`}
                            </span>
                            <span
                              className={`text-[9px] px-2 py-0.5 rounded font-bold shrink-0 ${
                                isIncrease
                                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
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

                {/* Concise Clinical Disclaimer */}
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/60 text-[10px] text-slate-400 leading-relaxed italic">
                  Non-diagnostic risk estimation derived from routine cardiometabolic parameters for clinical decision
                  support. Does not substitute for clinical laboratory testing.
                </div>

                {/* Progressive Disclosure: View Detailed Breakdown Button */}
                <button
                  onClick={() => setExpandedDiabetesDetails(!expandedDiabetesDetails)}
                  className="w-full py-2 px-3 rounded-xl bg-slate-900/90 hover:bg-slate-850 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <span>
                    {expandedDiabetesDetails
                      ? 'Hide Detailed Breakdown'
                      : `View Full Clinical Factors & Measurements (${
                          Object.values(prediction.inputFeatures || {}).filter((v) => v !== null && v !== undefined).length
                        }/8)`}
                  </span>
                  {expandedDiabetesDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {/* Expanded Detailed Analysis */}
                {expandedDiabetesDetails && (
                  <div className="space-y-3 pt-2 border-t border-slate-800/80">
                    {/* Observed Measurements Panel */}
                    <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-[11px] uppercase tracking-wider">
                          Observed Measurements
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {Object.values(prediction.inputFeatures || {}).filter((v) => v !== null && v !== undefined).length}
                          /8 observed
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                        {Object.entries(prediction.inputFeatures || {}).map(([key, val]) => {
                          const prov = prediction.featureAvailability?.provenance?.[key];
                          const isPresent = val !== null && val !== undefined && !Number.isNaN(val);
                          return (
                            <div
                              key={key}
                              className="p-2 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between gap-1"
                            >
                              <div className="flex items-center space-x-1.5 min-w-0">
                                {isPresent ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                ) : (
                                  <XCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                )}
                                <span className="text-slate-300 capitalize truncate font-medium">
                                  {key.replace(/_/g, ' ')}
                                </span>
                              </div>
                              <div className="flex items-center space-x-1.5 shrink-0">
                                {isPresent ? (
                                  <>
                                    <span className="font-bold text-white">{val}</span>
                                    <span className="text-[9px] px-1 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                                      {prov === 'report' ? 'Report' : 'Profile'}
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-[10px] text-slate-500 italic">Missing</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Recommendations */}
                    {prediction.recommendations && prediction.recommendations.length > 0 && (
                      <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                        <p className="text-xs font-bold text-slate-300">Preventive Next Steps:</p>
                        <ul className="space-y-1 text-[11px] text-slate-400">
                          {prediction.recommendations.map((rec, i) => (
                            <li key={i} className="flex items-start space-x-2 leading-relaxed">
                              <span className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-1.5 shrink-0" />
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : prediction && prediction.status === 'SERVICE_UNAVAILABLE' ? (
              <div className="p-6 text-center space-y-3">
                <ShieldCheck className="w-8 h-8 text-amber-400 mx-auto" />
                <h4 className="text-sm font-bold text-white">Assessment Temporarily Unavailable</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Risk engine is undergoing scheduled maintenance. Your confirmed clinical data is safely preserved.
                </p>
              </div>
            ) : prediction && prediction.status === 'INSUFFICIENT_DATA' ? (
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Clinical Data Needed for Prediction</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  The model requires demographic data (Age &amp; Sex), at least one physical vitals indicator (BMI or
                  Blood Pressure), and routine laboratory measurements (Creatinine or Cholesterol).
                </p>
                <div className="flex items-center space-x-2 pt-1">
                  <button
                    onClick={handleOpenDemoEdit}
                    className="flex-1 py-2 px-3 rounded-xl text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                  >
                    <UserCog className="w-3.5 h-3.5" />
                    <span>Enter Profile Vitals</span>
                  </button>
                  <button
                    onClick={() => setUploadModalOpen(true)}
                    className="flex-1 py-2 px-3 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-900 border border-slate-700 transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Upload Lab Report</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center space-y-3">
                <Brain className="w-8 h-8 text-slate-600 mx-auto" />
                <h4 className="text-xs font-bold text-white">Awaiting Laboratory Reports</h4>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  Upload a diagnostic report to automatically calculate calibrated type-2 diabetes risk.
                </p>
                <button
                  onClick={() => setUploadModalOpen(true)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 transition-all inline-flex items-center space-x-1.5 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Medical Report</span>
                </button>
              </div>
            )}
          </div>

          {/* Active Model 2: Framingham 10-Year Heart Disease Risk */}
          <div id="patient-heart-predictions-section" className="glass-card p-6 rounded-3xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                  <HeartPulse className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white">Heart Disease Risk Assessment</h3>
                  <p className="text-[10px] text-slate-400">Model: Framingham 10-Year CHD v{heartDiseasePrediction?.modelVersion || '1.0.0'}</p>
                </div>
              </div>
              <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                Active AI
              </span>
            </div>

            {heartDiseasePrediction && heartDiseasePrediction.canCalculate && heartDiseasePrediction.status === 'SUCCESS' ? (
              <div className="space-y-4">
                {/* Primary Probability Box */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                        Estimated 10-Year Risk
                      </span>
                      <span className="text-3xl font-black text-white mt-1 block tracking-tight">
                        {heartDiseasePrediction.probability !== undefined && heartDiseasePrediction.probability !== null
                          ? `${(heartDiseasePrediction.probability * 100).toFixed(1)}%`
                          : `${heartDiseasePrediction.overallRiskPercent}%`}
                      </span>
                      <span className="text-[11px] text-slate-400 block mt-0.5">Model-estimated 10-year CHD risk</span>
                    </div>

                    <div className="text-right space-y-1.5">
                      <span
                        className={`inline-block text-xs px-3 py-1 rounded-full border font-bold ${
                          heartDiseasePrediction.riskCategory === 'ELEVATED_MODEL_ESTIMATED_RISK'
                            ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                            : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        }`}
                      >
                        {heartDiseasePrediction.riskCategory === 'ELEVATED_MODEL_ESTIMATED_RISK'
                          ? 'Elevated model risk'
                          : 'Lower model risk'}
                      </span>

                      <div>
                        <span
                          className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                            heartDiseasePrediction.dataCompleteness === 'PARTIAL'
                              ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
                              : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          }`}
                        >
                          {heartDiseasePrediction.dataCompleteness === 'PARTIAL' ? 'PARTIAL DATA' : 'FULL DATA'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Informational threshold */}
                  <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-[10px] text-slate-400">
                    <span>Threshold: 11.0%</span>
                    <span className="italic">Framingham development cohort</span>
                  </div>
                </div>

                {/* Key Contributing Factors (Directional & Non-Causal) */}
                {heartDiseasePrediction.topContributingFactors && heartDiseasePrediction.topContributingFactors.length > 0 && (
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-white">Contributing Factors</p>
                      <span className="text-[10px] text-slate-500">Directional impact</span>
                    </div>

                    <div className="space-y-1.5">
                      {(expandedHeartDetails
                        ? heartDiseasePrediction.topContributingFactors
                        : heartDiseasePrediction.topContributingFactors.slice(0, 2)
                      ).map((factor, idx) => {
                        const isIncrease =
                          factor.impact?.includes('higher') || factor.impact?.includes('increase');
                        return (
                          <div
                            key={idx}
                            className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                          >
                            <span className="text-slate-300 font-medium capitalize truncate flex-1">
                              {factor.description ||
                                `${factor.feature?.replace(/_/g, ' ')} contributed toward ${
                                  isIncrease ? 'higher' : 'lower'
                                } estimated risk.`}
                            </span>
                            <span
                              className={`text-[9px] px-2 py-0.5 rounded font-bold shrink-0 ${
                                isIncrease
                                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
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

                {/* Concise Clinical Disclaimer */}
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/60 text-[10px] text-slate-400 leading-relaxed italic">
                  Non-diagnostic risk estimation derived from routine cardiometabolic parameters for clinical decision
                  support. Does not substitute for clinical laboratory testing.
                </div>

                {/* Progressive Disclosure: View Detailed Breakdown Button */}
                <button
                  onClick={() => setExpandedHeartDetails(!expandedHeartDetails)}
                  className="w-full py-2 px-3 rounded-xl bg-slate-900/90 hover:bg-slate-850 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <span>
                    {expandedHeartDetails
                      ? 'Hide Detailed Breakdown'
                      : `View Full Clinical Factors & Measurements (${
                          Object.values(heartDiseasePrediction.inputFeatures || {}).filter(
                            (v) => v !== null && v !== undefined
                          ).length
                        }/8)`}
                  </span>
                  {expandedHeartDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {/* Expanded Detailed Analysis */}
                {expandedHeartDetails && (
                  <div className="space-y-3 pt-2 border-t border-slate-800/80">
                    {/* Observed Measurements Panel */}
                    <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-[11px] uppercase tracking-wider">
                          Observed Measurements
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {
                            Object.values(heartDiseasePrediction.inputFeatures || {}).filter(
                              (v) => v !== null && v !== undefined
                            ).length
                          }
                          /8 observed
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                        {Object.entries(heartDiseasePrediction.inputFeatures || {}).map(([key, val]) => {
                          const isPresent = val !== null && val !== undefined && !Number.isNaN(val);
                          const prov = heartDiseasePrediction.featureAvailability?.[key];
                          const sourceLabel =
                            prov?.sourceLabel ||
                            (prov?.source === 'report' ? 'Report' : prov?.source === 'profile' ? 'Profile' : '');

                          let displayVal = val;
                          if (key === 'sex') {
                            displayVal = val === 1 ? 'Male' : val === 0 ? 'Female' : val;
                          } else if (key === 'currentSmoker') {
                            displayVal = val === 1 ? 'Smoker' : val === 0 ? 'Non-smoker' : val;
                          }

                          return (
                            <div
                              key={key}
                              className="p-2 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between gap-1"
                            >
                              <div className="flex items-center space-x-1.5 min-w-0">
                                {isPresent ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                ) : (
                                  <XCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                )}
                                <span className="text-slate-300 capitalize truncate font-medium">
                                  {key === 'totChol'
                                    ? 'Cholesterol'
                                    : key === 'sysBP'
                                    ? 'Systolic BP'
                                    : key === 'diaBP'
                                    ? 'Diastolic BP'
                                    : key === 'currentSmoker'
                                    ? 'Smoking'
                                    : key.replace(/_/g, ' ')}
                                </span>
                              </div>
                              <div className="flex items-center space-x-1.5 shrink-0">
                                {isPresent ? (
                                  <>
                                    <span className="font-bold text-white">{displayVal}</span>
                                    {sourceLabel && (
                                      <span className="text-[9px] px-1 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                                        {sourceLabel}
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-[10px] text-slate-500 italic">Imputed</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Recommendations */}
                    {heartDiseasePrediction.recommendations && heartDiseasePrediction.recommendations.length > 0 && (
                      <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                        <p className="text-xs font-bold text-slate-300">Preventive Next Steps:</p>
                        <ul className="space-y-1 text-[11px] text-slate-400">
                          {heartDiseasePrediction.recommendations.map((rec, i) => (
                            <li key={i} className="flex items-start space-x-2 leading-relaxed">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : heartDiseasePrediction &&
              (heartDiseasePrediction.status === 'PREDICTION_SERVICE_UNAVAILABLE' ||
                heartDiseasePrediction.status === 'SERVICE_UNAVAILABLE') ? (
              <div className="p-6 text-center space-y-3">
                <ShieldCheck className="w-8 h-8 text-amber-400 mx-auto" />
                <h4 className="text-sm font-bold text-white">Assessment Temporarily Unavailable</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Risk engine is undergoing maintenance. Your confirmed cardiovascular records are safely stored.
                </p>
              </div>
            ) : heartDiseasePrediction && heartDiseasePrediction.status === 'INSUFFICIENT_DATA' ? (
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center space-x-2 text-rose-400 text-xs font-bold">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Cardiovascular Vitals Needed</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Requires Age (18–100), Biological Sex, Total Cholesterol, and Blood Pressure (Systolic &amp; Diastolic).
                </p>
                <div className="flex items-center space-x-2 pt-1">
                  <button
                    onClick={handleOpenDemoEdit}
                    className="flex-1 py-2 px-3 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                  >
                    <UserCog className="w-3.5 h-3.5" />
                    <span>Update Profile</span>
                  </button>
                  <button
                    onClick={() => setUploadModalOpen(true)}
                    className="flex-1 py-2 px-3 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-900 border border-slate-700 transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-rose-400" />
                    <span>Upload Lipid Panel</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center space-y-3">
                <HeartPulse className="w-8 h-8 text-slate-600 mx-auto" />
                <h4 className="text-xs font-bold text-white">Awaiting Cardiovascular Reports</h4>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  Upload a lipid panel or add blood pressure &amp; cholesterol to estimate 10-year heart disease risk.
                </p>
                <button
                  onClick={() => setUploadModalOpen(true)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 transition-all inline-flex items-center space-x-1.5 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Lab Report</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Multi-Disease Roadmap Strip (Sleek Horizontal Card) */}
        <div className="glass-card p-5 sm:p-6 rounded-3xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400">
                <Lock className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Multi-Disease Intelligence Roadmap</h4>
                <p className="text-[11px] text-slate-400">Upcoming predictive modules pending external clinical validation</p>
              </div>
            </div>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-slate-900 text-slate-400 border border-slate-800 font-mono">
              Under Development
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between opacity-85">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-white flex items-center space-x-1.5">
                    <span>Hypertension Risk</span>
                    <Lock className="w-3 h-3 text-slate-500" />
                  </h5>
                  <p className="text-[10px] text-slate-400">Continuous BP trajectory modeling</p>
                </div>
              </div>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-slate-900 text-slate-400 border border-slate-800 font-bold shrink-0">
                Coming Soon
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between opacity-85">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-white flex items-center space-x-1.5">
                    <span>Chronic Kidney Disease (CKD)</span>
                    <Lock className="w-3 h-3 text-slate-500" />
                  </h5>
                  <p className="text-[10px] text-slate-400">eGFR &amp; serum creatinine risk modeling</p>
                </div>
              </div>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-slate-900 text-slate-400 border border-slate-800 font-bold shrink-0">
                Coming Soon
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 4: Clinical History & Diagnostic Reports (Balanced 3-Column Grid) ── */}
      <div id="patient-reports-section" className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column (2 Cols): Reports Stack */}
        <div className="lg:col-span-2 space-y-6">
          {/* Pending Unconfirmed Reports Alert Section (Clearly Demarcated) */}
          {pendingReports.length > 0 && (
            <div className="glass-card p-6 rounded-3xl border border-amber-500/40 bg-amber-500/5 space-y-4 shadow-lg shadow-amber-500/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-amber-300">
                      Awaiting Patient Confirmation ({pendingReports.length})
                    </h3>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      Unconfirmed OCR data is NOT yet integrated into your active health profile or AI risk assessments
                    </p>
                  </div>
                </div>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold uppercase tracking-wider shrink-0">
                  Needs Review
                </span>
              </div>

              <div className="space-y-3">
                {pendingReports.map((rep) => renderReportCard(rep, true))}
              </div>
            </div>
          )}

          {/* Confirmed Medical Reports History */}
          <div className="glass-card p-6 rounded-3xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-brand-400" />
                  <span>Confirmed Medical Report History</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Verified diagnostic records integrated into your clinical profile
                </p>
              </div>
              <button
                onClick={() => setUploadModalOpen(true)}
                className="text-xs font-bold text-brand-400 hover:text-brand-300 flex items-center space-x-1 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload New</span>
              </button>
            </div>

            {confirmedReports.length === 0 && pendingReports.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-400 flex items-center justify-center mx-auto">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white">No medical reports yet</h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                    Upload your first diagnostic lab report (PNG, JPG, or PDF). Our OCR engine will extract key
                    physiological parameters for your review and build your baseline health profile.
                  </p>
                </div>
                <button
                  onClick={() => setUploadModalOpen(true)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 transition-all inline-flex items-center space-x-1.5 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Medical Report</span>
                </button>
              </div>
            ) : confirmedReports.length === 0 ? (
              <div className="p-6 text-center rounded-2xl bg-slate-950/40 border border-slate-800/60 space-y-2">
                <p className="text-xs text-slate-400">No confirmed reports yet.</p>
                <p className="text-[11px] text-amber-300">
                  Review and confirm the pending report above to activate verified records.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {confirmedReports.map((rep) => renderReportCard(rep, false))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 Col): Biomarkers Snapshot & Longitudinal Intelligence */}
        <div className="space-y-6">
          {/* Confirmed Health Biomarkers Snapshot */}
          <div className="glass-card p-6 rounded-3xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center space-x-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>Confirmed Biomarkers Snapshot</span>
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                <p className="text-[10px] uppercase font-bold text-slate-500">Fasting Glucose</p>
                <p className="text-sm font-extrabold text-white mt-1">
                  {patient?.fastingSugar ? `${patient.fastingSugar} mg/dL` : 'Not recorded'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                <p className="text-[10px] uppercase font-bold text-slate-500">Blood Pressure</p>
                <p className="text-sm font-extrabold text-white mt-1">{bpFormatted}</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                <p className="text-[10px] uppercase font-bold text-slate-500">Total Cholesterol</p>
                <p className="text-sm font-extrabold text-white mt-1">
                  {patient?.totalCholesterol ? `${patient.totalCholesterol} mg/dL` : 'Not recorded'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                <p className="text-[10px] uppercase font-bold text-slate-500">Serum Creatinine</p>
                <p className="text-sm font-extrabold text-white mt-1">
                  {patient?.serumCreatinine ? `${patient.serumCreatinine} mg/dL` : 'Not recorded'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                <p className="text-[10px] uppercase font-bold text-slate-500">Hemoglobin</p>
                <p className="text-sm font-extrabold text-white mt-1">
                  {patient?.hemoglobin ? `${patient.hemoglobin} g/dL` : 'Not recorded'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                <p className="text-[10px] uppercase font-bold text-slate-500">Body Mass Index</p>
                <p className="text-sm font-extrabold text-white mt-1">
                  {patient?.bmi ? `${patient.bmi} kg/m²` : 'Not recorded'}
                </p>
              </div>
            </div>
          </div>

          {/* Longitudinal Trend Foundation Preview */}
          <div className="glass-card p-6 rounded-3xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-white flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-teal-400" />
                <span>Longitudinal Health Intelligence</span>
              </h3>
              <span className="text-[10px] text-slate-500 uppercase font-mono">Phase 2 Foundation</span>
            </div>

            {confirmedReports.length >= 2 ? (
              <div className="space-y-3 pt-2">
                <p className="text-xs text-slate-300 leading-relaxed">
                  {confirmedReports.length} sequential confirmed reports recorded. Your longitudinal health trajectory is
                  being established across consecutive consultations.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Chronological Baseline</p>
                    <p className="text-xs text-white font-semibold mt-1">
                      Initial: {new Date(confirmedReports[confirmedReports.length - 1].uploadDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Latest Evaluation</p>
                    <p className="text-xs text-white font-semibold mt-1">
                      Recent: {new Date(confirmedReports[0].uploadDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 leading-relaxed">
                Upload and confirm at least two consecutive lab reports to unlock automated delta comparisons,
                trajectory detection, and longitudinal preventive tracking.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Section 5: Care Team & Designated Caregivers (Full Available Width) ── */}
      <div id="patient-care-team-section" className="w-full">
        <CareTeamSection />
      </div>

      {/* Modals */}
      <ReportUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        patientId={patient?._id}
        onReportUploaded={handleReportUploaded}
      />

      <OcrViewerModal
        isOpen={ocrModalOpen}
        onClose={() => setOcrModalOpen(false)}
        report={selectedReport}
        onReportConfirmed={fetchData}
      />
    </div>
  );
};
