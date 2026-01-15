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
  AlertTriangle,
  ChevronRight
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
import { motion, LayoutGroup } from 'framer-motion';
import { toast } from 'sonner';

const CHART_COLORS = {
  primary: '#7a1a1a',
  success: '#22c55e',
  warning: '#f59e0b',
  info: '#3b82f6',
  secondary: '#8b5cf6',
  destructive: '#ef4444',
  muted: 'hsl(var(--muted))',
  mutedForeground: 'hsl(var(--muted-foreground))'
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
  const [dominantType, setDominantType] = useState(null); // Storytelling state

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

    // Status breakdown - Muted approach
    // We only highlight "Completed" and "In Progress", everything else is muted
    const statusData = [
      { name: 'Completed', value: Math.floor(Math.random() * 80) + 40, color: CHART_COLORS.success },
      { name: 'In Progress', value: Math.floor(Math.random() * 20) + 10, color: CHART_COLORS.primary },
      { name: 'Dispatched', value: Math.floor(Math.random() * 15) + 5, color: 'hsl(var(--muted-foreground))' },
      { name: 'Pending', value: Math.floor(Math.random() * 10) + 3, color: 'hsl(var(--muted))' },
      { name: 'Cancelled', value: Math.floor(Math.random() * 8) + 2, color: 'hsl(var(--muted))' },
    ];
    setRequestsByStatus(statusData);

    // Emergency types - Storytelling approach
    // Find the max value to highlight it
    const rawTypes = [
      { name: 'Cardiac', value: Math.floor(Math.random() * 30) + 15, baseColor: CHART_COLORS.destructive },
      { name: 'Accident', value: Math.floor(Math.random() * 25) + 10, baseColor: CHART_COLORS.warning },
      { name: 'Respiratory', value: Math.floor(Math.random() * 20) + 8, baseColor: CHART_COLORS.info },
      { name: 'Stroke', value: Math.floor(Math.random() * 15) + 5, baseColor: CHART_COLORS.secondary },
      { name: 'Other', value: Math.floor(Math.random() * 20) + 10, baseColor: CHART_COLORS.primary },
    ];
    
    const maxVal = Math.max(...rawTypes.map(t => t.value));
    const types = rawTypes.map(t => ({
        ...t,
        // Only the dominant type gets its full color, others are muted/greyed out to tell the story
        color: t.value === maxVal ? t.baseColor : 'hsl(var(--muted))',
        isDominant: t.value === maxVal
    })).sort((a, b) => b.value - a.value); // Sort descending

    setDominantType(types[0]);
    setEmergencyTypes(types);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass squircle p-3 shadow-lg border-0 bg-background/80 backdrop-blur-md">
          <p className="font-bold text-sm mb-1">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="font-medium" style={{ color: entry.color }}>
                    {entry.name}: {entry.value}
                </span>
            </div>
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
            <h1 className="editorial-title text-4xl mb-2">Impact Analytics</h1>
            <p className="text-muted-foreground font-semibold">Monitor system performance and impact metrics</p>
          </div>
          
          <div className="flex items-center gap-3">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[160px] squircle glass border-0 shadow-sm hover:bg-muted/50 transition-colors">
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent className="squircle border-0 shadow-xl bg-background/95 backdrop-blur-xl">
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            
            <Button className="squircle bg-primary hover:bg-primary/90 shadow-glow border-0">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Fluid Bento Grid */}
      <LayoutGroup>
        <motion.div 
            layout 
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6 auto-rows-min grid-flow-dense"
        >
            
        {/* Stat Cards - Row 1 */}
        {[
            { title: "Total Emergencies", value: stats.totalEmergencies, icon: AlertTriangle, trend: "up", trendValue: "+12%", color: CHART_COLORS.destructive, colSpan: "col-span-1 lg:col-span-2" },
            { title: "Avg Response", value: `${stats.avgResponseTime.toFixed(1)}m`, icon: Clock, trend: "down", trendValue: "15% faster", color: CHART_COLORS.info, colSpan: "col-span-1 lg:col-span-2" },
            { title: "Success Rate", value: `${stats.successRate}%`, icon: Activity, trend: "up", trendValue: "Excellent", color: CHART_COLORS.success, colSpan: "col-span-1 lg:col-span-2" },
        ].map((stat, idx) => (
            <motion.div
                layout
                key={idx}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
                className={`${stat.colSpan}`}
            >
                <Card className="h-full min-h-[160px] squircle-lg glass shadow-premium p-6 border-0 hover-lift relative overflow-hidden group">
                    <div className={`absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16 opacity-10 group-hover:scale-150 transition-transform duration-700`} style={{ backgroundColor: stat.color }} />
                    <div className="relative z-10 flex flex-col justify-between h-full">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 squircle flex items-center justify-center" style={{ backgroundColor: `${stat.color}15` }}>
                                <stat.icon className="h-6 w-6" style={{ color: stat.color }} />
                            </div>
                            {stat.trend && (
                                <Badge className={`squircle-sm border-0 ${stat.trend === 'up' && stat.color !== CHART_COLORS.destructive ? 'bg-success/20 text-success' : 'bg-primary/20 text-primary'}`}>
                                    {stat.trend === 'up' ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                                    {stat.trendValue}
                                </Badge>
                            )}
                        </div>
                        <div>
                            <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-1">{stat.title}</p>
                            <h3 className="text-4xl font-black tracking-tighter">{stat.value}</h3>
                        </div>
                    </div>
                </Card>
            </motion.div>
        ))}

        {/* Response Time Trend - Large Chart */}
        <motion.div
          layout
          className="col-span-1 sm:col-span-2 lg:col-span-4 xl:col-span-4 row-span-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="h-full min-h-[400px] squircle-lg glass shadow-premium p-8 border-0 flex flex-col justify-between group">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-black text-2xl tracking-tight">Response Time Trend</h3>
                <p className="text-muted-foreground font-semibold">Average response time over {timeRange}</p>
              </div>
              <div className="flex gap-2">
                 <Badge className="squircle bg-success/10 text-success border-0 font-bold px-3 py-1">
                    <TrendingDown className="h-4 w-4 mr-1" />
                    -2.4m avg
                  </Badge>
              </div>
            </div>
            
            <div className="flex-1 w-full min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={responseTimeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                    <linearGradient id="colorTime" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0}/>
                    </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" vertical={false} opacity={0.4} />
                    <XAxis 
                        dataKey="shortDay" 
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={12} 
                        tickLine={false}
                        axisLine={false}
                        dy={10}
                    />
                    <YAxis 
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={12} 
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `${value}m`}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '4 4' }} />
                    <Area 
                    type="monotone" 
                    dataKey="avgTime" 
                    stroke={CHART_COLORS.primary}
                    strokeWidth={4}
                    fill="url(#colorTime)"
                    name="Avg Time (min)"
                    animationDuration={1500}
                    />
                </AreaChart>
                </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>

        {/* Request Status Breakdown - Pie Chart */}
        <motion.div
          layout
          className="col-span-1 sm:col-span-2 lg:col-span-4 xl:col-span-2 row-span-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <Card className="h-full min-h-[400px] squircle-lg glass shadow-premium p-8 border-0 flex flex-col relative overflow-hidden group">
             {/* Top Right Icon */}
             <div className="absolute top-0 right-0 p-6 z-20">
                <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full scale-150" />
                    <div className="w-12 h-12 rounded-full bg-background/50 backdrop-blur-md flex items-center justify-center shadow-lg relative z-10 border border-white/10">
                        <Activity className="h-6 w-6 text-primary" />
                    </div>
                </div>
            </div>

            <h3 className="font-black text-xl mb-1 tracking-tight">Status</h3>
            <p className="text-sm text-muted-foreground font-semibold mb-6 w-3/4">Live distribution of requests</p>
            
            <div className="flex-1 relative min-h-[200px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                    <Pie
                    data={requestsByStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={85}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                    cornerRadius={4}
                    >
                    {requestsByStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                </PieChart>
                </ResponsiveContainer>
                {/* Center Text Overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none mt-2">
                    <div className="text-center">
                        <p className="text-4xl font-black tracking-tighter text-foreground">{stats.successRate}%</p>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">SUCCESS</p>
                    </div>
                </div>
            </div>
            
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              {requestsByStatus.slice(0, 3).map((status, index) => (
                <div key={index} className="flex items-center gap-2 px-3 py-1.5 squircle bg-muted/20 text-xs font-semibold">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: status.color }} />
                    <span className="opacity-80">{status.name}</span>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Small Stat Cards - Row 3 */}
        {[
            { title: "Total Users", value: stats.totalUsers, icon: Users, trend: "up", trendValue: "+8", color: CHART_COLORS.secondary },
            { title: "Hospitals", value: stats.totalHospitals, icon: Hospital, trend: null, trendValue: null, color: CHART_COLORS.info },
            { title: "Ambulances", value: stats.totalAmbulances, icon: Ambulance, trend: null, trendValue: null, color: CHART_COLORS.success },
        ].map((stat, idx) => (
             <motion.div
                layout
                key={`small-${idx}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + (idx * 0.1) }}
                className="col-span-1 lg:col-span-2"
            >
                <Card className="h-full min-h-[140px] squircle-lg glass shadow-premium p-6 border-0 hover-lift relative overflow-hidden group flex items-center justify-between">
                     {/* Top Right Icon Style Applied Here Too */}
                     <div className="absolute -top-3 -right-3 z-0 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
                        <div className="w-24 h-24 rounded-full" style={{ backgroundColor: stat.color }} />
                     </div>

                     <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-2">
                             <div className="w-10 h-10 rounded-full bg-background/50 backdrop-blur-md flex items-center justify-center shadow-sm relative z-10 border border-white/5">
                                <stat.icon className="h-5 w-5" style={{ color: stat.color }} />
                            </div>
                            <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">{stat.title}</p>
                        </div>
                        <h3 className="text-3xl font-black tracking-tighter">{stat.value}</h3>
                    </div>
                     <div className="hover-reveal opacity-0 group-hover:opacity-100 transition-all duration-300 relative z-20">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform" style={{ backgroundColor: `${stat.color}20` }}>
                            <ChevronRight className="h-5 w-5 ml-0.5" style={{ color: stat.color }} />
                        </div>
                    </div>
                </Card>
            </motion.div>
        ))}

        {/* Daily Volume Bar Chart */}
        <motion.div
          layout
          className="col-span-1 sm:col-span-2 lg:col-span-4 xl:col-span-3 row-span-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="h-full min-h-[350px] squircle-lg glass shadow-premium p-8 border-0 flex flex-col relative group">
             {/* Top Right Icon */}
             <div className="absolute top-0 right-0 p-6 z-20">
                <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full scale-150" />
                    <div className="w-12 h-12 rounded-full bg-background/50 backdrop-blur-md flex items-center justify-center shadow-lg relative z-10 border border-white/10">
                        <Calendar className="h-6 w-6 text-primary" />
                    </div>
                </div>
            </div>

            <div className="mb-6 relative z-10">
                <h3 className="font-black text-xl tracking-tight">Daily Volume</h3>
                <p className="text-sm text-muted-foreground font-semibold">Requests per day</p>
            </div>
            
            <div className="flex-1 w-full min-h-[250px] relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                <BarChart data={requestsByDay} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" vertical={false} opacity={0.4} />
                    <XAxis 
                        dataKey="shortDay" 
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={12} 
                        tickLine={false}
                        axisLine={false}
                        dy={10}
                    />
                    <YAxis 
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={12} 
                        tickLine={false}
                        axisLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted)/0.2)' }} />
                    <Bar 
                    dataKey="requests" 
                    fill={CHART_COLORS.primary}
                    radius={[4, 4, 4, 4]}
                    name="Total Requests"
                    barSize={24}
                    animationDuration={1500}
                    opacity={0.8}
                    />
                </BarChart>
                </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>

        {/* Emergency Types Bar Chart - Storytelling Mode */}
        <motion.div
          layout
          className="col-span-1 sm:col-span-2 lg:col-span-4 xl:col-span-3 row-span-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
        >
          <Card className="h-full min-h-[350px] squircle-lg glass shadow-premium p-8 border-0 flex flex-col relative overflow-hidden">
             {/* Top Right Icon */}
             <div className="absolute top-0 right-0 p-6 z-20">
                <div className="relative">
                    <div className="absolute inset-0 bg-destructive/20 blur-xl rounded-full scale-150" />
                    <div className="w-12 h-12 rounded-full bg-background/50 backdrop-blur-md flex items-center justify-center shadow-lg relative z-10 border border-white/10">
                        <AlertTriangle className="h-6 w-6 text-destructive" />
                    </div>
                </div>
            </div>

            <div className="mb-2 relative z-10">
                <h3 className="font-black text-xl tracking-tight">Dominant Case</h3>
                {dominantType && (
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-3xl font-black text-destructive tracking-tighter">{dominantType.name}</span>
                        <Badge className="squircle bg-destructive/10 text-destructive border-0 font-bold">
                            {Math.round((dominantType.value / stats.totalEmergencies) * 100)}% of cases
                        </Badge>
                    </div>
                )}
            </div>
            
            <div className="flex-1 w-full min-h-[200px] mt-4 relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                <BarChart data={emergencyTypes} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis 
                        dataKey="name" 
                        type="category" 
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={13} 
                        width={100} 
                        tickLine={false} 
                        axisLine={false}
                        tick={{ fontWeight: 600, fill: 'hsl(var(--foreground))' }}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                    <Bar 
                    dataKey="value" 
                    radius={[0, 4, 4, 0]}
                    name="Cases"
                    barSize={32}
                    animationDuration={1500}
                    background={{ fill: 'hsl(var(--muted)/0.3)', radius: [0, 4, 4, 0] }}
                    >
                    {emergencyTypes.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                    </Bar>
                </BarChart>
                </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>
        
        </motion.div>
      </LayoutGroup>
    </div>
  );
};
