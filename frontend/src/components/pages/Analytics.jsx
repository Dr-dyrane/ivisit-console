import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { 
  TrendingUp, 
  Activity, 
  Clock, 
  Users, 
  Heart,
  Calendar,
  Download
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend 
} from 'recharts';
import { motion } from 'framer-motion';

const COLORS = {
  primary: 'hsl(var(--primary))',
  success: 'hsl(var(--success))',
  warning: 'hsl(var(--warning))',
  info: 'hsl(var(--info))',
  secondary: 'hsl(var(--secondary))',
};

export const Analytics = () => {
  const [timeRange, setTimeRange] = useState('7d');
  const [stats, setStats] = useState({
    totalLivesTouched: 0,
    avgResponseTime: 0,
    activeSubscriptions: 0,
    successRate: 0,
  });
  
  const [responseTimeData, setResponseTimeData] = useState([]);
  const [requestsByStatus, setRequestsByStatus] = useState([]);
  const [requestsByDay, setRequestsByDay] = useState([]);

  useEffect(() => {
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      const { data: requests, error } = await supabase
        .from('emergency_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const completed = requests?.filter(r => r.status === 'completed') || [];
      const totalRequests = requests?.length || 0;

      setStats({
        totalLivesTouched: completed.length,
        avgResponseTime: 12.5,
        activeSubscriptions: 145,
        successRate: totalRequests > 0 ? Math.round((completed.length / totalRequests) * 100) : 0,
      });

      generateChartData(requests || []);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const generateChartData = (requests) => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return {
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        avgTime: 10 + Math.random() * 10,
        requests: Math.floor(Math.random() * 20) + 10,
      };
    });
    
    setResponseTimeData(last7Days);
    setRequestsByDay(last7Days);

    const statusCounts = {
      pending: Math.floor(Math.random() * 15) + 5,
      accepted: Math.floor(Math.random() * 20) + 10,
      in_progress: Math.floor(Math.random() * 25) + 15,
      completed: Math.floor(Math.random() * 100) + 50,
      cancelled: Math.floor(Math.random() * 10) + 2,
    };

    setRequestsByStatus([
      { name: 'Completed', value: statusCounts.completed, color: COLORS.success },
      { name: 'In Progress', value: statusCounts.in_progress, color: COLORS.primary },
      { name: 'Accepted', value: statusCounts.accepted, color: COLORS.info },
      { name: 'Pending', value: statusCounts.pending, color: COLORS.warning },
      { name: 'Cancelled', value: statusCounts.cancelled, color: COLORS.secondary },
    ]);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Impact Analytics</h1>
          <p className="text-muted-foreground">Monitor system performance and impact metrics</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px] squircle">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent className="squircle">
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          
          <Button className="squircle">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="squircle-lg p-6 glass relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -mr-16 -mt-16" />
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-muted-foreground">Total Lives Touched</p>
                <Heart className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-4xl font-bold mb-2">{stats.totalLivesTouched}</h3>
              <Badge className="squircle bg-success/20 text-success border-success/30">
                <TrendingUp className="h-3 w-3 mr-1" />
                +24% this month
              </Badge>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="squircle-lg p-6 glass relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-info/10 rounded-full -mr-16 -mt-16" />
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-muted-foreground">Avg Response Time</p>
                <Clock className="h-5 w-5 text-info" />
              </div>
              <h3 className="text-4xl font-bold mb-2">{stats.avgResponseTime}m</h3>
              <Badge className="squircle bg-success/20 text-success border-success/30">
                <TrendingUp className="h-3 w-3 mr-1" />
                15% faster
              </Badge>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card className="squircle-lg p-6 glass relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/10 rounded-full -mr-16 -mt-16" />
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-muted-foreground">Active Subscriptions</p>
                <Users className="h-5 w-5 text-secondary" />
              </div>
              <h3 className="text-4xl font-bold mb-2">{stats.activeSubscriptions}</h3>
              <Badge className="squircle bg-success/20 text-success border-success/30">
                <TrendingUp className="h-3 w-3 mr-1" />
                +12 new
              </Badge>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Card className="squircle-lg p-6 glass relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-success/10 rounded-full -mr-16 -mt-16" />
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                <Activity className="h-5 w-5 text-success" />
              </div>
              <h3 className="text-4xl font-bold mb-2">{stats.successRate}%</h3>
              <Badge className="squircle bg-success/20 text-success border-success/30">
                <TrendingUp className="h-3 w-3 mr-1" />
                Excellent
              </Badge>
            </div>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 squircle-lg p-6 glass">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold">Response Time Trend</h3>
              <p className="text-sm text-muted-foreground">Average response time over the last week</p>
            </div>
            <Calendar className="h-5 w-5 text-muted-foreground" />
          </div>
          
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={responseTimeData}>
              <defs>
                <linearGradient id="colorTime" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '1rem'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="avgTime" 
                stroke={COLORS.primary}
                strokeWidth={3}
                fill="url(#colorTime)"
                name="Avg Time (min)"
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="squircle-lg p-6 glass">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Requests by Status</h3>
          </div>
          
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={requestsByStatus}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                {requestsByStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '1rem'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          
          <div className="mt-4 space-y-2">
            {requestsByStatus.map((status, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color }} />
                  <span className="text-muted-foreground">{status.name}</span>
                </div>
                <span className="font-medium">{status.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="squircle-lg p-6 glass">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold">Daily Requests Volume</h3>
            <p className="text-sm text-muted-foreground">Emergency requests per day</p>
          </div>
        </div>
        
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={requestsByDay}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" />
            <YAxis stroke="hsl(var(--muted-foreground))" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '1rem'
              }}
            />
            <Bar 
              dataKey="requests" 
              fill={COLORS.primary}
              radius={[8, 8, 0, 0]}
              name="Requests"
            />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
};
