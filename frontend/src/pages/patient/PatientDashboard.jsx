import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Pill, AlertCircle, Award, Brain, Upload, Calendar, RefreshCw, FileText } from 'lucide-react';
import { StatCard } from '../../components/common/StatCard';
import { MedicineCard } from '../../components/medicine/MedicineCard';
import { AdherenceChart } from '../../components/charts/AdherenceChart';
import { RiskGaugeChart } from '../../components/charts/RiskGaugeChart';
import { ReportUploadModal } from '../../components/ocr/ReportUploadModal';
import { OcrViewerModal } from '../../components/ocr/OcrViewerModal';
import { patientService } from '../../services/patientService';
import { medicineService } from '../../services/medicineService';
import { predictionService } from '../../services/predictionService';
import { reportService } from '../../services/reportService';
import { useToast } from '../../hooks/useToast';

export const PatientDashboard = () => {
  const { addToast } = useToast();
  const location = useLocation();

  const [patient, setPatient] = useState(null);
  const [medicines, setMedicines] = useState([]);
  const [reports, setReports] = useState([]);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [ocrModalOpen, setOcrModalOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const profileRes = await patientService.getMyProfile();
      if (profileRes.data) setPatient(profileRes.data);

      const medRes = await medicineService.getMedicines();
      if (medRes.data) setMedicines(medRes.data);

      const repRes = await reportService.getReports();
      if (repRes.data) setReports(repRes.data);

      const predRes = await predictionService.getPredictionHistory();
      if (predRes.data && predRes.data.length > 0) {
        setPrediction(predRes.data[0]);
      }
    } catch (err) {
      console.error(err);
      addToast('Failed to sync patient telemetry data.', 'error');
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
    if (path.includes('/medicines')) {
      document.getElementById('patient-medicines-section')?.scrollIntoView({ behavior: 'smooth' });
    } else if (path.includes('/reports')) {
      document.getElementById('patient-reports-section')?.scrollIntoView({ behavior: 'smooth' });
    } else if (path.includes('/predictions')) {
      document.getElementById('patient-predictions-section')?.scrollIntoView({ behavior: 'smooth' });
    } else if (path.includes('/appointments')) {
      document.getElementById('patient-appointments-section')?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [location.pathname]);

  const handleRunAiPrediction = async () => {
    try {
      addToast('Evaluating AI disease risk scoring model...', 'info');
      const res = await predictionService.runPrediction({});
      if (res.data?.prediction) {
        setPrediction(res.data.prediction);
        addToast('AI Risk Assessment updated successfully!', 'success');
      }
    } catch (e) {
      addToast('Failed to run AI prediction.', 'error');
    }
  };

  const handleReportUploaded = (data) => {
    fetchData();
    if (data?.report) {
      setSelectedReport(data.report);
      setOcrModalOpen(true);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card p-6 rounded-3xl border border-slate-800">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Welcome back, {patient?.user?.name || 'Patient'} 👋
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Village: <span className="text-white font-bold">{patient?.village || 'Green Valley'}</span> • Blood Group: <span className="text-cyan-400 font-bold">{patient?.bloodGroup || 'A+'}</span>
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setUploadModalOpen(true)}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center space-x-2 transition-all"
          >
            <Upload className="w-4 h-4 text-cyan-400" />
            <span>Upload Lab Report</span>
          </button>
          <button
            onClick={handleRunAiPrediction}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 shadow-lg shadow-brand-500/20 flex items-center space-x-2 transition-all"
          >
            <Brain className="w-4 h-4" />
            <span>Calculate AI Risk</span>
          </button>
        </div>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Today's Prescriptions"
          value={medicines.length || 3}
          icon={Pill}
          color="cyan"
          description="Active medications scheduled"
        />
        <StatCard
          title="Adherence Rate"
          value="94.2%"
          icon={Award}
          color="emerald"
          trend="+3.5%"
          trendType="up"
          description="30-day medication compliance"
        />
        <StatCard
          title="AI Risk Rating"
          value={prediction ? `${prediction.overallRiskPercent}%` : '68%'}
          icon={Brain}
          color={prediction?.riskLevel === 'High' ? 'rose' : 'amber'}
          description={prediction ? `${prediction.riskLevel} Disease Risk` : 'High Risk Rating'}
        />
        <StatCard
          title="Fasting Glucose"
          value={patient?.fastingSugar ? `${patient.fastingSugar} mg/dL` : '148 mg/dL'}
          icon={AlertCircle}
          color="rose"
          description="From latest lab report"
        />
      </div>

      {/* Main Grid: Today's Schedule + AI Risk Gauge */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Prescriptions & Adherence */}
        <div className="lg:col-span-2 space-y-6">
          <div id="patient-medicines-section" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-white flex items-center space-x-2">
                <Pill className="w-5 h-5 text-brand-400" />
                <span>Today's Prescriptions & Dose Scheduler</span>
              </h3>
              <button onClick={fetchData} className="text-slate-400 hover:text-white p-1" title="Refresh">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {medicines.length === 0 ? (
                <div className="col-span-2 p-8 text-center glass-card rounded-2xl border border-slate-800 text-slate-500 text-xs">
                  No active medicines prescribed.
                </div>
              ) : (
                medicines.map((med) => (
                  <MedicineCard key={med._id} medicine={med} onStatusChanged={fetchData} />
                ))
              )}
            </div>
          </div>

          {/* Adherence Chart */}
          <div className="glass-card p-6 rounded-3xl border border-slate-800">
            <h4 className="text-sm font-bold text-white mb-4">Weekly Adherence Telemetry Trend</h4>
            <AdherenceChart />
          </div>

          {/* Appointments Section */}
          <div id="patient-appointments-section" className="glass-card p-6 rounded-3xl border border-slate-800 space-y-3">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-extrabold text-white">Scheduled Doctor Appointments</h3>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-white">Routine Evaluation Consultation</p>
                <p className="text-slate-400">Dr. Sarah Smith • Thursday, 10:30 AM</p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase text-[10px]">
                Confirmed
              </span>
            </div>
          </div>
        </div>

        {/* Right 1 Col: AI Risk Gauge & Reports */}
        <div className="space-y-6">
          <div id="patient-predictions-section" className="glass-card p-6 rounded-3xl border border-slate-800">
            <h3 className="text-sm font-extrabold text-white mb-2 flex items-center space-x-2">
              <Brain className="w-4 h-4 text-brand-400" />
              <span>AI Risk Assessment Gauge</span>
            </h3>
            <RiskGaugeChart
              riskPercent={prediction?.overallRiskPercent || 68}
              riskLevel={prediction?.riskLevel || 'High'}
              diseaseBreakdown={prediction?.diseaseBreakdown || { Diabetes: 72, Hypertension: 68, HeartDisease: 45, KidneyDisease: 28 }}
            />

            {/* Recommendations List */}
            {prediction?.recommendations && prediction.recommendations.length > 0 && (
              <div className="mt-6 pt-4 border-t border-slate-800">
                <p className="text-xs font-bold text-slate-300 mb-2">Doctor & AI Recommendations:</p>
                <ul className="space-y-2">
                  {prediction.recommendations.map((rec, i) => (
                    <li key={i} className="text-[11px] text-slate-400 flex items-start space-x-2 leading-relaxed">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-1.5 shrink-0" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Recent Reports List */}
          <div id="patient-reports-section" className="glass-card p-6 rounded-3xl border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Recent Lab Reports</h4>
              <button
                onClick={() => setUploadModalOpen(true)}
                className="text-[11px] font-bold text-brand-400 hover:underline flex items-center space-x-1"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload</span>
              </button>
            </div>
            <div className="space-y-3">
              {reports.map((rep) => (
                <div
                  key={rep._id}
                  onClick={() => {
                    setSelectedReport(rep);
                    setOcrModalOpen(true);
                  }}
                  className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-brand-500/50 cursor-pointer transition-colors flex items-center justify-between"
                >
                  <div className="truncate pr-2">
                    <p className="text-xs font-bold text-white truncate">{rep.title}</p>
                    <p className="text-[10px] text-slate-500">{new Date(rep.uploadDate).toLocaleDateString()}</p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20 font-bold shrink-0">
                    OCR Parsed
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
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
      />
    </div>
  );
};
