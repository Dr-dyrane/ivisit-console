import React, { useState, useEffect, useCallback } from 'react';
import { supabase, subscribeToTable } from '../../lib/supabase';
import { StatsCard } from '../dashboard/StatsCard';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Activity, Users, Ambulance, Hospital, Clock, TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { usePageHeader } from '../../contexts/LayoutContext';
import { Button } from '../ui/button';
import { RefreshCw } from 'lucide-react';

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



  const fetchStats = useCallback(async () => {
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
        .in('status', ['pending_approval', 'in_progress', 'accepted', 'arrived']);

      setStats({
        totalRequests: requestsRes.count || 0,
        activeRequests: activeRequests.count || 0,
        totalUsers: usersRes.count || 0,
        totalHospitals: hospitalsRes.count || 0,
        totalAmbulances: ambulancesRes.count || 0,
        avgResponseTime: null,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, []);

  const fetchRecentRequests = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('emergency_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentRequests(data || []);
    } catch (error) {
      console.error('Error fetching recent requests:', error);
    }
  }, []);

  const generateChartData = useCallback(() => {
    setChartData([]);
  }, []);

  useEffect(() => {
    fetchStats();
    fetchRecentRequests();
    generateChartData();

    const unsubscribe = subscribeToTable('emergency_requests', () => {
      fetchStats();
      fetchRecentRequests();
    });

    return () => unsubscribe();
  }, [fetchStats, fetchRecentRequests, generateChartData]);

  const headerActions = React.useMemo(() => (
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        fetchStats();
        fetchRecentRequests();
      }}
      className="bg-card/70 h-9 px-4 text-[10px] font-bold tracking-widest uppercase"
    >
      <RefreshCw className="h-4 w-4 mr-2" />
      RELOAD
    </Button>
  ), [fetchStats, fetchRecentRequests]);

  usePageHeader("Dashboard Overview", headerActions);


  return (
    <div className="min-h-screen py-6 md:py-8">
      <div className="space-y-6 animate-fadeIn">
        <div className="pt-2" />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Active Requests"
            value={stats.activeRequests}
            icon={Activity}
          />
          <StatsCard
            title="Total Users"
            value={stats.totalUsers}
            icon={Users}
          />
          <StatsCard
            title="Hospitals"
            value={stats.totalHospitals}
            icon={Hospital}
          />
          <StatsCard
            title="Fleet Size"
            value={stats.totalAmbulances}
            icon={Ambulance}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 rounded-card p-6 bg-background/35">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-medium">Emergency Requests Trend</h3>
                <p className="text-sm text-muted-foreground">Last 7 days performance</p>
              </div>
            </div>

            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300} minWidth={300}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '2px solid hsl(var(--border))',
                      borderRadius: '1rem'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="requests"
                    stroke="hsl(var(--primary))"
                    fillOpacity={1}
                    fill="url(#colorRequests)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px]">
                <p className="text-sm text-muted-foreground">Historical data will appear after 30 days of operation.</p>
              </div>
            )}
          </Card>

          <Card className="rounded-card p-6 bg-background/35">
            <h3 className="text-lg font-medium mb-6 flex items-center justify-between">
              Quick Stats
              <Clock className="h-5 w-5 text-muted-foreground" />
            </h3>

            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Avg Response Time</span>
                  <span className="text-2xl font-semibold text-success">
                    {stats.avgResponseTime != null ? `${stats.avgResponseTime}m` : '—'}
                  </span>
                </div>
                {/* Progress bar requires real response time data */}
                <div className="w-full h-2 bg-muted rounded-pill overflow-hidden">
                  <motion.div
                    className="h-full bg-success rounded-pill"
                    initial={{ width: 0 }}
                    animate={{ width: '0%' }}
                    transition={{ duration: 1, delay: 0.2 }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Success Rate</span>
                  <span className="text-2xl font-semibold text-primary">—</span>
                </div>
                {/* Progress bar requires real success rate data */}
                <div className="w-full h-2 bg-muted rounded-pill overflow-hidden">
                  <motion.div
                    className="h-full bg-primary rounded-pill"
                    initial={{ width: 0 }}
                    animate={{ width: '0%' }}
                    transition={{ duration: 1, delay: 0.4 }}
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>

        <Card className="rounded-card p-6 bg-background/35">
          <h3 className="text-lg font-medium mb-4">Recent Emergency Requests</h3>
          <div className="space-y-3">
            {recentRequests.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No recent requests</p>
            ) : (
              recentRequests.map((request, index) => (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-4 rounded-card bg-muted/50 hover:bg-muted transition-smooth"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-pill bg-primary/10 flex items-center justify-center">
                      <Activity className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-normal">
                        {request.patient_snapshot?.fullName || request.patient_name || 'Unknown Patient'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {request.hospital_name || 'Hospital not assigned'}
                      </p>
                    </div>
                  </div>
                  <Badge className={`squircle ${getStatusColor(request.status)}`}>
                    {request.status}
                  </Badge>
                </motion.div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

function getStatusColor(status) {
  const colors = {
    pending_approval: 'bg-warning/20 text-warning',
    pending: 'bg-warning/20 text-warning',
    accepted: 'bg-info/20 text-info',
    arrived: 'bg-secondary/20 text-secondary',
    in_progress: 'bg-primary/20 text-primary',
    completed: 'bg-success/20 text-success',
    cancelled: 'bg-muted text-muted-foreground',
    payment_declined: 'bg-destructive/20 text-destructive',
  };
  return colors[status] || colors.pending;
}
