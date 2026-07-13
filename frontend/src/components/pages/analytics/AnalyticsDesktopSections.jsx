import React from 'react';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  formatMetricNumber,
} from '../../analytics/AnalyticsSummaryPrimitives';
import { Shimmer } from '../../console/primitives';
import {
  ANALYTICS_CHART_HEIGHT,
  ANALYTICS_CHART_INITIAL_DIMENSION,
  formatAnalyticsCurrency,
  getBreakdownTone,
  SOURCE_UNAVAILABLE,
} from './analyticsDesktopModel';

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

export const EvidenceItem = ({ label, value }) => (
  <div className="min-w-0 rounded-inner bg-foreground/[0.045] px-3 py-2.5 dark:bg-white/[0.055]">
    <p className="truncate text-[10px] font-medium text-muted-foreground">{label}</p>
    <p className="mt-1 truncate text-sm font-semibold text-foreground tabular-nums">{value}</p>
  </div>
);

export const EvidenceSection = ({ title, detail, children, testId }) => (
  <section className="mt-5" data-testid={testId}>
    <div className="mb-3 px-1">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}
    </div>
    <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">{children}</div>
  </section>
);

export const AnalyticsWorkSkeleton = () => (
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

export const AnalyticsTrendSection = ({
  requestSourceReady,
  requestsByDay,
  windowLabel,
  volumeComparison,
  TrendIcon,
}) => (
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
        <ResponsiveContainer width="100%" height={ANALYTICS_CHART_HEIGHT} initialDimension={ANALYTICS_CHART_INITIAL_DIMENSION}>
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
);

export const AnalyticsBreakdownsSection = ({
  requestSourceReady,
  requestsByStatus,
  emergencyTypes,
}) => (
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
);

export const AnalyticsEvidenceSections = ({
  stats,
  sourceReadiness,
  bedUse,
  canReadSubscriptionAnalytics,
  subscriptionStats,
  canReadFinanceAnalytics,
  financeSummary,
  windowLabel,
}) => (
  <>
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
        <EvidenceItem label="Credits" value={sourceReadiness?.finance ? formatAnalyticsCurrency(financeSummary?.totalCredits, financeSummary?.currency) : SOURCE_UNAVAILABLE} />
        <EvidenceItem label="Debits" value={sourceReadiness?.finance ? formatAnalyticsCurrency(financeSummary?.totalDebits, financeSummary?.currency) : SOURCE_UNAVAILABLE} />
        <EvidenceItem label="Today" value={sourceReadiness?.finance ? formatAnalyticsCurrency(financeSummary?.todayCredits, financeSummary?.currency) : SOURCE_UNAVAILABLE} />
        <EvidenceItem label="Daily average" value={sourceReadiness?.finance ? formatAnalyticsCurrency(financeSummary?.dailyAverageCredits, financeSummary?.currency) : SOURCE_UNAVAILABLE} />
      </EvidenceSection>
    )}
  </>
);
