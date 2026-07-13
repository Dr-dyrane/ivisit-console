import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import {
  Activity,
  ArrowRight,
  BarChart3,
  ChevronRight,
  Clock,
  MapPin,
  ShieldAlert,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Button } from '../../ui/button';

export const MapViewCard = React.memo(() => (
  <motion.div
    layout
    className="col-span-1 sm:col-span-1 lg:col-span-2 xl:col-span-2 row-span-2"
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.4, delay: 0.3, ease: [0.4, 0, 0.2, 1] }}
  >
    <Link to="/map" className="block h-full group">
      <div className="h-full min-h-[320px] bg-card/70 p-0 flex flex-col justify-between cursor-pointer relative overflow-hidden transition-colors">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-primary/20 z-10" />
          <div
            className="w-full h-full opacity-60 group-hover:opacity-80 transition-opacity duration-500 bg-cover bg-center"
            style={{ backgroundImage: "url('https://dlwtcmhdzoklveihuhjf.supabase.co/storage/v1/object/public/images/map.png')" }}
          />
        </div>
        <div className="relative z-10 p-8 flex flex-col justify-between h-full">
          <div className="flex justify-between items-start">
            <div className="w-12 h-12 bg-primary/20 rounded-card flex items-center justify-center animation-pulse-slow">
              <MapPin className="h-6 w-6 text-primary" />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-3xl font-semibold text-white tracking-tight">Active Map</h3>
            <p className="text-white/70 font-medium">Real-time fleet tracking</p>
          </div>
        </div>
        <div className="absolute bottom-6 right-6 z-20 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
          <div className="w-10 h-10 bg-primary/20 rounded-pill flex items-center justify-center">
            <ChevronRight className="h-5 w-5 text-primary" />
          </div>
        </div>
      </div>
    </Link>
  </motion.div>
));

export const VerificationQueueCard = React.memo(({ verificationStats }) => (
  <motion.div
    layout
    className="col-span-1 sm:col-span-1 lg:col-span-1 xl:col-span-1 row-span-2"
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.4, delay: 0.4, ease: [0.4, 0, 0.2, 1] }}
  >
    <Link to="/verifications" className="block h-full group">
      <div className="h-full min-h-[320px] bg-card/70 p-6 flex flex-col justify-between cursor-pointer relative overflow-hidden transition-colors">
        <div className="" />
        <div className="absolute inset-0 bg-gradient-to-br from-warning/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="w-12 h-12 bg-warning/20 rounded-card flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
          <ShieldAlert className="h-6 w-6 text-warning" />
        </div>
        <div className="space-y-1">
          <div className="flex items-baseline gap-1">
            <span className="text-5xl font-semibold text-foreground tracking-tight">
              {verificationStats.critical + verificationStats.high}
            </span>
          </div>
          <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Priority Queue</p>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Verification Backlog</span>
            <span className="text-warning font-bold">{verificationStats.pending} pending</span>
          </div>
          <div className="h-1.5 w-full bg-warning/10 rounded-pill overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(verificationStats.completed / (verificationStats.total || 1)) * 100}%` }}
              className="h-full bg-warning"
            />
          </div>
        </div>
        <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300">
          <ChevronRight className="h-5 w-5 text-warning" />
        </div>
      </div>
    </Link>
  </motion.div>
));

export const IncompleteOnboardingCard = React.memo(() => (
  <motion.div
    layout
    className="col-span-1 sm:col-span-2 lg:col-span-3 xl:col-span-3 row-span-1"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
  >
    <div className="h-full min-h-[160px] bg-card/70 p-6 flex items-center justify-between cursor-pointer relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-transparent opacity-50" />
      <div className="relative z-10 flex items-center gap-6">
        <div className="w-16 h-16 bg-primary/20 rounded-card flex items-center justify-center">
          <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }}>
            <ShieldAlert className="h-8 w-8 text-primary" />
          </motion.div>
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground">Complete Your Profile</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Your account is active, but your organization details are missing.
            Complete the setup to unlock full features and team management.
          </p>
        </div>
      </div>
      <div className="relative z-10 flex flex-col items-end gap-2">
        <Link to="/onboarding">
          <Button size="sm" className="gap-2 shadow-glow">
            Finish Setup
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
        <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Identity Confirmed</span>
      </div>
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-pill -mr-16 -mt-16" />
    </div>
  </motion.div>
));

export const AnalyticsQuickCard = React.memo(({ totalVisits, completionRate }) => (
  <motion.div
    layout
    className="col-span-1 lg:col-span-1 row-span-2"
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.4, delay: 0.5, ease: [0.4, 0, 0.2, 1] }}
  >
    <Link to="/analytics" className="block h-full group">
      <div className="h-full min-h-[320px] bg-card/70 p-6 flex flex-col justify-between cursor-pointer relative overflow-hidden transition-colors">
        <div className="" />
        <div className="absolute inset-0 bg-gradient-to-br from-info/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="w-12 h-12 bg-info/20 rounded-card flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
          <BarChart3 className="h-6 w-6 text-info" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Platform Stats</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-semibold text-foreground tracking-tight">{totalVisits}</span>
            <span className="text-sm text-info font-medium">Monthly Visits</span>
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-success/10 rounded-inner">
              <TrendingUp className="h-4 w-4 text-success" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Conversion</p>
              <p className="text-lg font-semibold text-success">{completionRate != null ? `${completionRate}%` : '\u2014'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-info/10 rounded-inner">
              <Users className="h-4 w-4 text-info" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Patient Satisfaction</p>
              <p className="text-lg font-semibold text-info">{'\u2014'}</p>
            </div>
          </div>
        </div>
        <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300">
          <ChevronRight className="h-5 w-5 text-info" />
        </div>
      </div>
    </Link>
  </motion.div>
));

export const EmergencyCounterCard = React.memo(({ liveEmergencies, chartData, isPatient }) => (
  <motion.div
    layout
    className="col-span-1 sm:col-span-2 lg:col-span-3 xl:col-span-3 row-span-2"
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
  >
    <Link to="/map" className="block h-full group">
      <div className="h-full min-h-[320px] bg-card/70 p-8 flex flex-col justify-between cursor-pointer relative overflow-hidden">
        <div className="" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute top-6 right-6 z-30">
          <div className="w-12 h-12 bg-primary/20 rounded-card flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
            <Activity className="h-6 w-6 text-primary" />
          </div>
        </div>
        <div className="relative z-10 flex flex-col flex-1">
          <div className="space-y-2 flex-1">
            <h2 className="text-7xl lg:text-8xl font-semibold text-foreground leading-none tracking-tight">{liveEmergencies}</h2>
            <p className="text-xl text-muted-foreground font-medium">
              {isPatient ? 'Your Active Requests' : 'Active Emergencies'}
            </p>
          </div>
        </div>
        {chartData && chartData.length > 0 && (
          <div className="relative z-10 h-20 min-w-[100px]">
            <ResponsiveContainer width="100%" height={80} minWidth={100}>
              <AreaChart data={chartData}>
                <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.1)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="absolute bottom-6 right-6 z-30 opacity-0 group-hover:opacity-100 transition-all duration-300">
          <div className="w-10 h-10 bg-primary/20 rounded-pill flex items-center justify-center">
            <ChevronRight className="h-5 w-5 text-primary" />
          </div>
        </div>
      </div>
    </Link>
  </motion.div>
));

export const ResponseTimeCard = React.memo(({ responseTime }) => (
  <motion.div
    layout
    className="col-span-1 sm:col-span-1 lg:col-span-2 xl:col-span-2 row-span-2"
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.4, delay: 0.1, ease: [0.4, 0, 0.2, 1] }}
  >
    <div className="h-full min-h-[320px] bg-card/70 p-8 flex flex-col justify-between cursor-pointer relative overflow-hidden group">
      <div className="" />
      <div className="absolute inset-0 bg-gradient-to-br from-success/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="absolute top-6 right-6 z-30">
        <div className="w-12 h-12 bg-success/20 rounded-card flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
          <Clock className="h-6 w-6 text-success" />
        </div>
      </div>
      <div className="relative z-10 flex flex-col flex-1">
        <div className="space-y-2 flex-1">
          <h3 className="text-6xl lg:text-7xl font-semibold text-foreground leading-none tracking-tight">
            {responseTime != null ? <>{responseTime}<span className="text-2xl text-muted-foreground ml-2">m</span></> : '\u2014'}
          </h3>
          <p className="text-xl text-muted-foreground font-medium">Response Time</p>
        </div>
      </div>
      <div className="absolute bottom-6 right-6 z-30 opacity-0 group-hover:opacity-100 transition-all duration-300">
        <div className="w-10 h-10 bg-success/20 rounded-pill flex items-center justify-center">
          <ChevronRight className="h-5 w-5 text-success" />
        </div>
      </div>
    </div>
  </motion.div>
));

export const RequestsCard = React.memo(({ requests, isPatient }) => (
  <motion.div
    layout
    className="col-span-1 sm:col-span-1 lg:col-span-2 xl:col-span-2 row-span-2"
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.4, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
  >
    <div className="h-full min-h-[320px] bg-card/70 p-8 flex flex-col justify-between cursor-pointer relative overflow-hidden group">
      <div className="" />
      <div className="absolute inset-0 bg-gradient-to-br from-info/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="absolute top-6 right-6 z-30">
        <div className="w-12 h-12 bg-info/20 rounded-card flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
          <Activity className="h-6 w-6 text-info" />
        </div>
      </div>
      <div className="relative z-10 flex flex-col flex-1">
        <div className="space-y-2 flex-1">
          <h3 className="text-6xl lg:text-7xl font-semibold text-foreground leading-none tracking-tight">{requests}</h3>
          <p className="text-xl text-muted-foreground font-medium">{isPatient ? 'Your Requests' : "Today's Requests"}</p>
        </div>
      </div>
      <div className="absolute bottom-6 right-6 z-30 opacity-0 group-hover:opacity-100 transition-all duration-300">
        <div className="w-10 h-10 bg-info/20 rounded-pill flex items-center justify-center">
          <ChevronRight className="h-5 w-5 text-info" />
        </div>
      </div>
    </div>
  </motion.div>
));

export const EmergencyCardSkeleton = React.memo(() => (
  <motion.div layout className="col-span-1 sm:col-span-2 lg:col-span-3 xl:col-span-3 row-span-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
    <div className="h-full min-h-[320px] bg-card/70 p-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
      <div className="relative z-10 flex flex-col flex-1">
        <div className="space-y-2 flex-1">
          <div className="h-16 w-32 bg-muted/50 rounded-inner shimmer" />
          <div className="h-6 w-48 bg-muted/30 rounded-inner shimmer" />
        </div>
      </div>
      <div className="relative z-10 h-20">
        <div className="h-full w-full bg-muted/20 rounded-inner shimmer" />
      </div>
    </div>
  </motion.div>
));

export const MetricCardSkeleton = React.memo(() => (
  <motion.div layout className="col-span-1 sm:col-span-1 lg:col-span-2 xl:col-span-2 row-span-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
    <div className="h-full min-h-[320px] bg-card/70 p-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-muted/5 via-transparent to-transparent" />
      <div className="relative z-10 flex flex-col flex-1">
        <div className="space-y-2 flex-1">
          <div className="h-14 w-24 bg-muted/40 rounded-inner shimmer" />
          <div className="h-6 w-40 bg-muted/20 rounded-inner shimmer" />
        </div>
      </div>
    </div>
  </motion.div>
));

export const QuickActionCardSkeleton = React.memo(() => (
  <motion.div layout className="col-span-1 sm:col-span-1 lg:col-span-1 xl:col-span-1 row-span-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
    <div className="h-full min-h-[140px] bg-card/70 p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-muted/5 via-transparent to-transparent" />
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-4">
          <div className="w-12 h-12 bg-muted/30 rounded-card shimmer" />
          <div className="w-8 h-8 bg-muted/20 rounded-inner shimmer" />
        </div>
        <div className="space-y-2">
          <div className="h-6 w-20 bg-muted/40 rounded-inner shimmer" />
          <div className="h-4 w-16 bg-muted/20 rounded-inner shimmer" />
        </div>
      </div>
    </div>
  </motion.div>
));

MapViewCard.displayName = 'MapViewCard';
VerificationQueueCard.displayName = 'VerificationQueueCard';
IncompleteOnboardingCard.displayName = 'IncompleteOnboardingCard';
AnalyticsQuickCard.displayName = 'AnalyticsQuickCard';
EmergencyCounterCard.displayName = 'EmergencyCounterCard';
ResponseTimeCard.displayName = 'ResponseTimeCard';
RequestsCard.displayName = 'RequestsCard';
EmergencyCardSkeleton.displayName = 'EmergencyCardSkeleton';
MetricCardSkeleton.displayName = 'MetricCardSkeleton';
QuickActionCardSkeleton.displayName = 'QuickActionCardSkeleton';
