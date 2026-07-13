import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/button';
import { ModalShell } from '../ui/ModalShell';
import { BarChart3, TrendingUp, Calendar, Tag, Newspaper, Eye, AlertTriangle, Clock, Activity, Headphones, CheckCircle, Users, Shield, Star, FileText, Ban } from 'lucide-react';

const PHASES_CONFIG = {
  news: [
    { id: 'summary', label: 'Overview' },
    { id: 'sources', label: 'By Source' },
    { id: 'categories', label: 'By Category' },
  ],
  emergency: [
    { id: 'summary', label: 'Summary' },
    { id: 'priority', label: 'Priority' },
    { id: 'status', label: 'Status' },
  ],
  hospital: [
    { id: 'summary', label: 'Summary' },
    { id: 'resources', label: 'Capacity' },
    { id: 'verification', label: 'Verification' },
  ],
  ambulance: [
    { id: 'summary', label: 'Summary' },
    { id: 'types', label: 'Vehicle types' },
    { id: 'verification', label: 'Verification' },
  ],
  doctor: [
    { id: 'summary', label: 'Summary' },
    { id: 'specialty', label: 'Specialties' },
    { id: 'verification', label: 'Verification' },
  ],
  insurance: [
    { id: 'summary', label: 'Summary' },
    { id: 'providers', label: 'Providers' },
    { id: 'types', label: 'Policy types' },
  ],
  verification: [
    { id: 'summary', label: 'Summary' },
    { id: 'queue', label: 'Review queue' },
    { id: 'trust', label: 'Outcomes' },
  ],
  support: [
    { id: 'summary', label: 'Summary' },
    { id: 'priority', label: 'Priority' },
    { id: 'category', label: 'Category' },
  ],
  user: [
    { id: 'summary', label: 'Summary' },
    { id: 'roles', label: 'Roles' },
    { id: 'growth', label: 'Activity' },
  ],
  subscription: [
    { id: 'summary', label: 'Summary' },
    { id: 'tiers', label: 'Plans' },
    { id: 'growth', label: 'Retention' },
  ],
  visit: [
    { id: 'summary', label: 'Summary' },
    { id: 'status', label: 'Lifecycle' },
    { id: 'trends', label: 'Volume' },
  ],
  payments: [
    { id: 'summary', label: 'Summary' },
    { id: 'distribution', label: 'Sources' },
    { id: 'lifecycle', label: 'Payment lifecycle' },
  ],
  generic: [
    { id: 'summary', label: 'Summary' },
    { id: 'distribution', label: 'Distribution' },
    { id: 'activity', label: 'Activity' },
  ]
};

const TYPE_LABELS = {
  news: 'News',
  emergency: 'Requests',
  hospital: 'Hospitals',
  ambulance: 'Ambulances',
  doctor: 'Doctors',
  insurance: 'Insurance',
  verification: 'Approvals',
  support: 'Support',
  user: 'Users',
  subscription: 'Subscriptions',
  visit: 'Visits',
  payments: 'Payments',
  generic: 'Statistics',
};

const SHARE_LABELS = {
  news: 'Published',
  emergency: 'Active',
  hospital: 'Verified',
  ambulance: 'Active',
  doctor: 'Verified',
  insurance: 'Active',
  verification: 'Approved',
  support: 'Resolved',
  user: 'Verified',
  subscription: 'Active',
  visit: 'Completed',
  payments: 'Completed',
};

const SECONDARY_LABELS = {
  insurance: 'Pending',
};

// Modal section-card canon (adapted to opaque-DOM tokens): translucent panel, borderless,
// no inner shadow. Section label + tiles/rows grouped inside.
const SECTION_CARD = 'rounded-card bg-foreground/[0.05] dark:bg-white/[0.07] p-4';
const SECTION_LABEL = 'text-[13px] font-semibold text-muted-foreground';

export const AnalyticsModal = ({ open, onClose, analytics, type = 'news' }) => {
  const [phase, setPhase] = useState(0);

  if (!analytics) return null;

  const phases = PHASES_CONFIG[type] || PHASES_CONFIG.generic;
  const displayType = TYPE_LABELS[type] || TYPE_LABELS.generic;
  const getPercentage = (value, total) => {
    const v = Number(value) || 0;
    const t = Number(total) || 0;
    return t > 0 ? Math.round((v / t) * 100) : 0;
  };
  const getSafePercentage = (value, total) => {
    const t = Number(total) || 0;
    if (t <= 0) return 'No data';
    return `${getPercentage(value, total)}%`;
  };
  const getTrendPercentage = (value, total) => {
    const t = Number(total) || 0;
    return t > 0 ? `${getPercentage(value, total)}%` : null;
  };
  const getCount = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const formatMinutes = (value, total) => {
    const parsed = Number(value);
    const hasRows = Number(total) > 0;
    if (!hasRows || !Number.isFinite(parsed)) return 'No data';
    return `${parsed.toFixed(1)}m`;
  };
  const getDataSetTotal = (dataSet = {}) => (
    Object.values(dataSet).reduce((sum, value) => sum + (Number(value) || 0), 0)
  );
  const isVisibleScopedDistribution = ['visible_page', 'loaded_preview'].includes(analytics.distributionScope);

  const nextPhase = () => setPhase(p => Math.min(p + 1, phases.length - 1));
  const prevPhase = () => setPhase(p => Math.max(p - 1, 0));
  const isFirst = phase === 0;
  const isLast = phase === phases.length - 1;

  const handleClose = () => {
    setPhase(0);
    onClose();
  };

  const renderSummaryPhase = () => {
    const requestTotal = getCount(analytics.total || analytics.totalEmergencies);
    const userTotal = getCount(analytics.totalUsers);
    const genericTotal = getCount(analytics.total);
    const data = {
      news: [
        { label: 'Articles', value: getCount(analytics.total), icon: Newspaper, color: 'hsl(199 89% 48%)' },
        { label: 'Published', value: getCount(analytics.published), trend: getTrendPercentage(analytics.published, analytics.total), icon: Eye, color: 'hsl(160 84% 39%)' },
        { label: 'Recent', value: getCount(analytics.recent), icon: Calendar, color: 'hsl(199 89% 48%)' },
        { label: 'Groups', value: Object.keys(analytics.byCategory || {}).length, icon: Tag, color: 'hsl(38 92% 50%)' }
      ],
      emergency: [
        { label: 'Requests', value: requestTotal, icon: AlertTriangle, color: 'hsl(199 89% 48%)' },
        { label: 'Needs review', value: getCount(analytics.pending ?? analytics.critical), icon: TrendingUp, color: getCount(analytics.pending ?? analytics.critical) > 0 ? 'hsl(var(--destructive))' : 'hsl(var(--muted-foreground))' },
        { label: 'Avg response', value: formatMinutes(analytics.avgResponseTime, requestTotal), icon: Clock, color: 'hsl(199 89% 48%)' },
        { label: 'Active', value: getCount(analytics.active), icon: Activity, color: 'hsl(160 84% 39%)' }
      ],
      support: [
        { label: 'Tickets', value: getCount(analytics.total), icon: Headphones, color: 'hsl(199 89% 48%)' },
        { label: 'Resolved', value: getCount(analytics.resolved), trend: getTrendPercentage(analytics.resolved, analytics.total), icon: CheckCircle, color: 'hsl(160 84% 39%)' },
        { label: 'Avg time', value: analytics.total > 0 ? `${Math.round(Number(analytics.averageResolutionTime) || 0)}h` : 'No data', icon: Clock, color: 'hsl(199 89% 48%)' },
        { label: 'High priority', value: getCount(analytics.byPriority?.high), icon: AlertTriangle, color: getCount(analytics.byPriority?.high) > 0 ? 'hsl(38 92% 50%)' : 'hsl(var(--muted-foreground))' }
      ],
      user: [
        { label: 'Users', value: userTotal, icon: Users, color: 'hsl(199 89% 48%)' },
        { label: 'Verified', value: getCount(analytics.verifiedUsers), trend: getTrendPercentage(analytics.verifiedUsers, analytics.totalUsers), icon: Shield, color: 'hsl(160 84% 39%)' },
        { label: 'New users', value: getCount(analytics.recentSignups), icon: TrendingUp, color: 'hsl(199 89% 48%)' },
        { label: 'Profiles', value: getCount(analytics.totalProfiles), icon: Activity, color: 'hsl(38 92% 50%)' }
      ],
      visit: [
        { label: 'Visits', value: genericTotal, icon: Calendar, color: 'hsl(199 89% 48%)' },
        { label: 'Completed', value: getCount(analytics.completed), trend: getTrendPercentage(analytics.completed, analytics.total), icon: CheckCircle, color: 'hsl(160 84% 39%)' },
        { label: 'Scheduled', value: getCount(analytics.scheduled), icon: Clock, color: 'hsl(199 89% 48%)' },
        { label: 'In progress', value: getCount(analytics.inProgress), icon: Activity, color: 'hsl(38 92% 50%)' }
      ],
      payments: [
        { label: 'Loaded records', value: genericTotal, icon: BarChart3, color: 'hsl(199 89% 48%)' },
        { label: 'Completed', value: getCount(analytics.completed), trend: getTrendPercentage(analytics.completed, analytics.paymentCount), icon: CheckCircle, color: 'hsl(160 84% 39%)' },
        { label: 'Needs review', value: getCount(analytics.needsReview), icon: AlertTriangle, color: getCount(analytics.needsReview) > 0 ? 'hsl(38 92% 50%)' : 'hsl(var(--muted-foreground))' },
        { label: 'Recent payments', value: getCount(analytics.recent), icon: Clock, color: 'hsl(199 89% 48%)' }
      ],
      ambulance: [
        { label: 'Units', value: genericTotal, icon: Activity, color: 'hsl(199 89% 48%)' },
        { label: 'Active', value: getCount(analytics.active), trend: getTrendPercentage(analytics.active, analytics.total), icon: TrendingUp, color: 'hsl(160 84% 39%)' },
        { label: 'Verified', value: getCount(analytics.verified), icon: Shield, color: 'hsl(199 89% 48%)' },
        { label: 'Emergency', value: getCount(analytics.emergency), icon: AlertTriangle, color: getCount(analytics.emergency) > 0 ? 'hsl(var(--destructive))' : 'hsl(var(--muted-foreground))' }
      ],
      hospital: [
        { label: 'Facilities', value: genericTotal, icon: Activity, color: 'hsl(199 89% 48%)' },
        { label: 'Verified', value: getCount(analytics.verified), trend: getTrendPercentage(analytics.verified, analytics.total), icon: Shield, color: 'hsl(160 84% 39%)' },
        { label: 'Emergency', value: getCount(analytics.emergency), icon: AlertTriangle, color: getCount(analytics.emergency) > 0 ? 'hsl(var(--destructive))' : 'hsl(var(--muted-foreground))' },
        { label: 'Active', value: getCount(analytics.active), icon: TrendingUp, color: 'hsl(199 89% 48%)' }
      ],
      doctor: [
        { label: 'Doctors', value: genericTotal, icon: Users, color: 'hsl(199 89% 48%)' },
        { label: 'Verified', value: getCount(analytics.verified), trend: getTrendPercentage(analytics.verified, analytics.total), icon: Shield, color: 'hsl(160 84% 39%)' },
        { label: 'Active', value: getCount(analytics.active), icon: Activity, color: 'hsl(199 89% 48%)' },
        { label: 'Specialists', value: getCount(analytics.specialized), icon: Star, color: 'hsl(38 92% 50%)' }
      ],
      insurance: [
        { label: 'Policies', value: genericTotal, icon: Shield, color: 'hsl(199 89% 48%)' },
        { label: 'Active', value: getCount(analytics.active), trend: getTrendPercentage(analytics.active, analytics.total), icon: CheckCircle, color: 'hsl(160 84% 39%)' },
        { label: 'Verified', value: getCount(analytics.verified), icon: Shield, color: 'hsl(199 89% 48%)' },
        { label: 'Expired', value: getCount(analytics.expired), icon: AlertTriangle, color: getCount(analytics.expired) > 0 ? 'hsl(38 92% 50%)' : 'hsl(var(--muted-foreground))' }
      ],
      verification: [
        { label: 'Applications', value: genericTotal, icon: FileText, color: 'hsl(199 89% 48%)' },
        { label: 'Approved', value: getCount(analytics.approved || analytics.verified), trend: getTrendPercentage(analytics.approved || analytics.verified, analytics.total), icon: CheckCircle, color: 'hsl(160 84% 39%)' },
        { label: 'Pending', value: getCount(analytics.pending), icon: Clock, color: 'hsl(38 92% 50%)' },
        { label: 'Rejected', value: getCount(analytics.rejected), icon: Ban, color: getCount(analytics.rejected) > 0 ? 'hsl(var(--destructive))' : 'hsl(var(--muted-foreground))' }
      ]
    };

    const currentItems = data[type] || [
      { label: 'Items', value: getCount(analytics.total), icon: BarChart3, color: 'hsl(199 89% 48%)' },
      { label: 'Active', value: getCount(analytics.active), trend: getTrendPercentage(analytics.active, analytics.total), icon: Activity, color: 'hsl(160 84% 39%)' },
      { label: 'Recent', value: getCount(analytics.recent), icon: TrendingUp, color: 'hsl(199 89% 48%)' },
      { label: 'Diversity', value: Object.keys(analytics.byCategory || analytics.roleDistribution || {}).length, icon: Tag, color: 'hsl(38 92% 50%)' }
    ];

    return (
      <motion.div
        key="summary"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        className="space-y-4"
      >
        <div className={SECTION_CARD}>
          <span className={`${SECTION_LABEL} mb-3 block`}>{TYPE_LABELS[type] || 'Overview'}</span>
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
        </div>

        <div className={`${SECTION_CARD} flex items-center justify-around text-center group`}>
          <div className="flex flex-col items-center">
            <span className="font-dashboard-numbers text-[14px] font-normal tracking-normal tabular-nums">
              {getSafePercentage(
                analytics.active || analytics.published || analytics.verifiedUsers || analytics.resolved || analytics.completed,
                type === 'payments' ? analytics.paymentCount : (analytics.total || analytics.totalUsers)
              )}
            </span>
            <span className="eyebrow mt-1 text-muted-foreground/55">{SHARE_LABELS[type] || 'Share'}</span>
          </div>
          <div className="h-1.5 w-1.5 rounded-pill bg-foreground/10" />
          <div className="flex flex-col items-center">
            <span className="font-dashboard-numbers text-[14px] font-normal tracking-normal tabular-nums">{getCount(analytics.recent || analytics.recentSignups || analytics.pending || analytics.critical)}</span>
            <span className="eyebrow mt-1 text-muted-foreground/55">{SECONDARY_LABELS[type] || 'Recent'}</span>
          </div>
          <div className="h-1.5 w-1.5 rounded-pill bg-foreground/10" />
          <div className="flex flex-col items-center">
            <span className="font-dashboard-numbers text-[14px] font-normal tracking-normal tabular-nums">{Object.keys(analytics.byCategory || analytics.roleDistribution || analytics.byStatus || {}).length}</span>
            <span className="eyebrow mt-1 text-muted-foreground/55">Groups</span>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderDistributionPhase = () => {
    const dataSet = analytics.bySource || analytics.byPriority || analytics.roleDistribution || analytics.byProvider || analytics.byOrg || analytics.byCategory || {};
    const total = analytics.total || analytics.totalUsers || 1;
    const scopedTotal = isVisibleScopedDistribution
      ? (Number(analytics.visibleCount) || getDataSetTotal(dataSet) || 1)
      : total;

    return (
      <motion.div
        key="distribution"
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -10 }}
        className="space-y-2"
      >
        <div className={SECTION_CARD}>
          <div className="flex items-center gap-2 mb-4">
            <div className="h-1.5 w-1.5 rounded-pill bg-sky-500/55" />
            <span className={SECTION_LABEL}>{phases[phase].label}</span>
          </div>
          {isVisibleScopedDistribution && (
            <p className="mb-4 rounded-inner bg-foreground/[0.04] dark:bg-white/[0.05] px-3 py-2 text-xs font-semibold text-muted-foreground">
              {analytics.distributionLabel || 'Visible page only'}
            </p>
          )}
          <div className="space-y-3">
            {Object.entries(dataSet)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 6)
              .map(([key, count]) => (
                <div key={key} className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-end px-1">
                    <span className="text-[11px] font-normal tracking-normal capitalize opacity-80">{key.replace('_', ' ')}</span>
                    <span className="font-dashboard-numbers text-[10px] font-medium tabular-nums opacity-40">{getPercentage(count, scopedTotal)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-muted/20 rounded-pill overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${getPercentage(count, scopedTotal)}%` }}
                      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                      className="h-full rounded-pill bg-sky-500/65 shadow-[0_0_8px_rgba(14,165,233,0.18)]"
                    />
                  </div>
                </div>
              ))}
            {Object.keys(dataSet).length === 0 && (
              <p className="py-10 text-center text-xs font-semibold text-muted-foreground/55">No data yet</p>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  const renderDetailsPhase = () => {
    const isLifecyclePhase = phases[phase]?.id === 'lifecycle';
    const dataSet = isLifecyclePhase
      ? (analytics.byStatus || {})
      : (analytics.byCategory || analytics.byStatus || analytics.byTier || analytics.hospitalStats || {});
    const scopedTotal = isLifecyclePhase
      ? (Number(analytics.lifecycleCount) || getDataSetTotal(dataSet) || 1)
      : isVisibleScopedDistribution
        ? (Number(analytics.visibleCount) || getDataSetTotal(dataSet) || 1)
        : (analytics.total || analytics.totalUsers || 100);

    return (
      <motion.div
        key="detailed"
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -10 }}
      >
        <div className={SECTION_CARD}>
          <div className="flex items-center gap-2 mb-4">
            <div className="h-1.5 w-1.5 rounded-pill bg-emerald-500/55" />
            <span className={SECTION_LABEL}>{phases[phase].label}</span>
          </div>
          {isVisibleScopedDistribution && (
            <p className="mb-4 rounded-inner bg-foreground/[0.04] dark:bg-white/[0.05] px-3 py-2 text-xs font-semibold text-muted-foreground">
              {analytics.distributionLabel || 'Visible page only'}
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(dataSet)
              .sort(([, a], [, b]) => b - a)
              .map(([key, count]) => (
                <div key={key} className="p-3 rounded-inner bg-foreground/[0.03] dark:bg-white/[0.04] flex flex-col items-center text-center group active:scale-[0.98] transition-transform">
                  <span className="mb-1 w-full truncate px-1 text-xs font-semibold capitalize text-muted-foreground/65">{key.replace('_', ' ')}</span>
                  <span className="font-dashboard-numbers text-[16px] font-normal tracking-normal tabular-nums">{count}</span>
                  <span className="mt-0.5 text-[10px] font-semibold text-sky-600/70 dark:text-sky-300/80">
                    {getPercentage(count, scopedTotal)}%
                  </span>
                </div>
              ))}
            {Object.keys(dataSet).length === 0 && (
              <p className="col-span-2 py-10 text-center text-xs font-semibold text-muted-foreground/55">No groups yet</p>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  const phaseRenderers = [renderSummaryPhase, renderDistributionPhase, renderDetailsPhase];

  const footer = (
    <div className="flex items-center justify-between gap-3">
      <Button
        variant="ghost"
        onClick={isFirst ? handleClose : prevPhase}
        className="h-12 rounded-button px-5 text-xs font-semibold text-muted-foreground/70 transition-all hover:bg-foreground/5 active:scale-95 sm:px-6"
      >
        {isFirst ? 'Close' : 'Previous'}
      </Button>

      <div className="flex items-center gap-1.5">
        {phases.map((_, i) => (
          <div
            key={i}
            className={`h-1 rounded-pill transition-all duration-500 ${i === phase ? 'w-2.5 bg-sky-500' : 'w-1 bg-foreground/10'}`}
          />
        ))}
      </div>

      {!isLast ? (
        <Button
          onClick={nextPhase}
          className="h-12 rounded-button bg-foreground px-7 text-xs font-semibold text-background shadow-none transition-all hover:bg-foreground/90 active:scale-[0.97] sm:px-8"
        >
          Next
        </Button>
      ) : (
        <Button
          onClick={handleClose}
          className="h-12 rounded-button px-7 text-xs font-semibold text-foreground transition-all active:scale-[0.97] bg-background/80 backdrop-blur-xl sm:px-8"
        >
          Done
        </Button>
      )}
    </div>
  );

  return (
    <ModalShell
      isOpen={open}
      onClose={handleClose}
      title="Statistics"
      subtitle={displayType}
      icon={<BarChart3 className="h-5 w-5 text-sky-600 opacity-90 dark:text-sky-300" />}
      footer={footer}
      size="md"
      className="bg-background/95 backdrop-blur-md dark:bg-background/90"
    >
      <div className="px-5 pb-6 sm:px-6">
        <div className="pb-4">
          <span className="text-xs font-semibold text-sky-600/75 dark:text-sky-300/80">{phases[phase]?.label}</span>
        </div>

        <div className="flex gap-1 pb-6">
          {phases.map((p, i) => (
            <div
              key={p.id}
              className={`h-0.5 flex-1 rounded-pill transition-all duration-700 ${i === phase
                ? 'bg-sky-500'
                : i < phase
                  ? 'bg-sky-500/25'
                  : 'bg-foreground/5'
                }`}
            />
          ))}
        </div>

        <div className="min-h-[320px]">
          <AnimatePresence mode="wait">
            {phaseRenderers[phase] ? phaseRenderers[phase]() : null}
          </AnimatePresence>
        </div>
      </div>
    </ModalShell>
  );
};


const StatNode = ({ label, value, trend, icon: Icon, color }) => (
  <motion.div
    whileTap={{ scale: 0.98 }}
    className="p-3.5 rounded-inner bg-foreground/[0.03] dark:bg-white/[0.04] relative overflow-hidden group active:bg-foreground/[0.06] transition-colors"
  >
    {/* Action node — icon + optional trend */}
    <div className="flex justify-between items-start mb-2.5">
      <div
        className="w-8 h-8 rounded-icon flex items-center justify-center relative z-10"
        style={{ background: `radial-gradient(circle at 30% 30%, ${color.replace(/\)$/, ' / 0.15)')}, ${color.replace(/\)$/, ' / 0.05)')})` }}
      >
        <Icon size={14} className="opacity-80" style={{ color }} />
      </div>
      {trend && (
        <span className="text-[10px] font-bold tabular-nums text-emerald-500 px-1.5 py-0.5 rounded-pill bg-emerald-500/5 self-center">
          {trend}
        </span>
      )}
    </div>

    <div className="flex flex-col">
      <span className="eyebrow mb-0.5 text-muted-foreground/60 transition-opacity group-hover:text-muted-foreground/80">
        {label}
      </span>
      <span className="font-dashboard-numbers text-[18px] font-normal tracking-normal tabular-nums leading-none">
        {value}
      </span>
    </div>
  </motion.div>
);
