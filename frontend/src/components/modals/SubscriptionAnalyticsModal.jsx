import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Users, Mail, TrendingUp, Shield, CheckCircle,
  AlertTriangle, Crown, Calendar, X, BarChart3, ChevronRight
} from 'lucide-react';

export const SubscriptionAnalyticsModal = ({ open, onClose, analytics }) => {
  if (!analytics) return null;

  const formatNumber = (num) => new Intl.NumberFormat().format(num || 0);
  const getPct = (num, total) => total > 0 ? Math.round((num / total) * 100) : 0;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          {/* Backdrop: Ultra-dark blur for focus */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Modal: iOS Sheet behavior */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 100 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 100 }}
            transition={{ type: "spring", damping: 30, stiffness: 350 }}
            className="ios-material ios-sheet-container relative z-10 md:rounded-[40px] shadow-2xl overflow-hidden border border-foreground/10"
          >
            {/* Header: No border, just padding and depth */}
            <div className="flex items-center justify-between p-6 md:p-10 pb-4">
              <div className="flex items-center gap-5">
                <div className="p-3 bg-primary/15 rounded-2xl ios-bubble border-none">
                  <Users className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <h2 className="font-black text-2xl tracking-tighter leading-none">Analytics</h2>
                  <p className="text-sm font-medium text-muted-foreground opacity-60">Subscriber growth & performance</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full bg-foreground/5 hover:bg-foreground/10 transition-colors"
              >
                <X className="h-5 w-5 opacity-40" />
              </button>
            </div>

            {/* Content: Mobile zero-padding edge cases handled via ios-bubble */}
            <div className="flex-1 overflow-y-auto p-6 md:p-10 pt-4 space-y-6 custom-scrollbar">

              {/* Primary Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatBubble
                  label="Total Subs"
                  value={formatNumber(analytics.total)}
                  icon={<Users className="text-blue-500" />}
                />
                <StatBubble
                  label="Verified"
                  value={formatNumber(analytics.verified)}
                  subText={`${getPct(analytics.verified, analytics.total)}% trust rate`}
                  icon={<Shield className="text-green-500" />}
                />
                <StatBubble
                  label="Premium"
                  value={formatNumber(analytics.premium)}
                  subText="Gold status"
                  icon={<Crown className="text-orange-500" />}
                />
                <StatBubble
                  label="Pending"
                  value={formatNumber(analytics.pending)}
                  subText="Awaiting link"
                  icon={<AlertTriangle className="text-yellow-500" />}
                />
              </div>

              {/* Conversion & Engagement: Stacked Materials */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                <div className="ios-bubble p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black tracking-tight text-lg">Acquisition</h3>
                    <TrendingUp className="text-primary h-5 w-5 opacity-40" />
                  </div>

                  <div className="space-y-4">
                    <ProgressRow
                      label="Organic Growth"
                      pct={84}
                      color="bg-primary"
                    />
                    <ProgressRow
                      label="Direct Invite"
                      pct={getPct(analytics.welcomeEmailsSent, analytics.total)}
                      color="bg-blue-500"
                    />
                  </div>
                </div>

                <div className="ios-bubble p-8 flex flex-col justify-center text-center space-y-2">
                  <Mail className="h-8 w-8 text-primary mx-auto mb-2 opacity-40" />
                  <p className="text-4xl font-black tracking-tighter">
                    {getPct(analytics.welcomeEmailsSent, analytics.total)}%
                  </p>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    Welcome Engagement
                  </p>
                </div>

              </div>

              {/* Insights Section */}
              <div className="ios-bubble p-8">
                <div className="flex items-center gap-3 mb-6">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <h3 className="font-black tracking-tight text-lg">Health Insights</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <InsightCard
                    title="Conversion"
                    desc={`${analytics.paidConversionRate}% paid rate`}
                    status="success"
                  />
                  <InsightCard
                    title="Emails"
                    desc="High delivery success"
                    status="info"
                  />
                  <InsightCard
                    title="Retention"
                    desc="Stable link status"
                    status="warning"
                  />
                </div>
              </div>

            </div>

            {/* Footer: Fixed glass bottom */}
            <div className="p-6 md:p-10 pt-4 flex justify-end">
              <Button
                onClick={onClose}
                className="w-full md:w-auto py-6 px-10 rounded-2xl bg-primary text-white font-bold uppercase text-[10px] tracking-[0.3em] shadow-xl shadow-primary/20"
              >
                Close Analytics
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

/* --- APPLE UI SUB-COMPONENTS --- */

const StatBubble = ({ label, value, subText, icon }) => (
  <div className="ios-bubble p-6 group hover:scale-[1.02] transition-transform">
    <div className="flex justify-between items-start mb-4">
      <div className="p-2 bg-foreground/[0.03] rounded-xl">{icon}</div>
      <ChevronRight className="h-4 w-4 opacity-10 group-hover:opacity-100 transition-opacity" />
    </div>
    <p className="text-3xl font-black tracking-tighter mb-1">{value}</p>
    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-60">{label}</p>
    {subText && <p className="text-[10px] text-primary font-medium mt-1">{subText}</p>}
  </div>
);

const ProgressRow = ({ label, pct, color }) => (
  <div className="space-y-2">
    <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest">
      <span className="opacity-40">{label}</span>
      <span className="text-primary">{pct}%</span>
    </div>
    <div className="h-2 w-full bg-foreground/[0.05] rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        className={`h-full ${color} rounded-full`}
      />
    </div>
  </div>
);

const InsightCard = ({ title, desc, status }) => {
  const colors = {
    success: "bg-green-500/10 text-green-500",
    info: "bg-blue-500/10 text-blue-500",
    warning: "bg-orange-500/10 text-orange-500"
  };
  return (
    <div className={`p-4 rounded-2xl ${colors[status]} border border-current/10`}>
      <h4 className="font-bold text-xs uppercase tracking-widest mb-1">{title}</h4>
      <p className="text-sm font-medium opacity-80">{desc}</p>
    </div>
  );
};