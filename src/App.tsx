/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './lib/auth';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AdminLayout } from './components/layout/AdminLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { RoomsPage } from './pages/RoomsPage';
import { BookingsPage } from './pages/BookingsPage';
import { RatingsPage } from './pages/RatingsPage';
import { MessagesPage } from './pages/MessagesPage';
import { ReportsPage } from './pages/ReportsPage';
import { ServicesPage } from './pages/ServicesPage';
import { AutomationPage } from './pages/AutomationPage';
import { Toaster } from './components/ui/sonner';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          
          <Route path="/" element={
            <ProtectedRoute>
              <AdminLayout>
                <DashboardPage />
              </AdminLayout>
            </ProtectedRoute>
          } />

          <Route path="/rooms" element={
            <ProtectedRoute>
              <AdminLayout>
                <RoomsPage />
              </AdminLayout>
            </ProtectedRoute>
          } />

          <Route path="/bookings" element={
            <ProtectedRoute>
              <AdminLayout>
                <BookingsPage />
              </AdminLayout>
            </ProtectedRoute>
          } />

          <Route path="/ratings" element={
            <ProtectedRoute>
              <AdminLayout>
                <RatingsPage />
              </AdminLayout>
            </ProtectedRoute>
          } />

          <Route path="/messages" element={
            <ProtectedRoute>
              <AdminLayout>
                <MessagesPage />
              </AdminLayout>
            </ProtectedRoute>
          } />

          <Route path="/reports" element={
            <ProtectedRoute>
              <AdminLayout>
                <ReportsPage />
              </AdminLayout>
            </ProtectedRoute>
          } />

          <Route path="/services" element={
            <ProtectedRoute>
              <AdminLayout>
                <ServicesPage />
              </AdminLayout>
            </ProtectedRoute>
          } />

          <Route path="/automation" element={
            <ProtectedRoute>
              <AdminLayout>
                <AutomationPage />
              </AdminLayout>
            </ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster position="top-right" theme="dark" richColors />
      </Router>
    </AuthProvider>
  );
}
