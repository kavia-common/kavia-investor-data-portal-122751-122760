import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import ProtectedRoute from './components/common/ProtectedRoute';
import InvestorDashboard from './pages/InvestorDashboard';
import FounderDashboard from './pages/FounderDashboard';
import AdminPanel from './pages/AdminPanel';
import Documents from './pages/Documents';
import DocumentViewer from './pages/DocumentViewer';
import AuthCallback from './pages/auth/Callback';
import AuthError from './pages/auth/Error';
import Home from './pages/Home.jsx';

/**
 * PUBLIC_INTERFACE
 * AppRoutes configures the base client-side routes for the application.
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route
        path="/dashboard/investor"
        element={
          <ProtectedRoute requiredRoles={['investor', 'admin']}>
            <InvestorDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/founder"
        element={
          <ProtectedRoute requiredRoles={['founder', 'admin']}>
            <FounderDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/documents"
        element={
          <ProtectedRoute requiredRoles={['investor', 'founder', 'admin']}>
            <Documents />
          </ProtectedRoute>
        }
      />
      <Route
        path="/documents/:id"
        element={
          <ProtectedRoute requiredRoles={['investor', 'founder', 'admin']}>
            <DocumentViewer />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute requiredRoles={['admin']}>
            <AdminPanel />
          </ProtectedRoute>
        }
      />
      <Route path="/login" element={<Login />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/auth/error" element={<AuthError />} />
      {/* Add fallbacks or 404 as needed */}
    </Routes>
  );
}
