import React, { useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { usePageActions } from '../../../contexts/PageActionsContext';
import { usePageData } from '../../../contexts/PageDataContext';
import { usePageFooter, usePageHeader } from '../../../contexts/LayoutContext';
import { useBreakpoint } from '../../../hooks/useBreakpoint';
import { Button } from '../../ui/button';
import { MobileDashboard } from '../../mobile/MobileDashboard';
import { SEOHead } from '../../common/SEOHead';
import { LegacyBentoFooter } from './LegacyBentoFooter';
import { LegacyBentoGrid } from './LegacyBentoGrid';
import { LegacyBentoLoadingView } from './LegacyBentoLoadingView';
import { useLegacyBentoData } from './useLegacyBentoData';

export const LegacyBentoHome = () => {
  const { registerPageAction } = usePageActions();
  const {
    profile,
    hasMinRole,
    isAdmin,
    isProvider,
    isPatient,
    isViewer,
    isSponsor,
    isOrgAdmin,
    isSkippedOnboarding,
  } = useAuth();
  const pageData = usePageData();
  const {
    analyticsData,
    doctorsStats,
    emergencyStats,
    loading,
    refreshAllData,
    visitsStats,
  } = pageData;
  const { isMobile } = useBreakpoint();
  const {
    appStats,
    chartData,
    subscriptionStats,
    verificationStats,
    walletStats,
  } = useLegacyBentoData({
    pageData,
    profile,
    isAdmin,
    isOrgAdmin,
    isSponsor,
  });

  React.useLayoutEffect(() => registerPageAction({
    route: '/',
    icon: RefreshCw,
    label: 'Refresh today',
    color: 'utility',
    action: refreshAllData,
  }), [refreshAllData, registerPageAction]);

  const isTodayShell = isMobile && isPatient();
  const headerActions = useMemo(() => (
    <Button
      variant="outline"
      size="sm"
      onClick={refreshAllData}
      className="surface-raised rounded-pill h-8 px-3 text-[10px] font-semibold"
    >
      <RefreshCw className="h-3 w-3 mr-1" />
      REFRESH STATS
    </Button>
  ), [refreshAllData]);

  usePageHeader(isTodayShell ? 'Today' : 'Overview', isTodayShell ? null : headerActions);

  const footerContent = useMemo(() => (
    <LegacyBentoFooter
      appStats={appStats}
      isAdmin={isAdmin}
      isOrgAdmin={isOrgAdmin}
      isPatient={isPatient}
      isProvider={isProvider}
      isSponsor={isSponsor}
    />
  ), [appStats, isAdmin, isOrgAdmin, isPatient, isProvider, isSponsor]);

  usePageFooter(footerContent, 'status', !isTodayShell);

  const isLoading = loading?.emergency
    || loading?.analytics
    || loading?.doctors
    || loading?.visits
    || loading?.verification;

  if (isLoading) {
    return (
      <LegacyBentoLoadingView
        isAdmin={isAdmin}
        isMobile={isMobile}
        isOrgAdmin={isOrgAdmin}
        isPatient={isPatient}
        isProvider={isProvider}
        isSponsor={isSponsor}
        isViewer={isViewer}
      />
    );
  }

  if (isMobile && isPatient()) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <SEOHead title="Today" description="Mobile home." />
        <MobileDashboard
          appStats={appStats}
          walletStats={walletStats}
          subscriptionStats={subscriptionStats}
          recentActivities={[]}
          onRefresh={refreshAllData}
          roleContext={{
            isAdmin: isAdmin(),
            isProvider: isProvider(),
            isPatient: isPatient(),
            isOrgAdmin: isOrgAdmin(),
            isSponsor: isSponsor(),
          }}
        />
      </div>
    );
  }

  return (
    <LegacyBentoGrid
      analyticsData={analyticsData}
      appStats={appStats}
      chartData={chartData}
      doctorsStats={doctorsStats}
      emergencyStats={emergencyStats}
      hasMinRole={hasMinRole}
      isAdmin={isAdmin}
      isOrgAdmin={isOrgAdmin}
      isPatient={isPatient}
      isProvider={isProvider}
      isSkippedOnboarding={isSkippedOnboarding}
      isSponsor={isSponsor}
      isViewer={isViewer}
      subscriptionStats={subscriptionStats}
      verificationStats={verificationStats}
      visitsStats={visitsStats}
      walletStats={walletStats}
    />
  );
};
