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
  Minus,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { PullToRefresh } from './PullToRefresh';
import { MobilePageShell } from './MobilePageShell';
import { MobileAnalyticsSkeleton } from './MobileSkeleton';
import { MobileHero } from './canon/MobileHero';
import { MobileGlanceTile } from './canon/MobileGlanceTile';
import { useSkeletonWarmup } from './canon/Loading';
import {
  AnalyticsTimeRangeControl,
  formatAnalyticsWindow,
  formatMetricNumber,
  formatResponseMinutes,
  getAnalyticsScopeLabel,
  getVolumeComparison,
} from '../analytics/AnalyticsSummaryPrimitives';
import { getAnalyticsCapacityPresentation } from '../pages/analytics/analyticsCapacityModel';

const SOURCE_UNAVAILABLE = 'Unavailable';

const SectionHeading = ({ title }) => (
  <div className="mb-3 px-1">
    <h2 className="text-[19px] font-semibold text-foreground">{title}</h2>
  </div>
);

const EmptySummaryCard = ({ title, detail }) => (
  <div className="rounded-card bg-card/68 px-5 py-6 shadow-e2 backdrop-blur-xl dark:bg-white/[0.055]">
    <p className="text-sm font-semibold text-foreground">{title}</p>
    <p className="mt-2 text-[12px] leading-5 text-muted-foreground">{detail}</p>
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

const HighlightCard = ({ icon: Icon, title, value, detail, tone, onOpenDetails }) => (
  <button
    type="button"
    onClick={onOpenDetails}
    className="w-full rounded-card bg-card/72 p-5 text-left shadow-e2 backdrop-blur-xl transition-[background,box-shadow,transform] active:scale-[0.985] dark:bg-white/[0.055]"
  >
    <div className="flex items-start justify-between gap-4">
      <span className={`flex h-10 w-10 items-center justify-center rounded-icon ${toneClasses[tone]}`}>
        <Icon className="h-5 w-5" />
      </span>
      <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
    </div>
    <p className="mt-5 text-[12px] font-medium text-muted-foreground">{title}</p>
    <p className="mt-1 break-words text-2xl font-semibold text-foreground tabular-nums">{value}</p>
    <p className="mt-2 text-[12px] leading-5 text-muted-foreground">{detail}</p>
  </button>
);

const CompactStatTile = ({ icon, label, value, tone, onClick = null }) => (
  <MobileGlanceTile
    item={{ icon, label, value, tone, actionKey: onClick ? 'details' : null }}
    onPress={onClick ? (event) => onClick(event) : null}
    toneClassMap={toneClasses}
    dataAttr="data-mobile-analytics-stat"
  />
);

const BreakdownList = ({ title, items, emptyDetail }) => {
  const maxValue = Math.max(...items.map((item) => Number(item?.value) || 0), 1);
  const tones = ['bg-sky-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-cyan-500'];
  return (
    <div className="rounded-card bg-card/68 p-5 shadow-e2 backdrop-blur-xl dark:bg-white/[0.05]">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <span className="rounded-pill bg-foreground/[0.06] px-2.5 py-1 text-[10px] font-medium text-muted-foreground dark:bg-white/[0.07]">
          {items.length} groups
        </span>
      </div>
      {items.length ? (
        <div className="mt-5 space-y-4">
          {items.slice(0, 5).map((item, index) => (
            <div key={`${title}-${item.name}`}>
              <div className="flex items-center justify-between gap-3 text-[12px]">
                <span className="min-w-0 truncate text-muted-foreground">{item.name}</span>
                <span className="font-semibold text-foreground tabular-nums">{formatMetricNumber(item.value)}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-pill bg-foreground/[0.06] dark:bg-white/[0.07]">
                <div
                  className={`h-full rounded-pill ${tones[index % tones.length]}`}
                  style={{ width: `${Math.max(8, Math.round(((Number(item.value) || 0) / maxValue) * 100))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-5 text-[12px] leading-5 text-muted-foreground">{emptyDetail}</p>
      )}
    </div>
  );
};

export const MobileAnalytics = ({
  stats,
  subscriptionStats,
  financeSummary,
  hospitalCapacity,
  requestsByDay = [],
  requestsByStatus = [],
  emergencyTypes = [],
  dominantType,
  timeRange,
  snapshotTimeRange,
  onTimeRangeChange,
  onRefresh,
  onRetry,
  onOpenDetails,
  loadError,
  commandNotice,
  sourceIssueSummary,
  sourceReadiness = {},
  canReadSubscriptionAnalytics = false,
  canReadFinanceAnalytics = false,
  roleContext = {},
  snapshotReady = false,
  isLoading = false,
  isFetching = false,
}) => {
  const warmingUp = useSkeletonWarmup();
  const totalRequests = Number(stats?.totalEmergencies) || 0;
  const completedRequests = Number(stats?.completedEmergencies) || 0;
  const responseSampleSize = Number(stats?.responseSampleSize) || 0;
  const requestSourceReady = Boolean(sourceReadiness.requests);
  const windowLabel = formatAnalyticsWindow(snapshotTimeRange || timeRange);
  const capacityPresentation = useMemo(() => getAnalyticsCapacityPresentation({
    sourceReady: sourceReadiness.hospitalCapacity,
    capacity: hospitalCapacity,
  }), [hospitalCapacity, sourceReadiness.hospitalCapacity]);
  const scopeLabel = getAnalyticsScopeLabel(roleContext);
  const volumeComparison = useMemo(() => getVolumeComparison(requestsByDay), [requestsByDay]);
  const chartBars = requestsByDay.slice(-14);
  const chartMax = Math.max(...chartBars.map((item) => Number(item?.requests) || 0), 1);
  const TrendIcon = volumeComparison?.direction === 'up'
    ? TrendingUp
    : volumeComparison?.direction === 'down'
      ? TrendingDown
      : Minus;
  const showSkeleton = warmingUp || (isLoading && !snapshotReady);

  const pinnedMetrics = [
    {
      icon: Activity,
      label: 'Requests',
      value: requestSourceReady ? formatMetricNumber(totalRequests) : SOURCE_UNAVAILABLE,
      tone: 'sky',
    },
    {
      icon: CheckCircle2,
      label: 'Completed',
      value: requestSourceReady ? formatMetricNumber(completedRequests) : SOURCE_UNAVAILABLE,
      tone: 'emerald',
    },
    {
      icon: Clock3,
      label: 'Avg response',
      value: requestSourceReady ? formatResponseMinutes(stats?.avgResponseTime, responseSampleSize) : SOURCE_UNAVAILABLE,
      tone: 'amber',
    },
    {
      icon: Hospital,
      label: 'Facilities',
      value: sourceReadiness.hospitals ? formatMetricNumber(stats?.totalHospitals) : SOURCE_UNAVAILABLE,
      tone: 'violet',
    },
  ];

  const highlights = [];
  if (requestSourceReady && totalRequests > 0) {
    highlights.push({
      icon: CheckCircle2,
      title: 'Request outcomes',
      value: `${stats.successRate}% completed`,
      detail: `${formatMetricNumber(completedRequests)} of ${formatMetricNumber(totalRequests)} completed.`,
      tone: 'emerald',
    });
  }
  if (requestSourceReady && responseSampleSize > 0) {
    highlights.push({
      icon: Clock3,
      title: 'Response evidence',
      value: formatResponseMinutes(stats?.avgResponseTime, responseSampleSize),
      detail: `${formatMetricNumber(responseSampleSize)} timed requests.`,
      tone: 'sky',
    });
  }
  if (requestSourceReady && dominantType?.value > 0) {
    highlights.push({
      icon: BarChart3,
      title: 'Most common case',
      value: dominantType.name,
      detail: `${formatMetricNumber(dominantType.value)} requests.`,
      tone: 'violet',
    });
  }

  const summaryHeader = snapshotReady ? (
    <div className="pt-3">
      <MobileHero
        toneClass="bg-sky-500/10 text-sky-700 dark:text-sky-200"
        icon={BarChart3}
        statusLabel="Summary"
        headline={requestSourceReady
          ? totalRequests > 0
            ? `${formatMetricNumber(totalRequests)} requests`
            : 'No requests recorded'
          : 'Request summary unavailable'}
        subhead={requestSourceReady
          ? `${scopeLabel} / ${windowLabel}`
          : 'Request data is unavailable.'}
        isFetching={isFetching}
      >
        <div className="w-full">
          <AnalyticsTimeRangeControl value={timeRange} onChange={onTimeRangeChange} compact />
        </div>
      </MobileHero>

      {sourceIssueSummary && (
        <div
          data-testid="mobile-analytics-source-state"
          role="status"
          aria-live="polite"
          className="mx-4 mt-4 rounded-inner bg-amber-500/10 px-4 py-3 text-amber-900 shadow-e2 dark:text-amber-200"
        >
          <p className="text-sm font-semibold">{sourceIssueSummary.title}</p>
          <p className="mt-1 break-words text-[11px] leading-4 text-current/75">{sourceIssueSummary.detail}</p>
        </div>
      )}

      {commandNotice && (
        <div className="mx-4 mt-4 rounded-inner bg-muted/45 px-4 py-3 text-[12px] text-muted-foreground shadow-e2" role="status" aria-live="polite">
          {commandNotice}
        </div>
      )}

      <div className="mt-6 px-4">
        <SectionHeading title="Pinned" />
        <div className="grid grid-cols-2 gap-3">
          {pinnedMetrics.map((metric) => (
            <CompactStatTile key={metric.label} {...metric} onClick={onOpenDetails} />
          ))}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <PullToRefresh onRefresh={onRefresh}>
      <MobilePageShell
        kpiStrip={showSkeleton ? null : summaryHeader}
        contentClassName="min-h-[calc(100dvh-3rem)] px-0 pb-32 pt-2 text-foreground"
        animatePageLoad={false}
      >
        {showSkeleton ? (
          <MobileAnalyticsSkeleton />
        ) : loadError && !snapshotReady ? (
          <div className="px-4 pt-3">
            <div data-testid="mobile-analytics-error-state" role="alert" className="rounded-card bg-destructive/10 p-5 text-destructive shadow-e2">
              <p className="text-sm font-semibold">Statistics did not load.</p>
              <p className="mt-2 text-[12px] leading-5 text-destructive/75">Retry when the source is available.</p>
              <button
                type="button"
                onClick={onRetry || onRefresh}
                className="mt-4 flex min-h-10 items-center gap-2 rounded-button bg-background/80 px-4 text-[12px] font-semibold text-destructive shadow-e2 active:scale-[0.97]"
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </button>
            </div>
          </div>
        ) : snapshotReady ? (
          <div className="space-y-9 px-4">
            <section data-testid="mobile-analytics-highlights-section">
              <SectionHeading title="Highlights" />
              {highlights.length ? (
                <div className="space-y-3">
                  {highlights.map((highlight) => (
                    <HighlightCard key={highlight.title} {...highlight} onOpenDetails={onOpenDetails} />
                  ))}
                </div>
              ) : (
                <EmptySummaryCard
                  title={requestSourceReady ? 'No measured highlights yet' : 'Highlights unavailable'}
                  detail={requestSourceReady
                    ? 'Highlights will appear after this window contains outcomes or timing evidence.'
                    : 'The request source must load before highlights can be calculated.'}
                />
              )}
            </section>

            <section data-testid="mobile-analytics-trends-section">
              <SectionHeading title="Trends" />
              {requestSourceReady && chartBars.length ? (
                <div className="rounded-card bg-card/68 p-5 shadow-e2 backdrop-blur-xl dark:bg-white/[0.05]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[12px] font-medium text-muted-foreground">Request volume</p>
                      <p className="mt-1 text-xl font-semibold text-foreground">
                        {volumeComparison ? volumeComparison.badge : 'Not enough history'}
                      </p>
                    </div>
                    {volumeComparison && (
                      <span className="flex h-10 w-10 items-center justify-center rounded-icon bg-sky-500/10 text-sky-700 dark:text-sky-200">
                        <TrendIcon className="h-5 w-5" />
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
                    {volumeComparison
                      ? `${formatMetricNumber(volumeComparison.recent)} recent / ${formatMetricNumber(volumeComparison.previous)} earlier.`
                      : 'This window does not yet contain enough activity for a comparison.'}
                  </p>
                  <div className="mt-6 flex h-24 items-end gap-1" role="img" aria-label={`Request volume over ${windowLabel}`}>
                    {chartBars.map((item) => (
                      <span
                        key={item.day}
                        title={`${item.day}: ${formatMetricNumber(item.requests)} requests`}
                        className="min-w-1 flex-1 rounded-pill bg-sky-500/70"
                        style={{ height: `${Math.max(6, Math.round(((Number(item.requests) || 0) / chartMax) * 100))}%` }}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <EmptySummaryCard
                  title={requestSourceReady ? 'No trend yet' : 'Trends unavailable'}
                  detail={requestSourceReady
                    ? 'A trend appears after this window contains measured request activity.'
                    : 'The request source must load before a trend can be calculated.'}
                />
              )}
            </section>

            <section data-testid="mobile-analytics-breakdowns-section">
              <SectionHeading title="Breakdowns" />
              <div className="space-y-3">
                <BreakdownList
                  title="Request status"
                  items={requestSourceReady ? requestsByStatus : []}
                  emptyDetail={requestSourceReady ? 'No status groups are present.' : 'Request status is unavailable.'}
                />
                <BreakdownList
                  title="Case mix"
                  items={requestSourceReady ? emergencyTypes : []}
                  emptyDetail={requestSourceReady ? 'No case groups are present.' : 'Case mix is unavailable.'}
                />
              </div>
            </section>

            <section data-testid="mobile-analytics-network-section">
              <SectionHeading title="Network" />
              <div className="grid grid-cols-2 gap-3">
                <CompactStatTile icon={Users} label="Profiles" value={sourceReadiness.users ? formatMetricNumber(stats?.totalUsers) : SOURCE_UNAVAILABLE} tone="cyan" />
                <CompactStatTile icon={Hospital} label="Facilities" value={sourceReadiness.hospitals ? formatMetricNumber(stats?.totalHospitals) : SOURCE_UNAVAILABLE} tone="violet" />
                <CompactStatTile icon={Ambulance} label="Fleet" value={sourceReadiness.ambulances ? formatMetricNumber(stats?.totalAmbulances) : SOURCE_UNAVAILABLE} tone="sky" />
                <CompactStatTile
                  icon={Activity}
                  label={capacityPresentation.label}
                  value={capacityPresentation.value}
                  tone="amber"
                />
              </div>
              <p className="mt-3 px-1 text-[11px] leading-4 text-muted-foreground">
                {capacityPresentation.detail}
              </p>
            </section>

            {canReadSubscriptionAnalytics && (
              <section data-testid="mobile-analytics-subscribers-section">
                <SectionHeading title="Subscribers" />
                <div className="grid grid-cols-2 gap-3">
                  <CompactStatTile icon={Users} label="Subscribers" value={sourceReadiness.subscriptions ? formatMetricNumber(subscriptionStats?.total) : SOURCE_UNAVAILABLE} tone="violet" />
                  <CompactStatTile icon={Activity} label="Active" value={sourceReadiness.subscriptions ? formatMetricNumber(subscriptionStats?.active) : SOURCE_UNAVAILABLE} tone="emerald" />
                  <CompactStatTile icon={Crown} label="Paid" value={sourceReadiness.subscriptions ? formatMetricNumber(subscriptionStats?.paid) : SOURCE_UNAVAILABLE} tone="amber" />
                  <CompactStatTile icon={TrendingUp} label="Paid conversion" value={sourceReadiness.subscriptions ? `${Number(subscriptionStats?.paidConversionRate || 0).toFixed(1)}%` : SOURCE_UNAVAILABLE} tone="sky" />
                </div>
              </section>
            )}

            {canReadFinanceAnalytics && (
              <section data-testid="mobile-analytics-payments-section">
                <SectionHeading title="Payments" />
                <div className="grid grid-cols-2 gap-3">
                  <CompactStatTile icon={Wallet} label="Credits" value={sourceReadiness.finance ? `$${Number(financeSummary?.totalCredits || 0).toFixed(0)}` : SOURCE_UNAVAILABLE} tone="emerald" />
                  <CompactStatTile icon={Wallet} label="Debits" value={sourceReadiness.finance ? `$${Number(financeSummary?.totalDebits || 0).toFixed(0)}` : SOURCE_UNAVAILABLE} tone="amber" />
                  <CompactStatTile icon={Activity} label="Today" value={sourceReadiness.finance ? `$${Number(financeSummary?.todayCredits || 0).toFixed(0)}` : SOURCE_UNAVAILABLE} tone="sky" />
                  <CompactStatTile icon={BarChart3} label="Daily average" value={sourceReadiness.finance ? `$${Number(financeSummary?.dailyAverageCredits || 0).toFixed(0)}` : SOURCE_UNAVAILABLE} tone="violet" />
                </div>
              </section>
            )}
          </div>
        ) : null}
      </MobilePageShell>
    </PullToRefresh>
  );
};
