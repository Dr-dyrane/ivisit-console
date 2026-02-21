import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    AlertTriangle,
    Activity,
    Hospital,
    Ambulance,
    Users,
    Wallet,
    Map as MapIcon,
    BarChart3,
    Newspaper,
    Stethoscope,
    AlertCircle,
    CheckCircle2,
    Calendar,
    ChevronRight,
    Search
} from 'lucide-react';
import { MobileKPIStrip } from './MobileKPIStrip';
import { MobileSectionHeader, MobileMetricRow } from './MobileMetricList';
import { MobileQuickNavPill } from './MobileQuickNavPill';
import { MobileActivityRow } from './MobileActivityRow';
import { PullToRefresh } from './PullToRefresh';
import { MobileFeaturedMetric } from './MobileFeaturedMetric';

/**
 * MobileDashboard
 * Premium reinvented mobile experience for admins/providers/patients
 */
export const MobileDashboard = ({
    appStats,
    walletStats,
    subscriptionStats,
    recentActivities,
    onRefresh,
    roleContext,
    chartData = [] // Fallback for sparklines
}) => {
    const { isAdmin, isProvider, isPatient, isOrgAdmin, isSponsor } = roleContext;

    // Standardized chart data for sparklines if none provided
    const defaultChartData = useMemo(() => [
        { value: 40 }, { value: 65 }, { value: 45 }, { value: 90 }, { value: 75 }, { value: 95 }
    ], []);

    // Role-based KPI Strip
    const getKPIData = () => {
        if (isAdmin || isOrgAdmin) {
            return [
                { label: 'Active', value: appStats.liveEmergencies, color: 'hsl(var(--destructive))' },
                { label: 'Resp', value: `${appStats.responseTime}m`, color: 'hsl(var(--info))' },
                { label: 'Success', value: `${appStats.completionRate}%`, color: 'hsl(var(--success))' }
            ];
        }
        if (isPatient) {
            return [
                { label: 'Active', value: appStats.todayRequests || 0, color: 'hsl(var(--primary))' },
                { label: 'Status', value: 'Nominal', color: 'hsl(var(--success))' },
                { label: 'Visits', value: appStats.totalVisits || 0, color: 'hsl(var(--info))' }
            ];
        }
        if (isSponsor) {
            return [
                { label: 'Impact', value: `${appStats.completionRate}%`, color: 'hsl(var(--success))' },
                { label: 'Users', value: appStats.totalUsers, color: 'hsl(var(--primary))' },
                { label: 'Wallet', value: `$${walletStats.balance.toFixed(0)}`, color: 'hsl(var(--info))' }
            ];
        }
        return [
            { label: 'Today', value: appStats.todayRequests, color: 'hsl(var(--primary))' },
            { label: 'Resp', value: `${appStats.responseTime}m`, color: 'hsl(var(--info))' },
            { label: 'Shift', value: 'Active', color: 'hsl(var(--success))' }
        ];
    };

    return (
        <PullToRefresh onRefresh={onRefresh}>
            <div className="flex flex-col min-h-screen bg-background">
                {/* KPI Strip - Sticky */}
                <MobileKPIStrip kpis={getKPIData()} />

                {/* Content Scroller */}
                <div className="px-[2px] pt-6 text-foreground"> {/* Canon #44: Token Purity */}

                    {/* HERO FEATURED METRICS (Role-aware) */}
                    {(isAdmin || isOrgAdmin || isSponsor) && (
                        <MobileFeaturedMetric
                            label="Operational Success"
                            value={`${appStats.completionRate}%`}
                            trend="+2.1%"
                            icon={CheckCircle2}
                            color="hsl(var(--success))"
                            chartData={chartData.length ? chartData : defaultChartData}
                        />
                    )}

                    {isPatient && (
                        <MobileFeaturedMetric
                            label="Active Requests"
                            value={appStats.todayRequests || 0}
                            trend="Live"
                            icon={Activity}
                            color="hsl(var(--primary))"
                            chartData={chartData.length ? chartData : defaultChartData}
                        />
                    )}

                    {/* URGENT SECTION */}
                    {(isAdmin || isOrgAdmin || isProvider) && (
                        <section>
                            <MobileSectionHeader label="Urgent Operations" color="hsl(var(--destructive))" />
                            <div className="rounded-3xl overflow-hidden">
                                <MobileMetricRow
                                    icon={AlertTriangle}
                                    label="Live Emergencies"
                                    value={appStats.liveEmergencies}
                                    trend="+2m"
                                    color="hsl(var(--destructive))"
                                    description="Real-time triage required"
                                    onClick={() => { }}
                                />
                                {(isAdmin || isOrgAdmin) && (
                                    <MobileMetricRow
                                        icon={Activity}
                                        label="Verification Queue"
                                        value={appStats.pendingVerifications}
                                        color="hsl(var(--warning))"
                                        description="Identity checks pending"
                                        onClick={() => { }}
                                    />
                                )}
                            </div>
                        </section>
                    )}

                    {/* PATIENT QUICK ACTIONS */}
                    {isPatient && (
                        <section className="mt-2">
                            <MobileSectionHeader label="Patient Care" color="hsl(var(--primary))" />
                            <div className="rounded-3xl overflow-hidden">
                                <MobileMetricRow icon={Calendar} label="Book a Visit" value="New" color="hsl(var(--primary))" onClick={() => { }} />
                                <MobileMetricRow icon={Stethoscope} label="Medical History" value="View" color="hsl(var(--info))" onClick={() => { }} />
                            </div>
                        </section>
                    )}

                    {/* INFRASTRUCTURE & FLEET */}
                    {(isAdmin || isOrgAdmin) && (
                        <section className="mt-2">
                            <MobileSectionHeader label="Infrastructure" color="hsl(var(--info))" />
                            <div className="rounded-3xl overflow-hidden">
                                <MobileMetricRow icon={Hospital} label="Facilities" value={appStats.activeHospitals || 8} color="hsl(var(--primary))" onClick={() => { }} />
                                <MobileMetricRow icon={Ambulance} label="Fleet Status" value={appStats.availableAmbulances} color="hsl(var(--success))" onClick={() => { }} />
                                <MobileMetricRow icon={Stethoscope} label="Medical Staff" value={appStats.activeProviders} color="hsl(var(--secondary))" onClick={() => { }} />
                                <MobileMetricRow icon={Users} label="Total Users" value={appStats.totalUsers} color="hsl(var(--info))" onClick={() => { }} />
                            </div>
                        </section>
                    )}

                    {/* FINANCE & GROWTH */}
                    {(isAdmin || isOrgAdmin || isSponsor) && (
                        <section className="mt-2">
                            <MobileSectionHeader label="Platform Assets" color="hsl(var(--success))" />
                            <div className="rounded-3xl overflow-hidden">
                                <MobileMetricRow
                                    icon={Wallet}
                                    label="Wallet Balance"
                                    value={`$${walletStats.balance.toFixed(0)}`}
                                    trend={`${walletStats.trend >= 0 ? '+' : ''}${walletStats.trend}%`}
                                    color="hsl(var(--success))"
                                    onClick={() => { }}
                                />
                                <MobileMetricRow
                                    icon={Users}
                                    label="Active Subs"
                                    value={subscriptionStats.active}
                                    description={`${subscriptionStats.paid} Premium Members`}
                                    color="hsl(var(--info))"
                                    onClick={() => { }}
                                />
                            </div>
                        </section>
                    )}

                    {/* QUICK NAV PILLS */}
                    <section className="mt-4">
                        <MobileSectionHeader label="Navigation" />
                        <MobileQuickNavPill items={[
                            { icon: MapIcon, label: 'Live Map', color: 'hsl(var(--primary))', path: '/map' },
                            { icon: BarChart3, label: 'Analytics', color: 'hsl(var(--info))', path: '/analytics' },
                            { icon: Newspaper, label: 'News feed', color: 'hsl(var(--success))', path: '/health-news' }
                        ]} />
                    </section>

                    {/* RECENT FEED */}
                    <section className="mt-4 mb-4">
                        <div className="flex justify-between items-center px-4 mb-2">
                            <MobileSectionHeader label="System Activity" />
                            <button className="text-[10px] font-semibold tracking-[0.2em] text-primary/60 mb-2 active:opacity-100 transition-opacity">VIEW ALL</button>
                        </div>
                        <div className="rounded-3xl overflow-hidden">
                            {recentActivities.slice(0, 4).map((activity, idx) => (
                                <MobileActivityRow
                                    key={idx}
                                    icon={activity.icon}
                                    msg={activity.msg}
                                    time={activity.time}
                                    color={activity.color}
                                />
                            ))}
                        </div>
                    </section>

                    {/* SYSTEM STATUS */}
                    {(isAdmin || isOrgAdmin) && (
                        <section className="mt-2 mb-8">
                            <MobileSectionHeader label="System Health" color="hsl(var(--info))" />
                            <div className="px-6 py-8 apple-glass border-0 rounded-3xl space-y-6 shadow-xl">
                                <div className="space-y-3">
                                    <div className="flex justify-between text-[10px] font-semibold tracking-widest uppercase opacity-30">
                                        <span>Dispatcher Load</span>
                                        <span>72%</span>
                                    </div>
                                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: '72%' }}
                                            className="h-full bg-primary/40"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between text-[10px] font-semibold tracking-widest uppercase opacity-30">
                                        <span>API Latency</span>
                                        <span>Nominal</span>
                                    </div>
                                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: '94%' }}
                                            className="h-full bg-success/40"
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </PullToRefresh>
    );
};
