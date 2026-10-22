import React, { useCallback, useEffect, useState } from 'react';
import { CalendarDays, Clock3, RefreshCw } from 'lucide-react';
import { appointmentService } from '../../services/appointmentService';
import { relationshipService } from '../../services/relationshipService';
import { useToast } from '../../hooks/useToast';

const readAppointments = (response) => Array.isArray(response?.data) ? response.data : [];

export const PatientAppointmentsPage = () => {
  const { addToast } = useToast();
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [form, setForm] = useState({ doctorId: '', date: '', time: '10:00', reason: '', notes: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [appointmentResult, doctorResult] = await Promise.allSettled([
        appointmentService.getAppointments(),
        relationshipService.getAvailableDoctors(),
      ]);
      if (appointmentResult.status === 'fulfilled') setAppointments(readAppointments(appointmentResult.value));
      else throw appointmentResult.reason;
      const availableDoctors = doctorResult.status === 'fulfilled' ? doctorResult.value?.data?.doctors || [] : [];
      setDoctors(availableDoctors);
      setForm((current) => ({ ...current, doctorId: availableDoctors.some((doctor) => doctor.doctorId === current.doctorId) ? current.doctorId : availableDoctors[0]?.doctorId || '' }));
      if (doctorResult.status === 'rejected') addToast(doctorResult.reason?.message || 'Doctor directory is unavailable.', 'warning');
    } catch (error) {
      addToast(error?.message || 'Could not load your appointments.', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { load(); }, [load]);

  const bookAppointment = async (event) => {
    event.preventDefault();
    if (!form.doctorId || !form.date || !form.time) {
      addToast('Choose a doctor, date, and time.', 'warning');
      return;
    }
    const scheduledAt = new Date(`${form.date}T${form.time}`);
    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) {
      addToast('Choose a future date and time.', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      await appointmentService.createAppointment({
        doctorId: form.doctorId,
        date: scheduledAt.toISOString(),
        time: scheduledAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
        reason: form.reason.trim() || 'Routine check-up',
        notes: form.notes.trim(),
      });
      addToast('Appointment booked.', 'success');
      setForm((current) => ({ ...current, date: '', reason: '', notes: '' }));
      await load();
    } catch (error) {
      addToast(error?.message || 'Could not book the appointment.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const cancelAppointment = async (appointment) => {
    setUpdatingId(appointment._id);
    try {
      await appointmentService.updateStatus(appointment._id, 'Cancelled');
      addToast('Appointment cancelled.', 'info');
      await load();
    } catch (error) {
      addToast(error?.message || 'Could not cancel this appointment.', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const today = new Date();
  const minDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-violet-700">Patient care</p>
          <h1 className="editorial-heading mt-1 text-3xl text-stone-900">Appointments</h1>
          <p className="mt-2 text-sm text-stone-500">Book a visit and keep track of upcoming appointments.</p>
        </div>
        <button type="button" onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-60">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </header>

      <section className="surface p-4 sm:p-6">
        <div className="mb-4 flex items-center gap-2"><CalendarDays className="h-4 w-4 text-violet-700" /><h2 className="text-sm font-semibold text-stone-900">Book an appointment</h2></div>
        {doctors.length === 0 ? <p className="rounded-lg border border-dashed border-stone-300 bg-stone-50 p-5 text-center text-sm text-stone-500">No doctors are available for booking yet.</p> : (
          <form onSubmit={bookAppointment} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="text-xs font-medium text-stone-700">Doctor
              <select required value={form.doctorId} onChange={(e) => setForm({ ...form, doctorId: e.target.value })} className="mt-1.5 w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900">
                {doctors.map((doctor) => <option key={doctor.doctorId} value={doctor.doctorId}>{doctor.name} · {doctor.specialization || 'General medicine'}{doctor.hospital ? ` · ${doctor.hospital}` : ''}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-stone-700">Reason for visit
              <input maxLength={200} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Routine check-up" className="mt-1.5 w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900" />
            </label>
            <label className="text-xs font-medium text-stone-700">Date
              <input required type="date" min={minDate} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="mt-1.5 w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900" />
            </label>
            <label className="text-xs font-medium text-stone-700">Time
              <input required type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className="mt-1.5 w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900" />
            </label>
            <label className="text-xs font-medium text-stone-700 md:col-span-2">Notes for the clinic <span className="font-normal text-stone-400">(optional)</span>
              <textarea maxLength={1000} rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1.5 w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900" />
            </label>
            <div className="md:col-span-2"><button type="submit" disabled={submitting} className="rounded-lg bg-violet-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-violet-800 disabled:opacity-60">{submitting ? 'Booking…' : 'Book appointment'}</button></div>
          </form>
        )}
      </section>

      <section className="surface space-y-3 p-4 sm:p-6">
        <div className="flex items-center justify-between"><h2 className="text-sm font-semibold text-stone-900">Your appointments</h2><span className="text-xs text-stone-500">{appointments.length}</span></div>
        {loading ? <p className="py-6 text-center text-sm text-stone-500">Loading appointments…</p> : appointments.length === 0 ? <p className="py-6 text-center text-sm text-stone-500">No appointments booked yet.</p> : (
          <div className="divide-y divide-stone-100">
            {appointments.map((appointment) => {
              const canCancel = ['Upcoming', 'Pending'].includes(appointment.status);
              return <article key={appointment._id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="rounded-lg bg-violet-50 p-2 text-violet-700"><CalendarDays className="h-4 w-4" /></div>
                  <div><h3 className="text-sm font-semibold text-stone-900">{appointment.reason || 'Appointment'}</h3><p className="mt-1 text-xs text-stone-500">Dr. {appointment.doctor?.name || 'Doctor'}{appointment.doctor?.specialization ? ` · ${appointment.doctor.specialization}` : ''}</p><p className="mt-1 inline-flex items-center gap-1 text-[11px] text-stone-500"><Clock3 className="h-3 w-3" />{appointment.date ? new Date(appointment.date).toLocaleDateString() : 'Date unavailable'}{appointment.time ? ` · ${appointment.time}` : ''}</p></div>
                </div>
                <div className="flex items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${appointment.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' : appointment.status === 'Cancelled' ? 'bg-stone-100 text-stone-500' : 'bg-violet-50 text-violet-700'}`}>{appointment.status}</span>{canCancel && <button type="button" disabled={updatingId === appointment._id} onClick={() => cancelAppointment(appointment)} className="rounded-lg border border-stone-200 px-3 py-2 text-[11px] font-semibold text-stone-600 hover:bg-stone-50 disabled:opacity-50">{updatingId === appointment._id ? 'Cancelling…' : 'Cancel'}</button>}</div>
              </article>;
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default PatientAppointmentsPage;
