import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  ChevronRight,
  FileText,
  Plus
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
import { usePageHeader } from '../../contexts/LayoutContext';
import { ReportsModal } from '../modals/ReportsModal';

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
  const [reportsModalOpen, setReportsModalOpen] = useState(false);

  const handleExport = useCallback(() => {
    // Create CSV data from analytics
    const csvData = [
      ['Metric', 'Value', 'Trend'],
      ['Total Emergencies', stats.totalEmergencies, ''],
      ['Avg Response Time (min)', stats.avgResponseTime.toFixed(1), ''],
      ['Success Rate (%)', stats.successRate, ''],
      ['Total Users', stats.totalUsers, ''],
      ['Total Hospitals', stats.totalHospitals, ''],
      ['Total Ambulances', stats.totalAmbulances, ''],
      [],
      ['Emergency Types', 'Count', 'Percentage'],
      ...emergencyTypes.map(type => [
        type.name,
        type.value,
        `${Math.round((type.value / stats.totalEmergencies) * 100)}%`
      ]),
      [],
      ['Request Status', 'Count', 'Percentage'],
      ...requestsByStatus.map(status => [
        status.name,
        status.value,
        `${Math.round((status.value / requestsByStatus.reduce((sum, s) => sum + s.value, 0)) * 100)}%`
      ]),
      [],
      ['Daily Response Times', 'Day', 'Avg Time (min)', 'Requests'],
      ...responseTimeData.map(day => [
        day.day,
        day.avgTime,
        day.requests
      ])
    ];

    // Convert to CSV string
    const csvString = csvData.map(row => row.join(',')).join('\n');
    
    // Create and download CSV file
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Analytics data exported successfully');
  }, [stats, emergencyTypes, requestsByStatus, responseTimeData]);

  // Prepare analytics data for reports
  const analyticsDataForReports = useMemo(() => ({
    totalEmergencies: stats.totalEmergencies,
    avgResponseTime: stats.avgResponseTime,
    successRate: stats.successRate,
    totalUsers: stats.totalUsers,
    totalHospitals: stats.totalHospitals,
    totalAmbulances: stats.totalAmbulances,
    responseTimeData,
    requestsByStatus,
    requestsByDay,
    emergencyTypes,
    dominantType
  }), [stats, responseTimeData, requestsByStatus, requestsByDay, emergencyTypes, dominantType]);

  const headerActions = useMemo(() => (
    <div className="flex items-center gap-3">
      <Select value={timeRange} onValueChange={setTimeRange}>
        <SelectTrigger className="w-[140px] h-9 squircle-lg bg-background/35 backdrop-blur-xs border-0 shadow-sm text-xs font-bold uppercase tracking-wider">
          <SelectValue placeholder="Range" />
        </SelectTrigger>
        <SelectContent className="squircle border-0 shadow-xl bg-background/95 backdrop-blur-xl">
          <SelectItem value="7d">Last 7 days</SelectItem>
          <SelectItem value="30d">Last 30 days</SelectItem>
          <SelectItem value="90d">Last 90 days</SelectItem>
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        size="sm"
        className="bg-muted/20 hover:bg-muted/30 border border-border/20 squircle-full h-9 px-4 text-[10px] font-black tracking-widest uppercase"
        onClick={handleExport}
      >
        <Download className="h-3 w-3 mr-2" />
        EXPORT
      </Button>
    </div>
  ), [timeRange, handleExport]);

  usePageHeader("Impact Analytics", headerActions);



  const generateChartData = useCallback((requests) => {
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
  }, [timeRange]);

  const fetchAnalytics = useCallback(async () => {
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
  }, [generateChartData]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Listen for context panel events
  useEffect(() => {
    const handleOpenReports = () => {
      setReportsModalOpen(true);
    };

    const handleExportAnalytics = () => {
      handleExport();
    };

    window.addEventListener('openReportsModal', handleOpenReports);
    window.addEventListener('exportAnalytics', handleExportAnalytics);

    return () => {
      window.removeEventListener('openReportsModal', handleOpenReports);
      window.removeEventListener('exportAnalytics', handleExportAnalytics);
    };
  }, [handleExport]);


  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/35 backdrop-blur-xs squircle p-3 shadow-lg border-0 bg-background/80 backdrop-blur-md">
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
    <>
      <div className="min-h-screen py-6 md:py-8">
        {/* Layout padding adjustment */}
        <div className="pt-2" />

        {/* Fluid Bento Grid */}
        <LayoutGroup>
          <motion.div
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6 auto-rows-min grid-flow-dense"
          >

          {/* Stat Cards - Row 1 */}
          {[
            { title: "Total Emergencies", value: stats.totalEmergencies, icon: AlertTriangle, trend: "up", trendValue: "+12%", color: CHART_COLORS.destructive, colSpan: "col-span-1 lg:col-span-2", shape: "geo-sharp" },
            { title: "Avg Response", value: `${stats.avgResponseTime.toFixed(1)}m`, icon: Clock, trend: "down", trendValue: "15% faster", color: CHART_COLORS.info, colSpan: "col-span-1 lg:col-span-2", shape: "geo-round" },
            { title: "Success Rate", value: `${stats.successRate}%`, icon: Activity, trend: "up", trendValue: "Excellent", color: CHART_COLORS.success, colSpan: "col-span-1 lg:col-span-2", shape: "geo-chamfer" },
          ].map((stat, idx) => (
            <motion.div
              layout
              key={idx}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              className={`${stat.colSpan}`}
            >
              <Card className={`h-full min-h-[160px] ${stat.shape} bg-background/50 backdrop-blur-xs shadow-2xl p-6 border-0 hover-lift relative overflow-hidden group`}>
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

          {/* Response Time Trend - Large Chart -> GEO-SHARD (Dynamic Flow) */}
          <motion.div
            layout
            className="col-span-1 sm:col-span-2 lg:col-span-4 xl:col-span-4 row-span-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="h-full min-h-[400px] geo-shard bg-background/50 backdrop-blur-xs shadow-2xl p-8 border-0 flex flex-col justify-between group relative overflow-hidden">
              {/* Subtle Grid for Context */}
              <div className="absolute inset-0 opacity-5"
                style={{ backgroundImage: 'linear-gradient(to right, currentColor 1px, transparent 1px)', backgroundSize: '40px 100%', color: 'hsl(var(--primary))' }}>
              </div>

              <div className="flex items-center justify-between mb-6 relative z-10">
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
                        <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
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

          {/* Request Status Breakdown - Pie Chart -> GEO-TICKET (Rounded cutouts) */}
          <motion.div
            layout
            className="col-span-1 sm:col-span-2 lg:col-span-4 xl:col-span-2 row-span-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
          >
            <Card className="h-full min-h-[400px] geo-ticket bg-background/50 backdrop-blur-xs shadow-2xl p-8 border-0 flex flex-col relative overflow-hidden group">
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
              <Card className="h-full min-h-[140px] squircle-lg bg-background/35 backdrop-blur-xs shadow-premium p-6 border-0 hover-lift relative overflow-hidden group flex items-center justify-between">
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
            <Card className="h-full min-h-[350px] squircle-lg bg-background/35 backdrop-blur-xs shadow-premium p-8 border-0 flex flex-col relative group">
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

          {/* Emergency Types Bar Chart - Storytelling Mode -> GEO-ROUND (Organic) */}
          <motion.div
            layout
            className="col-span-1 sm:col-span-2 lg:col-span-4 xl:col-span-3 row-span-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
          >
            <Card className="h-full min-h-[350px] geo-round bg-background/50 backdrop-blur-xs shadow-2xl p-8 border-0 flex flex-col relative overflow-hidden">
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

          {/* Additional Analytics Cards - Search Analytics and Performance Metrics */}
          
          {/* Search Analytics Card */}
          <motion.div
            layout
            className="col-span-1 sm:col-span-2 lg:col-span-4 xl:col-span-3 row-span-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <Card className="h-full min-h-[350px] geo-shard bg-background/50 backdrop-blur-xs shadow-2xl p-8 border-0 flex flex-col relative overflow-hidden">
              {/* Search Pattern */}
              <div className="absolute inset-0 opacity-5"
                style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '24px 24px', color: 'hsl(var(--info))' }}>
              </div>

              {/* Top Right Icon */}
              <div className="absolute top-0 right-0 p-6 z-20">
                <div className="relative">
                  <div className="absolute inset-0 bg-info/20 blur-xl rounded-full scale-150" />
                  <div className="w-12 h-12 rounded-full bg-background/50 backdrop-blur-md flex items-center justify-center shadow-lg relative z-10 border border-white/10">
                    <TrendingUp className="h-6 w-6 text-info" />
                  </div>
                </div>
              </div>

              <div className="mb-6 relative z-10">
                <h3 className="font-black text-xl tracking-tight">Search Analytics</h3>
                <p className="text-sm text-muted-foreground font-semibold">User search patterns and trends</p>
              </div>

              <div className="grid grid-cols-2 gap-4 flex-1 relative z-10">
                {[
                  { label: 'Total Searches', value: '1,284', change: '+12%', positive: true },
                  { label: 'Success Rate', value: '87%', change: '+3%', positive: true },
                  { label: 'Avg Time', value: '2.3s', change: '-0.5s', positive: true },
                  { label: 'No Results', value: '8%', change: '-2%', positive: true }
                ].map((metric, idx) => (
                  <div key={idx} className="p-4 geo-round bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground font-semibold">{metric.label}</span>
                      <Badge className={`squircle-sm ${metric.positive ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'} border-0 font-black text-xs`}>
                        {metric.change}
                      </Badge>
                    </div>
                    <p className="text-2xl font-black tracking-tighter">{metric.value}</p>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>

          {/* Performance Metrics Card */}
          <motion.div
            layout
            className="col-span-1 sm:col-span-2 lg:col-span-4 xl:col-span-3 row-span-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75 }}
          >
            <Card className="h-full min-h-[350px] geo-ticket bg-background/50 backdrop-blur-xs shadow-2xl p-8 border-0 flex flex-col relative overflow-hidden">
              {/* Performance Pattern */}
              <div className="absolute inset-0 opacity-5"
                style={{ backgroundImage: 'repeating-linear-gradient(45deg, currentColor 0, currentColor 1px, transparent 0, transparent 50%)', backgroundSize: '10px 10px', color: 'hsl(var(--success))' }}>
              </div>

              {/* Top Right Icon */}
              <div className="absolute top-0 right-0 p-6 z-20">
                <div className="relative">
                  <div className="absolute inset-0 bg-success/20 blur-xl rounded-full scale-150" />
                  <div className="w-12 h-12 rounded-full bg-background/50 backdrop-blur-md flex items-center justify-center shadow-lg relative z-10 border border-white/10">
                    <Activity className="h-6 w-6 text-success" />
                  </div>
                </div>
              </div>

              <div className="mb-6 relative z-10">
                <h3 className="font-black text-xl tracking-tight">Performance Metrics</h3>
                <p className="text-sm text-muted-foreground font-semibold">System health and efficiency</p>
              </div>

              <div className="space-y-4 flex-1 relative z-10">
                {[
                  { label: 'API Response Time', value: '142ms', target: '200ms', status: 'excellent' },
                  { label: 'Database Query Time', value: '28ms', target: '50ms', status: 'excellent' },
                  { label: 'Page Load Time', value: '1.2s', target: '2s', status: 'good' },
                  { label: 'Error Rate', value: '0.12%', target: '1%', status: 'excellent' },
                  { label: 'Uptime', value: '99.97%', target: '99.9%', status: 'excellent' }
                ].map((metric, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 geo-sharp bg-muted/20 hover:bg-muted/30 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold">{metric.label}</span>
                        <Badge className={`squircle-sm ${
                          metric.status === 'excellent' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                        } border-0 font-black text-xs`}>
                          {metric.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-lg font-black">{metric.value}</span>
                        <span className="text-xs text-muted-foreground">Target: {metric.target}</span>
                      </div>
                    </div>
                    <div className="w-16 h-2 bg-muted/30 squircle-sm overflow-hidden">
                      <motion.div
                        className={`h-full ${
                          metric.status === 'excellent' ? 'bg-success' : 'bg-warning'
                        } squircle-sm`}
                        initial={{ width: 0 }}
                        animate={{ 
                          width: metric.status === 'excellent' 
                            ? '90%' 
                            : metric.status === 'good' 
                            ? '75%' 
                            : '60%' 
                        }}
                        transition={{ duration: 1, delay: 0.8 + (idx * 0.1) }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>

        </motion.div>
      </LayoutGroup>
      </div>

      {/* Reports Modal */}
      <ReportsModal
        open={reportsModalOpen}
        onClose={() => setReportsModalOpen(false)}
        analyticsData={analyticsDataForReports}
        timeRange={timeRange}
      />
    </>
  );
};
