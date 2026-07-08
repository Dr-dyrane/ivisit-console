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
    TrendingUp,
    BarChart3,
    PieChart as PieChartIcon,
    Zap,
    TrendingDown,
    Download
} from 'lucide-react';
import { MobileKPIStrip } from './MobileKPIStrip';
import { MobileSectionHeader, MobileMetricRow } from './MobileMetricList';
import { MobileFeaturedMetric } from './MobileFeaturedMetric';
import { PullToRefresh } from './PullToRefresh';
import { MobilePageShell } from './MobilePageShell';
import { calcDeltaPercent, formatSignedPercent, toDeltaBadge } from '../../utils/metricsUtils';

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
const DEFAULT_FINANCE_SUMMARY = { total: 0, weeklyAvg: 0, today: 0, health: 0 };
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
    roleContext
}) => {
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
    const successDelta = hasMeasuredSuccess ? Number(resolvedStats.successRate) - 80 : null;
    const successValue = hasMeasuredSuccess ? `${resolvedStats.successRate}%` : SOURCE_PENDING_LABEL;
    const avgTimeValue = hasMeasuredAvgTime ? `${resolvedStats.avgResponseTime.toFixed(1)}m` : SOURCE_PENDING_LABEL;
    const successTrendBadge = formatSignedPercent(successDelta) || SOURCE_PENDING_LABEL;
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
            label: 'Daily Yield',
            value: formatFinanceValue(resolvedFinanceSummary.today),
            progress: hasFinanceData ? Math.min(100, Math.round(((Number(resolvedFinanceSummary.today) || 0) / financeScale) * 100)) : 0,
            color: 'hsl(var(--success))'
        },
        {
            label: 'Weekly Average',
            value: formatFinanceValue((Number(resolvedFinanceSummary.weeklyAvg) || 0) * 7),
            progress: hasFinanceData ? Math.min(100, Math.round((((Number(resolvedFinanceSummary.weeklyAvg) || 0) * 7) / financeScale) * 100)) : 0,
            color: 'hsl(var(--primary))'
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

    const getKPIData = () => {
        if (isAdmin || isOrgAdmin || isSponsor) {
            return [
                { label: 'Success', value: successValue, color: 'hsl(var(--success))', delta: successTrendBadge, direction: successDelta > 0 ? 'up' : successDelta < 0 ? 'down' : 'flat' },
                { label: 'Avg Time', value: avgTimeValue, color: 'hsl(var(--info))', delta: responseTrend.badge, direction: responseTrend.direction },
                { label: 'Total', value: resolvedStats.totalEmergencies, color: 'hsl(var(--destructive))', delta: demandTrend.badge, direction: demandTrend.direction },
                { label: 'Fleet', value: resolvedStats.totalAmbulances, color: 'hsl(var(--primary))', delta: SOURCE_PENDING_LABEL, direction: 'flat' },
                { label: 'Hospitals', value: resolvedStats.totalHospitals, color: 'hsl(var(--secondary))', delta: SOURCE_PENDING_LABEL, direction: 'flat' },
                { label: 'Subs', value: subscriberKpiValue, color: 'hsl(var(--info))', delta: subscriptionScopeLabel, direction: 'flat' }
            ];
        }
        return [
            { label: 'My Success', value: successValue, color: 'hsl(var(--success))', delta: successTrendBadge, direction: successDelta > 0 ? 'up' : successDelta < 0 ? 'down' : 'flat' },
            { label: 'Responses', value: resolvedStats.totalEmergencies, color: 'hsl(var(--primary))', delta: demandTrend.badge, direction: demandTrend.direction },
            { label: 'Avg Time', value: avgTimeValue, color: 'hsl(var(--info))', delta: responseTrend.badge, direction: responseTrend.direction },
            { label: 'Hospitals', value: resolvedStats.totalHospitals, color: 'hsl(var(--secondary))', delta: SOURCE_PENDING_LABEL, direction: 'flat' },
            { label: 'Fleet', value: resolvedStats.totalAmbulances, color: 'hsl(var(--primary))', delta: SOURCE_PENDING_LABEL, direction: 'flat' }
        ];
    };

    return (
        <PullToRefresh onRefresh={onRefresh}>
            <MobilePageShell
                kpiStrip={<MobileKPIStrip kpis={getKPIData()} />}
                contentClassName="pt-4 pb-4 text-foreground"
            >
                    {loadError && (
                        <section
                            data-testid="mobile-analytics-error-state"
                            role="alert"
                            className="mx-3 mb-4 rounded-card bg-destructive/10 px-4 py-3 text-destructive shadow-sm"
                        >
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-sm font-semibold">Statistics did not load.</p>
                                    <p className="mt-1 text-xs text-destructive/75">Retry when the source is available.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={onRetry || onRefresh}
                                    className="shrink-0 rounded-button bg-background/70 px-4 py-2 text-xs font-semibold text-destructive"
                                >
                                    Retry
                                </button>
                            </div>
                        </section>
                    )}
                    {sourceIssueSummary && (
                        <section
                            data-testid="mobile-analytics-source-state"
                            role="status"
                            aria-live="polite"
                            className="mx-3 mb-4 rounded-card bg-amber-50 px-4 py-3 text-amber-900 shadow-sm dark:bg-amber-950/30 dark:text-amber-200"
                        >
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-sm font-semibold">{sourceIssueSummary.title}</p>
                                    <p className="mt-1 text-xs text-amber-800/75 dark:text-amber-100/70">{sourceIssueSummary.detail}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={onRetry || onRefresh}
                                    className="shrink-0 rounded-button bg-background/70 px-4 py-2 text-xs font-semibold text-amber-900 dark:text-amber-100"
                                >
                                    Retry
                                </button>
                            </div>
                        </section>
                    )}
                    {/* HERO FEATURED METRICS */}
                    <MobileFeaturedMetric
                        items={[
                            {
                                label: isProvider ? 'Personal Performance' : 'Impact Velocity',
                                value: isProvider ? successValue : avgTimeValue,
                                trend: hasMeasuredAvgTime ? (resolvedStats.avgResponseTime < 10 ? 'Current' : 'Watch') : SOURCE_PENDING_LABEL,
                                icon: isProvider ? Activity : Clock,
                                color: isProvider ? 'hsl(var(--success))' : 'hsl(var(--info))',
                                chartData: sparklineData
                            },
                            {
                                label: 'System Success',
                                value: successValue,
                                trend: successTrendBadge,
                                icon: CheckCircle2,
                                color: 'hsl(var(--success))',
                                chartData: sparklineData
                            },
                            {
                                label: 'Demand',
                                value: resolvedStats.totalEmergencies,
                                trend: demandTrend.badge,
                                icon: AlertTriangle,
                                color: 'hsl(var(--destructive))',
                                chartData: sparklineData
                            },
                            {
                                label: 'Network Capacity',
                                value: resolvedStats.totalHospitals,
                                trend: SOURCE_PENDING_LABEL,
                                icon: Hospital,
                                color: 'hsl(var(--info))',
                                chartData: []
                            }
                        ]}
                    />

                    {/* IMPACT SUMMARY */}
                    <section>
                        <MobileSectionHeader label="System Impact" color="hsl(var(--primary))" />
                        <div className="space-y-0.5">
                            <MobileMetricRow
                                icon={AlertTriangle}
                                label={isProvider ? "Your Cases" : "Total Emergencies"}
                                value={resolvedStats.totalEmergencies}
                                rightBlade={{
                                    badge: demandTrend.badge,
                                    direction: demandTrend.direction,
                                    label: 'Pressure',
                                    value: `${resolvedStats.totalEmergencies} Load`,
                                    color: 'hsl(var(--destructive))'
                                }}
                                color="hsl(var(--destructive))"
                                description="Life-threatening requests"
                                expandedContent={
                                    <div className="space-y-4 py-3">
                                        <div className="flex flex-col gap-1 px-1">
                                            <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">Case Type Distribution</span>
                                            <p className="text-xs text-foreground/60 italic pb-2">Dominant: <span className="text-destructive font-semibold">{dominantType?.name || SOURCE_PENDING_LABEL}</span></p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            {emergencyTypes.map((type, i) => (
                                                <div key={i} className="flex flex-col gap-1 p-3 bg-muted/30 rounded-inner">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">{type.name}</span>
                                                        {type.isDominant && <div className="w-1.5 h-1.5 rounded-pill bg-destructive animate-pulse" />}
                                                    </div>
                                                    <span className="text-lg font-semibold tracking-tighter">{type.value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                }
                            />
                            <MobileMetricRow
                                icon={Activity}
                                label="Status Breakdown"
                                value={successValue}
                                rightBlade={{
                                    badge: successValue,
                                    label: 'Fulfillment',
                                    value: successValue,
                                    direction: hasMeasuredSuccess && resolvedStats.successRate >= 85 ? 'up' : hasMeasuredSuccess ? 'down' : 'flat',
                                    color: 'hsl(var(--success))'
                                }}
                                color="hsl(var(--success))"
                                description="Fulfillment rate"
                                expandedContent={
                                    <div className="space-y-3 py-3">
                                        {requestsByStatus.map((status, i) => (
                                            <div key={i} className="space-y-1.5">
                                                <div className="flex justify-between items-center text-[10px] uppercase tracking-[0.14em] font-semibold">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-1.5 h-1.5 rounded-pill" style={{ backgroundColor: status.color }} />
                                                        <span className="text-foreground/60">{status.name}</span>
                                                    </div>
                                                    <span className="text-foreground/80 font-semibold">{status.value} units</span>
                                                </div>
                                                <div className="h-1 w-full bg-muted/30 rounded-pill overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${(status.value / Math.max(resolvedStats.totalEmergencies, 1)) * 100}%` }}
                                                        className="h-full"
                                                        style={{ backgroundColor: status.color, opacity: 0.6 }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                }
                            />
                        </div>
                    </section>

                    {/* PEAK DEMAND HEATMAP (Admin/Org Admin/Sponsor) */}
                    {(isAdmin || isOrgAdmin || isSponsor) && (
                        <section className="mt-3">
                            <MobileSectionHeader label="Demand Velocity" color="hsl(var(--destructive))" />
                            <div className="px-6 py-8 bg-card/68 backdrop-blur-2xl rounded-card relative overflow-hidden shadow-[0_24px_70px_rgb(0_0_0/0.16)]">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <Activity size={40} className="text-destructive" />
                                </div>
                                <div className="flex justify-between items-center mb-6">
                                    <div className="space-y-1">
                                        <p className="text-[10px] uppercase tracking-[0.14em] text-destructive font-semibold">Load Distribution</p>
                                        <h4 className="text-xl font-medium tracking-tight">Peak Heatmap</h4>
                                    </div>
                                    <div className="px-3 py-1 bg-destructive/10 rounded-pill">
                                        <span className="text-[10px] font-semibold text-destructive uppercase tracking-[0.14em]">{SOURCE_PENDING_LABEL}</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-6 gap-1.5">
                                    {demandHeatmap.map((item, idx) => (
                                        <div key={idx} className="aspect-square relative group">
                                            <div
                                                className={`w-full h-full rounded-inner transition-all duration-300 ${item.value > 80 ? 'bg-destructive/60 shadow-[0_0_8px_rgba(var(--destructive),0.4)]' :
                                                    item.value > 50 ? 'bg-amber-500/40' :
                                                        item.value > 30 ? 'bg-sky-500/20' :
                                                            'bg-white/5'
                                                    }`}
                                            />
                                            {/* Minimal hour indicator for key times */}
                                            {(idx % 6 === 0) && (
                                                <span className="absolute -bottom-4 left-0 text-[10px] text-muted-foreground/30 font-semibold uppercase tracking-tighter">
                                                    {item.hour}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-8 flex justify-between items-center opacity-40">
                                    <div className="flex gap-4">
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-pill bg-destructive/60" />
                                            <span className="text-[10px] font-semibold uppercase tracking-[0.14em]">Critical</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-pill bg-white/10" />
                                            <span className="text-[10px] font-semibold uppercase tracking-[0.14em]">Idle</span>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-semibold italic opacity-50 uppercase tracking-[0.14em]">{SOURCE_PENDING_LABEL}</span>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* INFRASTRUCTURE CAPACITY */}
                    {(isAdmin || isOrgAdmin || isSponsor) && (
                        <section className="mt-3">
                            <MobileSectionHeader label="Strategic Assets" color="hsl(var(--info))" />
                            <div className="space-y-0.5">
                                <MobileMetricRow
                                    icon={Hospital}
                                    label="Medical Facilities"
                                    value={resolvedStats.totalHospitals}
                                    rightBlade={{
                                        badge: resolvedHospitalCapacity.total > 0 ? `${hospitalCapacityPercent}%` : SOURCE_PENDING_LABEL,
                                        label: 'Capacity',
                                        value: `${resolvedHospitalCapacity.total} Beds`,
                                        direction: (resolvedHospitalCapacity.occupied / Math.max(resolvedHospitalCapacity.total || 0, 1)) < 0.8 ? 'up' : 'down',
                                        color: 'hsl(var(--primary))'
                                    }}
                                    color="hsl(var(--primary))"
                                    expandedContent={
                                        <div className="space-y-4 py-3">
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="p-3 bg-muted/30 rounded-inner">
                                                    <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-1 font-semibold">Total Capacity</p>
                                                    <p className="text-lg font-semibold tracking-tighter">{resolvedHospitalCapacity.total} Beds</p>
                                                </div>
                                                <div className="p-3 bg-muted/30 rounded-inner">
                                                    <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-1 font-semibold">ICU Reserved</p>
                                                    <p className="text-lg font-semibold tracking-tighter text-sky-500">{resolvedHospitalCapacity.icu}</p>
                                                </div>
                                            </div>
                                            <div className="space-y-2 px-1">
                                                <div className="flex justify-between items-baseline">
                                                    <span className="text-[10px] uppercase tracking-[0.14em] font-semibold opacity-40">Bed Occupancy</span>
                                                    <span className="text-xs font-semibold">{resolvedHospitalCapacity.total > 0 ? `${hospitalCapacityPercent}%` : SOURCE_PENDING_LABEL}</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-muted/30 rounded-pill overflow-hidden shadow-inner">
                                                    <motion.div
                                                        className="h-full bg-sky-500/60"
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${hospitalCapacityPercent}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    }
                                />
                                <MobileMetricRow
                                    icon={Ambulance}
                                    label="Fleet Readiness"
                                    value={resolvedStats.totalAmbulances}
                                    rightBlade={{
                                        badge: SOURCE_PENDING_LABEL,
                                        label: 'Readiness Source',
                                        value: SOURCE_PENDING_LABEL,
                                        direction: 'flat',
                                        color: 'hsl(var(--success))'
                                    }}
                                    color="hsl(var(--success))"
                                    expandedContent={
                                        <div className="space-y-4 py-3">
                                            <div className="p-3 bg-muted/30 rounded-inner flex justify-between items-center">
                                                <div>
                                                    <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-1 font-semibold">Readiness Source</p>
                                                    <p className="text-lg font-semibold tracking-tighter">{SOURCE_PENDING_LABEL}</p>
                                                </div>
                                                <span className="inline-flex items-center rounded-pill bg-muted/40 px-2.5 py-0.5 text-[10px] font-semibold text-muted-foreground">Pending</span>
                                            </div>
                                            <div className="space-y-2 px-1">
                                                <div className="flex justify-between items-baseline opacity-40">
                                                    <span className="text-[10px] uppercase tracking-[0.14em] font-semibold">Deployment Ratio</span>
                                                    <span className="text-xs font-semibold">{SOURCE_PENDING_LABEL}</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-muted/30 rounded-pill overflow-hidden">
                                                    <motion.div
                                                        className="h-full bg-emerald-500/60"
                                                        initial={{ width: 0 }}
                                                        animate={{ width: 0 }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    }
                                />
                            </div>
                        </section>
                    )}

                    {/* SYSTEM PERFORMANCE & SEARCH (Reveal Gradually) */}
                    <section className="mt-3">
                        <MobileSectionHeader label="System Health" color="hsl(var(--secondary))" />
                        <div className="space-y-0.5">
                            <MobileMetricRow
                                icon={TrendingUp}
                                label="Search Analytics"
                                value={successValue}
                                rightBlade={{
                                    badge: responseTrend.badge,
                                    label: 'Status',
                                    value: avgTimeValue,
                                    direction: responseTrend.direction,
                                    color: 'hsl(var(--info))'
                                }}
                                color="hsl(var(--info))"
                                description="Pattern efficiency"
                                expandedContent={
                                    <div className="grid grid-cols-2 gap-2 py-3">
                                        {[
                                            { label: 'Total Volume', value: SOURCE_PENDING_LABEL, change: 'Pending', color: 'info' },
                                            { label: 'Precision', value: SOURCE_PENDING_LABEL, change: 'Pending', color: 'success' },
                                            { label: 'Latency', value: SOURCE_PENDING_LABEL, change: 'Pending', color: 'primary' },
                                            { label: 'Void Ratio', value: SOURCE_PENDING_LABEL, change: 'Pending', color: 'warning' }
                                        ].map((m, i) => (
                                            <div key={i} className="p-3 bg-muted/30 rounded-inner flex flex-col justify-between min-h-[70px]">
                                                <div className="flex justify-between items-start">
                                                    <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">{m.label}</span>
                                                    <span className="text-[10px] font-black text-muted-foreground">{m.change}</span>
                                                </div>
                                                <span className="text-lg font-semibold tracking-tighter">{m.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                }
                            />
                            <MobileMetricRow
                                icon={Activity}
                                label="Performance Vitals"
                                value={SOURCE_PENDING_LABEL}
                                rightBlade={{
                                    badge: responseTrend.badge,
                                    label: 'Status',
                                    value: responseTrend.badge === SOURCE_PENDING_LABEL ? SOURCE_PENDING_LABEL : responseTrend.direction === 'up' ? 'Improving' : responseTrend.direction === 'down' ? 'Watch' : 'Current',
                                    direction: responseTrend.direction,
                                    color: 'hsl(var(--success))'
                                }}
                                color="hsl(var(--success))"
                                description="Infrastructure health"
                                expandedContent={
                                    <div className="space-y-4 py-4">
                                        {[
                                            { label: 'API Response', value: SOURCE_PENDING_LABEL, progress: 0, status: 'pending' },
                                            { label: 'DB Query Time', value: SOURCE_PENDING_LABEL, progress: 0, status: 'pending' },
                                            { label: 'Uptime', value: SOURCE_PENDING_LABEL, progress: 0, status: 'pending' },
                                            { label: 'Error Rate', value: SOURCE_PENDING_LABEL, progress: 0, status: 'pending' }
                                        ].map((p, i) => (
                                            <div key={i} className="space-y-2">
                                                <div className="flex justify-between items-center text-[10px] uppercase tracking-[0.14em] font-black opacity-60">
                                                    <span>{p.label}</span>
                                                    <span className="text-foreground">{p.value}</span>
                                                </div>
                                                <div className="h-1 w-full bg-muted/30 rounded-pill overflow-hidden">
                                                    <motion.div
                                                        className={`h-full ${p.status === 'excellent' ? 'bg-emerald-500/60' : p.status === 'pending' ? 'bg-muted/40' : 'bg-sky-500/60'}`}
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${p.progress}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                }
                            />
                        </div>
                    </section>

                    {/* FISCAL PERFORMANCE (Admin/Sponsor until org finance scope is proved) */}
                    {canReadFinanceAnalytics && (
                        <section className="mt-3">
                            <MobileSectionHeader label="Fiscal Trajectory" color="hsl(var(--warning))" />
                            <div className="px-6 py-8 bg-card/68 backdrop-blur-2xl rounded-card relative overflow-hidden shadow-[0_24px_70px_rgb(0_0_0/0.16)]">
                                <div className="absolute top-0 right-0 p-4 opacity-5">
                                    <Wallet size={60} className="text-emerald-500" />
                                </div>

                                <div className="flex justify-between items-center mb-8">
                                    <div>
                                        <p className="text-[10px] uppercase tracking-[0.14em] text-emerald-500 font-black mb-1">Revenue Stream</p>
                                        <h4 className="text-3xl font-black tracking-tighter">{hasFinanceData ? `$${resolvedFinanceSummary.total.toFixed(0)}` : financeScopeLabel}</h4>
                                    </div>
                                    <div className="relative w-14 h-14 flex items-center justify-center">
                                        <svg className="w-full h-full transform -rotate-90">
                                            <circle cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-white/5" />
                                            <circle
                                                cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="4" fill="transparent"
                                                strokeDasharray={151}
                                                strokeDashoffset={151 - (151 * resolvedFinanceSummary.health / 100)}
                                                className="text-emerald-500 transition-all duration-1000"
                                            />
                                        </svg>
                                        <span className="absolute text-[10px] font-black">{Math.round(resolvedFinanceSummary.health)}%</span>
                                    </div>
                                </div>

                                <div className="space-y-5">
                                    {financeMetricRows.map((m, i) => (
                                        <div key={i} className="space-y-2">
                                            <div className="flex justify-between text-[10px] uppercase tracking-[0.14em] font-semibold opacity-40">
                                                <span>{m.label}</span>
                                                <span className="text-foreground/80">{m.value}</span>
                                            </div>
                                            <div className="h-1 w-full bg-muted/30 rounded-pill overflow-hidden">
                                                <motion.div
                                                    className="h-full opacity-60"
                                                    style={{ backgroundColor: m.color }}
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${m.progress}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-8 grid grid-cols-2 gap-3">
                                    <div className="p-3 bg-white/5 rounded-inner text-center">
                                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.14em] mb-1">Conversion</p>
                                        <p className="text-sm font-black text-foreground">{paidConversionLabel}</p>
                                    </div>
                                    <div className="p-3 bg-white/5 rounded-inner text-center">
                                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.14em] mb-1">Avg Ticket</p>
                                        <p className="text-sm font-black text-foreground">{avgTicketLabel}</p>
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
                                className="mb-3 rounded-inner bg-muted/40 px-4 py-3 text-xs font-medium text-muted-foreground"
                            >
                                {exportNotice}
                            </p>
                        )}
                        <motion.button
                            whileTap={{ scale: 0.96 }}
                            onClick={handleExport}
                            aria-describedby={exportNotice ? 'mobile-analytics-export-feedback' : undefined}
                            className="w-full bg-card/68 backdrop-blur-2xl py-4 rounded-button flex items-center justify-center gap-3 shadow-[0_24px_70px_rgb(0_0_0/0.16)] group relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-sky-500/5 opacity-0 group-active:opacity-100 transition-opacity" />
                            <Download size={20} className="text-sky-500" />
                            <span className="text-[11px] font-medium tracking-[0.14em] uppercase text-sky-500/80">Report unavailable</span>
                        </motion.button>
                        <p
                            id="mobile-analytics-export-feedback"
                            className="text-center text-[10px] text-muted-foreground/20 mt-6 uppercase tracking-[0.14em] font-black"
                        >
                            Report scope pending - {new Date().toLocaleDateString()}
                        </p>
                    </section>
            </MobilePageShell>
        </PullToRefresh>
    );
};
