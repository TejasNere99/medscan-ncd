import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Users, Activity, CheckCircle2, Clock, Eye, Search } from 'lucide-react';
import { StatCard } from '../../components/common/StatCard';
import { patientService } from '../../services/patientService';
import { useToast } from '../../hooks/useToast';

export const NurseDashboard = () => {
  const { addToast } = useToast();
  const location = useLocation();

  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchAssigned = async () => {
    setLoading(true);
    try {
      const res = await patientService.getPatients({ search: search || undefined, limit: 10 });
      if (res.data) setPatients(res.data.patients || []);
    } catch (e) {
      addToast('Failed to fetch assigned nurse patients.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssigned();
  }, [search]);

  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/patients')) {
      document.getElementById('nurse-assigned-patients')?.scrollIntoView({ behavior: 'smooth' });
    } else if (path.includes('/monitoring')) {
      document.getElementById('nurse-monitoring-table')?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [location.pathname]);

  return (
    <div className="space-y-8">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard title="Assigned Patients" value={patients.length || 12} icon={Users} color="pink" />
        <StatCard title="Today's Monitoring" value="8 Done" icon={CheckCircle2} color="emerald" description="4 pending vitals" />
        <StatCard title="Missed Doses Flag" value="2" icon={Clock} color="rose" description="Alerted to doctor" />
        <StatCard title="High Risk Vitals" value="3 Patients" icon={Activity} color="amber" />
      </div>

      {/* Monitoring & Patient Directory Table */}
      <div id="nurse-monitoring-table" className="glass-card rounded-3xl border border-slate-800 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 id="nurse-assigned-patients" className="text-base font-extrabold text-white">
            Daily Patient Vitals Verification & Monitoring
          </h3>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search patient name..."
              className="bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none w-52"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase">
                <th className="py-3 px-4">Patient Name</th>
                <th className="py-3 px-4">Village</th>
                <th className="py-3 px-4">Fasting Glucose</th>
                <th className="py-3 px-4">Blood Pressure</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {patients.map((p) => (
                <tr key={p._id} className="hover:bg-slate-800/40">
                  <td className="py-3 px-4 font-bold text-white flex items-center space-x-2">
                    <span>{p.user?.name || 'Patient'}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-300">{p.village}</td>
                  <td className="py-3 px-4 text-slate-300">{p.fastingSugar || 120} mg/dL</td>
                  <td className="py-3 px-4 text-slate-300">{p.systolicBP || 120}/{p.diastolicBP || 80}</td>
                  <td className="py-3 px-4 text-right space-x-2">
                    <button
                      onClick={() => addToast(`Vitals verified for ${p.user?.name}!`, 'success')}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                    >
                      Verify Vitals
                    </button>
                    <Link
                      to={`/doctor/patient/${p._id}`}
                      className="inline-block p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
                      title="View Patient Details"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
