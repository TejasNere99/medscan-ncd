import React, { useCallback, useEffect, useState } from 'react';
import { Check, Clock3, Pill, RefreshCw, X } from 'lucide-react';
import { medicineService } from '../../services/medicineService';
import { useToast } from '../../hooks/useToast';

const readList = (response) => Array.isArray(response?.data) ? response.data : [];
const sameDay = (value, date = new Date()) => {
  const parsed = new Date(value);
  return parsed.toDateString() === date.toDateString();
};

export const PatientMedicinesPage = () => {
  const { addToast } = useToast();
  const [medicines, setMedicines] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [medicineResult, logResult] = await Promise.allSettled([
        medicineService.getMedicines(),
        medicineService.getMedicineLogs(),
      ]);
      if (medicineResult.status === 'fulfilled') setMedicines(readList(medicineResult.value));
      else throw medicineResult.reason;
      if (logResult.status === 'fulfilled') setLogs(readList(logResult.value));
      else {
        setLogs([]);
        addToast(logResult.reason?.message || 'Prescriptions loaded, but today’s dose schedule is unavailable.', 'warning');
      }
    } catch (error) {
      addToast(error?.message || 'Could not load your medicine schedule.', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { load(); }, [load]);

  const updateDose = async (log, status) => {
    setUpdatingId(log._id);
    try {
      await medicineService.updateStatus(log.medicine?._id, status, '', log._id);
      addToast(`Dose marked ${status.toLowerCase()}.`, status === 'Taken' ? 'success' : 'info');
      await load();
    } catch (error) {
      addToast(error?.message || 'Could not update this dose.', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const activeMedicines = medicines.filter((medicine) => medicine.status === 'Active');
  const inactiveMedicines = medicines.filter((medicine) => medicine.status !== 'Active');
  const activeMedicineIds = new Set(activeMedicines.map((medicine) => medicine._id));
  const todayLogs = logs
    .filter((log) => sameDay(log.scheduledTime) && activeMedicineIds.has(log.medicine?._id))
    .sort((a, b) => new Date(a.scheduledTime) - new Date(b.scheduledTime));

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-violet-700">Patient care</p>
          <h1 className="editorial-heading mt-1 text-3xl text-stone-900">My Medicines</h1>
          <p className="mt-2 text-sm text-stone-500">Review prescriptions and keep today’s dose record up to date.</p>
        </div>
        <button type="button" onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-60">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </header>

      <section className="surface space-y-4 p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2"><Pill className="h-4 w-4 text-violet-700" /><h2 className="text-sm font-semibold text-stone-900">Today’s doses</h2></div>
          <span className="text-xs text-stone-500">{todayLogs.length} scheduled</span>
        </div>
        {loading ? <p className="py-8 text-center text-sm text-stone-500">Loading medicines…</p> : activeMedicines.length === 0 ? (
          <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 px-5 py-10 text-center">
            <Pill className="mx-auto h-8 w-8 text-stone-400" />
            <h3 className="mt-3 text-sm font-semibold text-stone-800">No active prescriptions</h3>
            <p className="mt-1 text-xs text-stone-500">When your doctor adds a prescription, it will appear here.</p>
          </div>
        ) : todayLogs.length === 0 ? (
          <p className="py-6 text-center text-sm text-stone-500">No doses are scheduled for today.</p>
        ) : (
          <div className="divide-y divide-stone-100">
            {todayLogs.map((log) => {
              const medicine = log.medicine || {};
              const complete = ['Taken', 'Missed'].includes(log.status);
              return (
                <article key={log._id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="rounded-lg bg-violet-50 p-2 text-violet-700"><Pill className="h-4 w-4" /></div>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-stone-900">{medicine.name || 'Medicine'}</h3>
                      <p className="mt-1 text-xs text-stone-500">{medicine.dosage || 'Dosage not recorded'}{medicine.frequency ? ` · ${medicine.frequency}` : ''}</p>
                      <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-stone-500"><Clock3 className="h-3 w-3" />{new Date(log.scheduledTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p>
                      {medicine.instructions && <p className="mt-1 text-xs text-stone-500">{medicine.instructions}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${log.status === 'Taken' ? 'bg-emerald-50 text-emerald-700' : log.status === 'Missed' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>{log.status}</span>
                    {!complete && <>
                      <button type="button" disabled={updatingId === log._id} onClick={() => updateDose(log, 'Taken')} className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-2 text-[11px] font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"><Check className="h-3.5 w-3.5" /> Taken</button>
                      <button type="button" disabled={updatingId === log._id} onClick={() => updateDose(log, 'Missed')} className="inline-flex items-center gap-1 rounded-lg border border-stone-200 px-3 py-2 text-[11px] font-semibold text-stone-600 hover:bg-stone-50 disabled:opacity-50"><X className="h-3.5 w-3.5" /> Missed</button>
                    </>}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="surface space-y-4 p-4 sm:p-6">
        <div className="flex items-center justify-between"><h2 className="text-sm font-semibold text-stone-900">Active prescriptions</h2><span className="text-xs text-stone-500">{activeMedicines.length}</span></div>
        {loading ? <p className="py-4 text-center text-sm text-stone-500">Loading prescriptions…</p> : activeMedicines.length === 0 ? <p className="py-4 text-center text-sm text-stone-500">No active prescriptions yet.</p> : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {activeMedicines.map((medicine) => <article key={medicine._id} className="rounded-lg border border-stone-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-semibold text-stone-900">{medicine.name}</h3><p className="mt-1 text-xs text-stone-500">{medicine.dosage} · {medicine.frequency}</p></div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">Active</span></div>
              <p className="mt-3 text-xs text-stone-600">{medicine.instructions || 'No additional instructions.'}</p>
              <p className="mt-3 text-[11px] capitalize text-stone-500">Schedule: {medicine.timing?.length ? medicine.timing.join(', ') : 'As directed'}</p>
              {medicine.doctor?.name && <p className="mt-1 text-[11px] text-stone-500">Prescribed by {medicine.doctor.name}</p>}
            </article>)}
          </div>
        )}
      </section>

      {inactiveMedicines.length > 0 && <section className="surface space-y-3 p-4 sm:p-6">
        <h2 className="text-sm font-semibold text-stone-900">Previous prescriptions</h2>
        {inactiveMedicines.map((medicine) => <div key={medicine._id} className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 py-2 last:border-0"><div><p className="text-sm font-medium text-stone-700">{medicine.name}</p><p className="text-xs text-stone-500">{medicine.dosage} · {medicine.frequency}</p></div><span className="text-[10px] text-stone-500">{medicine.status}</span></div>)}
      </section>}
    </div>
  );
};

export default PatientMedicinesPage;
