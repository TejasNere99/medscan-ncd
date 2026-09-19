import React, { useState, useEffect } from 'react';
import {
  Stethoscope,
  Users,
  Plus,
  ShieldCheck,
  Star,
  Clock,
  CheckCircle2,
  XCircle,
  Trash2,
  ExternalLink,
  Mail,
  UserCheck,
  AlertCircle,
  Share2,
} from 'lucide-react';
import { relationshipService } from '../../services/relationshipService';
import { DoctorConnectModal } from './DoctorConnectModal';
import { FamilyInviteModal } from './FamilyInviteModal';
import { useToast } from '../../hooks/useToast';

export const CareTeamSection = () => {
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState([]);
  const [family, setFamily] = useState([]);
  const [pendingFamilyInvites, setPendingFamilyInvites] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);

  const [doctorModalOpen, setDoctorModalOpen] = useState(false);
  const [familyModalOpen, setFamilyModalOpen] = useState(false);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [relRes, inviteRes, pendingRes] = await Promise.allSettled([
        relationshipService.getMyRelationships(),
        relationshipService.getPatientFamilyInvitations(),
        relationshipService.getPendingRequests(),
      ]);

      if (relRes.status === 'fulfilled') {
        const data = relRes.value?.data || relRes.value;
        setDoctors(data.doctors || []);
        setFamily(data.family || []);
      }

      if (inviteRes.status === 'fulfilled') {
        const data = inviteRes.value?.data || inviteRes.value;
        const activeInvites = (data.invitations || []).filter(
          (inv) => inv.status === 'PENDING' && new Date(inv.expiresAt) > new Date()
        );
        setPendingFamilyInvites(activeInvites);
      }

      if (pendingRes.status === 'fulfilled') {
        const data = pendingRes.value?.data || pendingRes.value;
        setIncomingRequests(data.requests || []);
      }
    } catch (err) {
      console.error('Failed to load care team data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleAcceptRequest = async (id) => {
    try {
      await relationshipService.acceptRelationship(id);
      addToast('Doctor connection request accepted and activated!', 'success');
      fetchAllData();
    } catch (err) {
      addToast(err?.message || 'Failed to accept connection.', 'error');
    }
  };

  const handleRejectRequest = async (id) => {
    try {
      await relationshipService.rejectRelationship(id);
      addToast('Connection request declined.', 'info');
      fetchAllData();
    } catch (err) {
      addToast(err?.message || 'Failed to reject connection.', 'error');
    }
  };

  const handleRevokeRelationship = async (id, name) => {
    if (!window.confirm(`Are you sure you want to revoke clinical/caregiver access for ${name}?`)) {
      return;
    }
    try {
      await relationshipService.revokeRelationship(id);
      addToast(`Access revoked for ${name}.`, 'info');
      fetchAllData();
    } catch (err) {
      addToast(err?.message || 'Failed to revoke access.', 'error');
    }
  };

  const handleSetPrimaryDoctor = async (id) => {
    try {
      await relationshipService.setPrimaryDoctor(id);
      addToast('Primary doctor designated successfully.', 'success');
      fetchAllData();
    } catch (err) {
      addToast(err?.message || 'Failed to designate primary doctor.', 'error');
    }
  };

  const handleRevokeInvite = async (id) => {
    try {
      await relationshipService.revokeFamilyInvite(id);
      addToast('Invitation revoked.', 'info');
      fetchAllData();
    } catch (err) {
      addToast(err?.message || 'Failed to revoke invitation.', 'error');
    }
  };

  const formatDoctorName = (name) => {
    if (!name) return 'Doctor';
    return name.startsWith('Dr.') ? name : `Dr. ${name}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center flex-wrap gap-2.5">
            <h3 className="text-base font-black text-white">Care Team &amp; Designated Caregivers</h3>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold inline-flex items-center">
              Secure RBAC
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Manage attending physicians and trusted family members authorized to access your health data
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => setDoctorModalOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 transition-all flex items-center space-x-1.5 shadow-md shadow-brand-500/20"
          >
            <Stethoscope className="w-3.5 h-3.5" />
            <span>Connect Doctor</span>
          </button>
          <button
            type="button"
            onClick={() => setFamilyModalOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-all flex items-center space-x-1.5 shadow-md shadow-emerald-600/20"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Invite Family</span>
          </button>
        </div>
      </div>

      {/* Incoming Connection Requests Alert */}
      {incomingRequests.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
          <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold">
            <AlertCircle className="w-4 h-4" />
            <span>Incoming Doctor Connection Requests</span>
          </div>
          <div className="space-y-2">
            {incomingRequests.map((req) => (
              <div
                key={req._id}
                className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <h5 className="text-xs font-bold text-white">{formatDoctorName(req.relatedUser?.name)}</h5>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Claimed consultation code • Requesting clinical access as{' '}
                    <span className="text-amber-300 font-semibold">{req.relationshipLabel || 'Attending Physician'}</span>
                  </p>
                </div>
                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleAcceptRequest(req._id)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-[11px] font-bold hover:bg-emerald-600 transition-colors flex items-center space-x-1 shadow-sm"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve Access</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRejectRequest(req._id)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-[11px] font-bold hover:bg-slate-700 transition-colors flex items-center space-x-1"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Decline</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grid: Doctors on Left, Family on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Doctors Card */}
        <div className="glass-card p-5 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Stethoscope className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Attending Physicians</h4>
                <p className="text-[10px] text-slate-400">Full clinical review and management authority</p>
              </div>
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-900 text-slate-400 border border-slate-800">
              {doctors.filter((d) => d.status === 'ACTIVE').length} Connected
            </span>
          </div>

          <div className="space-y-2.5">
            {loading ? (
              <div className="py-6 text-center text-xs text-slate-500">Loading care team...</div>
            ) : doctors.length === 0 ? (
              <div className="py-6 text-center space-y-2">
                <Stethoscope className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400">No doctors connected yet.</p>
                <button
                  type="button"
                  onClick={() => setDoctorModalOpen(true)}
                  className="text-xs font-bold text-brand-400 hover:text-brand-300 transition-colors"
                >
                  + Connect a verified physician
                </button>
              </div>
            ) : (
              doctors.map((rel) => {
                const doc = rel.relatedUser || {};
                const isActive = rel.status === 'ACTIVE';
                return (
                  <div
                    key={rel._id}
                    className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                      isActive
                        ? 'bg-slate-900/50 border-slate-800/80'
                        : 'bg-amber-500/5 border-amber-500/20'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-white font-bold text-xs border border-slate-700">
                        {doc.name ? doc.name.charAt(0) : 'D'}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h5 className="text-xs font-bold text-white">{formatDoctorName(doc.name)}</h5>
                          {rel.isPrimaryDoctor && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 font-bold flex items-center space-x-1">
                              <Star className="w-3 h-3 fill-amber-300" />
                              <span>Primary</span>
                            </span>
                          )}
                          {!isActive && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>Pending Doctor Acceptance</span>
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400">{rel.relationshipLabel || 'Consulting Physician'}</p>
                        <p className="text-[10px] text-slate-500">{doc.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      {isActive && !rel.isPrimaryDoctor && (
                        <button
                          type="button"
                          onClick={() => handleSetPrimaryDoctor(rel._id)}
                          title="Designate as Primary Attending Doctor"
                          className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-colors"
                        >
                          Make Primary
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRevokeRelationship(rel._id, doc.name)}
                        title="Revoke Access"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Family Caregivers Card */}
        <div className="glass-card p-5 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Family Caregivers</h4>
                <p className="text-[10px] text-slate-400">Read-only health summary and monitoring access</p>
              </div>
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-900 text-slate-400 border border-slate-800">
              {family.length} Active
            </span>
          </div>

          <div className="space-y-2.5">
            {loading ? (
              <div className="py-6 text-center text-xs text-slate-500">Loading caregivers...</div>
            ) : family.length === 0 && pendingFamilyInvites.length === 0 ? (
              <div className="py-6 text-center space-y-2">
                <Users className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400">No family members linked yet.</p>
                <button
                  type="button"
                  onClick={() => setFamilyModalOpen(true)}
                  className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  + Invite a trusted caregiver
                </button>
              </div>
            ) : (
              <>
                {/* Active Family Members */}
                {family.map((rel) => {
                  const famUser = rel.relatedUser || {};
                  return (
                    <div
                      key={rel._id}
                      className="p-3.5 rounded-2xl bg-slate-900/50 border border-slate-800/80 flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-white font-bold text-xs border border-slate-700">
                          {famUser.name ? famUser.name.charAt(0) : 'F'}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h5 className="text-xs font-bold text-white">{famUser.name}</h5>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                              {rel.relationshipLabel || 'Family Member'}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400">{famUser.email}</p>
                          {famUser.phone && <p className="text-[10px] text-slate-500">{famUser.phone}</p>}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRevokeRelationship(rel._id, famUser.name)}
                        title="Revoke Access"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}

                {/* Pending Invitations */}
                {pendingFamilyInvites.map((inv) => (
                  <div
                    key={inv._id}
                    className="p-3.5 rounded-2xl bg-slate-950/70 border border-dashed border-slate-800 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-slate-500">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h5 className="text-xs font-bold text-slate-300">{inv.recipientEmail}</h5>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
                            Invitation Pending
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500">
                          Role: {inv.relationshipLabel || 'Family Member'} • Expires in{' '}
                          {Math.max(1, Math.ceil((new Date(inv.expiresAt) - new Date()) / (1000 * 60 * 60 * 24)))}{' '}
                          days
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRevokeInvite(inv._id)}
                      title="Cancel Invitation"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <DoctorConnectModal
        isOpen={doctorModalOpen}
        onClose={() => setDoctorModalOpen(false)}
        onRelationshipChanged={fetchAllData}
      />

      <FamilyInviteModal
        isOpen={familyModalOpen}
        onClose={() => setFamilyModalOpen(false)}
        onInviteCreated={fetchAllData}
      />
    </div>
  );
};
