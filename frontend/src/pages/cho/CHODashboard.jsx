import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AlertCircle, ArrowRight, CalendarClock, Check, ClipboardList, FileSearch, HeartPulse, Search, Users, X } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { analyticsService } from '../../services/analyticsService';
import { patientService } from '../../services/patientService';
import { communityCareService } from '../../services/communityCareService';
import { useToast } from '../../hooks/useToast';

const card = 'rounded-2xl border border-stone-200 bg-white p-5 shadow-sm';
const formatter = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
const displayDate = (date) => date ? formatter.format(new Date(date)) : 'Not recorded';
const countFmt = (value) => Number(value || 0).toLocaleString();

function Metric({ title, value, caption, icon: Icon, tone = 'violet' }) {
  const colors = { violet: 'bg-violet-50 text-violet-700', blue: 'bg-sky-50 text-sky-700', amber: 'bg-amber-50 text-amber-700', rose: 'bg-rose-50 text-rose-700' };
  return <div className={card}><div className="flex items-start justify-between gap-3"><div><p className="text-sm text-stone-500">{title}</p><p className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">{value}</p><p className="mt-1 text-xs text-stone-500">{caption}</p></div><span className={`rounded-xl p-2.5 ${colors[tone]}`}><Icon size={19}/></span></div></div>;
}

function ChartEmpty({ text = 'No recorded data for this view yet.' }) { return <div className="flex h-56 items-center justify-center text-sm text-stone-500">{text}</div>; }

export const CHODashboard = () => {
  const { pathname } = useLocation();
  const { addToast } = useToast();
  const view = pathname.endsWith('/population') ? 'population' : pathname.endsWith('/diseases') ? 'diseases' : pathname.endsWith('/follow-ups') ? 'follow-ups' : pathname.endsWith('/referrals') ? 'referrals' : 'overview';
  const [stats, setStats] = useState(null);
  const [patients, setPatients] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [search, setSearch] = useState('');
  const [village, setVillage] = useState('All');
  const [analyticsVillage, setAnalyticsVillage] = useState('All');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingFollowUpId, setEditingFollowUpId] = useState(null);
  const [form, setForm] = useState({ patientId: '', dueAt: '', reason: '', destinationFacility: '', notes: '' });

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [statRes, patientRes, followRes, referralRes] = await Promise.all([
        analyticsService.getPopulationStats({ ...(analyticsVillage !== 'All' ? { village: analyticsVillage } : {}), ...(dateRange.from ? { from: new Date(dateRange.from).toISOString() } : {}), ...(dateRange.to ? { to: new Date(`${dateRange.to}T23:59:59`).toISOString() } : {}) }),
        patientService.getPatients({ page, limit: 20, search: search || undefined, village: village === 'All' ? undefined : village }),
        communityCareService.getFollowUps(),
        communityCareService.getReferrals(),
      ]);
      setStats(statRes?.data || null);
      setPatients(patientRes?.data?.patients || []);
      setTotalPages(patientRes?.data?.totalPages || 1);
      setFollowUps(followRes?.data || []);
      setReferrals(referralRes?.data || []);
    } catch (error) {
      addToast(error?.message || 'Could not load the CHO community workspace.', 'error');
    } finally { setLoading(false); }
  }, [search, village, analyticsVillage, dateRange, page, addToast]);

  useEffect(() => { reload(); }, [reload]);

  const villages = useMemo(() => [...new Set(patients.map((p) => p.village).filter(Boolean))].sort(), [patients]);
  const dueFollowUps = followUps.filter((f) => f.status === 'SCHEDULED').sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt));
  const overdue = dueFollowUps.filter((f) => new Date(f.dueAt) < new Date());
  const dueSoon = dueFollowUps.filter((f) => new Date(f.dueAt) >= new Date() && new Date(f.dueAt) < new Date(Date.now() + 7 * 86400000));
  const openReferrals = referrals.filter((r) => ['PENDING', 'ACCEPTED'].includes(r.status));
  const pendingReports = stats?.pendingReportReviews || 0;
  const filteredPatients = patients;
  const signalById = useMemo(() => new Map((stats?.patientSignals || []).map((signal) => [String(signal.patientId), signal])), [stats]);

  const openForm = (type) => {
    setEditingFollowUpId(null);
    setForm({ patientId: patients[0]?._id || '', dueAt: '', reason: '', destinationFacility: '', notes: '' });
    setFormOpen(type);
  };
  const submitCare = async (event) => {
    event.preventDefault();
    if (!form.patientId) { addToast('Select a patient in your community.', 'warning'); return; }
    setSaving(true);
    try {
      if (formOpen === 'follow-up') await communityCareService.createFollowUp({ patientId: form.patientId, dueAt: form.dueAt, reason: form.reason, note: form.notes });
      else if (formOpen === 'reschedule') await communityCareService.updateFollowUp(editingFollowUpId, { dueAt: form.dueAt, note: form.notes });
      else await communityCareService.createReferral({ patientId: form.patientId, reason: form.reason, destinationFacility: form.destinationFacility, notes: form.notes });
      addToast(formOpen === 'follow-up' ? 'Follow-up scheduled.' : 'Referral recorded as pending.', 'success');
      setFormOpen(false);
      await reload();
    } catch (error) { addToast(error?.message || 'Could not save this record.', 'error'); }
    finally { setSaving(false); }
  };

  const pageTitles = {
    overview: ['Community health', 'CHO daily overview', 'Your daily queue and patient records for the assigned community.'],
    population: ['Community health', 'Population health', 'Explore only recorded community data; coverage uses registered patients as its denominator.'],
    diseases: ['Clinical overview', 'Disease overview', 'Model-estimated assessments across diabetes, heart disease, hypertension, and kidney disease. Estimates are not diagnoses.'],
    'follow-ups': ['Care coordination', 'Follow-up management', 'Schedule outreach, document outcomes, and keep an auditable status history.'],
    referrals: ['Care coordination', 'Referral tracking', 'Track facility updates. A newly recorded referral remains pending until updated.'],
  };
  const [eyebrow, title, subtitle] = pageTitles[view];

  const markReferral = async (referral, status) => {
    try { await communityCareService.updateReferral(referral._id, { status }); addToast(`Referral updated: ${status.toLowerCase()}.`, 'success'); await reload(); }
    catch (error) { addToast(error?.message || 'Could not update referral.', 'error'); }
  };
  const markFollowUp = async (followUp, status) => {
    try { await communityCareService.updateFollowUp(followUp._id, { status, outcome: status === 'COMPLETED' ? 'Completed by CHO' : undefined }); addToast('Follow-up updated.', 'success'); await reload(); }
    catch (error) { addToast(error?.message || 'Could not update follow-up.', 'error'); }
  };
  const rescheduleFollowUp = (followUp) => {
    setEditingFollowUpId(followUp._id);
    setForm({ patientId: followUp.patient?._id || followUp.patient, dueAt: new Date(followUp.dueAt).toISOString().slice(0, 10), reason: followUp.reason, destinationFacility: '', notes: followUp.note || '' });
    setFormOpen('reschedule');
  };

  return <div className="space-y-6">
    <header className="flex flex-col justify-between gap-4 border-b border-stone-200 pb-5 sm:flex-row sm:items-end">
      <div><p className="text-[11px] font-semibold uppercase tracking-[.16em] text-violet-700">{eyebrow}</p><h1 className="editorial-heading mt-1 text-3xl text-stone-900">{title}</h1><p className="mt-1 max-w-2xl text-sm text-stone-500">{subtitle}</p></div>
      {(view === 'follow-ups' || view === 'referrals' || view === 'overview') && <div className="flex gap-2">{(view === 'follow-ups' || view === 'overview') && <button onClick={() => openForm('follow-up')} className="rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-800">Schedule follow-up</button>}{(view === 'referrals' || view === 'overview') && <button onClick={() => openForm('referral')} className="rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50">New referral</button>}</div>}
    </header>

    {loading && <div className="rounded-xl border border-stone-200 bg-white p-4 text-sm text-stone-500" role="status">Loading community records…</div>}
    {!loading && !stats && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Community data could not be loaded. Check your connection and reload.</div>}

    {view === 'overview' && <>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric title="Registered patients" value={countFmt(stats?.registeredPatients)} caption="Assigned catchment records" icon={Users}/>
        <Metric title="Confirmed report coverage" value={stats?.screeningCoverage == null ? '—' : `${stats.screeningCoverage}%`} caption={`${countFmt(stats?.screenedPatients)} patients with confirmed reports`} icon={Check} tone="blue"/>
        <Metric title="Reports needing review" value={countFmt(pendingReports)} caption="Pending report review status" icon={FileSearch} tone="amber"/>
        <Metric title="Overdue follow-ups" value={countFmt(overdue.length)} caption={`${dueSoon.length} due within 7 days`} icon={CalendarClock} tone="rose"/>
      </section>
      <div className="grid gap-5 xl:grid-cols-[1.35fr_.85fr]">
        <section className={card}><div className="mb-4 flex items-center justify-between"><div><h2 className="font-semibold text-stone-900">Screening activity</h2><p className="mt-1 text-xs text-stone-500">Confirmed report records by month</p></div><Link to="/cho/population" className="inline-flex items-center gap-1 text-sm font-medium text-violet-700">Population analytics <ArrowRight size={15}/></Link></div>{stats?.monthlyScreenings?.length ? <ResponsiveContainer width="100%" height={240}><LineChart data={stats.monthlyScreenings}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="month"/><YAxis allowDecimals={false}/><Tooltip/><Line type="monotone" dataKey="count" name="Confirmed reports" stroke="#6d28d9" strokeWidth={3} dot={{ r: 3 }}/></LineChart></ResponsiveContainer> : <ChartEmpty text="No confirmed report records in the selected period."/>}</section>
        <section className={card}><div className="mb-4"><h2 className="font-semibold text-stone-900">Action queue</h2><p className="mt-1 text-xs text-stone-500">Tasks based on current record status</p></div><div className="space-y-2">{[[pendingReports, 'Reports pending clinician review', '/cho/dashboard', FileSearch], [overdue.length, 'Overdue follow-ups', '/cho/follow-ups', AlertCircle], [dueSoon.length, 'Follow-ups due this week', '/cho/follow-ups', CalendarClock], [openReferrals.length, 'Referrals awaiting updates', '/cho/referrals', ClipboardList]].map(([n, label, href, Icon]) => <Link key={label} to={href} className="flex items-center justify-between rounded-xl border border-stone-100 bg-stone-50/60 p-3 hover:border-violet-200 hover:bg-violet-50/40"><span className="flex items-center gap-2 text-sm text-stone-700"><Icon size={16} className="text-violet-700"/>{label}</span><span className="font-semibold text-stone-900">{countFmt(n)}</span></Link>)}</div></section>
      </div>
      <section className={card}><div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold text-stone-900">Community patient registry</h2><p className="mt-1 text-xs text-stone-500">Search and review records in your assigned village.</p></div><div className="flex gap-2"><label className="relative"><span className="sr-only">Search patients</span><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"/><input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search name" className="w-44 rounded-lg border border-stone-200 py-2 pl-9 pr-3 text-sm sm:w-56"/></label>{villages.length > 1 && <select value={village} onChange={(e) => { setVillage(e.target.value); setPage(1); }} className="rounded-lg border border-stone-200 px-3 text-sm"><option>All</option>{villages.map((v) => <option key={v}>{v}</option>)}</select>}</div></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[1120px] text-left text-sm"><thead><tr className="border-b border-stone-200 text-xs uppercase tracking-wide text-stone-500"><th className="px-3 py-3">Patient</th><th className="px-3 py-3">Village</th><th className="px-3 py-3">Age</th><th className="px-3 py-3">Glucose</th><th className="px-3 py-3">Blood pressure</th><th className="px-3 py-3">Report</th><th className="px-3 py-3">Diabetes assessment</th><th className="px-3 py-3">Next follow-up</th><th className="px-3 py-3">Referral</th><th className="px-3 py-3 text-right">Profile</th></tr></thead><tbody className="divide-y divide-stone-100">{filteredPatients.map((p) => { const signal = signalById.get(String(p._id)); return <tr key={p._id} className="hover:bg-stone-50"><td className="px-3 py-3 font-medium text-stone-900">{p.user?.name || 'Name unavailable'}</td><td className="px-3 py-3 text-stone-600">{p.village || 'Not recorded'}</td><td className="px-3 py-3 text-stone-600">{p.age ? `${p.age} years` : '—'}</td><td className="px-3 py-3 text-stone-600">{p.fastingSugar != null ? `${p.fastingSugar} mg/dL` : '—'}</td><td className="px-3 py-3 text-stone-600">{p.systolicBP && p.diastolicBP ? `${p.systolicBP}/${p.diastolicBP}` : '—'}</td><td className="px-3 py-3 text-stone-600">{signal?.pendingReportReviews ? 'Pending clinician review' : signal?.hasConfirmedReport ? 'Confirmed report' : 'No confirmed report'}</td><td className="px-3 py-3 text-stone-600">{signal?.diabetesAssessment?.replaceAll('_', ' ').toLowerCase() || 'Unassessed'}</td><td className="px-3 py-3 text-stone-600">{signal?.nextFollowUp ? `${displayDate(signal.nextFollowUp)} · ${signal.followUpStatus}` : 'None scheduled'}</td><td className="px-3 py-3 text-stone-600">{signal?.referralStatus || 'None'}</td><td className="px-3 py-3 text-right"><Link to={`/cho/patient/${p._id}`} className="font-medium text-violet-700 hover:underline">View</Link></td></tr>; })}{!filteredPatients.length && <tr><td colSpan="10" className="px-3 py-10 text-center text-stone-500">{patients.length ? 'No matching patients.' : 'No patient records are assigned to this community.'}</td></tr>}</tbody></table></div>
        <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-3"><p className="text-xs text-stone-500">Page {page} of {totalPages}</p><div className="flex gap-2"><button disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-stone-200 px-3 py-1.5 text-sm disabled:opacity-40">Previous</button><button disabled={page >= totalPages || loading} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-stone-200 px-3 py-1.5 text-sm disabled:opacity-40">Next</button></div></div>
      </section>
    </>}

    {view === 'population' && <>
      <div className="grid gap-4 md:grid-cols-3"><Metric title="Registered patients" value={countFmt(stats?.registeredPatients)} caption="Population on file" icon={Users}/><Metric title="Confirmed report coverage" value={stats?.screeningCoverage == null ? '—' : `${stats.screeningCoverage}%`} caption={`${countFmt(stats?.screenedPatients)} of ${countFmt(stats?.registeredPatients)} registered patients`} icon={Check} tone="blue"/><Metric title="Missing age data" value={countFmt(stats?.dataQuality?.missingAge)} caption="Cannot be placed in age groups" icon={AlertCircle} tone="amber"/></div>
      <p className="rounded-xl border border-sky-100 bg-sky-50 p-3 text-sm text-sky-900">{stats?.screeningDenominator} No verified eligible-population denominator is configured, so this is not eligible-population coverage.</p>
      <div className="grid gap-5 xl:grid-cols-2"><section className={card}><h2 className="mb-3 font-semibold">Village report coverage</h2>{stats?.villageStats?.length ? <ResponsiveContainer width="100%" height={280}><BarChart data={stats.villageStats} layout="vertical" margin={{ left: 10, right: 18 }}><CartesianGrid strokeDasharray="3 3" horizontal={false}/><XAxis type="number" allowDecimals={false}/><YAxis type="category" dataKey="name" width={100}/><Tooltip/><Legend/><Bar dataKey="screened" name="Patients with confirmed report" fill="#6d28d9" radius={[0, 5, 5, 0]}/><Bar dataKey="remaining" name="No confirmed report" fill="#d6d3d1" radius={[0, 5, 5, 0]}/></BarChart></ResponsiveContainer> : <ChartEmpty/>}</section>
        <section className={card}><h2 className="mb-3 font-semibold">Registered population by age</h2>{stats?.ageDistribution?.some((g) => g.value) ? <ResponsiveContainer width="100%" height={280}><BarChart data={stats.ageDistribution}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name"/><YAxis allowDecimals={false}/><Tooltip/><Bar dataKey="value" name="Patients" fill="#0ea5e9" radius={[5, 5, 0, 0]}/></BarChart></ResponsiveContainer> : <ChartEmpty text="Age data is incomplete for the registered population."/>}</section></div>
      <section className={card}><div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold">Confirmed reports over time</h2><p className="mt-1 text-xs text-stone-500">Filter by assigned village and report confirmation date.</p></div><div className="flex flex-wrap items-center gap-2 text-xs text-stone-500"><label>Village <select aria-label="Analytics village" value={analyticsVillage} onChange={(e) => setAnalyticsVillage(e.target.value)} className="ml-1 rounded-md border border-stone-200 px-2 py-1 text-sm text-stone-700"><option>All</option>{(stats?.villageStats || []).map((v) => <option key={v.name}>{v.name}</option>)}</select></label><label>From <input aria-label="Analytics start date" type="date" value={dateRange.from} max={dateRange.to || undefined} onChange={(e) => setDateRange((d) => ({ ...d, from: e.target.value }))} className="ml-1 rounded-md border border-stone-200 px-2 py-1 text-sm text-stone-700"/></label><label>To <input aria-label="Analytics end date" type="date" value={dateRange.to} min={dateRange.from || undefined} onChange={(e) => setDateRange((d) => ({ ...d, to: e.target.value }))} className="ml-1 rounded-md border border-stone-200 px-2 py-1 text-sm text-stone-700"/></label><button type="button" onClick={() => { setDateRange({ from: '', to: '' }); setAnalyticsVillage('All'); }} className="rounded-md border px-2 py-1">Clear filters</button></div></div>{stats?.monthlyScreenings?.length ? <ResponsiveContainer width="100%" height={260}><LineChart data={stats.monthlyScreenings}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="month"/><YAxis allowDecimals={false}/><Tooltip/><Line dataKey="count" name="Confirmed reports" stroke="#6d28d9" strokeWidth={3}/></LineChart></ResponsiveContainer> : <ChartEmpty text="No confirmed report records are available in this filter."/>}</section>
    </>}

    {view === 'diseases' && <>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        Predicted risk categories summarize the most recent successful model estimate per patient and disease across all four supported conditions (Diabetes, Heart Disease, Hypertension, Chronic Kidney Disease). They are not confirmed diagnoses. Missing assessments remain unassessed.
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        {(stats?.diseaseDistribution || []).map((d) => (
          <section key={d.disease} className={card}>
            <div className="flex items-center gap-2">
              <HeartPulse className="text-violet-700" size={18}/>
              <div>
                <h2 className="font-semibold text-stone-900">{d.name} risk assessments</h2>
                <p className="text-xs text-stone-500">Current recorded model outputs</p>
              </div>
            </div>
            {d.assessed ? (
              <ResponsiveContainer width="100%" height={235}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Elevated model-estimated risk', value: d.elevated },
                      { name: 'Lower model-estimated risk', value: d.lower },
                    ]}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={82}
                    paddingAngle={3}
                  >
                    {[0, 1].map((i) => <Cell key={i} fill={i ? '#8b5cf6' : '#ef4444'}/>)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e7e5e4', borderRadius: '8px', color: '#1c1917' }} />
                  <Legend formatter={(value) => <span className="text-xs font-semibold text-stone-800 ml-1">{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmpty text="No successful assessment is recorded for this disease."/>
            )}
            <p className="mt-2 text-xs font-medium text-stone-600">
              Assessed <strong className="text-stone-900">{d.assessed}</strong> · Elevated <strong className="text-rose-700">{d.elevated}</strong> · Lower <strong className="text-violet-700">{d.lower}</strong> · Unassessed <strong className="text-stone-500">{d.unassessed}</strong>
            </p>
          </section>
        ))}
      </div>
      <section className={card}>
        <h2 className="mb-3 font-semibold text-stone-900">Clinical data quality</h2>
        <p className="text-sm text-stone-600">{countFmt(stats?.dataQuality?.patientsWithNoConfirmedReport)} registered patients have no confirmed report on record. This means no confirmed report was found; it does not mean screening is clinically overdue.</p>
      </section>
    </>}

    {view === 'follow-ups' && <section className={card}><div className="mb-4 flex items-center justify-between"><div><h2 className="font-semibold">Scheduled community follow-ups</h2><p className="text-xs text-stone-500">{overdue.length} overdue · {dueSoon.length} due in 7 days</p></div><button onClick={() => openForm('follow-up')} className="rounded-lg bg-violet-700 px-3 py-2 text-sm text-white">Schedule</button></div><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead><tr className="border-b text-xs uppercase text-stone-500"><th className="py-3">Patient</th><th>Due</th><th>Reason</th><th>Status</th><th className="text-right">Action</th></tr></thead><tbody className="divide-y divide-stone-100">{followUps.map((f) => <tr key={f._id}><td className="py-3 font-medium">{f.patient?.user?.name || 'Patient'}</td><td>{displayDate(f.dueAt)}{f.status === 'SCHEDULED' && new Date(f.dueAt) < new Date() && <span className="ml-2 text-xs text-rose-700">Overdue</span>}</td><td>{f.reason}</td><td>{f.status}</td><td className="space-x-2 text-right">{f.status === 'SCHEDULED' && <><button onClick={() => rescheduleFollowUp(f)} className="rounded-md border px-2.5 py-1.5 text-xs text-stone-700">Reschedule</button><button onClick={() => markFollowUp(f, 'COMPLETED')} className="rounded-md border px-2.5 py-1.5 text-xs text-violet-700 hover:bg-violet-50">Mark complete</button></>}</td></tr>)}{!followUps.length && <tr><td colSpan="5" className="py-10 text-center text-stone-500">No follow-ups recorded yet.</td></tr>}</tbody></table></div></section>}

    {view === 'referrals' && <section className={card}><div className="mb-4 flex items-center justify-between"><div><h2 className="font-semibold">Community referrals</h2><p className="text-xs text-stone-500">{openReferrals.length} awaiting an update</p></div><button onClick={() => openForm('referral')} className="rounded-lg bg-violet-700 px-3 py-2 text-sm text-white">New referral</button></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="border-b text-xs uppercase text-stone-500"><th className="py-3">Patient</th><th>Referred</th><th>Destination</th><th>Reason</th><th>Status</th><th className="text-right">Update</th></tr></thead><tbody className="divide-y divide-stone-100">{referrals.map((r) => <tr key={r._id}><td className="py-3 font-medium">{r.patient?.user?.name || 'Patient'}</td><td>{displayDate(r.referredAt)}</td><td>{r.destinationFacility}</td><td>{r.reason}</td><td>{r.status}</td><td className="text-right">{r.status === 'PENDING' && <button onClick={() => markReferral(r, 'ACCEPTED')} className="rounded-md border px-2 py-1 text-xs text-violet-700">Mark accepted</button>}{r.status === 'ACCEPTED' && <button onClick={() => markReferral(r, 'COMPLETED')} className="rounded-md border px-2 py-1 text-xs text-violet-700">Mark completed</button>}</td></tr>)}{!referrals.length && <tr><td colSpan="6" className="py-10 text-center text-stone-500">No referrals recorded yet.</td></tr>}</tbody></table></div></section>}

    {formOpen && <div role="presentation" className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/40 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) setFormOpen(false); }}><form onSubmit={submitCare} className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-xl"><div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold">{formOpen === 'follow-up' ? 'Schedule a follow-up' : formOpen === 'reschedule' ? 'Reschedule follow-up' : 'Record a referral'}</h2><p className="text-sm text-stone-500">Patient choices are limited to records in your community.</p></div><button type="button" aria-label="Close" onClick={() => setFormOpen(false)} className="rounded-lg p-2 hover:bg-stone-100"><X size={18}/></button></div>{formOpen !== 'reschedule' && <label className="block text-sm font-medium">Patient<select required value={form.patientId} onChange={(e) => setForm((f) => ({ ...f, patientId: e.target.value }))} className="mt-1 w-full rounded-lg border border-stone-300 p-2.5"><option value="">Choose patient</option>{patients.map((p) => <option value={p._id} key={p._id}>{p.user?.name || 'Patient'} · {p.village || 'Village not recorded'}</option>)}</select></label>}{(formOpen === 'follow-up' || formOpen === 'reschedule') && <label className="block text-sm font-medium">Due date<input type="date" required value={form.dueAt} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setForm((f) => ({ ...f, dueAt: e.target.value }))} className="mt-1 w-full rounded-lg border border-stone-300 p-2.5"/></label>}{formOpen === 'referral' && <label className="block text-sm font-medium">Destination facility<input required maxLength={200} value={form.destinationFacility} onChange={(e) => setForm((f) => ({ ...f, destinationFacility: e.target.value }))} className="mt-1 w-full rounded-lg border border-stone-300 p-2.5"/></label>}{formOpen !== 'reschedule' && <label className="block text-sm font-medium">{formOpen === 'follow-up' ? 'Reason' : 'Referral reason'}<input required maxLength={300} value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} className="mt-1 w-full rounded-lg border border-stone-300 p-2.5"/></label>}<label className="block text-sm font-medium">Notes<textarea maxLength={1000} rows="3" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className="mt-1 w-full rounded-lg border border-stone-300 p-2.5"/></label><div className="flex justify-end gap-2"><button type="button" onClick={() => setFormOpen(false)} className="rounded-lg border px-4 py-2 text-sm">Cancel</button><button disabled={saving} className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button></div></form></div>}
  </div>;
};
