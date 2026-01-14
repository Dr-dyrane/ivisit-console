import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { 
  Activity, 
  Users, 
  Ambulance, 
  Hospital, 
  MapPin,
  FileCheck,
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle2,
  Moon,
  Sun,
  ChevronRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

export const BentoHome = () => {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(true);
  const [stats, setStats] = useState({
    liveEmergencies: 12,
    responseTime: 8.5,
    activeProviders: 45,
    todayRequests: 127
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    fetchStats();
  }, [darkMode]);

  const fetchStats = async () => {
    try {
      const [requests, providers] = await Promise.all([
        supabase.from('emergency_requests').select('*', { count: 'exact' }),
        supabase.from('profiles').select('*', { count: 'exact' }).eq('role', 'provider')
      ]);
      
      setStats(prev => ({
        ...prev,
        liveEmergencies: requests.count || prev.liveEmergencies,
        activeProviders: providers.count || prev.activeProviders
      }));
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const chartData = [
    { time: '00:00', value: 5 },
    { time: '04:00', value: 8 },
    { time: '08:00', value: 15 },
    { time: '12:00', value: 22 },
    { time: '16:00', value: 18 },
    { time: '20:00', value: 12 },
  ];

  return (
    <div className="min-h-screen bg-background p-6 md:p-8">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 squircle bg-primary flex items-center justify-center shadow-glow">
              <img src="/logo.png" alt="iVisit" className="w-8 h-8" />
            </div>
            <div>
              <h1 className="editorial-title text-4xl">iVisit Console</h1>
              <p className="text-muted-foreground font-semibold">Emergency Response Command Center</p>
            </div>
          </div>
          
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="w-14 h-14 squircle glass hover-lift flex items-center justify-center shadow-md"
          >
            {darkMode ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
          </button>
        </div>
      </motion.div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-5 md:gap-6 auto-rows-[140px]">
        
        {/* Live Emergency Counter - Hero Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="col-span-1 md:col-span-3 lg:col-span-4 row-span-3"
        >
          <Card className="h-full squircle-lg glass shadow-premium p-8 flex flex-col justify-between hover-lift cursor-pointer relative overflow-hidden group border-0"
                onClick={() => navigate('/map')}>
            <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="absolute -right-12 -top-12 w-48 h-48 bg-primary/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 squircle bg-primary/10 flex items-center justify-center">
                    <Activity className="h-7 w-7 text-primary" />
                  </div>
                  <Badge className="squircle-sm bg-primary text-primary-foreground border-0 px-4 py-2 font-black editorial-subtitle">LIVE</Badge>
                </div>
                <div className="hover-reveal">
                  <ChevronRight className="h-6 w-6 text-muted-foreground" />
                </div>
              </div>
              
              <div className="space-y-3">
                <p className="editorial-subtitle text-primary">ACTIVE EMERGENCIES</p>
                <h2 className="text-8xl font-black tracking-tighter text-gradient-primary leading-none">{stats.liveEmergencies}</h2>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 squircle-sm bg-success/10 flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-success" />
                  </div>
                  <span className="text-sm font-bold text-success">-15% vs yesterday</span>
                </div>
              </div>
            </div>

            <div className="relative z-10 mt-6">
              <ResponsiveContainer width="100%" height={70}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="liveGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="hsl(var(--primary))" 
                    fill="url(#liveGradient)"
                    strokeWidth={3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>

        {/* Response Time */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          className="col-span-1 md:col-span-3 lg:col-span-3 row-span-2"
        >
          <Card className="h-full squircle-lg glass shadow-premium p-7 flex flex-col justify-between hover-lift border-0 relative overflow-hidden group">
            <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-success/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-1000" />
            <div className="relative z-10">
              <div className="w-12 h-12 squircle bg-success/10 flex items-center justify-center mb-5">
                <Clock className="h-6 w-6 text-success" />
              </div>
              <p className="editorial-subtitle text-success mb-3">AVG RESPONSE TIME</p>
              <h3 className="text-6xl font-black tracking-tighter">{stats.responseTime}<span className="text-3xl text-muted-foreground font-bold">m</span></h3>
            </div>
            <div className="flex items-center gap-2 text-success font-bold text-sm relative z-10">
              <CheckCircle2 className="h-5 w-5" />
              <span>23% faster today</span>
            </div>
          </Card>
        </motion.div>

        {/* Today's Requests */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="col-span-1 md:col-span-3 lg:col-span-3 row-span-2"
        >
          <Card className="h-full squircle-lg glass shadow-premium p-7 flex flex-col justify-between hover-lift border-0 relative overflow-hidden group">
            <div className="absolute -left-8 -top-8 w-32 h-32 bg-info/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-1000" />
            <div className="relative z-10">
              <div className="w-12 h-12 squircle bg-info/10 flex items-center justify-center mb-5">
                <Activity className="h-6 w-6 text-info" />
              </div>
              <p className="editorial-subtitle text-info mb-3">TODAY'S REQUESTS</p>
              <h3 className="text-6xl font-black tracking-tighter">{stats.todayRequests}</h3>
            </div>
            <div className="flex items-center gap-2 text-primary font-bold text-sm relative z-10">
              <TrendingUp className="h-5 w-5" />
              <span>+8% vs yesterday</span>
            </div>
          </Card>
        </motion.div>

        {/* Navigation Cards - God Mode */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.25 }}
          className="col-span-1 md:col-span-2 lg:col-span-2 row-span-2"
        >
          <Card 
            className="h-full squircle-lg glass shadow-premium p-6 hover-lift cursor-pointer group relative overflow-hidden border-0"
            onClick={() => navigate('/map')}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-secondary/15 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div>
                <div className="w-14 h-14 squircle bg-secondary/10 flex items-center justify-center mb-4">
                  <MapPin className="h-7 w-7 text-secondary" />
                </div>
                <p className="editorial-subtitle text-secondary mb-2">MAP VIEW</p>
              </div>
              <div>
                <h4 className="font-black text-xl mb-1 tracking-tight">God Mode</h4>
                <p className="text-sm text-muted-foreground font-semibold">Live tracking</p>
                <div className="mt-3 hover-reveal">
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Verification Queue */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="col-span-1 md:col-span-2 lg:col-span-2 row-span-2"
        >
          <Card 
            className="h-full squircle-lg glass shadow-premium p-6 hover-lift cursor-pointer group relative overflow-hidden border-0"
            onClick={() => navigate('/verification')}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-warning/15 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div>
                <div className="w-14 h-14 squircle bg-warning/10 flex items-center justify-center mb-4">
                  <FileCheck className="h-7 w-7 text-warning" />
                </div>
                <Badge className="squircle-sm bg-warning/20 text-warning border-0 mb-3 font-black editorial-subtitle px-3 py-1">8 PENDING</Badge>
              </div>
              <div>
                <h4 className="font-black text-xl mb-1 tracking-tight">Verification</h4>
                <p className="text-sm text-muted-foreground font-semibold">Review queue</p>
                <div className="mt-3 hover-reveal">
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Analytics */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.35 }}
          className="col-span-1 md:col-span-2 lg:col-span-2 row-span-2"
        >
          <Card 
            className="h-full squircle-lg glass shadow-premium p-6 hover-lift cursor-pointer group relative overflow-hidden border-0"
            onClick={() => navigate('/analytics')}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-success/15 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div>
                <div className="w-14 h-14 squircle bg-success/10 flex items-center justify-center mb-4">
                  <TrendingUp className="h-7 w-7 text-success" />
                </div>
                <p className="editorial-subtitle text-success mb-2">INSIGHTS</p>
              </div>
              <div>
                <h4 className="font-black text-xl mb-1 tracking-tight">Analytics</h4>
                <p className="text-sm text-muted-foreground font-semibold">Impact metrics</p>
                <div className="mt-3 hover-reveal">
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Quick Access Cards */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="col-span-1 md:col-span-2 lg:col-span-2 row-span-1"
        >
          <Card 
            className="h-full squircle-lg glass shadow-premium p-5 flex items-center justify-between hover-lift cursor-pointer border-0 group"
            onClick={() => navigate('/hospitals')}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 squircle bg-primary/10 flex items-center justify-center">
                <Hospital className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h4 className="font-black tracking-tight">Hospitals</h4>
                <p className="text-xs text-muted-foreground font-semibold">28 active</p>
              </div>
            </div>
            <div className="hover-reveal">
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.45 }}
          className="col-span-1 md:col-span-2 lg:col-span-2 row-span-1"
        >
          <Card 
            className="h-full squircle-lg glass shadow-premium p-5 flex items-center justify-between hover-lift cursor-pointer border-0 group"
            onClick={() => navigate('/ambulances')}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 squircle bg-success/10 flex items-center justify-center">
                <Ambulance className="h-6 w-6 text-success" />
              </div>
              <div>
                <h4 className="font-black tracking-tight">Fleet</h4>
                <p className="text-xs text-muted-foreground font-semibold">{stats.activeProviders} units</p>
              </div>
            </div>
            <div className="hover-reveal">
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="col-span-1 md:col-span-2 lg:col-span-2 row-span-1"
        >
          <Card 
            className="h-full squircle-lg glass shadow-premium p-5 flex items-center justify-between hover-lift cursor-pointer border-0 group"
            onClick={() => navigate('/users')}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 squircle bg-info/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-info" />
              </div>
              <div>
                <h4 className="font-black tracking-tight">Users</h4>
                <p className="text-xs text-muted-foreground font-semibold">1,247 total</p>
              </div>
            </div>
            <div className="hover-reveal">
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </Card>
        </motion.div>

        {/* System Status */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.55 }}
          className="col-span-1 md:col-span-6 lg:col-span-6 row-span-2"
        >
          <Card className="h-full squircle-lg glass shadow-premium p-7 border-0">
            <h4 className="font-black text-lg mb-6 tracking-tight">System Status</h4>
            <div className="grid grid-cols-2 gap-6">
              {[
                { label: 'Success Rate', value: '94%', progress: 94, color: 'success' },
                { label: 'Fleet Active', value: '78%', progress: 78, color: 'primary' },
                { label: 'Beds Available', value: '156', progress: 65, color: 'info' },
                { label: 'System Health', value: '99%', progress: 99, color: 'success' },
              ].map((stat, idx) => (
                <div key={idx} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground font-semibold">{stat.label}</span>
                    <span className={`text-3xl font-black tracking-tighter text-${stat.color}`}>{stat.value}</span>
                  </div>
                  <div className="h-2 bg-muted/30 squircle-sm overflow-hidden">
                    <motion.div 
                      className={`h-full bg-${stat.color} squircle-sm`}
                      initial={{ width: 0 }}
                      animate={{ width: `${stat.progress}%` }}
                      transition={{ duration: 1, delay: 0.6 + (idx * 0.1) }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }}
          className="col-span-1 md:col-span-6 lg:col-span-6 row-span-2"
        >
          <Card className="h-full squircle-lg glass shadow-premium p-7 flex flex-col border-0">
            <h4 className="font-black text-lg mb-5 tracking-tight">Recent Activity</h4>
            <div className="space-y-3 flex-1 overflow-y-auto">
              {[
                { type: 'emergency', msg: 'New emergency request from Victoria Island', time: '2m ago', icon: AlertCircle, color: 'text-primary', bg: 'bg-primary/10' },
                { type: 'complete', msg: 'Emergency response completed - Lekki', time: '15m ago', icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10' },
                { type: 'provider', msg: 'New provider verified - Dr. Adebayo', time: '1h ago', icon: FileCheck, color: 'text-info', bg: 'bg-info/10' },
                { type: 'emergency', msg: 'Ambulance dispatched to Ikeja', time: '2h ago', icon: Ambulance, color: 'text-warning', bg: 'bg-warning/10' },
              ].map((activity, idx) => (
                <div key={idx} className="flex items-start gap-4 p-4 squircle bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer">
                  <div className={`w-10 h-10 squircle flex items-center justify-center ${activity.bg}`}>
                    <activity.icon className={`h-5 w-5 ${activity.color}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold leading-snug">{activity.msg}</p>
                    <p className="text-xs text-muted-foreground mt-1 font-semibold">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};
