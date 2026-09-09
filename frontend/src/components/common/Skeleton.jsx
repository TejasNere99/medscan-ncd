import React from 'react';

export const Skeleton = ({ className = 'h-12 w-full', count = 1 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className={`bg-slate-800/60 animate-pulse rounded-xl border border-slate-800 ${className}`}
        />
      ))}
    </>
  );
};
