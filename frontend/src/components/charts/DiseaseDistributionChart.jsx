import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

export const DiseaseDistributionChart = ({ data = [] }) => {
  const chartData = data.length > 0 ? data : [
    { name: 'Diabetes', value: 184, color: '#06b6d4' },
    { name: 'Hypertension', value: 210, color: '#10b981' },
    { name: 'Heart Disease', value: 75, color: '#f59e0b' },
    { name: 'Kidney Disease', value: 48, color: '#ef4444' },
  ];

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={4}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color || '#06b6d4'} stroke="#0f172a" strokeWidth={2} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#0f172a',
              borderColor: '#334155',
              borderRadius: '12px',
              color: '#f8fafc',
            }}
          />
          <Legend wrapperStyle={{ fontSize: '12px', color: '#cbd5e1' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
