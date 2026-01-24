import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { usePageData } from '../../contexts/PageDataContext';
import { usePageHeader, usePageFooter } from '../../contexts/LayoutContext';
import { useSubscription } from '../../hooks/useSubscription';
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
  Mail
} from 'lucide-react';
import { motion, LayoutGroup } from 'framer-motion';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { SEOHead } from '../common/SEOHead';

// Responsive Grid Hook or similar logic can be added here if needed, 
// but CSS Grid with auto-fit/minmax is usually cleaner for "filling spaces".
// However, for the "water bubble" effect, Framer Motion's layout prop is key.

export const BentoHome = () => {
  const navigate = useNavigate();
  const { hasMinRole, isAdmin, isProvider, isPatient, isViewer, isSponsor, isOrgAdmin } = useAuth();
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
    loading,
    fetchActivityData,
    refreshAllData
  } = usePageData();

  // Use subscription hook for real data
  const { fetchAnalytics: fetchSubscriptionAnalytics } = useSubscription();
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

  // Calculate app-wide stats from all data sources
  const appStats = useMemo(() => ({
    liveEmergencies: emergencyStats?.critical || 0,
    responseTime: Math.round((analyticsData?.avgResponseTime || 4.2) * 10) / 10, // Round to 1 decimal place
    activeProviders: doctorsStats?.totalDoctors || 48,
    todayRequests: emergencyStats?.total || 0,
    totalUsers: userData?.statistics?.totalUsers || 23, // Fixed: Use actual user count from profiles table
    completionRate: analyticsData?.completionRate || 94,
    availableAmbulances: analyticsData?.availableAmbulances || 12,
    pendingVerifications: verificationData?.pending || 15
  }), [emergencyStats, analyticsData, doctorsStats, verificationData, userData]);

  // Debug: Log real data to console
  useEffect(() => {
    console.log('🔍 Dashboard Real Data Check:', {
      emergencyStats,
      analyticsData,
      doctorsStats,
      visitsStats,
      verificationData,
      appStats
    });
  }, [emergencyStats, analyticsData, doctorsStats, visitsStats, verificationData, appStats]);

  // Transform activity data for display
  const recentActivities = transformActivityData(activityData || []);

  // Individual card skeletons for better UX
  const EmergencyCardSkeleton = () => (
    <motion.div
      layout
      className="col-span-1 sm:col-span-2 lg:col-span-3 xl:col-span-3 row-span-2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="h-full min-h-[320px] glass-card-premium p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
        <div className="relative z-10 flex flex-col flex-1">
          <div className="space-y-2 flex-1">
            <div className="h-16 w-32 bg-muted/50 rounded-lg shimmer" />
            <div className="h-6 w-48 bg-muted/30 rounded-lg shimmer" />
          </div>
        </div>
        <div className="relative z-10 h-20">
          <div className="h-full w-full bg-muted/20 rounded-lg shimmer" />
        </div>
      </div>
    </motion.div>
  );

  const MetricCardSkeleton = () => (
    <motion.div
      layout
      className="col-span-1 sm:col-span-1 lg:col-span-2 xl:col-span-2 row-span-2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="h-full min-h-[320px] glass-card p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-muted/10 via-transparent to-transparent" />
        <div className="relative z-10 flex flex-col h-full justify-between gap-4">
          <div className="flex justify-between items-start">
            <div className="w-12 h-12 bg-muted/30 rounded-2xl shimmer" />
            <div className="w-16 h-6 bg-muted/20 rounded-lg shimmer" />
          </div>
          <div className="space-y-2">
            <div className="h-8 w-24 bg-muted/40 rounded-lg shimmer" />
            <div className="h-4 w-32 bg-muted/20 rounded-lg shimmer" />
          </div>
        </div>
      </div>
    </motion.div>
  );

  const QuickActionCardSkeleton = () => (
    <motion.div
      layout
      className="col-span-1 sm:col-span-1 lg:col-span-1 xl:col-span-1 row-span-1"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="h-full min-h-[140px] glass-card p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-muted/5 via-transparent to-transparent" />
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-muted/30 rounded-2xl shimmer" />
            <div className="w-8 h-8 bg-muted/20 rounded-lg shimmer" />
          </div>
          <div className="space-y-2">
            <div className="h-6 w-20 bg-muted/40 rounded-lg shimmer" />
            <div className="h-4 w-16 bg-muted/20 rounded-lg shimmer" />
          </div>
        </div>
      </div>
    </motion.div>
  );

  const headerActions = React.useMemo(() => (
    <Button
      variant="outline"
      size="sm"
      onClick={refreshAllData || fetchActivityData}
      className="surface-raised hover-lift squircle-full h-8 px-3 text-[10px] font-semibold"
    >
      <RefreshCw className="h-3 w-3 mr-1" />
      REFRESH STATS
    </Button>
  ), [refreshAllData, fetchActivityData]);

  // Fetch subscription analytics
  useEffect(() => {
    const fetchSubscriptionData = async () => {
      try {
        const data = await fetchSubscriptionAnalytics();
        setSubscriptionStats(data);
      } catch (error) {
        console.error('Error fetching subscription stats:', error);
      }
    };

    fetchSubscriptionData();
  }, [fetchSubscriptionAnalytics]);

  const chartData = [
    { time: '00:00', value: 5 },
    { time: '04:00', value: 8 },
    { time: '08:00', value: 15 },
    { time: '12:00', value: 22 },
    { time: '16:00', value: 18 },
    { time: '20:00', value: 12 },
  ];

  usePageHeader("Overview", headerActions);

  const footerContent = React.useMemo(() => {
    // Role-based footer content
    if (isAdmin()) {
      return (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full surface-3 uppercase tracking-widest text-[10px] font-bold text-success">
            <Activity className="w-3 h-3" />
            <span>System: Nominal</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full surface-2 uppercase tracking-widest text-[10px] font-bold">
            <span>Nodes: {appStats.totalUsers || 3} Active</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full surface-1 uppercase tracking-widest text-[10px] font-bold text-warning">
            <span>Emergencies: {appStats.liveEmergencies}</span>
          </div>
        </div>
      );
    }

    if (isOrgAdmin()) {
      return (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full surface-3 uppercase tracking-widest text-[10px] font-bold text-success">
            <Activity className="w-3 h-3" />
            <span>Hospital: Operational</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full surface-2 uppercase tracking-widest text-[10px] font-bold">
            <span>Staff: {appStats.activeProviders} Active</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full surface-1 uppercase tracking-widest text-[10px] font-bold text-warning">
            <span>Response: {appStats.responseTime}min</span>
          </div>
        </div>
      );
    }

    if (isProvider()) {
      return (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full surface-3 uppercase tracking-widest text-[10px] font-bold text-success">
            <Activity className="w-3 h-3" />
            <span>Available: Ready</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full surface-2 uppercase tracking-widest text-[10px] font-bold">
            <span>Patients: {appStats.todayRequests}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full surface-1 uppercase tracking-widest text-[10px] font-bold text-info">
            <span>Shift: Active</span>
          </div>
        </div>
      );
    }

    if (isPatient()) {
      return (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full surface-3 uppercase tracking-widest text-[10px] font-bold text-success">
            <Activity className="w-3 h-3" />
            <span>Care: Available</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full surface-2 uppercase tracking-widest text-[10px] font-bold">
            <span>Requests: {appStats.todayRequests}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full surface-1 uppercase tracking-widest text-[10px] font-bold text-info">
            <span>Support: Online</span>
          </div>
        </div>
      );
    }

    if (isSponsor()) {
      return (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full surface-3 uppercase tracking-widest text-[10px] font-bold text-success">
            <Activity className="w-3 h-3" />
            <span>Impact: Active</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full surface-2 uppercase tracking-widest text-[10px] font-bold">
            <span>Success: {appStats.completionRate}%</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full surface-1 uppercase tracking-widest text-[10px] font-bold text-warning">
            <span>Lives: {appStats.totalUsers}</span>
          </div>
        </div>
      );
    }

    // Default for viewers
    return (
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full surface-3 uppercase tracking-widest text-[10px] font-bold text-success">
          <Activity className="w-3 h-3" />
          <span>Platform: Online</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full surface-2 uppercase tracking-widest text-[10px] font-bold">
          <span>Services: Available</span>
        </div>
      </div>
    );
  }, [isAdmin, isOrgAdmin, isProvider, isPatient, isSponsor, appStats]);

  usePageFooter(footerContent, 'status');

  // Check if any critical data is still loading (after all hooks)
  const isLoading = loading?.emergency || loading?.analytics || loading?.doctors || loading?.visits || loading?.verification;

  // Show role-specific skeleton layout while loading (after all hooks)
  if (isLoading) {
    return (
      <div className="min-h-screen py-6 md:py-8">
        <SEOHead title="Dashboard" description="Loading emergency operations dashboard..." />
        <div className="pt-2" />
        <LayoutGroup>
          <motion.div
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6 auto-rows-min grid-flow-dense surface-1 rounded-3xl"
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


  return (
    <div className="min-h-screen py-6 md:py-8">
      <SEOHead title="Dashboard" description="Overview of emergency operations, fleet status, and medical staff." />
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
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6 auto-rows-min grid-flow-dense surface-1 rounded-3xl"
        >

          {/* Live Emergency Counter - Show based on role */}
          {(!isPatient() && !isViewer()) && (
            <motion.div
              layout
              className="col-span-1 sm:col-span-2 lg:col-span-3 xl:col-span-3 row-span-2"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            >
              <Link to="/map" className="block h-full group">
                <div className="h-full min-h-[320px] glass-card-premium p-8 flex flex-col justify-between cursor-pointer relative overflow-hidden hover-lift">
                  {/* Shared RGB Hive Effect */}
                  <div className="hover-glow hover-glow-primary" />

                  {/* Brand gradient background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  {/* Brand icon - fixed positioning */}
                  <div className="absolute top-6 right-6 z-30">
                    <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center border border-primary/30 transition-transform duration-300 group-hover:scale-110">
                      <Activity className="h-6 w-6 text-primary" />
                    </div>
                  </div>

                  <div className="relative z-10 flex flex-col flex-1">
                    <div className="space-y-2 flex-1">
                      <h2 className="text-7xl lg:text-8xl font-semibold text-foreground leading-none tracking-tight">
                        {appStats.liveEmergencies}
                      </h2>
                      <p className="text-xl text-muted-foreground font-medium">
                        {isPatient() ? 'Your Active Requests' : 'Active Emergencies'}
                      </p>
                    </div>
                  </div>

                  {/* Brand-colored chart */}
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

                  {/* Brand chevron - fixed positioning no overlap */}
                  <div className="absolute bottom-6 right-6 z-30 opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center border border-primary/30">
                      <ChevronRight className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          )}

          {/* Response Time - Admin/Org Admin Only */}
          {(isAdmin() || isOrgAdmin()) && (
            <motion.div
              layout
              className="col-span-1 sm:col-span-1 lg:col-span-2 xl:col-span-2 row-span-2"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.1, ease: [0.4, 0, 0.2, 1] }}
            >
              <div className="h-full min-h-[320px] glass-card p-8 flex flex-col justify-between cursor-pointer relative overflow-hidden group hover-lift">
                {/* Shared RGB Hive Effect */}
                <div className="hover-glow hover-glow-success" />

                {/* Success gradient background */}
                <div className="absolute inset-0 bg-gradient-to-br from-success/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Success icon - fixed positioning */}
                <div className="absolute top-6 right-6 z-30">
                  <div className="w-12 h-12 bg-success/20 rounded-2xl flex items-center justify-center border border-success/30 transition-transform duration-300 group-hover:scale-110">
                    <Clock className="h-6 w-6 text-success" />
                  </div>
                </div>

                <div className="relative z-10 flex flex-col flex-1">
                  <div className="space-y-2 flex-1">
                    <h3 className="text-6xl lg:text-7xl font-semibold text-foreground leading-none tracking-tight">
                      {appStats.responseTime}<span className="text-2xl text-muted-foreground ml-2">m</span>
                    </h3>
                    <p className="text-xl text-muted-foreground font-medium">Response Time</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-success font-medium text-sm relative z-10">
                  <CheckCircle2 className="h-5 w-5" />
                  <span>23% faster today</span>
                </div>

                {/* Success chevron - fixed positioning no overlap */}
                <div className="absolute bottom-6 right-6 z-30 opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <div className="w-10 h-10 bg-success/20 rounded-full flex items-center justify-center border border-success/30">
                    <ChevronRight className="h-5 w-5 text-success" />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Today's Requests - Provider+ Only */}
          {(!isPatient() && !isViewer() && !isSponsor()) && (
            <motion.div
              layout
              className="col-span-1 sm:col-span-1 lg:col-span-2 xl:col-span-2 row-span-2"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
            >
              <div className="h-full min-h-[320px] glass-card p-8 flex flex-col justify-between cursor-pointer relative overflow-hidden group hover-lift">
                {/* Shared RGB Hive Effect */}
                <div className="hover-glow hover-glow-info" />

                {/* Info gradient background */}
                <div className="absolute inset-0 bg-gradient-to-br from-info/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Info icon - fixed positioning */}
                <div className="absolute top-6 right-6 z-30">
                  <div className="w-12 h-12 bg-info/20 rounded-2xl flex items-center justify-center border border-info/30 transition-transform duration-300 group-hover:scale-110">
                    <Activity className="h-6 w-6 text-info" />
                  </div>
                </div>

                <div className="relative z-10 flex flex-col flex-1">
                  <div className="space-y-2 flex-1">
                    <h3 className="text-6xl lg:text-7xl font-semibold text-foreground leading-none tracking-tight">
                      {appStats.todayRequests}
                    </h3>
                    <p className="text-xl text-muted-foreground font-medium">
                      {isPatient() ? "Your Requests" : "Today's Requests"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-info font-medium text-sm relative z-10">
                  <TrendingUp className="h-5 w-5" />
                  <span>+8% vs yesterday</span>
                </div>

                {/* Info chevron - fixed positioning no overlap */}
                <div className="absolute bottom-6 right-6 z-30 opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <div className="w-10 h-10 bg-info/20 rounded-full flex items-center justify-center border border-info/30">
                    <ChevronRight className="h-5 w-5 text-info" />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Map View - Secondary Navigation Card */}
          <motion.div
            layout
            className="col-span-1 sm:col-span-1 lg:col-span-2 xl:col-span-2 row-span-1"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            <Link to="/map" className="block h-full group">
              <div className="h-full min-h-[160px] glass-card p-8 hover-lift cursor-pointer relative overflow-hidden flex flex-col justify-between">
                {/* Shared RGB Hive Effect */}
                <div className="hover-glow hover-glow-secondary" />

                {/* Secondary gradient background */}
                <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Secondary icon - fixed positioning */}
                <div className="absolute top-6 right-6 z-30">
                  <div className="w-12 h-12 bg-secondary/20 rounded-2xl flex items-center justify-center border border-secondary/30 transition-transform duration-300 group-hover:scale-110">
                    <MapPin className="h-6 w-6 text-secondary" />
                  </div>
                </div>

                <div className="relative z-10 flex flex-col h-full justify-between gap-4">
                  <div className="flex justify-between items-start">
                    <div className="w-12 h-12 bg-secondary/20 rounded-2xl flex items-center justify-center group-hover:opacity-0 transition-opacity">
                      <MapPin className="h-6 w-6 text-secondary" />
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <ChevronRight className="h-6 w-6 text-secondary" />
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-2xl tracking-tight text-foreground">Live Map</h4>
                    <p className="text-lg text-muted-foreground font-medium">Real-time tracking</p>
                  </div>
                </div>

                {/* Secondary chevron - fixed positioning no overlap */}
                <div className="absolute bottom-6 right-6 z-30 opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <div className="w-10 h-10 bg-secondary/20 rounded-full flex items-center justify-center border border-secondary/30">
                    <ChevronRight className="h-5 w-5 text-secondary" />
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Verification Queue (Medium) - Admin Only */}
          {isAdmin() && (
            <motion.div
              layout
              className="col-span-1 sm:col-span-1 lg:col-span-2 xl:col-span-2 row-span-1"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.24 }}
            >
              <Link to="/verification" className="block h-full group">
                <Card
                  className="h-full min-h-[160px] squircle-3xl glass shadow-premium p-6 hover-lift cursor-pointer relative overflow-hidden flex flex-col justify-between"
                >
                  {/* Apple hover glow effect */}
                  <div className="hover-glow hover-glow-warning" />
                  <div className="relative z-10 flex flex-col h-full justify-between gap-4">
                    <div className="flex justify-between items-start">
                      <div className="w-12 h-12 squircle surface-2 flex items-center justify-center">
                        <FileCheck className="h-6 w-6 text-warning" />
                      </div>
                      <Badge className="squircle-sm surface-2 text-warning font-bold editorial-subtitle px-2 py-0.5">{appStats.pendingVerifications} PENDING</Badge>
                    </div>
                    <div>
                      <h4 className="font-bold text-xl tracking-tight">Verification</h4>
                      <p className="text-sm text-muted-foreground font-medium">Review queue</p>
                      <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                        <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                          <ChevronRight className="h-5 w-5 text-warning ml-0.5" />
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            </motion.div>
          )}

          {/* Analytics (Medium) - Admin/Org Admin/Sponsor Only */}
          {(isAdmin() || isOrgAdmin() || isSponsor()) && (
            <motion.div
              layout
              className="col-span-1 sm:col-span-1 lg:col-span-2 xl:col-span-2 row-span-1"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.20 }}
            >
              <Link to="/analytics" className="block h-full group">
                <Card
                  className="h-full min-h-[160px] squircle-3xl glass shadow-premium p-6 hover-lift cursor-pointer relative overflow-hidden flex flex-col justify-between"
                >
                  {/* Dot Pattern for Data */}
                  <div className="absolute inset-0 opacity-10"
                    style={{ backgroundImage: 'radial-gradient(currentColor 1px, transparent 0)', backgroundSize: '16px 16px', color: 'hsl(var(--success))' }}>
                  </div>

                  {/* Apple hover glow effect */}
                  <div className="hover-glow hover-glow-success" />
                  <div className="relative z-10 flex flex-col h-full justify-between gap-4">
                    <div className="flex justify-between items-start">
                      <div className="w-12 h-12 squircle surface-2 flex items-center justify-center">
                        <TrendingUp className="h-6 w-6 text-success" />
                      </div>
                    </div>
                    <div>
                      <p className="editorial-subtitle text-success mb-1">INSIGHTS</p>
                      <h4 className="font-bold text-xl tracking-tight">Analytics</h4>
                      <p className="text-sm text-muted-foreground font-medium">
                        {isSponsor() ? 'Impact metrics' : isAdmin() ? 'System analytics' : 'Org metrics'}
                      </p>
                      <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                        <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                          <ChevronRight className="h-5 w-5 text-success ml-0.5" />
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            </motion.div>
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
                  <div className="h-full min-h-[320px] glass-card-premium p-8 flex flex-col justify-between cursor-pointer relative overflow-hidden hover-lift">
                    <div className="hover-glow hover-glow-primary" />
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    <div className="absolute top-6 right-6 z-30">
                      <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center border border-primary/30 transition-transform duration-300 group-hover:scale-110">
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

                    <div className="absolute bottom-6 right-6 z-30 opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center border border-primary/30">
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
                    <div className="h-full min-h-[140px] glass-card p-6 hover-lift cursor-pointer relative overflow-hidden">
                      <div className={`hover-glow hover-glow-${item.color}`} />
                      <div className={`absolute inset-0 bg-gradient-to-br from-${item.color}/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                      <div className="flex justify-between items-start">
                        <div className={`w-12 h-12 bg-${item.color}/20 rounded-2xl flex items-center justify-center border border-${item.color}/30 transition-transform duration-300 group-hover:scale-110`}>
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
                        <div className={`w-8 h-8 bg-${item.color}/20 rounded-full flex items-center justify-center border border-${item.color}/30`}>
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
                <div className="h-full min-h-[320px] glass-card-premium p-8 flex flex-col justify-between cursor-pointer relative overflow-hidden hover-lift">
                  <div className="hover-glow hover-glow-primary" />
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  <div className="absolute top-6 right-6 z-30">
                    <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center border border-primary/30 transition-transform duration-300 group-hover:scale-110">
                      <Activity className="h-6 w-6 text-primary" />
                    </div>
                  </div>

                  <div className="relative z-10 flex flex-col flex-1">
                    <div className="space-y-2 flex-1">
                      <h2 className="text-4xl lg:text-5xl font-semibold text-foreground leading-none tracking-tight">
                        iVisit Platform
                      </h2>
                      <p className="text-xl text-muted-foreground font-medium">Emergency Medical Services</p>
                    </div>
                  </div>

                  <div className="relative z-10">
                    <p className="text-sm text-muted-foreground">
                      Real-time emergency response coordination platform connecting patients with medical providers.
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Quick Info for Viewers */}
              {[
                { id: 'about', icon: Activity, label: 'About', sub: 'Platform info', color: 'primary', path: '/about' },
                { id: 'health-news', icon: TrendingUp, label: 'Health News', sub: 'Latest updates', color: 'success', path: '/health-news' },
                { id: 'contact', icon: Mail, label: 'Contact', sub: 'Get in touch', color: 'info', path: '/contact' },
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
                    <div className="h-full min-h-[140px] glass-card p-6 hover-lift cursor-pointer relative overflow-hidden">
                      <div className={`hover-glow hover-glow-${item.color}`} />
                      <div className={`absolute inset-0 bg-gradient-to-br from-${item.color}/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                      <div className="flex justify-between items-start">
                        <div className={`w-12 h-12 bg-${item.color}/20 rounded-2xl flex items-center justify-center border border-${item.color}/30 transition-transform duration-300 group-hover:scale-110`}>
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
                        <div className={`w-8 h-8 bg-${item.color}/20 rounded-full flex items-center justify-center border border-${item.color}/30`}>
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
                  <div className="h-full min-h-[320px] glass-card-premium p-8 flex flex-col justify-between cursor-pointer relative overflow-hidden hover-lift">
                    <div className="hover-glow hover-glow-success" />
                    <div className="absolute inset-0 bg-gradient-to-br from-success/10 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    <div className="absolute top-6 right-6 z-30">
                      <div className="w-12 h-12 bg-success/20 rounded-2xl flex items-center justify-center border border-success/30 transition-transform duration-300 group-hover:scale-110">
                        <TrendingUp className="h-6 w-6 text-success" />
                      </div>
                    </div>

                    <div className="relative z-10 flex flex-col flex-1">
                      <div className="space-y-2 flex-1">
                        <h2 className="text-6xl lg:text-7xl font-semibold text-foreground leading-none tracking-tight">
                          {appStats.completionRate}%
                        </h2>
                        <p className="text-xl text-muted-foreground font-medium">Success Rate</p>
                      </div>
                    </div>

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

                    <div className="absolute bottom-6 right-6 z-30 opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <div className="w-10 h-10 bg-success/20 rounded-full flex items-center justify-center border border-success/30">
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
                { id: 'reports', icon: FileCheck, label: 'Reports', sub: 'Monthly impact', color: 'primary', path: '/reports' },
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
                    <div className="h-full min-h-[140px] glass-card p-6 hover-lift cursor-pointer relative overflow-hidden">
                      <div className={`hover-glow hover-glow-${item.color}`} />
                      <div className={`absolute inset-0 bg-gradient-to-br from-${item.color}/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                      <div className="flex justify-between items-start">
                        <div className={`w-12 h-12 bg-${item.color}/20 rounded-2xl flex items-center justify-center border border-${item.color}/30 transition-transform duration-300 group-hover:scale-110`}>
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
                        <div className={`w-8 h-8 bg-${item.color}/20 rounded-full flex items-center justify-center border border-${item.color}/30`}>
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
            { id: 'hospitals', icon: Hospital, label: 'Hospitals', sub: `${analyticsData?.activeHospitals || 8}`, color: 'primary', path: '/hospitals' },
            { id: 'ambulances', icon: Ambulance, label: 'Fleet', sub: `${appStats.availableAmbulances}`, color: 'success', path: '/ambulances' },
            { id: 'doctors', icon: Stethoscope, label: 'Doctors', sub: `${doctorsStats?.totalDoctors || 48}`, color: 'info', path: '/doctors' },
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
                <div className="h-full min-h-[140px] glass-card p-6 hover-lift cursor-pointer relative overflow-hidden">
                  {/* Shared RGB Hive Effect */}
                  <div className={`hover-glow hover-glow-${item.color}`} />

                  {/* Brand-aware gradient */}
                  <div className={`absolute inset-0 bg-gradient-to-br from-${item.color}/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                  <div className="flex justify-between items-start">
                    <div className={`w-12 h-12 bg-${item.color}/20 rounded-2xl flex items-center justify-center border border-${item.color}/30 transition-transform duration-300 group-hover:scale-110`}>
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
                    <div className={`w-8 h-8 bg-${item.color}/20 rounded-full flex items-center justify-center border border-${item.color}/30`}>
                      <ChevronRight className={`h-4 w-4 text-${item.color}`} />
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}

          {/* Provider-Specific Quick Actions */}
          {isProvider() && !isAdmin() && !isOrgAdmin() && [
            { id: 'visits', icon: Calendar, label: 'My Visits', sub: `${visitsStats?.today || 24}`, color: 'warning', path: '/visits' },
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
                <div className="h-full min-h-[140px] glass-card p-6 hover-lift cursor-pointer relative overflow-hidden">
                  {/* Shared RGB Hive Effect */}
                  <div className={`hover-glow hover-glow-${item.color}`} />

                  {/* Brand-aware gradient */}
                  <div className={`absolute inset-0 bg-gradient-to-br from-${item.color}/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                  <div className="flex justify-between items-start">
                    <div className={`w-12 h-12 bg-${item.color}/20 rounded-2xl flex items-center justify-center border border-${item.color}/30 transition-transform duration-300 group-hover:scale-110`}>
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
                    <div className={`w-8 h-8 bg-${item.color}/20 rounded-full flex items-center justify-center border border-${item.color}/30`}>
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
            className="col-span-1 sm:col-span-2 lg:col-span-2 xl:col-span-2 row-span-1"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.8, ease: [0.4, 0, 0.2, 1] }}
          >
            <Link to="/trending" className="block h-full group">
              <div className="h-full min-h-[160px] glass-card p-8 hover-lift cursor-pointer relative overflow-hidden flex flex-col justify-between">
                {/* Shared RGB Hive Effect */}
                <div className="hover-glow hover-glow-warning" />

                {/* Warning gradient background */}
                <div className="absolute inset-0 bg-gradient-to-br from-warning/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Warning icon - fixed positioning */}
                <div className="absolute top-6 right-6 z-30">
                  <div className="w-12 h-12 bg-warning/20 rounded-2xl flex items-center justify-center border border-warning/30 transition-transform duration-300 group-hover:scale-110">
                    <TrendingUp className="h-6 w-6 text-warning" />
                  </div>
                </div>

                <div className="relative z-10 flex flex-col h-full justify-between gap-4">
                  <div className="flex justify-between items-start">
                    <div className="w-12 h-12 bg-warning/20 rounded-2xl flex items-center justify-center group-hover:opacity-0 transition-opacity">
                      <TrendingUp className="h-6 w-6 text-warning" />
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <ChevronRight className="h-6 w-6 text-warning" />
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-2xl tracking-tight text-foreground">Trending</h4>
                    <p className="text-lg text-muted-foreground font-medium">24 topics today</p>
                  </div>
                </div>

                {/* Warning chevron - fixed positioning no overlap */}
                <div className="absolute bottom-6 right-6 z-30 opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <div className="w-10 h-10 bg-warning/20 rounded-full flex items-center justify-center border border-warning/30">
                    <ChevronRight className="h-5 w-5 text-warning" />
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>

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
                  className="h-full min-h-[160px] geo-bg glass shadow-2xl p-6 hover-lift cursor-pointer relative overflow-hidden flex flex-col justify-between"
                >
                  {/* Subscription Background Pattern */}
                  <div className="absolute inset-0 opacity-5"
                    style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, currentColor 0%, transparent 40%), radial-gradient(circle at 75% 75%, currentColor 0%, transparent 40%), radial-gradient(circle at 75% 25%, currentColor 0%, transparent 30%), radial-gradient(circle at 25% 75%, currentColor 0%, transparent 30%)', backgroundSize: '50px 50px, 50px 50px, 40px 40px, 40px 40px', backgroundPosition: '0% 0%, 100% 100%, 100% 0%, 0% 100%', color: 'hsl(var(--info))' }}>
                  </div>

                  {/* Apple hover glow effect */}
                  <div className="hover-glow hover-glow-info" />

                  <div className="absolute top-0 right-0 p-6 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full surface-raised flex items-center justify-center shadow-lg relative z-10">
                        <Mail className="h-5 w-5 text-info" />
                      </div>
                    </div>
                  </div>

                  <div className="relative z-10 flex flex-col h-full justify-between gap-4">
                    <div className="flex justify-between items-start">
                      <div className="w-12 h-12 squircle bg-info/10 flex items-center justify-center group-hover:opacity-0 transition-opacity">
                        <Mail className="h-6 w-6 text-info" />
                      </div>
                      <Badge className="squircle-sm bg-info/20 text-info border-0 font-bold editorial-subtitle px-2 py-0.5">SUBSCRIPTIONS</Badge>
                    </div>
                    <div>
                      <p className="editorial-subtitle text-info mb-1">COMMUNITY</p>
                      <h4 className="font-bold text-xl tracking-tight">Subscriptions</h4>
                      <p className="text-sm text-muted-foreground font-medium">Manage subscribers & engagement</p>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-success" />
                          <span className="text-xs font-semibold text-success">{subscriptionStats.active} active</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-warning" />
                          <span className="text-xs font-semibold text-warning">{subscriptionStats.paid} premium</span>
                        </div>
                      </div>
                      <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 z-30">
                        <div className="w-10 h-10 rounded-full bg-info/10 flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
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
              <Card className="h-full min-h-[300px] squircle-3xl glass shadow-2xl p-7 flex flex-col w-full relative overflow-hidden group">
                {/* Tech Grid Background */}
                {/* Apple hover glow effect */}
                <div className="hover-glow hover-glow-primary" />
                <h4 className="font-bold text-lg mb-6 tracking-tight">System Status</h4>
                <div className="grid grid-cols-1 gap-6 flex-1">
                  {[
                    {
                      label: 'Success Rate',
                      value: `${appStats.completionRate}%`,
                      progress: appStats.completionRate,
                      color: 'success'
                    },
                    {
                      label: 'Fleet Active',
                      value: `${Math.round((appStats.availableAmbulances / (appStats.availableAmbulances + 4)) * 100)}%`,
                      progress: Math.round((appStats.availableAmbulances / (appStats.availableAmbulances + 4)) * 100),
                      color: 'primary'
                    },
                    {
                      label: 'Beds Available',
                      value: appStats.availableAmbulances * 13, // Estimate beds per ambulance
                      progress: Math.min(65, appStats.availableAmbulances * 5),
                      color: 'info'
                    },
                    {
                      label: 'System Health',
                      value: '99%',
                      progress: 99,
                      color: 'success'
                    },
                  ].map((stat, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground font-medium">{stat.label}</span>
                        <span className={`text-xl font-bold tracking-tighter text-${stat.color}`}>{stat.value}</span>
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
          )}

          {/* Recent Activity (Wide) */}
          <motion.div
            layout
            className="col-span-1 sm:col-span-2 lg:col-span-4 xl:col-span-3 row-span-2"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.65 }}
          >
            <Card className="h-full min-h-[300px] squircle-3xl glass shadow-2xl p-7 flex flex-col w-full relative overflow-hidden group">
              {/* Subtle Diagonal Lines */}
              <div className="absolute inset-0 opacity-5"
                style={{ backgroundImage: 'repeating-linear-gradient(45deg, currentColor 0, currentColor 1px, transparent 0, transparent 50%)', backgroundSize: '10px 10px' }}>
              </div>

              {/* Apple hover glow effect */}
              <div className="hover-glow hover-glow-primary" />

              <h4 className="font-bold text-lg mb-5 tracking-tight relative z-10">Recent Activity</h4>
              <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar relative z-10">
                {recentActivities.length > 0 ? (
                  recentActivities.map((activity, idx) => (
                    <div key={activity.id || idx} className="flex items-start gap-4 p-4 squircle bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer group border-0">
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
    </div>
  );
};
