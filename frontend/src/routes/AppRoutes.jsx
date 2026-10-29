import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import { PublicLayout } from '../layouts/PublicLayout';
import { AuthLayout } from '../layouts/AuthLayout';
import { DashboardLayout } from '../layouts/DashboardLayout';

import { LandingPage } from '../pages/LandingPage';
import { Login } from '../pages/auth/Login';
import { Register } from '../pages/auth/Register';
import { ForgotPassword } from '../pages/auth/ForgotPassword';
import { ResetPassword } from '../pages/auth/ResetPassword';
import { VerifyEmail } from '../pages/auth/VerifyEmail';

const PatientDashboard = lazy(() => import('../pages/patient/PatientDashboard').then((module) => ({ default: module.PatientDashboard })));
const PatientMedicinesPage = lazy(() => import('../pages/patient/PatientMedicinesPage').then((module) => ({ default: module.PatientMedicinesPage })));
const PatientAppointmentsPage = lazy(() => import('../pages/patient/PatientAppointmentsPage').then((module) => ({ default: module.PatientAppointmentsPage })));
const DoctorDashboard = lazy(() => import('../pages/doctor/DoctorDashboard').then((module) => ({ default: module.DoctorDashboard })));
const DoctorPatientDetail = lazy(() => import('../pages/doctor/DoctorPatientDetail').then((module) => ({ default: module.DoctorPatientDetail })));
const CHODashboard = lazy(() => import('../pages/cho/CHODashboard').then((module) => ({ default: module.CHODashboard })));
const CHOPatientProfile = lazy(() => import('../pages/cho/CHOPatientProfile').then((module) => ({ default: module.CHOPatientProfile })));
const AdminDashboard = lazy(() => import('../pages/admin/AdminDashboard').then((module) => ({ default: module.AdminDashboard })));
const SecurityLabPage = lazy(() => import('../pages/admin/SecurityLabPage').then((module) => ({ default: module.SecurityLabPage })));

import { ProtectedRoute } from './ProtectedRoute';
import { RoleRoute } from './RoleRoute';

export const AppRoutes = () => {
  return (
    <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center text-sm text-stone-500" aria-live="polite">Opening your workspace…</div>}>
    <Routes>
      {/* Public Landing Page */}
      <Route path="/" element={<LandingPage />} />

      {/* Auth Shell Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/verify-email/:token" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
      </Route>

      {/* Protected Role Dashboards */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          {/* Patient Routes */}
          <Route element={<RoleRoute allowedRoles={['Patient']} />}>
            <Route path="/patient/dashboard" element={<PatientDashboard />} />
            <Route path="/patient/medicines" element={<PatientMedicinesPage />} />
            <Route path="/patient/reports" element={<PatientDashboard />} />
            <Route path="/patient/predictions" element={<PatientDashboard />} />
            <Route path="/patient/appointments" element={<PatientAppointmentsPage />} />
          </Route>

          {/* Doctor Routes */}
          <Route element={<RoleRoute allowedRoles={['Doctor', 'CHO', 'Admin']} />}>
            <Route path="/doctor/patient/:id" element={<DoctorPatientDetail />} />
          </Route>

          <Route element={<RoleRoute allowedRoles={['Doctor']} />}>
            <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
            <Route path="/doctor/patients" element={<DoctorDashboard />} />
            <Route path="/doctor/prescriptions" element={<DoctorDashboard />} />
            <Route path="/doctor/reports" element={<DoctorDashboard />} />
            <Route path="/doctor/appointments" element={<DoctorDashboard />} />
          </Route>

          {/* CHO Routes */}
          <Route element={<RoleRoute allowedRoles={['CHO']} />}>
            <Route path="/cho/dashboard" element={<CHODashboard />} />
            <Route path="/cho/population" element={<CHODashboard />} />
            <Route path="/cho/diseases" element={<CHODashboard />} />
            <Route path="/cho/follow-ups" element={<CHODashboard />} />
            <Route path="/cho/referrals" element={<CHODashboard />} />
            <Route path="/cho/patient/:id" element={<CHOPatientProfile />} />
          </Route>

          {/* Admin Routes */}
          <Route element={<RoleRoute allowedRoles={['Admin']} />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<AdminDashboard />} />
            <Route path="/admin/settings" element={<AdminDashboard />} />
            <Route path="/admin/security-lab" element={<SecurityLabPage />} />
          </Route>
        </Route>
      </Route>

      {/* Fallback Catch-all Route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  );
};
