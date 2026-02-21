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
import { Badge } from '../ui/badge';
import { MobileKPIStrip } from './MobileKPIStrip';
import { MobileSectionHeader, MobileMetricRow } from './MobileMetricList';
import { MobileFeaturedMetric } from './MobileFeaturedMetric';
import { PullToRefresh } from './PullToRefresh';

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
    handleExport,
    roleContext
}) => {
    const { isAdmin, isOrgAdmin, isSponsor, isProvider } = roleContext;

    // Standardized chart data for sparklines
    const defaultChartData = useMemo(() => [
        { value: 40 }, { value: 65 }, { value: 45 }, { value: 90 }, { value: 75 }, { value: 95 }
    ], []);

    const sparklineData = useMemo(() => {
        if (!responseTimeData || !responseTimeData.length) return defaultChartData;
        return responseTimeData.map(d => ({ value: d.avgTime }));
    }, [responseTimeData, defaultChartData]);

    const getKPIData = () => {
        if (isAdmin || isOrgAdmin || isSponsor) {
            return [
                { label: 'Success', value: `${stats.successRate}%`, color: 'hsl(var(--success))' },
                { label: 'Avg Time', value: `${stats.avgResponseTime.toFixed(1)}m`, color: 'hsl(var(--info))' },
                { label: 'Total', value: stats.totalEmergencies, color: 'hsl(var(--destructive))' }
            ];
        }
        return [
            { label: 'My Success', value: `${stats.successRate}%`, color: 'hsl(var(--success))' },
            { label: 'Responses', value: stats.totalEmergencies, color: 'hsl(var(--primary))' }
        ];
    };

    return (
        <PullToRefresh onRefresh={onRefresh}>
            <div className="flex flex-col min-h-screen no-scrollbar">
                {/* KPI Strip - Sticky */}
                <MobileKPIStrip kpis={getKPIData()} />

                <div className="px-2 pt-6 text-foreground">
                    {/* HERO FEATURED METRICS */}
                    <MobileFeaturedMetric
                        label={isProvider ? "Personal Performance" : "Impact Velocity"}
                        value={isProvider ? `${stats.successRate}%` : `${stats.avgResponseTime.toFixed(1)}m`}
                        trend={stats.avgResponseTime < 10 ? 'Nominal' : 'Stable'}
                        icon={isProvider ? Activity : Clock}
                        color={isProvider ? "hsl(var(--success))" : "hsl(var(--info))"}
                        chartData={sparklineData}
                    />

                    {/* IMPACT SUMMARY */}
                    <section>
                        <MobileSectionHeader label="System Impact" color="hsl(var(--primary))" />
                        <div className="space-y-0.5">
                            <MobileMetricRow
                                icon={AlertTriangle}
                                label={isProvider ? "Your Cases" : "Total Emergencies"}
                                value={stats.totalEmergencies}
                                color="hsl(var(--destructive))"
                                description="Life-threatening requests"
                                expandedContent={
                                    <div className="space-y-4 py-3">
                                        <div className="flex flex-col gap-1 px-1">
                                            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Case Type Distribution</span>
                                            <p className="text-xs text-foreground/60 italic pb-2">Dominant: <span className="text-destructive font-semibold">{dominantType?.name || 'Cardiac'}</span></p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            {emergencyTypes.map((type, i) => (
                                                <div key={i} className="flex flex-col gap-1 p-3 bg-primary/[0.04] rounded-2xl border border-white/[0.02]">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[8px] uppercase tracking-widest text-muted-foreground font-medium">{type.name}</span>
                                                        {type.isDominant && <div className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />}
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
                                value={`${stats.successRate}%`}
                                color="hsl(var(--success))"
                                description="Fulfillment rate"
                                expandedContent={
                                    <div className="space-y-3 py-3">
                                        {requestsByStatus.map((status, i) => (
                                            <div key={i} className="space-y-1.5">
                                                <div className="flex justify-between items-center text-[10px] uppercase tracking-widest font-medium">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: status.color }} />
                                                        <span className="text-foreground/60">{status.name}</span>
                                                    </div>
                                                    <span className="text-foreground/80 font-semibold">{status.value} units</span>
                                                </div>
                                                <div className="h-1 w-full bg-white/[0.04] rounded-full overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${(status.value / stats.totalEmergencies) * 100}%` }}
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
                        <section className="mt-4">
                            <MobileSectionHeader label="Demand Velocity" color="hsl(var(--destructive))" />
                            <div className="px-6 py-8 apple-glass-heavy bg-muted/30 rounded-3xl relative overflow-hidden shadow-xl border-0">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <Activity size={40} className="text-destructive" />
                                </div>
                                <div className="flex justify-between items-center mb-6">
                                    <div className="space-y-1">
                                        <p className="text-[10px] uppercase tracking-[0.2em] text-destructive font-medium">Load Distribution</p>
                                        <h4 className="text-xl font-medium tracking-tight">Peak Heatmap</h4>
                                    </div>
                                    <div className="px-3 py-1 bg-destructive/10 rounded-full">
                                        <span className="text-[10px] font-medium text-destructive uppercase tracking-widest">Live</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-6 gap-1.5">
                                    {demandHeatmap.map((item, idx) => (
                                        <div key={idx} className="aspect-square relative group">
                                            <div
                                                className={`w-full h-full rounded-md transition-all duration-300 ${item.value > 80 ? 'bg-destructive/60 shadow-[0_0_8px_rgba(var(--destructive),0.4)]' :
                                                    item.value > 50 ? 'bg-warning/40' :
                                                        item.value > 30 ? 'bg-info/20' :
                                                            'bg-white/5'
                                                    }`}
                                            />
                                            {/* Minimal hour indicator for key times */}
                                            {(idx % 6 === 0) && (
                                                <span className="absolute -bottom-4 left-0 text-[7px] text-muted-foreground/30 font-semibold uppercase tracking-tighter">
                                                    {item.hour}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-8 flex justify-between items-center opacity-40">
                                    <div className="flex gap-4">
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-destructive/60" />
                                            <span className="text-[8px] font-medium uppercase tracking-widest">Critical</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
                                            <span className="text-[8px] font-medium uppercase tracking-widest">Idle</span>
                                        </div>
                                    </div>
                                    <span className="text-[8px] font-medium italic opacity-50 uppercase tracking-widest">v4.0 Dispatch</span>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* INFRASTRUCTURE CAPACITY */}
                    {(isAdmin || isOrgAdmin || isSponsor) && (
                        <section className="mt-4">
                            <MobileSectionHeader label="Strategic Assets" color="hsl(var(--info))" />
                            <div className="space-y-0.5">
                                <MobileMetricRow
                                    icon={Hospital}
                                    label="Medical Facilities"
                                    value={stats.totalHospitals}
                                    color="hsl(var(--primary))"
                                    expandedContent={
                                        <div className="space-y-4 py-3">
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="p-3 bg-primary/[0.04] rounded-2xl">
                                                    <p className="text-[8px] uppercase tracking-widest text-muted-foreground mb-1">Total Capacity</p>
                                                    <p className="text-lg font-semibold tracking-tighter">{hospitalCapacity.total} Beds</p>
                                                </div>
                                                <div className="p-3 bg-primary/[0.04] rounded-2xl">
                                                    <p className="text-[8px] uppercase tracking-widest text-muted-foreground mb-1">ICU Reserved</p>
                                                    <p className="text-lg font-semibold tracking-tighter text-info">{hospitalCapacity.icu}</p>
                                                </div>
                                            </div>
                                            <div className="space-y-2 px-1">
                                                <div className="flex justify-between items-baseline">
                                                    <span className="text-[10px] uppercase tracking-widest font-medium opacity-40">Bed Occupancy</span>
                                                    <span className="text-xs font-semibold">{Math.round((hospitalCapacity.occupied / hospitalCapacity.total) * 100)}%</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-white/[0.04] rounded-full overflow-hidden shadow-inner">
                                                    <motion.div
                                                        className="h-full bg-primary/60"
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${(hospitalCapacity.occupied / hospitalCapacity.total) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    }
                                />
                                <MobileMetricRow
                                    icon={Ambulance}
                                    label="Fleet Readiness"
                                    value={stats.totalAmbulances}
                                    color="hsl(var(--success))"
                                    expandedContent={
                                        <div className="space-y-4 py-3">
                                            <div className="p-3 bg-success/[0.04] rounded-2xl flex justify-between items-center">
                                                <div>
                                                    <p className="text-[8px] uppercase tracking-widest text-muted-foreground mb-1">Units Ready</p>
                                                    <p className="text-lg font-semibold tracking-tighter">{Math.floor(stats.totalAmbulances * 0.7)} active</p>
                                                </div>
                                                <Badge className="squircle-sm bg-success/20 text-success border-0 text-[10px] font-black tracking-widest">READY</Badge>
                                            </div>
                                            <div className="space-y-2 px-1">
                                                <div className="flex justify-between items-baseline opacity-40">
                                                    <span className="text-[10px] uppercase tracking-widest font-medium">Deployment Ratio</span>
                                                    <span className="text-xs font-semibold">70%</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-white/[0.04] rounded-full overflow-hidden">
                                                    <motion.div
                                                        className="h-full bg-success/60"
                                                        initial={{ width: 0 }}
                                                        animate={{ width: '70%' }}
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
                    <section className="mt-2">
                        <MobileSectionHeader label="System Health" color="hsl(var(--secondary))" />
                        <div className="space-y-0.5">
                            <MobileMetricRow
                                icon={TrendingUp}
                                label="Search Analytics"
                                value="87%"
                                color="hsl(var(--info))"
                                description="Pattern efficiency"
                                expandedContent={
                                    <div className="grid grid-cols-2 gap-2 py-3">
                                        {[
                                            { label: 'Total Volume', value: '1,284', change: '+12%', color: 'info' },
                                            { label: 'Precision', value: '87%', change: '+3%', color: 'success' },
                                            { label: 'Latency', value: '2.3s', change: '-0.5s', color: 'primary' },
                                            { label: 'Void Ratio', value: '8%', change: '-2%', color: 'warning' }
                                        ].map((m, i) => (
                                            <div key={i} className="p-3 bg-primary/[0.03] rounded-2xl flex flex-col justify-between min-h-[70px]">
                                                <div className="flex justify-between items-start">
                                                    <span className="text-[8px] uppercase tracking-widest text-muted-foreground font-semibold">{m.label}</span>
                                                    <span className={`text-[7px] font-black ${m.change.includes('+') ? 'text-success' : 'text-info'}`}>{m.change}</span>
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
                                value="Nominal"
                                color="hsl(var(--success))"
                                description="Infrastructure health"
                                expandedContent={
                                    <div className="space-y-4 py-4">
                                        {[
                                            { label: 'API Response', value: '142ms', progress: 90, status: 'excellent' },
                                            { label: 'DB Query Time', value: '28ms', progress: 95, status: 'excellent' },
                                            { label: 'Uptime', value: '99.97%', progress: 99, status: 'excellent' },
                                            { label: 'Error Rate', value: '0.12%', progress: 15, status: 'stable' }
                                        ].map((p, i) => (
                                            <div key={i} className="space-y-2">
                                                <div className="flex justify-between items-center text-[10px] uppercase tracking-widest font-black opacity-60">
                                                    <span>{p.label}</span>
                                                    <span className="text-foreground">{p.value}</span>
                                                </div>
                                                <div className="h-1 w-full bg-white/[0.04] rounded-full overflow-hidden">
                                                    <motion.div
                                                        className={`h-full ${p.status === 'excellent' ? 'bg-success/60' : 'bg-primary/60'}`}
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

                    {/* FISCAL PERFORMANCE (Admin/Org Admin/Sponsor) */}
                    {(isAdmin || isOrgAdmin || isSponsor) && (
                        <section className="mt-4">
                            <MobileSectionHeader label="Fiscal Trajectory" color="hsl(var(--warning))" />
                            <div className="px-6 py-8 apple-glass-heavy bg-muted/30 rounded-3xl relative overflow-hidden shadow-xl border-0">
                                <div className="absolute top-0 right-0 p-4 opacity-5">
                                    <Wallet size={60} className="text-success" />
                                </div>

                                <div className="flex justify-between items-center mb-8">
                                    <div>
                                        <p className="text-[10px] uppercase tracking-[0.2em] text-success font-black mb-1">Revenue Stream</p>
                                        <h4 className="text-3xl font-black tracking-tighter">${financeSummary.total.toFixed(0)}</h4>
                                    </div>
                                    <div className="relative w-14 h-14 flex items-center justify-center">
                                        <svg className="w-full h-full transform -rotate-90">
                                            <circle cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-white/5" />
                                            <circle
                                                cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="4" fill="transparent"
                                                strokeDasharray={151}
                                                strokeDashoffset={151 - (151 * financeSummary.health / 100)}
                                                className="text-success transition-all duration-1000"
                                            />
                                        </svg>
                                        <span className="absolute text-[10px] font-black">{Math.round(financeSummary.health)}%</span>
                                    </div>
                                </div>

                                <div className="space-y-5">
                                    {[
                                        { label: 'Daily Yield', value: `$${financeSummary.today.toFixed(0)}`, progress: 75, color: 'hsl(var(--success))' },
                                        { label: 'Weekly Average', value: `$${(financeSummary.weeklyAvg * 7).toFixed(0)}`, progress: 60, color: 'hsl(var(--primary))' }
                                    ].map((m, i) => (
                                        <div key={i} className="space-y-2">
                                            <div className="flex justify-between text-[10px] uppercase tracking-widest font-semibold opacity-40">
                                                <span>{m.label}</span>
                                                <span className="text-foreground/80">{m.value}</span>
                                            </div>
                                            <div className="h-1 w-full bg-white/[0.06] rounded-full overflow-hidden">
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
                                    <div className="p-3 bg-white/5 rounded-2xl text-center">
                                        <p className="text-[8px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">Conversion</p>
                                        <p className="text-sm font-black text-foreground">{(subscriptionStats.paid / (subscriptionStats.active || 1) * 100).toFixed(1)}%</p>
                                    </div>
                                    <div className="p-3 bg-white/5 rounded-2xl text-center">
                                        <p className="text-[8px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">Avg Ticket</p>
                                        <p className="text-sm font-black text-foreground">${(financeSummary.total / (stats.totalEmergencies || 1)).toFixed(0)}</p>
                                    </div>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* EXPORT ACTION PILL */}
                    <section className="mt-8 mb-16 p-4">
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={handleExport}
                            className="w-full apple-glass-heavy py-4 rounded-xl flex items-center justify-center gap-3 shadow-xl group relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-primary/5 opacity-0 group-active:opacity-100 transition-opacity" />
                            <Download size={20} className="text-primary" />
                            <span className="text-[11px] font-normal tracking-[0.3em] uppercase text-primary/80">Generate Analytics Report</span>
                        </motion.button>
                        <p className="text-center text-[9px] text-muted-foreground/20 mt-6 uppercase tracking-[0.4em] font-black">
                            Sovereign Data • Refined {new Date().toLocaleDateString()}
                        </p>
                    </section>
                </div>
            </div>
        </PullToRefresh>
    );
};
