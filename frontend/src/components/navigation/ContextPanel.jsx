import React from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, X, Lock } from 'lucide-react';
import { usePageData } from '../../contexts/PageDataContext';
import { useAuth } from '../../contexts/AuthContext';
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
  WalletPanel,
  OrganizationsPanel,
  PricingContextPanel
} from '../context';

export const ContextPanel = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  const { isAdmin, isOrgAdmin, isProvider, isPatient, isViewer, isSponsor } = useAuth();
  const {
    verificationData,
    loading,
    getEmergencyStats,
    useMockData,
  } = usePageData();

  const [todayRouteContext, setTodayRouteContext] = React.useState(null);
  const [usersRouteContext, setUsersRouteContext] = React.useState(null);
  const [doctorsRouteContext, setDoctorsRouteContext] = React.useState(null);
  const [visitsRouteContext, setVisitsRouteContext] = React.useState(null);
  const [hospitalsRouteContext, setHospitalsRouteContext] = React.useState(null);
  const [ambulancesRouteContext, setAmbulancesRouteContext] = React.useState(null);
  const [supportTicketsRouteContext, setSupportTicketsRouteContext] = React.useState(null);
  const [organizationsRouteContext, setOrganizationsRouteContext] = React.useState(null);
  const [subscriptionsRouteContext, setSubscriptionsRouteContext] = React.useState(null);
  const [walletRouteContext, setWalletRouteContext] = React.useState(null);
  const [healthNewsRouteContext, setHealthNewsRouteContext] = React.useState(null);
  const [insuranceRouteContext, setInsuranceRouteContext] = React.useState(null);
  const [verificationRouteContext, setVerificationRouteContext] = React.useState(null);

  const emergencyStats = getEmergencyStats();

  // Default filters for panels that require them
  const filters = {
    status: 'all',
    role: 'all',
    search: ''
  };

  // Role-based access control for context panels
  const canAccessPanel = (panelPath) => {
    // Define role access rules for each panel
    const panelAccess = {
      '/': true, // Today - everyone can access
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
      '/settings': true, // Own-user settings
      '/subscriptions': isAdmin(), // Admin only
      '/wallet': isAdmin() || isOrgAdmin(), // Admin and Org Admin
      '/pricing': isAdmin() || isOrgAdmin(), // Admin and Org Admin
      '/organizations': isAdmin(), // Admin only
    };

    // Check if current path starts with any protected path
    for (const [path, allowed] of Object.entries(panelAccess)) {
      if (currentPath === path || currentPath.startsWith(path + '/')) {
        return allowed;
      }
    }

    return true; // Default to allowed for unknown paths
  };

  const [emergencyRouteContext, setEmergencyRouteContext] = React.useState(null);

  React.useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (currentPath !== '/' && currentPath !== '') {
      setTodayRouteContext(null);
      return undefined;
    }

    const handleTodayRouteContext = (event) => {
      setTodayRouteContext(event.detail || null);
    };

    window.addEventListener('todayRouteContextUpdated', handleTodayRouteContext);
    window.dispatchEvent(new CustomEvent('requestTodayRouteContext'));

    return () => {
      window.removeEventListener('todayRouteContextUpdated', handleTodayRouteContext);
    };
  }, [currentPath]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (!currentPath.includes('/emergencies')) {
      setEmergencyRouteContext(null);
      return undefined;
    }

    const handleEmergencyRouteContext = (event) => {
      setEmergencyRouteContext(event.detail || null);
    };

    window.addEventListener('emergencyRouteContextUpdated', handleEmergencyRouteContext);
    window.dispatchEvent(new CustomEvent('requestEmergencyRouteContext'));

    return () => {
      window.removeEventListener('emergencyRouteContextUpdated', handleEmergencyRouteContext);
    };
  }, [currentPath]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (!currentPath.includes('/users')) {
      setUsersRouteContext(null);
      return undefined;
    }

    const handleUsersRouteContext = (event) => {
      setUsersRouteContext(event.detail || null);
    };

    window.addEventListener('usersRouteContextUpdated', handleUsersRouteContext);
    window.dispatchEvent(new CustomEvent('requestUsersRouteContext'));

    return () => {
      window.removeEventListener('usersRouteContextUpdated', handleUsersRouteContext);
    };
  }, [currentPath]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (!currentPath.includes('/doctors')) {
      setDoctorsRouteContext(null);
      return undefined;
    }

    const handleDoctorsRouteContext = (event) => {
      setDoctorsRouteContext(event.detail || null);
    };

    window.addEventListener('doctorsRouteContextUpdated', handleDoctorsRouteContext);
    window.dispatchEvent(new CustomEvent('requestDoctorsRouteContext'));

    return () => {
      window.removeEventListener('doctorsRouteContextUpdated', handleDoctorsRouteContext);
    };
  }, [currentPath]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (!currentPath.includes('/visits')) {
      setVisitsRouteContext(null);
      return undefined;
    }

    const handleVisitsRouteContext = (event) => {
      setVisitsRouteContext(event.detail || null);
    };

    window.addEventListener('visitsRouteContextUpdated', handleVisitsRouteContext);
    window.dispatchEvent(new CustomEvent('requestVisitsRouteContext'));

    return () => {
      window.removeEventListener('visitsRouteContextUpdated', handleVisitsRouteContext);
    };
  }, [currentPath]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (!currentPath.includes('/hospitals')) {
      setHospitalsRouteContext(null);
      return undefined;
    }

    const handleHospitalsRouteContext = (event) => {
      setHospitalsRouteContext(event.detail || null);
    };

    window.addEventListener('hospitalsRouteContextUpdated', handleHospitalsRouteContext);
    window.dispatchEvent(new CustomEvent('requestHospitalsRouteContext'));

    return () => {
      window.removeEventListener('hospitalsRouteContextUpdated', handleHospitalsRouteContext);
    };
  }, [currentPath]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (!currentPath.includes('/ambulances')) {
      setAmbulancesRouteContext(null);
      return undefined;
    }

    const handleAmbulancesRouteContext = (event) => {
      setAmbulancesRouteContext(event.detail || null);
    };

    window.addEventListener('ambulancesRouteContextUpdated', handleAmbulancesRouteContext);
    window.dispatchEvent(new CustomEvent('requestAmbulancesRouteContext'));

    return () => {
      window.removeEventListener('ambulancesRouteContextUpdated', handleAmbulancesRouteContext);
    };
  }, [currentPath]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (!currentPath.includes('/support-tickets')) {
      setSupportTicketsRouteContext(null);
      return undefined;
    }

    const handleSupportTicketsRouteContext = (event) => {
      setSupportTicketsRouteContext(event.detail || null);
    };

    window.addEventListener('supportTicketsRouteContextUpdated', handleSupportTicketsRouteContext);
    window.dispatchEvent(new CustomEvent('requestSupportTicketsRouteContext'));

    return () => {
      window.removeEventListener('supportTicketsRouteContextUpdated', handleSupportTicketsRouteContext);
    };
  }, [currentPath]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (!currentPath.includes('/organizations')) {
      setOrganizationsRouteContext(null);
      return undefined;
    }

    const handleOrganizationsRouteContext = (event) => {
      setOrganizationsRouteContext(event.detail || null);
    };

    window.addEventListener('organizationsRouteContextUpdated', handleOrganizationsRouteContext);
    window.dispatchEvent(new CustomEvent('requestOrganizationsRouteContext'));

    return () => {
      window.removeEventListener('organizationsRouteContextUpdated', handleOrganizationsRouteContext);
    };
  }, [currentPath]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (!currentPath.includes('/subscriptions')) {
      setSubscriptionsRouteContext(null);
      return undefined;
    }

    const handleSubscriptionsRouteContext = (event) => {
      setSubscriptionsRouteContext(event.detail || null);
    };

    window.addEventListener('subscriptionsRouteContextUpdated', handleSubscriptionsRouteContext);
    window.dispatchEvent(new CustomEvent('requestSubscriptionsRouteContext'));

    return () => {
      window.removeEventListener('subscriptionsRouteContextUpdated', handleSubscriptionsRouteContext);
    };
  }, [currentPath]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (!currentPath.includes('/wallet')) {
      setWalletRouteContext(null);
      return undefined;
    }

    const handleWalletRouteContext = (event) => {
      setWalletRouteContext(event.detail || null);
    };

    window.addEventListener('walletRouteContextUpdated', handleWalletRouteContext);
    window.dispatchEvent(new CustomEvent('requestWalletRouteContext'));

    return () => {
      window.removeEventListener('walletRouteContextUpdated', handleWalletRouteContext);
    };
  }, [currentPath]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (!currentPath.includes('/health-news')) {
      setHealthNewsRouteContext(null);
      return undefined;
    }

    const handleHealthNewsRouteContext = (event) => {
      setHealthNewsRouteContext(event.detail || null);
    };

    window.addEventListener('healthNewsRouteContextUpdated', handleHealthNewsRouteContext);
    window.dispatchEvent(new CustomEvent('requestHealthNewsRouteContext'));

    return () => {
      window.removeEventListener('healthNewsRouteContextUpdated', handleHealthNewsRouteContext);
    };
  }, [currentPath]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (!currentPath.includes('/insurance')) {
      setInsuranceRouteContext(null);
      return undefined;
    }

    const handleInsuranceRouteContext = (event) => {
      setInsuranceRouteContext(event.detail || null);
    };

    window.addEventListener('insuranceRouteContextUpdated', handleInsuranceRouteContext);
    window.dispatchEvent(new CustomEvent('requestInsuranceRouteContext'));

    return () => {
      window.removeEventListener('insuranceRouteContextUpdated', handleInsuranceRouteContext);
    };
  }, [currentPath]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (!currentPath.includes('/verification')) {
      setVerificationRouteContext(null);
      return undefined;
    }

    const handleVerificationRouteContext = (event) => {
      setVerificationRouteContext(event.detail || null);
    };

    window.addEventListener('verificationRouteContextUpdated', handleVerificationRouteContext);
    window.dispatchEvent(new CustomEvent('requestVerificationRouteContext'));

    return () => {
      window.removeEventListener('verificationRouteContextUpdated', handleVerificationRouteContext);
    };
  }, [currentPath]);

  const renderAccessDenied = () => (
    <div className="p-0 md:p-6 scrollbar-hide">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className="text-center py-12"
      >
        <div className="w-16 h-16 bg-destructive/20 rounded-icon flex items-center justify-center mx-auto mb-6">
          <Lock className="h-8 w-8 text-destructive" />
        </div>
        <h3 className="font-bold text-xl mb-2 text-foreground">No access</h3>
        <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
          You do not have access to this panel.
        </p>
        <div className="text-xs text-muted-foreground font-medium">
          Ask an admin if this should be available.
        </div>
      </motion.div>
    </div>
  );

  const getPageContextHeader = () => {
    const headers = {
      '/': { title: 'Today', subtitle: 'What needs attention' },
      '/emergencies': { title: 'Requests', subtitle: 'Active care requests' },
      '/users': { title: 'Users', subtitle: 'Access' },
      '/verification': { title: 'Approvals', subtitle: 'Provider and facility review' },
      '/analytics': { title: 'Statistics', subtitle: 'Trends' },
      '/doctors': { title: 'Staff', subtitle: 'Care team' },
      '/visits': { title: 'Visits', subtitle: 'Appointments' },
      '/hospitals': { title: 'Facilities', subtitle: 'Hospitals and clinics' },
      '/ambulances': { title: 'Ambulances', subtitle: 'Vehicles and crews' },
      '/health-news': { title: 'Health news', subtitle: 'Content' },
      '/support-tickets': { title: 'Support', subtitle: 'Help requests' },
      '/insurance': { title: 'Insurance', subtitle: 'Policies' },
      '/map': { title: 'Map', subtitle: 'Locations' },
      '/settings': { title: 'Settings', subtitle: 'Account and app' },
      '/subscriptions': { title: 'Subscriptions', subtitle: 'Emails' },
      '/wallet': { title: 'Payments', subtitle: 'Balance and cards' },
      '/pricing': { title: 'Pricing', subtitle: 'Costs' },
      '/organizations': { title: 'Organizations', subtitle: 'Network' }
    };

    const currentHeaderKey = Object.keys(headers).find(key =>
      currentPath === key || currentPath.startsWith(key + '/')
    );

    return currentHeaderKey ? headers[currentHeaderKey] : { title: 'Context', subtitle: 'Page details' };
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
        <div className="px-0 pt-4 pb-3 md:px-6">
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
                  className="w-2 h-2 bg-success rounded-pill"
                  aria-hidden="true"
                />
              )}
              {/* Close button - Hidden on mobile */}
              <button
                onClick={() => {
                  // Close context panel
                  const event = new CustomEvent('closeContextPanel');
                  window.dispatchEvent(event);
                }}
                className="hidden md:block w-8 h-8 rounded-button bg-muted/20 hover:bg-muted/30 transition-all duration-300 flex items-center justify-center group"
                type="button"
                aria-label="Close panel"
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
    <div className="h-full flex flex-col rounded-card" data-context-panel-content="true">
      {/* Header - Hidden on mobile */}
      <div className="hidden md:block">
        {renderPanelHeader()}
      </div>
      <div className="flex-1 overflow-y-auto px-0 pb-6 md:px-4 md:pb-6">
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
      <DashboardPanel todayContext={todayRouteContext} />
    );
  } else if (currentPath.includes('/emergencies')) {
    return renderPanelWithHeader(
      <EmergencyPanel requestContext={emergencyRouteContext} />
    );
  } else if (currentPath.includes('/users')) {
    return renderPanelWithHeader(<UsersPanel
      users={usersRouteContext?.users || []}
      statistics={usersRouteContext?.statistics}
      filters={filters}
      recentUsers={usersRouteContext?.recentUsers || []}
      fetchRecentActivity={false}
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
            users: usersRouteContext?.users || [],
            statistics: usersRouteContext?.statistics
          }
        }));
      }}
    />);
  } else if (currentPath.includes('/hospitals')) {
    return renderPanelWithHeader(<HospitalsPanel hospitalContext={hospitalsRouteContext} />);
  } else if (currentPath.includes('/ambulances')) {
    return renderPanelWithHeader(<AmbulancesPanel ambulanceContext={ambulancesRouteContext} />);
  } else if (currentPath.includes('/map')) {
    return renderPanelWithHeader(
      <MapPanel emergencyStats={emergencyStats} />
    );
  } else if (currentPath.includes('/analytics')) {
    return renderPanelWithHeader(<AnalyticsPanel />);
  } else if (currentPath.includes('/doctors')) {
    return renderPanelWithHeader(<DoctorsPanel staffContext={doctorsRouteContext} />);
  } else if (currentPath.includes('/visits')) {
    return renderPanelWithHeader(<VisitsPanel visitContext={visitsRouteContext} />);
  } else if (currentPath.includes('/verification')) {
    return renderPanelWithHeader(
      <VerificationPanel
        verificationContext={verificationRouteContext}
        verificationData={verificationRouteContext?.stats || verificationData}
        loading={verificationRouteContext ? { verification: verificationRouteContext.loading } : loading}
      />
    );
  } else if (currentPath.includes('/health-news')) {
    return renderPanelWithHeader(<HealthNewsPanel healthNewsContext={healthNewsRouteContext} />);
  } else if (currentPath.includes('/support-tickets')) {
    return renderPanelWithHeader(<SupportTicketsPanel supportContext={supportTicketsRouteContext} />);
  } else if (currentPath.includes('/insurance')) {
    return renderPanelWithHeader(
      <InsurancePanel insuranceContext={insuranceRouteContext} />
    );
  } else if (currentPath.includes('/subscriptions')) {
    return renderPanelWithHeader(
      <SubscriptionsPanel
        subscribers={subscriptionsRouteContext?.subscribers || []}
        summary={subscriptionsRouteContext?.summary}
      />
    );
  } else if (currentPath.includes('/settings')) {
    return renderPanelWithHeader(<SettingsPanel />);
  } else if (currentPath.includes('/pricing')) {
    return renderPanelWithHeader(<PricingContextPanel />);
  } else if (currentPath.includes('/wallet')) {
    return renderPanelWithHeader(<WalletPanel walletContext={walletRouteContext} />);
  } else if (currentPath.includes('/organizations')) {
    return renderPanelWithHeader(
      <OrganizationsPanel
        organizations={organizationsRouteContext?.organizations || []}
        summary={organizationsRouteContext?.summary}
      />
    );
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
        <div className="w-16 h-16 bg-primary/20 rounded-icon flex items-center justify-center mx-auto mb-6">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <h3 className="font-bold text-xl mb-2 text-foreground">Page help</h3>
        <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
          Open a page to see related details and actions.
        </p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, ease: [0.4, 0, 0.2, 1] }}
          className="flex items-center justify-center gap-2"
        >
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-xs font-normal text-primary uppercase tracking-wider">Ready</span>
        </motion.div>
      </motion.div>
    </div>
  );
};
