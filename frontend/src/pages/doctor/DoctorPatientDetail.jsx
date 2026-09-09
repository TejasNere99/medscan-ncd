import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { User, Activity, Pill, FileText, Cpu, Brain, Award, Calendar, ArrowLeft } from 'lucide-react';
import { Tabs } from '../../components/common/Tabs';
import { StatCard } from '../../components/common/StatCard';
import { RiskGaugeChart } from '../../components/charts/RiskGaugeChart';
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

        const predRes = await predictionService.getPredictionHistory(id);
        if (predRes.data && predRes.data.length > 0) setPrediction(predRes.data[0]);
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
          <div className="max-w-md mx-auto">
            <RiskGaugeChart
              riskPercent={prediction?.overallRiskPercent || 68}
              riskLevel={prediction?.riskLevel || 'High'}
              diseaseBreakdown={prediction?.diseaseBreakdown || { Diabetes: 72, Hypertension: 68, HeartDisease: 45, KidneyDisease: 28 }}
            />
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
