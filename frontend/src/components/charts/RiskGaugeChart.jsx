import React from 'react';
import { motion } from 'framer-motion';

export const RiskGaugeChart = ({ riskPercent = 68, riskLevel = 'High', diseaseBreakdown = {} }) => {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (riskPercent / 100) * circumference;

  const getColor = (pct) => {
    if (pct >= 75) return { stroke: '#ef4444', bg: 'bg-rose-500/10 text-rose-400 border-rose-500/30' };
    if (pct >= 55) return { stroke: '#f59e0b', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30' };
    if (pct >= 35) return { stroke: '#eab308', bg: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' };
    return { stroke: '#10b981', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' };
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
            className="stroke-slate-800"
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
