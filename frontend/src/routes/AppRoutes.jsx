import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import { PublicLayout } from '../layouts/PublicLayout';
import { AuthLayout } from '../layouts/AuthLayout';
import { DashboardLayout } from '../layouts/DashboardLayout';

import { LandingPage } from '../pages/LandingPage';
import { Login } from '../pages/auth/Login';
import { Register } from '../pages/auth/Register';
import { ForgotPassword } from '../pages/auth/ForgotPassword';
import { ResetPassword } from '../pages/auth/ResetPassword';

import { PatientDashboard } from '../pages/patient/PatientDashboard';
import { DoctorDashboard } from '../pages/doctor/DoctorDashboard';
import { DoctorPatientDetail } from '../pages/doctor/DoctorPatientDetail';
import { FamilyDashboard } from '../pages/family/FamilyDashboard';
import { NurseDashboard } from '../pages/nurse/NurseDashboard';
import { CHODashboard } from '../pages/cho/CHODashboard';
import { AdminDashboard } from '../pages/admin/AdminDashboard';

import { ProtectedRoute } from './ProtectedRoute';
import { RoleRoute } from './RoleRoute';

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Landing Page */}
      <Route path="/" element={<LandingPage />} />

      {/* Auth Shell Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
      </Route>

      {/* Protected Role Dashboards */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          {/* Patient Routes */}
          <Route element={<RoleRoute allowedRoles={['Patient']} />}>
            <Route path="/patient/dashboard" element={<PatientDashboard />} />
            <Route path="/patient/medicines" element={<PatientDashboard />} />
            <Route path="/patient/reports" element={<PatientDashboard />} />
            <Route path="/patient/predictions" element={<PatientDashboard />} />
            <Route path="/patient/appointments" element={<PatientDashboard />} />
          </Route>

          {/* Doctor Routes */}
          <Route element={<RoleRoute allowedRoles={['Doctor', 'Nurse', 'CHO', 'Admin', 'Family']} />}>
            <Route path="/doctor/patient/:id" element={<DoctorPatientDetail />} />
          </Route>

          <Route element={<RoleRoute allowedRoles={['Doctor']} />}>
            <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
            <Route path="/doctor/patients" element={<DoctorDashboard />} />
            <Route path="/doctor/prescriptions" element={<DoctorDashboard />} />
            <Route path="/doctor/reports" element={<DoctorDashboard />} />
            <Route path="/doctor/appointments" element={<DoctorDashboard />} />
          </Route>

          {/* Family Routes */}
          <Route element={<RoleRoute allowedRoles={['Family']} />}>
            <Route path="/family/dashboard" element={<FamilyDashboard />} />
            <Route path="/family/patient" element={<FamilyDashboard />} />
            <Route path="/family/logs" element={<FamilyDashboard />} />
          </Route>

          {/* Nurse Routes */}
          <Route element={<RoleRoute allowedRoles={['Nurse']} />}>
            <Route path="/nurse/dashboard" element={<NurseDashboard />} />
            <Route path="/nurse/patients" element={<NurseDashboard />} />
            <Route path="/nurse/monitoring" element={<NurseDashboard />} />
          </Route>

          {/* CHO Routes */}
          <Route element={<RoleRoute allowedRoles={['CHO']} />}>
            <Route path="/cho/dashboard" element={<CHODashboard />} />
            <Route path="/cho/population" element={<CHODashboard />} />
            <Route path="/cho/diseases" element={<CHODashboard />} />
          </Route>

          {/* Admin Routes */}
          <Route element={<RoleRoute allowedRoles={['Admin']} />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<AdminDashboard />} />
            <Route path="/admin/settings" element={<AdminDashboard />} />
          </Route>
        </Route>
      </Route>

      {/* Fallback Catch-all Route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
