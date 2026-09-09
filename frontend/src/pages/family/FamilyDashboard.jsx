import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Pill, AlertTriangle, Phone, ShieldCheck, HeartPulse, CheckCircle2, User, Activity, Clock } from 'lucide-react';
import { StatCard } from '../../components/common/StatCard';
import { MedicineCard } from '../../components/medicine/MedicineCard';
import { AdherenceChart } from '../../components/charts/AdherenceChart';
import { patientService } from '../../services/patientService';
import { medicineService } from '../../services/medicineService';
import { useToast } from '../../hooks/useToast';

export const FamilyDashboard = () => {
  const { addToast } = useToast();
  const location = useLocation();

  const [patients, setPatients] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const pRes = await patientService.getLinkedFamilyPatients();
        if (pRes.data && pRes.data.length > 0) {
          setPatients(pRes.data);
          const mRes = await medicineService.getMedicines(pRes.data[0]._id);
          if (mRes.data) setMedicines(mRes.data);

          const lRes = await medicineService.getMedicineLogs(pRes.data[0]._id);
          if (lRes.data) setLogs(lRes.data);
        }
      } catch (e) {
        addToast('Failed to load linked family records.', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/patient')) {
      document.getElementById('family-patient-profile')?.scrollIntoView({ behavior: 'smooth' });
    } else if (path.includes('/logs')) {
      document.getElementById('family-adherence-logs')?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [location.pathname]);

  const activePatient = patients[0] || {
    user: { name: 'John Doe', email: 'patient@example.com' },
    village: 'Green Valley',
    age: 52,
    gender: 'Male',
    bloodGroup: 'A+',
    systolicBP: 142,
    diastolicBP: 92,
    fastingSugar: 148,
    bmi: 27.4,
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="glass-card p-6 rounded-3xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/30 font-bold uppercase">
            Linked Family Member Care
          </span>
          <h1 className="text-2xl font-black text-white mt-1">
            Monitoring Patient: {activePatient.user?.name}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Village: <span className="text-white font-bold">{activePatient.village}</span> • Emergency Contact: <span className="text-cyan-400 font-bold">+1 555-0103</span>
          </p>
        </div>

        <button
          onClick={() => addToast('Alert sent to Dr. Sarah Smith & Emergency Services.', 'info')}
          className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-600/20 flex items-center space-x-2 transition-all"
        >
          <Phone className="w-4 h-4" />
          <span>Contact Doctor / Alert</span>
        </button>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard title="Today's Status" value="On Track" icon={CheckCircle2} color="emerald" description="Morning dose taken" />
        <StatCard title="Missed Doses (30d)" value="1" icon={AlertTriangle} color="rose" description="Yesterday evening dose" />
        <StatCard title="Overall Adherence" value="94%" icon={HeartPulse} color="cyan" trend="+2%" />
        <StatCard title="Risk Rating" value="High (68%)" icon={ShieldCheck} color="amber" description="Requires low-sodium diet" />
      </div>

      {/* Linked Patient Profile Card */}
      <div id="family-patient-profile" className="glass-card p-6 rounded-3xl border border-slate-800 space-y-4">
        <div className="flex items-center space-x-3">
          <User className="w-5 h-5 text-purple-400" />
          <h3 className="text-sm font-extrabold text-white">Linked Patient Health Profile & Vitals</h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
            <p className="text-slate-500 font-bold uppercase">Age / Gender</p>
            <p className="text-base font-black text-white mt-1">{activePatient.age || 52} yrs / {activePatient.gender || 'Male'}</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
            <p className="text-slate-500 font-bold uppercase">Blood Pressure</p>
            <p className="text-base font-black text-amber-400 mt-1">{activePatient.systolicBP || 142}/{activePatient.diastolicBP || 92}</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
            <p className="text-slate-500 font-bold uppercase">Fasting Glucose</p>
            <p className="text-base font-black text-rose-400 mt-1">{activePatient.fastingSugar || 148} mg/dL</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
            <p className="text-slate-500 font-bold uppercase">BMI</p>
            <p className="text-base font-black text-cyan-400 mt-1">{activePatient.bmi || 27.4}</p>
          </div>
        </div>
      </div>

      {/* Dose Telemetry & Adherence Logs */}
      <div id="family-adherence-logs" className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-card p-6 rounded-3xl border border-slate-800 space-y-4">
          <h3 className="text-sm font-extrabold text-white flex items-center space-x-2">
            <Pill className="w-5 h-5 text-purple-400" />
            <span>{activePatient.user?.name}'s Daily Prescriptions</span>
          </h3>
          <div className="space-y-3">
            {medicines.map((med) => (
              <MedicineCard key={med._id} medicine={med} />
            ))}
          </div>
        </div>

        <div className="glass-card p-6 rounded-3xl border border-slate-800 space-y-4">
          <h3 className="text-sm font-extrabold text-white flex items-center space-x-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            <span>Weekly Adherence Trend</span>
          </h3>
          <AdherenceChart />
        </div>
      </div>
    </div>
  );
};
