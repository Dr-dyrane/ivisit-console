import React, { useMemo } from 'react';
import {
  AlertTriangle,
  Loader2,
  Minus,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  AnalyticsTimeRangeControl,
  formatMetricNumber,
  getVolumeComparison,
} from '../analytics/AnalyticsSummaryPrimitives';
import {
  AnalyticsBreakdownsSection,
  AnalyticsEvidenceSections,
  AnalyticsTrendSection,
  AnalyticsWorkSkeleton,
} from '../pages/analytics/AnalyticsDesktopSections';
import { TABLET_FOCUS_RING } from './TabletCollectionPage';
import { getAnalyticsCapacityPresentation } from '../pages/analytics/analyticsCapacityModel';
import { TabletPageShell } from './TabletPageShell';

export const TabletAnalytics = ({
  detail,
  detailMetrics = [],
  stats,
  requestSample,
  timeRange,
  windowLabel,
  onTimeRangeChange,
  onRefresh,
  requestsByDay,
  requestsByStatus,
  emergencyTypes,
  hospitalCapacity,
  subscriptionStats,
  financeSummary,
  sourceReadiness,
  canReadSubscriptionAnalytics,
  canReadFinanceAnalytics,
  isLoading,
  isFetching,
  snapshotReady,
  loadError,
  statusBanners,
}) => {
  const loadingWorkspace = Boolean(isLoading) && !snapshotReady;
  const failedEmpty = Boolean(loadError) && !snapshotReady;
  const requestSourceReady = Boolean(sourceReadiness?.requests);
  const requestSampleComplete = requestSample?.complete === true;
  const returnedRequestCount = Number.isFinite(Number(requestSample?.returnedCount))
    ? Number(requestSample.returnedCount)
    : Number(stats?.totalEmergencies) || 0;
  const volumeComparison = useMemo(() => getVolumeComparison(requestsByDay), [requestsByDay]);
  const capacityPresentation = useMemo(() => getAnalyticsCapacityPresentation({
    sourceReady: sourceReadiness?.hospitalCapacity,
    capacity: hospitalCapacity,
  }), [hospitalCapacity, sourceReadiness?.hospitalCapacity]);
  const TrendIcon = volumeComparison?.direction === 'up'
    ? TrendingUp
    : volumeComparison?.direction === 'down'
      ? TrendingDown
      : Minus;

  return (
    <TabletPageShell detail={detail}>
      <div className="flex h-full min-h-0 flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="grid min-w-0 flex-1 grid-cols-3 gap-2" aria-label="Statistics summary">
            {detailMetrics.slice(0, 3).map((metric) => {
              const Icon = metric.icon;
              return (
                <div key={metric.id} className="flex min-h-[64px] min-w-0 items-center gap-2 rounded-card bg-card/68 px-3 shadow-e1">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-icon ${metric.toneClass}`}>
                    {Icon && <Icon className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[10px] text-muted-foreground">{metric.label}</span>
                    <span className="mt-0.5 block truncate text-sm font-semibold tabular-nums text-foreground">{loadingWorkspace ? '-' : metric.value}</span>
                  </span>
                </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isFetching}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-icon bg-card/72 text-muted-foreground shadow-e1 active:scale-95 disabled:opacity-50 ${TABLET_FOCUS_RING}`}
            aria-label={isFetching ? 'Refreshing statistics' : 'Refresh statistics'}
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-card bg-card/68 p-3 shadow-e2 backdrop-blur-xl">
          <div className="flex shrink-0 items-center justify-between gap-3 px-1 pb-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Request activity</p>
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                {requestSampleComplete ? 'Selected reporting window' : `Latest ${formatMetricNumber(returnedRequestCount)} requests`}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              <AnalyticsTimeRangeControl value={timeRange} onChange={onTimeRangeChange} />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto rounded-card bg-background/45 p-3 no-scrollbar dark:bg-white/[0.04]">
            {statusBanners}
            {loadingWorkspace ? (
              <AnalyticsWorkSkeleton />
            ) : failedEmpty ? (
              <div className="flex min-h-[260px] flex-col items-center justify-center px-8 text-center">
                <AlertTriangle className="h-8 w-8 text-destructive/70" />
                <p className="mt-3 text-sm font-semibold text-foreground">Statistics did not load</p>
                <button type="button" onClick={onRefresh} className={`mt-4 h-11 rounded-button bg-foreground px-4 text-xs font-semibold text-background active:scale-95 ${TABLET_FOCUS_RING}`}>
                  Retry
                </button>
              </div>
            ) : (
              <>
                <AnalyticsTrendSection
                  requestSourceReady={requestSourceReady}
                  requestsByDay={requestsByDay}
                  windowLabel={windowLabel}
                  volumeComparison={volumeComparison}
                  TrendIcon={TrendIcon}
                />
                <AnalyticsBreakdownsSection
                  requestSourceReady={requestSourceReady}
                  requestsByStatus={requestsByStatus}
                  emergencyTypes={emergencyTypes}
                />
                <AnalyticsEvidenceSections
                  stats={stats}
                  sourceReadiness={sourceReadiness}
                  capacityPresentation={capacityPresentation}
                  canReadSubscriptionAnalytics={canReadSubscriptionAnalytics}
                  subscriptionStats={subscriptionStats}
                  canReadFinanceAnalytics={canReadFinanceAnalytics}
                  financeSummary={financeSummary}
                  windowLabel={windowLabel}
                />
              </>
            )}
          </div>
        </section>
      </div>
    </TabletPageShell>
  );
};

export default TabletAnalytics;
