import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import Visits from './pages/Visits';
import Pharmacy from './pages/Pharmacy';
import Laboratory from './pages/Laboratory';
import Billing from './pages/Billing';
import Admin from './pages/Admin';
import Staff from './pages/Staff';
import Attendance from './pages/Attendance';
import Layout from './components/Layout';
import { UserRole } from './types';

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: UserRole[] }) {
  const { user, profile, loading } = useAuth();

  if (loading) return (
    <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Verifying Registry...</p>
      </div>
    </div>
  );
  
  if (!user) return <Navigate to="/login" />;

  // If we have allowedRoles but NO profile, we must redirect to home (unless already there or at admin)
  // This prevents pages from trying to fetch data without a profile doc.
  const isSetupPath = window.location.pathname === '/' || window.location.pathname === '/admin';
  if (!profile && !isSetupPath) {
    return <Navigate to="/" />;
  }

  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="patients" element={<Patients />} />
            <Route path="visits" element={<Visits />} />
            
            <Route path="pharmacy" element={
              <ProtectedRoute allowedRoles={[UserRole.PHARMACIST, UserRole.ADMIN]}>
                <Pharmacy />
              </ProtectedRoute>
            } />
            
            <Route path="laboratory" element={
              <ProtectedRoute allowedRoles={[UserRole.DOCTOR, UserRole.NURSE, UserRole.ADMIN]}>
                <Laboratory />
              </ProtectedRoute>
            } />
            
            <Route path="billing" element={
              <ProtectedRoute allowedRoles={[UserRole.ACCOUNTANT, UserRole.ADMIN]}>
                <Billing />
              </ProtectedRoute>
            } />

            <Route path="staff" element={
              <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
                <Staff />
              </ProtectedRoute>
            } />

            <Route path="attendance" element={<Attendance />} />
            
            <Route path="admin" element={
              <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
                <Admin />
              </ProtectedRoute>
            } />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
