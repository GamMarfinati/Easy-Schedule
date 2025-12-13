import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import PricingPage from './src/pages/PricingPage';
import BillingPage from './src/pages/BillingPage';
import LoginPage from './src/pages/LoginPage';
import PrivateRoute from './src/components/PrivateRoute';
import { useAuth } from './src/context/AuthContext';
import { setupInterceptors } from './src/services/api';

import AppLayout from './src/components/Layout/AppLayout';
import DashboardHome from './src/pages/DashboardHome';
import SettingsPage from './src/pages/SettingsPage';
import UsersPage from './src/pages/UsersPage';

import InvitePage from './src/pages/InvitePage';
import SchedulesPage from './src/pages/SchedulesPage';

const AppContent: React.FC = () => {
  const { getAccessToken } = useAuth();

  useEffect(() => {
    // Configure interceptor with Auth0 token getter
    setupInterceptors(async () => {
      const token = await getAccessToken();
      return token || '';
    });
  }, [getAccessToken]);

  return (
    <Routes>
      {/* Public Route: Landing Page */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/invite" element={<InvitePage />} />

      {/* Private Routes: App */}
      <Route
        path="/app"
        element={
          <PrivateRoute>
            <AppLayout>
              <DashboardHome />
            </AppLayout>
          </PrivateRoute>
        }
      />

      <Route
        path="/app/schedules"
        element={
          <PrivateRoute>
            <AppLayout>
              <SchedulesPage />
            </AppLayout>
          </PrivateRoute>
        }
      />
      
      <Route
        path="/app/billing"
        element={
          <PrivateRoute>
            <AppLayout>
              <BillingPage />
            </AppLayout>
          </PrivateRoute>
        }
      />

      <Route
        path="/app/settings"
        element={
          <PrivateRoute>
            <AppLayout>
              <SettingsPage />
            </AppLayout>
          </PrivateRoute>
        }
      />

      <Route
        path="/app/users"
        element={
          <PrivateRoute>
            <AppLayout>
              <UsersPage />
            </AppLayout>
          </PrivateRoute>
        }
      />

      {/* Legacy Dashboard Route (redirect or keep for now) */}
      {/* <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} /> */}

      {/* Catch all: Redirect to Home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default App;