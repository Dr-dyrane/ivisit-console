import React from 'react';
import { Activity, CheckCircle2, Clock3, FileText, Hospital } from 'lucide-react';
import {
  formatAnalyticsWindow,
  formatMetricNumber,
  formatResponseMinutes,
} from '../analytics/AnalyticsSummaryPrimitives';
import { selectContextMetrics } from '../console/MetricStrip';

const SOURCE_UNAVAILABLE = 'Unavailable';

const getAudienceLabel = (role = {}) => {
  if (role.isProvider) return 'Provider activity';
  if (role.isSponsor) return 'Sponsor view';
  if (role.isOrgAdmin) return 'Organization activity';
  if (role.isAdmin) return 'Platform activity';
  return 'Available activity';
};

const Metric = ({ icon: Icon, label, value, toneClass }) => (
  <div className="flex min-h-[74px] items-center gap-3 rounded-inner bg-background/45 p-3 dark:bg-white/[0.04]">
    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-icon ${toneClass}`}>
      <Icon className="h-4 w-4" />
    </span>
    <div className="min-w-0">
      <p className="break-words text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-foreground tabular-nums">{value}</p>
    </div>
  </div>
);

const Evidence = ({ label, value }) => (
  <div className="flex items-center justify-between gap-3 rounded-inner bg-background/35 px-3 py-2.5 text-xs dark:bg-white/[0.035]">
    <span className="text-muted-foreground">{label}</span>
    <span className="text-right font-semibold text-foreground tabular-nums">{value}</span>
  </div>
);

export const AnalyticsPanel = ({ analyticsContext = null }) => {
  const stats = analyticsContext?.stats || {};
  const readiness = analyticsContext?.sourceReadiness || {};
  const requestSample = analyticsContext?.requestSample || {};
  const requestReady = Boolean(readiness.requests);
  const snapshotReady = Boolean(analyticsContext?.snapshotReady);
  const requestSampleComplete = requestSample.complete === true;
  const returnedRequestCount = Number.isFinite(Number(requestSample.returnedCount))
    ? Number(requestSample.returnedCount)
    : Number(stats.totalEmergencies) || 0;
  const responseSampleSize = Number(stats.responseSampleSize) || 0;
  const audienceLabel = getAudienceLabel(analyticsContext?.roleContext || {});
  const windowLabel = formatAnalyticsWindow(analyticsContext?.snapshotTimeRange || analyticsContext?.timeRange);
  const headlineMetrics = selectContextMetrics([
    {
      id: 'requests',
      icon: Activity,
      label: requestSampleComplete ? 'Requests' : `Latest ${formatMetricNumber(returnedRequestCount)} requests`,
      value: formatMetricNumber(stats.totalEmergencies),
      available: requestReady,
      priority: 0,
      toneClass: 'bg-sky-500/10 text-sky-700 dark:text-sky-200',
    },
    {
      id: 'completed',
      icon: CheckCircle2,
      label: 'Completed',
      value: formatMetricNumber(stats.completedEmergencies),
      available: requestReady,
      priority: 1,
      toneClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200',
    },
    {
      id: 'average-response',
      icon: Clock3,
      label: 'Average response',
      value: formatResponseMinutes(stats.avgResponseTime, responseSampleSize),
      available: requestReady && responseSampleSize > 0,
      priority: 2,
      toneClass: 'bg-amber-500/10 text-amber-800 dark:text-amber-200',
    },
    {
      id: 'facilities',
      icon: Hospital,
      label: 'Facilities',
      value: formatMetricNumber(stats.totalHospitals),
      available: responseSampleSize === 0 && Boolean(readiness.hospitals),
      priority: 3,
      toneClass: 'bg-violet-500/10 text-violet-700 dark:text-violet-200',
    },
  ], 3);

  if (analyticsContext?.loading && !snapshotReady) {
    return (
      <div className="space-y-3 py-2">
        {[0, 1, 2].map((item) => <div key={item} className="h-16 animate-pulse rounded-inner bg-muted/35" />)}
      </div>
    );
  }

  const requestTotal = Number(stats.totalEmergencies) || 0;
  const completionValue = requestReady && requestTotal > 0
    ? `${Number(stats.successRate) || 0}%`
    : requestReady ? 'No requests' : SOURCE_UNAVAILABLE;

  return (
    <div className="space-y-6">
      {(analyticsContext?.error || analyticsContext?.sourceIssueSummary) && (
        <div
          role="status"
          className={`rounded-inner px-4 py-3 text-sm shadow-e2 ${analyticsContext?.error
            ? 'bg-destructive/10 text-destructive'
            : 'bg-amber-500/10 text-amber-800 dark:text-amber-200'}`}
        >
          {analyticsContext?.error || analyticsContext.sourceIssueSummary.title}
        </div>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold">Overview</h3>
          <span className="rounded-pill bg-sky-500/10 px-2.5 py-1 text-xs font-semibold text-sky-700 dark:text-sky-200">
            {windowLabel}
          </span>
        </div>
        <div className="rounded-card bg-background/45 p-4 shadow-e2 dark:bg-white/[0.04]">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-icon bg-sky-500/10 text-sky-700 dark:text-sky-200">
              <Activity className="h-5 w-5" />
            </span>
            <div>
              <p className="text-base font-semibold">{audienceLabel}</p>
              <p className="mt-1 text-xs text-muted-foreground">Activity available for this view</p>
            </div>
          </div>
        </div>
      </section>

      {requestReady && !requestSampleComplete && (
        <div role="status" className="rounded-inner bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
          <p className="font-semibold">Latest {formatMetricNumber(returnedRequestCount)} requests</p>
          <p className="mt-1 text-xs leading-5">Headline and timing values use this partial set.</p>
        </div>
      )}

      <section>
        <h3 className="mb-3 text-sm font-semibold">At a glance</h3>
        <div className="space-y-2">
          {headlineMetrics.map((metric) => <Metric key={metric.id} {...metric} />)}
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold">Useful context</h3>
        <div className="space-y-2">
          <Evidence label={requestSampleComplete ? 'Completion rate' : 'Sample completion rate'} value={completionValue} />
          <Evidence label={requestSampleComplete ? 'Timed requests' : 'Timed in sample'} value={requestReady ? formatMetricNumber(responseSampleSize) : SOURCE_UNAVAILABLE} />
          <Evidence label="Facilities" value={readiness.hospitals ? formatMetricNumber(stats.totalHospitals) : SOURCE_UNAVAILABLE} />
          <Evidence label="Fleet" value={readiness.ambulances ? formatMetricNumber(stats.totalAmbulances) : SOURCE_UNAVAILABLE} />
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold">Reporting</h3>
        <div className="flex items-start gap-3 rounded-card bg-background/45 p-4 text-muted-foreground shadow-e2 dark:bg-white/[0.04]">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-icon bg-foreground/[0.055] dark:bg-white/[0.06]">
            <FileText className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">Downloads unavailable</p>
            <p className="mt-1 text-xs leading-5">Report downloads are not available yet.</p>
          </div>
        </div>
      </section>
    </div>
  );
};
