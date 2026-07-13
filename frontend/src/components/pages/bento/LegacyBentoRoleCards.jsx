import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Calendar,
  ChevronRight,
  Mail,
  Settings,
  TrendingUp,
  Users,
} from 'lucide-react';
import { LegacyQuickActionCard } from './LegacyQuickActionCard';

const PatientLeadCard = ({ chartData, visitsStats }) => (
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
);

const ViewerLeadCard = () => (
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
          <h2 className="text-3xl lg:text-4xl font-semibold text-foreground leading-tight tracking-tight">Welcome to iVisit Console</h2>
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
);

const SponsorLeadCard = ({ appStats, chartData }) => (
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
              {appStats.completionRate != null ? `${appStats.completionRate}%` : '\u2014'}
            </h2>
            <p className="text-xl text-muted-foreground font-medium">Success Rate</p>
          </div>
        </div>
        {chartData && chartData.length > 0 && (
          <div className="relative z-10 h-20 min-w-[100px]">
            <ResponsiveContainer width="100%" height={80} minWidth={100}>
              <AreaChart data={chartData}>
                <Area type="monotone" dataKey="value" stroke="hsl(var(--success))" fill="hsl(var(--success) / 0.1)" strokeWidth={2} />
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
);

export const LegacyBentoRoleCards = ({
  appStats,
  chartData,
  isPatient,
  isSponsor,
  isViewer,
  visitsStats,
}) => (
  <>
    {isPatient() && (
      <>
        <PatientLeadCard chartData={chartData} visitsStats={visitsStats} />
        {[
          { id: 'new-request', icon: AlertTriangle, label: 'New Request', sub: 'Request emergency care', color: 'primary', path: '/emergency-request' },
          { id: 'my-visits', icon: Calendar, label: 'My Visits', sub: 'View appointments', color: 'success', path: '/visits' },
          { id: 'profile', icon: Users, label: 'Profile', sub: 'Manage my info', color: 'info', path: '/profile' },
        ].map((item, index) => <LegacyQuickActionCard key={item.id} item={item} index={index} />)}
      </>
    )}

    {isViewer() && (
      <>
        <ViewerLeadCard />
        {[
          { id: 'health-news', icon: TrendingUp, label: 'Health News', sub: 'Latest updates', color: 'success', path: '/health-news' },
          { id: 'settings', icon: Settings, label: 'Settings', sub: 'Account & preferences', color: 'primary', path: '/settings' },
          { id: 'support', icon: Mail, label: 'Support', sub: 'Get help', color: 'info', path: '/support-tickets' },
        ].map((item, index) => <LegacyQuickActionCard key={item.id} item={item} index={index} />)}
      </>
    )}

    {isSponsor() && (
      <>
        <SponsorLeadCard appStats={appStats} chartData={chartData} />
        {[
          { id: 'analytics', icon: BarChart3, label: 'Analytics', sub: 'Impact metrics', color: 'success', path: '/analytics' },
          { id: 'health-news', icon: TrendingUp, label: 'Health News', sub: 'Community updates', color: 'info', path: '/health-news' },
        ].map((item, index) => <LegacyQuickActionCard key={item.id} item={item} index={index} />)}
      </>
    )}
  </>
);
