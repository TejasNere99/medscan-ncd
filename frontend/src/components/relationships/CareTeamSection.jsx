import React, { useEffect, useState } from 'react';
import { Stethoscope, Star, Clock, CheckCircle2, XCircle, Trash2, AlertCircle } from 'lucide-react';
import { relationshipService } from '../../services/relationshipService';
import { DoctorConnectModal } from './DoctorConnectModal';
import { useToast } from '../../hooks/useToast';

export const CareTeamSection = () => {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [doctorModalOpen, setDoctorModalOpen] = useState(false);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [relationships, pending] = await Promise.all([
        relationshipService.getMyRelationships(), relationshipService.getPendingRequests(),
      ]);
      const relData = relationships?.data || relationships || {};
      const pendingData = pending?.data || pending || {};
      setDoctors(relData.doctors || []);
      setIncomingRequests(pendingData.requests || []);
    } catch (err) {
      addToast(err?.message || 'Could not load your care team.', 'error');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchAllData(); }, []);
  const actOnRequest = async (id, accept) => {
    try {
      await (accept ? relationshipService.acceptRelationship(id) : relationshipService.rejectRelationship(id));
      addToast(accept ? 'Doctor connection approved.' : 'Connection request declined.', accept ? 'success' : 'info');
      fetchAllData();
    } catch (err) { addToast(err?.message || 'Could not update this request.', 'error'); }
  };
  const revoke = async (id, name) => {
    if (!window.confirm(`Remove clinical access for ${name || 'this doctor'}?`)) return;
    try { await relationshipService.revokeRelationship(id); addToast('Clinical access removed.', 'info'); fetchAllData(); }
    catch (err) { addToast(err?.message || 'Could not remove access.', 'error'); }
  };
  const setPrimary = async (id) => {
    try { await relationshipService.setPrimaryDoctor(id); addToast('Primary doctor updated.', 'success'); fetchAllData(); }
    catch (err) { addToast(err?.message || 'Could not update primary doctor.', 'error'); }
  };
  const doctorName = (name) => !name ? 'Doctor' : name.startsWith('Dr.') ? name : `Dr. ${name}`;

  return <section className="space-y-4">
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div><h3 className="text-base font-semibold text-stone-900">Care team</h3><p className="mt-1 text-xs text-stone-500">Manage the doctors connected to your health information.</p></div>
      <button type="button" onClick={() => setDoctorModalOpen(true)} className="rounded-md bg-violet-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-violet-800">Connect a doctor</button>
    </header>
    {incomingRequests.length > 0 && <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-amber-900"><AlertCircle size={15}/> Doctor connection requests</div>
      <div className="space-y-2">{incomingRequests.map((req) => <div key={req._id} className="flex flex-col justify-between gap-3 rounded-md border border-amber-100 bg-white p-3 sm:flex-row sm:items-center">
        <div><p className="text-xs font-semibold text-stone-900">{doctorName(req.relatedUser?.name)}</p><p className="mt-1 text-[11px] text-stone-500">{req.relationshipLabel || 'Attending physician'}</p></div>
        <div className="flex gap-2"><button type="button" onClick={() => actOnRequest(req._id, true)} className="inline-flex items-center gap-1 rounded-md bg-violet-700 px-2.5 py-1.5 text-[11px] font-semibold text-white"><CheckCircle2 size={13}/> Approve</button><button type="button" onClick={() => actOnRequest(req._id, false)} className="inline-flex items-center gap-1 rounded-md border border-stone-200 px-2.5 py-1.5 text-[11px] font-medium text-stone-600"><XCircle size={13}/> Decline</button></div>
      </div>)}</div>
    </div>}
    <div className="surface p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between border-b border-stone-100 pb-3"><div className="flex items-center gap-2.5"><span className="flex h-8 w-8 items-center justify-center rounded-md bg-violet-50 text-violet-700"><Stethoscope size={16}/></span><div><h4 className="text-xs font-semibold text-stone-900">Connected doctors</h4><p className="text-[10px] text-stone-500">Access is managed through your consent.</p></div></div><span className="text-[11px] text-stone-500">{doctors.filter((doc) => doc.status === 'ACTIVE').length} active</span></div>
      {loading ? <p aria-live="polite" className="py-8 text-center text-xs text-stone-500">Loading your care team…</p> : doctors.length === 0 ? <div className="py-8 text-center"><Stethoscope size={24} className="mx-auto text-stone-300"/><p className="mt-2 text-xs text-stone-600">No doctors are connected yet.</p><button type="button" onClick={() => setDoctorModalOpen(true)} className="mt-2 text-xs font-semibold text-violet-700 hover:underline">Connect a doctor</button></div> : <div className="divide-y divide-stone-100">{doctors.map((rel) => { const doc = rel.relatedUser || {}; const active = rel.status === 'ACTIVE'; return <div key={rel._id} className="flex flex-wrap items-center justify-between gap-3 py-3">
        <div className="flex min-w-0 items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-100 text-xs font-semibold text-stone-600">{doc.name?.charAt(0) || 'D'}</span><div className="min-w-0"><p className="flex flex-wrap items-center gap-2 text-xs font-semibold text-stone-900">{doctorName(doc.name)}{rel.isPrimaryDoctor && <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] text-amber-800"><Star size={10}/> Primary</span>}{!active && <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] text-stone-600"><Clock size={10}/> Pending</span>}</p><p className="mt-0.5 truncate text-[11px] text-stone-500">{doc.email || rel.relationshipLabel || 'Connected physician'}</p></div></div>
        <div className="flex items-center gap-2">{active && !rel.isPrimaryDoctor && <button type="button" onClick={() => setPrimary(rel._id)} className="rounded-md border border-stone-200 px-2.5 py-1.5 text-[10px] font-medium text-stone-600 hover:bg-stone-50">Set primary</button>}<button type="button" aria-label={`Remove access for ${doc.name || 'doctor'}`} onClick={() => revoke(rel._id, doc.name)} className="rounded-md p-2 text-stone-400 hover:bg-rose-50 hover:text-rose-700"><Trash2 size={15}/></button></div>
      </div>; })}</div>}
    </div>
    <DoctorConnectModal isOpen={doctorModalOpen} onClose={() => setDoctorModalOpen(false)} onRelationshipChanged={fetchAllData}/>
  </section>;
};
