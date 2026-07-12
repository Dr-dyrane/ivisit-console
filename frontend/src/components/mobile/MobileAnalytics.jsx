import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    Activity,
    Clock,
    AlertTriangle,
    CheckCircle2,
    Users,
    Wallet,
    Hospital,
    Ambulance,
    Download
} from 'lucide-react';
import { MobileSectionHeader, MobileMetricRow } from './MobileMetricList';
import { MobileFeaturedMetric } from './MobileFeaturedMetric';
import { PullToRefresh } from './PullToRefresh';
import { MobilePageShell } from './MobilePageShell';
import { MobileAnalyticsSkeleton } from './MobileSkeleton';
import { UpdatingPill } from './canon/Loading';
import { formatSignedPercent } from '../../utils/metricsUtils';

const SOURCE_PENDING_LABEL = 'Source pending';
const DEFAULT_SUBSCRIPTION_STATS = {
    total: 0,
    active: 0,
    paid: 0,
    free: 0,
    newUsers: 0,
    welcomeEmailsSent: 0,
    paidConversionRate: 0,
};
const DEFAULT_FINANCE_SUMMARY = { total: 0, weeklyAvg: 0, today: 0 };
const DEFAULT_HOSPITAL_CAPACITY = { total: 0, occupied: 0, icu: 0 };

/**
 * MobileAnalytics
 * Reinvented mobile experience for the Analytics page
 * Canon #10: Dashboard = Control
 * Canon #21: Depth Over Color
 */
export const MobileAnalytics = ({
    stats,
    subscriptionStats,
    financeSummary,
    hospitalCapacity,
    responseTimeData = [],
    requestsByStatus = [],
    emergencyTypes = [],
    dominantType,
    financeData = [],
    demandHeatmap = [],
    timeRange,
    onRefresh,
    loadError,
    onRetry,
    handleExport,
    exportNotice,
    sourceIssueSummary,
    subscriptionScopeLabel = SOURCE_PENDING_LABEL,
    financeScopeLabel = SOURCE_PENDING_LABEL,
    canReadSubscriptionAnalytics = false,
    canReadFinanceAnalytics = false,
    roleContext,
    isLoading = false,
    isFetching = false
}) => {
    // grammar:hero=MobileFeaturedMetric-is-the-signal-first-statistics-hero
    const { isAdmin, isOrgAdmin, isSponsor, isProvider } = roleContext || {};
    const resolvedSubscriptionStats = useMemo(
        () => ({ ...DEFAULT_SUBSCRIPTION_STATS, ...(subscriptionStats || {}) }),
        [subscriptionStats],
    );
    const resolvedFinanceSummary = useMemo(
        () => ({ ...DEFAULT_FINANCE_SUMMARY, ...(financeSummary || {}) }),
        [financeSummary],
    );
    const resolvedHospitalCapacity = useMemo(
        () => ({ ...DEFAULT_HOSPITAL_CAPACITY, ...(hospitalCapacity || {}) }),
        [hospitalCapacity],
    );


    const seriesDelta = (series = [], key = 'value', invert = false) => {
        if (!Array.isArray(series) || series.length < 2) return { badge: SOURCE_PENDING_LABEL, direction: 'flat' };
        const first = Number(series[0]?.[key]);
        const last = Number(series[series.length - 1]?.[key]);
        if (!Number.isFinite(first) || !Number.isFinite(last) || first === 0) return { badge: SOURCE_PENDING_LABEL, direction: 'flat' };
        let delta = ((last - first) / Math.abs(first)) * 100;
        if (invert) delta *= -1;
        return {
            badge: formatSignedPercent(delta) || SOURCE_PENDING_LABEL,
            direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'
        };
    };

    const responseTrend = seriesDelta(responseTimeData, 'avgTime', true);
    const demandTrend = seriesDelta(responseTimeData, 'requests');
    const resolvedStats = useMemo(() => {
        const source = stats || {};

        return {
            totalEmergencies: Number(source.totalEmergencies) || 0,
            avgResponseTime: Number(source.avgResponseTime) || 0,
            successRate: Number(source.successRate) || 0,
            totalHospitals: Number(source.totalHospitals) || 0,
            totalAmbulances: Number(source.totalAmbulances) || 0
        };
    }, [stats]);

    const hasMeasuredSuccess = resolvedStats.totalEmergencies > 0 || Number(stats?.successRate) > 0;
    const hasMeasuredAvgTime = Number(resolvedStats.avgResponseTime) > 0;
    const successValue = hasMeasuredSuccess ? `${resolvedStats.successRate}%` : SOURCE_PENDING_LABEL;
    const avgTimeValue = hasMeasuredAvgTime ? `${resolvedStats.avgResponseTime.toFixed(1)}m` : SOURCE_PENDING_LABEL;
    const successTrendBadge = SOURCE_PENDING_LABEL;
    const hospitalCapacityPercent = resolvedHospitalCapacity.total > 0
        ? Math.round((resolvedHospitalCapacity.occupied / resolvedHospitalCapacity.total) * 100)
        : 0;
    const hasFinanceData = Array.isArray(financeData) && financeData.length > 0;
    const financeScale = Math.max(
        Number(resolvedFinanceSummary.total) || 0,
        Number(resolvedFinanceSummary.weeklyAvg) * 7 || 0,
        Number(resolvedFinanceSummary.today) || 0,
        1
    );
    const formatFinanceValue = (value) => (
        hasFinanceData ? `$${Number(value || 0).toFixed(0)}` : financeScopeLabel
    );
    const financeMetricRows = [
        {
            label: 'Daily yield',
            value: formatFinanceValue(resolvedFinanceSummary.today),
            progress: hasFinanceData ? Math.min(100, Math.round(((Number(resolvedFinanceSummary.today) || 0) / financeScale) * 100)) : 0,
            color: 'hsl(162 94% 24%)'
        },
        {
            label: 'Weekly average',
            value: formatFinanceValue((Number(resolvedFinanceSummary.weeklyAvg) || 0) * 7),
            progress: hasFinanceData ? Math.min(100, Math.round((((Number(resolvedFinanceSummary.weeklyAvg) || 0) * 7) / financeScale) * 100)) : 0,
            color: 'hsl(200 98% 39%)'
        }
    ];
    const paidConversionLabel = canReadSubscriptionAnalytics && Number(resolvedSubscriptionStats.paidConversionRate) > 0
        ? `${Number(resolvedSubscriptionStats.paidConversionRate).toFixed(1)}%`
        : subscriptionScopeLabel;
    const avgTicketLabel = hasFinanceData && resolvedStats.totalEmergencies > 0
        ? `$${(resolvedFinanceSummary.total / resolvedStats.totalEmergencies).toFixed(0)}`
        : financeScopeLabel;
    const subscriberKpiValue = canReadSubscriptionAnalytics
        ? resolvedSubscriptionStats.active || 0
        : subscriptionScopeLabel;

    const sparklineData = useMemo(() => {
        if (!responseTimeData || !responseTimeData.length) return [];
        return responseTimeData.map(d => ({ value: d.avgTime }));
    }, [responseTimeData]);

    const featuredItems = [
        {
            label: 'Average response',
            value: avgTimeValue,
            trend: responseTrend.badge,
            icon: Clock,
            color: 'hsl(200 98% 39%)',
            chartData: sparklineData
        },
        {
            label: isProvider ? 'Completion in scope' : 'Request completion',
            value: successValue,
            trend: successTrendBadge,
            icon: CheckCircle2,
            color: 'hsl(162 94% 24%)',
            chartData: []
        },
        {
            label: isProvider ? 'Your requests' : 'Requests in scope',
            value: resolvedStats.totalEmergencies,
            trend: demandTrend.badge,
            icon: AlertTriangle,
            color: 'hsl(199 89% 38%)',
            chartData: []
        },
        canReadSubscriptionAnalytics
            ? {
                label: 'Active subscribers',
                value: subscriberKpiValue,
                trend: subscriptionScopeLabel,
                icon: Users,
                color: 'hsl(200 98% 39%)',
                chartData: []
            }
            : {
                label: 'Hospitals in scope',
                value: resolvedStats.totalHospitals,
                trend: SOURCE_PENDING_LABEL,
                icon: Hospital,
                color: 'hsl(var(--muted-foreground))',
                chartData: []
            }
    ];

    return (
        <PullToRefresh onRefresh={onRefresh}>
            <MobilePageShell
                animatePageLoad={false}
                contentClassName="min-h-[calc(100dvh-3rem)] px-0 pb-32 pt-4 text-foreground"
            >
                    {isLoading ? (
                        <MobileAnalyticsSkeleton />
                    ) : (
                        <>
                    {isFetching && (
                        <div className="mb-3 flex justify-end px-3">
                            <UpdatingPill />
                        </div>
                    )}
                    {loadError && (
                        <section
                            data-testid="mobile-analytics-error-state"
                            role="alert"
                            className="mx-3 mb-4 rounded-card bg-destructive/10 px-4 py-3 text-destructive"
                        >
                            <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold">Statistics did not load.</p>
                                    <p className="mt-1 break-words text-xs text-destructive/75">Retry when the source is available.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={onRetry || onRefresh}
                                    disabled={isFetching}
                                    data-state={isFetching ? 'loading' : 'ready'}
                                    aria-busy={isFetching}
                                    className="shrink-0 rounded-pill bg-destructive/10 px-4 py-2 text-xs font-semibold transition-all hover:bg-destructive/15 active:scale-[0.96]"
                                >
                                    {isFetching ? 'Retrying' : 'Retry'}
                                </button>
                            </div>
                        </section>
                    )}
                    {sourceIssueSummary && (
                        <section
                            data-testid="mobile-analytics-source-state"
                            role="status"
                            aria-live="polite"
                            className="mx-3 mb-4 rounded-card bg-muted/30 px-4 py-3 text-foreground"
                        >
                            <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold">{sourceIssueSummary.title}</p>
                                    <p className="mt-1 break-words text-xs text-muted-foreground">{sourceIssueSummary.detail}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={onRetry || onRefresh}
                                    disabled={isFetching}
                                    data-state={isFetching ? 'loading' : 'ready'}
                                    aria-busy={isFetching}
                                    className="shrink-0 rounded-pill bg-muted/45 px-4 py-2 text-xs font-semibold text-foreground transition-all hover:bg-muted/60 active:scale-[0.96]"
                                >
                                    {isFetching ? 'Refreshing' : 'Retry'}
                                </button>
                            </div>
                        </section>
                    )}
                    {/* HERO FEATURED METRICS */}
                    <MobileFeaturedMetric items={featuredItems} />

                    {/* IMPACT SUMMARY */}
                    <section>
                        <MobileSectionHeader label="Request activity" color="hsl(var(--muted-foreground))" labelTone="plain" />
                        <div className="space-y-0.5">
                            <MobileMetricRow
                                icon={AlertTriangle}
                                label={isProvider ? "Your requests" : "Requests in scope"}
                                value={resolvedStats.totalEmergencies}
                                rightBlade={{
                                    badge: demandTrend.badge,
                                    direction: demandTrend.direction,
                                    label: 'Window',
                                    value: `${resolvedStats.totalEmergencies} requests`,
                                    color: 'hsl(199 89% 38%)'
                                }}
                                color="hsl(199 89% 38%)"
                                description="Measured request records in the active scope"
                                expandedContent={
                                    <div className="space-y-4 py-3">
                                        <div className="flex flex-col gap-1 px-1">
                                            <span className="text-[11px] font-medium text-muted-foreground">Case type distribution</span>
                                            <p className="text-xs text-foreground/60 italic pb-2">Dominant: <span className="font-semibold text-sky-700 dark:text-sky-200">{dominantType?.name || SOURCE_PENDING_LABEL}</span></p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            {emergencyTypes.map((type, i) => (
                                                <div key={i} className="flex flex-col gap-1 p-3 surface-card rounded-inner">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[11px] font-medium text-muted-foreground">{type.name}</span>
                                                        {type.isDominant && <div className="h-1.5 w-1.5 rounded-pill bg-sky-500" />}
                                                    </div>
                                                    <span className="text-lg font-semibold">{type.value}</span>
                                                </div>
                                            ))}
                                            {emergencyTypes.length === 0 && (
                                                <p className="col-span-2 py-4 text-center text-xs text-muted-foreground">Type distribution is {SOURCE_PENDING_LABEL.toLowerCase()}.</p>
                                            )}
                                        </div>
                                    </div>
                                }
                            />
                            <MobileMetricRow
                                icon={Activity}
                                label="Status breakdown"
                                value={successValue}
                                rightBlade={{
                                    badge: successValue,
                                    label: 'Completion',
                                    value: successValue,
                                    direction: 'flat',
                                    color: 'hsl(162 94% 24%)'
                                }}
                                color="hsl(162 94% 24%)"
                                description="Completed requests in the active scope"
                                expandedContent={
                                    <div className="space-y-3 py-3">
                                        {requestsByStatus.map((status, i) => (
                                            <div key={i} className="space-y-1.5">
                                                <div className="flex justify-between items-center text-[11px] font-medium">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-1.5 h-1.5 rounded-pill" style={{ backgroundColor: status.color }} />
                                                        <span className="text-muted-foreground">{status.name}</span>
                                                    </div>
                                                    <span className="text-foreground/80 font-semibold tabular-nums">{status.value} requests</span>
                                                </div>
                                                <div className="h-1 w-full surface-card rounded-pill overflow-hidden">
                                                    {/* No data entrance (canon section 3): the bar holds its measured width. */}
                                                    <div
                                                        className="h-full"
                                                        style={{ width: `${(status.value / Math.max(resolvedStats.totalEmergencies, 1)) * 100}%`, backgroundColor: status.color, opacity: 0.6 }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                        {requestsByStatus.length === 0 && (
                                            <p className="py-4 text-center text-xs text-muted-foreground">Status distribution is {SOURCE_PENDING_LABEL.toLowerCase()}.</p>
                                        )}
                                    </div>
                                }
                            />
                        </div>
                    </section>

                    {/* REQUEST DISTRIBUTION (Admin/Org Admin/Sponsor) */}
                    {(isAdmin || isOrgAdmin || isSponsor) && (
                        <section className="mt-3">
                            <MobileSectionHeader label="Request distribution" color="hsl(var(--muted-foreground))" labelTone="plain" />
                            <div className="px-6 py-8 surface-card rounded-card relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <Activity size={40} className="text-muted-foreground" />
                                </div>
                                <div className="flex justify-between items-center mb-6">
                                    <div className="space-y-1">
                                        <p className="text-[11px] font-medium text-muted-foreground">Requests by hour</p>
                                        <h4 className="text-xl font-medium">Activity heatmap</h4>
                                    </div>
                                    <div className="rounded-pill bg-muted/30 px-3 py-1">
                                        <span className="text-[11px] font-semibold text-muted-foreground">{timeRange || SOURCE_PENDING_LABEL}</span>
                                    </div>
                                </div>

                                {demandHeatmap.length > 0 ? (
                                    <div className="grid grid-cols-6 gap-1.5">
                                        {demandHeatmap.map((item, idx) => (
                                            <div key={item.hour || idx} className="aspect-square relative">
                                                <div
                                                    className={`w-full h-full rounded-inner ${item.value > 80 ? 'bg-amber-500/60' :
                                                        item.value > 50 ? 'bg-amber-500/40' :
                                                            item.value > 30 ? 'bg-sky-500/20' :
                                                                'bg-foreground/[0.05] dark:bg-white/[0.07]'
                                                        }`}
                                                />
                                                {(idx % 6 === 0) && (
                                                    <span className="absolute -bottom-4 left-0 text-[11px] font-medium text-muted-foreground/60">
                                                        {item.hour}
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="py-8 text-center text-sm text-muted-foreground">{SOURCE_PENDING_LABEL}</p>
                                )}

                                <div className="mt-8 flex justify-between items-center text-muted-foreground">
                                    <div className="flex gap-4">
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-pill bg-amber-500/60" />
                                            <span className="text-[11px] font-medium">Higher</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-pill bg-foreground/15" />
                                            <span className="text-[11px] font-medium">Lower</span>
                                        </div>
                                    </div>
                                    <span className="text-[11px] font-medium">Scoped requests</span>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* INFRASTRUCTURE CAPACITY */}
                    {(isAdmin || isOrgAdmin || isSponsor) && (
                        <section className="mt-3">
                            <MobileSectionHeader label="Network scope" color="hsl(200 98% 39%)" labelTone="plain" />
                            <div className="space-y-0.5">
                                <MobileMetricRow
                                    icon={Hospital}
                                    label="Hospitals in scope"
                                    value={resolvedStats.totalHospitals}
                                    rightBlade={{
                                        badge: resolvedHospitalCapacity.total > 0 ? `${hospitalCapacityPercent}%` : SOURCE_PENDING_LABEL,
                                        label: 'Capacity',
                                        value: `${resolvedHospitalCapacity.total} Beds`,
                                        direction: 'flat',
                                        color: 'hsl(200 98% 39%)'
                                    }}
                                    color="hsl(200 98% 39%)"
                                    expandedContent={
                                        <div className="space-y-4 py-3">
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="p-3 surface-card rounded-inner">
                                                    <p className="text-[11px] font-medium text-muted-foreground mb-1">Total capacity</p>
                                                    <p className="text-lg font-semibold">{resolvedHospitalCapacity.total} Beds</p>
                                                </div>
                                                <div className="p-3 surface-card rounded-inner">
                                                    <p className="text-[11px] font-medium text-muted-foreground mb-1">ICU reserved</p>
                                                    <p className="text-lg font-semibold text-sky-700 dark:text-sky-300">{resolvedHospitalCapacity.icu}</p>
                                                </div>
                                            </div>
                                            <div className="space-y-2 px-1">
                                                <div className="flex justify-between items-baseline">
                                                    <span className="text-[11px] font-medium text-muted-foreground">Bed occupancy</span>
                                                    <span className="text-xs font-semibold tabular-nums">{resolvedHospitalCapacity.total > 0 ? `${hospitalCapacityPercent}%` : SOURCE_PENDING_LABEL}</span>
                                                </div>
                                                <div className="h-1.5 w-full surface-card rounded-pill overflow-hidden">
                                                    {/* No data entrance (canon section 3): the bar holds its measured width. */}
                                                    <div className="h-full bg-sky-500/60" style={{ width: `${hospitalCapacityPercent}%` }} />
                                                </div>
                                            </div>
                                        </div>
                                    }
                                />
                                <MobileMetricRow
                                    icon={Ambulance}
                                    label="Ambulances in scope"
                                    value={resolvedStats.totalAmbulances}
                                    rightBlade={{
                                        badge: SOURCE_PENDING_LABEL,
                                        label: 'Availability',
                                        value: SOURCE_PENDING_LABEL,
                                        direction: 'flat',
                                        color: 'hsl(162 94% 24%)'
                                    }}
                                    color="hsl(162 94% 24%)"
                                />
                            </div>
                        </section>
                    )}

                    {/* UNVERIFIED TELEMETRY SOURCES */}
                    <section className="mt-3">
                        <MobileSectionHeader label="Additional sources" color="hsl(var(--muted-foreground))" labelTone="plain" />
                        <div className="space-y-0.5">
                            <MobileMetricRow
                                icon={Activity}
                                label="Search telemetry"
                                value={SOURCE_PENDING_LABEL}
                                rightBlade={{
                                    badge: SOURCE_PENDING_LABEL,
                                    label: 'Source',
                                    value: SOURCE_PENDING_LABEL,
                                    direction: 'flat',
                                    color: 'hsl(200 98% 39%)'
                                }}
                                color="hsl(200 98% 39%)"
                                description="No verified search telemetry source"
                                expandedContent={
                                    <div className="grid grid-cols-2 gap-2 py-3">
                                        {[
                                            { label: 'Total volume', value: SOURCE_PENDING_LABEL, change: 'Pending' },
                                            { label: 'Precision', value: SOURCE_PENDING_LABEL, change: 'Pending' },
                                            { label: 'Latency', value: SOURCE_PENDING_LABEL, change: 'Pending' },
                                            { label: 'Void ratio', value: SOURCE_PENDING_LABEL, change: 'Pending' }
                                        ].map((m, i) => (
                                            <div key={i} className="p-3 surface-card rounded-inner flex flex-col justify-between min-h-[70px]">
                                                <div className="flex justify-between items-start">
                                                    <span className="text-[11px] font-medium text-muted-foreground">{m.label}</span>
                                                    <span className="text-[11px] font-semibold text-muted-foreground">{m.change}</span>
                                                </div>
                                                <span className="text-lg font-semibold">{m.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                }
                            />
                            <MobileMetricRow
                                icon={Activity}
                                label="Platform telemetry"
                                value={SOURCE_PENDING_LABEL}
                                rightBlade={{
                                    badge: SOURCE_PENDING_LABEL,
                                    label: 'Source',
                                    value: SOURCE_PENDING_LABEL,
                                    direction: 'flat',
                                    color: 'hsl(162 94% 24%)'
                                }}
                                color="hsl(162 94% 24%)"
                                description="No verified platform telemetry source"
                                expandedContent={
                                    <div className="space-y-4 py-4">
                                        {[
                                            { label: 'API response', value: SOURCE_PENDING_LABEL, progress: 0, status: 'pending' },
                                            { label: 'DB query time', value: SOURCE_PENDING_LABEL, progress: 0, status: 'pending' },
                                            { label: 'Uptime', value: SOURCE_PENDING_LABEL, progress: 0, status: 'pending' },
                                            { label: 'Error rate', value: SOURCE_PENDING_LABEL, progress: 0, status: 'pending' }
                                        ].map((p, i) => (
                                            <div key={i} className="space-y-2">
                                                <div className="flex justify-between items-center text-[11px] font-medium text-muted-foreground">
                                                    <span>{p.label}</span>
                                                    <span className="text-foreground">{p.value}</span>
                                                </div>
                                                <div className="h-1 w-full surface-card rounded-pill overflow-hidden">
                                                    {/* No data entrance (canon section 3): the bar holds its measured width. */}
                                                    <div
                                                        className={`h-full ${p.status === 'excellent' ? 'bg-emerald-500/60' : p.status === 'pending' ? 'bg-muted/40' : 'bg-sky-500/60'}`}
                                                        style={{ width: `${p.progress}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                }
                            />
                        </div>
                    </section>

                    {/* FINANCE SCOPE (Admin/Sponsor until org finance scope is proved) */}
                    {canReadFinanceAnalytics && (
                        <section className="mt-3">
                            <MobileSectionHeader label="Finance scope" color="hsl(26 90% 37%)" labelTone="plain" />
                            <div className="px-6 py-8 surface-card rounded-card relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-5">
                                    <Wallet size={60} className="text-emerald-500" />
                                </div>

                                <div className="mb-8 min-w-0 pr-12">
                                    <p className="mb-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">Recorded total</p>
                                    <h4 className="break-words text-3xl font-semibold">{hasFinanceData ? `$${resolvedFinanceSummary.total.toFixed(0)}` : financeScopeLabel}</h4>
                                </div>

                                <div className="space-y-5">
                                    {financeMetricRows.map((m, i) => (
                                        <div key={i} className="space-y-2">
                                            <div className="flex justify-between text-[11px] font-medium text-muted-foreground">
                                                <span>{m.label}</span>
                                                <span className="text-foreground/80 tabular-nums">{m.value}</span>
                                            </div>
                                            <div className="h-1 w-full surface-card rounded-pill overflow-hidden">
                                                {/* No data entrance (canon section 3): the bar holds its measured width. */}
                                                <div
                                                    className="h-full opacity-60"
                                                    style={{ backgroundColor: m.color, width: `${m.progress}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-8 grid grid-cols-2 gap-3">
                                    <div className="p-3 surface-card rounded-inner text-center">
                                        <p className="text-[11px] font-medium text-muted-foreground mb-1">Conversion</p>
                                        <p className="text-sm font-semibold text-foreground">{paidConversionLabel}</p>
                                    </div>
                                    <div className="p-3 surface-card rounded-inner text-center">
                                        <p className="text-[11px] font-medium text-muted-foreground mb-1">Avg ticket</p>
                                        <p className="text-sm font-semibold text-foreground">{avgTicketLabel}</p>
                                    </div>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* EXPORT ACTION PILL */}
                    <section className="mt-6 mb-12 p-3">
                        {exportNotice && (
                            <p
                                role="status"
                                aria-live="polite"
                                className="mb-3 rounded-inner surface-card px-4 py-3 text-xs font-medium text-muted-foreground"
                            >
                                {exportNotice}
                            </p>
                        )}
                        <motion.button
                            type="button"
                            whileTap={{ scale: 0.96 }}
                            onClick={handleExport}
                            data-state="unavailable"
                            aria-disabled="true"
                            aria-describedby={exportNotice ? 'mobile-analytics-export-feedback' : undefined}
                            className="w-full surface-card py-4 rounded-button flex items-center justify-center gap-3 transition-all"
                        >
                            <Download size={20} className="text-muted-foreground" />
                            <span className="text-[13px] font-semibold text-foreground">Report unavailable</span>
                        </motion.button>
                        <p
                            id="mobile-analytics-export-feedback"
                            className="text-center text-[11px] font-medium text-muted-foreground mt-6"
                        >
                            Report scope pending - no verified receiver
                        </p>
                    </section>
                        </>
                    )}
            </MobilePageShell>
        </PullToRefresh>
    );
};
