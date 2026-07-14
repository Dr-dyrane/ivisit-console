import React, { useMemo } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Hospital,
  Loader2,
  Minus,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  AnalyticsTimeRangeControl,
  formatAnalyticsWindow,
  formatMetricNumber,
  formatResponseMinutes,
  getVolumeComparison,
} from '../../analytics/AnalyticsSummaryPrimitives';
import { ActivitySheet } from '../../console/ActivitySheet';
import { MetricStrip } from '../../console/MetricStrip';
import { SignalPanel } from '../../console/SignalPanel';
import { WorkspaceStage } from '../../console/WorkspaceStage';
import { AnalyticsDetailRail } from './AnalyticsDetailRail';
import {
  AnalyticsBreakdownsSection,
  AnalyticsEvidenceSections,
  AnalyticsTrendSection,
  AnalyticsWorkSkeleton,
} from './AnalyticsDesktopSections';
import {
  getAnalyticsAudienceLabel,
  getAnalyticsPagination,
  getAnalyticsSignal,
} from './analyticsDesktopModel';
import { getAnalyticsCapacityPresentation } from './analyticsCapacityModel';

const signalToneClass = {
  primary: 'bg-sky-500/10 text-sky-700 dark:text-sky-200',
  clear: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200',
  warning: 'bg-amber-500/10 text-amber-800 dark:text-amber-200',
  danger: 'bg-destructive/10 text-destructive',
  muted: 'bg-foreground/[0.055] text-muted-foreground dark:bg-white/[0.06]',
};

export const getAnalyticsDetailRailProps = ({
  stats,
  requestSample,
  dataWindow,
  roleContext,
  sourceReadiness,
  dominantType,
  isLoading,
  isFetching,
}) => {
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

  return {
    isLoading,
    isFetching,
    windowLabel: formatAnalyticsWindow(dataWindow),
    audienceLabel: getAnalyticsAudienceLabel(roleContext),
    metricItems: [
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
    ],
    stats,
    requestSample,
    sourceReadiness,
    dominantType,
  };
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
  const detailRailProps = getAnalyticsDetailRailProps({
    stats,
    requestSample,
    dataWindow,
    roleContext,
    sourceReadiness,
    dominantType,
    isLoading: Boolean(isLoading) && !snapshotReady,
    isFetching,
  });
  const { windowLabel, audienceLabel, metricItems } = detailRailProps;
  const requestSourceReady = Boolean(sourceReadiness?.requests);
  const totalRequests = Number(stats?.totalEmergencies) || 0;
  const completedRequests = Number(stats?.completedEmergencies) || 0;
  const requestSampleComplete = requestSample?.complete === true;
  const returnedRequestCount = Number.isFinite(Number(requestSample?.returnedCount))
    ? Number(requestSample.returnedCount)
    : totalRequests;
  const failedEmpty = Boolean(loadError) && !snapshotReady;
  const loadingWorkspace = Boolean(isLoading) && !snapshotReady;
  const volumeComparison = useMemo(() => getVolumeComparison(requestsByDay), [requestsByDay]);
  const analyticsPagination = useMemo(() => getAnalyticsPagination(dataWindow), [dataWindow]);

  const signal = getAnalyticsSignal({
    failedEmpty,
    requestSourceReady,
    audienceLabel,
    totalRequests,
    completedRequests,
    returnedRequestCount,
    requestSampleComplete,
    windowLabel,
    icons: { alert: AlertTriangle, activity: Activity },
  });
  const TrendIcon = volumeComparison?.direction === 'up'
    ? TrendingUp
    : volumeComparison?.direction === 'down'
      ? TrendingDown
      : Minus;
  const capacityPresentation = getAnalyticsCapacityPresentation({
    sourceReady: sourceReadiness?.hospitalCapacity,
    capacity: hospitalCapacity,
  });

  return (
    <WorkspaceStage
      moduleRailItems={moduleRailItems}
      activePath="/analytics"
      routingPath={routingPath}
      onRailNavigate={onRailNavigate}
      rail={(
        <AnalyticsDetailRail {...detailRailProps} />
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
        )}
      </ActivitySheet>
    </WorkspaceStage>
  );
};
