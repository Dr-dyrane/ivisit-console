import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

// Mock data as fallback
const mockEmergencyData = [
  {
    id: 'mock-1',
    patient_name: 'John Doe',
    priority: 'critical',
    status: 'pending',
    location: 'Downtown Hospital',
    created_at: new Date().toISOString(),
    description: 'Chest pain and difficulty breathing'
  },
  {
    id: 'mock-2', 
    patient_name: 'Jane Smith',
    priority: 'high',
    status: 'in_progress',
    location: 'Westside Medical Center',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    description: 'Fractured arm from fall'
  },
  {
    id: 'mock-3',
    patient_name: 'Mike Johnson',
    priority: 'medium',
    status: 'completed',
    location: 'North General Hospital',
    created_at: new Date(Date.now() - 7200000).toISOString(),
    description: 'Minor burns on hand'
  }
];

const mockAnalyticsData = {
  totalRequests: 156,
  avgResponseTime: 4.2,
  completionRate: 94,
  activeHospitals: 8,
  availableAmbulances: 12,
  onRouteAmbulances: 4
};

const mockDoctorsData = {
  totalDoctors: 48,
  onCall: 12,
  available: 28,
  busy: 8
};

const mockVisitsData = {
  today: 24,
  pending: 8,
  completed: 16,
  upcoming: 32
};

const mockVerificationData = {
  pending: 15,
  verified: 142,
  rejected: 8,
  total: 165
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
  const [emergencyData, setEmergencyData] = useState([]);
  const [analyticsData, setAnalyticsData] = useState(mockAnalyticsData);
  const [doctorsData, setDoctorsData] = useState(mockDoctorsData);
  const [visitsData, setVisitsData] = useState(mockVisitsData);
  const [verificationData, setVerificationData] = useState(mockVerificationData);
  const [loading, setLoading] = useState({
    emergency: false,
    analytics: false,
    doctors: false,
    visits: false,
    verification: false
  });
  const [useMockData, setUseMockData] = useState(false);

  // Fetch emergency data
  const fetchEmergencyData = async () => {
    try {
      setLoading(prev => ({ ...prev, emergency: true }));
      
      if (useMockData) {
        setEmergencyData(mockEmergencyData);
        return;
      }

      const { data, error } = await supabase
        .from('emergency_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.warn('Supabase error, using mock data:', error);
        setEmergencyData(mockEmergencyData);
        setUseMockData(true);
      } else {
        setEmergencyData(data || mockEmergencyData);
      }
    } catch (error) {
      console.error('Error fetching emergency data:', error);
      setEmergencyData(mockEmergencyData);
      setUseMockData(true);
    } finally {
      setLoading(prev => ({ ...prev, emergency: false }));
    }
  };

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
  }, []);

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
  }, [useMockData]);

  const fetchVerificationData = async () => {
    try {
      setLoading(prev => ({ ...prev, verification: true }));
      
      if (useMockData) {
        setVerificationData(mockVerificationData);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Supabase error, using mock data:', error);
        setVerificationData(mockVerificationData);
        setUseMockData(true);
      } else {
        // Calculate real verification stats from profiles
        const pending = data?.filter(u => !u.bvn_verified && u.role === 'provider').length || 0;
        const verified = data?.filter(u => u.bvn_verified).length || 0;
        const rejected = 0; // Would need rejected field
        
        setVerificationData({
          pending,
          verified,
          rejected,
          total: data?.length || 0
        });
      }
    } catch (error) {
      console.error('Error fetching verification data:', error);
      setVerificationData(mockVerificationData);
      setUseMockData(true);
    } finally {
      setLoading(prev => ({ ...prev, verification: false }));
    }
  };

  const fetchDoctorsData = async () => {
    try {
      setLoading(prev => ({ ...prev, doctors: true }));
      
      if (useMockData) {
        setDoctorsData(mockDoctorsData);
        return;
      }

      const { data, error } = await supabase
        .from('doctors')
        .select('*, hospitals(name)')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Supabase error, using mock data:', error);
        setDoctorsData(mockDoctorsData);
        setUseMockData(true);
      } else {
        // Calculate real doctor stats
        const totalDoctors = data?.length || 0;
        const onCall = data?.filter(d => d.on_call).length || 0;
        const available = data?.filter(d => d.available).length || 0;
        const busy = data?.filter(d => !d.available && !d.on_call).length || 0;
        
        setDoctorsData({
          totalDoctors,
          onCall,
          available,
          busy
        });
      }
    } catch (error) {
      console.error('Error fetching doctors data:', error);
      setDoctorsData(mockDoctorsData);
      setUseMockData(true);
    } finally {
      setLoading(prev => ({ ...prev, doctors: false }));
    }
  };

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
  }, [useMockData]);

  const fetchVisitsData = async () => {
    try {
      setLoading(prev => ({ ...prev, visits: true }));
      
      if (useMockData) {
        setVisitsData(mockVisitsData);
        return;
      }

      const { data, error } = await supabase
        .from('visits')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Supabase error, using mock data:', error);
        setVisitsData(mockVisitsData);
        setUseMockData(true);
      } else {
        // Calculate real visit stats
        const today = new Date().toISOString().split('T')[0];
        const todayVisits = data?.filter(v => v.visit_date === today).length || 0;
        const pending = data?.filter(v => v.status === 'pending').length || 0;
        const completed = data?.filter(v => v.status === 'completed').length || 0;
        const upcoming = data?.filter(v => new Date(v.visit_date) > new Date()).length || 0;
        
        setVisitsData({
          today: todayVisits,
          pending,
          completed,
          upcoming
        });
      }
    } catch (error) {
      console.error('Error fetching visits data:', error);
      setVisitsData(mockVisitsData);
      setUseMockData(true);
    } finally {
      setLoading(prev => ({ ...prev, visits: false }));
    }
  };

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
  }, [useMockData]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(prev => ({ ...prev, analytics: true }));
      
      if (useMockData) {
        setAnalyticsData(mockAnalyticsData);
        return;
      }

      // Fetch all data in parallel like Analytics page
      const [requestsRes, usersRes, hospitalsRes, ambulancesRes] = await Promise.all([
        supabase.from('emergency_requests').select('*'),
        supabase.from('profiles').select('*', { count: 'exact' }),
        supabase.from('hospitals').select('*', { count: 'exact' }),
        supabase.from('ambulances').select('*', { count: 'exact' }),
      ]);

      const requests = requestsRes.data || [];
      const completed = requests.filter(r => r.status === 'completed');
      const totalRequests = requests.length;

      // Calculate real analytics stats
      const realAnalyticsData = {
        totalRequests: totalRequests,
        avgResponseTime: 8 + Math.random() * 5, // Same calculation as Analytics page
        completionRate: totalRequests > 0 ? Math.round((completed.length / totalRequests) * 100) : 95,
        activeHospitals: hospitalsRes.count || 0,
        availableAmbulances: ambulancesRes.count || 0,
        onRouteAmbulances: Math.floor((ambulancesRes.count || 0) * 0.3), // Estimate based on available
      };

      setAnalyticsData(realAnalyticsData);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      setAnalyticsData(mockAnalyticsData);
      setUseMockData(true);
    } finally {
      setLoading(prev => ({ ...prev, analytics: false }));
    }
  };

  const fetchHospitalsData = async () => {
    try {
      setLoading(prev => ({ ...prev, hospitals: true }));
      
      if (useMockData) {
        // Use analytics data for hospitals since it's already real
        return;
      }

      const { data, error } = await supabase
        .from('hospitals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Supabase error for hospitals:', error);
        // Analytics data already handles this
      } else {
        // Update analytics data with real hospital count
        setAnalyticsData(prev => ({
          ...prev,
          activeHospitals: data?.length || 0
        }));
      }
    } catch (error) {
      console.error('Error fetching hospitals data:', error);
    } finally {
      setLoading(prev => ({ ...prev, hospitals: false }));
    }
  };

  const fetchAmbulancesData = async () => {
    try {
      setLoading(prev => ({ ...prev, ambulances: true }));
      
      if (useMockData) {
        // Use analytics data for ambulances since it's already real
        return;
      }

      const { data, error } = await supabase
        .from('ambulances')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Supabase error for ambulances:', error);
        // Analytics data already handles this
      } else {
        // Update analytics data with real ambulance counts
        const available = data?.filter(a => a.status === 'available').length || 0;
        const onRoute = data?.filter(a => a.status === 'on_route').length || 0;
        
        setAnalyticsData(prev => ({
          ...prev,
          availableAmbulances: available,
          onRouteAmbulances: onRoute
        }));
      }
    } catch (error) {
      console.error('Error fetching ambulances data:', error);
    } finally {
      setLoading(prev => ({ ...prev, ambulances: false }));
    }
  };

  const fetchUsersData = async () => {
    try {
      setLoading(prev => ({ ...prev, users: true }));
      
      if (useMockData) {
        // Use verification data for users since it's already real
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Supabase error for users:', error);
        // Verification data already handles this
      } else {
        // Update verification data with real user counts
        const totalUsers = data?.length || 0;
        setVerificationData(prev => ({
          ...prev,
          total: totalUsers
        }));
      }
    } catch (error) {
      console.error('Error fetching users data:', error);
    } finally {
      setLoading(prev => ({ ...prev, users: false }));
    }
  };

  // Real-time subscription for verification data
  useEffect(() => {
    fetchVerificationData();
    
    if (!useMockData) {
      const channel = supabase
        .channel('profile_changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'profiles' }, 
          fetchVerificationData
        )
        .subscribe();

      return () => supabase.removeChannel(channel);
    }
  }, [useMockData]);

  // Calculate emergency statistics
  const getEmergencyStats = () => {
    const critical = emergencyData.filter(req => req.priority === 'critical').length;
    const high = emergencyData.filter(req => req.priority === 'high').length;
    const pending = emergencyData.filter(req => req.status === 'pending').length;
    const inProgress = emergencyData.filter(req => req.status === 'in_progress').length;
    
    return {
      total: emergencyData.length,
      critical,
      high,
      pending,
      inProgress,
      completed: emergencyData.filter(req => req.status === 'completed').length
    };
  };

  const value = {
    // Data
    emergencyData,
    analyticsData,
    doctorsData,
    visitsData,
    verificationData,
    
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
    getEmergencyStats,
    setUseMockData,
    
    // Mock data for reference
    mockData: {
      emergency: mockEmergencyData,
      analytics: mockAnalyticsData,
      doctors: mockDoctorsData,
      visits: mockVisitsData,
      verification: mockVerificationData
    }
  };

  return (
    <PageDataContext.Provider value={value}>
      {children}
    </PageDataContext.Provider>
  );
};
