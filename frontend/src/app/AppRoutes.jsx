import React from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { ProtectedRoute, UnauthorizedPage } from '../components/common/ProtectedRoute';
import { AuthProvider } from '../contexts/AuthContext';
import { AppLayout } from './AppLayout';
import { APP_ROUTE_METADATA } from './appRouteMetadata';
import { RouteLoadingState } from './RouteLoadingState';

const lazyNamedPage = (load, exportName) => React.lazy(
  () => load().then((module) => ({ default: module[exportName] })),
);

const ROUTE_COMPONENTS = Object.freeze({
  login: lazyNamedPage(() => import('../components/pages/LoginPage'), 'LoginPage'),
  setPassword: lazyNamedPage(() => import('../components/pages/SetPasswordPage'), 'SetPasswordPage'),
  onboarding: lazyNamedPage(() => import('../components/pages/OnboardingPage'), 'OnboardingPage'),
  onboardingSuccess: lazyNamedPage(() => import('../components/pages/OnboardingSuccessPage'), 'OnboardingSuccessPage'),
  unauthorized: UnauthorizedPage,
  home: lazyNamedPage(() => import('../components/pages/BentoHome'), 'BentoHome'),
  map: lazyNamedPage(() => import('../components/pages/GodModeMap'), 'GodModeMap'),
  analytics: lazyNamedPage(() => import('../components/pages/Analytics'), 'Analytics'),
  hospitals: lazyNamedPage(() => import('../components/pages/HospitalsPage'), 'HospitalsPage'),
  ambulances: lazyNamedPage(() => import('../components/pages/AmbulancesPage'), 'AmbulancesPage'),
  doctors: lazyNamedPage(() => import('../components/pages/DoctorsPage'), 'DoctorsPage'),
  visits: lazyNamedPage(() => import('../components/pages/VisitsPage'), 'VisitsPage'),
  emergencies: lazyNamedPage(() => import('../components/pages/EmergencyRequestsPage'), 'EmergencyRequestsPage'),
  verification: lazyNamedPage(() => import('../components/pages/VerificationQueue'), 'VerificationQueue'),
  users: lazyNamedPage(() => import('../components/pages/UsersPage'), 'UsersPage'),
  organizations: lazyNamedPage(() => import('../components/pages/OrganizationsPage'), 'OrganizationsPage'),
  settings: lazyNamedPage(() => import('../components/pages/SettingsPage'), 'SettingsPage'),
  healthNews: lazyNamedPage(() => import('../components/pages/HealthNewsManagementPage'), 'HealthNewsManagementPage'),
  supportTickets: lazyNamedPage(() => import('../components/pages/SupportTicketsPage'), 'SupportTicketsPage'),
  insurance: lazyNamedPage(() => import('../components/pages/InsuranceManagementPage'), 'InsuranceManagementPage'),
  subscriptions: lazyNamedPage(() => import('../components/pages/SubscriptionManagementPage'), 'SubscriptionManagementPage'),
  wallet: lazyNamedPage(() => import('../components/pages/WalletManagementPage'), 'WalletManagementPage'),
  pricing: lazyNamedPage(() => import('../components/pages/PricingManagementPage'), 'PricingManagementPage'),
  notFound: lazyNamedPage(() => import('../components/pages/NotFoundPage'), 'NotFoundPage'),
});

const createRouteElement = ({ id, public: isPublic, minRole, additionalRoles }) => {
  const Component = ROUTE_COMPONENTS[id];
  const page = <Component />;

  if (isPublic) return page;
  if (minRole || additionalRoles) {
    return (
      <ProtectedRoute minRole={minRole || 'viewer'} additionalRoles={additionalRoles}>
        {page}
      </ProtectedRoute>
    );
  }
  return <ProtectedRoute>{page}</ProtectedRoute>;
};

export function AppRoutes() {
  const location = useLocation();

  return (
    <AuthProvider pathname={location.pathname}>
      <AppLayout>
        <React.Suspense fallback={<RouteLoadingState />}>
          <Routes>
            {APP_ROUTE_METADATA.map((route) => (
              <Route
                key={route.id}
                path={route.path}
                element={createRouteElement(route)}
              />
            ))}
          </Routes>
        </React.Suspense>
      </AppLayout>
    </AuthProvider>
  );
}
