import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';

export const AdherenceChart = ({ data = [], onBarClick }) => {
  const chartData = data.length > 0 ? data : [
    { day: 'Mon', taken: 4, missed: 0 },
    { day: 'Tue', taken: 3, missed: 1 },
    { day: 'Wed', taken: 4, missed: 0 },
    { day: 'Thu', taken: 4, missed: 0 },
    { day: 'Fri', taken: 3, missed: 1 },
    { day: 'Sat', taken: 4, missed: 0 },
    { day: 'Sun', taken: 4, missed: 0 },
  ];

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          onClick={(entry) => onBarClick && entry && onBarClick(entry.activePayload?.[0]?.payload)}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="day" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
          <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#0f172a',
              borderColor: '#334155',
              borderRadius: '12px',
              color: '#f8fafc',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
            }}
          />
          <Legend wrapperStyle={{ fontSize: '12px', color: '#cbd5e1' }} />
          <Bar dataKey="taken" name="Taken Doses" fill="#06b6d4" radius={[6, 6, 0, 0]} cursor="pointer" />
          <Bar dataKey="missed" name="Missed Doses" fill="#ef4444" radius={[6, 6, 0, 0]} cursor="pointer" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
