import React, { useState, useEffect } from 'react';
import { supabase, subscribeToTable } from '../../lib/supabase';
import { StatsCard } from '../dashboard/StatsCard';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Activity, Users, Ambulance, Hospital, Clock, TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';

export const Overview = () => {
  const [stats, setStats] = useState({
    totalRequests: 0,
    activeRequests: 0,
    totalUsers: 0,
    totalHospitals: 0,
    totalAmbulances: 0,
    avgResponseTime: 0,
  });
  
  const [recentRequests, setRecentRequests] = useState([]);
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    fetchStats();
    fetchRecentRequests();
    generateChartData();

    const unsubscribe = subscribeToTable('emergency_requests', () => {
      fetchStats();
      fetchRecentRequests();
    });

    return () => unsubscribe();
  }, []);

  const fetchStats = async () => {
    try {
      const [requestsRes, usersRes, hospitalsRes, ambulancesRes] = await Promise.all([
        supabase.from('emergency_requests').select('*', { count: 'exact' }),
        supabase.from('profiles').select('*', { count: 'exact' }),
        supabase.from('hospitals').select('*', { count: 'exact' }),
        supabase.from('ambulances').select('*', { count: 'exact' }),
      ]);

      const activeRequests = await supabase
        .from('emergency_requests')
        .select('*', { count: 'exact' })
        .in('status', ['pending', 'accepted', 'in_progress']);

      setStats({
        totalRequests: requestsRes.count || 0,
        activeRequests: activeRequests.count || 0,
        totalUsers: usersRes.count || 0,
        totalHospitals: hospitalsRes.count || 0,
        totalAmbulances: ambulancesRes.count || 0,
        avgResponseTime: 12.5,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchRecentRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('emergency_requests')
        .select(`
          *,
          patient:profiles!emergency_requests_user_id_fkey(username, avatar_url),
          hospital:hospitals(name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentRequests(data || []);
    } catch (error) {
      console.error('Error fetching recent requests:', error);
    }
  };

  const generateChartData = () => {
    const data = [
      { name: 'Mon', requests: 12, completed: 10 },
      { name: 'Tue', requests: 19, completed: 17 },
      { name: 'Wed', requests: 15, completed: 14 },
      { name: 'Thu', requests: 22, completed: 20 },
      { name: 'Fri', requests: 18, completed: 16 },
      { name: 'Sat', requests: 25, completed: 23 },
      { name: 'Sun', requests: 20, completed: 18 },
    ];
    setChartData(data);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-3xl font-bold mb-2">Dashboard Overview</h1>
        <p className="text-muted-foreground">Monitor emergency response operations in real-time</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Active Requests"
          value={stats.activeRequests}
          change="+12%"
          icon={Activity}
          trend="up"
        />
        <StatsCard
          title="Total Users"
          value={stats.totalUsers}
          change="+8%"
          icon={Users}
          trend="up"
        />
        <StatsCard
          title="Hospitals"
          value={stats.totalHospitals}
          change="+5%"
          icon={Hospital}
          trend="up"
        />
        <StatsCard
          title="Fleet Size"
          value={stats.totalAmbulances}
          change="+3%"
          icon={Ambulance}
          trend="up"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 squircle-lg p-6 glass">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold">Emergency Requests Trend</h3>
              <p className="text-sm text-muted-foreground">Last 7 days performance</p>
            </div>
            <Badge variant="outline" className="squircle">
              <TrendingUp className="h-3 w-3 mr-1" />
              +15%
            </Badge>
          </div>
          
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              {filteredRequests.map((request) => (
                <AdvancedMarker
                  key={request.id}
                  position={{ lat: request.lat, lng: request.lng }}
                  onClick={() => setSelectedMarker({ type: 'request', data: request })}
                >
                  <div 
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: getStatusColor(request.status),
                      border: '3px solid white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.2)'
                    }}
                  >
                    <Activity style={{ width: '16px', height: '16px', color: 'white' }} />
                  </div>
                </AdvancedMarker>
              ))}

              {ambulances.map((ambulance) => (
                <AdvancedMarker
                  key={ambulance.id}
                  position={{ lat: ambulance.lat, lng: ambulance.lng }}
                  onClick={() => setSelectedMarker({ type: 'ambulance', data: ambulance })}
                >
                  <div 
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: '#10b981',
                      border: '3px solid white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.2)'
                    }}
                  >
                    <Ambulance style={{ width: '16px', height: '16px', color: 'white' }} />
                  </div>
                </AdvancedMarker>
              ))}
            </Map>
          </APIProvider>
        </Card>

        <div className="w-80 space-y-4">
          <Card className="squircle-lg p-6 glass">
            <h3 className="font-semibold mb-4">Live Statistics</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Active Emergencies</span>
                <Badge className="squircle bg-primary/20 text-primary">
                  {emergencyRequests.length}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Available Ambulances</span>
                <Badge className="squircle bg-success/20 text-success">
                  {ambulances.length}
                </Badge>
              </div>
            </div>
          </Card>

          <AnimatePresence>
            {selectedMarker && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
              >
                <Card className="squircle-lg p-6 glass">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="font-semibold">
                      {selectedMarker.type === 'request' ? 'Emergency Request' : 'Ambulance'}
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedMarker(null)}
                      className="squircle"
                    >
                      ×
                    </Button>
                  </div>

                  {selectedMarker.type === 'request' ? (
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Patient</p>
                        <p className="font-medium">{selectedMarker.data.patient?.username || 'Unknown'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Hospital</p>
                        <p className="font-medium">{selectedMarker.data.hospital?.name || 'Not assigned'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <Badge className={`squircle ${getStatusBadgeColor(selectedMarker.data.status)}`}>
                          {selectedMarker.data.status}
                        </Badge>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Call Sign</p>
                        <p className="font-medium">{selectedMarker.data.call_sign || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Type</p>
                        <p className="font-medium">{selectedMarker.data.type || 'Standard'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <Badge className="squircle bg-success/20 text-success">
                          Available
                        </Badge>
                      </div>
                    </div>
                  )}
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

function getStatusColor(status) {
  const colors = {
    pending: '#f59e0b',
    accepted: '#3b82f6',
    in_progress: '#e63946',
    completed: '#10b981',
  };
  return colors[status] || colors.pending;
}

function getStatusBadgeColor(status) {
  const colors = {
    pending: 'bg-warning/20 text-warning border-warning/30',
    accepted: 'bg-info/20 text-info border-info/30',
    in_progress: 'bg-primary/20 text-primary border-primary/30',
    completed: 'bg-success/20 text-success border-success/30',
  };
  return colors[status] || colors.pending;
}
