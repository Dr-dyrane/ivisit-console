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
    Search,
    TrendingUp,
    Mail,
    Zap
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
 * Canon #3: Reveal Gradually (Interactivity)
 * Canon #10: Dashboard = Control
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
                { label: 'Latency', value: '14ms', color: 'hsl(var(--info))' },
                { label: 'Health', value: '99%', color: 'hsl(var(--success))' }
            ];
        }
        if (isPatient) {
            return [
                { label: 'Requests', value: appStats.todayRequests || 0, color: 'hsl(var(--primary))' },
                { label: 'Verified', value: 'Yes', color: 'hsl(var(--success))' },
                { label: 'Visits', value: appStats.totalVisits || 0, color: 'hsl(var(--info))' }
            ];
        }
        return [
            { label: 'Impact', value: `${appStats.completionRate}%`, color: 'hsl(var(--success))' },
            { label: 'Growth', value: '+12%', color: 'hsl(var(--primary))' },
            { label: 'Balance', value: `$${walletStats.balance.toFixed(0)}`, color: 'hsl(var(--info))' }
        ];
    };

    return (
        <PullToRefresh onRefresh={onRefresh}>
            <div className="flex flex-col min-h-screen no-scrollbar">
                {/* KPI Strip - Sticky */}
                <MobileKPIStrip kpis={getKPIData()} />

                {/* Content Scroller */}
                <div className="px-2 pt-6 text-foreground">

                    {/* HERO FEATURED METRICS */}
                    {(isAdmin || isOrgAdmin || isSponsor) && (
                        <MobileFeaturedMetric
                            label="Aggregated Success"
                            value={`${appStats.completionRate}%`}
                            trend="+2.1%"
                            icon={CheckCircle2}
                            color="hsl(var(--success))"
                            chartData={chartData.length ? chartData : defaultChartData}
                        />
                    )}

                    {isPatient && (
                        <MobileFeaturedMetric
                            label="My Requests"
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
                            <MobileSectionHeader label="System Priority" color="hsl(var(--destructive))" />
                            <div className="space-y-0.5">
                                <MobileMetricRow
                                    icon={AlertTriangle}
                                    label="Live Emergencies"
                                    value={appStats.liveEmergencies}
                                    trend="+2m"
                                    color="hsl(var(--destructive))"
                                    description="Urgent dispatch required"
                                    expandedContent={
                                        <div className="space-y-2 py-2">
                                            <p>Critical response needed in <span className="text-destructive font-semibold">Abuja North</span>.</p>
                                            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                                <div className="h-full bg-destructive w-4/5" />
                                            </div>
                                        </div>
                                    }
                                />
                                {(isAdmin || isOrgAdmin) && (
                                    <MobileMetricRow
                                        icon={Search}
                                        label="Trending Topics"
                                        value="Viral"
                                        color="hsl(var(--warning))"
                                        description="Search patterns and health social"
                                        expandedContent="Viral activity detected in Lagos Mainland area regarding malaria outreach."
                                    />
                                )}
                            </div>
                        </section>
                    )}

                    {/* FINANCIALS (Full-Width List) */}
                    {(isAdmin || isOrgAdmin || isSponsor) && (
                        <section className="mt-2">
                            <MobileSectionHeader label="Fiscal Assets" color="hsl(var(--success))" />
                            <div className="space-y-0.5">
                                <MobileMetricRow
                                    icon={Wallet}
                                    label="Platform Wallet"
                                    value={`$${walletStats.balance.toFixed(0)}`}
                                    color="hsl(var(--success))"
                                    description="Primary Balance"
                                    expandedContent={
                                        <div className="py-2">
                                            <span>Income Today: <span className="text-success font-semibold">${walletStats.todayIncome || 0}</span></span>
                                        </div>
                                    }
                                />
                                {isAdmin && (
                                    <MobileMetricRow
                                        icon={Mail}
                                        label="Active Subscriptions"
                                        value={subscriptionStats.active}
                                        color="hsl(var(--info))"
                                        description="Managed engagement"
                                        expandedContent={
                                            <div className="py-1">
                                                <span>{subscriptionStats.paid} Paid Members active in system.</span>
                                            </div>
                                        }
                                    />
                                )}
                            </div>
                        </section>
                    )}

                    {/* INFRASTRUCTURE (Full-Width List) */}
                    {(isAdmin || isOrgAdmin) && (
                        <section className="mt-2">
                            <MobileSectionHeader label="Fleet & Facilities" color="hsl(var(--info))" />
                            <div className="space-y-0.5">
                                <MobileMetricRow icon={Hospital} label="Facilities" value={appStats.activeHospitals || 8} color="hsl(var(--primary))" expandedContent="6 Public, 2 Private active centers." />
                                <MobileMetricRow icon={Ambulance} label="Fleet Status" value={appStats.availableAmbulances} color="hsl(var(--success))" expandedContent="85% Battery • GPS Nominal." />
                                <MobileMetricRow icon={Stethoscope} label="Medical Staff" value={appStats.activeProviders} color="hsl(var(--secondary))" expandedContent="Licensed medical staff currently active." />
                                <MobileMetricRow icon={Users} label="Community" value={appStats.totalUsers} color="hsl(var(--info))" expandedContent="Growth: +12.4% MoM." />
                            </div>
                        </section>
                    )}

                    {/* PATIENT CARE */}
                    {isPatient && (
                        <section className="mt-2">
                            <MobileSectionHeader label="Medical Services" color="hsl(var(--primary))" />
                            <div className="space-y-0.5">
                                <MobileMetricRow icon={Calendar} label="Book a Visit" value="New" color="hsl(var(--primary))" onClick={() => { }} />
                                <MobileMetricRow icon={Stethoscope} label="Medical History" value="View" color="hsl(var(--info))" onClick={() => { }} />
                                <MobileMetricRow icon={Zap} label="Emergency SOS" value="Alert" color="hsl(var(--destructive))" onClick={() => { }} />
                            </div>
                        </section>
                    )}

                    {/* NAVIGATION */}
                    <section className="mt-4">
                        <MobileSectionHeader label="Navigation" />
                        <MobileQuickNavPill items={[
                            { icon: MapIcon, label: 'Live Map', color: 'hsl(var(--primary))', path: '/map' },
                            { icon: BarChart3, label: 'Analytics', color: 'hsl(var(--info))', path: '/analytics' },
                            { icon: Newspaper, label: 'News feed', color: 'hsl(var(--success))', path: '/health-news' },
                            { icon: Stethoscope, label: 'Medical Staff', color: 'hsl(var(--secondary))', path: '/doctors' }
                        ]} />
                    </section>

                    {/* RECENT FEED */}
                    <section className="mt-4 mb-4">
                        <MobileSectionHeader label="Event Log" />
                        <div className="space-y-1">
                            {recentActivities.slice(0, 5).map((activity, idx) => (
                                <MobileActivityRow
                                    key={idx}
                                    icon={activity.icon}
                                    msg={activity.msg}
                                    time={activity.time}
                                    color={activity.color}
                                    user={activity.user}
                                />
                            ))}
                        </div>
                    </section>

                    {/* SYSTEM STATUS (Detailed) */}
                    {(isAdmin || isOrgAdmin) && (
                        <section className="mt-2 mb-8">
                            <MobileSectionHeader label="Architecture Health" color="hsl(var(--info))" />
                            <div className="px-6 py-8 bg-muted/40 apple-glass-heavy border-0 rounded-3xl space-y-6 shadow-xl relative overflow-hidden">
                                {/* 2px Left Primary Accent */}
                                <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-primary/40 pointer-events-none" />

                                {[
                                    { label: 'Dispatcher Load', value: '72%', progress: 72, color: 'hsl(var(--primary))' },
                                    { label: 'API Latency', value: 'Refined', progress: 94, color: 'hsl(var(--success))' },
                                    { label: 'Fleet Active', value: 'Auto-Sync', progress: 85, color: 'hsl(var(--info))' },
                                    { label: 'Cloud Buffer', value: 'Steady', progress: 65, color: 'hsl(var(--warning))' }
                                ].map((sys, i) => (
                                    <div key={i} className="space-y-3">
                                        <div className="flex justify-between text-[10px] font-normal tracking-widest uppercase text-foreground/40">
                                            <span>{sys.label}</span>
                                            <span className="text-foreground/50 font-medium">{sys.value}</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-white/[0.08] rounded-full overflow-hidden shadow-inner">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${sys.progress}%` }}
                                                className="h-full"
                                                style={{ backgroundColor: sys.color, opacity: 0.6 }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </PullToRefresh>
    );
};
