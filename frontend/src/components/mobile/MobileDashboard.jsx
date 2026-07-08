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
import { MobilePageShell } from './MobilePageShell';
import { calcDeltaPercent, formatSignedPercent, toDeltaBadge } from '../../utils/metricsUtils';

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



    const demandDelta = calcDeltaPercent(appStats.todayRequests || 0, appStats.yesterdayRequests || 0);
    const walletDelta = Number.isFinite(Number(walletStats?.trend)) ? Number(walletStats.trend) : null;
    const walletBalance = Number(walletStats?.balance ?? 0);
    const walletBalanceText = `$${walletBalance.toFixed(0)}`;
    const completionVsTarget = Number.isFinite(Number(appStats.completionRate))
        ? Number(appStats.completionRate) - 90
        : null;
    const fleetLoadDelta = calcDeltaPercent(appStats.availableAmbulances || 0, appStats.liveEmergencies || 1);

    // Standardized chart data for sparklines if none provided
    const defaultChartData = useMemo(() => [
        { value: 40 }, { value: 65 }, { value: 45 }, { value: 90 }, { value: 75 }, { value: 95 }
    ], []);

    // Role-based KPI Strip
    const getKPIData = () => {
        const responseDelta = Number.isFinite(Number(appStats.responseTime))
            ? (5 - Number(appStats.responseTime)) * 8
            : null;

        if (isAdmin || isOrgAdmin) {
            return [
                { label: 'Active', value: appStats.liveEmergencies, color: 'hsl(var(--destructive))', delta: formatSignedPercent(demandDelta) || 'LIVE', direction: Number(demandDelta) > 0 ? 'up' : Number(demandDelta) < 0 ? 'down' : 'flat' },
                { label: 'Response', value: `${appStats.responseTime || 0}m`, color: 'hsl(var(--info))', delta: formatSignedPercent(responseDelta) || 'LIVE', direction: Number(responseDelta) > 0 ? 'up' : Number(responseDelta) < 0 ? 'down' : 'flat' },
                { label: 'Success', value: `${appStats.completionRate || 0}%`, color: 'hsl(var(--success))', delta: formatSignedPercent(completionVsTarget) || 'LIVE', direction: Number(completionVsTarget) >= 0 ? 'up' : 'down' },
                { label: 'Fleet', value: appStats.availableAmbulances || 0, color: 'hsl(var(--primary))', delta: formatSignedPercent(fleetLoadDelta) || 'LIVE', direction: Number(fleetLoadDelta) > 0 ? 'up' : Number(fleetLoadDelta) < 0 ? 'down' : 'flat' },
                { label: 'Users', value: appStats.totalUsers || 0, color: 'hsl(var(--secondary))', delta: 'LIVE', direction: 'flat' },
                { label: 'Facilities', value: appStats.activeHospitals || 0, color: 'hsl(var(--info))', delta: 'LIVE', direction: 'flat' }
            ];
        }
        if (isPatient) {
            return [
                { label: 'Requests', value: appStats.todayRequests || 0, color: 'hsl(var(--primary))', delta: formatSignedPercent(demandDelta) || 'LIVE', direction: Number(demandDelta) > 0 ? 'up' : Number(demandDelta) < 0 ? 'down' : 'flat' },
                { label: 'Success', value: `${appStats.completionRate || 0}%`, color: 'hsl(var(--success))', delta: formatSignedPercent(completionVsTarget) || 'LIVE', direction: Number(completionVsTarget) >= 0 ? 'up' : 'down' },
                { label: 'Visits', value: appStats.totalVisits || 0, color: 'hsl(var(--info))', delta: 'LIVE', direction: 'flat' },
                { label: 'Balance', value: walletBalanceText, color: 'hsl(var(--success))', delta: formatSignedPercent(walletDelta) || 'LIVE', direction: Number(walletDelta) > 0 ? 'up' : Number(walletDelta) < 0 ? 'down' : 'flat' }
            ];
        }
        return [
            { label: 'Impact', value: `${appStats.completionRate}%`, color: 'hsl(var(--success))', delta: formatSignedPercent(completionVsTarget) || 'LIVE', direction: Number(completionVsTarget) >= 0 ? 'up' : 'down' },
            { label: 'Requests', value: appStats.todayRequests || 0, color: 'hsl(var(--primary))', delta: formatSignedPercent(demandDelta) || 'LIVE', direction: Number(demandDelta) > 0 ? 'up' : Number(demandDelta) < 0 ? 'down' : 'flat' },
            { label: 'Balance', value: walletBalanceText, color: 'hsl(var(--info))', delta: formatSignedPercent(walletDelta) || 'LIVE', direction: Number(walletDelta) > 0 ? 'up' : Number(walletDelta) < 0 ? 'down' : 'flat' }
        ];
    };

    return (
        <PullToRefresh onRefresh={onRefresh}>
            <MobilePageShell
                kpiStrip={<MobileKPIStrip kpis={getKPIData()} />}
                contentClassName="pt-4 pb-4 text-foreground"
            >

                {/* HERO FEATURED METRICS — Billboard Rail */}
                {(isAdmin || isOrgAdmin || isSponsor) && (
                    <MobileFeaturedMetric
                        items={[
                            {
                                label: 'Aggregated Success',
                                value: `${appStats.completionRate}%`,
                                trend: formatSignedPercent(completionVsTarget) || 'LIVE',
                                icon: CheckCircle2,
                                color: 'hsl(var(--success))',
                                chartData: chartData.length ? chartData : defaultChartData
                            },
                            {
                                label: 'Platform Wallet',
                                value: walletBalanceText,
                                trend: formatSignedPercent(walletDelta) || 'LIVE',
                                icon: Wallet,
                                color: 'hsl(var(--info))',
                                chartData: defaultChartData
                            },
                            {
                                label: 'Live Demand',
                                value: appStats.todayRequests || 0,
                                trend: formatSignedPercent(demandDelta) || 'LIVE',
                                icon: TrendingUp,
                                color: 'hsl(var(--primary))',
                                chartData: defaultChartData
                            },
                            {
                                label: 'Fleet Coverage',
                                value: appStats.availableAmbulances || 0,
                                trend: formatSignedPercent(fleetLoadDelta) || 'LIVE',
                                icon: Ambulance,
                                color: 'hsl(var(--secondary))',
                                chartData: defaultChartData
                            }
                        ]}
                    />
                )}

                {isPatient && (
                    <MobileFeaturedMetric
                        items={[
                            {
                                label: 'My Requests',
                                value: appStats.todayRequests || 0,
                                trend: formatSignedPercent(demandDelta) || 'Live',
                                icon: Activity,
                                color: 'hsl(var(--primary))',
                                chartData: chartData.length ? chartData : defaultChartData
                            },
                            {
                                label: 'Completion Rate',
                                value: `${appStats.completionRate || 0}%`,
                                trend: formatSignedPercent(completionVsTarget) || 'LIVE',
                                icon: CheckCircle2,
                                color: 'hsl(var(--success))',
                                chartData: defaultChartData
                            },
                            {
                                label: 'Visits',
                                value: appStats.totalVisits || 0,
                                trend: 'LIVE',
                                icon: Calendar,
                                color: 'hsl(var(--info))',
                                chartData: defaultChartData
                            },
                            {
                                label: 'Balance',
                                value: walletBalanceText,
                                trend: formatSignedPercent(walletDelta) || 'LIVE',
                                icon: Wallet,
                                color: 'hsl(var(--warning))',
                                chartData: defaultChartData
                            }
                        ]}
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
                                rightBlade={{
                                    badge: formatSignedPercent(demandDelta) || 'LIVE',
                                    direction: Number(demandDelta) > 0 ? 'up' : Number(demandDelta) < 0 ? 'down' : 'flat',
                                    label: 'Demand',
                                    value: `${appStats.todayRequests || 0} today`,
                                    color: 'hsl(var(--destructive))',
                                }}
                                color="hsl(var(--destructive))"
                                description="Urgent dispatch required"
                                expandedContent={
                                    <div className="space-y-2 py-2">
                                        <p>Critical response needed in <span className="text-destructive font-semibold">Abuja North</span>.</p>
                                        <div className="h-1 w-full bg-white/5 rounded-pill overflow-hidden">
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
                                    rightBlade={{
                                        badge: formatSignedPercent(demandDelta) || 'LIVE',
                                        direction: Number(demandDelta) > 0 ? 'up' : Number(demandDelta) < 0 ? 'down' : 'flat',
                                        label: 'Signal',
                                        value: demandDelta === null ? 'Live feed' : (Number(demandDelta) >= 0 ? 'Rising' : 'Cooling'),
                                        color: 'hsl(var(--warning))'
                                    }}
                                    color="hsl(var(--warning))"
                                    description="Search patterns and health social"
                                    expandedContent="Viral activity detected in Lagos Mainland area regarding malaria outreach."
                                />
                            )}
                        </div>
                    </section>
                )}

                {/* BILLING & REVENUE */}
                {(isAdmin || isOrgAdmin || isSponsor) && (
                    <section className="mt-2">
                        <MobileSectionHeader label="Billing & Revenue" color="hsl(var(--success))" />
                        <div className="space-y-0.5">
                            <MobileMetricRow
                                icon={Wallet}
                                label="Platform Wallet"
                                value={walletBalanceText}
                                rightBlade={{
                                    badge: formatSignedPercent(walletDelta) || 'LIVE',
                                    direction: Number(walletDelta) > 0 ? 'up' : Number(walletDelta) < 0 ? 'down' : 'flat',
                                    label: 'Today',
                                    value: `$${walletStats.todayIncome || 0}`,
                                    color: 'hsl(var(--success))'
                                }}
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
                                    rightBlade={{
                                        badge: `${((subscriptionStats.paid / Math.max(subscriptionStats.active || 0, 1)) * 100).toFixed(1)}%`,
                                        direction: subscriptionStats.paid >= ((subscriptionStats.active || 0) * 0.5) ? 'up' : 'down',
                                        label: 'Paid Mix',
                                        value: `${subscriptionStats.paid || 0}/${subscriptionStats.active || 0}`,
                                        color: 'hsl(var(--info))'
                                    }}
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
                            <MobileMetricRow icon={Hospital} label="Facilities" value={appStats.activeHospitals || 0} rightBlade={{ badge: `${appStats.activeHospitals || 0}`, direction: 'flat', label: 'Sites', value: 'Live', color: 'hsl(var(--primary))' }} color="hsl(var(--primary))" expandedContent="6 Public, 2 Private active centers." />
                            <MobileMetricRow icon={Ambulance} label="Fleet Status" value={appStats.availableAmbulances} rightBlade={{ badge: formatSignedPercent(fleetLoadDelta) || 'LIVE', direction: Number(fleetLoadDelta) > 0 ? 'up' : Number(fleetLoadDelta) < 0 ? 'down' : 'flat', label: 'Load', value: `${appStats.liveEmergencies || 0} active`, color: 'hsl(var(--success))' }} color="hsl(var(--success))" expandedContent="85% Battery • GPS Nominal." />
                            <MobileMetricRow icon={Stethoscope} label="Medical Staff" value={appStats.activeProviders} rightBlade={{ badge: `${Math.round(((appStats.activeProviders || 0) / Math.max(appStats.todayRequests || 0, 1)) * 100)}%`, direction: (appStats.activeProviders || 0) >= (appStats.todayRequests || 0) ? 'up' : 'down', label: 'Coverage', value: 'Provider/Req', color: 'hsl(var(--secondary))' }} color="hsl(var(--secondary))" expandedContent="Licensed medical staff currently active." />
                            <MobileMetricRow icon={Users} label="Community" value={appStats.totalUsers} rightBlade={{ badge: formatSignedPercent(completionVsTarget) || 'LIVE', direction: Number(completionVsTarget) >= 0 ? 'up' : 'down', label: 'Success', value: `${appStats.completionRate || 0}%`, color: 'hsl(var(--info))' }} color="hsl(var(--info))" expandedContent="Growth and platform adoption." />
                        </div>
                    </section>
                )}

                {/* PATIENT CARE */}
                {isPatient && (
                    <section className="mt-2">
                        <MobileSectionHeader label="Medical Services" color="hsl(var(--primary))" />
                        <div className="space-y-0.5">
                            <MobileMetricRow icon={Calendar} label="Book a Visit" value="New" rightBlade={{ badge: formatSignedPercent(demandDelta) || 'LIVE', direction: Number(demandDelta) > 0 ? 'up' : Number(demandDelta) < 0 ? 'down' : 'flat', label: 'Demand', value: `${appStats.todayRequests || 0} today`, color: 'hsl(var(--primary))' }} color="hsl(var(--primary))" onClick={() => { }} />
                            <MobileMetricRow icon={Stethoscope} label="Medical History" value="View" rightBlade={{ badge: `${appStats.completionRate || 0}%`, direction: Number(completionVsTarget) >= 0 ? 'up' : 'down', label: 'Success', value: 'Records', color: 'hsl(var(--info))' }} color="hsl(var(--info))" onClick={() => { }} />
                            <MobileMetricRow icon={Zap} label="Emergency SOS" value="Alert" rightBlade={{ badge: `${appStats.liveEmergencies || 0}`, direction: (appStats.liveEmergencies || 0) > 0 ? 'up' : 'flat', label: 'Active', value: 'Live', color: 'hsl(var(--destructive))' }} color="hsl(var(--destructive))" onClick={() => { }} />
                        </div>
                    </section>
                )}

                {/* NAVIGATION — role-aware, horizontal-paged */}
                <section className="mt-3">
                    <MobileSectionHeader label="Navigation" />
                    <MobileQuickNavPill items={[
                        { icon: MapIcon, label: 'Live Map', color: 'hsl(var(--primary))', path: '/map' },
                        { icon: BarChart3, label: 'Analytics', color: 'hsl(var(--info))', path: '/analytics' },
                        { icon: Newspaper, label: 'News Feed', color: 'hsl(var(--success))', path: '/health-news' },
                        { icon: Stethoscope, label: 'Doctors', color: 'hsl(var(--secondary))', path: '/doctors' },
                        ...(isAdmin || isOrgAdmin ? [
                            { icon: Hospital, label: 'Hospitals', color: 'hsl(var(--info))', path: '/hospitals' },
                            { icon: Ambulance, label: 'Ambulances', color: 'hsl(var(--destructive))', path: '/ambulances' },
                            { icon: Users, label: 'Users', color: 'hsl(var(--primary))', path: '/users' },
                            { icon: AlertTriangle, label: 'Emergencies', color: 'hsl(var(--destructive))', path: '/emergencies' }
                        ] : [
                            { icon: Calendar, label: 'Visits', color: 'hsl(var(--info))', path: '/visits' },
                            { icon: AlertTriangle, label: 'Emergency', color: 'hsl(var(--destructive))', path: '/emergencies' }
                        ])
                    ]} />
                </section>

                {/* RECENT FEED */}
                <section className="mt-3 mb-3">
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
                    <section className="mt-2 mb-6">
                        <MobileSectionHeader label="Architecture Health" color="hsl(var(--info))" />
                        <div className="px-6 py-8 bg-muted/40 rounded-card space-y-6 shadow-sm relative overflow-hidden">
                            {/* 2px Left Primary Accent */}
                            <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-primary/40 pointer-events-none" />

                            {[
                                { label: 'Dispatcher Load', value: '72%', progress: 72, color: 'hsl(var(--primary))' },
                                { label: 'API Latency', value: 'Refined', progress: 94, color: 'hsl(var(--success))' },
                                { label: 'Fleet Active', value: 'Auto-Sync', progress: 85, color: 'hsl(var(--info))' },
                                { label: 'Cloud Buffer', value: 'Steady', progress: 65, color: 'hsl(var(--warning))' }
                            ].map((sys, i) => (
                                <div key={i} className="space-y-3">
                                    <div className="flex justify-between text-[10px] font-medium tracking-widest uppercase text-foreground/40">
                                        <span>{sys.label}</span>
                                        <span className="text-foreground/60 font-semibold">{sys.value}</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-white/[0.08] rounded-pill overflow-hidden shadow-inner">
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
            </MobilePageShell>
        </PullToRefresh>
    );
};

