import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { Header } from './components/Header';
import { Layout } from './components/Layout';

// Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { RequestsPage } from './pages/RequestsPage';
import { CreateRequestPage } from './pages/CreateRequestPage';
import { RequestDetailPage } from './pages/RequestDetailPage';
import { AllocationPage } from './pages/AllocationPage';
import { EmergencyPage } from './pages/EmergencyPage';
import { LedgerPage } from './pages/LedgerPage';
import { AuditPage } from './pages/AuditPage';
import { HospitalsPage } from './pages/HospitalsPage';
import { UsersPage } from './pages/UsersPage';
function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function App() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bio-dark-bg">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bio-dark-bg">
      {user && <Header />}
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={
          <PublicRoute>
            <LandingPage />
          </PublicRoute>
        } />
        <Route path="/login" element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        } />
        <Route path="/register" element={
          <PublicRoute>
            <RegisterPage />
          </PublicRoute>
        } />

        {/* Protected Routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Layout>
              <DashboardPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/requests" element={
          <ProtectedRoute>
            <Layout>
              <RequestsPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/requests/create" element={
          <ProtectedRoute allowedRoles={['DOCTOR', 'ADMIN']}>
            <Layout>
              <CreateRequestPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/requests/:id" element={
          <ProtectedRoute>
            <Layout>
              <RequestDetailPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/allocation" element={
          <ProtectedRoute allowedRoles={['ADMIN', 'AUDITOR']}>
            <Layout>
              <AllocationPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/emergency" element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <Layout>
              <EmergencyPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/ledger" element={
          <ProtectedRoute allowedRoles={['ADMIN', 'AUDITOR', 'HOSPITAL']}>
            <Layout>
              <LedgerPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/audit" element={
          <ProtectedRoute allowedRoles={['ADMIN', 'AUDITOR']}>
            <Layout>
              <AuditPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/hospitals" element={
          <ProtectedRoute allowedRoles={['ADMIN', 'AUDITOR']}>
            <Layout>
              <HospitalsPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/users" element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <Layout>
              <UsersPage />
            </Layout>
          </ProtectedRoute>
        } />
        

        {/* Donor Route */}
        <Route path="/donor" element={
          <ProtectedRoute allowedRoles={['DONOR', 'ADMIN']}>
            <Layout>
              <DashboardPage />
            </Layout>
          </ProtectedRoute>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;