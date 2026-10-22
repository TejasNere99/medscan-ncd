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
  if (!data.length) return <p className="rounded-md bg-stone-50 px-4 py-8 text-center text-xs text-stone-500">Adherence data is not available for this patient.</p>;
  const chartData = data;

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          onClick={(entry) => onBarClick && entry && onBarClick(entry.activePayload?.[0]?.payload)}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
          <XAxis dataKey="day" stroke="#a8a29e" tick={{ fill: '#78716c', fontSize: 12 }} />
          <YAxis stroke="#a8a29e" tick={{ fill: '#78716c', fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              borderColor: '#e7e5e4',
              borderRadius: '8px',
              color: '#292524',
              boxShadow: '0 8px 24px rgba(41, 37, 36, .08)',
            }}
          />
          <Legend wrapperStyle={{ fontSize: '12px', color: '#57534e' }} />
          <Bar dataKey="taken" name="Taken doses" fill="#7c3aed" radius={[4, 4, 0, 0]} cursor="pointer" />
          <Bar dataKey="missed" name="Missed doses" fill="#a8a29e" radius={[4, 4, 0, 0]} cursor="pointer" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
