import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Users, AlertTriangle, CheckCircle2, Pill, Search, Plus, Eye, Calendar, FileText } from 'lucide-react';
import { StatCard } from '../../components/common/StatCard';
import { PrescribeModal } from '../../components/medicine/PrescribeModal';
import { patientService } from '../../services/patientService';
import { useDebounce } from '../../hooks/useDebounce';
import { useToast } from '../../hooks/useToast';

export const DoctorDashboard = () => {
  const { addToast } = useToast();
  const location = useLocation();

  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Prescribe Modal state
  const [prescribeModalOpen, setPrescribeModalOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState(null);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const res = await patientService.getPatients({ search: debouncedSearch, page, limit: 8 });
      if (res.data) {
        setPatients(res.data.patients || []);
        setTotalPages(res.data.totalPages || 1);
      }
    } catch (e) {
      addToast('Failed to fetch patient directory.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [debouncedSearch, page]);

  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/prescriptions')) {
      setPrescribeModalOpen(true);
    } else if (path.includes('/patients')) {
      document.getElementById('doctor-patient-directory')?.scrollIntoView({ behavior: 'smooth' });
    } else if (path.includes('/reports')) {
      document.getElementById('doctor-patient-directory')?.scrollIntoView({ behavior: 'smooth' });
    } else if (path.includes('/appointments')) {
      document.getElementById('doctor-appointments-section')?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [location.pathname]);

  return (
    <div className="space-y-8">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Total Patients" value={patients.length || 28} icon={Users} color="cyan" />
        <StatCard title="High Risk Patients" value="6" icon={AlertTriangle} color="rose" description="Needs review" />
        <StatCard title="Compliance Rate" value="92.4%" icon={CheckCircle2} color="emerald" trend="+1.2%" />
        <StatCard title="Prescriptions" value="45" icon={Pill} color="purple" />
        <StatCard title="Consultations" value="8" icon={Users} color="amber" description="Scheduled today" />
      </div>

      {/* Patient Directory Table */}
      <div id="doctor-patient-directory" className="glass-card rounded-3xl border border-slate-800 p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-white">Clinical Patient Directory</h2>
            <p className="text-xs text-slate-400">Search and manage authorized clinical patient records</p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setPrescribeModalOpen(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 shadow-lg shadow-brand-500/20 flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>New Prescription</span>
            </button>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search patient name..."
                className="bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none w-56"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Patient Name</th>
                <th className="py-3 px-4">Age / Gender</th>
                <th className="py-3 px-4">Village</th>
                <th className="py-3 px-4">Blood Sugar</th>
                <th className="py-3 px-4">Blood Pressure</th>
                <th className="py-3 px-4">BMI</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {patients.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-500">
                    No matching patient records found.
                  </td>
                </tr>
              ) : (
                patients.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-white flex items-center space-x-3">
                      <img
                        src={p.user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256'}
                        alt={p.user?.name}
                        className="w-8 h-8 rounded-lg object-cover border border-slate-700"
                      />
                      <span>{p.user?.name || 'Patient'}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">{p.age} yrs / {p.gender}</td>
                    <td className="py-3.5 px-4 text-slate-300">{p.village}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded font-bold ${p.fastingSugar >= 140 ? 'text-rose-400 bg-rose-500/10' : 'text-slate-300'}`}>
                        {p.fastingSugar || 120} mg/dL
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded font-bold ${p.systolicBP >= 140 ? 'text-amber-400 bg-amber-500/10' : 'text-slate-300'}`}>
                        {p.systolicBP || 120}/{p.diastolicBP || 80}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">{p.bmi || 24.5}</td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => {
                          setSelectedPatientId(p._id);
                          setPrescribeModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg bg-brand-500/10 text-brand-400 hover:bg-brand-500/20 border border-brand-500/30"
                        title="Prescribe Medicine"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <Link
                        to={`/doctor/patient/${p._id}`}
                        className="inline-block p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
                        title="View Full Profile"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800 text-xs text-slate-400">
          <span>Page {page} of {totalPages}</span>
          <div className="flex space-x-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Appointments Section */}
      <div id="doctor-appointments-section" className="glass-card p-6 rounded-3xl border border-slate-800 space-y-4">
        <div className="flex items-center space-x-2">
          <Calendar className="w-5 h-5 text-brand-400" />
          <h3 className="text-sm font-extrabold text-white">Doctor Today's Appointments & Consultations</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div>
              <p className="font-bold text-white">John Doe</p>
              <p className="text-slate-400 mt-0.5">Reason: Routine Diabetes & BP Review</p>
              <span className="text-[10px] text-cyan-400 font-semibold">10:30 AM</span>
            </div>
            <button
              onClick={() => addToast('Patient consultation initiated.', 'info')}
              className="px-3 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold"
            >
              Start Session
            </button>
          </div>
        </div>
      </div>

      <PrescribeModal
        isOpen={prescribeModalOpen}
        onClose={() => setPrescribeModalOpen(false)}
        patientId={selectedPatientId}
        onMedicineAdded={fetchPatients}
      />
    </div>
  );
};
