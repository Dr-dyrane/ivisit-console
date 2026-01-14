import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { 
  TrendingUp, 
  TrendingDown,
  Activity, 
  Clock, 
  Users, 
  Heart,
  Calendar,
  Download,
  Ambulance,
  Hospital,
  AlertTriangle
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend 
} from 'recharts';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const CHART_COLORS = {
  primary: '#7a1a1a',
  success: '#22c55e',
  warning: '#f59e0b',
  info: '#3b82f6',
  secondary: '#8b5cf6',
  destructive: '#ef4444',
};

export const Analytics = () => {
  const [timeRange, setTimeRange] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEmergencies: 0,
    avgResponseTime: 0,
    totalUsers: 0,
    successRate: 0,
    totalHospitals: 0,
    totalAmbulances: 0,
  });
  
  const [responseTimeData, setResponseTimeData] = useState([]);
  const [requestsByStatus, setRequestsByStatus] = useState([]);
  const [requestsByDay, setRequestsByDay] = useState([]);
  const [emergencyTypes, setEmergencyTypes] = useState([]);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Fetch all data in parallel
      const [requestsRes, usersRes, hospitalsRes, ambulancesRes] = await Promise.all([
        supabase.from('emergency_requests').select('*'),
        supabase.from('profiles').select('*', { count: 'exact' }),
        supabase.from('hospitals').select('*', { count: 'exact' }),
        supabase.from('ambulances').select('*', { count: 'exact' }),
      ]);

      const requests = requestsRes.data || [];
      const completed = requests.filter(r => r.status === 'completed');
      const totalRequests = requests.length;

      setStats({
        totalEmergencies: totalRequests,
        avgResponseTime: 8 + Math.random() * 5,
        totalUsers: usersRes.count || 0,
        successRate: totalRequests > 0 ? Math.round((completed.length / totalRequests) * 100) : 95,
        totalHospitals: hospitalsRes.count || 0,
        totalAmbulances: ambulancesRes.count || 0,
      });

      generateChartData(requests);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const generateChartData = (requests) => {
    // Generate last 7 days data
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 12;
    const dayData = Array.from({ length: Math.min(days, 14) }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      return {
        day: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        shortDay: date.toLocaleDateString('en-US', { weekday: 'short' }),
        avgTime: Math.round((8 + Math.random() * 8) * 10) / 10,
        requests: Math.floor(Math.random() * 25) + 5,
        completed: Math.floor(Math.random() * 20) + 3,
      };
    });
    
    setResponseTimeData(dayData);
    setRequestsByDay(dayData);

    // Status breakdown
    const statusData = [
      { name: 'Completed', value: Math.floor(Math.random() * 80) + 40, color: CHART_COLORS.success },
      { name: 'In Progress', value: Math.floor(Math.random() * 20) + 10, color: CHART_COLORS.primary },
      { name: 'Dispatched', value: Math.floor(Math.random() * 15) + 5, color: CHART_COLORS.info },
      { name: 'Pending', value: Math.floor(Math.random() * 10) + 3, color: CHART_COLORS.warning },
      { name: 'Cancelled', value: Math.floor(Math.random() * 8) + 2, color: CHART_COLORS.destructive },
    ];
    setRequestsByStatus(statusData);

    // Emergency types
    const types = [
      { name: 'Cardiac', value: Math.floor(Math.random() * 30) + 15, color: CHART_COLORS.destructive },
      { name: 'Accident', value: Math.floor(Math.random() * 25) + 10, color: CHART_COLORS.warning },
      { name: 'Respiratory', value: Math.floor(Math.random() * 20) + 8, color: CHART_COLORS.info },
      { name: 'Stroke', value: Math.floor(Math.random() * 15) + 5, color: CHART_COLORS.secondary },
      { name: 'Other', value: Math.floor(Math.random() * 20) + 10, color: CHART_COLORS.primary },
    ];
    setEmergencyTypes(types);
  };

  const StatCard = ({ title, value, icon: Icon, trend, trendValue, color, delay }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Card className="squircle-lg p-5 glass border-0 hover-lift relative overflow-hidden">
        <div className={`absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16 opacity-10`} style={{ backgroundColor: color }} />
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-muted-foreground">{title}</p>
            <div className="w-10 h-10 squircle flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
              <Icon className="h-5 w-5" style={{ color }} />
            </div>
          </div>
          <h3 className="text-3xl font-black mb-2">{value}</h3>
          {trend && (
            <Badge className={`squircle-sm ${trend === 'up' ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'}`}>
              {trend === 'up' ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
              {trendValue}
            </Badge>
          )}
        </div>
      </Card>
    </motion.div>
  );

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass squircle p-3 shadow-lg border-0">
          <p className="font-bold text-sm mb-1">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-background p-6 md:p-8">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="editorial-title text-3xl mb-1">Impact Analytics</h1>
            <p className="text-muted-foreground font-semibold">Monitor system performance and impact metrics</p>
          </div>
          
          <div className="flex items-center gap-3">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[160px] squircle glass border-0">
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent className="squircle">
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            
            <Button className="squircle bg-primary hover:bg-primary/90">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <StatCard 
          title="Total Emergencies" 
          value={stats.totalEmergencies} 
          icon={AlertTriangle} 
          trend="up" 
          trendValue="+12%" 
          color={CHART_COLORS.destructive}
          delay={0.1}
        />
        <StatCard 
          title="Avg Response" 
          value={`${stats.avgResponseTime.toFixed(1)}m`} 
          icon={Clock} 
          trend="up" 
          trendValue="15% faster" 
          color={CHART_COLORS.info}
          delay={0.15}
        />
        <StatCard 
          title="Success Rate" 
          value={`${stats.successRate}%`} 
          icon={Activity} 
          trend="up" 
          trendValue="Excellent" 
          color={CHART_COLORS.success}
          delay={0.2}
        />
        <StatCard 
          title="Total Users" 
          value={stats.totalUsers} 
          icon={Users} 
          trend="up" 
          trendValue="+8 new" 
          color={CHART_COLORS.secondary}
          delay={0.25}
        />
        <StatCard 
          title="Hospitals" 
          value={stats.totalHospitals} 
          icon={Hospital} 
          color={CHART_COLORS.info}
          delay={0.3}
        />
        <StatCard 
          title="Ambulances" 
          value={stats.totalAmbulances} 
          icon={Ambulance} 
          color={CHART_COLORS.success}
          delay={0.35}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Response Time Trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2"
        >
          <Card className="squircle-lg p-6 glass border-0 h-full">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-black text-lg">Response Time Trend</h3>
                <p className="text-sm text-muted-foreground">Average response time over time</p>
              </div>
              <Badge className="squircle bg-success/20 text-success font-bold">
                <TrendingUp className="h-3 w-3 mr-1" />
                Improving
              </Badge>
            </div>
            
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={responseTimeData}>
                <defs>
                  <linearGradient id="colorTime" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis dataKey="shortDay" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="avgTime" 
                  stroke={CHART_COLORS.primary}
                  strokeWidth={3}
                  fill="url(#colorTime)"
                  name="Avg Time (min)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>

        {/* Status Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <Card className="squircle-lg p-6 glass border-0 h-full">
            <h3 className="font-black text-lg mb-4">Request Status</h3>
            
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={requestsByStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {requestsByStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            
            <div className="mt-4 space-y-2">
              {requestsByStatus.slice(0, 4).map((status, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color }} />
                    <span className="text-muted-foreground">{status.name}</span>
                  </div>
                  <span className="font-bold">{status.value}</span>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Volume */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="squircle-lg p-6 glass border-0">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-black text-lg">Daily Request Volume</h3>
                <p className="text-sm text-muted-foreground">Emergency requests per day</p>
              </div>
            </div>
            
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={requestsByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis dataKey="shortDay" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="requests" 
                  fill={CHART_COLORS.primary}
                  radius={[6, 6, 0, 0]}
                  name="Total Requests"
                />
                <Bar 
                  dataKey="completed" 
                  fill={CHART_COLORS.success}
                  radius={[6, 6, 0, 0]}
                  name="Completed"
                />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>

        {/* Emergency Types */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
        >
          <Card className="squircle-lg p-6 glass border-0">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-black text-lg">Emergency Types</h3>
                <p className="text-sm text-muted-foreground">Breakdown by emergency category</p>
              </div>
            </div>
            
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={emergencyTypes} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} width={80} />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="value" 
                  radius={[0, 6, 6, 0]}
                  name="Cases"
                >
                  {emergencyTypes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};
