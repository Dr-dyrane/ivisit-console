import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createEmergencyFailureData,
  loadEmergencyPageData,
} from './adapters/emergencyPageData';
import { loadVerificationPageData } from './adapters/verificationPageData';
import { loadDoctorsPageData } from './adapters/doctorsPageData';
import { loadVisitsPageData } from './adapters/visitsPageData';
import { loadAnalyticsPageData } from './adapters/analyticsPageData';
import { createUsersFailureData, loadUsersPageData } from './adapters/usersPageData';
import {
  createWalletFailureData,
  loadWalletPageData,
} from './adapters/walletPageData';
import { deriveDomainLoading, deriveEmergencyStats } from './pageDataSelectors';

const createNullFailureData = () => null;

export const usePageDataDomains = ({
  user,
  profile,
  isAdmin,
  startupDomains,
  routeOwnsStartup,
}) => {
  const [pageLoading, setPageLoading] = useState(true);
  const [emergencyData, setEmergencyData] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [doctorsData, setDoctorsData] = useState(null);
  const [visitsData, setVisitsData] = useState(null);
  const [verificationData, setVerificationData] = useState(null);
  const [userData, setUserData] = useState({ users: [], statistics: null });
  const [walletData, setWalletData] = useState({ wallet: null, ledger: [], projection: 0 });
  const [domainErrors, setDomainErrors] = useState({});
  const [domainFetching, setDomainFetching] = useState({});

  const clearDomainError = useCallback((domain) => {
    setDomainErrors((current) => {
      if (!current[domain]) return current;
      const next = { ...current };
      delete next[domain];
      return next;
    });
  }, []);

  const markDomainError = useCallback((domain, error) => {
    setDomainErrors((current) => ({
      ...current,
      [domain]: error?.message || 'Not ready yet',
    }));
  }, []);

  const markDomainFetchStart = useCallback((domain) => {
    setDomainFetching((current) => {
      if (current[domain] === true) return current;
      return { ...current, [domain]: true };
    });
  }, []);

  const markDomainFetchSettled = useCallback((domain) => {
    setDomainFetching((current) => {
      if (!current[domain]) return current;
      return { ...current, [domain]: false };
    });
  }, []);

  const runDomainLoad = useCallback(async ({
    domain,
    load,
    setData,
    createFailureData,
  }) => {
    try {
      setPageLoading(true);
      markDomainFetchStart(domain);
      const data = await load();
      setData(data);
      clearDomainError(domain);
    } catch (error) {
      markDomainError(domain, error);
      setData(createFailureData());
    } finally {
      markDomainFetchSettled(domain);
      setPageLoading(false);
    }
  }, [clearDomainError, markDomainError, markDomainFetchSettled, markDomainFetchStart]);

  const fetchEmergencyData = useCallback(async () => runDomainLoad({
    domain: 'emergency',
    load: loadEmergencyPageData,
    setData: setEmergencyData,
    createFailureData: createEmergencyFailureData,
  }), [runDomainLoad]);

  const fetchVerificationData = useCallback(async () => runDomainLoad({
    domain: 'verification',
    load: loadVerificationPageData,
    setData: setVerificationData,
    createFailureData: createNullFailureData,
  }), [runDomainLoad]);

  const fetchDoctorsData = useCallback(async () => runDomainLoad({
    domain: 'doctors',
    load: loadDoctorsPageData,
    setData: setDoctorsData,
    createFailureData: createNullFailureData,
  }), [runDomainLoad]);

  const fetchVisitsData = useCallback(async () => runDomainLoad({
    domain: 'visits',
    load: loadVisitsPageData,
    setData: setVisitsData,
    createFailureData: createNullFailureData,
  }), [runDomainLoad]);

  const fetchAnalyticsData = useCallback(async () => runDomainLoad({
    domain: 'analytics',
    load: loadAnalyticsPageData,
    setData: setAnalyticsData,
    createFailureData: createNullFailureData,
  }), [runDomainLoad]);

  const fetchUsersData = useCallback(async () => runDomainLoad({
    domain: 'users',
    load: loadUsersPageData,
    setData: setUserData,
    createFailureData: createUsersFailureData,
  }), [runDomainLoad]);

  const fetchWalletData = useCallback(async () => {
    if (!user || !profile) {
      markDomainFetchSettled('wallet');
      setPageLoading(false);
      return;
    }

    await runDomainLoad({
      domain: 'wallet',
      load: () => loadWalletPageData({ profile, isAdmin: isAdmin() }),
      setData: setWalletData,
      createFailureData: createWalletFailureData,
    });
  }, [isAdmin, markDomainFetchSettled, profile, runDomainLoad, user]);

  useEffect(() => {
    if (!user) return;
    if (routeOwnsStartup) {
      setPageLoading(false);
      return;
    }

    if (!user.id) {
      console.log('User ID not available yet, skipping initial data fetch');
      return;
    }

    const taskMap = {
      emergency: fetchEmergencyData,
      visits: fetchVisitsData,
      analytics: fetchAnalyticsData,
      verification: fetchVerificationData,
      doctors: fetchDoctorsData,
      users: fetchUsersData,
    };

    startupDomains.forEach((domain) => taskMap[domain]?.());
    setPageLoading(false);
  }, [
    user,
    routeOwnsStartup,
    startupDomains,
    fetchEmergencyData,
    fetchVerificationData,
    fetchAnalyticsData,
    fetchDoctorsData,
    fetchVisitsData,
    fetchUsersData,
  ]);

  const emergencyStats = useMemo(
    () => deriveEmergencyStats(emergencyData),
    [emergencyData]
  );

  const refreshAllData = useCallback(async () => {
    try {
      const taskMap = {
        emergency: fetchEmergencyData,
        visits: fetchVisitsData,
        analytics: fetchAnalyticsData,
        verification: fetchVerificationData,
        doctors: fetchDoctorsData,
        users: fetchUsersData,
      };

      await Promise.all(startupDomains.map((domain) => taskMap[domain]?.()));
    } catch (error) {
      console.error('Error refreshing all data:', error);
    }
  }, [
    startupDomains,
    fetchEmergencyData,
    fetchVerificationData,
    fetchAnalyticsData,
    fetchDoctorsData,
    fetchVisitsData,
    fetchUsersData,
  ]);

  const getEmergencyStats = useCallback(() => emergencyStats, [emergencyStats]);

  const domainLoading = useMemo(() => deriveDomainLoading({
    domainFetching,
    emergencyData,
    verificationData,
    doctorsData,
    visitsData,
    analyticsData,
    userData,
    walletData,
  }), [
    domainFetching,
    emergencyData,
    verificationData,
    doctorsData,
    visitsData,
    analyticsData,
    userData,
    walletData,
  ]);

  const dataValue = useMemo(() => ({
    emergencyData,
    emergencyStats,
    analyticsData,
    doctorsData,
    doctorsStats: doctorsData?.stats,
    visitsData,
    visitsStats: visitsData?.stats,
    verificationData,
    userData,
    walletData,
    domainErrors,
    loading: pageLoading,
    domainLoading,
    domainFetching,
    useMockData: false,
  }), [
    emergencyData,
    emergencyStats,
    analyticsData,
    doctorsData,
    visitsData,
    verificationData,
    userData,
    walletData,
    domainErrors,
    domainLoading,
    domainFetching,
    pageLoading,
  ]);

  const methodsValue = useMemo(() => ({
    fetchEmergencyData,
    fetchVerificationData,
    fetchAnalyticsData,
    fetchDoctorsData,
    fetchVisitsData,
    fetchUsersData,
    fetchWalletData,
    getEmergencyStats,
    refreshAllData,
  }), [
    fetchEmergencyData,
    fetchVerificationData,
    fetchAnalyticsData,
    fetchDoctorsData,
    fetchVisitsData,
    fetchUsersData,
    fetchWalletData,
    getEmergencyStats,
    refreshAllData,
  ]);

  const value = useMemo(() => ({
    ...dataValue,
    ...methodsValue,
  }), [dataValue, methodsValue]);

  return {
    value,
    fetchEmergencyData,
    fetchVerificationData,
    fetchDoctorsData,
    fetchVisitsData,
    fetchUsersData,
  };
};
