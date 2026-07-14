import React from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { formatMetricNumber } from '../../analytics/AnalyticsSummaryPrimitives';
import { selectContextMetrics } from '../../console/MetricStrip';
import { DetailRailShell, RailInsetHero } from '../../console/WorkspaceStage';
import { Shimmer } from '../../console/primitives';
import { EvidenceItem } from './AnalyticsDesktopSections';
import { SOURCE_UNAVAILABLE } from './analyticsDesktopModel';

export const AnalyticsDetailRail = ({
  isLoading,
  isFetching,
  windowLabel,
  audienceLabel,
  metricItems,
  stats,
  requestSample,
  sourceReadiness,
  dominantType,
  embedded = false,
}) => {
  if (isLoading) {
    return (
      <DetailRailShell embedded={embedded}>
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
    <DetailRailShell embedded={embedded}>
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
