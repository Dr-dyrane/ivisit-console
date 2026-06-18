"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { X, BarChart3, TrendingUp, Calendar, Globe, Tag, Newspaper, Eye, ChevronRight, ChevronLeft, AlertTriangle, Clock, Activity, Headphones, CheckCircle, Users, Shield, Star, FileText, Ban } from 'lucide-react';

/**
 * AnalyticsModal — Progressive Disclosure, Multiphase
 * Canon #3: Reveal Gradually
 * Canon #4: One Screen, One Action
 * Canon #19: Focused Forms (one phase at a time)
 *
 * Phase 0: Summary bubbles (always visible)
 * Phase 1: Source breakdown (drill-down)
 * Phase 2: Category breakdown (drill-down)
 */

/**
 * AnalyticsModal — Adaptive Progressive Disclosure (Universal)
 * Canon #3: Reveal Gradually
 * Canon #36: Consistency Wins
 * Canon #43: Mutate, Don't Multiply
 */

const PHASES_CONFIG = {
  news: [
    { id: 'summary', label: 'Overview' },
    { id: 'sources', label: 'By Source' },
    { id: 'categories', label: 'By Category' },
  ],
  emergency: [
    { id: 'summary', label: 'Response Pulse' },
    { id: 'priority', label: 'Priority Heat' },
    { id: 'status', label: 'Status Flow' },
  ],
  hospital: [
    { id: 'summary', label: 'Network Pulse' },
    { id: 'resources', label: 'Availability' },
    { id: 'verification', label: 'Verification' },
  ],
  ambulance: [
    { id: 'summary', label: 'Fleet Status' },
    { id: 'types', label: 'Vehicle Mix' },
    { id: 'verification', label: 'Compliance' },
  ],
  doctor: [
    { id: 'summary', label: 'Specialist Mesh' },
    { id: 'specialty', label: 'Specialties' },
    { id: 'verification', label: 'Credentials' },
  ],
  insurance: [
    { id: 'summary', label: 'Policy Coverage' },
    { id: 'providers', label: 'Providers' },
    { id: 'types', label: 'Policy Mix' },
  ],
  verification: [
    { id: 'summary', label: 'Identity Pulse' },
    { id: 'queue', label: 'Review Queue' },
    { id: 'trust', label: 'Trust Ratio' },
  ],
  support: [
    { id: 'summary', label: 'Support Pulse' },
    { id: 'priority', label: 'Urgency' },
    { id: 'category', label: 'Segments' },
  ],
  user: [
    { id: 'summary', label: 'Trust Network' },
    { id: 'roles', label: 'Role Mesh' },
    { id: 'growth', label: 'Activity' },
  ],
  subscription: [
    { id: 'summary', label: 'Revenue Pulse' },
    { id: 'tiers', label: 'Tier Mix' },
    { id: 'growth', label: 'Retention' },
  ],
  visit: [
    { id: 'summary', label: 'Visits Pulse' },
    { id: 'status', label: 'Lifecycle' },
    { id: 'trends', label: 'Volume' },
  ],
  generic: [
    { id: 'summary', label: 'Pulse' },
    { id: 'distribution', label: 'Segments' },
    { id: 'activity', label: 'History' },
  ]
};

export const AnalyticsModal = ({ open, onClose, analytics, type = 'news' }) => {
  const [phase, setPhase] = useState(0);

  if (!analytics) return null;

  const phases = PHASES_CONFIG[type] || PHASES_CONFIG.generic;
  const getPercentage = (value, total) => {
    const v = Number(value) || 0;
    const t = Number(total) || 0;
    return t > 0 ? Math.round((v / t) * 100) : 0;
  };

  const nextPhase = () => setPhase(p => Math.min(p + 1, phases.length - 1));
  const prevPhase = () => setPhase(p => Math.max(p - 1, 0));
  const isFirst = phase === 0;
  const isLast = phase === phases.length - 1;

  const handleClose = () => {
    setPhase(0);
    onClose();
  };

  // ── Phase Renderers ──────────────────────────────────

  const renderSummaryPhase = () => {
    const data = {
      news: [
        { label: 'Total News', value: analytics.total, icon: Newspaper, color: 'hsl(var(--primary))' },
        { label: 'Published', value: analytics.published, trend: `${getPercentage(analytics.published, analytics.total)}%`, icon: Eye, color: 'hsl(var(--success))' },
        { label: 'Recent', value: analytics.recent, icon: Calendar, color: 'hsl(var(--info))' },
        { label: 'Segments', value: Object.keys(analytics.byCategory || {}).length, icon: Tag, color: 'hsl(var(--warning))' }
      ],
      emergency: [
        { label: 'Requests', value: analytics.total || analytics.totalEmergencies, icon: AlertTriangle, color: 'hsl(var(--destructive))' },
        { label: 'Critical', value: analytics.critical, trend: `+${analytics.critical}`, icon: TrendingUp, color: 'hsl(var(--destructive))' },
        { label: 'Avg. Resp', value: `${(analytics.avgResponseTime || 12).toFixed(1)}m`, icon: Clock, color: 'hsl(var(--info))' },
        { label: 'Active', value: analytics.active, icon: Activity, color: 'hsl(var(--success))' }
      ],
      support: [
        { label: 'Total Tickets', value: analytics.total, icon: Headphones, color: 'hsl(var(--primary))' },
        { label: 'Resolved', value: analytics.resolved, trend: `${getPercentage(analytics.resolved, analytics.total)}%`, icon: CheckCircle, color: 'hsl(var(--success))' },
        { label: 'Avg Speed', value: `${Math.round(analytics.averageResolutionTime || 0)}h`, icon: Clock, color: 'hsl(var(--info))' },
        { label: 'Urgent', value: analytics.byPriority?.high || 0, icon: AlertTriangle, color: 'hsl(var(--warning))' }
      ],
      user: [
        { label: 'Total Users', value: analytics.totalUsers || 0, icon: Users, color: 'hsl(var(--primary))' },
        { label: 'Verified', value: analytics.verifiedUsers, trend: `${getPercentage(analytics.verifiedUsers, analytics.totalUsers)}%`, icon: Shield, color: 'hsl(var(--success))' },
        { label: 'New Signups', value: analytics.recentSignups, icon: TrendingUp, color: 'hsl(var(--info))' },
        { label: 'Profiles', value: analytics.totalProfiles, icon: Activity, color: 'hsl(var(--warning))' }
      ],
      visit: [
        { label: 'Total Visits', value: analytics.total, icon: Calendar, color: 'hsl(var(--primary))' },
        { label: 'Completed', value: analytics.completed, trend: `${getPercentage(analytics.completed, analytics.total)}%`, icon: CheckCircle, color: 'hsl(var(--success))' },
        { label: 'Scheduled', value: analytics.scheduled, icon: Clock, color: 'hsl(var(--info))' },
        { label: 'In Progress', value: analytics.inProgress, icon: Activity, color: 'hsl(var(--warning))' }
      ],
      ambulance: [
        { label: 'Total Fleet', value: analytics.total, icon: Activity, color: 'hsl(var(--primary))' },
        { label: 'Active', value: analytics.active, trend: `${getPercentage(analytics.active, analytics.total)}%`, icon: TrendingUp, color: 'hsl(var(--success))' },
        { label: 'Verified', value: analytics.verified, icon: Shield, color: 'hsl(var(--info))' },
        { label: 'Emergency', value: analytics.emergency || 0, icon: AlertTriangle, color: 'hsl(var(--destructive))' }
      ],
      hospital: [
        { label: 'Total Network', value: analytics.total, icon: Activity, color: 'hsl(var(--primary))' },
        { label: 'Verified', value: analytics.verified, trend: `${getPercentage(analytics.verified, analytics.total)}%`, icon: Shield, color: 'hsl(var(--success))' },
        { label: 'Emergency', value: analytics.emergency || 0, icon: AlertTriangle, color: 'hsl(var(--destructive))' },
        { label: 'Active', value: analytics.active, icon: TrendingUp, color: 'hsl(var(--info))' }
      ],
      doctor: [
        { label: 'Total Doctors', value: analytics.total, icon: Users, color: 'hsl(var(--primary))' },
        { label: 'Verified', value: analytics.verified, trend: `${getPercentage(analytics.verified, analytics.total)}%`, icon: Shield, color: 'hsl(var(--success))' },
        { label: 'Active', value: analytics.active, icon: Activity, color: 'hsl(var(--info))' },
        { label: 'Specialized', value: analytics.specialized || 0, icon: Star, color: 'hsl(var(--warning))' }
      ],
      insurance: [
        { label: 'Total Policies', value: analytics.total, icon: Shield, color: 'hsl(var(--primary))' },
        { label: 'Active', value: analytics.active, trend: `${getPercentage(analytics.active, analytics.total)}%`, icon: CheckCircle, color: 'hsl(var(--success))' },
        { label: 'Verified', value: analytics.verified, icon: Shield, color: 'hsl(var(--info))' },
        { label: 'Expired', value: analytics.expired, icon: AlertTriangle, color: 'hsl(var(--destructive))' }
      ],
      verification: [
        { label: 'Applications', value: analytics.total, icon: FileText, color: 'hsl(var(--primary))' },
        { label: 'Verified', value: analytics.approved || analytics.verified, trend: `${getPercentage(analytics.approved || analytics.verified, analytics.total)}%`, icon: CheckCircle, color: 'hsl(var(--success))' },
        { label: 'Pending', value: analytics.pending, icon: Clock, color: 'hsl(var(--warning))' },
        { label: 'Rejected', value: analytics.rejected, icon: Ban, color: 'hsl(var(--destructive))' }
      ]
    };

    const currentItems = data[type] || [
      { label: 'Total Items', value: analytics.total || 0, icon: BarChart3, color: 'hsl(var(--primary))' },
      { label: 'Active', value: analytics.active || 0, trend: `${getPercentage(analytics.active, analytics.total)}%`, icon: Activity, color: 'hsl(var(--success))' },
      { label: 'Movement', value: analytics.recent || 0, icon: TrendingUp, color: 'hsl(var(--info))' },
      { label: 'Diversity', value: Object.keys(analytics.byCategory || analytics.roleDistribution || {}).length, icon: Tag, color: 'hsl(var(--warning))' }
    ];

    return (
      <motion.div
        key="summary"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        className="space-y-4"
      >
        <div className="grid grid-cols-2 gap-2">
          {currentItems.map((item, i) => (
            <StatNode
              key={i}
              label={item.label}
              value={item.value}
              trend={item.trend}
              icon={item.icon}
              color={item.color}
            />
          ))}
        </div>

        <div className="p-4 apple-glass-heavy rounded-[24px] border-0 flex items-center justify-around text-center mt-2 group">
          <div className="flex flex-col items-center">
            <span className="text-[14px] font-normal tracking-tight">
              {getPercentage(
                analytics.active || analytics.published || analytics.verifiedUsers || analytics.resolved || analytics.completed,
                analytics.total || analytics.totalUsers || 1
              )}%
            </span>
            <span className="text-[7px] text-muted-foreground/40 uppercase tracking-[0.2em] mt-1 font-bold">Health Index</span>
          </div>
          <div className="w-px h-6 bg-foreground/5" />
          <div className="flex flex-col items-center">
            <span className="text-[14px] font-normal tracking-tight">{analytics.recent || analytics.recentSignups || analytics.critical || 0}</span>
            <span className="text-[7px] text-muted-foreground/40 uppercase tracking-[0.2em] mt-1 font-bold">In-Flow</span>
          </div>
          <div className="w-px h-6 bg-foreground/5" />
          <div className="flex flex-col items-center">
            <span className="text-[14px] font-normal tracking-tight">{Object.keys(analytics.byCategory || analytics.roleDistribution || analytics.byStatus || {}).length}</span>
            <span className="text-[7px] text-muted-foreground/40 uppercase tracking-[0.2em] mt-1 font-bold">Segments</span>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderDistributionPhase = () => {
    const dataSet = analytics.bySource || analytics.byPriority || analytics.roleDistribution || analytics.byProvider || analytics.byOrg || analytics.byCategory || {};
    const total = analytics.total || analytics.totalUsers || 1;

    return (
      <motion.div
        key="distribution"
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -10 }}
        className="space-y-2"
      >
        <div className="apple-glass-heavy rounded-[28px] p-4 border-0">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-1 rounded-full bg-primary/40" />
            <span className="text-[9px] font-medium uppercase tracking-[0.2em] text-muted-foreground/60">{phases[phase].label}</span>
          </div>
          <div className="space-y-3">
            {Object.entries(dataSet)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 6)
              .map(([key, count]) => (
                <div key={key} className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-end px-1">
                    <span className="text-[11px] font-normal tracking-tight capitalize opacity-80">{key.replace('_', ' ')}</span>
                    <span className="text-[10px] font-medium tabular-nums opacity-40">{getPercentage(count, total)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-muted/20 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${getPercentage(count, total)}%` }}
                      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                      className="h-full bg-primary/60 rounded-full shadow-[0_0_8px_rgba(var(--primary-rgb),0.2)]"
                    />
                  </div>
                </div>
              ))}
            {Object.keys(dataSet).length === 0 && (
              <p className="text-[9px] text-muted-foreground/30 text-center py-10 uppercase tracking-[0.2em]">Signal processing...</p>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  const renderDetailsPhase = () => {
    const dataSet = analytics.byCategory || analytics.byStatus || analytics.byTier || analytics.hospitalStats || {};

    return (
      <motion.div
        key="detailed"
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -10 }}
      >
        <div className="apple-glass-heavy rounded-[28px] p-4 border-0">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-1 rounded-full bg-success/40" />
            <span className="text-[9px] font-medium uppercase tracking-[0.2em] text-muted-foreground/60">{phases[phase].label}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(dataSet)
              .sort(([, a], [, b]) => b - a)
              .map(([key, count]) => (
                <div key={key} className="p-3 rounded-2xl bg-foreground/[0.03] flex flex-col items-center text-center group active:scale-[0.98] transition-transform">
                  <span className="text-[7px] font-bold uppercase tracking-[0.15em] opacity-30 mb-1 truncate w-full px-1 capitalize tracking-widest">{key.replace('_', ' ')}</span>
                  <span className="text-[16px] font-normal tracking-tighter tabular-nums">{count}</span>
                  <span className="text-[8px] font-medium text-primary/40 mt-0.5">
                    {getPercentage(count, analytics.total || analytics.totalUsers || 100)}%
                  </span>
                </div>
              ))}
            {Object.keys(dataSet).length === 0 && (
              <p className="col-span-2 text-[9px] text-muted-foreground/30 text-center py-10 uppercase tracking-[0.2em]">No segments detected</p>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  const phaseRenderers = [renderSummaryPhase, renderDistributionPhase, renderDetailsPhase];

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 overflow-hidden">
          {/* Backdrop (Canon #20) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/25 dark:bg-black/60 backdrop-blur-md"
            onClick={handleClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            role="dialog"

            aria-modal="true"

            className="relative z-10 w-full max-w-[400px] max-h-[85vh] overflow-hidden rounded-[32px] flex flex-col bg-background/90 dark:bg-transparent apple-glass-heavy border-0 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.15)] dark:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)]"
          >
            {/* Header (Canon #30, #39) */}
            <div className="flex items-center justify-between p-6 pb-2">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-[14px] flex items-center justify-center relative z-10 shadow-md"
                  style={{ background: 'radial-gradient(circle at 30% 30%, hsl(var(--primary) / 0.15), hsl(var(--primary) / 0.05))' }}
                >
                  <BarChart3 className="h-5 w-5 text-primary opacity-80" />
                </div>
                <div className="flex flex-col">
                  <p className="text-[8px] font-thin uppercase tracking-[0.2em] text-muted-foreground/60 mb-0.5">Analytic Engine</p>
                  <h2 className="text-[15px] font-normal tracking-tight text-foreground/90 capitalize leading-none">
                    {type.replace('-', ' ')}
                  </h2>
                </div>
              </div>
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={handleClose}
                className="h-10 w-10 rounded-[14px] apple-glass flex items-center justify-center border-0 text-muted-foreground/40 hover:text-foreground/80 transition-colors"
              >
                <X className="h-4 w-4" />
              </motion.button>
            </div>

            {/* Context Breadcrumb */}
            <div className="px-6 pb-4">
              <span className="text-[7px] font-bold text-primary/40 uppercase tracking-[0.3em]">{phases[phase]?.label}</span>
            </div>

            {/* Phase Progress Indicator */}
            <div className="flex gap-1 px-6 pb-6">
              {phases.map((p, i) => (
                <div
                  key={p.id}
                  className={`h-0.5 flex-1 rounded-full transition-all duration-700 ${i === phase
                    ? 'bg-primary'
                    : i < phase
                      ? 'bg-primary/20'
                      : 'bg-foreground/5'
                    }`}
                />
              ))}
            </div>

            {/* Content (Canon #5, #24) */}
            <div className="px-6 pb-8 overflow-y-auto no-scrollbar flex-1 min-h-[320px]">
              <AnimatePresence mode="wait">
                {phaseRenderers[phase] ? phaseRenderers[phase]() : null}
              </AnimatePresence>
            </div>

            {/* Control Strip (Canon #28, #37) */}
            <div className="p-6 pt-4 flex items-center justify-between bg-foreground/[0.02]">
              <Button
                variant="ghost"
                onClick={isFirst ? handleClose : prevPhase}
                className="h-12 rounded-[18px] text-[8px] font-bold tracking-[0.25em] uppercase px-6 border-0 hover:bg-white/5 active:scale-95 transition-all text-muted-foreground/60"
              >
                {isFirst ? 'DIMMISS' : 'PREVIOUS'}
              </Button>

              <div className="flex gap-1.5 items-center">
                {phases.map((_, i) => (
                  <div key={i} className={`h-1 rounded-full transition-all duration-500 ${i === phase ? 'bg-primary w-2.5' : 'bg-foreground/10 w-1'}`} />
                ))}
              </div>

              {!isLast ? (
                <Button
                  onClick={nextPhase}
                  className="h-12 rounded-[18px] text-[8px] font-bold tracking-[0.25em] uppercase px-8 bg-primary hover:bg-primary/90 text-white shadow-none active:scale-[0.97] transition-all"
                >
                  CONTINUE
                </Button>
              ) : (
                <Button
                  onClick={handleClose}
                  className="h-12 rounded-[18px] text-[8px] font-bold tracking-[0.25em] uppercase px-8 apple-glass border-0 text-foreground active:scale-[0.97] transition-all"
                >
                  COMPLETE
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

/* ── Refined Sub-components ──────────────────────────── */

const StatNode = ({ label, value, trend, icon: Icon, color }) => (
  <motion.div
    whileTap={{ scale: 0.98 }}
    className="p-3.5 rounded-[22px] bg-foreground/[0.04] dark:bg-transparent apple-glass-heavy border-0 relative overflow-hidden group active:bg-muted/40 transition-colors"
  >
    {/* Raised Action Node (Canon #369) */}
    <div className="flex justify-between items-start mb-2.5">
      <div
        className="w-8 h-8 rounded-[11px] flex items-center justify-center relative z-10 shadow-sm"
        style={{ background: `radial-gradient(circle at 30% 30%, ${color.replace(/\)$/, ' / 0.15)')}, ${color.replace(/\)$/, ' / 0.05)')})` }}
      >
        <Icon size={14} className="opacity-80" style={{ color }} />
      </div>
      {trend && (
        <span className="text-[10px] font-bold tabular-nums text-success px-1.5 py-0.5 rounded-full bg-success/5 self-center">
          {trend}
        </span>
      )}
    </div>

    <div className="flex flex-col">
      <span className="text-[8px] font-thin uppercase tracking-[0.15em] mb-0.5 opacity-40 group-hover:opacity-60 transition-opacity">
        {label}
      </span>
      <span className="text-[18px] font-normal tracking-tighter tabular-nums leading-none">
        {value}
      </span>
    </div>
  </motion.div>
);

