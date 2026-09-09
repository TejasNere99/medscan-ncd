import React from 'react';
import { Outlet } from 'react-router-dom';

export const PublicLayout = () => {
  return (
    <div className="min-h-screen bg-[#0b1329]">
      <Outlet />
    </div>
  );
};
