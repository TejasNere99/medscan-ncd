import React from 'react';
import { motion } from 'framer-motion';

export const RiskGaugeChart = ({ riskPercent = 0, riskLevel = 'Low', diseaseBreakdown = {} }) => {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (riskPercent / 100) * circumference;

  const getColor = (pct) => {
    if (pct >= 75) return { stroke: '#e11d48', bg: 'bg-rose-100 text-rose-800 border-rose-300' };
    if (pct >= 55) return { stroke: '#ea580c', bg: 'bg-orange-100 text-orange-800 border-orange-300' };
    if (pct >= 35) return { stroke: '#d97706', bg: 'bg-amber-100 text-amber-900 border-amber-300' };
    return { stroke: '#059669', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
  };

  const theme = getColor(riskPercent);

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="relative w-44 h-44 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 180 180">
          {/* Track Circle */}
          <circle
            cx="90"
            cy="90"
            r={radius}
            className="stroke-stone-200"
            strokeWidth="14"
            fill="transparent"
          />
          {/* Animated Gauge Ring */}
          <motion.circle
            cx="90"
            cy="90"
            r={radius}
            stroke={theme.stroke}
            strokeWidth="14"
            strokeLinecap="round"
            fill="transparent"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          />
        </svg>

        {/* Center Percentage Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <motion.span
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-4xl font-black text-white tracking-tighter"
          >
            {riskPercent}%
          </motion.span>
          <span className={`text-[10px] px-2 py-0.5 mt-1 rounded-full border font-bold uppercase ${theme.bg}`}>
            {riskLevel} Risk
          </span>
        </div>
      </div>

      {/* Disease Risk Breakdown Bars */}
      {Object.keys(diseaseBreakdown).length > 0 && (
        <div className="w-full mt-6 space-y-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Disease Risk Breakdown</p>
          {Object.entries(diseaseBreakdown).map(([disease, val]) => (
            <div key={disease} className="space-y-1">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-slate-300">{disease}</span>
                <span className="text-white font-bold">{val}%</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${val}%` }}
                  transition={{ duration: 1, delay: 0.2 }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: getColor(val).stroke }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
