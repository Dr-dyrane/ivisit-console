import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { getSupportTickets } from '../services/supportTicketsService';
import { getUserStatistics, getProfiles } from '../services/profilesService';
import { getEmergencyRequests } from '../services/emergencyService';
import { getDoctors } from '../services/doctorsService';
import { getVisits } from '../services/visitsService';
import { getHospitals } from '../services/hospitalsService';
import { getAmbulances } from '../services/ambulancesService';
import { getAnalyticsData } from '../services/analyticsService';
import { getVerificationStats } from '../services/verificationService';
import { getRecentActivity } from '../services/activityService';
import { getInsurancePage } from '../services/insuranceService';
import { getOrganizations } from '../services/organizationsService';
import { getPricing } from '../services/pricingService';
import { getWalletContextData } from '../services/walletService';
import { getPageDataAccessForRole, getPageDataStartupDomainsForRole, routeOwnsStartupDomains } from '../config/pageDataAccess';

// Mock data as fallback - Based on actual mobile app service types
const mockEmergencyData = {
  stats: {
    total: 4,
    ambulance: 2,    // From mobile app serviceType: "ambulance"
    bed: 1,          // From mobile app serviceType: "bed"
    critical_care: 1, // From mobile app serviceType: "critical_care"
    emergency_room: 0, // From mobile app serviceType: "emergency_room"
    pending: 1,
    inProgress: 1,
    completed: 2
  },
  recent: [
    {
      id: 'mock-1',
      service_type: 'ambulance', // Main emergency type
      status: 'pending',
      hospital_name: 'Downtown Hospital',
      patient_snapshot: {
        fullName: 'John Doe',
        phone: '+1234567890'
      },
      created_at: new Date().toISOString(),
      description: 'Ambulance dispatch emergency'
    },
    {
      id: 'mock-2',
      service_type: 'bed', // Main emergency type
      status: 'in_progress',
      hospital_name: 'Westside Medical Center',
      patient_snapshot: {
        fullName: 'Jane Smith',
        phone: '+0987654321'
      },
      created_at: new Date(Date.now() - 3600000).toISOString(),
      description: 'Bed booking emergency'
    },
    {
      id: 'mock-3',
      service_type: 'critical_care',
      status: 'completed',
      hospital_name: 'North General Hospital',
      patient_snapshot: {
        fullName: 'Robert Johnson',
        phone: '+1122334455'
      },
      created_at: new Date(Date.now() - 7200000).toISOString(),
      description: 'Critical care emergency'
    },
    {
      id: 'mock-4',
      service_type: 'ambulance',
      status: 'completed',
      hospital_name: 'Bay Area Medical Clinic',
      patient_snapshot: {
        fullName: 'Sarah Wilson',
        phone: '+5544332211'
      },
      created_at: new Date(Date.now() - 10800000).toISOString(),
      description: 'Ambulance transport completed'
    }
  ]
};

const mockAnalyticsData = {
  totalRequests: null,
  avgResponseTime: null,
  completionRate: null,
  activeHospitals: null,
  availableAmbulances: null,
  onRouteAmbulances: null,
  sourceState: 'mock_unavailable'
};

const mockDoctorsData = {
  stats: {
    total: 48,
    totalDoctors: 48,
    onCall: 12,
    available: 28,
    busy: 8,
    off_duty: 0
  },
  recent: []
};

const mockVisitsData = {
  stats: {
    total: 24,
    today: 24,
    pending: 8,
    completed: 16,
    upcoming: 32,
    scheduled: 8,
    inProgress: 0,
    cancelled: 0
  },
  recent: []
};

const mockVerificationData = {
  pending: 15,
  approved: 142,
  rejected: 8,
  total: 165
};

const mockSupportTicketsData = {
  total: 24,
  open: 8,
  inProgress: 6,
  resolved: 10,
  thisWeek: 12,
  averageResolutionTime: 4.5
};

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
  const { user, profile, isAdmin } = useAuth();
  const [pageLoading, setPageLoading] = useState(true);
  const [useMockData, setUseMockData] = useState(false);
  const {
    canLoadProviderData,
    canLoadOrgData,
    canLoadAdminData,
  } = useMemo(() => getPageDataAccessForRole(profile?.role), [profile?.role]);
  const startupDomains = useMemo(
    () => getPageDataStartupDomainsForRole(profile?.role, location.pathname),
    [profile?.role, location.pathname]
  );
  const routeOwnsStartup = useMemo(
    () => routeOwnsStartupDomains(location.pathname),
    [location.pathname]
  );

  // Debounce refs for real-time updates
  const supportTicketsTimeoutRef = useRef(null);
  const DEBOUNCE_DELAY = 1000; // 1 second debounce

  const [emergencyData, setEmergencyData] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [doctorsData, setDoctorsData] = useState(null);
  const [visitsData, setVisitsData] = useState(null);
  const [verificationData, setVerificationData] = useState(mockVerificationData);
  const [supportTicketsData, setSupportTicketsData] = useState(null);
  const [insurancePolicies, setInsurancePolicies] = useState([]);
  const [insurancePageStats, setInsurancePageStats] = useState(null);
  const [activityData, setActivityData] = useState([]);
  const [userData, setUserData] = useState({ users: [], statistics: null });
  const [walletData, setWalletData] = useState({ wallet: null, ledger: [], projection: 0 });
  const [hospitalsData, setHospitalsData] = useState({ stats: null, recent: [] });
  const [ambulancesData, setAmbulancesData] = useState({ stats: null, recent: [] });
  const [organizationsData, setOrganizationsData] = useState({ organizations: [], stats: null });
  const [servicePricing, setServicePricing] = useState([]);
  const [roomPricing, setRoomPricing] = useState([]);
  const [domainErrors, setDomainErrors] = useState({});

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

  // Fetch emergency data
  // Fetch emergency data
  const fetchEmergencyData = useCallback(async () => {
    try {
      setPageLoading(true);

      if (useMockData) {
        setEmergencyData(mockEmergencyData);
        return;
      }

      const data = await getEmergencyRequests({ quiet: true });

      const total = data?.length || 0;
      const ambulance = data?.filter(r => r.service_type === 'ambulance').length || 0;
      const bed = data?.filter(r => r.service_type === 'bed').length || 0;
      const critical_care = data?.filter(r => r.service_type === 'critical_care').length || 0;
      const emergency_room = data?.filter(r => r.service_type === 'emergency_room').length || 0;
      const pending_approval = data?.filter(r => r.status === 'pending_approval').length || 0;
      const inProgress = data?.filter(r => r.status === 'in_progress').length || 0;
      const accepted = data?.filter(r => r.status === 'accepted').length || 0;
      const arrived = data?.filter(r => r.status === 'arrived').length || 0;
      const completed = data?.filter(r => r.status === 'completed').length || 0;
      // Active = all non-terminal statuses (what matters for the dashboard)
      const active = pending_approval + inProgress + accepted + arrived;

      setEmergencyData({
        stats: {
          total,
          ambulance,
          bed,
          critical_care,
          emergency_room,
          pending_approval,
          pending: pending_approval, // Alias for backward compatibility
          inProgress,
          accepted,
          arrived,
          completed,
          active
        },
        recent: data?.slice(0, 10) || []
      });
      clearDomainError('emergency');

    } catch (error) {
      markDomainError('emergency', error);
      setEmergencyData({ stats: null, recent: [] });
    } finally {
      setPageLoading(false);
    }
  }, [clearDomainError, markDomainError, useMockData]);

  const fetchVerificationData = useCallback(async () => {
    try {
      setPageLoading(true);

      if (useMockData) {
        setVerificationData(mockVerificationData);
        return;
      }

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
      setPageLoading(false);
    }
  }, [clearDomainError, markDomainError, useMockData]);

  const fetchDoctorsData = useCallback(async () => {
    try {
      setPageLoading(true);

      if (useMockData) {
        setDoctorsData(mockDoctorsData);
        return;
      }

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
      setPageLoading(false);
    }
  }, [clearDomainError, markDomainError, useMockData]);

  const fetchVisitsData = useCallback(async () => {
    try {
      setPageLoading(true);

      if (useMockData) {
        setVisitsData(mockVisitsData);
        return;
      }

      const data = await getVisits({ quiet: true }); // RBAC enabled

      const today = new Date().toISOString().split('T')[0];
      const todayVisits = data?.filter(v => v.visit_date === today || (v.date && v.date.startsWith(today))).length || 0;
      const scheduled = data?.filter(v => v.status === 'scheduled').length || 0;
      const inProgress = data?.filter(v => v.status === 'in_progress').length || 0;
      const completed = data?.filter(v => v.status === 'completed').length || 0;
      const cancelled = data?.filter(v => v.status === 'cancelled').length || 0;

      setVisitsData({
        stats: {
          total: data?.length || 0,
          today: todayVisits,
          scheduled,
          inProgress,
          completed,
          cancelled
        },
        recent: data?.slice(0, 5) || []
      });
      clearDomainError('visits');

    } catch (error) {
      markDomainError('visits', error);
      setVisitsData(null);
    } finally {
      setPageLoading(false);
    }
  }, [clearDomainError, markDomainError, useMockData]);

  const fetchAnalyticsData = useCallback(async () => {
    try {
      setPageLoading(true);

      if (useMockData) {
        setAnalyticsData(mockAnalyticsData);
        return;
      }

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
      setPageLoading(false);
    }
  }, [clearDomainError, markDomainError, useMockData]);

  const fetchHospitalsData = useCallback(async () => {
    try {
      setPageLoading(true);

      if (useMockData) return;

      const data = await getHospitals({ quiet: true }); // RBAC enabled

      // Update analytics data with real hospital count (if not already handled by analytics fetch)
      // Note: We might want to keep analytics disjoint, but this updates component state

      const total = data?.length || 0;
      const available = data?.filter(h => h.status === 'available').length || 0;
      const full = data?.filter(h => h.status === 'full').length || 0;
      const busy = data?.filter(h => h.status === 'busy').length || 0;
      const verified = data?.filter(h => h.verified).length || 0;
      const totalBeds = data?.reduce((acc, h) => acc + (h.available_beds || 0), 0) || 0;
      const totalAmbulances = data?.reduce((acc, h) => acc + (h.ambulances_count || 0), 0) || 0;

      setHospitalsData({
        stats: { total, available, full, busy, verified, totalBeds, totalAmbulances },
        recent: data?.slice(0, 5) || []
      });
      clearDomainError('hospitals');
    } catch (error) {
      markDomainError('hospitals', error);
      setHospitalsData({ stats: null, recent: [] });
    } finally {
      setPageLoading(false);
    }
  }, [clearDomainError, markDomainError, useMockData]);

  const fetchAmbulancesData = useCallback(async () => {
    try {
      setPageLoading(true);

      if (useMockData) return;

      const data = await getAmbulances({ quiet: true }); // RBAC enabled

      const available = data?.filter(a => a.status === 'available').length || 0;
      const onRoute = data?.filter(a => a.status === 'on_route').length || 0;
      const busy = data?.filter(a => a.status === 'busy').length || 0;
      const maintenance = data?.filter(a => a.status === 'maintenance').length || 0;

      setAmbulancesData({
        stats: {
          total: data?.length || 0,
          available,
          onRoute,
          busy,
          maintenance
        },
        recent: data?.slice(0, 5) || []
      });
      clearDomainError('ambulances');
    } catch (error) {
      markDomainError('ambulances', error);
      setAmbulancesData({ stats: null, recent: [] });
    } finally {
      setPageLoading(false);
    }
  }, [clearDomainError, markDomainError, useMockData]);

  const fetchUsersData = useCallback(async () => {
    try {
      setPageLoading(true);

      if (useMockData) {
        setUserData({ users: [], statistics: null });
        return;
      }

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
      setPageLoading(false);
    }
  }, [clearDomainError, markDomainError, useMockData]);

  const fetchSupportTicketsData = useCallback(async () => {
    try {
      setPageLoading(true);

      if (useMockData) {
        setSupportTicketsData(mockSupportTicketsData);
        return;
      }

      // Use the service function to avoid response body conflicts
      const data = await getSupportTickets({ quiet: true });

      // Calculate real support ticket stats
      const total = data?.length || 0;
      const open = data?.filter(t => t.status === 'open').length || 0;
      const inProgress = data?.filter(t => t.status === 'in_progress').length || 0;
      const resolved = data?.filter(t => t.status === 'resolved').length || 0;

      // Calculate this week's tickets
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const thisWeek = data?.filter(t => new Date(t.created_at) > oneWeekAgo).length || 0;

      // Calculate average resolution time (in hours)
      const resolvedTickets = data?.filter(t => t.status === 'resolved' && t.resolved_at);
      const averageResolutionTime = resolvedTickets?.length > 0
        ? resolvedTickets.reduce((acc, ticket) => {
          const created = new Date(ticket.created_at);
          const resolved = new Date(ticket.resolved_at);
          const hours = (resolved - created) / (1000 * 60 * 60);
          return acc + hours;
        }, 0) / resolvedTickets.length
        : 0;

      setSupportTicketsData({
        total,
        open,
        inProgress,
        resolved,
        thisWeek,
        averageResolutionTime: Math.round(averageResolutionTime * 10) / 10
      });
      clearDomainError('supportTickets');
    } catch (error) {
      markDomainError('supportTickets', error);
      setSupportTicketsData(null);
    } finally {
      setPageLoading(false);
    }
  }, [clearDomainError, markDomainError, useMockData]);

  const fetchInsurancePolicies = useCallback(async () => {
    try {
      setPageLoading(true);

      if (useMockData) {
        setInsurancePolicies([]);
        setInsurancePageStats(null);
        return;
      }

      const page = await getInsurancePage({ limit: 10, quiet: true });
      setInsurancePolicies(page.data || []);
      setInsurancePageStats(page.stats || null);
      clearDomainError('insurance');

    } catch (error) {
      markDomainError('insurance', error);
      setInsurancePolicies([]);
      setInsurancePageStats(null);
    } finally {
      setPageLoading(false);
    }
  }, [clearDomainError, markDomainError, useMockData]);

  const fetchWalletData = useCallback(async () => {
    try {
      if (!user || !profile) return;
      setPageLoading(true);

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
      setPageLoading(false);
    }
  }, [clearDomainError, isAdmin, markDomainError, profile, user]);

  const fetchActivityData = useCallback(async () => {
    try {
      setPageLoading(true);
      if (useMockData) {
        setActivityData([]);
        return;
      }
      const data = await getRecentActivity();
      setActivityData(data || []);
    } catch (error) {
      console.error('Error fetching activity data:', error);
      setActivityData([]);
    } finally {
      setPageLoading(false);
    }
  }, [useMockData]);

  const fetchPricingData = useCallback(async () => {
    try {
      setPageLoading(true);
      if (useMockData) return;

      const [services, rooms] = await Promise.all([
        getPricing('services'),
        getPricing('rooms')
      ]);

      setServicePricing(services || []);
      setRoomPricing(rooms || []);
      clearDomainError('pricing');
    } catch (error) {
      markDomainError('pricing', error);
      setServicePricing([]);
      setRoomPricing([]);
    } finally {
      setPageLoading(false);
    }
  }, [clearDomainError, markDomainError, useMockData]);

  const fetchOrganizationsData = useCallback(async () => {
    try {
      setPageLoading(true);
      if (useMockData) return;

      const data = await getOrganizations({ quiet: true });
      const active = data?.filter(o => o.is_active).length || 0;
      const totalWallet = data?.reduce((acc, curr) => acc + (curr.wallet_balance || 0), 0) || 0;

      setOrganizationsData({
        organizations: data || [],
        stats: { total: data?.length || 0, active, totalWallet }
      });
      clearDomainError('organizations');
    } catch (error) {
      markDomainError('organizations', error);
      setOrganizationsData({ organizations: [], stats: null });
    } finally {
      setPageLoading(false);
    }
  }, [clearDomainError, markDomainError, useMockData]);

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
      supportTickets: fetchSupportTicketsData,
      analytics: fetchAnalyticsData,
      verification: fetchVerificationData,
      doctors: fetchDoctorsData,
      hospitals: fetchHospitalsData,
      ambulances: fetchAmbulancesData,
      users: fetchUsersData,
      wallet: fetchWalletData,
      pricing: fetchPricingData,
      insurance: fetchInsurancePolicies,
      organizations: fetchOrganizationsData
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
    fetchHospitalsData,
    fetchAmbulancesData,
    fetchUsersData,
    fetchSupportTicketsData,
    fetchInsurancePolicies,
    fetchWalletData,
    fetchPricingData,
    fetchOrganizationsData
  ]);

  // Real-time subscription for emergency data
  useEffect(() => {
    if (!user || useMockData || !startupDomains.includes('emergency')) return;

    const channel = supabase
      .channel('emergency_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'emergency_requests' },
        fetchEmergencyData
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user, useMockData, startupDomains, fetchEmergencyData]);

  // Real-time subscription for doctors data
  useEffect(() => {
    if (!user || useMockData || !startupDomains.includes('doctors')) return;

    const channel = supabase
      .channel('doctor_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'doctors' },
        fetchDoctorsData
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user, useMockData, startupDomains, fetchDoctorsData]);

  // Real-time subscription for visits data
  useEffect(() => {
    if (!user || useMockData || !startupDomains.includes('visits')) return;

    const channel = supabase
      .channel('visit_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'visits' },
        fetchVisitsData
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user, useMockData, startupDomains, fetchVisitsData]);

  // Real-time subscription for insurance policies
  useEffect(() => {
    if (!user || useMockData || !startupDomains.includes('insurance')) return;

    const channel = supabase
      .channel('insurance_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'insurance_policies' },
        fetchInsurancePolicies
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user, useMockData, startupDomains, fetchInsurancePolicies]);

  // Real-time subscription for verification data and user data
  useEffect(() => {
    if (
      !user ||
      useMockData ||
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
  }, [user, useMockData, startupDomains, fetchVerificationData, fetchUsersData]);

  // Real-time subscription for organizations
  useEffect(() => {
    if (!user || useMockData || !startupDomains.includes('organizations')) return;

    const channel = supabase
      .channel('organization_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'organizations' },
        fetchOrganizationsData
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user, useMockData, startupDomains, fetchOrganizationsData]);

  // Real-time subscription for pricing
  useEffect(() => {
    if (!user || useMockData || !startupDomains.includes('pricing')) return;

    const channel = supabase
      .channel('pricing_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'service_pricing' },
        fetchPricingData
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'room_pricing' },
        fetchPricingData
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user, useMockData, startupDomains, fetchPricingData]);

  // Debounced fetch functions for real-time updates
  const debouncedFetchSupportTickets = useCallback(() => {
    if (supportTicketsTimeoutRef.current) {
      clearTimeout(supportTicketsTimeoutRef.current);
    }
    supportTicketsTimeoutRef.current = setTimeout(() => {
      fetchSupportTicketsData();
    }, DEBOUNCE_DELAY);
  }, [fetchSupportTicketsData]);

  // Real-time subscription for support tickets data
  useEffect(() => {
    if (!user || useMockData || !startupDomains.includes('supportTickets')) return;

    const channel = supabase
      .channel('support_tickets_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'support_tickets' },
        debouncedFetchSupportTickets
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user, useMockData, startupDomains, debouncedFetchSupportTickets]);

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
    const critical = safeData.filter(req => req.service_type === 'critical_care').length;
    const emergency = safeData.filter(req => req.service_type === 'emergency_room').length;
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
      critical,
      emergency,
      pending_approval,
      pending: pending_approval,
      inProgress,
      accepted,
      arrived,
      completed,
      active
    };
  }, [emergencyData]);

  const verificationStats = useMemo(() => {
    const safeData = Array.isArray(verificationData) ? verificationData : [];

    const high = safeData.filter(req => req.priority === 'high').length;
    const critical = safeData.filter(req => req.priority === 'critical').length;
    const pending = safeData.filter(req => req.status === 'pending').length;
    const inProgress = safeData.filter(req => req.status === 'in_progress').length;

    return {
      total: safeData.length,
      critical,
      high,
      pending,
      inProgress,
      completed: safeData.filter(req => req.status === 'completed').length
    };
  }, [verificationData]);

  // Refresh all data
  const refreshAllData = useCallback(async () => {
    try {
      const taskMap = {
        emergency: fetchEmergencyData,
        visits: fetchVisitsData,
        supportTickets: fetchSupportTicketsData,
        analytics: fetchAnalyticsData,
        verification: fetchVerificationData,
        doctors: fetchDoctorsData,
        hospitals: fetchHospitalsData,
        ambulances: fetchAmbulancesData,
        users: fetchUsersData,
        wallet: fetchWalletData,
        pricing: fetchPricingData,
        insurance: fetchInsurancePolicies,
        organizations: fetchOrganizationsData
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
    fetchHospitalsData,
    fetchAmbulancesData,
    fetchUsersData,
    fetchSupportTicketsData,
    fetchInsurancePolicies,
    fetchWalletData,
    fetchPricingData,
    fetchOrganizationsData
  ]);

  const insuranceStats = useMemo(() => {
    if (insurancePageStats) {
      return {
        total: insurancePageStats.total || 0,
        active: insurancePageStats.active || 0,
        expired: insurancePageStats.expired || 0,
        pending: insurancePageStats.pending || 0,
        verified: insurancePageStats.verified || 0,
        verificationRate: insurancePageStats.total > 0
          ? Math.round(((insurancePageStats.verified || 0) / insurancePageStats.total) * 100)
          : 0,
      };
    }

    const policies = insurancePolicies || [];
    const active = policies.filter(p => p.status === 'active').length;
    const expired = policies.filter(p => p.status === 'expired').length;
    const pending = policies.filter(p => p.status === 'pending').length;

    // Calculate verified ratio
    const verified = policies.filter(p => p.verified).length;
    const verificationRate = policies.length > 0 ? Math.round((verified / policies.length) * 100) : 0;

    return {
      total: policies.length,
      active,
      expired,
      pending,
      verified,
      verificationRate
    };
  }, [insurancePageStats, insurancePolicies]);

  const getEmergencyStats = useCallback(() => emergencyStats, [emergencyStats]);
  const getInsuranceStats = useCallback(() => insuranceStats, [insuranceStats]);

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
    supportTicketsData,
    activityData,
    userData,
    hospitalsData,
    ambulancesData,
    // Add insurance data directly to value so it's accessible
    insurance: insurancePolicies,
    insuranceStats,
    walletData,
    organizationsData,
    servicePricing,
    roomPricing,
    domainErrors,

    // Loading states
    loading: pageLoading,
    useMockData,

    // Mock data for reference
    mockData: {
      emergency: mockEmergencyData,
      analytics: mockAnalyticsData,
      doctors: mockDoctorsData,
      visits: mockVisitsData,
      verification: mockVerificationData,
      supportTickets: mockSupportTicketsData,
      insurance: [] // Mock insurance data
    }
  }), [
    emergencyData,
    emergencyStats,
    analyticsData,
    doctorsData,
    visitsData,
    verificationData,
    supportTicketsData,
    activityData,
    userData,
    hospitalsData,
    ambulancesData,
    insurancePolicies,
    insurancePageStats,
    insuranceStats,
    walletData,
    organizationsData,
    servicePricing,
    roomPricing,
    domainErrors,
    pageLoading,
    useMockData
  ]);

  // Memoize methods separately (they're stable due to useCallback)
  const methodsValue = useMemo(() => ({
    fetchEmergencyData,
    fetchVerificationData,
    fetchAnalyticsData,
    fetchDoctorsData,
    fetchVisitsData,
    fetchHospitalsData,
    fetchAmbulancesData,
    fetchUsersData,
    fetchSupportTicketsData,
    fetchInsurancePolicies,
    fetchActivityData,
    fetchWalletData,
    getEmergencyStats,
    getInsuranceStats,
    refreshAllData
  }), [
    fetchEmergencyData,
    fetchVerificationData,
    fetchAnalyticsData,
    fetchDoctorsData,
    fetchVisitsData,
    fetchHospitalsData,
    fetchAmbulancesData,
    fetchUsersData,
    fetchSupportTicketsData,
    fetchInsurancePolicies,
    fetchActivityData,
    fetchWalletData,
    getEmergencyStats,
    getInsuranceStats,
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
