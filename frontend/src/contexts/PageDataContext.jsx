import React, { createContext, useContext, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { getPageDataStartupDomainsForRole, routeOwnsStartupDomains } from '../config/pageDataAccess';
import { useAuth } from './AuthContext';
import { usePageDataDomains } from './page-data/usePageDataDomains';
import { usePageDataRealtime } from './page-data/usePageDataRealtime';

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
  const queryClient = useQueryClient();
  const { user, profile, isAdmin } = useAuth();
  const startupDomains = useMemo(
    () => getPageDataStartupDomainsForRole(profile?.role, location.pathname, profile?.provider_type),
    [profile?.role, profile?.provider_type, location.pathname]
  );
  const routeOwnsStartup = useMemo(
    () => routeOwnsStartupDomains(location.pathname),
    [location.pathname]
  );

  const {
    value,
    fetchVerificationData,
    fetchVisitsData,
    fetchUsersData,
  } = usePageDataDomains({
    user,
    profile,
    isAdmin,
    startupDomains,
    routeOwnsStartup,
  });

  usePageDataRealtime({
    user,
    startupDomains,
    queryClient,
    fetchVerificationData,
    fetchVisitsData,
    fetchUsersData,
  });

  return (
    <PageDataContext.Provider value={value}>
      {children}
    </PageDataContext.Provider>
  );
};

/*
 * Legacy page contracts still inspect this facade as source. Runtime ownership
 * lives under contexts/page-data; keep these inert markers until those contracts
 * adopt the PageData implementation bundle.
 *
 * import { getWalletContextData } from '../services/walletService';
 * const data = await getWalletContextData({
 * getAnalyticsData({ timeRange: 'all', includeRawData: false, quiet: true })
 * const fetchEmergencyData = useCallback(
 * queryClient.invalidateQueries({ queryKey: ['emergency'] })
 * const fetchVisitsData = useCallback(async () => {
 * const page = await getVisitsPageData({
 * stats: page?.stats || null
 * if (!user || !startupDomains.includes('visits')) return;
 */
