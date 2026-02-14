import React from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, X, Shield, Lock } from 'lucide-react';
import { usePageData } from '../../contexts/PageDataContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSubscription } from '../../hooks/useSubscription';
import {
  EmergencyPanel,
  UsersPanel,
  HospitalsPanel,
  AmbulancesPanel,
  MapPanel,
  AnalyticsPanel,
  DoctorsPanel,
  VisitsPanel,
  VerificationPanel,
  HealthNewsPanel,
  SupportTicketsPanel,
  InsurancePanel,
  SettingsPanel,
  DashboardPanel,
  SubscriptionsPanel,
  WalletPanel
} from '../context';

export const ContextPanel = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  const { isAdmin, isOrgAdmin, isProvider, isPatient, isViewer, isSponsor } = useAuth();
  const {
    emergencyData,
    analyticsData,
    doctorsData,
    visitsData,
    verificationData,
    supportTicketsData,
    loading,
    getEmergencyStats,
    getInsuranceStats,
    useMockData,
    activityData,
    refreshAllData,
    userData,
    filters,
    insurance,
    hospitalsData,
    ambulancesData,
    walletData
  } = usePageData();

  const { subscribers } = useSubscription();

  const emergencyStats = getEmergencyStats();

  // Role-based access control for context panels
  const canAccessPanel = (panelPath) => {
    // Define role access rules for each panel
    const panelAccess = {
      '/': true, // Dashboard - everyone can access
      '/emergencies': !isPatient() && !isViewer(), // Operational roles only
      '/users': isAdmin(), // Admin only
      '/verification': isAdmin(), // Admin only
      '/analytics': isAdmin() || isOrgAdmin() || isSponsor() || isProvider(), // Everyone except patients/viewers
      '/doctors': isAdmin() || isOrgAdmin(), // Management only
      '/visits': isProvider() || isAdmin() || isOrgAdmin(), // Providers and management
      '/hospitals': isAdmin() || isOrgAdmin(), // Management only
      '/ambulances': isAdmin() || isOrgAdmin(), // Management only
      '/health-news': !isPatient(), // Everyone except patients
      '/support-tickets': isAdmin() || isOrgAdmin() || isSponsor() || isProvider(), // Everyone except patients/viewers
      '/insurance': isAdmin(), // Admin only
      '/map': !isPatient() && !isViewer(), // Operational roles only
      '/settings': isAdmin(), // Admin only
      '/subscriptions': isAdmin(), // Admin only
      '/wallet': isAdmin() || isOrgAdmin(), // Admin and Org Admin
      '/pricing': isAdmin() || isOrgAdmin(), // Admin and Org Admin
    };

    // Check if current path starts with any protected path
    for (const [path, allowed] of Object.entries(panelAccess)) {
      if (currentPath === path || currentPath.startsWith(path + '/')) {
        return allowed;
      }
    }

    return true; // Default to allowed for unknown paths
  };

  const renderAccessDenied = () => (
    <div className="p-2 md:p-6 scrollbar-hide">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className="text-center py-12"
      >
        <div className="w-16 h-16 bg-destructive/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Lock className="h-8 w-8 text-destructive" />
        </div>
        <h3 className="font-bold text-xl mb-2 text-foreground">Access Restricted</h3>
        <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
          You don't have permission to view this context panel
        </p>
        <div className="text-xs text-muted-foreground font-medium">
          Contact your administrator if you need access to this feature
        </div>
      </motion.div>
    </div>
  );

  const getPageContextHeader = () => {
    const headers = {
      '/': { title: 'System Overview', subtitle: 'Live Dashboard' },
      '/emergencies': { title: 'Emergency Context', subtitle: 'Response Operations' },
      '/users': { title: 'User Management', subtitle: 'Access Control' },
      '/verification': { title: 'Verification Queue', subtitle: 'Identity Verification' },
      '/analytics': { title: 'Analytics', subtitle: 'Performance Metrics' },
      '/doctors': { title: 'Doctor Operations', subtitle: 'Medical Staff' },
      '/visits': { title: 'Visit Management', subtitle: 'Patient Appointments' },
      '/hospitals': { title: 'Hospital Ops', subtitle: 'Facility Management' },
      '/ambulances': { title: 'Fleet Control', subtitle: 'Ambulance Operations' },
      '/health-news': { title: 'Health News', subtitle: 'Content Management' },
      '/support-tickets': { title: 'Support', subtitle: 'Ticket Management' },
      '/insurance': { title: 'Insurance', subtitle: 'Policy Management' },
      '/map': { title: 'Map Intelligence', subtitle: 'Location Services' },
      '/settings': { title: 'System Settings', subtitle: 'Configuration' },
      '/subscriptions': { title: 'Subscriptions', subtitle: 'Email Management' },
      '/wallet': { title: 'Wallet & Billing', subtitle: 'Financial Operations' },
      '/pricing': { title: 'Pricing Engine', subtitle: 'Service Costs' }
    };

    const currentHeader = Object.keys(headers).find(key =>
      currentPath === key || currentPath.startsWith(key + '/')
    ) || { title: 'Context Panel', subtitle: 'Smart Context' };

    return currentHeader;
  };

  const renderPanelHeader = () => {
    const { title, subtitle } = getPageContextHeader();

    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className="relative"
      >
        {/* Subtle service bar */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/20 via-success/20 to-primary/20" />

        <div className="px-6 pt-4 pb-3 md:px-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-lg tracking-tight text-foreground">{title}</h2>
              <p className="text-xs text-muted-foreground font-normal uppercase tracking-wider">{subtitle}</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Live indicator */}
              {!useMockData && (
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-2 h-2 bg-success rounded-full"
                />
              )}
              {/* Close button - Hidden on mobile */}
              <button
                onClick={() => {
                  // Close context panel
                  const event = new CustomEvent('closeContextPanel');
                  window.dispatchEvent(event);
                }}
                className="hidden md:block w-8 h-8 rounded-xl bg-muted/20 hover:bg-muted/30 transition-all duration-300 flex items-center justify-center group"
              >
                <X className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderPanelWithHeader = (panelContent) => (
    <div className="h-full flex flex-col rounded-3xl">
      {/* Header - Hidden on mobile */}
      <div className="hidden md:block">
        {renderPanelHeader()}
      </div>
      <div className="flex-1 overflow-y-auto px-6 pb-6 md:px-6 md:pb-6">
        {panelContent}
      </div>
    </div>
  );

  // Render based on current path with RBAC check
  if (!canAccessPanel(currentPath)) {
    return renderAccessDenied();
  }

  if (currentPath === '/' || currentPath === '') {
    return renderPanelWithHeader(
      <DashboardPanel
        emergencyStats={emergencyStats}
        analyticsData={analyticsData}
        doctorsData={doctorsData}
        verificationData={verificationData}
        activityData={activityData}
        refreshAllData={refreshAllData}
      />
    );
  } else if (currentPath.includes('/emergencies')) {
    return renderPanelWithHeader(
      <EmergencyPanel
        emergencyData={emergencyData}
        emergencyStats={emergencyStats}
        useMockData={useMockData}
      />
    );
  } else if (currentPath.includes('/users')) {
    return renderPanelWithHeader(<UsersPanel
      users={userData?.users || []}
      statistics={userData?.statistics}
      filters={filters}
      onViewUser={(user) => {
        // Navigate to user detail or open modal
        console.log('View user:', user);
      }}
      onCreateUser={() => {
        // Trigger create user modal
        window.dispatchEvent(new CustomEvent('openUserModal'));
      }}
      onInviteUser={() => {
        // Trigger invite user modal
        window.dispatchEvent(new CustomEvent('openInviteUserModal'));
      }}
      onViewAnalytics={() => {
        // Open analytics modal
        window.dispatchEvent(new CustomEvent('openUserAnalytics', {
          detail: {
            users: userData?.users || [],
            statistics: userData?.statistics
          }
        }));
      }}
    />);
  } else if (currentPath.includes('/hospitals')) {
    return renderPanelWithHeader(<HospitalsPanel hospitalsData={hospitalsData} />);
  } else if (currentPath.includes('/ambulances')) {
    return renderPanelWithHeader(<AmbulancesPanel ambulancesData={ambulancesData} />);
  } else if (currentPath.includes('/map')) {
    return renderPanelWithHeader(
      <MapPanel emergencyStats={emergencyStats} />
    );
  } else if (currentPath.includes('/analytics')) {
    return renderPanelWithHeader(<AnalyticsPanel analyticsData={analyticsData} />);
  } else if (currentPath.includes('/doctors')) {
    return renderPanelWithHeader(<DoctorsPanel doctorsData={doctorsData} />);
  } else if (currentPath.includes('/visits')) {
    return renderPanelWithHeader(<VisitsPanel visitsData={visitsData} />);
  } else if (currentPath.includes('/verification')) {
    return renderPanelWithHeader(<VerificationPanel verificationData={verificationData} loading={loading} />);
  } else if (currentPath.includes('/health-news')) {
    return renderPanelWithHeader(<HealthNewsPanel />);
  } else if (currentPath.includes('/support-tickets')) {
    return renderPanelWithHeader(
      <SupportTicketsPanel
        supportTicketsData={supportTicketsData}
        loading={loading}
        useMockData={useMockData}
      />
    );
  } else if (currentPath.includes('/insurance')) {
    return renderPanelWithHeader(
      <InsurancePanel
        loading={loading}
        getInsuranceStats={getInsuranceStats}
        insuranceData={insurance}
      />
    );
  } else if (currentPath.includes('/subscriptions')) {
    return renderPanelWithHeader(<SubscriptionsPanel subscribers={subscribers} />);
  } else if (currentPath.includes('/settings')) {
    return renderPanelWithHeader(<SettingsPanel />);
  } else if (currentPath.includes('/wallet') || currentPath.includes('/pricing')) {
    return renderPanelWithHeader(<WalletPanel walletData={walletData} />);
  }

  // Default panel
  return (
    <div className="p-2 md:p-6 scrollbar-hide">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className="text-center py-12"
      >
        <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <h3 className="font-bold text-xl mb-2 text-foreground">Context Panel</h3>
        <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
          Navigate to a page to see relevant information and quick actions
        </p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, ease: [0.4, 0, 0.2, 1] }}
          className="flex items-center justify-center gap-2"
        >
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-xs font-normal text-primary uppercase tracking-wider">Smart Context</span>
        </motion.div>
      </motion.div>
    </div>
  );
};
