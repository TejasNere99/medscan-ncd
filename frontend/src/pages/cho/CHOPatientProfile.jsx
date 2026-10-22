import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarClock, FileText, HeartPulse, UserRound } from 'lucide-react';
import { patientService } from '../../services/patientService';
import { reportService } from '../../services/reportService';
import { predictionService } from '../../services/predictionService';
import { communityCareService } from '../../services/communityCareService';
import { useToast } from '../../hooks/useToast';
import { resolveMediaUrl } from '../../services/api';

const panel = 'rounded-2xl border border-stone-200 bg-white p-5 shadow-sm';
const dateLabel = (v) => v ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(v)) : 'Date unavailable';

export const CHOPatientProfile = () => {
  const { id } = useParams();
  const { addToast } = useToast();
  const [patient, setPatient] = useState(null);
  const [reports, setReports] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const [p, r, d, h, f, x] = await Promise.allSettled([
          patientService.getPatientById(id), reportService.getReports(id),
          predictionService.getDiabetesPredictionHistory(id), predictionService.getHeartDiseasePredictionHistory(id),
          communityCareService.getFollowUps({ patientId: id }), communityCareService.getReferrals({ patientId: id }),
        ]);
        if (!active) return;
        if (p.status === 'rejected') throw p.reason;
        setPatient(p.value?.data || null);
        setReports(r.status === 'fulfilled' ? r.value?.data || [] : []);
        setAssessments([...(d.status === 'fulfilled' ? d.value?.data || [] : []), ...(h.status === 'fulfilled' ? h.value?.data || [] : [])].sort((a, b) => new Date(b.predictionDate || b.createdAt) - new Date(a.predictionDate || a.createdAt)));
        setFollowUps(f.status === 'fulfilled' ? f.value?.data || [] : []);
        setReferrals(x.status === 'fulfilled' ? x.value?.data || [] : []);
      } catch (error) { if (active) addToast(error?.message || 'Could not load this community patient profile.', 'error'); }
      finally { if (active) setLoading(false); }
    };
    load();
    return () => { active = false; };
  }, [id, addToast]);

  if (loading) return <div className="py-16 text-center text-sm text-stone-500">Loading patient workspace…</div>;
  if (!patient) return <div className="space-y-4"><Link to="/cho/dashboard" className="inline-flex items-center gap-2 text-sm text-violet-700"><ArrowLeft size={16}/>Back to community</Link><div className={panel}>Patient record is unavailable for this community.</div></div>;

  const measurements = [
    ['Fasting glucose', patient.fastingSugar, 'mg/dL'], ['Blood pressure', patient.systolicBP && patient.diastolicBP ? `${patient.systolicBP}/${patient.diastolicBP}` : null, 'mmHg'],
    ['BMI', patient.bmi, 'kg/m²'], ['Total cholesterol', patient.totalCholesterol, 'mg/dL'], ['HDL', patient.hdl, 'mg/dL'], ['Creatinine', patient.serumCreatinine, 'mg/dL'],
  ];
  const timeline = [
    ...reports.map((item) => ({ date: item.confirmedAt || item.uploadDate || item.createdAt, type: 'Report', label: item.title, status: item.status })),
    ...assessments.map((item) => ({ date: item.predictionDate || item.createdAt, type: 'Risk assessment', label: item.disease === 'heart_disease' ? 'Heart disease model estimate' : 'Diabetes model estimate', status: item.riskCategory })),
    ...followUps.map((item) => ({ date: item.dueAt, type: 'Follow-up', label: item.reason, status: item.status })),
    ...referrals.map((item) => ({ date: item.referredAt, type: 'Referral', label: `${item.destinationFacility}: ${item.reason}`, status: item.status })),
  ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  return <div className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-stone-200 pb-5"><div><Link to="/cho/dashboard" className="mb-4 inline-flex items-center gap-2 text-sm text-violet-700 hover:underline"><ArrowLeft size={16}/>Back to patient registry</Link><p className="text-[11px] font-semibold uppercase tracking-[.16em] text-violet-700">Community patient workspace</p><h1 className="editorial-heading mt-1 text-3xl">{patient.user?.name || 'Patient profile'}</h1><p className="mt-1 text-sm text-stone-500">{patient.village || 'Village not recorded'} · {patient.age ? `${patient.age} years` : 'Age not recorded'} · {patient.gender || 'Demographics incomplete'}</p></div><div className="flex gap-2"><Link to="/cho/follow-ups" className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm">Manage follow-ups</Link><Link to="/cho/referrals" className="rounded-lg bg-violet-700 px-3 py-2 text-sm text-white">Manage referrals</Link></div></header>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><div className={`${panel} sm:col-span-2 xl:col-span-1`}><div className="mb-3 flex items-center gap-2"><UserRound size={17} className="text-violet-700"/><h2 className="font-semibold">Health summary</h2></div><p className="text-sm text-stone-600">Blood group: {patient.bloodGroup || 'Not recorded'}</p><p className="mt-2 text-sm text-stone-600">Known history</p><ul className="mt-1 list-inside list-disc text-sm text-stone-500">{patient.medicalHistory?.length ? patient.medicalHistory.map((v, i) => <li key={`${v}-${i}`}>{v}</li>) : <li>No history recorded</li>}</ul></div>{measurements.map(([label, value, unit]) => <div key={label} className={panel}><p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{label}</p><p className="mt-3 text-xl font-semibold text-stone-900">{value ?? '—'}{value != null && <span className="ml-1 text-sm font-normal text-stone-500">{unit}</span>}</p><p className="mt-1 text-xs text-stone-400">Current profile field · measurement date not tracked</p></div>)}</section>
    <div className="grid gap-5 xl:grid-cols-2"><section className={panel}><div className="mb-4 flex items-center gap-2"><FileText size={18} className="text-violet-700"/><h2 className="font-semibold">Reports and review status</h2></div><p className="mb-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">CHO access is read-only for reports. Review and confirmation actions remain with the patient or an authorized doctor.</p><div className="space-y-2">{reports.map((report) => <div key={report._id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-100 p-3"><div><p className="text-sm font-medium">{report.title}</p><p className="text-xs text-stone-500">Uploaded {dateLabel(report.uploadDate)} · {report.status}</p></div>{report.fileUrl && <a href={resolveMediaUrl(report.fileUrl)} target="_blank" rel="noreferrer" className="text-xs font-medium text-violet-700 hover:underline">Open source report</a>}</div>)}{!reports.length && <p className="py-6 text-center text-sm text-stone-500">No reports are recorded.</p>}</div></section>
      <section className={panel}><div className="mb-4 flex items-center gap-2"><HeartPulse size={18} className="text-rose-600"/><h2 className="font-semibold">Supported risk assessments</h2></div><div className="space-y-2">{assessments.map((a) => <div key={a._id} className="rounded-xl border border-stone-100 p-3"><div className="flex justify-between gap-2"><p className="text-sm font-medium">{a.disease === 'heart_disease' ? 'Heart disease' : 'Diabetes'} · {a.riskCategory?.replaceAll('_', ' ').toLowerCase() || 'status unavailable'}</p><span className="text-xs text-stone-500">{dateLabel(a.predictionDate || a.createdAt)}</span></div><p className="mt-1 text-sm text-stone-600">{Number.isFinite(a.probability) ? `${(a.probability * 100).toFixed(1)}% model-estimated probability` : 'No probability recorded'} · model {a.modelVersion || 'version unavailable'}</p><p className="mt-1 text-xs text-stone-500">Not a diagnosis. {a.explanationStatus === 'unavailable' ? 'Per-patient explanation unavailable.' : ''}</p></div>)}{!assessments.length && <p className="py-6 text-center text-sm text-stone-500">No completed diabetes or heart disease assessments.</p>}</div></section></div>
    <section className={panel}><div className="mb-4 flex items-center gap-2"><CalendarClock size={18} className="text-sky-700"/><h2 className="font-semibold">Care timeline</h2></div><div className="divide-y divide-stone-100">{timeline.map((item, index) => <div key={`${item.type}-${item.date}-${index}`} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><span className="text-[10px] font-semibold uppercase tracking-wider text-violet-700">{item.type}</span><p className="text-sm text-stone-800">{item.label}</p></div><div className="text-right"><p className="text-xs text-stone-500">{dateLabel(item.date)}</p><p className="text-xs text-stone-600">{item.status}</p></div></div>)}{!timeline.length && <p className="py-8 text-center text-sm text-stone-500">No reports, assessments, follow-ups, or referrals are on file.</p>}</div></section>
  </div>;
};
