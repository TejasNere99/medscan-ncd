import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

const DISEASE_COLOR_MAP = {
  'Diabetes': '#06b6d4',      // Cyan-500
  'Hypertension': '#10b981',  // Emerald-500
  'Heart Disease': '#f59e0b', // Amber-500
  'Kidney Disease': '#8b5cf6',// Violet-500
};

const PALETTE = ['#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#3b82f6'];

const DEFAULT_FALLBACK = [
  { name: 'Diabetes', value: 184, count: 184, percentage: 36, color: '#06b6d4' },
  { name: 'Hypertension', value: 210, count: 210, percentage: 41, color: '#10b981' },
  { name: 'Heart Disease', value: 75, count: 75, percentage: 15, color: '#f59e0b' },
  { name: 'Kidney Disease', value: 48, count: 48, percentage: 9, color: '#8b5cf6' },
];

export const DiseaseDistributionChart = ({ data = [] }) => {
  // Normalize incoming data to ensure numeric 'value' and distinct 'color' are ALWAYS present
  const source = Array.isArray(data) && data.length > 0 ? data : DEFAULT_FALLBACK;

  const normalized = source.map((item, index) => {
    const rawVal = item.value !== undefined ? item.value : (item.count !== undefined ? item.count : (item.cases !== undefined ? item.cases : 0));
    const numVal = Math.max(0, Number(rawVal) || 0);
    const assignedColor = item.color || DISEASE_COLOR_MAP[item.name] || PALETTE[index % PALETTE.length];
    return {
      name: item.name || `Condition ${index + 1}`,
      value: numVal,
      count: numVal,
      percentage: item.percentage,
      color: assignedColor,
    };
  });

  const totalCases = normalized.reduce((acc, curr) => acc + curr.value, 0);
  const chartData = totalCases > 0 ? normalized : DEFAULT_FALLBACK;
  const displayTotal = totalCases > 0 ? totalCases : DEFAULT_FALLBACK.reduce((a, c) => a + c.value, 0);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      const pct = item.percentage ?? Math.round((item.value / displayTotal) * 100);
      return (
        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 px-3.5 py-2.5 rounded-xl shadow-2xl">
          <div className="flex items-center space-x-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: item.color }} />
            <span className="font-bold text-white text-xs">{item.name}</span>
          </div>
          <div className="flex items-baseline space-x-2 text-xs">
            <span className="text-slate-400">Prevalence:</span>
            <span className="font-black text-white">{item.value.toLocaleString()} cases</span>
            <span className="text-amber-400 font-semibold">({pct}%)</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-72 relative">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="46%"
            innerRadius={62}
            outerRadius={92}
            paddingAngle={4}
            dataKey="value"
            isAnimationActive={true}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color}
                stroke="#0f172a"
                strokeWidth={2.5}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value, entry) => {
              const item = chartData.find((d) => d.name === value);
              return (
                <span className="text-xs font-semibold text-slate-300 ml-1">
                  {value} {item ? `(${item.value})` : ''}
                </span>
              );
            }}
          />
          {/* Donut Center Display */}
          <text
            x="50%"
            y="43%"
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-white font-black text-2xl tracking-tight"
          >
            {displayTotal.toLocaleString()}
          </text>
          <text
            x="50%"
            y="53%"
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-slate-400 font-bold text-[10px] tracking-wider uppercase"
          >
            Total Cases
          </text>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
