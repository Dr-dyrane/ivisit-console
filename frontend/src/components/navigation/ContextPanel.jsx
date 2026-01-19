import React from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { usePageData } from '../../contexts/PageDataContext';
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
  SubscriptionsPanel
} from '../context';

export const ContextPanel = () => {
  const location = useLocation();
  const currentPath = location.pathname;
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
    useMockData
  } = usePageData();
  
  const { subscribers } = useSubscription();

  const emergencyStats = getEmergencyStats();

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
      '/subscriptions': { title: 'Subscriptions', subtitle: 'Email Management' }
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
        className="px-4 pt-4 pb-2 border-b border-border/20"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-black text-lg tracking-tight">{title}</h2>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Live indicator */}
            {!useMockData && (
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-2 h-2 geo-round bg-success"
              />
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  const renderPanelWithHeader = (panelContent) => (
    <div className="h-full flex flex-col bg-transparent backdrop-blur-XS border-border/20">
      {renderPanelHeader()}
      <div className="flex-1 overflow-y-auto">
        {panelContent}
      </div>
    </div>
  );

  // Render based on current path
  if (currentPath === '/' || currentPath === '') {
    return renderPanelWithHeader(
      <DashboardPanel 
        emergencyStats={emergencyStats}
        analyticsData={analyticsData}
        doctorsData={doctorsData}
        verificationData={verificationData}
        useMockData={useMockData}
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
    return renderPanelWithHeader(<UsersPanel />);
  } else if (currentPath.includes('/hospitals')) {
    return renderPanelWithHeader(<HospitalsPanel />);
  } else if (currentPath.includes('/ambulances')) {
    return renderPanelWithHeader(<AmbulancesPanel />);
  } else if (currentPath.includes('/map')) {
    return renderPanelWithHeader(<MapPanel emergencyStats={emergencyStats} />);
  } else if (currentPath.includes('/analytics')) {
    return renderPanelWithHeader(<AnalyticsPanel analyticsData={analyticsData} />);
  } else if (currentPath.includes('/doctors')) {
    return renderPanelWithHeader(<DoctorsPanel doctorsData={doctorsData} />);
  } else if (currentPath.includes('/visits')) {
    return renderPanelWithHeader(<VisitsPanel visitsData={visitsData} />);
  } else if (currentPath.includes('/verification')) {
    return renderPanelWithHeader(<VerificationPanel verificationData={verificationData} />);
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
      />
    );
  } else if (currentPath.includes('/subscriptions')) {
    return renderPanelWithHeader(<SubscriptionsPanel subscribers={subscribers} />);
  } else if (currentPath.includes('/settings')) {
    return renderPanelWithHeader(<SettingsPanel />);
  }

  // Default panel
  return (
    <div className="p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-12"
      >
        <Sparkles className="h-8 w-8 text-primary mx-auto mb-4" />
        <h3 className="font-black text-lg mb-2">Context Panel</h3>
        <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
          Navigate to a page to see relevant information and quick actions
        </p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex items-center justify-center gap-2"
        >
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium text-primary uppercase tracking-wider">Smart Context</span>
        </motion.div>
      </motion.div>
    </div>
  );
};
