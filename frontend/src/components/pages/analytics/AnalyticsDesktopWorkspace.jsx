import React, { useMemo } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileText,
  Hospital,
  Loader2,
  Minus,
  TrendingDown,
  TrendingUp,
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
  getVolumeComparison,
} from '../../analytics/AnalyticsSummaryPrimitives';
import { ActivitySheet } from '../../console/ActivitySheet';
import { MetricStrip, selectContextMetrics } from '../../console/MetricStrip';
import { SignalPanel } from '../../console/SignalPanel';
import { DetailRailShell, RailInsetHero, WorkspaceStage } from '../../console/WorkspaceStage';
import { Shimmer } from '../../console/primitives';

const SOURCE_UNAVAILABLE = 'Unavailable';
const CHART_HEIGHT = 210;
const CHART_INITIAL_DIMENSION = { width: 1, height: CHART_HEIGHT };
const RANGE_DAYS = { '7d': 7, '30d': 30, '90d': 90 };
const NOOP = () => {};

const signalToneClass = {
  primary: 'bg-sky-500/10 text-sky-700 dark:text-sky-200',
  clear: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200',
  warning: 'bg-amber-500/10 text-amber-800 dark:text-amber-200',
  danger: 'bg-destructive/10 text-destructive',
  muted: 'bg-foreground/[0.055] text-muted-foreground dark:bg-white/[0.06]',
};

const getAudienceLabel = (role = {}) => {
  if (role.isProvider) return 'Provider activity';
  if (role.isSponsor) return 'Sponsor view';
  if (role.isOrgAdmin) return 'Organization activity';
  if (role.isAdmin) return 'Platform activity';
  return 'Available activity';
};

const formatCurrency = (value, currency) => {
  const safeCurrency = typeof currency === 'string' ? currency.trim().toUpperCase() : '';
  if (!safeCurrency) return SOURCE_UNAVAILABLE;

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: safeCurrency,
    }).format(Number(value) || 0);
  } catch {
    return SOURCE_UNAVAILABLE;
  }
};

const getBreakdownTone = (label = '', index = 0) => {
  const normalized = label.toLowerCase();
  if (normalized.includes('complete')) return 'bg-emerald-500';
  if (normalized.includes('cancel') || normalized.includes('declined')) return 'bg-destructive';
  if (normalized.includes('pending')) return 'bg-amber-500';
  if (normalized.includes('progress') || normalized.includes('accepted') || normalized.includes('arrived')) return 'bg-sky-500';
  return ['bg-violet-500', 'bg-cyan-500', 'bg-sky-500', 'bg-amber-500'][index % 4];
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

const BreakdownPanel = ({ title, items, emptyDetail }) => {
  const maxValue = Math.max(...items.map((item) => Number(item?.value) || 0), 1);

  return (
    <section className="rounded-card bg-foreground/[0.045] p-4 dark:bg-white/[0.055]">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <span className="rounded-pill bg-foreground/[0.06] px-2.5 py-1 text-[10px] font-semibold text-muted-foreground dark:bg-white/[0.07]">
          {items.length} groups
        </span>
      </div>
      {items.length ? (
        <div className="mt-4 space-y-3">
          {items.slice(0, 6).map((item, index) => (
            <div key={`${title}-${item.name}`}>
              <div className="flex items-center justify-between gap-4 text-xs">
                <span className="truncate text-muted-foreground">{item.name}</span>
                <span className="font-semibold text-foreground tabular-nums">{formatMetricNumber(item.value)}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-pill bg-foreground/[0.06] dark:bg-white/[0.07]">
                <div
                  className={`h-full rounded-pill ${getBreakdownTone(item.name, index)}`}
                  style={{ width: `${Math.max(8, Math.round(((Number(item.value) || 0) / maxValue) * 100))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-xs leading-5 text-muted-foreground">{emptyDetail}</p>
      )}
    </section>
  );
};

const EvidenceItem = ({ label, value }) => (
  <div className="min-w-0 rounded-inner bg-foreground/[0.045] px-3 py-2.5 dark:bg-white/[0.055]">
    <p className="truncate text-[10px] font-medium text-muted-foreground">{label}</p>
    <p className="mt-1 truncate text-sm font-semibold text-foreground tabular-nums">{value}</p>
  </div>
);

const EvidenceSection = ({ title, detail, children, testId }) => (
  <section className="mt-5" data-testid={testId}>
    <div className="mb-3 px-1">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}
    </div>
    <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">{children}</div>
  </section>
);

const AnalyticsWorkSkeleton = () => (
  <div className="mt-3 min-h-0 flex-1 overflow-hidden rounded-card bg-background/45 p-4 dark:bg-white/[0.04]">
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-2">
        <Shimmer className="h-4 w-28 rounded-inner" />
        <Shimmer className="h-3 w-56 rounded-inner" />
      </div>
      <Shimmer className="h-8 w-20 rounded-pill" />
    </div>
    <Shimmer className="mt-5 h-[150px] rounded-card" />
    <div className="mt-4 grid grid-cols-2 gap-3">
      <Shimmer className="h-24 rounded-card" />
      <Shimmer className="h-24 rounded-card" />
    </div>
  </div>
);

const AnalyticsDetailRail = ({
  isLoading,
  isFetching,
  windowLabel,
  audienceLabel,
  metricItems,
  stats,
  requestSample,
  sourceReadiness,
  dominantType,
}) => {
  if (isLoading) {
    return (
      <DetailRailShell>
        <Shimmer className="h-32 rounded-modal" />
        <div className="mt-4 space-y-2">
          {[0, 1, 2].map((item) => <Shimmer key={item} className="h-[58px] rounded-inner" />)}
        </div>
        <Shimmer className="mt-5 h-20 rounded-inner" />
      </DetailRailShell>
    );
  }

  const visibleMetrics = selectContextMetrics(metricItems, 3);
  const requestsReady = Boolean(sourceReadiness?.requests);
  const requestTotal = Number(stats?.totalEmergencies) || 0;
  const requestSampleComplete = requestSample?.complete === true;
  const completionValue = requestsReady && requestTotal > 0
    ? `${Number(stats?.successRate) || 0}%`
    : requestsReady ? 'No requests' : SOURCE_UNAVAILABLE;

  return (
    <DetailRailShell>
      <RailInsetHero>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-sky-700 dark:text-sky-200">{windowLabel}</p>
            <h2 className="mt-2 text-xl font-semibold text-foreground">Activity overview</h2>
            <p className="mt-1 text-sm text-muted-foreground">{audienceLabel}</p>
          </div>
          {isFetching && <Loader2 className="mt-1 h-4 w-4 shrink-0 animate-spin text-muted-foreground" aria-label="Refreshing statistics" />}
        </div>
      </RailInsetHero>

      <section>
        <h3 className="mb-3 px-1 text-sm font-semibold text-foreground">At a glance</h3>
        <div className="space-y-2">
          {visibleMetrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <div key={metric.id} className="flex min-h-[58px] items-center gap-3 rounded-inner bg-foreground/[0.045] px-3 py-2.5 dark:bg-white/[0.055]">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-icon ${metric.toneClass}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs text-muted-foreground">{metric.label}</p>
                  <p className="mt-1 truncate text-sm font-semibold text-foreground tabular-nums">{metric.value}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-5">
        <h3 className="mb-3 px-1 text-sm font-semibold text-foreground">Useful context</h3>
        <div className="grid grid-cols-2 gap-2">
          <EvidenceItem label={requestSampleComplete ? 'Completion rate' : 'Sample completion rate'} value={completionValue} />
          <EvidenceItem
            label={requestSampleComplete ? 'Timed requests' : 'Timed in sample'}
            value={requestsReady ? formatMetricNumber(stats?.responseSampleSize) : SOURCE_UNAVAILABLE}
          />
          <EvidenceItem
            label="Most common case"
            value={requestsReady && dominantType?.value > 0 ? dominantType.name : 'No case data'}
          />
          <EvidenceItem
            label="Fleet"
            value={sourceReadiness?.ambulances ? formatMetricNumber(stats?.totalAmbulances) : SOURCE_UNAVAILABLE}
          />
        </div>
      </section>

      <div role="note" className="mt-5 flex items-start gap-3 rounded-inner bg-muted/25 px-4 py-3 text-sm text-muted-foreground">
        <FileText className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-semibold text-foreground">Downloads unavailable</p>
          <p className="mt-1 text-xs leading-5">Report downloads are not available yet.</p>
        </div>
      </div>
    </DetailRailShell>
  );
};

export const AnalyticsDesktopWorkspace = ({
  stats,
  requestSample,
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
  moduleRailItems,
  routingPath,
  onRailNavigate,
  statusBanners,
}) => {
  const dataWindow = dataTimeRange || timeRange;
  const windowLabel = formatAnalyticsWindow(dataWindow);
  const audienceLabel = getAudienceLabel(roleContext);
  const requestSourceReady = Boolean(sourceReadiness?.requests);
  const totalRequests = Number(stats?.totalEmergencies) || 0;
  const completedRequests = Number(stats?.completedEmergencies) || 0;
  const responseSampleSize = Number(stats?.responseSampleSize) || 0;
  const requestSampleComplete = requestSample?.complete === true;
  const returnedRequestCount = Number.isFinite(Number(requestSample?.returnedCount))
    ? Number(requestSample.returnedCount)
    : totalRequests;
  const requestMetricLabel = requestSampleComplete
    ? 'Requests'
    : `Latest ${formatMetricNumber(returnedRequestCount)} requests`;
  const failedEmpty = Boolean(loadError) && !snapshotReady;
  const loadingWorkspace = Boolean(isLoading) && !snapshotReady;
  const volumeComparison = useMemo(() => getVolumeComparison(requestsByDay), [requestsByDay]);
  const rangeDays = RANGE_DAYS[dataWindow] || 7;
  const analyticsPagination = useMemo(() => ({
    currentPage: 1,
    totalPages: 1,
    totalCount: rangeDays,
    itemsPerPage: rangeDays + 1,
    prevPage: NOOP,
    nextPage: NOOP,
    hasPrevPage: false,
    hasNextPage: false,
  }), [rangeDays]);

  const metricItems = [
    {
      id: 'requests',
      icon: Activity,
      label: requestMetricLabel,
      value: formatMetricNumber(totalRequests),
      available: requestSourceReady,
      priority: 0,
      toneClass: 'bg-sky-500/10 text-sky-700 dark:text-sky-200',
    },
    {
      id: 'completed',
      icon: CheckCircle2,
      label: 'Completed',
      value: formatMetricNumber(completedRequests),
      available: requestSourceReady,
      priority: 1,
      toneClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200',
    },
    {
      id: 'average-response',
      icon: Clock3,
      label: 'Average response',
      value: formatResponseMinutes(stats?.avgResponseTime, responseSampleSize),
      available: requestSourceReady && responseSampleSize > 0,
      priority: 2,
      toneClass: 'bg-amber-500/10 text-amber-800 dark:text-amber-200',
    },
    {
      id: 'facilities',
      icon: Hospital,
      label: 'Facilities',
      value: formatMetricNumber(stats?.totalHospitals),
      available: responseSampleSize === 0 && Boolean(sourceReadiness?.hospitals),
      priority: 3,
      toneClass: 'bg-violet-500/10 text-violet-700 dark:text-violet-200',
    },
  ];

  const signal = failedEmpty
    ? {
      icon: AlertTriangle,
      tone: 'danger',
      label: 'Data unavailable',
      headline: 'Statistics did not load',
      subhead: 'Try again to review request activity for this time window.',
    }
    : !requestSourceReady
      ? {
        icon: AlertTriangle,
        tone: 'warning',
        label: audienceLabel,
        headline: 'Request activity is unavailable',
        subhead: 'Other available information remains visible while request data is restored.',
      }
      : totalRequests > 0
        ? {
          icon: Activity,
          tone: 'primary',
          label: audienceLabel,
          headline: requestSampleComplete
            ? `${formatMetricNumber(totalRequests)} requests in ${windowLabel.toLowerCase()}`
            : `Latest ${formatMetricNumber(returnedRequestCount)} requests`,
          subhead: requestSampleComplete
            ? `${formatMetricNumber(completedRequests)} completed, with timing shown only for requests that include usable timestamps.`
            : `${formatMetricNumber(completedRequests)} completed in the loaded sample for ${windowLabel.toLowerCase()}.`,
        }
        : {
          icon: Activity,
          tone: 'muted',
          label: audienceLabel,
          headline: `No requests in ${windowLabel.toLowerCase()}`,
          subhead: 'Choose another time window or check again after new request activity is recorded.',
        };

  const trendIcon = volumeComparison?.direction === 'up'
    ? TrendingUp
    : volumeComparison?.direction === 'down'
      ? TrendingDown
      : Minus;
  const TrendIcon = trendIcon;
  const bedUse = sourceReadiness?.hospitals && Number(hospitalCapacity?.total) > 0
    ? `${Math.round((Number(hospitalCapacity.occupied) / Number(hospitalCapacity.total)) * 100)}%`
    : sourceReadiness?.hospitals ? 'No capacity data' : SOURCE_UNAVAILABLE;

  return (
    <WorkspaceStage
      moduleRailItems={moduleRailItems}
      activePath="/analytics"
      routingPath={routingPath}
      onRailNavigate={onRailNavigate}
      rail={(
        <AnalyticsDetailRail
          isLoading={loadingWorkspace}
          isFetching={isFetching}
          windowLabel={windowLabel}
          audienceLabel={audienceLabel}
          metricItems={metricItems}
          stats={stats}
          requestSample={requestSample}
          sourceReadiness={sourceReadiness}
          dominantType={dominantType}
        />
      )}
    >
      <SignalPanel signal={signal} loading={loadingWorkspace} toneClassMap={signalToneClass}>
        <MetricStrip
          items={metricItems}
          loading={loadingWorkspace}
          max={3}
          dataAttr="data-analytics-metric"
        />
      </SignalPanel>

      <ActivitySheet
        loading={loadingWorkspace}
        isFetching={isFetching}
        failedEmpty={failedEmpty}
        pagination={analyticsPagination}
        itemNoun="days reviewed"
        loadingLabel="Loading activity"
        toolbar={(
          <div className="flex flex-col gap-3 px-1 sm:flex-row sm:items-center sm:justify-between" data-testid="analytics-workspace-toolbar">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-foreground">Request activity</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {requestSampleComplete ? 'Trend and breakdowns for the selected window' : 'Trend and breakdowns from the latest loaded requests'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isFetching && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" aria-label="Refreshing statistics" />}
              <AnalyticsTimeRangeControl value={timeRange} onChange={onTimeRangeChange} />
            </div>
          </div>
        )}
        errorBanner={(
          <>
            {statusBanners}
            {requestSourceReady && !requestSampleComplete && (
              <div
                data-testid="analytics-request-sample-state"
                role="status"
                className="mt-3 rounded-inner bg-amber-500/10 px-4 py-3 text-sm text-amber-900 shadow-e2 dark:text-amber-200"
              >
                <p className="font-semibold">Latest {formatMetricNumber(returnedRequestCount)} requests</p>
                <p className="mt-1 text-xs text-amber-800/75 dark:text-amber-100/70">
                  Completed, response, trend, and breakdown values use this partial set.
                </p>
              </div>
            )}
          </>
        )}
      >
        {loadingWorkspace ? (
          <AnalyticsWorkSkeleton />
        ) : (
          <div
            className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-card bg-background/45 p-4 no-scrollbar dark:bg-white/[0.04]"
            data-testid="analytics-work-surface"
          >
            {failedEmpty ? (
              <div className="flex min-h-[240px] flex-col items-center justify-center text-center">
                <AlertTriangle className="h-9 w-9 text-destructive/70" />
                <h3 className="mt-4 text-base font-semibold text-foreground">Statistics did not load</h3>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">Try again to review activity for this time window.</p>
              </div>
            ) : (
              <>
                <section data-testid="analytics-trend-section">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Request trend</p>
                      <p className="mt-1 text-xs text-muted-foreground">Recent activity compared with the earlier half of this window.</p>
                    </div>
                    {volumeComparison && (
                      <span className="inline-flex items-center gap-2 self-start rounded-pill bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-700 dark:text-sky-200">
                        <TrendIcon className="h-3.5 w-3.5" />
                        {volumeComparison.badge}
                      </span>
                    )}
                  </div>

                  {requestSourceReady && requestsByDay.length ? (
                    <div className="mt-4 h-[210px] min-h-[210px]" role="img" aria-label={`Request volume over ${windowLabel}`}>
                      <ResponsiveContainer width="100%" height={CHART_HEIGHT} initialDimension={CHART_INITIAL_DIMENSION}>
                        <AreaChart data={requestsByDay} margin={{ top: 8, right: 4, left: -26, bottom: 0 }}>
                          <XAxis dataKey="shortDay" axisLine={false} tickLine={false} minTickGap={30} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                          <YAxis allowDecimals={false} axisLine={false} tickLine={false} width={34} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                          <Tooltip content={<SummaryTooltip />} cursor={{ stroke: 'hsl(var(--muted-foreground) / 0.25)' }} />
                          <Area type="monotone" dataKey="requests" name="Requests" stroke="hsl(199 89% 48%)" strokeWidth={3} fill="hsl(199 89% 48% / 0.12)" activeDot={{ r: 4 }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="mt-4 flex min-h-[150px] items-center justify-center rounded-card bg-foreground/[0.045] px-5 text-center text-sm text-muted-foreground dark:bg-white/[0.055]">
                      {requestSourceReady
                        ? 'A trend will appear after this window contains request activity.'
                        : 'Request trend data is unavailable.'}
                    </div>
                  )}
                </section>

                <section className="mt-5 grid gap-3 lg:grid-cols-2" data-testid="analytics-breakdowns-section">
                  <BreakdownPanel
                    title="Request status"
                    items={requestSourceReady ? requestsByStatus : []}
                    emptyDetail={requestSourceReady ? 'No status groups are present in this window.' : 'Request status is unavailable.'}
                  />
                  <BreakdownPanel
                    title="Case mix"
                    items={requestSourceReady ? emergencyTypes : []}
                    emptyDetail={requestSourceReady ? 'No case groups are present in this window.' : 'Case mix is unavailable.'}
                  />
                </section>

                <EvidenceSection title="Network" detail="Current availability, separate from the selected request window." testId="analytics-network-section">
                  <EvidenceItem label="Profiles" value={sourceReadiness?.users ? formatMetricNumber(stats?.totalUsers) : SOURCE_UNAVAILABLE} />
                  <EvidenceItem label="Facilities" value={sourceReadiness?.hospitals ? formatMetricNumber(stats?.totalHospitals) : SOURCE_UNAVAILABLE} />
                  <EvidenceItem label="Fleet" value={sourceReadiness?.ambulances ? formatMetricNumber(stats?.totalAmbulances) : SOURCE_UNAVAILABLE} />
                  <EvidenceItem label="Bed use" value={bedUse} />
                </EvidenceSection>

                {canReadSubscriptionAnalytics && (
                  subscriptionStats?.sample?.complete === true ? (
                    <EvidenceSection title="Subscribers" detail="Subscriber information available to platform admins." testId="analytics-subscribers-section">
                      <EvidenceItem label="Subscribers" value={sourceReadiness?.subscriptions ? formatMetricNumber(subscriptionStats?.total) : SOURCE_UNAVAILABLE} />
                      <EvidenceItem label="Active" value={sourceReadiness?.subscriptions ? formatMetricNumber(subscriptionStats?.active) : SOURCE_UNAVAILABLE} />
                      <EvidenceItem label="Paid" value={sourceReadiness?.subscriptions ? formatMetricNumber(subscriptionStats?.paid) : SOURCE_UNAVAILABLE} />
                      <EvidenceItem label="Paid conversion" value={sourceReadiness?.subscriptions ? `${Number(subscriptionStats?.paidConversionRate || 0).toFixed(1)}%` : SOURCE_UNAVAILABLE} />
                    </EvidenceSection>
                  ) : (
                    <section className="mt-5" data-testid="analytics-subscribers-section">
                      <h3 className="px-1 text-sm font-semibold text-foreground">Subscribers</h3>
                      <div role="status" className="mt-3 rounded-inner bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
                        Subscriber statistics are unavailable because only part of the list loaded.
                      </div>
                    </section>
                  )
                )}

                {canReadFinanceAnalytics && (
                  <EvidenceSection title="Payments" detail={`Recorded wallet activity for ${windowLabel.toLowerCase()}.`} testId="analytics-payments-section">
                    <EvidenceItem label="Credits" value={sourceReadiness?.finance ? formatCurrency(financeSummary?.totalCredits, financeSummary?.currency) : SOURCE_UNAVAILABLE} />
                    <EvidenceItem label="Debits" value={sourceReadiness?.finance ? formatCurrency(financeSummary?.totalDebits, financeSummary?.currency) : SOURCE_UNAVAILABLE} />
                    <EvidenceItem label="Today" value={sourceReadiness?.finance ? formatCurrency(financeSummary?.todayCredits, financeSummary?.currency) : SOURCE_UNAVAILABLE} />
                    <EvidenceItem label="Daily average" value={sourceReadiness?.finance ? formatCurrency(financeSummary?.dailyAverageCredits, financeSummary?.currency) : SOURCE_UNAVAILABLE} />
                  </EvidenceSection>
                )}
              </>
            )}
          </div>
        )}
      </ActivitySheet>
    </WorkspaceStage>
  );
};
