import React from 'react';
import { Activity, Ambulance, CheckCircle2, Clock3, FileText, Hospital } from 'lucide-react';
import {
  formatAnalyticsWindow,
  formatMetricNumber,
  formatResponseMinutes,
  getAnalyticsScopeLabel,
} from '../analytics/AnalyticsSummaryPrimitives';

const SOURCE_UNAVAILABLE = 'Unavailable';

const Metric = ({ icon: Icon, label, value, tone = 'muted' }) => {
  const tones = {
    clear: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200',
    info: 'bg-sky-500/10 text-sky-700 dark:text-sky-200',
    warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-200',
    violet: 'bg-violet-500/10 text-violet-700 dark:text-violet-200',
    muted: 'bg-foreground/[0.055] text-muted-foreground dark:bg-white/[0.06]',
  };

  return (
    <div className="flex min-h-[74px] items-center gap-3 rounded-inner bg-background/45 p-3 dark:bg-white/[0.04]">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-icon ${tones[tone]}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 break-words text-sm font-semibold text-foreground tabular-nums">{value}</p>
      </div>
    </div>
  );
};

export const AnalyticsPanel = ({ analyticsContext = null }) => {
  const stats = analyticsContext?.stats || {};
  const readiness = analyticsContext?.sourceReadiness || {};
  const requestReady = Boolean(readiness.requests);
  const snapshotReady = Boolean(analyticsContext?.snapshotReady);
  const scopeLabel = getAnalyticsScopeLabel(analyticsContext?.roleContext || {});
  const windowLabel = formatAnalyticsWindow(analyticsContext?.snapshotTimeRange || analyticsContext?.timeRange);

  if (analyticsContext?.loading && !snapshotReady) {
    return (
      <div className="space-y-3 py-2">
        {[0, 1, 2, 3].map((item) => <div key={item} className="h-16 animate-pulse rounded-inner bg-muted/35" />)}
      </div>
    );
  }

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
          <h3 className="text-sm font-semibold">Summary</h3>
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
              <p className="text-base font-semibold">{scopeLabel}</p>
              <p className="mt-1 text-xs text-muted-foreground">Measured route projection</p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold">Pinned</h3>
        <div className="grid grid-cols-2 gap-2">
          <Metric icon={Activity} label="Requests" value={requestReady ? formatMetricNumber(stats.totalEmergencies) : SOURCE_UNAVAILABLE} tone="info" />
          <Metric icon={CheckCircle2} label="Completed" value={requestReady ? formatMetricNumber(stats.completedEmergencies) : SOURCE_UNAVAILABLE} tone="clear" />
          <Metric icon={Clock3} label="Avg response" value={requestReady ? formatResponseMinutes(stats.avgResponseTime, stats.responseSampleSize) : SOURCE_UNAVAILABLE} tone="warning" />
          <Metric icon={Hospital} label="Facilities" value={readiness.hospitals ? formatMetricNumber(stats.totalHospitals) : SOURCE_UNAVAILABLE} tone="violet" />
          <Metric icon={Ambulance} label="Fleet" value={readiness.ambulances ? formatMetricNumber(stats.totalAmbulances) : SOURCE_UNAVAILABLE} />
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold">Reporting</h3>
        <div className="flex items-start gap-3 rounded-card bg-background/45 p-4 text-muted-foreground shadow-e2 dark:bg-white/[0.04]">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-icon bg-foreground/[0.055] dark:bg-white/[0.06]">
            <FileText className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">Reports unavailable</p>
            <p className="mt-1 text-xs leading-5">Export stays off until dataset scope, redaction, and receiver authority are verified.</p>
          </div>
        </div>
      </section>
    </div>
  );
};
