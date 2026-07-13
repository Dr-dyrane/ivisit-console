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
