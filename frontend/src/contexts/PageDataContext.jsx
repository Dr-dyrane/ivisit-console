import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
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
import { getInsurancePolicies } from '../services/insurancePoliciesService';

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
  totalRequests: 156,
  avgResponseTime: 4.2,
  completionRate: 94,
  activeHospitals: 8,
  availableAmbulances: 12,
  onRouteAmbulances: 4
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
  const { user } = useAuth();
  const [emergencyData, setEmergencyData] = useState(mockEmergencyData);
  const [analyticsData, setAnalyticsData] = useState(mockAnalyticsData);
  const [doctorsData, setDoctorsData] = useState(mockDoctorsData);
  const [visitsData, setVisitsData] = useState(mockVisitsData);
  const [verificationData, setVerificationData] = useState(mockVerificationData);
  const [supportTicketsData, setSupportTicketsData] = useState(mockSupportTicketsData);
  const [insurancePolicies, setInsurancePolicies] = useState([]);
  const [activityData, setActivityData] = useState([]);
  const [userData, setUserData] = useState({ users: [], statistics: null });
  const [loading, setLoading] = useState({
    emergency: false,
    analytics: false,
    doctors: false,
    visits: false,
    verification: false,
    hospitals: false,
    ambulances: false,
    users: false,
    supportTickets: false,
    insurance: false,
    activity: false
  });
  const [hospitalsData, setHospitalsData] = useState({ stats: null, recent: [] });
  const [ambulancesData, setAmbulancesData] = useState({ stats: null, recent: [] });
  const [useMockData, setUseMockData] = useState(false);

  // Fetch emergency data
  // Fetch emergency data
  const fetchEmergencyData = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, emergency: true }));

      if (useMockData) {
        setEmergencyData(mockEmergencyData);
        return;
      }

      const data = await getEmergencyRequests();

      const total = data?.length || 0;
      const ambulance = data?.filter(r => r.service_type === 'ambulance').length || 0;
      const bed = data?.filter(r => r.service_type === 'bed').length || 0;
      const critical_care = data?.filter(r => r.service_type === 'critical_care').length || 0;
      const emergency_room = data?.filter(r => r.service_type === 'emergency_room').length || 0;
      const pending = data?.filter(r => r.status === 'pending').length || 0;
      const inProgress = data?.filter(r => r.status === 'in_progress').length || 0;
      const completed = data?.filter(r => r.status === 'completed').length || 0;

      setEmergencyData({
        stats: {
          total,
          ambulance,
          bed,
          critical_care,
          emergency_room,
          pending,
          inProgress,
          completed
        },
        recent: data?.slice(0, 10) || []
      });

    } catch (error) {
      console.error('Error fetching emergency data:', error);
      // Only fallback to mock if it's not an auth error, or maybe just show empty
      // setUseMockData(true); 
      setEmergencyData({ stats: { total: 0, ambulance: 0, bed: 0, critical_care: 0, emergency_room: 0, pending: 0, inProgress: 0, completed: 0 }, recent: [] });
    } finally {
      setLoading(prev => ({ ...prev, emergency: false }));
    }
  }, [useMockData]);

  const fetchVerificationData = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, verification: true }));

      if (useMockData) {
        setVerificationData(mockVerificationData);
        return;
      }

      // Try fetching verified stats via service (admin only)
      try {
        const stats = await getVerificationStats();
        setVerificationData(stats);
      } catch (authError) {
        // If not admin, we might just want to show nothing or limited data
        console.warn('Verification stats access restricted:', authError.message);
        setVerificationData({
          pending: 0,
          approved: 0,
          rejected: 0,
          total: 0
        });
      }
    } catch (error) {
      console.error('Error fetching verification data:', error);
      setVerificationData(mockVerificationData);
      // setUseMockData(true);
    } finally {
      setLoading(prev => ({ ...prev, verification: false }));
    }
  }, [useMockData]);

  const fetchDoctorsData = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, doctors: true }));

      if (useMockData) {
        setDoctorsData(mockDoctorsData);
        return;
      }

      const { data } = await getDoctors(); // RBAC enabled

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

    } catch (error) {
      console.error('Error fetching doctors data:', error);
      setDoctorsData(mockDoctorsData);
      // setUseMockData(true);
    } finally {
      setLoading(prev => ({ ...prev, doctors: false }));
    }
  }, [useMockData]);

  const fetchVisitsData = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, visits: true }));

      if (useMockData) {
        setVisitsData(mockVisitsData);
        return;
      }

      const data = await getVisits(); // RBAC enabled

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

    } catch (error) {
      console.error('Error fetching visits data:', error);
      setVisitsData(mockVisitsData);
    } finally {
      setLoading(prev => ({ ...prev, visits: false }));
    }
  }, [useMockData]);

  const fetchAnalyticsData = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, analytics: true }));

      if (useMockData) {
        setAnalyticsData(mockAnalyticsData);
        return;
      }

      // Use the consolidated analytics service which handles parallell fetching and caching with RBAC
      const fullAnalytics = await getAnalyticsData({ timeRange: 'all', includeRawData: true });

      // Transform for PageData context expected structure
      const transformedAnalytics = {
        totalRequests: fullAnalytics.totalEmergencies,
        avgResponseTime: fullAnalytics.avgResponseTime,
        completionRate: fullAnalytics.successRate,
        activeHospitals: fullAnalytics.totalHospitals,
        availableAmbulances: fullAnalytics.totalAmbulances,
        // Estimate if not available in summary
        onRouteAmbulances: Math.floor(fullAnalytics.totalAmbulances * 0.3),
      };

      setAnalyticsData(transformedAnalytics);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      setAnalyticsData(mockAnalyticsData);
    } finally {
      setLoading(prev => ({ ...prev, analytics: false }));
    }
  }, [useMockData]);

  const fetchHospitalsData = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, hospitals: true }));

      if (useMockData) return;

      const data = await getHospitals(); // RBAC enabled

      // Update analytics data with real hospital count (if not already handled by analytics fetch)
      // Note: We might want to keep analytics disjoint, but this updates component state

      const total = data?.length || 0;
      const available = data?.filter(h => h.status === 'available').length || 0;
      const full = data?.filter(h => h.status === 'full').length || 0;
      const busy = data?.filter(h => h.status === 'busy').length || 0;
      const verified = data?.filter(h => h.verified).length || 0;

      setHospitalsData({
        stats: { total, available, full, busy, verified },
        recent: data?.slice(0, 5) || []
      });
    } catch (error) {
      console.error('Error fetching hospitals data:', error);
    } finally {
      setLoading(prev => ({ ...prev, hospitals: false }));
    }
  }, [useMockData]);

  const fetchAmbulancesData = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, ambulances: true }));

      if (useMockData) return;

      const data = await getAmbulances(); // RBAC enabled

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
    } catch (error) {
      console.error('Error fetching ambulances data:', error);
    } finally {
      setLoading(prev => ({ ...prev, ambulances: false }));
    }
  }, [useMockData]);

  const fetchUsersData = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, users: true }));

      if (useMockData) {
        setUserData({ users: [], statistics: null });
        return;
      }

      // Try to fetch robust statistics (Server/Admin side)
      let serverStatistics = null;
      try {
        serverStatistics = await getUserStatistics();
      } catch (err) {
        // Not admin or generic error, ignore
      }

      // Fetch profiles accessible to this user
      const users = await getProfiles();

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

    } catch (error) {
      console.error('Error fetching users data:', error);
      setUserData({ users: [], statistics: null });
    } finally {
      setLoading(prev => ({ ...prev, users: false }));
    }
  }, [useMockData]);

  const fetchSupportTicketsData = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, supportTickets: true }));

      if (useMockData) {
        setSupportTicketsData(mockSupportTicketsData);
        return;
      }

      // Use the service function to avoid response body conflicts
      const data = await getSupportTickets();

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
    } catch (error) {
      console.error('Error fetching support tickets data:', error);
      setSupportTicketsData(mockSupportTicketsData);
      setUseMockData(true);
    } finally {
      setLoading(prev => ({ ...prev, supportTickets: false }));
    }
  }, [useMockData]);

  const fetchInsurancePolicies = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, insurance: true }));

      if (useMockData) {
        setInsurancePolicies([]);
        return;
      }

      const data = await getInsurancePolicies();
      setInsurancePolicies(data || []);

    } catch (error) {
      console.error('Error fetching insurance policies:', error);
      setInsurancePolicies([]);
    } finally {
      setLoading(prev => ({ ...prev, insurance: false }));
    }
  }, [useMockData]);

  // Fetch activity data
  const fetchActivityData = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, activity: true }));

      if (useMockData) {
        // Use mock activity data for now
        setActivityData([
          { id: 'mock-1', action: 'emergency_created', description: 'New emergency request from Victoria Island', time_ago: '2m ago' },
          { id: 'mock-2', action: 'emergency_completed', description: 'Emergency response completed - Lekki', time_ago: '15m ago' },
          { id: 'mock-3', action: 'provider_verified', description: 'New provider verified - Dr. Adebayo', time_ago: '1h ago' },
          { id: 'mock-4', action: 'ambulance_dispatched', description: 'Ambulance dispatched to Ikeja', time_ago: '2h ago' },
          { id: 'mock-5', action: 'system_backup', description: 'System backup completed successfully', time_ago: '3h ago' },
        ]);
        return;
      }

      const data = await getRecentActivity(20, 0);
      setActivityData(data || []);

    } catch (error) {
      console.error('Error fetching activity data:', error);
      setActivityData([]);
    } finally {
      setLoading(prev => ({ ...prev, activity: false }));
    }
  }, [useMockData]);

  // Initialize all data on mount
  useEffect(() => {
    fetchEmergencyData();
    fetchVerificationData();
    fetchAnalyticsData();
    fetchDoctorsData();
    fetchVisitsData();
    fetchHospitalsData();
    fetchAmbulancesData();
    fetchUsersData();
    fetchSupportTicketsData();
    fetchInsurancePolicies();
    fetchActivityData();
  }, [
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
    fetchActivityData
  ]);

  // Real-time subscription for emergency data
  useEffect(() => {
    fetchEmergencyData();

    if (!useMockData) {
      const channel = supabase
        .channel('emergency_changes')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'emergency_requests' },
          fetchEmergencyData
        )
        .subscribe();

      return () => supabase.removeChannel(channel);
    }
  }, [useMockData, fetchEmergencyData]);

  // Real-time subscription for doctors data
  useEffect(() => {
    if (!useMockData) {
      const channel = supabase
        .channel('doctor_changes')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'doctors' },
          fetchDoctorsData
        )
        .subscribe();

      return () => supabase.removeChannel(channel);
    }
  }, [useMockData, fetchDoctorsData]);

  // Real-time subscription for visits data
  useEffect(() => {
    if (!useMockData) {
      const channel = supabase
        .channel('visit_changes')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'visits' },
          fetchVisitsData
        )
        .subscribe();

      return () => supabase.removeChannel(channel);
    }
  }, [useMockData, fetchVisitsData]);

  // Real-time subscription for insurance policies
  useEffect(() => {
    if (!useMockData) {
      const channel = supabase
        .channel('insurance_changes')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'insurance_policies' },
          fetchInsurancePolicies
        )
        .subscribe();

      return () => supabase.removeChannel(channel);
    }
  }, [useMockData, fetchInsurancePolicies]);

  // Real-time subscription for verification data and user data
  useEffect(() => {
    fetchVerificationData();
    fetchUsersData();

    if (!useMockData) {
      const channel = supabase
        .channel('profile_changes')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'profiles' },
          () => {
            fetchVerificationData();
            fetchUsersData();
          }
        )
        .subscribe();

      return () => supabase.removeChannel(channel);
    }
  }, [useMockData, fetchVerificationData, fetchUsersData]);

  // Real-time subscription for support tickets data
  useEffect(() => {
    fetchSupportTicketsData();

    if (!useMockData) {
      const channel = supabase
        .channel('support_tickets_changes')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'support_tickets' },
          fetchSupportTicketsData
        )
        .subscribe();

      return () => supabase.removeChannel(channel);
    }
  }, [useMockData, fetchSupportTicketsData]);

  // Real-time subscription for activity data
  useEffect(() => {
    fetchActivityData();

    if (!useMockData) {
      const channel = supabase
        .channel('activity_changes')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'user_activity' },
          fetchActivityData
        )
        .subscribe();

      return () => supabase.removeChannel(channel);
    }
  }, [useMockData, fetchActivityData]);

  // Calculate emergency statistics
  const getEmergencyStats = () => {
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
    const pending = safeData.filter(req => req.status === 'pending').length;
    const inProgress = safeData.filter(req => req.status === 'in_progress').length;
    const completed = safeData.filter(req => req.status === 'completed').length;

    return {
      total: safeData.length,
      ambulance,
      bed,
      critical,
      emergency,
      pending,
      inProgress,
      completed
    };
  };

  const getVerificationStats = () => {
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
  };

  // Refresh all data
  const refreshAllData = useCallback(async () => {
    try {
      await Promise.all([
        fetchEmergencyData(),
        fetchVerificationData(),
        fetchAnalyticsData(),
        fetchDoctorsData(),
        fetchVisitsData(),
        fetchHospitalsData(),
        fetchAmbulancesData(),
        fetchUsersData(),
        fetchSupportTicketsData(),
        fetchInsurancePolicies(),
        fetchActivityData()
      ]);
    } catch (error) {
      console.error('Error refreshing all data:', error);
    }
  }, [
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
    fetchActivityData
  ]);

  const getInsuranceStats = () => {
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
  };

  const value = {
    // Data
    emergencyData,
    emergencyStats: getEmergencyStats(),
    analyticsData,
    doctorsData,
    doctorsStats: doctorsData.stats,
    visitsData,
    visitsStats: visitsData.stats,
    verificationData,
    supportTicketsData,
    activityData,
    userData,
    hospitalsData,
    ambulancesData,
    // Add insurance data directly to value so it's accessible
    insurance: insurancePolicies,

    // Loading states
    loading,
    useMockData,

    // Methods
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
    getEmergencyStats,
    getInsuranceStats,
    setUseMockData,
    refreshAllData,

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
  };

  return (
    <PageDataContext.Provider value={value}>
      {children}
    </PageDataContext.Provider>
  );
};
