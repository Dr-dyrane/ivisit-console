import React, { useMemo } from 'react';
import {
  Activity,
  Ambulance,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  Crown,
  Hospital,
  Loader2,
  Minus,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AnalyticsTimeRangeControl,
  formatAnalyticsWindow,
  formatMetricNumber,
  formatResponseMinutes,
  getAnalyticsScopeLabel,
  getVolumeComparison,
} from '../../analytics/AnalyticsSummaryPrimitives';

const SOURCE_UNAVAILABLE = 'Unavailable';
const CHART_HEIGHT = 228;
const CHART_INITIAL_DIMENSION = { width: 1, height: CHART_HEIGHT };

const SectionHeading = ({ title, detail }) => (
  <div className="mb-4 flex items-end justify-between gap-4 px-1">
    <div className="min-w-0">
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      {detail && <p className="mt-1 text-sm text-muted-foreground">{detail}</p>}
    </div>
  </div>
);

const toneClasses = {
  sky: 'bg-sky-500/10 text-sky-700 dark:text-sky-200',
  emerald: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200',
  amber: 'bg-amber-500/10 text-amber-700 dark:text-amber-200',
  violet: 'bg-violet-500/10 text-violet-700 dark:text-violet-200',
  cyan: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-200',
  muted: 'bg-foreground/[0.055] text-muted-foreground dark:bg-white/[0.06]',
};

const MetricCard = ({ icon: Icon, label, value, detail, tone = 'muted' }) => (
  <article className="min-h-[148px] rounded-card bg-card/72 p-5 shadow-e2 backdrop-blur-xl dark:bg-white/[0.055]">
    <div className={`flex h-10 w-10 items-center justify-center rounded-icon ${toneClasses[tone]}`}>
      <Icon className="h-5 w-5" />
    </div>
    <p className="mt-5 text-sm font-medium text-muted-foreground">{label}</p>
    <p className="mt-1 text-2xl font-semibold text-foreground tabular-nums">{value}</p>
    <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
  </article>
);

const HighlightCard = ({ icon: Icon, title, value, detail, tone, onOpenDetails }) => {
  const Component = onOpenDetails ? 'button' : 'article';
  return (
    <Component
      type={onOpenDetails ? 'button' : undefined}
      onClick={onOpenDetails}
      className={`min-h-[184px] rounded-card bg-card/72 p-6 text-left shadow-e2 backdrop-blur-xl dark:bg-white/[0.055] ${onOpenDetails
        ? 'transition-[background,box-shadow,transform] hover:-translate-y-0.5 hover:bg-card/85 hover:shadow-e3 active:scale-[0.99]'
        : ''}`}
    >
      <div className="flex items-start justify-between gap-5">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-icon ${toneClasses[tone]}`}>
          <Icon className="h-5 w-5" />
        </span>
        {onOpenDetails && <ArrowUpRight className="h-4 w-4 text-muted-foreground" />}
      </div>
      <p className="mt-6 text-sm font-medium text-muted-foreground">{title}</p>
      <p className="mt-1 text-3xl font-semibold text-foreground tabular-nums">{value}</p>
      <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{detail}</p>
    </Component>
  );
};

const EmptyCard = ({ title, detail }) => (
  <div className="rounded-card bg-card/60 px-6 py-8 shadow-e2 dark:bg-white/[0.045]">
    <p className="text-sm font-semibold text-foreground">{title}</p>
    <p className="mt-2 text-sm text-muted-foreground">{detail}</p>
  </div>
);

const getBreakdownTone = (label = '', index = 0) => {
  const normalized = label.toLowerCase();
  if (normalized.includes('complete')) return 'bg-emerald-500';
  if (normalized.includes('cancel') || normalized.includes('declined')) return 'bg-destructive';
  if (normalized.includes('pending')) return 'bg-amber-500';
  if (normalized.includes('progress') || normalized.includes('accepted') || normalized.includes('arrived')) return 'bg-sky-500';
  return ['bg-violet-500', 'bg-cyan-500', 'bg-sky-500', 'bg-amber-500'][index % 4];
};

const BreakdownCard = ({ title, items, emptyDetail }) => {
  const maxValue = Math.max(...items.map((item) => Number(item?.value) || 0), 1);
  return (
    <article className="rounded-card bg-card/72 p-6 shadow-e2 backdrop-blur-xl dark:bg-white/[0.055]">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <span className="rounded-pill bg-foreground/[0.06] px-3 py-1 text-xs font-medium text-muted-foreground dark:bg-white/[0.07]">
          {items.length} groups
        </span>
      </div>
      {items.length ? (
        <div className="mt-6 space-y-4">
          {items.slice(0, 6).map((item, index) => (
            <div key={`${title}-${item.name}`}>
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="truncate text-muted-foreground">{item.name}</span>
                <span className="font-semibold text-foreground tabular-nums">{formatMetricNumber(item.value)}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-pill bg-foreground/[0.06] dark:bg-white/[0.07]">
                <div
                  className={`h-full rounded-pill ${getBreakdownTone(item.name, index)}`}
                  style={{ width: `${Math.max(8, Math.round(((Number(item.value) || 0) / maxValue) * 100))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-6 text-sm text-muted-foreground">{emptyDetail}</p>
      )}
    </article>
  );
};

const SummaryTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-inner bg-popover/95 px-3 py-2 text-sm shadow-e3 backdrop-blur-xl">
      <p className="font-medium text-foreground">{label}</p>
      <p className="mt-1 text-muted-foreground">{formatMetricNumber(payload[0]?.value)} requests</p>
    </div>
  );
};

const AnalyticsSummarySkeleton = () => (
  <div className="mx-auto max-w-[1440px] space-y-10 px-4 pb-16 md:px-6">
    <div className="min-h-[180px] animate-pulse rounded-card bg-muted/30" />
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {[0, 1, 2, 3].map((item) => <div key={item} className="min-h-[148px] animate-pulse rounded-card bg-muted/30" />)}
    </div>
    <div className="min-h-[300px] animate-pulse rounded-card bg-muted/30" />
  </div>
);

export const AnalyticsDesktopWorkspace = ({
  stats,
  timeRange,
  dataTimeRange,
  onTimeRangeChange,
  requestsByDay,
  requestsByStatus,
  emergencyTypes,
  dominantType,
  hospitalCapacity,
  subscriptionStats,
  financeSummary,
  roleContext,
  sourceReadiness,
  canReadSubscriptionAnalytics,
  canReadFinanceAnalytics,
  isLoading,
  isFetching,
  snapshotReady,
  loadError,
  onOpenDetails,
}) => {
  const windowLabel = formatAnalyticsWindow(dataTimeRange || timeRange);
  const scopeLabel = getAnalyticsScopeLabel(roleContext);
  const requestSourceReady = Boolean(sourceReadiness?.requests);
  const volumeComparison = useMemo(() => getVolumeComparison(requestsByDay), [requestsByDay]);
  const totalRequests = Number(stats?.totalEmergencies) || 0;
  const completedRequests = Number(stats?.completedEmergencies) || 0;
  const responseSampleSize = Number(stats?.responseSampleSize) || 0;
  const trendIcon = volumeComparison?.direction === 'up'
    ? TrendingUp
    : volumeComparison?.direction === 'down'
      ? TrendingDown
      : Minus;
  const TrendIcon = trendIcon;

  if (isLoading && !snapshotReady) return <AnalyticsSummarySkeleton />;

  if (loadError && !snapshotReady) {
    return (
      <div className="mx-auto max-w-[1440px] px-4 pb-16 md:px-6">
        <EmptyCard title="Summary unavailable" detail="No statistics have loaded yet. Retry when the source is available." />
      </div>
    );
  }

  const pinnedMetrics = [
    {
      icon: Activity,
      label: 'Requests',
      value: requestSourceReady ? formatMetricNumber(totalRequests) : SOURCE_UNAVAILABLE,
      detail: windowLabel,
      tone: 'sky',
    },
    {
      icon: CheckCircle2,
      label: 'Completed',
      value: requestSourceReady ? formatMetricNumber(completedRequests) : SOURCE_UNAVAILABLE,
      detail: totalRequests > 0 ? `${stats.successRate}% of requests` : windowLabel,
      tone: 'emerald',
    },
    {
      icon: Clock3,
      label: 'Average response',
      value: requestSourceReady ? formatResponseMinutes(stats.avgResponseTime, responseSampleSize) : SOURCE_UNAVAILABLE,
      detail: responseSampleSize > 0 ? `${formatMetricNumber(responseSampleSize)} timed requests` : windowLabel,
      tone: 'amber',
    },
    {
      icon: Hospital,
      label: 'Facilities now',
      value: sourceReadiness?.hospitals ? formatMetricNumber(stats.totalHospitals) : SOURCE_UNAVAILABLE,
      detail: 'Current scoped snapshot',
      tone: 'violet',
    },
  ];

  const highlights = [];
  if (requestSourceReady && totalRequests > 0) {
    highlights.push({
      icon: CheckCircle2,
      title: 'Request outcomes',
      value: `${stats.successRate}% completed`,
      detail: `${formatMetricNumber(completedRequests)} of ${formatMetricNumber(totalRequests)} requests reached completed status in this window.`,
      tone: 'emerald',
    });
  }
  if (requestSourceReady && responseSampleSize > 0) {
    highlights.push({
      icon: Clock3,
      title: 'Response evidence',
      value: formatResponseMinutes(stats.avgResponseTime, responseSampleSize),
      detail: `Average response from ${formatMetricNumber(responseSampleSize)} requests with usable timestamps.`,
      tone: 'sky',
    });
  }
  if (requestSourceReady && dominantType?.value > 0) {
    highlights.push({
      icon: BarChart3,
      title: 'Most common case',
      value: dominantType.name,
      detail: `${formatMetricNumber(dominantType.value)} requests in the selected window.`,
      tone: 'violet',
    });
  }

  return (
    <main className="mx-auto max-w-[1440px] space-y-12 px-4 pb-16 md:px-6">
      <header className="flex min-h-[176px] flex-col justify-end gap-7 px-1 py-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <span>{scopeLabel}</span>
            <span aria-hidden="true">&middot;</span>
            <span>{windowLabel}</span>
            {isFetching && <Loader2 className="h-4 w-4 animate-spin" aria-label="Refreshing statistics" />}
          </div>
          <h1 className="mt-3 text-[42px] font-semibold leading-[1.05] text-foreground md:text-5xl">Summary</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            {requestSourceReady
              ? totalRequests > 0
                ? `${formatMetricNumber(totalRequests)} requests are included in this measured window.`
                : 'No requests were recorded in this measured window.'
              : 'The request source is unavailable, so this summary is intentionally withheld.'}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <AnalyticsTimeRangeControl value={timeRange} onChange={onTimeRangeChange} />
          <button
            type="button"
            onClick={onOpenDetails}
            className="flex min-h-11 items-center justify-center gap-2 rounded-button bg-foreground px-4 text-sm font-semibold text-background shadow-e2 transition-[background,box-shadow,transform] hover:bg-foreground/90 hover:shadow-e3 active:scale-[0.98]"
          >
            <BarChart3 className="h-4 w-4" />
            View details
          </button>
        </div>
      </header>

      <section data-testid="analytics-pinned-section">
        <SectionHeading title="Pinned" detail="The few measurements worth checking first." />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {pinnedMetrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}
        </div>
      </section>

      <section data-testid="analytics-highlights-section">
        <SectionHeading title="Highlights" detail="Measured observations from the selected window." />
        {highlights.length ? (
          <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
            {highlights.map((highlight) => (
              <HighlightCard key={highlight.title} {...highlight} onOpenDetails={onOpenDetails} />
            ))}
          </div>
        ) : (
          <EmptyCard
            title={requestSourceReady ? 'No measured highlights yet' : 'Highlights unavailable'}
            detail={requestSourceReady
              ? 'Highlights will appear after this window contains request outcomes or timing evidence.'
              : 'The request source must load before highlights can be calculated.'}
          />
        )}
      </section>

      <section data-testid="analytics-trends-section">
        <SectionHeading title="Trends" detail="Recent-half volume compared with the earlier half of this window." />
        {requestSourceReady && requestsByDay.length ? (
          <article className="rounded-card bg-card/72 p-6 shadow-e2 backdrop-blur-xl dark:bg-white/[0.055]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Request volume</p>
                <p className="mt-1 text-2xl font-semibold text-foreground">
                  {volumeComparison ? volumeComparison.badge : 'Not enough measured history'}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {volumeComparison
                    ? `${formatMetricNumber(volumeComparison.recent)} recent-half requests compared with ${formatMetricNumber(volumeComparison.previous)} earlier-half requests.`
                    : 'This window does not yet contain enough activity for a comparison.'}
                </p>
              </div>
              {volumeComparison && (
                <span className="flex h-10 w-10 items-center justify-center rounded-icon bg-sky-500/10 text-sky-700 dark:text-sky-200">
                  <TrendIcon className="h-5 w-5" />
                </span>
              )}
            </div>
            <div className="mt-7 h-[228px] min-h-[228px]" role="img" aria-label={`Request volume over ${windowLabel}`}>
              <ResponsiveContainer width="100%" height={CHART_HEIGHT} initialDimension={CHART_INITIAL_DIMENSION}>
                <AreaChart data={requestsByDay} margin={{ top: 8, right: 4, left: -26, bottom: 0 }}>
                  <XAxis dataKey="shortDay" axisLine={false} tickLine={false} minTickGap={30} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} width={34} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                  <Tooltip content={<SummaryTooltip />} cursor={{ stroke: 'hsl(var(--muted-foreground) / 0.25)' }} />
                  <Area type="monotone" dataKey="requests" name="Requests" stroke="hsl(199 89% 48%)" strokeWidth={3} fill="hsl(199 89% 48% / 0.12)" activeDot={{ r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </article>
        ) : (
          <EmptyCard
            title={requestSourceReady ? 'No trend yet' : 'Trends unavailable'}
            detail={requestSourceReady
              ? 'A trend appears after the selected window contains measured request activity.'
              : 'The request source must load before a trend can be calculated.'}
          />
        )}
      </section>

      <section data-testid="analytics-breakdowns-section">
        <SectionHeading title="Breakdowns" detail="Status and case groupings from the same request window." />
        <div className="grid gap-3 lg:grid-cols-2">
          <BreakdownCard
            title="Request status"
            items={requestSourceReady ? requestsByStatus : []}
            emptyDetail={requestSourceReady ? 'No status groups are present in this window.' : 'Request status is unavailable.'}
          />
          <BreakdownCard
            title="Case mix"
            items={requestSourceReady ? emergencyTypes : []}
            emptyDetail={requestSourceReady ? 'No case groups are present in this window.' : 'Case mix is unavailable.'}
          />
        </div>
      </section>

      <section data-testid="analytics-network-section">
        <SectionHeading title="Network" detail="Current scoped snapshots, separate from the selected request window." />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard icon={Users} label="Profiles" value={sourceReadiness?.users ? formatMetricNumber(stats.totalUsers) : SOURCE_UNAVAILABLE} detail="Current scoped snapshot" tone="cyan" />
          <MetricCard icon={Hospital} label="Facilities" value={sourceReadiness?.hospitals ? formatMetricNumber(stats.totalHospitals) : SOURCE_UNAVAILABLE} detail="Current scoped snapshot" tone="violet" />
          <MetricCard icon={Ambulance} label="Fleet" value={sourceReadiness?.ambulances ? formatMetricNumber(stats.totalAmbulances) : SOURCE_UNAVAILABLE} detail="Current scoped snapshot" tone="sky" />
          <MetricCard
            icon={Activity}
            label="Occupied beds"
            value={sourceReadiness?.hospitals && Number(hospitalCapacity?.total) > 0
              ? `${Math.round((Number(hospitalCapacity.occupied) / Number(hospitalCapacity.total)) * 100)}%`
              : sourceReadiness?.hospitals ? 'No capacity data' : SOURCE_UNAVAILABLE}
            detail={sourceReadiness?.hospitals && Number(hospitalCapacity?.total) > 0
              ? `${formatMetricNumber(hospitalCapacity.occupied)} of ${formatMetricNumber(hospitalCapacity.total)} beds`
              : 'Current facility snapshot'}
            tone="amber"
          />
        </div>
      </section>

      {canReadSubscriptionAnalytics && (
        <section data-testid="analytics-subscribers-section">
          <SectionHeading title="Subscribers" detail="Admin-scoped subscriber snapshot." />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricCard icon={Users} label="Subscribers" value={sourceReadiness?.subscriptions ? formatMetricNumber(subscriptionStats.total) : SOURCE_UNAVAILABLE} detail="Current admin scope" tone="violet" />
            <MetricCard icon={Activity} label="Active" value={sourceReadiness?.subscriptions ? formatMetricNumber(subscriptionStats.active) : SOURCE_UNAVAILABLE} detail="Current admin scope" tone="emerald" />
            <MetricCard icon={Crown} label="Paid" value={sourceReadiness?.subscriptions ? formatMetricNumber(subscriptionStats.paid) : SOURCE_UNAVAILABLE} detail="Current admin scope" tone="amber" />
            <MetricCard
              icon={TrendingUp}
              label="Paid conversion"
              value={sourceReadiness?.subscriptions ? `${Number(subscriptionStats.paidConversionRate || 0).toFixed(1)}%` : SOURCE_UNAVAILABLE}
              detail="Current admin scope"
              tone="sky"
            />
          </div>
        </section>
      )}

      {canReadFinanceAnalytics && (
        <section data-testid="analytics-payments-section">
          <SectionHeading title="Payments" detail={`Recorded wallet credits and debits for ${windowLabel.toLowerCase()}.`} />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricCard icon={Wallet} label="Credits" value={sourceReadiness?.finance ? `$${Number(financeSummary.totalCredits || 0).toFixed(0)}` : SOURCE_UNAVAILABLE} detail={windowLabel} tone="emerald" />
            <MetricCard icon={Wallet} label="Debits" value={sourceReadiness?.finance ? `$${Number(financeSummary.totalDebits || 0).toFixed(0)}` : SOURCE_UNAVAILABLE} detail={windowLabel} tone="amber" />
            <MetricCard icon={Activity} label="Today" value={sourceReadiness?.finance ? `$${Number(financeSummary.todayCredits || 0).toFixed(0)}` : SOURCE_UNAVAILABLE} detail="Recorded credits" tone="sky" />
            <MetricCard icon={BarChart3} label="Daily average" value={sourceReadiness?.finance ? `$${Number(financeSummary.dailyAverageCredits || 0).toFixed(0)}` : SOURCE_UNAVAILABLE} detail={windowLabel} tone="violet" />
          </div>
        </section>
      )}
    </main>
  );
};
