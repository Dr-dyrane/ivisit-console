import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { getUserStatistics, getProfiles } from '../services/profilesService';
import { getEmergencyRequests, getEmergencyRequestsPageStats } from '../services/emergencyService';
import { getDoctors } from '../services/doctorsService';
import { getVisitsPageData } from '../services/visitsService';
import { getAnalyticsData } from '../services/analyticsService';
import { getVerificationStats } from '../services/verificationService';
import { getWalletContextData } from '../services/walletService';
import { getPageDataStartupDomainsForRole, routeOwnsStartupDomains } from '../config/pageDataAccess';

const PageDataContext = createContext();

export const usePageData = () => {
  const context = useContext(PageDataContext);
  if (!context) {
    throw new Error('usePageData must be used within a PageDataProvider');
  }
  return context;
};

export const PageDataProvider = ({ children }) => {
  const location = useLocation();
  // React Query client - used to feed realtime changes into the ['doctors'] cache
  // (the single doctors store) instead of a full slice refetch. See the doctors
  // realtime subscription below (CONSOLE_LAYER_MODEL_PLAN.md:203, S3-1).
  const queryClient = useQueryClient();
  const { user, profile, isAdmin } = useAuth();
  const [pageLoading, setPageLoading] = useState(true);
  const startupDomains = useMemo(
    () => getPageDataStartupDomainsForRole(profile?.role, location.pathname, profile?.provider_type),
    [profile?.role, profile?.provider_type, location.pathname]
  );
  const routeOwnsStartup = useMemo(
    () => routeOwnsStartupDomains(location.pathname),
    [location.pathname]
  );

  const [emergencyData, setEmergencyData] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [doctorsData, setDoctorsData] = useState(null);
  const [visitsData, setVisitsData] = useState(null);
  const [verificationData, setVerificationData] = useState(null);
  const [userData, setUserData] = useState({ users: [], statistics: null });
  const [walletData, setWalletData] = useState({ wallet: null, ledger: [], projection: 0 });
  const [domainErrors, setDomainErrors] = useState({});
  // Per-domain in-flight map ({ [domain]: boolean }) - true while that domain's
  // fetch is running (initial load OR background refetch), false once it settles
  // (success or error). Keys mirror the markDomainError/domainErrors domain names
  // so consumers can correlate loading, error, and data per slice.
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

  // Fetch emergency data
  // Fetch emergency data
  const fetchEmergencyData = useCallback(async () => {
    try {
      setPageLoading(true);
      markDomainFetchStart('emergency');

      // Persona matrix 6.9: hero counts come from exact head-count queries
      // (getEmergencyRequestsPageStats, auth-scoped via applyEmergencyRequestScope)
      // instead of counting a client-side list fetch, which Supabase caps at 1000
      // rows and therefore undercounts at platform scale and drifts from the
      // Requests page. The list read only feeds the small recent slice.
      const [stats, recent] = await Promise.all([
        getEmergencyRequestsPageStats({}, undefined, true),
        getEmergencyRequests({ quiet: true, limit: 10 }),
      ]);

      setEmergencyData({
        stats: {
          total: stats.total,
          ambulance: stats.ambulance,
          bed: stats.bed,
          booking: stats.booking,
          pending_approval: stats.pending_approval,
          pending: stats.pending_approval, // Alias for backward compatibility
          inProgress: stats.inProgress,
          accepted: stats.accepted,
          arrived: stats.arrived,
          completed: stats.completed,
          active: stats.active,
          // Responder-persona count (driver Today) from the same exact-count
          // stats read; additive next to the legacy keys.
          mine: stats.mine
        },
        recent: recent || []
      });
      clearDomainError('emergency');

    } catch (error) {
      markDomainError('emergency', error);
      setEmergencyData({ stats: null, recent: [] });
    } finally {
      markDomainFetchSettled('emergency');
      setPageLoading(false);
    }
  }, [clearDomainError, markDomainError, markDomainFetchSettled, markDomainFetchStart]);

  const fetchVerificationData = useCallback(async () => {
    try {
      setPageLoading(true);
      markDomainFetchStart('verification');

      // Try fetching verified stats via service (admin only)
      try {
        const stats = await getVerificationStats();
        setVerificationData(stats);
        clearDomainError('verification');
      } catch (authError) {
        markDomainError('verification', authError);
        setVerificationData(null);
      }
    } catch (error) {
      markDomainError('verification', error);
      setVerificationData(null);
    } finally {
      markDomainFetchSettled('verification');
      setPageLoading(false);
    }
  }, [clearDomainError, markDomainError, markDomainFetchSettled, markDomainFetchStart]);

  const fetchDoctorsData = useCallback(async () => {
    try {
      setPageLoading(true);
      markDomainFetchStart('doctors');

      const { data } = await getDoctors({ quiet: true }); // RBAC enabled

      // Calculate real doctor stats based on visible data
      const total = data?.length || 0;
      const available = data?.filter(d => d.status === 'available').length || 0;
      const busy = data?.filter(d => d.status === 'busy').length || 0;
      const off_duty = data?.filter(d => d.status === 'off_duty').length || 0;
      const onCall = data?.filter(d => d.status === 'on_call').length || 0;

      setDoctorsData({
        stats: {
          total,
          totalDoctors: total,
          onCall,
          available,
          busy,
          off_duty
        },
        recent: data?.slice(0, 5) || []
      });
      clearDomainError('doctors');

    } catch (error) {
      markDomainError('doctors', error);
      setDoctorsData(null);
    } finally {
      markDomainFetchSettled('doctors');
      setPageLoading(false);
    }
  }, [clearDomainError, markDomainError, markDomainFetchSettled, markDomainFetchStart]);

  const fetchVisitsData = useCallback(async () => {
    try {
      setPageLoading(true);
      markDomainFetchStart('visits');

      const page = await getVisitsPageData({
        quiet: true,
        range: { start: 0, end: 4 },
        sortConfig: { key: 'date', direction: 'desc' },
      });

      setVisitsData({
        stats: page?.stats || null,
        recent: page?.visits || []
      });
      clearDomainError('visits');

    } catch (error) {
      markDomainError('visits', error);
      setVisitsData(null);
    } finally {
      markDomainFetchSettled('visits');
      setPageLoading(false);
    }
  }, [clearDomainError, markDomainError, markDomainFetchSettled, markDomainFetchStart]);

  const fetchAnalyticsData = useCallback(async () => {
    try {
      setPageLoading(true);
      markDomainFetchStart('analytics');

      // PageData only needs summary metrics; page-level analytics can request raw chart data.
      const fullAnalytics = await getAnalyticsData({ timeRange: 'all', includeRawData: false, quiet: true });

      // Transform for PageData context expected structure
      const transformedAnalytics = {
        totalRequests: fullAnalytics.totalEmergencies,
        avgResponseTime: fullAnalytics.avgResponseTime,
        completionRate: fullAnalytics.successRate,
        completionRateSource: fullAnalytics.successRateSource,
        sourceState: fullAnalytics.analyticsSourceState,
        activeHospitals: fullAnalytics.totalHospitals,
        availableAmbulances: fullAnalytics.totalAmbulances,
        onRouteAmbulances: null,
        onRouteAmbulancesSource: 'source_pending',
      };

      setAnalyticsData(transformedAnalytics);
      clearDomainError('analytics');
    } catch (error) {
      markDomainError('analytics', error);
      setAnalyticsData(null);
    } finally {
      markDomainFetchSettled('analytics');
      setPageLoading(false);
    }
  }, [clearDomainError, markDomainError, markDomainFetchSettled, markDomainFetchStart]);

  const fetchUsersData = useCallback(async () => {
    try {
      setPageLoading(true);
      markDomainFetchStart('users');

      // Try to fetch robust statistics (Server/Admin side)
      let serverStatistics = null;
      try {
        serverStatistics = await getUserStatistics({ quiet: true });
      } catch (err) {
        // Not admin or generic error, ignore
      }

      // Fetch profiles accessible to this user
      const users = await getProfiles({ quiet: true });

      // If we got server stats, use them (Admin). 
      // If not (Provider/User), calculate stats from visible users (e.g. 1 user).

      const totalUsers = serverStatistics?.totalUsers || users.length;
      const roleDistribution = serverStatistics?.roleDistribution || users.reduce((acc, user) => {
        const role = user.role || 'patient';
        acc[role] = (acc[role] || 0) + 1;
        return acc;
      }, {});

      const statistics = serverStatistics?.totalUsers ? serverStatistics : {
        totalUsers,
        roleDistribution,
        // Other stats might be 0/null for non-admins
        emailVerifiedUsers: users.filter(u => u.email_confirmed_at || u.bvn_verified).length,
        bvnVerifiedUsers: users.filter(u => u.bvn_verified).length,
      };

      setUserData({ users, statistics });
      clearDomainError('users');

    } catch (error) {
      markDomainError('users', error);
      setUserData({ users: [], statistics: null });
    } finally {
      markDomainFetchSettled('users');
      setPageLoading(false);
    }
  }, [clearDomainError, markDomainError, markDomainFetchSettled, markDomainFetchStart]);

  const fetchWalletData = useCallback(async () => {
    try {
      if (!user || !profile) return;
      setPageLoading(true);
      markDomainFetchStart('wallet');

      const data = await getWalletContextData({
        profile,
        isAdmin: isAdmin(),
        ledgerLimit: 10,
      });

      setWalletData(data);
      clearDomainError('wallet');
    } catch (error) {
      markDomainError('wallet', error);
      setWalletData({ wallet: null, ledger: [], projection: 0 });
    } finally {
      markDomainFetchSettled('wallet');
      setPageLoading(false);
    }
  }, [clearDomainError, isAdmin, markDomainError, markDomainFetchSettled, markDomainFetchStart, profile, user]);

  // Initialize all data on mount - only when user is authenticated
  useEffect(() => {
    if (!user) return;
    if (routeOwnsStartup) {
      setPageLoading(false);
      return;
    }

    // PULLBACK NOTE: Added user.id check to prevent undefined UUID errors
    // OLD: Fetch data as soon as user is available
    // NEW: Only fetch when user.id is available (after full auth)
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

  // Real-time subscription for emergency data.
  // S3 (CONSOLE_LAYER_MODEL_PLAN.md): a postgres_changes event now feeds
  // queryClient.invalidateQueries(['emergency']) - the React Query cache is the
  // single Requests store - instead of a full fetchEmergencyData() slice refetch.
  // Any mounted useEmergencyQuery observer (EmergencyRequestsPage) converges on the
  // next fetch. The subscription + removeChannel cleanup are unchanged. NOTE: the
  // PageDataContext emergencyData slice (read by dashboards - BentoHome/OrgAdminHome/
  // etc., a parallel lane) still hydrates via fetchEmergencyData on mount through the
  // domain fetch registry; its in-place live refresh is deferred until those consumers
  // move onto useEmergencyQuery (mirrors the doctors slice handling).
  useEffect(() => {
    if (!user || !startupDomains.includes('emergency')) return;

    const channel = supabase
      .channel('emergency_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'emergency_requests' },
        () => queryClient.invalidateQueries({ queryKey: ['emergency'] })
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user, startupDomains, queryClient]);

  // Real-time subscription for doctors data.
  // S3-1 (CONSOLE_LAYER_MODEL_PLAN.md:203): a postgres_changes event now feeds
  // queryClient.invalidateQueries(['doctors']) - the React Query cache is the
  // single doctors store - instead of a full fetchDoctorsData() slice refetch.
  // Any mounted useDoctorsQuery observer (DoctorsPage) converges on the next fetch.
  // The subscription + removeChannel cleanup are unchanged. NOTE: this sub only
  // mounts on dashboard routes (doctors is excluded from the /doctors startup
  // domains), where the PageDataContext doctorsData slice - read by BentoHome /
  // OrgAdminHome, owned by a parallel lane - still hydrates via fetchDoctorsData
  // on mount; its in-place live refresh is deferred until those consumers move
  // onto useDoctorsQuery.
  useEffect(() => {
    if (!user || !startupDomains.includes('doctors')) return;

    const channel = supabase
      .channel('doctor_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'doctors' },
        () => queryClient.invalidateQueries({ queryKey: ['doctors'] })
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user, startupDomains, queryClient]);

  // Real-time subscription for visits data
  useEffect(() => {
    if (!user || !startupDomains.includes('visits')) return;

    const channel = supabase
      .channel('visit_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'visits' },
        fetchVisitsData
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user, startupDomains, fetchVisitsData]);

  // Real-time subscription for verification data and user data
  useEffect(() => {
    if (
      !user ||
      (!startupDomains.includes('verification') && !startupDomains.includes('users'))
    ) return;

    const channel = supabase
      .channel('profile_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          if (startupDomains.includes('verification')) fetchVerificationData();
          if (startupDomains.includes('users')) fetchUsersData();
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user, startupDomains, fetchVerificationData, fetchUsersData]);

  // Calculate statistics (Memoized to prevent churn)
  const emergencyStats = useMemo(() => {
    // If emergencyData has stats property (new structure), use it
    if (emergencyData && emergencyData.stats) {
      return emergencyData.stats;
    }

    // Fallback for array structure (legacy or initial state) or default
    const safeData = Array.isArray(emergencyData) ? emergencyData : [];

    const ambulance = safeData.filter(req => req.service_type === 'ambulance').length;
    const bed = safeData.filter(req => req.service_type === 'bed').length;
    const booking = safeData.filter(req => req.service_type === 'booking').length;
    const pending_approval = safeData.filter(req => req.status === 'pending_approval').length;
    const inProgress = safeData.filter(req => req.status === 'in_progress').length;
    const accepted = safeData.filter(req => req.status === 'accepted').length;
    const arrived = safeData.filter(req => req.status === 'arrived').length;
    const completed = safeData.filter(req => req.status === 'completed').length;
    const active = pending_approval + inProgress + accepted + arrived;

    return {
      total: safeData.length,
      ambulance,
      bed,
      booking,
      pending_approval,
      pending: pending_approval,
      inProgress,
      accepted,
      arrived,
      completed,
      active
    };
  }, [emergencyData]);

  // Refresh all data
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

  // Per-domain initial-load map ({ [domain]: boolean }) - true only while a
  // domain's fetch is in flight AND its slice still holds the initial no-data
  // state. The slices have no cache layer, so "initial load" is derived from
  // each slice's initial state shape; background refetches over existing data
  // stay visible on domainFetching only. Same domain keys as domainErrors.
  const domainLoading = useMemo(() => ({
    emergency: Boolean(domainFetching.emergency) && emergencyData?.stats == null && (emergencyData?.recent?.length || 0) === 0,
    verification: Boolean(domainFetching.verification) && verificationData == null,
    doctors: Boolean(domainFetching.doctors) && doctorsData == null,
    visits: Boolean(domainFetching.visits) && visitsData == null,
    analytics: Boolean(domainFetching.analytics) && analyticsData == null,
    users: Boolean(domainFetching.users) && userData?.statistics == null && (userData?.users?.length || 0) === 0,
    wallet: Boolean(domainFetching.wallet) && walletData?.wallet == null && (walletData?.ledger?.length || 0) === 0,
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

  // PULLBACK NOTE: Optimized context value to prevent excessive re-renders
  // OLD: useMemo with 30+ dependencies causing constant re-creation
  // NEW: Split into stable data and methods to minimize dependency churn

  // Memoize data separately from methods
  const dataValue = useMemo(() => ({
    // Data
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

    // Loading states
    loading: pageLoading,
    // Per-domain loading (initial load only) and fetching (any in-flight fetch,
    // incl. background refetches) maps; additive next to the legacy boolean.
    domainLoading,
    domainFetching,
    // Compatibility flag for legacy consumers. Production PageData has no mock path.
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
    pageLoading
  ]);

  // Memoize methods separately (they're stable due to useCallback)
  const methodsValue = useMemo(() => ({
    fetchEmergencyData,
    fetchVerificationData,
    fetchAnalyticsData,
    fetchDoctorsData,
    fetchVisitsData,
    fetchUsersData,
    fetchWalletData,
    getEmergencyStats,
    refreshAllData
  }), [
    fetchEmergencyData,
    fetchVerificationData,
    fetchAnalyticsData,
    fetchDoctorsData,
    fetchVisitsData,
    fetchUsersData,
    fetchWalletData,
    getEmergencyStats,
    refreshAllData
  ]);

  // Combine data and methods
  const value = useMemo(() => ({
    ...dataValue,
    ...methodsValue
  }), [dataValue, methodsValue]);

  return (
    <PageDataContext.Provider value={value}>
      {children}
    </PageDataContext.Provider>
  );
};
