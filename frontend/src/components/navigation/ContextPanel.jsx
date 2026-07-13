import React from 'react';
import { useLocation } from 'react-router-dom';
import { usePageData } from '../../contexts/PageDataContext';
import { useAuth } from '../../contexts/AuthContext';
import { canAccessContextPanel } from './context-panel/contextPanelAccess';
import {
  ContextPanelAccessDenied,
  ContextPanelEmpty,
  ContextPanelFrame,
} from './context-panel/ContextPanelChrome';
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
  const [pricingRouteContext, setPricingRouteContext] = React.useState(null);
  const [analyticsRouteContext, setAnalyticsRouteContext] = React.useState(null);
  const [settingsRouteContext, setSettingsRouteContext] = React.useState(null);
  const [walletRouteContext, setWalletRouteContext] = React.useState(null);
  const [healthNewsRouteContext, setHealthNewsRouteContext] = React.useState(null);
  const [insuranceRouteContext, setInsuranceRouteContext] = React.useState(null);
  const [verificationRouteContext, setVerificationRouteContext] = React.useState(null);

  const emergencyStats = getEmergencyStats();
  const roleAccess = {
    admin: isAdmin(),
    orgAdmin: isOrgAdmin(),
    patient: isPatient(),
    provider: isProvider(),
    sponsor: isSponsor(),
    viewer: isViewer(),
  };
  const framePanel = (content) => (
    <ContextPanelFrame useMockData={useMockData}>{content}</ContextPanelFrame>
  );

  React.useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (!currentPath.includes('/analytics')) {
      setAnalyticsRouteContext(null);
      return undefined;
    }
    const handleAnalyticsRouteContext = (event) => setAnalyticsRouteContext(event.detail || null);
    window.addEventListener('analyticsRouteContextUpdated', handleAnalyticsRouteContext);
    window.dispatchEvent(new CustomEvent('requestAnalyticsRouteContext'));
    return () => window.removeEventListener('analyticsRouteContextUpdated', handleAnalyticsRouteContext);
  }, [currentPath]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (!currentPath.includes('/settings')) {
      setSettingsRouteContext(null);
      return undefined;
    }
    const handleSettingsRouteContext = (event) => setSettingsRouteContext(event.detail || null);
    window.addEventListener('settingsRouteContextUpdated', handleSettingsRouteContext);
    window.dispatchEvent(new CustomEvent('requestSettingsRouteContext'));
    return () => window.removeEventListener('settingsRouteContextUpdated', handleSettingsRouteContext);
  }, [currentPath]);

  const [emergencyRouteContext, setEmergencyRouteContext] = React.useState(null);

  React.useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (!currentPath.includes('/pricing')) {
      setPricingRouteContext(null);
      return undefined;
    }
    const handlePricingRouteContext = (event) => setPricingRouteContext(event.detail || null);
    window.addEventListener('pricingRouteContextUpdated', handlePricingRouteContext);
    window.dispatchEvent(new CustomEvent('requestPricingRouteContext'));
    return () => window.removeEventListener('pricingRouteContextUpdated', handlePricingRouteContext);
  }, [currentPath]);

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

  if (!canAccessContextPanel(currentPath, roleAccess)) {
    return <ContextPanelAccessDenied />;
  }

  if (currentPath === '/' || currentPath === '') {
    return framePanel(
      <DashboardPanel todayContext={todayRouteContext} />
    );
  } else if (currentPath.includes('/emergencies')) {
    return framePanel(
      <EmergencyPanel requestContext={emergencyRouteContext} />
    );
  } else if (currentPath.includes('/users')) {
    // Whole-object pass-through (Doctors/Staff canon): the panel reads the page's PUBLISHED
    // shape (context.stats/.recent/...) verbatim. Cherry-picking renamed sub-props here is what
    // desynced Users -- the page publishes stats/recent, not statistics/recentUsers.
    return framePanel(<UsersPanel usersContext={usersRouteContext} />);
  } else if (currentPath.includes('/hospitals')) {
    return framePanel(<HospitalsPanel hospitalContext={hospitalsRouteContext} />);
  } else if (currentPath.includes('/ambulances')) {
    return framePanel(<AmbulancesPanel ambulanceContext={ambulancesRouteContext} />);
  } else if (currentPath.includes('/map')) {
    return framePanel(
      <MapPanel emergencyStats={emergencyStats} />
    );
  } else if (currentPath.includes('/analytics')) {
    return framePanel(<AnalyticsPanel analyticsContext={analyticsRouteContext} />);
  } else if (currentPath.includes('/doctors')) {
    return framePanel(<DoctorsPanel staffContext={doctorsRouteContext} />);
  } else if (currentPath.includes('/visits')) {
    return framePanel(<VisitsPanel visitContext={visitsRouteContext} />);
  } else if (currentPath.includes('/verification')) {
    return framePanel(
      <VerificationPanel
        verificationContext={verificationRouteContext}
        verificationData={verificationRouteContext?.stats || verificationData}
        loading={verificationRouteContext ? { verification: verificationRouteContext.loading } : loading}
      />
    );
  } else if (currentPath.includes('/health-news')) {
    return framePanel(<HealthNewsPanel healthNewsContext={healthNewsRouteContext} />);
  } else if (currentPath.includes('/support-tickets')) {
    return framePanel(<SupportTicketsPanel supportContext={supportTicketsRouteContext} />);
  } else if (currentPath.includes('/insurance')) {
    return framePanel(
      <InsurancePanel insuranceContext={insuranceRouteContext} />
    );
  } else if (currentPath.includes('/subscriptions')) {
    return framePanel(
      <SubscriptionsPanel subscriptionsContext={subscriptionsRouteContext} />
    );
  } else if (currentPath.includes('/settings')) {
    return framePanel(<SettingsPanel settingsContext={settingsRouteContext} />);
  } else if (currentPath.includes('/pricing')) {
    return framePanel(<PricingContextPanel pricingContext={pricingRouteContext} />);
  } else if (currentPath.includes('/wallet')) {
    return framePanel(<WalletPanel walletContext={walletRouteContext} />);
  } else if (currentPath.includes('/organizations')) {
    // Whole-object pass-through (Support/Users canon): the panel reads the page's PUBLISHED
    // shape (orgContext.stats/.recent/...) verbatim, so fresh server stats never degrade to a
    // stale window count. (Was a renamed organizations/summary cherry-pick -- the desync seam.)
    return framePanel(
      <OrganizationsPanel orgContext={organizationsRouteContext} />
    );
  }

  return <ContextPanelEmpty />;
};
