import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export const TrendChart = ({ data = [] }) => {
  const chartData = data.length > 0 ? data : [
    { date: 'Jan 10', risk: 45, sugar: 120, sysBP: 130 },
    { date: 'Jan 20', risk: 52, sugar: 135, sysBP: 138 },
    { date: 'Feb 01', risk: 60, sugar: 142, sysBP: 140 },
    { date: 'Feb 12', risk: 68, sugar: 148, sysBP: 142 },
  ];

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="date" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
          <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#0f172a',
              borderColor: '#334155',
              borderRadius: '12px',
              color: '#f8fafc',
            }}
          />
          <Line type="monotone" dataKey="risk" name="Overall Risk %" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} />
          <Line type="monotone" dataKey="sugar" name="Glucose (mg/dL)" stroke="#06b6d4" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
