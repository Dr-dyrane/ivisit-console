import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { usePageData } from '../../contexts/PageDataContext';
import { usePageHeader, usePageFooter } from '../../contexts/LayoutContext';
import { Button } from '../ui/button';
import { RefreshCw } from 'lucide-react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { transformActivityData } from '../../utils/activityUtils';
import { BentoSkeleton } from '../common/Skeletons';
import {
  Activity,
  Users,
  Ambulance,
  Hospital,
  MapPin,
  FileCheck,
  Clock,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Stethoscope,
  Calendar,
  AlertTriangle,
  Grid, // Use Grid or LayoutGrid if available
  TrendingUp,
  BarChart3,
  ArrowRight,
  Mail,
  ShieldAlert,
  Settings
} from 'lucide-react';
import { motion, LayoutGroup } from 'framer-motion';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { SEOHead } from '../common/SEOHead';
import { getWalletSummary } from '../../services/walletService';
import { getSubscriptionAnalytics } from '../../services/subscriptionService';
import { Wallet, TrendingDown as TrendingDownIcon } from 'lucide-react';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { MobileDashboard } from '../mobile/MobileDashboard';
import { MobileDashboardSkeleton } from '../mobile/MobileSkeleton';
import { TodayHome } from './TodayHome';
// Remove incorrect StandardMap import

// Responsive Grid Hook or similar logic can be added here if needed, 
// but CSS Grid with auto-fit/minmax is usually cleaner for "filling spaces".
// However, for the "water bubble" effect, Framer Motion's layout prop is key.

const MapViewCard = React.memo(() => (
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

const VerificationQueueCard = React.memo(({ verificationStats }) => (
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

const IncompleteOnboardingCard = React.memo(({ onComplete }) => (
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
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
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

      {/* Decorative pulse */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-pill -mr-16 -mt-16" />
    </div>
  </motion.div>
));

const AnalyticsQuickCard = React.memo(({ totalVisits, completionRate }) => (
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
              <p className="text-lg font-semibold text-success">{completionRate != null ? `${completionRate}%` : '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-info/10 rounded-inner">
              <Users className="h-4 w-4 text-info" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Patient Satisfaction</p>
              <p className="text-lg font-semibold text-info">—</p>
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

// Card Components (Defined outside to prevent unnecessary re-renders/remounts)
const EmergencyCounterCard = React.memo(({ liveEmergencies, chartData, isPatient }) => (
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
            <h2 className="text-7xl lg:text-8xl font-semibold text-foreground leading-none tracking-tight">
              {liveEmergencies}
            </h2>
            <p className="text-xl text-muted-foreground font-medium">
              {isPatient ? 'Your Active Requests' : 'Active Emergencies'}
            </p>
          </div>
        </div>
        {chartData && chartData.length > 0 && (
          <div className="relative z-10 h-20 min-w-[100px]">
            <ResponsiveContainer width="100%" height={80} minWidth={100}>
              <AreaChart data={chartData}>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary) / 0.1)"
                  strokeWidth={2}
                />
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

const ResponseTimeCard = React.memo(({ responseTime }) => (
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
            {responseTime != null ? <>{responseTime}<span className="text-2xl text-muted-foreground ml-2">m</span></> : '—'}
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

const RequestsCard = React.memo(({ requests, isPatient }) => (
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
          <h3 className="text-6xl lg:text-7xl font-semibold text-foreground leading-none tracking-tight">
            {requests}
          </h3>
          <p className="text-xl text-muted-foreground font-medium">
            {isPatient ? "Your Requests" : "Today's Requests"}
          </p>
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

const EmergencyCardSkeleton = React.memo(() => (
  <motion.div
    layout
    className="col-span-1 sm:col-span-2 lg:col-span-3 xl:col-span-3 row-span-2"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
  >
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

const MetricCardSkeleton = React.memo(() => (
  <motion.div
    layout
    className="col-span-1 sm:col-span-1 lg:col-span-2 xl:col-span-2 row-span-2"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
  >
    <div className="h-full min-h-[320px] bg-card/70 p-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-muted/10 via-transparent to-transparent" />
      <div className="relative z-10 flex flex-col h-full justify-between gap-4">
        <div className="flex justify-between items-start">
          <div className="w-12 h-12 bg-muted/30 rounded-card shimmer" />
          <div className="w-16 h-6 bg-muted/20 rounded-inner shimmer" />
        </div>
        <div className="space-y-2">
          <div className="h-8 w-24 bg-muted/40 rounded-inner shimmer" />
          <div className="h-4 w-32 bg-muted/20 rounded-inner shimmer" />
        </div>
      </div>
    </div>
  </motion.div>
));

const QuickActionCardSkeleton = React.memo(() => (
  <motion.div
    layout
    className="col-span-1 sm:col-span-1 lg:col-span-1 xl:col-span-1 row-span-1"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
  >
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

export const BentoHome = () => {
  const navigate = useNavigate();
  const { user, profile, hasMinRole, isAdmin, isProvider, isPatient, isViewer, isSponsor, isOrgAdmin, isSkippedOnboarding } = useAuth();
  const {
    emergencyData,
    emergencyStats,
    analyticsData,
    doctorsData,
    doctorsStats,
    visitsData,
    visitsStats,
    verificationData,
    activityData,
    userData,
    loading,
    fetchActivityData,
    refreshAllData,
    refreshAllData: refreshAction
  } = usePageData();

  const { isMobile } = useBreakpoint();

  const [subscriptionStats, setSubscriptionStats] = useState({
    total: 0,
    active: 0,
    paid: 0,
    free: 0,
  });



  const [stats, setStats] = useState({
    liveEmergencies: 0,
    activeProviders: 0
  });

  const [walletStats, setWalletStats] = useState({
    balance: 0,
    todayIncome: 0,
    yesterdayIncome: 0,
    trend: 0,
    currency: 'USD'
  });

  // Calculate app-wide stats from all data sources
  const appStats = useMemo(() => {
    // Calculate today's requests from raw emergency data
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]; // 24 hours ago

    const todayRequests = emergencyData?.recent?.filter(req =>
      req.created_at?.startsWith(today)
    ).length || 0;

    const yesterdayRequests = emergencyData?.recent?.filter(req =>
      req.created_at?.startsWith(yesterday)
    ).length || 0;

    return {
      liveEmergencies: emergencyStats?.active || 0,
      responseTime: analyticsData?.avgResponseTime != null ? Math.round(analyticsData.avgResponseTime * 10) / 10 : null,
      activeProviders: doctorsStats?.totalDoctors || 0,
      todayRequests: todayRequests, // Shows actual today's count
      yesterdayRequests: yesterdayRequests, // For comparison
      totalUsers: userData?.statistics?.totalUsers || 0, // Fixed: Use actual user count from profiles table
      completionRate: analyticsData?.completionRate ?? null,
      availableAmbulances: analyticsData?.availableAmbulances ?? null,
      pendingVerifications: verificationData?.pending ?? null,
      totalVisits: visitsStats?.total || 0, // Added for AnalyticsQuickCard
    };
  }, [emergencyData, emergencyStats, analyticsData, doctorsStats, verificationData, userData, visitsStats]);

  const verificationStats = useMemo(() => ({
    pending: appStats.pendingVerifications,
    critical: verificationData?.critical || 0,
    high: verificationData?.high || 0,
    completed: verificationData?.completed || 0,
    total: verificationData?.total || 1,
  }), [appStats.pendingVerifications, verificationData]);

  // Debug: Log real data to console (commented out for performance)
  // useEffect(() => {
  //   console.log('Dashboard Real Data Check:', {
  //     emergencyStats,
  //     analyticsData,
  //     doctorsStats,
  //     visitsStats,
  //     verificationData,
  //     appStats
  //   });
  // }, [emergencyStats, analyticsData, doctorsStats, visitsStats, verificationData, appStats]);

  // Transform activity data for display
  const recentActivities = transformActivityData(activityData || []).slice(0, 5);

  const roleHomeKind = isOrgAdmin() && !isAdmin()
    ? 'org_admin'
    : isProvider() && !isAdmin() && !isOrgAdmin() && !isSponsor() && !isPatient() && !isViewer()
      ? 'provider'
      : isSponsor() && !isAdmin() && !isOrgAdmin()
        ? 'sponsor'
        : isViewer()
          ? 'viewer'
          : isAdmin()
            ? 'admin'
            : null;

  const roleHomeLabels = {
    admin: 'Platform admin',
    org_admin: 'Hospital admin',
    provider: 'Care provider',
    sponsor: 'Sponsor',
    viewer: 'Viewer',
  };

  const isTodayShell = Boolean(roleHomeKind) || (isMobile && isPatient());
  const shouldLoadSubscriptionStats = !roleHomeKind || (isMobile && isPatient());

  const todayHeaderAction = React.useMemo(() => (
    roleHomeKind ? (
      <span className="hidden md:inline-flex items-center rounded-pill bg-card/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {roleHomeLabels[roleHomeKind]}
      </span>
    ) : null
  ), [roleHomeKind]);

  const headerActions = React.useMemo(() => (
    <Button
      variant="outline"
      size="sm"
      onClick={refreshAllData || fetchActivityData}
      className="surface-raised rounded-pill h-8 px-3 text-[10px] font-semibold"
    >
      <RefreshCw className="h-3 w-3 mr-1" />
      REFRESH STATS
    </Button>
  ), [refreshAllData, fetchActivityData]);

  // Fetch subscription analytics
  useEffect(() => {
    if (!shouldLoadSubscriptionStats) return undefined;

    let isMounted = true;

    const fetchSubscriptionData = async () => {
      try {
        const data = await getSubscriptionAnalytics({ quiet: true });
        if (isMounted) {
          setSubscriptionStats(data);
        }
      } catch (error) {
        if (isMounted) {
          setSubscriptionStats({
            total: 0,
            active: 0,
            paid: 0,
            free: 0,
          });
        }
      }
    };

    fetchSubscriptionData();

    return () => {
      isMounted = false;
    };
  }, [shouldLoadSubscriptionStats]);

  // Fetch wallet stats
  useEffect(() => {
    if (isAdmin() || isOrgAdmin() || isSponsor()) {
      getWalletSummary(profile, isAdmin() || isSponsor()).then(setWalletStats);
    }
  }, [isAdmin, isOrgAdmin, isSponsor, profile]);

  const chartData = [];

  usePageHeader(isTodayShell ? "Today" : "Overview", isTodayShell ? todayHeaderAction : headerActions);

  const footerContent = React.useMemo(() => {
    // Role-based footer content
    if (isAdmin()) {
      return (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-pill surface-2 uppercase tracking-widest text-[10px] font-bold">
            <span>Nodes: {appStats.totalUsers ?? 0} Active</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-pill surface-1 uppercase tracking-widest text-[10px] font-bold text-warning">
            <span>Emergencies: {appStats.liveEmergencies}</span>
          </div>
        </div>
      );
    }

    if (isOrgAdmin()) {
      return (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-pill surface-2 uppercase tracking-widest text-[10px] font-bold">
            <span>Staff: {appStats.activeProviders} Active</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-pill surface-1 uppercase tracking-widest text-[10px] font-bold text-warning">
            <span>Response: {appStats.responseTime != null ? `${appStats.responseTime}min` : '—'}</span>
          </div>
        </div>
      );
    }

    if (isProvider()) {
      return (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-pill surface-3 uppercase tracking-widest text-[10px] font-bold">
            <Activity className="w-3 h-3" />
            <span>Patients Today: {appStats.todayRequests}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-pill surface-1 uppercase tracking-widest text-[10px] font-bold text-warning">
            <span>Active Emergencies: {appStats.liveEmergencies}</span>
          </div>
        </div>
      );
    }

    if (isPatient()) {
      return (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-pill surface-3 uppercase tracking-widest text-[10px] font-bold text-success">
            <Activity className="w-3 h-3" />
            <span>Care: Available</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-pill surface-2 uppercase tracking-widest text-[10px] font-bold">
            <span>Requests: {appStats.todayRequests}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-pill surface-1 uppercase tracking-widest text-[10px] font-bold text-info">
            <span>Support: Online</span>
          </div>
        </div>
      );
    }

    if (isSponsor()) {
      return (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-pill surface-2 uppercase tracking-widest text-[10px] font-bold">
            <span>Success: {appStats.completionRate != null ? `${appStats.completionRate}%` : '—'}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-pill surface-1 uppercase tracking-widest text-[10px] font-bold text-warning">
            <span>Lives: {appStats.totalUsers}</span>
          </div>
        </div>
      );
    }

    // Default for viewers
    return (
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-pill surface-3 uppercase tracking-widest text-[10px] font-bold text-success">
          <Activity className="w-3 h-3" />
          <span>Platform: Online</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-pill surface-2 uppercase tracking-widest text-[10px] font-bold">
          <span>Services: Available</span>
        </div>
      </div>
    );
  }, [isAdmin, isOrgAdmin, isProvider, isPatient, isSponsor, appStats]);

  usePageFooter(footerContent, 'status', !isTodayShell);

  // Check if any critical data is still loading (after all hooks)
  const isLoading = loading?.emergency || loading?.analytics || loading?.doctors || loading?.visits || loading?.verification;

  // Console roles use the canonical Today surface even while data is settling.
  if (roleHomeKind === 'org_admin') {
    return <TodayHome role="org_admin" />;
  }

  if (roleHomeKind === 'provider') {
    return <TodayHome role="provider" />;
  }

  if (roleHomeKind === 'sponsor') {
    return <TodayHome role="sponsor" />;
  }

  if (roleHomeKind === 'viewer') {
    return <TodayHome role="viewer" />;
  }

  if (roleHomeKind === 'admin') {
    return <TodayHome role="admin" />;
  }

  // Show role-specific skeleton layout while loading (after all hooks)
  if (isMobile && isLoading) {
    return <MobileDashboardSkeleton />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen py-6 md:py-8">
        <SEOHead title="Today" description="Loading console home." />
        <div className="pt-2" />
        <LayoutGroup>
          <motion.div
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6 auto-rows-min grid-flow-dense rounded-card"
          >
            {/* Emergency Counter Skeleton */}
            {!isPatient() && !isViewer() && <EmergencyCardSkeleton />}

            {/* Response Time Skeleton */}
            {(isAdmin() || isOrgAdmin()) && <MetricCardSkeleton />}

            {/* Today's Requests Skeleton */}
            {(isAdmin() || isOrgAdmin() || isProvider()) && <MetricCardSkeleton />}

            {/* Map View Skeleton */}
            {(isAdmin() || isOrgAdmin() || isProvider()) && <MetricCardSkeleton />}

            {/* Verification Queue Skeleton */}
            {isAdmin() && <MetricCardSkeleton />}

            {/* Analytics Skeleton */}
            {(isAdmin() || isOrgAdmin() || isSponsor()) && <MetricCardSkeleton />}

            {/* Patient-specific Skeletons */}
            {isPatient() && (
              <>
                <EmergencyCardSkeleton />
                <QuickActionCardSkeleton />
                <QuickActionCardSkeleton />
                <QuickActionCardSkeleton />
              </>
            )}

            {/* Viewer-specific Skeletons */}
            {isViewer() && (
              <>
                <EmergencyCardSkeleton />
                <QuickActionCardSkeleton />
                <QuickActionCardSkeleton />
              </>
            )}

            {/* Sponsor-specific Skeletons */}
            {isSponsor() && (
              <>
                <EmergencyCardSkeleton />
                <QuickActionCardSkeleton />
                <QuickActionCardSkeleton />
              </>
            )}

            {/* Quick Actions Skeletons */}
            {(isAdmin() || isOrgAdmin()) && (
              <>
                <QuickActionCardSkeleton />
                <QuickActionCardSkeleton />
                <QuickActionCardSkeleton />
                <QuickActionCardSkeleton />
              </>
            )}

            {/* Provider-specific Skeletons */}
            {isProvider() && !isAdmin() && !isOrgAdmin() && (
              <>
                <QuickActionCardSkeleton />
                <QuickActionCardSkeleton />
              </>
            )}
          </motion.div>
        </LayoutGroup>
      </div>
    );
  }

  // Mobile patients keep the mobile dashboard; all other roles get the responsive role home below.
  if (isMobile && isPatient()) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <SEOHead title="Today" description="Mobile home." />
        <MobileDashboard
          appStats={appStats}
          walletStats={walletStats}
          subscriptionStats={subscriptionStats}
          recentActivities={recentActivities}
          onRefresh={refreshAction || fetchActivityData}
          roleContext={{
            isAdmin: isAdmin(),
            isProvider: isProvider(),
            isPatient: isPatient(),
            isOrgAdmin: isOrgAdmin(),
            isSponsor: isSponsor()
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-6 md:py-8">
      <SEOHead title="Today" description="Console home." />
      {/* Header */}
      {/* Layout padding adjustment */}
      <div className="pt-2" />

      {/* Fluid Bento Grid */}
      {/* 
         - 'auto-rows-min': Allows rows to grow as needed for content
         - 'grid-flow-dense': The magic sauce. It fills gaps automatically.
      */}
      <LayoutGroup>
        {/* Apple-style Grid Container */}
        <motion.div
          layout
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6 auto-rows-min grid-flow-dense rounded-card"
        >
          {/* Finish Onboarding Reminder - Only for those who skipped */}
          {isSkippedOnboarding() && <IncompleteOnboardingCard />}

          {/* Live Emergency Counter - Show based on role */}
          {(!isPatient() && !isViewer()) && (
            <EmergencyCounterCard
              liveEmergencies={appStats.liveEmergencies}
              chartData={chartData}
              isPatient={isPatient()}
            />
          )}

          {/* Response Time - Admin/Org Admin Only */}
          {(isAdmin() || isOrgAdmin()) && (
            <ResponseTimeCard responseTime={appStats.responseTime} />
          )}

          {/* Today's Requests - Provider+ Only */}
          {(!isPatient() && !isViewer() && !isSponsor()) && (
            <RequestsCard requests={appStats.todayRequests} isPatient={isPatient()} />
          )}

          {/* Map View - Secondary Navigation Card */}
          {(isAdmin() || isOrgAdmin() || isProvider()) && <MapViewCard />}

          {/* Verification Queue - Admin Only */}
          {(isAdmin() || isOrgAdmin()) && <VerificationQueueCard verificationStats={verificationStats} />}

          {/* Analytics Overview - Show based on role */}
          {(isAdmin() || isOrgAdmin() || isSponsor()) && (
            <AnalyticsQuickCard
              totalVisits={appStats.totalVisits}
              completionRate={appStats.completionRate}
            />
          )}

          {/* Patient-Specific Cards */}
          {isPatient() && (
            <>
              {/* My Requests Card */}
              <motion.div
                layout
                className="col-span-1 sm:col-span-2 lg:col-span-3 xl:col-span-3 row-span-2"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
              >
                <Link to="/visits" className="block h-full group">
                  <div className="h-full min-h-[320px] bg-card/70 p-8 flex flex-col justify-between cursor-pointer relative overflow-hidden">
                    <div className="" />
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    <div className="absolute top-6 right-6 z-30">
                      <div className="w-12 h-12 bg-primary/20 rounded-card flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                        <Calendar className="h-6 w-6 text-primary" />
                      </div>
                    </div>

                    <div className="relative z-10 flex flex-col flex-1">
                      <div className="space-y-2 flex-1">
                        <h2 className="text-7xl lg:text-8xl font-semibold text-foreground leading-none tracking-tight">
                          {visitsStats?.today || 0}
                        </h2>
                        <p className="text-xl text-muted-foreground font-medium">My Active Requests</p>
                      </div>
                    </div>

                    {chartData && chartData.length > 0 && (
                      <div className="relative z-10 h-20 min-w-[100px]">
                        <ResponsiveContainer width="100%" height={80} minWidth={100}>
                          <AreaChart data={chartData}>
                            <Area
                              type="monotone"
                              dataKey="value"
                              stroke="hsl(var(--primary))"
                              fill="hsl(var(--primary) / 0.1)"
                              strokeWidth={2}
                            />
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

              {/* Quick Actions for Patients */}
              {[
                { id: 'new-request', icon: AlertTriangle, label: 'New Request', sub: 'Request emergency care', color: 'primary', path: '/emergency-request' },
                { id: 'my-visits', icon: Calendar, label: 'My Visits', sub: 'View appointments', color: 'success', path: '/visits' },
                { id: 'profile', icon: Users, label: 'Profile', sub: 'Manage my info', color: 'info', path: '/profile' },
              ].map((item, idx) => (
                <motion.div
                  layout
                  key={item.id}
                  className="col-span-1 sm:col-span-1 lg:col-span-1 xl:col-span-1 row-span-1"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: 0.4 + (idx * 0.05), ease: [0.4, 0, 0.2, 1] }}
                >
                  <Link to={item.path} className="block h-full group">
                    <div className="h-full min-h-[140px] bg-card/70 p-6 cursor-pointer relative overflow-hidden">
                      <div className={``} />
                      <div className={`absolute inset-0 bg-gradient-to-br from-${item.color}/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                      <div className="flex justify-between items-start">
                        <div className={`w-12 h-12 bg-${item.color}/20 rounded-card flex items-center justify-center transition-transform duration-300 group-hover:scale-110`}>
                          <item.icon className={`h-6 w-6 text-${item.color}`} />
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <ChevronRight className={`h-5 w-5 text-${item.color}`} />
                        </div>
                      </div>

                      <div className="mt-4">
                        <h4 className="font-semibold text-lg tracking-tight text-foreground">{item.label}</h4>
                        <p className="text-base text-muted-foreground font-medium">{item.sub}</p>
                      </div>

                      <div className="absolute bottom-6 right-6 z-30 opacity-0 group-hover:opacity-100 transition-all duration-300">
                        <div className={`w-8 h-8 bg-${item.color}/20 rounded-pill flex items-center justify-center`}>
                          <ChevronRight className={`h-4 w-4 text-${item.color}`} />
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </> // Added closing tag here
          )}

          {/* Viewer-Specific Cards */}
          {isViewer() && (
            <>
              {/* Public Information Card */}
              <motion.div
                layout
                className="col-span-1 sm:col-span-2 lg:col-span-3 xl:col-span-3 row-span-2"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
              >
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
                      <h2 className="text-3xl lg:text-4xl font-semibold text-foreground leading-tight tracking-tight">
                        Welcome to iVisit Console
                      </h2>
                      <p className="text-xl text-muted-foreground font-medium">View-only access</p>
                    </div>
                  </div>

                  <div className="relative z-10">
                    <p className="text-sm text-muted-foreground">
                      Your account has read-only access to this console. To manage providers, emergencies, or fleet, contact your organization administrator to request elevated permissions.
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Quick Info for Viewers */}
              {[
                { id: 'health-news', icon: TrendingUp, label: 'Health News', sub: 'Latest updates', color: 'success', path: '/health-news' },
                { id: 'settings', icon: Settings, label: 'Settings', sub: 'Account & preferences', color: 'primary', path: '/settings' },
                { id: 'support', icon: Mail, label: 'Support', sub: 'Get help', color: 'info', path: '/support-tickets' },
              ].map((item, idx) => (
                <motion.div
                  layout
                  key={item.id}
                  className="col-span-1 sm:col-span-1 lg:col-span-1 xl:col-span-1 row-span-1"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: 0.4 + (idx * 0.05), ease: [0.4, 0, 0.2, 1] }}
                >
                  <Link to={item.path} className="block h-full group">
                    <div className="h-full min-h-[140px] bg-card/70 p-6 cursor-pointer relative overflow-hidden">
                      <div className={``} />
                      <div className={`absolute inset-0 bg-gradient-to-br from-${item.color}/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                      <div className="flex justify-between items-start">
                        <div className={`w-12 h-12 bg-${item.color}/20 rounded-card flex items-center justify-center transition-transform duration-300 group-hover:scale-110`}>
                          <item.icon className={`h-6 w-6 text-${item.color}`} />
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <ChevronRight className={`h-5 w-5 text-${item.color}`} />
                        </div>
                      </div>

                      <div className="mt-4">
                        <h4 className="font-semibold text-lg tracking-tight text-foreground">{item.label}</h4>
                        <p className="text-base text-muted-foreground font-medium">{item.sub}</p>
                      </div>

                      <div className="absolute bottom-6 right-6 z-30 opacity-0 group-hover:opacity-100 transition-all duration-300">
                        <div className={`w-8 h-8 bg-${item.color}/20 rounded-pill flex items-center justify-center`}>
                          <ChevronRight className={`h-4 w-4 text-${item.color}`} />
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </>
          )}

          {/* Sponsor-Specific Cards */}
          {isSponsor() && (
            <>
              {/* Impact Overview Card */}
              <motion.div
                layout
                className="col-span-1 sm:col-span-2 lg:col-span-3 xl:col-span-3 row-span-2"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
              >
                <Link to="/analytics" className="block h-full group">
                  <div className="h-full min-h-[320px] bg-card/70 p-8 flex flex-col justify-between cursor-pointer relative overflow-hidden">
                    <div className="" />
                    <div className="absolute inset-0 bg-gradient-to-br from-success/10 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    <div className="absolute top-6 right-6 z-30">
                      <div className="w-12 h-12 bg-success/20 rounded-card flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                        <TrendingUp className="h-6 w-6 text-success" />
                      </div>
                    </div>

                    <div className="relative z-10 flex flex-col flex-1">
                      <div className="space-y-2 flex-1">
                        <h2 className="text-6xl lg:text-7xl font-semibold text-foreground leading-none tracking-tight">
                          {appStats.completionRate != null ? `${appStats.completionRate}%` : '—'}
                        </h2>
                        <p className="text-xl text-muted-foreground font-medium">Success Rate</p>
                      </div>
                    </div>

                    {chartData && chartData.length > 0 && (
                      <div className="relative z-10 h-20 min-w-[100px]">
                        <ResponsiveContainer width="100%" height={80} minWidth={100}>
                          <AreaChart data={chartData}>
                            <Area
                              type="monotone"
                              dataKey="value"
                              stroke="hsl(var(--success))"
                              fill="hsl(var(--success) / 0.1)"
                              strokeWidth={2}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    <div className="absolute bottom-6 right-6 z-30 opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <div className="w-10 h-10 bg-success/20 rounded-pill flex items-center justify-center">
                        <ChevronRight className="h-5 w-5 text-success" />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>

              {/* Sponsor Quick Actions */}
              {[
                { id: 'analytics', icon: BarChart3, label: 'Analytics', sub: 'Impact metrics', color: 'success', path: '/analytics' },
                { id: 'health-news', icon: TrendingUp, label: 'Health News', sub: 'Community updates', color: 'info', path: '/health-news' },
              ].map((item, idx) => (
                <motion.div
                  layout
                  key={item.id}
                  className="col-span-1 sm:col-span-1 lg:col-span-1 xl:col-span-1 row-span-1"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: 0.4 + (idx * 0.05), ease: [0.4, 0, 0.2, 1] }}
                >
                  <Link to={item.path} className="block h-full group">
                    <div className="h-full min-h-[140px] bg-card/70 p-6 cursor-pointer relative overflow-hidden">
                      <div className={``} />
                      <div className={`absolute inset-0 bg-gradient-to-br from-${item.color}/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                      <div className="flex justify-between items-start">
                        <div className={`w-12 h-12 bg-${item.color}/20 rounded-card flex items-center justify-center transition-transform duration-300 group-hover:scale-110`}>
                          <item.icon className={`h-6 w-6 text-${item.color}`} />
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <ChevronRight className={`h-5 w-5 text-${item.color}`} />
                        </div>
                      </div>

                      <div className="mt-4">
                        <h4 className="font-semibold text-lg tracking-tight text-foreground">{item.label}</h4>
                        <p className="text-base text-muted-foreground font-medium">{item.sub}</p>
                      </div>

                      <div className="absolute bottom-6 right-6 z-30 opacity-0 group-hover:opacity-100 transition-all duration-300">
                        <div className={`w-8 h-8 bg-${item.color}/20 rounded-pill flex items-center justify-center`}>
                          <ChevronRight className={`h-4 w-4 text-${item.color}`} />
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </>
          )}

          {/* Quick Actions - Admin/Org Admin Only */}
          {(isAdmin() || isOrgAdmin()) && [
            { id: 'hospitals', icon: Hospital, label: 'Hospitals', sub: analyticsData?.activeHospitals != null ? `${analyticsData.activeHospitals}` : '—', color: 'primary', path: '/hospitals' },
            { id: 'ambulances', icon: Ambulance, label: 'Fleet', sub: appStats.availableAmbulances != null ? `${appStats.availableAmbulances}` : '—', color: 'success', path: '/ambulances' },
            { id: 'doctors', icon: Stethoscope, label: 'Doctors', sub: doctorsStats?.totalDoctors != null ? `${doctorsStats.totalDoctors}` : '—', color: 'info', path: '/doctors' },
            { id: 'users', icon: Users, label: 'Users', sub: `${appStats.totalUsers}`, color: 'secondary', path: '/users', minRole: 'admin' },
          ].filter(item => !item.minRole || hasMinRole(item.minRole)).map((item, idx) => (
            <motion.div
              layout
              key={item.id}
              className="col-span-1 sm:col-span-1 lg:col-span-1 xl:col-span-1 row-span-1"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.4 + (idx * 0.05), ease: [0.4, 0, 0.2, 1] }}
            >
              <Link to={item.path} className="block h-full group" data-testid={`quick-${item.id}`}>
                <div className="h-full min-h-[140px] bg-card/70 p-6 cursor-pointer relative overflow-hidden">
                  {/* Shared RGB Hive Effect */}
                  <div className={``} />

                  {/* Brand-aware gradient */}
                  <div className={`absolute inset-0 bg-gradient-to-br from-${item.color}/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                  <div className="flex justify-between items-start">
                    <div className={`w-12 h-12 bg-${item.color}/20 rounded-card flex items-center justify-center transition-transform duration-300 group-hover:scale-110`}>
                      <item.icon className={`h-6 w-6 text-${item.color}`} />
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <ChevronRight className={`h-5 w-5 text-${item.color}`} />
                    </div>
                  </div>

                  <div className="mt-4">
                    <h4 className="font-semibold text-lg tracking-tight text-foreground">{item.label}</h4>
                    <p className="text-base text-muted-foreground font-medium">{item.sub}</p>
                  </div>

                  {/* Fixed chevron positioning no overlap */}
                  <div className="absolute bottom-6 right-6 z-30 opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <div className={`w-8 h-8 bg-${item.color}/20 rounded-pill flex items-center justify-center`}>
                      <ChevronRight className={`h-4 w-4 text-${item.color}`} />
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}

          {/* Provider-Specific Quick Actions */}
          {isProvider() && !isAdmin() && !isOrgAdmin() && [
            { id: 'visits', icon: Calendar, label: 'My Visits', sub: visitsStats?.today != null ? `${visitsStats.today}` : '—', color: 'warning', path: '/visits' },
            { id: 'emergencies', icon: AlertTriangle, label: 'My Emergencies', sub: `${emergencyStats?.total || 0}`, color: 'destructive', path: '/emergencies' },
          ].map((item, idx) => (
            <motion.div
              layout
              key={item.id}
              className="col-span-1 sm:col-span-1 lg:col-span-1 xl:col-span-1 row-span-1"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.4 + (idx * 0.05), ease: [0.4, 0, 0.2, 1] }}
            >
              <Link to={item.path} className="block h-full group" data-testid={`quick-${item.id}`}>
                <div className="h-full min-h-[140px] bg-card/70 p-6 cursor-pointer relative overflow-hidden">
                  {/* Shared RGB Hive Effect */}
                  <div className={``} />

                  {/* Brand-aware gradient */}
                  <div className={`absolute inset-0 bg-gradient-to-br from-${item.color}/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                  <div className="flex justify-between items-start">
                    <div className={`w-12 h-12 bg-${item.color}/20 rounded-card flex items-center justify-center transition-transform duration-300 group-hover:scale-110`}>
                      <item.icon className={`h-6 w-6 text-${item.color}`} />
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <ChevronRight className={`h-5 w-5 text-${item.color}`} />
                    </div>
                  </div>

                  <div className="mt-4">
                    <h4 className="font-semibold text-lg tracking-tight text-foreground">{item.label}</h4>
                    <p className="text-base text-muted-foreground font-medium">{item.sub}</p>
                  </div>

                  {/* Fixed chevron positioning no overlap */}
                  <div className="absolute bottom-6 right-6 z-30 opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <div className={`w-8 h-8 bg-${item.color}/20 rounded-pill flex items-center justify-center`}>
                      <ChevronRight className={`h-4 w-4 text-${item.color}`} />
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}


          {/* Trending Topics - Warning Card */}
          <motion.div
            layout
            className="hidden col-span-1 sm:col-span-2 lg:col-span-2 xl:col-span-2 row-span-1"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.7, ease: [0.4, 0, 0.2, 1] }}
          >
            <Link to="/community" className="block h-full group">
              <div className="h-full min-h-[160px] bg-card/70 shadow-sm p-6 cursor-pointer relative overflow-hidden flex flex-col justify-between">
                {/* Shared RGB Hive Effect */}
                <div className="" />

                {/* Subscription-style Pattern */}
                <div className="absolute inset-0 opacity-5"
                  style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, currentColor 0%, transparent 40%), radial-gradient(circle at 75% 75%, currentColor 0%, transparent 40%)', backgroundSize: '60px 60px', color: 'hsl(var(--warning))' }}>
                </div>

                {/* Top Right Icon - Appears on hover */}
                <div className="absolute top-0 right-0 p-6 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-pill surface-raised flex items-center justify-center shadow-lg relative z-10">
                      <TrendingUp className="h-5 w-5 text-warning" />
                    </div>
                  </div>
                </div>

                <div className="relative z-10 flex flex-col h-full justify-between gap-4">
                  <div className="flex justify-between items-start">
                    <div className="w-12 h-12 squircle bg-warning/10 flex items-center justify-center group-hover:opacity-0 transition-opacity">
                      <TrendingUp className="h-6 w-6 text-warning" />
                    </div>
                    <Badge className="rounded-inner bg-warning/20 text-warning font-bold editorial-subtitle px-2 py-0.5">TRENDING</Badge>
                  </div>
                  <div>
                    <p className="editorial-subtitle text-warning mb-1">REAL-TIME</p>
                    <h4 className="font-bold text-xl tracking-tight text-foreground">Trending Topics</h4>
                    <p className="text-sm text-muted-foreground font-medium">Search patterns and social health</p>

                    {/* Bottom Right Chevron - Appears on hover */}
                    <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 z-30">
                      <div className="w-10 h-10 rounded-pill bg-warning/10 flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                        <ChevronRight className="h-5 w-5 text-warning ml-0.5" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* iVisit Wallet - Admin/Org Admin/Sponsor Only */}
          {(isAdmin() || isOrgAdmin() || isSponsor()) && (
            <motion.div
              layout
              className="col-span-1 sm:col-span-2 lg:col-span-2 xl:col-span-2 row-span-1"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.75, ease: [0.4, 0, 0.2, 1] }}
            >
              <Link to="/wallet" className="block h-full group">
                <div className="h-full min-h-[160px] bg-card/70 shadow-sm p-6 cursor-pointer relative overflow-hidden flex flex-col justify-between">
                  {/* Shared RGB Hive Effect */}
                  <div className="" />

                  {/* Pattern background */}
                  <div className="absolute inset-0 opacity-5"
                    style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, currentColor 0%, transparent 40%), radial-gradient(circle at 75% 75%, currentColor 0%, transparent 40%)', backgroundSize: '60px 60px', color: 'hsl(var(--success))' }}>
                  </div>

                  {/* Top Right Icon - Appears on hover */}
                  <div className="absolute top-0 right-0 p-6 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-pill surface-raised flex items-center justify-center shadow-lg relative z-10">
                        <Wallet className="h-5 w-5 text-success" />
                      </div>
                    </div>
                  </div>

                  <div className="relative z-10 flex flex-col h-full justify-between gap-4">
                    <div className="flex justify-between items-start">
                      <div className="w-12 h-12 squircle bg-success/10 flex items-center justify-center group-hover:opacity-0 transition-opacity">
                        <Wallet className="h-6 w-6 text-success" />
                      </div>
                      <Badge className="rounded-inner bg-success/10 text-success font-bold editorial-subtitle px-2 py-0.5">WALLET</Badge>
                    </div>
                    <div>
                      <p className="editorial-subtitle text-success mb-1">FINANCE</p>
                      <div className="flex items-baseline gap-2">
                        <h4 className="font-bold text-xl tracking-tight text-foreground">
                          {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: walletStats?.currency || 'USD'
                          }).format(walletStats?.balance || 0)}
                        </h4>
                        <div className="flex items-center gap-1">
                          {walletStats.trend >= 0 ? (
                            <TrendingUp className="h-3 w-3 text-success" />
                          ) : (
                            <TrendingDownIcon className="h-3 w-3 text-destructive" />
                          )}
                          <span className={`text-[10px] font-bold ${walletStats.trend >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {walletStats.trend >= 0 ? '+' : ''}{walletStats.trend}%
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground font-medium">
                        Income Today: {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: walletStats?.currency || 'USD'
                        }).format(walletStats?.todayIncome || 0)}
                      </p>

                      {/* Bottom Right Chevron - Appears on hover */}
                      <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 z-30">
                        <div className="w-10 h-10 rounded-pill bg-success/10 flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                          <ChevronRight className="h-5 w-5 text-success ml-0.5" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          )}

          {/* Subscription Card - Admin Only */}
          {isAdmin() && (
            <motion.div
              layout
              className="col-span-1 sm:col-span-2 lg:col-span-2 xl:col-span-2 row-span-1"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.85 }}
            >
              <Link to="/subscriptions" className="block h-full group">
                <Card
                  className="h-full min-h-[160px] bg-card/70 shadow-sm p-6 cursor-pointer relative overflow-hidden flex flex-col justify-between"
                >
                  {/* Subscription Background Pattern */}
                  <div className="absolute inset-0 opacity-5"
                    style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, currentColor 0%, transparent 40%), radial-gradient(circle at 75% 75%, currentColor 0%, transparent 40%), radial-gradient(circle at 75% 25%, currentColor 0%, transparent 30%), radial-gradient(circle at 25% 75%, currentColor 0%, transparent 30%)', backgroundSize: '50px 50px, 50px 50px, 40px 40px, 40px 40px', backgroundPosition: '0% 0%, 100% 100%, 100% 0%, 0% 100%', color: 'hsl(var(--info))' }}>
                  </div>

                  {/* Apple hover glow effect */}
                  <div className="" />

                  <div className="absolute top-0 right-0 p-6 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-pill surface-raised flex items-center justify-center shadow-lg relative z-10">
                        <Mail className="h-5 w-5 text-info" />
                      </div>
                    </div>
                  </div>

                  <div className="relative z-10 flex flex-col h-full justify-between gap-4">
                    <div className="flex justify-between items-start">
                      <div className="w-12 h-12 squircle bg-info/10 flex items-center justify-center group-hover:opacity-0 transition-opacity">
                        <Mail className="h-6 w-6 text-info" />
                      </div>
                      <Badge className="rounded-inner bg-info/20 text-info font-bold editorial-subtitle px-2 py-0.5">SUBSCRIPTIONS</Badge>
                    </div>
                    <div>
                      <p className="editorial-subtitle text-info mb-1">COMMUNITY</p>
                      <h4 className="font-bold text-xl tracking-tight">Subscriptions</h4>
                      <p className="text-sm text-muted-foreground font-medium">Manage subscribers & engagement</p>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-pill bg-success" />
                          <span className="text-xs font-semibold text-success">{subscriptionStats?.active || 0} active</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-pill bg-warning" />
                          <span className="text-xs font-semibold text-warning">{subscriptionStats?.paid || 0} premium</span>
                        </div>
                      </div>
                      <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 z-30">
                        <div className="w-10 h-10 rounded-pill bg-info/10 flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                          <ChevronRight className="h-5 w-5 text-warning ml-0.5" />
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            </motion.div>
          )}

          {/* System Status (Wide) - Admin Only */}
          {isAdmin() && (
            <motion.div
              layout
              className="col-span-1 sm:col-span-2 lg:col-span-4 xl:col-span-3 row-span-2"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.6 }}
            >
              <Card className="h-full min-h-[300px] rounded-card bg-card/70 shadow-sm p-7 flex flex-col w-full relative overflow-hidden group">
                {/* Tech Grid Background */}
                {/* Apple hover glow effect */}
                <div className="" />
                <h4 className="font-bold text-lg mb-6 tracking-tight">System Status</h4>
                <div className="grid grid-cols-1 gap-6 flex-1">
                  {[
                    {
                      label: 'Success Rate',
                      value: appStats.completionRate != null ? `${appStats.completionRate}%` : '—',
                      progress: appStats.completionRate ?? 0,
                      color: 'success'
                    },
                    {
                      label: 'Fleet Active',
                      value: appStats.availableAmbulances != null
                        ? `${Math.round((appStats.availableAmbulances / (appStats.availableAmbulances + 4)) * 100)}%`
                        : '—',
                      progress: appStats.availableAmbulances != null
                        ? Math.round((appStats.availableAmbulances / (appStats.availableAmbulances + 4)) * 100)
                        : 0,
                      color: 'primary'
                    },
                  ].map((stat, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground font-medium">{stat.label}</span>
                        <span className={`text-xl font-bold tracking-tighter text-${stat.color}`}>{stat.value}</span>
                      </div>
                      <div className="h-2 bg-muted/30 rounded-inner overflow-hidden">
                        <motion.div
                          className={`h-full bg-${stat.color} rounded-inner`}
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
          )}

          {/* Recent Activity (Wide) */}
          <motion.div
            layout
            className="col-span-1 sm:col-span-2 lg:col-span-4 xl:col-span-3 row-span-2"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.65 }}
          >
            <Card className="h-full min-h-[300px] rounded-card bg-card/70 shadow-sm p-7 flex flex-col w-full relative overflow-hidden group">
              {/* Subtle Diagonal Lines */}
              <div className="absolute inset-0 opacity-5"
                style={{ backgroundImage: 'repeating-linear-gradient(45deg, currentColor 0, currentColor 2px, transparent 0, transparent 50%)', backgroundSize: '10px 10px' }}>
              </div>

              {/* Apple hover glow effect */}
              <div className="" />

              <h4 className="font-bold text-lg mb-5 tracking-tight relative z-10">Recent Activity</h4>
              <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar relative z-10">
                {recentActivities.length > 0 ? (
                  recentActivities.map((activity, idx) => (
                    <div key={activity.id || idx} className="flex items-start gap-4 p-4 squircle bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer group">
                      <div className={`w-10 h-10 squircle flex items-center justify-center ${activity.bg} flex-shrink-0 group-hover:scale-110 transition-transform shadow-inner`}>
                        <activity.icon className={`h-5 w-5 ${activity.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold leading-snug truncate-2">{activity.msg}</p>
                        <p className="text-xs text-muted-foreground mt-1 font-medium">{activity.time}</p>
                        {activity.user && (
                          <p className="text-xs text-muted-foreground mt-1 font-normal">by {activity.user}</p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center py-8">
                    <Activity className="h-8 w-8 text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground font-normal">No recent activity</p>
                    <p className="text-xs text-muted-foreground mt-1">Activity will appear here as users interact with the system</p>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>

        </motion.div>
      </LayoutGroup>
    </div >
  );
};
