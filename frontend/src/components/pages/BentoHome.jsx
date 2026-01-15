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
  ChevronRight,
  Stethoscope,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { motion, LayoutGroup } from 'framer-motion';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

// Responsive Grid Hook or similar logic can be added here if needed, 
// but CSS Grid with auto-fit/minmax is usually cleaner for "filling spaces".
// However, for the "water bubble" effect, Framer Motion's layout prop is key.

export const BentoHome = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    liveEmergencies: 12,
    responseTime: 8.5,
    activeProviders: 45,
    todayRequests: 127
  });

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

  useEffect(() => {
    fetchStats();
  }, []);

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
            <div className="w-16 h-16 squircle bg-primary/10 flex items-center justify-center shadow-glow">
              <img src="/logo.png" alt="iVisit" className="w-8 h-8" />
            </div>
            <div>
              <h1 className="editorial-title text-4xl">iVisit Console</h1>
              <p className="text-muted-foreground font-semibold">Emergency Response Command Center</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Fluid Bento Grid */}
      {/* 
         - 'auto-rows-min': Allows rows to grow as needed for content
         - 'grid-flow-dense': The magic sauce. It fills gaps automatically.
      */}
      <LayoutGroup>
        <motion.div 
            layout 
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 md:gap-6 auto-rows-min grid-flow-dense"
        >
          
        {/* Live Emergency Counter - Hero Card (Big & Wide) */}
        <motion.div
          layout
          className="col-span-1 sm:col-span-2 lg:col-span-4 xl:col-span-4 row-span-2"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="h-full min-h-[320px] squircle-lg glass shadow-premium p-8 flex flex-col justify-between hover-lift cursor-pointer relative overflow-hidden group border-0"
                onClick={() => navigate('/map')}>
            <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="absolute -right-12 -top-12 w-48 h-48 bg-primary/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
            
            <div className="relative z-10 flex flex-col flex-1">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 squircle bg-primary/10 flex items-center justify-center">
                    <Activity className="h-7 w-7 text-primary" />
                  </div>
                  <Badge className="squircle-sm bg-primary text-primary-foreground border-0 px-4 py-2 font-black editorial-subtitle">LIVE</Badge>
                </div>
                <div className="hover-reveal opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                   <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                     <ChevronRight className="h-5 w-5 text-primary ml-0.5" />
                   </div>
                </div>
              </div>
              
              <div className="space-y-3 flex-1">
                <p className="editorial-subtitle text-primary">ACTIVE EMERGENCIES</p>
                {/* Use clamp or dynamic text sizing to prevent overflow */}
                <h2 className="text-7xl lg:text-8xl font-black tracking-tighter text-gradient-primary leading-none break-words">{stats.liveEmergencies}</h2>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 squircle-sm bg-success/10 flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-success" />
                  </div>
                  <span className="text-sm font-bold text-success whitespace-nowrap">-15% vs yesterday</span>
                </div>
              </div>
            </div>

            <div className="relative z-10 mt-6 h-[80px]">
              <ResponsiveContainer width="100%" height="100%">
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

        {/* Response Time (Tall) */}
        <motion.div
          layout
          className="col-span-1 sm:col-span-1 lg:col-span-2 xl:col-span-2 row-span-2"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card className="h-full min-h-[320px] squircle-lg glass shadow-premium p-7 flex flex-col justify-between hover-lift border-0 relative overflow-hidden group">
            <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-success/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-1000" />
            <div className="relative z-10 flex flex-col flex-1">
              <div className="w-12 h-12 squircle bg-success/10 flex items-center justify-center mb-5">
                <Clock className="h-6 w-6 text-success" />
              </div>
              <p className="editorial-subtitle text-success mb-3">AVG RESPONSE TIME</p>
              <h3 className="text-5xl lg:text-6xl font-black tracking-tighter break-words leading-tight">
                {stats.responseTime}<span className="text-3xl text-muted-foreground font-bold ml-1">m</span>
              </h3>
            </div>
            <div className="flex items-center gap-2 text-success font-bold text-sm relative z-10 mt-4">
              <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
              <span>23% faster today</span>
            </div>
          </Card>
        </motion.div>

        {/* Today's Requests (Tall) */}
        <motion.div
          layout
          className="col-span-1 sm:col-span-1 lg:col-span-2 xl:col-span-2 row-span-2"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <Card className="h-full min-h-[320px] squircle-lg glass shadow-premium p-7 flex flex-col justify-between hover-lift border-0 relative overflow-hidden group">
            <div className="absolute -left-8 -top-8 w-32 h-32 bg-info/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-1000" />
            <div className="relative z-10 flex flex-col flex-1">
              <div className="w-12 h-12 squircle bg-info/10 flex items-center justify-center mb-5">
                <Activity className="h-6 w-6 text-info" />
              </div>
              <p className="editorial-subtitle text-info mb-3">TODAY&apos;S REQUESTS</p>
              <h3 className="text-5xl lg:text-6xl font-black tracking-tighter break-words leading-tight">{stats.todayRequests}</h3>
            </div>
            <div className="flex items-center gap-2 text-primary font-bold text-sm relative z-10 mt-4">
              <TrendingUp className="h-5 w-5 flex-shrink-0" />
              <span>+8% vs yesterday</span>
            </div>
          </Card>
        </motion.div>

        {/* Navigation Cards - God Mode (Medium) */}
        <motion.div
          layout
          className="col-span-1 sm:col-span-1 lg:col-span-2 xl:col-span-2 row-span-1"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card 
            className="h-full min-h-[160px] squircle-lg glass shadow-premium p-6 hover-lift cursor-pointer group relative overflow-hidden border-0 flex flex-col justify-between"
            onClick={() => navigate('/map')}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-secondary/15 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10 flex flex-col h-full justify-between gap-4">
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 squircle bg-secondary/10 flex items-center justify-center">
                  <MapPin className="h-6 w-6 text-secondary" />
                </div>
                 <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                   <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                     <ChevronRight className="h-5 w-5 text-secondary ml-0.5" />
                   </div>
                 </div>
              </div>
              <div>
                <p className="editorial-subtitle text-secondary mb-1">MAP VIEW</p>
                <h4 className="font-black text-xl tracking-tight">God Mode</h4>
                <p className="text-sm text-muted-foreground font-semibold">Live tracking</p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Verification Queue (Medium) */}
        <motion.div
          layout
          className="col-span-1 sm:col-span-1 lg:col-span-2 xl:col-span-2 row-span-1"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.25 }}
        >
          <Card 
            className="h-full min-h-[160px] squircle-lg glass shadow-premium p-6 hover-lift cursor-pointer group relative overflow-hidden border-0 flex flex-col justify-between"
            onClick={() => navigate('/verification')}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-warning/15 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10 flex flex-col h-full justify-between gap-4">
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 squircle bg-warning/10 flex items-center justify-center">
                  <FileCheck className="h-6 w-6 text-warning" />
                </div>
                <Badge className="squircle-sm bg-warning/20 text-warning border-0 font-black editorial-subtitle px-2 py-0.5">8 PENDING</Badge>
              </div>
              <div>
                <h4 className="font-black text-xl tracking-tight">Verification</h4>
                <p className="text-sm text-muted-foreground font-semibold">Review queue</p>
                <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                   <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                     <ChevronRight className="h-5 w-5 text-warning ml-0.5" />
                   </div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Analytics (Medium) */}
        <motion.div
          layout
          className="col-span-1 sm:col-span-1 lg:col-span-2 xl:col-span-2 row-span-1"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <Card 
            className="h-full min-h-[160px] squircle-lg glass shadow-premium p-6 hover-lift cursor-pointer group relative overflow-hidden border-0 flex flex-col justify-between"
            onClick={() => navigate('/analytics')}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-success/15 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10 flex flex-col h-full justify-between gap-4">
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 squircle bg-success/10 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-success" />
                </div>
              </div>
              <div>
                <p className="editorial-subtitle text-success mb-1">INSIGHTS</p>
                <h4 className="font-black text-xl tracking-tight">Analytics</h4>
                <p className="text-sm text-muted-foreground font-semibold">Impact metrics</p>
                <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                   <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                     <ChevronRight className="h-5 w-5 text-success ml-0.5" />
                   </div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Quick Access Cards (Small & Dense) */}
        {[
            { id: 'hospitals', icon: Hospital, label: 'Hospitals', sub: '28 active', color: 'primary', path: '/hospitals' },
            { id: 'ambulances', icon: Ambulance, label: 'Fleet', sub: `${stats.activeProviders} units`, color: 'success', path: '/ambulances' },
            { id: 'doctors', icon: Stethoscope, label: 'Doctors', sub: 'Medical staff', color: 'info', path: '/doctors' },
            { id: 'users', icon: Users, label: 'Users', sub: '1,247 total', color: 'secondary', path: '/users' },
            { id: 'visits', icon: Calendar, label: 'Visits', sub: 'Appointments', color: 'warning', path: '/visits' },
            { id: 'emergencies', icon: AlertTriangle, label: 'Emergencies', sub: 'Requests', color: 'destructive', path: '/emergencies' },
        ].map((item, idx) => (
            <motion.div
              layout
              key={item.id}
              className="col-span-1 sm:col-span-1 lg:col-span-1 xl:col-span-1 row-span-1"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.35 + (idx * 0.05) }}
            >
              <Card 
                className="h-full min-h-[140px] squircle-lg glass shadow-premium p-5 flex flex-col justify-between hover-lift cursor-pointer border-0 group"
                onClick={() => navigate(item.path)}
                data-testid={`quick-${item.id}`}
              >
                <div className="flex justify-between items-start">
                    <div className={`w-10 h-10 squircle bg-${item.color}/10 flex items-center justify-center`}>
                        <item.icon className={`h-5 w-5 text-${item.color}`} />
                    </div>
                    <div className="hover-reveal opacity-0 group-hover:opacity-100 transition-all duration-300">
                       <div className={`w-8 h-8 rounded-full bg-${item.color}/10 flex items-center justify-center shadow-lg hover:scale-110 transition-transform`}>
                         <ChevronRight className={`h-4 w-4 text-${item.color} ml-0.5`} />
                       </div>
                    </div>
                </div>
                <div>
                  <h4 className="font-black tracking-tight">{item.label}</h4>
                  <p className="text-xs text-muted-foreground font-semibold truncate">{item.sub}</p>
                </div>
              </Card>
            </motion.div>
        ))}

        {/* System Status (Wide) */}
        <motion.div
          layout
          className="col-span-1 sm:col-span-2 lg:col-span-4 xl:col-span-3 row-span-2"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.6 }}
        >
          <Card className="h-full min-h-[300px] squircle-lg glass shadow-premium p-7 border-0 flex flex-col w-full">
            <h4 className="font-black text-lg mb-6 tracking-tight">System Status</h4>
            <div className="grid grid-cols-1 gap-6 flex-1">
              {[
                { label: 'Success Rate', value: '94%', progress: 94, color: 'success' },
                { label: 'Fleet Active', value: '78%', progress: 78, color: 'primary' },
                { label: 'Beds Available', value: '156', progress: 65, color: 'info' },
                { label: 'System Health', value: '99%', progress: 99, color: 'success' },
              ].map((stat, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground font-semibold">{stat.label}</span>
                    <span className={`text-xl font-black tracking-tighter text-${stat.color}`}>{stat.value}</span>
                  </div>
                  <div className="h-2 bg-muted/30 squircle-sm overflow-hidden">
                    <motion.div 
                      className={`h-full bg-${stat.color} squircle-sm`}
                      initial={{ width: 0 }}
                      animate={{ width: `${stat.progress}%` }}
                      transition={{ duration: 1, delay: 0.7 + (idx * 0.1) }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Recent Activity (Wide) */}
        <motion.div
          layout
          className="col-span-1 sm:col-span-2 lg:col-span-4 xl:col-span-3 row-span-2"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.65 }}
        >
          <Card className="h-full min-h-[300px] squircle-lg glass shadow-premium p-7 flex flex-col border-0 w-full">
            <h4 className="font-black text-lg mb-5 tracking-tight">Recent Activity</h4>
            <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {[
                { type: 'emergency', msg: 'New emergency request from Victoria Island', time: '2m ago', icon: AlertCircle, color: 'text-primary', bg: 'bg-primary/10' },
                { type: 'complete', msg: 'Emergency response completed - Lekki', time: '15m ago', icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10' },
                { type: 'provider', msg: 'New provider verified - Dr. Adebayo', time: '1h ago', icon: FileCheck, color: 'text-info', bg: 'bg-info/10' },
                { type: 'emergency', msg: 'Ambulance dispatched to Ikeja', time: '2h ago', icon: Ambulance, color: 'text-warning', bg: 'bg-warning/10' },
                { type: 'system', msg: 'System backup completed successfully', time: '3h ago', icon: CheckCircle2, color: 'text-secondary', bg: 'bg-secondary/10' },
              ].map((activity, idx) => (
                <div key={idx} className="flex items-start gap-4 p-4 squircle bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer group">
                  <div className={`w-10 h-10 squircle flex items-center justify-center ${activity.bg} flex-shrink-0 group-hover:scale-110 transition-transform`}>
                    <activity.icon className={`h-5 w-5 ${activity.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold leading-snug truncate-2">{activity.msg}</p>
                    <p className="text-xs text-muted-foreground mt-1 font-semibold">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
        
        </motion.div>
      </LayoutGroup>
    </div>
  );
};
