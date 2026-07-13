import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Ambulance,
  Calendar,
  ChevronRight,
  Hospital,
  Mail,
  Stethoscope,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { Badge } from '../../ui/badge';
import { Card } from '../../ui/card';
import { LegacyQuickActionCard } from './LegacyQuickActionCard';

const TrendingTopicsCard = () => (
  <motion.div
    layout
    className="hidden col-span-1 sm:col-span-2 lg:col-span-2 xl:col-span-2 row-span-1"
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.4, delay: 0.7, ease: [0.4, 0, 0.2, 1] }}
  >
    <Link to="/community" className="block h-full group">
      <div className="h-full min-h-[160px] bg-card/70 shadow-sm p-6 cursor-pointer relative overflow-hidden flex flex-col justify-between">
        <div className="" />
        <div
          className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, currentColor 0%, transparent 40%), radial-gradient(circle at 75% 75%, currentColor 0%, transparent 40%)', backgroundSize: '60px 60px', color: 'hsl(var(--warning))' }}
        />
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
);

const WalletCard = ({ walletStats }) => (
  <motion.div
    layout
    className="col-span-1 sm:col-span-2 lg:col-span-2 xl:col-span-2 row-span-1"
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.4, delay: 0.75, ease: [0.4, 0, 0.2, 1] }}
  >
    <Link to="/wallet" className="block h-full group">
      <div className="h-full min-h-[160px] bg-card/70 shadow-sm p-6 cursor-pointer relative overflow-hidden flex flex-col justify-between">
        <div className="" />
        <div
          className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, currentColor 0%, transparent 40%), radial-gradient(circle at 75% 75%, currentColor 0%, transparent 40%)', backgroundSize: '60px 60px', color: 'hsl(var(--success))' }}
        />
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
                  currency: walletStats?.currency || 'USD',
                }).format(walletStats?.balance || 0)}
              </h4>
              <div className="flex items-center gap-1">
                {walletStats.trend >= 0
                  ? <TrendingUp className="h-3 w-3 text-success" />
                  : <TrendingDown className="h-3 w-3 text-destructive" />}
                <span className={`text-[10px] font-bold ${walletStats.trend >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {walletStats.trend >= 0 ? '+' : ''}{walletStats.trend}%
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground font-medium">
              Income Today: {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: walletStats?.currency || 'USD',
              }).format(walletStats?.todayIncome || 0)}
            </p>
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
);

const SubscriptionCard = ({ subscriptionStats }) => (
  <motion.div
    layout
    className="col-span-1 sm:col-span-2 lg:col-span-2 xl:col-span-2 row-span-1"
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay: 0.85 }}
  >
    <Link to="/subscriptions" className="block h-full group">
      <Card className="h-full min-h-[160px] bg-card/70 shadow-sm p-6 cursor-pointer relative overflow-hidden flex flex-col justify-between">
        <div
          className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, currentColor 0%, transparent 40%), radial-gradient(circle at 75% 75%, currentColor 0%, transparent 40%), radial-gradient(circle at 75% 25%, currentColor 0%, transparent 30%), radial-gradient(circle at 25% 75%, currentColor 0%, transparent 30%)', backgroundSize: '50px 50px, 50px 50px, 40px 40px, 40px 40px', backgroundPosition: '0% 0%, 100% 100%, 100% 0%, 0% 100%', color: 'hsl(var(--info))' }}
        />
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
);

const SystemStatusCard = ({ appStats }) => {
  const stats = [
    {
      label: 'Success Rate',
      value: appStats.completionRate != null ? `${appStats.completionRate}%` : '\u2014',
      progress: appStats.completionRate ?? 0,
      color: 'success',
    },
    {
      label: 'Fleet Active',
      value: appStats.availableAmbulances != null
        ? `${Math.round((appStats.availableAmbulances / (appStats.availableAmbulances + 4)) * 100)}%`
        : '\u2014',
      progress: appStats.availableAmbulances != null
        ? Math.round((appStats.availableAmbulances / (appStats.availableAmbulances + 4)) * 100)
        : 0,
      color: 'primary',
    },
  ];

  return (
    <motion.div
      layout
      className="col-span-1 sm:col-span-2 lg:col-span-4 xl:col-span-3 row-span-2"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: 0.6 }}
    >
      <Card className="h-full min-h-[300px] rounded-card bg-card/70 shadow-sm p-7 flex flex-col w-full relative overflow-hidden group">
        <div className="" />
        <h4 className="font-bold text-lg mb-6 tracking-tight">System Status</h4>
        <div className="grid grid-cols-1 gap-6 flex-1">
          {stats.map((stat, index) => (
            <div key={stat.label} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground font-medium">{stat.label}</span>
                <span className={`text-xl font-bold tracking-tighter text-${stat.color}`}>{stat.value}</span>
              </div>
              <div className="h-2 bg-muted/30 rounded-inner overflow-hidden">
                <motion.div
                  className={`h-full bg-${stat.color} rounded-inner`}
                  initial={{ width: 0 }}
                  animate={{ width: `${stat.progress}%` }}
                  transition={{ duration: 1, delay: 0.7 + (index * 0.1) }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </motion.div>
  );
};

export const LegacyBentoOperationsCards = ({
  analyticsData,
  appStats,
  doctorsStats,
  emergencyStats,
  hasMinRole,
  isAdmin,
  isOrgAdmin,
  isProvider,
  isSponsor,
  subscriptionStats,
  visitsStats,
  walletStats,
}) => (
  <>
    {(isAdmin() || isOrgAdmin()) && [
      { id: 'hospitals', icon: Hospital, label: 'Hospitals', sub: analyticsData?.activeHospitals != null ? `${analyticsData.activeHospitals}` : '\u2014', color: 'primary', path: '/hospitals' },
      { id: 'ambulances', icon: Ambulance, label: 'Fleet', sub: appStats.availableAmbulances != null ? `${appStats.availableAmbulances}` : '\u2014', color: 'success', path: '/ambulances' },
      { id: 'doctors', icon: Stethoscope, label: 'Doctors', sub: doctorsStats?.totalDoctors != null ? `${doctorsStats.totalDoctors}` : '\u2014', color: 'info', path: '/doctors' },
      { id: 'users', icon: Users, label: 'Users', sub: `${appStats.totalUsers}`, color: 'secondary', path: '/users', minRole: 'admin' },
    ].filter((item) => !item.minRole || hasMinRole(item.minRole)).map((item, index) => (
      <LegacyQuickActionCard key={item.id} item={item} index={index} testId />
    ))}

    {isProvider() && !isAdmin() && !isOrgAdmin() && [
      { id: 'visits', icon: Calendar, label: 'My Visits', sub: visitsStats?.today != null ? `${visitsStats.today}` : '\u2014', color: 'warning', path: '/visits' },
      { id: 'emergencies', icon: AlertTriangle, label: 'My Emergencies', sub: `${emergencyStats?.total || 0}`, color: 'destructive', path: '/emergencies' },
    ].map((item, index) => <LegacyQuickActionCard key={item.id} item={item} index={index} testId />)}

    <TrendingTopicsCard />
    {(isAdmin() || isOrgAdmin() || isSponsor()) && <WalletCard walletStats={walletStats} />}
    {isAdmin() && <SubscriptionCard subscriptionStats={subscriptionStats} />}
    {isAdmin() && <SystemStatusCard appStats={appStats} />}
  </>
);
