import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  Users,
  Search,
  Plus,
  Eye,
  Calendar,
  FileText,
  QrCode,
  Clock,
  XCircle,
  Check,
  X,
  ShieldCheck,
} from 'lucide-react';
import { PrescribeModal } from '../../components/medicine/PrescribeModal';
import { patientService } from '../../services/patientService';
import { relationshipService } from '../../services/relationshipService';
import { appointmentService } from '../../services/appointmentService';
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

  // Relationship & Pending Requests state
  const [pendingRequests, setPendingRequests] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [updatingAppointmentId, setUpdatingAppointmentId] = useState(null);
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [claimCode, setClaimCode] = useState('');
  const [claiming, setClaiming] = useState(false);

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

  const fetchPendingRequests = async () => {
    try {
      const res = await relationshipService.getPendingRequests();
      const data = res?.data || res;
      setPendingRequests(data.requests || []);
    } catch (e) {
      console.warn('Failed to load pending requests:', e);
    }
  };

  const fetchAppointments = async () => {
    try {
      const res = await appointmentService.getAppointments();
      const data = res?.data || res;
      setAppointments(Array.isArray(data) ? data : data?.appointments || []);
    } catch (e) {
      addToast('Could not load appointments.', 'error');
    }
  };

  const updateAppointment = async (appointment, status) => {
    setUpdatingAppointmentId(appointment._id);
    try {
      await appointmentService.updateStatus(appointment._id, status);
      addToast(`Appointment marked ${status.toLowerCase()}.`, 'success');
      await fetchAppointments();
    } catch (error) {
      addToast(error?.message || 'Could not update this appointment.', 'error');
    } finally {
      setUpdatingAppointmentId(null);
    }
  };

  useEffect(() => {
    fetchPatients();
    fetchPendingRequests();
  }, [debouncedSearch, page]);

  useEffect(() => { fetchAppointments(); }, []);

  const handleAcceptRequest = async (id) => {
    try {
      await relationshipService.acceptRelationship(id);
      addToast('Consultation request accepted. Patient added to your directory!', 'success');
      fetchPendingRequests();
      fetchPatients();
    } catch (err) {
      addToast(err?.message || 'Failed to accept request.', 'error');
    }
  };

  const handleRejectRequest = async (id) => {
    try {
      await relationshipService.rejectRelationship(id);
      addToast('Consultation request declined.', 'info');
      fetchPendingRequests();
    } catch (err) {
      addToast(err?.message || 'Failed to decline request.', 'error');
    }
  };

  const handleClaimCode = async (e) => {
    e.preventDefault();
    if (!claimCode || claimCode.trim().length < 6) {
      addToast('Please enter the 6-character patient consultation code.', 'warning');
      return;
    }

    setClaiming(true);
    try {
      await relationshipService.claimDoctorCode({
        code: claimCode.trim().toUpperCase(),
      });
      addToast('Consultation code verified! Awaiting patient confirmation in clinic.', 'success');
      setClaimCode('');
      setClaimModalOpen(false);
      fetchPendingRequests();
      fetchPatients();
    } catch (err) {
      addToast(err?.message || 'Invalid or expired consultation code.', 'error');
    } finally {
      setClaiming(false);
    }
  };

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
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-stone-200 pb-5">
        <div><p className="text-[11px] font-semibold uppercase tracking-[.16em] text-violet-700">Clinical workspace</p><h1 className="editorial-heading mt-1 text-3xl text-stone-900">Patient directory</h1><p className="mt-1 text-sm text-stone-500">Review records shared with you by your patients.</p></div>
        <p className="text-xs text-stone-500">{loading ? 'Loading records…' : `${patients.length} records on this page`}</p>
      </header>

      {/* Pending Consultation Requests */}
      {pendingRequests.length > 0 && (
        <div className="glass-card rounded-3xl border border-amber-500/30 bg-amber-500/5 p-6 space-y-4">
          <div className="flex items-center space-x-2.5 text-amber-400">
            <Clock className="w-5 h-5" />
            <h3 className="text-sm font-black uppercase tracking-wider">
              Pending Consultation Requests ({pendingRequests.length})
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingRequests.map((req) => {
              const p = req.patient || {};
              const user = p.user || {};
              return (
                <div
                  key={req._id}
                  className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-white text-xs">{user.name || 'Patient'}</span>
                      {user.village && <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">{user.village}</span>}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Requested as:{' '}
                      <span className="text-brand-300 font-semibold">{req.relationshipLabel || 'Consulting Doctor'}</span>
                      {req.isPrimaryDoctor ? ' (Primary)' : ''}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => handleAcceptRequest(req._id)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all shadow-sm flex items-center space-x-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Accept</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRejectRequest(req._id)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-bold transition-all"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Patient Directory Table */}
      <div id="doctor-patient-directory" className="glass-card rounded-3xl border border-slate-800 p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-white">Clinical Patient Directory</h2>
            <p className="text-xs text-slate-400">Search and manage authorized clinical patient records</p>
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              onClick={() => setClaimModalOpen(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center space-x-1.5 transition-colors"
            >
              <QrCode className="w-4 h-4 text-cyan-400" />
              <span>Enter Patient Code</span>
            </button>
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
              {loading ? (
                <tr><td colSpan="7" className="py-8 text-center text-slate-500">Loading patient records…</td></tr>
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-500">
                    No matching patient records found.
                  </td>
                </tr>
              ) : (
                patients.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-white flex items-center space-x-3">
                      {p.user?.avatar ? <img src={p.user.avatar} alt="" className="h-8 w-8 rounded-full object-cover" /> : <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-[10px] font-semibold text-violet-800">{p.user?.name?.charAt(0) || 'P'}</span>}
                      <span>{p.user?.name || 'Patient'}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">{p.age} yrs / {p.gender}</td>
                    <td className="py-3.5 px-4 text-slate-300">{p.village}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded font-bold ${p.fastingSugar >= 140 ? 'text-rose-400 bg-rose-500/10' : 'text-slate-300'}`}>
                        {p.fastingSugar ? `${p.fastingSugar} mg/dL` : 'Not recorded'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded font-bold ${p.systolicBP >= 140 ? 'text-amber-400 bg-amber-500/10' : 'text-slate-300'}`}>
                        {p.systolicBP && p.diastolicBP ? `${p.systolicBP}/${p.diastolicBP}` : 'Not recorded'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">{p.bmi || 'Not recorded'}</td>
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
      <div id="doctor-appointments-section" className="surface space-y-4 p-4 sm:p-6">
        <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-violet-700"/><h2 className="text-sm font-semibold text-stone-900">Appointments</h2></div><span className="text-xs text-stone-500">{appointments.length} scheduled</span></div>
        {appointments.length ? <div className="divide-y divide-stone-100">{appointments.map((appointment) => <div key={appointment._id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="text-xs font-semibold text-stone-900">{appointment.patient?.user?.name || 'Patient'}</p><p className="mt-1 text-[11px] text-stone-500">{appointment.reason || 'Appointment'} · {appointment.date ? new Date(appointment.date).toLocaleDateString() : 'Date not provided'}{appointment.time ? ` · ${appointment.time}` : ''}</p>{appointment.notes && <p className="mt-1 text-[11px] text-stone-500">{appointment.notes}</p>}</div><div className="flex items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${appointment.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' : appointment.status === 'Cancelled' ? 'bg-stone-100 text-stone-500' : 'bg-violet-50 text-violet-700'}`}>{appointment.status || 'Status unavailable'}</span>{appointment.status === 'Upcoming' && <><button type="button" disabled={updatingAppointmentId === appointment._id} onClick={() => updateAppointment(appointment, 'Completed')} className="rounded-lg bg-emerald-700 px-3 py-2 text-[10px] font-semibold text-white disabled:opacity-50">Complete</button><button type="button" disabled={updatingAppointmentId === appointment._id} onClick={() => updateAppointment(appointment, 'Cancelled')} className="rounded-lg border border-stone-200 px-3 py-2 text-[10px] font-semibold text-stone-600 disabled:opacity-50">Cancel</button></>}</div></div>)}</div> : <p className="py-5 text-center text-xs text-stone-500">No appointments available.</p>}
      </div>

      <PrescribeModal
        isOpen={prescribeModalOpen}
        onClose={() => setPrescribeModalOpen(false)}
        patientId={selectedPatientId}
        patients={patients}
        onMedicineAdded={fetchPatients}
      />

      {/* Claim Consultation Code Modal */}
      {claimModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md rounded-3xl border border-slate-800 p-6 space-y-5 relative shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Enter Consultation Code</h3>
                  <p className="text-xs text-slate-400">Connect with an in-clinic patient</p>
                </div>
              </div>
              <button
                onClick={() => setClaimModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleClaimCode} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  6-Digit Consultation Code *
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  placeholder="e.g. 7A9B3F"
                  value={claimCode}
                  onChange={(e) => setClaimCode(e.target.value.toUpperCase())}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-center text-2xl font-mono tracking-widest text-brand-400 placeholder-slate-600 focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start space-x-2 text-[11px] text-slate-400">
                <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>
                  The patient generates this temporary code from their dashboard. Claiming the code registers a consultation request awaiting confirmation.
                </span>
              </div>

              <div className="pt-2 flex justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={() => setClaimModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-900 border border-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={claiming || claimCode.trim().length < 6}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-50 transition-all flex items-center space-x-1.5 shadow-lg shadow-brand-500/20"
                >
                  {claiming ? 'Verifying...' : 'Verify & Connect'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
