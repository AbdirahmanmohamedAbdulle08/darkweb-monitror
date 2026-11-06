import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { LandingPage } from './pages/LandingPage.tsx';
import { AuthPage } from './pages/AuthPage.tsx';
import { ScanResultsPage } from './pages/ScanResultsPage.tsx';
import { OverviewPage } from './pages/dashboard/OverviewPage.tsx';
import { NewScanPage } from './pages/dashboard/NewScanPage.tsx';
import { MyScansPage } from './pages/dashboard/MyScansPage.tsx';
import { FindingsPage } from './pages/dashboard/FindingsPage.tsx';
import { WatchlistsPage } from './pages/dashboard/WatchlistsPage.tsx';
import { ReportsPage } from './pages/dashboard/ReportsPage.tsx';
import { PaymentsPage } from './pages/dashboard/PaymentsPage.tsx';
import { NotificationsPage } from './pages/dashboard/NotificationsPage.tsx';
import { SettingsPage } from './pages/dashboard/SettingsPage.tsx';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage.tsx';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-[#080D18] flex items-center justify-center text-xs text-[#94A3B8]">
        Authenticating session...
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/auth?mode=login" replace />;
  }
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-[#080D18] flex items-center justify-center text-xs text-[#94A3B8]">
        Authenticating admin privileges...
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/auth?mode=login" replace />;
  }
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Landing & Scanner */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/scan/:id" element={<ScanResultsPage />} />

          {/* Customer Dashboard Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <OverviewPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/scan"
            element={
              <ProtectedRoute>
                <NewScanPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/scans"
            element={
              <ProtectedRoute>
                <MyScansPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/findings"
            element={
              <ProtectedRoute>
                <FindingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/watchlists"
            element={
              <ProtectedRoute>
                <WatchlistsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/reports"
            element={
              <ProtectedRoute>
                <ReportsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/payments"
            element={
              <ProtectedRoute>
                <PaymentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/notifications"
            element={
              <ProtectedRoute>
                <NotificationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />

          {/* Super Admin Console */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminDashboardPage />
              </AdminRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
