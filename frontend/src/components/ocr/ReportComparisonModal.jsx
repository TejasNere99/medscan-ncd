import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  Activity,
  ArrowRight,
  ShieldCheck,
  Printer,
  Sparkles,
} from 'lucide-react';

export const BIOMARKER_DEFINITIONS = [
  {
    key: 'fastingSugar',
    label: 'Fasting Blood Glucose',
    unit: 'mg/dL',
    normalRange: '70 – 99 mg/dL',
    category: 'Glycemic Control',
    isLowerBetter: true,
    isNormal: (val) => val >= 70 && val < 100,
    isAttention: (val) => val >= 126,
    altKeys: ['fastingGlucose', 'glucose', 'sugar'],
  },
  {
    key: 'systolicBP',
    label: 'Systolic Blood Pressure',
    unit: 'mmHg',
    normalRange: '< 120 mmHg',
    category: 'Hemodynamics',
    isLowerBetter: true,
    isNormal: (val) => val < 120,
    isAttention: (val) => val >= 140,
    altKeys: ['sysBP', 'systolic'],
  },
  {
    key: 'diastolicBP',
    label: 'Diastolic Blood Pressure',
    unit: 'mmHg',
    normalRange: '< 80 mmHg',
    category: 'Hemodynamics',
    isLowerBetter: true,
    isNormal: (val) => val < 80,
    isAttention: (val) => val >= 90,
    altKeys: ['diaBP', 'diastolic'],
  },
  {
    key: 'totalCholesterol',
    label: 'Total Cholesterol',
    unit: 'mg/dL',
    normalRange: '< 200 mg/dL',
    category: 'Lipid Profile',
    isLowerBetter: true,
    isNormal: (val) => val < 200,
    isAttention: (val) => val >= 240,
    altKeys: ['cholesterol', 'totChol'],
  },
  {
    key: 'hdl',
    label: 'HDL Cholesterol',
    unit: 'mg/dL',
    normalRange: '> 50 mg/dL (Cardioprotective)',
    category: 'Lipid Profile',
    isLowerBetter: false, // Higher is better
    isNormal: (val) => val >= 50,
    isAttention: (val) => val < 40,
    altKeys: ['hdlCholesterol'],
  },
  {
    key: 'serumCreatinine',
    label: 'Serum Creatinine',
    unit: 'mg/dL',
    normalRange: '0.6 – 1.2 mg/dL',
    category: 'Renal Function',
    isLowerBetter: true,
    isNormal: (val) => val >= 0.6 && val <= 1.2,
    isAttention: (val) => val > 1.4,
    altKeys: ['creatinine', 'sCreatinine'],
  },
  {
    key: 'bloodUrea',
    label: 'Blood Urea',
    unit: 'mg/dL',
    normalRange: '15 – 40 mg/dL',
    category: 'Renal Function',
    isLowerBetter: true,
    isNormal: (val) => val >= 15 && val <= 40,
    isAttention: (val) => val > 50,
    altKeys: ['urea', 'serumUrea'],
  },
  {
    key: 'hemoglobin',
    label: 'Hemoglobin',
    unit: 'g/dL',
    normalRange: '13.0 – 17.5 g/dL (M) / 12.0 – 15.5 g/dL (F)',
    category: 'Hematology',
    isLowerBetter: null, // In-range is best
    isNormal: (val) => val >= 12.0 && val <= 17.5,
    isAttention: (val) => val < 10.0,
    altKeys: ['hb'],
  },
  {
    key: 'bmi',
    label: 'Body Mass Index (BMI)',
    unit: 'kg/m²',
    normalRange: '18.5 – 24.9 kg/m²',
    category: 'Anthropometry',
    isLowerBetter: true,
    isNormal: (val) => val >= 18.5 && val < 25.0,
    isAttention: (val) => val >= 30.0,
    altKeys: ['bodyMassIndex'],
  },
  {
    key: 'heartRate',
    label: 'Resting Heart Rate',
    unit: 'bpm',
    normalRange: '60 – 100 bpm',
    category: 'Hemodynamics',
    isLowerBetter: null,
    isNormal: (val) => val >= 60 && val <= 100,
    isAttention: (val) => val > 100 || val < 50,
    altKeys: ['pulse'],
  },
];

export const extractBiomarkers = (report) => {
  if (!report) return {};
  const confirmedData = report.confirmedData || {};
  const measurements = confirmedData.measurements || report.extractedData?.measurements || {};
  const structured = report.structuredData || {};

  const result = {};
  for (const def of BIOMARKER_DEFINITIONS) {
    const keysToTry = [def.key, ...(def.altKeys || [])];
    let found = null;

    for (const k of keysToTry) {
      const mVal = measurements[k];
      if (mVal !== undefined && mVal !== null) {
        found = typeof mVal === 'object' ? mVal.value : mVal;
        if (found !== undefined && found !== null && !isNaN(Number(found))) break;
      }
      if (structured[k] !== undefined && structured[k] !== null && !isNaN(Number(structured[k]))) {
        found = structured[k];
        break;
      }
      if (confirmedData[k] !== undefined && confirmedData[k] !== null && !isNaN(Number(confirmedData[k]))) {
        found = confirmedData[k];
        break;
      }
    }

    // Special fallback for blood pressure if nested under bloodPressure.overall.average
    if (found === null || found === undefined || isNaN(Number(found))) {
      if (def.key === 'systolicBP') {
        const bpMeas = measurements?.bloodPressure;
        const val = bpMeas?.overall?.average?.systolic?.value ?? bpMeas?.overall?.average?.systolic ?? measurements?.overall?.avgSystolic;
        if (val !== undefined && val !== null && !isNaN(Number(val))) found = Number(val);
      } else if (def.key === 'diastolicBP') {
        const bpMeas = measurements?.bloodPressure;
        const val = bpMeas?.overall?.average?.diastolic?.value ?? bpMeas?.overall?.average?.diastolic ?? measurements?.overall?.avgDiastolic;
        if (val !== undefined && val !== null && !isNaN(Number(val))) found = Number(val);
      }
    }

    result[def.key] = found !== null && found !== undefined && !isNaN(Number(found)) ? Number(found) : null;
  }
  return result;
};

export const ReportComparisonModal = ({ isOpen, onClose, reports = [], patient = null }) => {
  if (!isOpen) return null;

  // Filter only confirmed reports and sort chronologically (oldest to newest)
  const confirmed = useMemo(() => {
    return [...reports]
      .filter((r) => r.status === 'CONFIRMED' || r.status === 'Verified')
      .sort((a, b) => new Date(a.confirmedAt || a.uploadDate) - new Date(b.confirmedAt || b.uploadDate));
  }, [reports]);

  // Default selection: oldest (baseline) vs newest (latest)
  const [baselineId, setBaselineId] = useState(() => confirmed[0]?._id || '');
  const [latestId, setLatestId] = useState(() => confirmed[confirmed.length - 1]?._id || '');

  const baselineReport = useMemo(
    () => confirmed.find((r) => r._id === baselineId) || confirmed[0],
    [confirmed, baselineId]
  );
  const latestReport = useMemo(
    () => confirmed.find((r) => r._id === latestId) || confirmed[confirmed.length - 1],
    [confirmed, latestId]
  );

  const baselineBiomarkers = useMemo(() => extractBiomarkers(baselineReport), [baselineReport]);
  const latestBiomarkers = useMemo(() => extractBiomarkers(latestReport), [latestReport]);

  const baselineDate = baselineReport ? new Date(baselineReport.confirmedAt || baselineReport.uploadDate) : null;
  const latestDate = latestReport ? new Date(latestReport.confirmedAt || latestReport.uploadDate) : null;

  const daysBetween =
    baselineDate && latestDate
      ? Math.max(0, Math.round((latestDate.getTime() - baselineDate.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

  // Calculated comparison items
  const comparisons = useMemo(() => {
    return BIOMARKER_DEFINITIONS.map((def) => {
      const bVal = baselineBiomarkers[def.key];
      const lVal = latestBiomarkers[def.key];

      if (bVal === null && lVal === null) return null;

      const hasBoth = bVal !== null && lVal !== null;
      const delta = hasBoth ? Math.round((lVal - bVal) * 100) / 100 : null;
      const pctChange = hasBoth && bVal !== 0 ? Math.round(((lVal - bVal) / bVal) * 1000) / 10 : null;

      let direction = 'stable';
      let assessment = 'Stable';
      let tone = 'slate';

      if (hasBoth) {
        if (Math.abs(delta) < 0.001) {
          direction = 'stable';
          assessment = 'No change';
          tone = 'slate';
        } else if (def.isLowerBetter === true) {
          // Decreasing is good (e.g. cholesterol, blood sugar, BP)
          if (delta < 0) {
            direction = 'down';
            assessment = 'Favorable reduction';
            tone = 'emerald';
          } else {
            direction = 'up';
            assessment = def.isAttention(lVal) ? 'Elevated above target' : 'Minor increase (In range)';
            tone = def.isAttention(lVal) ? 'amber' : 'slate';
          }
        } else if (def.isLowerBetter === false) {
          // Increasing is good (e.g. HDL)
          if (delta > 0) {
            direction = 'up';
            assessment = 'Favorable increase';
            tone = 'emerald';
          } else {
            direction = 'down';
            assessment = def.isAttention(lVal) ? 'Low protective level' : 'Minor decrease';
            tone = def.isAttention(lVal) ? 'amber' : 'slate';
          }
        } else {
          // In-range is best (e.g. Hemoglobin, Heart Rate)
          if (def.isNormal(lVal)) {
            direction = delta > 0 ? 'up' : 'down';
            assessment = 'Optimal within reference';
            tone = 'emerald';
          } else {
            direction = delta > 0 ? 'up' : 'down';
            assessment = 'Outside reference range';
            tone = 'amber';
          }
        }
      }

      return {
        ...def,
        baseline: bVal,
        latest: lVal,
        delta,
        pctChange,
        direction,
        assessment,
        tone,
      };
    }).filter(Boolean);
  }, [baselineBiomarkers, latestBiomarkers]);

  // Overall trajectory evaluation
  const favorableCount = comparisons.filter((c) => c.tone === 'emerald').length;
  const amberCount = comparisons.filter((c) => c.tone === 'amber').length;
  const stableCount = comparisons.filter((c) => c.tone === 'slate').length;

  let trajectoryHeadline = 'Stable Health Trajectory';
  let trajectoryColor = 'border-teal-500/40 bg-teal-500/10 text-teal-200';
  let trajectoryText =
    'Your routine cardiometabolic markers remain stable across the observation interval with consistent physiological regulation.';

  if (favorableCount > amberCount && favorableCount >= 2) {
    trajectoryHeadline = 'Favorable Positive Trajectory';
    trajectoryColor = 'border-emerald-300 bg-emerald-50 text-emerald-900 font-medium';
    trajectoryText =
      'Key biomarkers (including blood pressure and lipid fractions) demonstrate favorable improvements compared to your initial baseline evaluation.';
  } else if (amberCount > favorableCount) {
    trajectoryHeadline = 'Active Clinical Follow-up Advised';
    trajectoryColor = 'border-amber-300 bg-amber-50 text-amber-950 font-medium';
    trajectoryText =
      'Elevated values were identified across one or more laboratory indicators. Share this comparative summary with your attending physician.';
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="glass-card w-full max-w-4xl rounded-3xl border border-slate-800 bg-slate-900/95 shadow-2xl relative my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-black text-white">Longitudinal Health Intelligence</h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  {confirmed.length} Confirmed Reports
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Automated comparative delta tracking across consecutive consultations
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => window.print()}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors hidden sm:flex items-center space-x-1.5 text-xs font-semibold"
              title="Print comparative report"
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Report Pair Selector & Timeline */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-300">
                <Calendar className="w-4 h-4 text-brand-400" />
                <span>Observation Window: {daysBetween} Days</span>
                <span className="text-slate-500">
                  ({Math.round((daysBetween / 30.4) * 10) / 10} Months elapsed)
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                Patient: <strong className="text-white">{patient?.user?.name || patient?.name || 'Aarav Sharma'}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Baseline Selector */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Chronological Baseline (Initial)
                </label>
                <select
                  value={baselineId}
                  onChange={(e) => setBaselineId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white font-semibold focus:border-brand-500 focus:outline-none"
                >
                  {confirmed.map((r) => (
                    <option key={r._id} value={r._id}>
                      {new Date(r.confirmedAt || r.uploadDate).toLocaleDateString()} — {r.title}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500">
                  Confirmed: {baselineDate ? baselineDate.toLocaleDateString() : '—'}
                </p>
              </div>

              {/* Latest Selector */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Latest Evaluation (Recent)
                </label>
                <select
                  value={latestId}
                  onChange={(e) => setLatestId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white font-semibold focus:border-brand-500 focus:outline-none"
                >
                  {confirmed.map((r) => (
                    <option key={r._id} value={r._id}>
                      {new Date(r.confirmedAt || r.uploadDate).toLocaleDateString()} — {r.title}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500">
                  Confirmed: {latestDate ? latestDate.toLocaleDateString() : '—'}
                </p>
              </div>
            </div>
          </div>

          {/* Overall Clinical Synthesis Banner */}
          <div className={`p-4 rounded-2xl border ${trajectoryColor} space-y-1.5`}>
            <div className="flex items-center space-x-2 font-bold text-xs">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>{trajectoryHeadline}</span>
            </div>
            <p className="text-xs leading-relaxed opacity-90">{trajectoryText}</p>
          </div>

          {/* Comparative Analyte Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
                <Activity className="w-4 h-4 text-teal-400" />
                <span>Biomarker Trajectory Matrix ({comparisons.length} Parameters)</span>
              </h4>
              <span className="text-[11px] text-slate-400">Values confirmed from diagnostic records</span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-900/60">
                    <th className="py-3 px-4">Biomarker / Category</th>
                    <th className="py-3 px-4">
                      Initial Baseline ({baselineDate ? baselineDate.toLocaleDateString() : '—'})
                    </th>
                    <th className="py-3 px-4">
                      Latest Result ({latestDate ? latestDate.toLocaleDateString() : '—'})
                    </th>
                    <th className="py-3 px-4">Delta / Change</th>
                    <th className="py-3 px-4">Reference Target</th>
                    <th className="py-3 px-4 text-right">Trajectory</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {comparisons.map((item) => (
                    <tr key={item.key} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3 px-4">
                        <p className="font-bold text-white">{item.label}</p>
                        <p className="text-[10px] text-slate-500">{item.category}</p>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-300">
                        {item.baseline !== null ? `${item.baseline} ${item.unit}` : <span className="text-slate-600">—</span>}
                      </td>
                      <td className="py-3 px-4 font-bold text-white">
                        {item.latest !== null ? `${item.latest} ${item.unit}` : <span className="text-slate-600">—</span>}
                      </td>
                      <td className="py-3 px-4">
                        {item.delta !== null ? (
                          <div className="flex items-center space-x-1.5">
                            {item.direction === 'up' && <TrendingUp className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                            {item.direction === 'down' && <TrendingDown className="w-3.5 h-3.5 text-teal-400 shrink-0" />}
                            {item.direction === 'stable' && <Minus className="w-3.5 h-3.5 text-slate-500 shrink-0" />}
                            <span
                              className={`font-mono font-bold ${
                                item.tone === 'emerald'
                                  ? 'text-emerald-400'
                                  : item.tone === 'amber'
                                  ? 'text-amber-400'
                                  : 'text-slate-300'
                              }`}
                            >
                              {item.delta > 0 ? `+${item.delta}` : item.delta} {item.unit}
                            </span>
                            {item.pctChange !== null && (
                              <span className="text-[10px] text-slate-500 font-mono">
                                ({item.pctChange > 0 ? `+${item.pctChange}` : item.pctChange}%)
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-600 font-mono">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-[11px] font-mono">
                        {item.normalRange}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            item.tone === 'emerald'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : item.tone === 'amber'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-slate-200 text-slate-700 border border-slate-300'
                          }`}
                        >
                          {item.tone === 'emerald' && <CheckCircle2 className="w-3 h-3 text-emerald-700" />}
                          {item.tone === 'amber' && <AlertCircle className="w-3 h-3 text-amber-700" />}
                          <span>{item.assessment}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Clinical Decision Support Disclaimer */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start space-x-2.5 text-[11px] text-slate-400">
            <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Clinical Decision Support Note:</strong> Longitudinal deltas are calculated directly from confirmed
              laboratory records and provide observational trend tracking over time. They do not constitute an autonomous
              medical diagnosis or treatment modification. Consult your attending clinician for definitive evaluation.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            MedScan-NCD Clinical Decision Support · Longitudinal Module
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Close Overview
          </button>
        </div>
      </div>
    </div>
  );
};
