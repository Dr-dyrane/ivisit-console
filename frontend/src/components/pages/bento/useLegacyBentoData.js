import { useEffect, useMemo, useState } from 'react';
import { getSubscriptionAnalytics } from '../../../services/subscriptionService';
import { getWalletSummary } from '../../../services/walletService';

const emptySubscriptionStats = {
  total: 0,
  active: 0,
  paid: 0,
  free: 0,
};

const emptyWalletStats = {
  balance: 0,
  todayIncome: 0,
  yesterdayIncome: 0,
  trend: 0,
  currency: 'USD',
};

export const useLegacyBentoData = ({
  pageData,
  profile,
  isAdmin,
  isOrgAdmin,
  isSponsor,
}) => {
  const {
    emergencyData,
    emergencyStats,
    analyticsData,
    doctorsStats,
    visitsStats,
    verificationData,
    userData,
  } = pageData;
  const [subscriptionStats, setSubscriptionStats] = useState(emptySubscriptionStats);
  const [walletStats, setWalletStats] = useState(emptyWalletStats);
  const shouldLoadSubscriptionStats = true;

  const appStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const todayRequests = emergencyData?.recent?.filter((request) => (
      request.created_at?.startsWith(today)
    )).length || 0;
    const yesterdayRequests = emergencyData?.recent?.filter((request) => (
      request.created_at?.startsWith(yesterday)
    )).length || 0;

    return {
      liveEmergencies: emergencyStats?.active || 0,
      responseTime: analyticsData?.avgResponseTime != null
        ? Math.round(analyticsData.avgResponseTime * 10) / 10
        : null,
      activeProviders: doctorsStats?.totalDoctors || 0,
      todayRequests,
      yesterdayRequests,
      totalUsers: userData?.statistics?.totalUsers || 0,
      completionRate: analyticsData?.completionRate ?? null,
      availableAmbulances: analyticsData?.availableAmbulances ?? null,
      pendingVerifications: verificationData?.pending ?? null,
      totalVisits: visitsStats?.total || 0,
    };
  }, [analyticsData, doctorsStats, emergencyData, emergencyStats, userData, verificationData, visitsStats]);

  const verificationStats = useMemo(() => ({
    pending: appStats.pendingVerifications,
    critical: verificationData?.critical || 0,
    high: verificationData?.high || 0,
    completed: verificationData?.completed || 0,
    total: verificationData?.total || 1,
  }), [appStats.pendingVerifications, verificationData]);

  useEffect(() => {
    if (!shouldLoadSubscriptionStats) return undefined;

    let isMounted = true;

    const fetchSubscriptionData = async () => {
      try {
        const data = await getSubscriptionAnalytics({ quiet: true });
        if (isMounted) setSubscriptionStats(data);
      } catch (error) {
        if (isMounted) setSubscriptionStats(emptySubscriptionStats);
      }
    };

    fetchSubscriptionData();
    return () => {
      isMounted = false;
    };
  }, [shouldLoadSubscriptionStats]);

  useEffect(() => {
    if (isAdmin() || isOrgAdmin() || isSponsor()) {
      getWalletSummary(profile, isAdmin() || isSponsor()).then(setWalletStats);
    }
    return undefined;
  }, [isAdmin, isOrgAdmin, isSponsor, profile]);

  return {
    appStats,
    chartData: [],
    subscriptionStats,
    verificationStats,
    walletStats,
  };
};
