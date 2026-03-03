import React, { useMemo, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
    AlertTriangle,
    Activity,
    Phone,
    MapPin,
    Clock,
    Users,
    Ambulance,
    Hospital,
    Shield,
    Zap,
    Navigation,
    Eye,
    Edit,
    Trash2,
    CheckCircle2,
    AlertCircle,
    TrendingUp,
    Calendar,
    BarChart3,
    SlidersHorizontal
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { MobileKPIStrip } from './MobileKPIStrip';
import { MobileSectionHeader, MobileMetricRow } from './MobileMetricList';
import { MobileFeaturedMetric } from './MobileFeaturedMetric';
import { MobileSecondaryMetricRail } from './MobileSecondaryMetricCard';
import { PullToRefresh } from './PullToRefresh';
import { MobilePageShell } from './MobilePageShell';
import { MobileListEnd, MobileListEmpty, MobileListSkeletonRows, MobileListLoadMore } from './MobileListStates';
import { formatDate } from '../../lib/utils';
import { useFeedback } from '../../hooks/useFeedback';
import { FEEDBACK_TYPES } from '../../contexts/FeedbackContext';
import { useStableList } from './useStableList';
import { useLoadMoreControl } from './useLoadMoreControl';
import { canonicalizeEmergencyStatus, isActiveEmergencyStatus, isTerminalEmergencyStatus } from '../../utils/emergencyStatus';

/**
 * MobileEmergency
 * Emergency Response Mission Control - Real-time critical incident management
 * Canon #1: Clarity Under Pressure
 * Canon #10: Dashboard = Control
 * Features: Live emergencies, ambulance tracking, hospital coordination
 */
export const MobileEmergency = ({
    emergencies,
    loading,
    statistics,
    filters,
    setFilters,
    onView,
    onEdit,
    onDelete,
    onRefresh,
    onViewAnalytics,
    isAdmin,
    onOpenFilters,
    hasMore,
    onLoadMore,
    kpiFilter,
    setKpiFilter
}) => {
    // 1. Infinite scroll setup with Intersection Observer
    const observerTarget = useRef(null);
    const [expandedEmergencyId, setExpandedEmergencyId] = useState(null);
    const { triggerFromEvent } = useFeedback();
    const { displayItems: displayEmergencies, isBuffering } = useStableList(emergencies, loading);
  const showTopSectionLoading = loading && displayEmergencies.length === 0;

    const formatSignedPercent = (value) => {
        if (!Number.isFinite(value)) return null;
        const rounded = Math.abs(value) >= 10 ? value.toFixed(0) : value.toFixed(1);
        return `${value > 0 ? '+' : ''}${rounded}%`;
    };

    const calcDeltaPercent = (current, previous) => {
        const c = Number(current);
        const p = Number(previous);
        if (!Number.isFinite(c) || !Number.isFinite(p) || p === 0) return null;
        return ((c - p) / Math.abs(p)) * 100;
    };

    const toDeltaBadge = (value) => ({
        delta: formatSignedPercent(value) || 'LIVE',
        direction: Number.isFinite(value) ? (value > 0 ? 'up' : value < 0 ? 'down' : 'flat') : 'flat'
    });

    const { armed, requestLoad, triggerLoad } = useLoadMoreControl({ hasMore, loading, onLoadMore });

    useEffect(() => {
        if (!hasMore) return;
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting) triggerLoad();
            },
            { threshold: 0.1, rootMargin: '120px' }
        );
        if (observerTarget.current) observer.observe(observerTarget.current);
        return () => observer.disconnect();
    }, [hasMore, triggerLoad]);

    const totals = {
        all: Number(statistics?.total) || emergencies.length,
        ambulance: Number(statistics?.ambulance) || emergencies.filter(e => e.service_type === 'ambulance').length,
        bed: Number(statistics?.bed) || emergencies.filter(e => e.service_type === 'bed').length,
        active: Number(statistics?.active) || emergencies.filter(e => isActiveEmergencyStatus(e.status)).length
    };

    const previous = {
        all: statistics?.previous?.total ?? statistics?.previousTotal,
        ambulance: statistics?.previous?.ambulance ?? statistics?.previousAmbulance,
        bed: statistics?.previous?.bed ?? statistics?.previousBed,
        active: statistics?.previous?.active ?? statistics?.previousActive
    };

    // Emergency KPIs matching EmergencyRequestsPage filters with tiny live deltas
    const emergencyKPIs = [
        (() => {
            const trend = toDeltaBadge(calcDeltaPercent(totals.all, previous.all));
            return { id: 'all', label: 'All', value: totals.all, color: 'hsl(var(--primary))', delta: trend.delta, direction: trend.direction };
        })(),
        (() => {
            const trend = toDeltaBadge(calcDeltaPercent(totals.ambulance, previous.ambulance));
            return { id: 'ambulance', label: 'Ambulance', value: totals.ambulance, color: 'hsl(var(--destructive))', delta: trend.delta, direction: trend.direction };
        })(),
        (() => {
            const trend = toDeltaBadge(calcDeltaPercent(totals.bed, previous.bed));
            return { id: 'bed', label: 'Beds', value: totals.bed, color: 'hsl(var(--warning))', delta: trend.delta, direction: trend.direction };
        })(),
        ...(isAdmin ? [(() => {
            const trend = toDeltaBadge(calcDeltaPercent(totals.active, previous.active));
            return { id: 'inProgress', label: 'Active', value: totals.active, color: 'hsl(var(--spark))', delta: trend.delta, direction: trend.direction };
        })()] : [])
    ];

    const growthData = useMemo(() => [
        { value: 45 }, { value: 60 }, { value: 40 }, { value: 75 }, { value: 85 }, { value: 95 }
    ], []);

    const activeCount = emergencies.filter(e => isActiveEmergencyStatus(e.status)).length;
    const resolvedCount = emergencies.filter(e => isTerminalEmergencyStatus(e.status)).length;
    const responseSuccess = Number(statistics?.successRate) || (emergencies.length ? (resolvedCount / emergencies.length) * 100 : 0);
    const trendBadge = formatSignedPercent(responseSuccess - 50) || 'LIVE';

    const getSeverityColor = (service_type) => {
        switch (service_type) {
            case 'ambulance': return 'hsl(var(--destructive))';
            case 'bed': return 'hsl(var(--warning))';
            case 'critical_care': return 'hsl(var(--destructive))';
            default: return 'hsl(var(--primary))';
        }
    };

    const getStatusIcon = (status) => {
        switch (canonicalizeEmergencyStatus(status, null)) {
            case 'pending_approval':
                return AlertCircle;
            case 'in_progress':
            case 'accepted':
            case 'arrived':
                return Activity;
            case 'completed':
            case 'cancelled':
            case 'payment_declined':
                return CheckCircle2;
            default: return AlertTriangle;
        }
    };

    const getStatusColor = (status) => {
        switch (canonicalizeEmergencyStatus(status, null)) {
            case 'pending_approval': return 'hsl(var(--warning))';
            case 'in_progress': return 'hsl(var(--destructive))';
            case 'accepted': return 'hsl(var(--info))';
            case 'arrived': return 'hsl(var(--spark))';
            case 'completed': return 'hsl(var(--success))';
            case 'cancelled':
            case 'payment_declined':
                return 'hsl(var(--muted-foreground))';
            default: return 'hsl(var(--primary))';
        }
    };

    const needsApproval = (emergency) =>
        canonicalizeEmergencyStatus(emergency?.status, null) === 'pending_approval' ||
        (emergency?.payment_method_id === 'cash' && emergency?.payment_status && emergency.payment_status !== 'completed');

    return (
        <PullToRefresh onRefresh={onRefresh}>
            <MobilePageShell
                animatePageLoad={false}
                kpiStrip={(
                    <MobileKPIStrip
            loading={showTopSectionLoading}
                        animateOnMount={false}
                        kpis={emergencyKPIs}
                        activeKpi={kpiFilter || 'all'}
                        onKpiClick={(id) => setKpiFilter?.(id)}
                    />
                )}
                contentClassName="pt-4 pb-4 text-foreground"
            >
                {/* B. LIVE EMERGENCIES */}
                <MobileFeaturedMetric
          loading={showTopSectionLoading}
                    items={[
                        {
                            label: 'Live Emergencies',
                            value: activeCount,
                            trend: trendBadge,
                            icon: AlertTriangle,
                            color: 'hsl(var(--destructive))',
                            chartData: growthData
                        },
                        {
                            label: 'Total Requests',
                            value: totals.all,
                            trend: formatSignedPercent(calcDeltaPercent(totals.all, previous.all)) || 'LIVE',
                            icon: Activity,
                            color: 'hsl(var(--primary))',
                            chartData: growthData
                        },
                        {
                            label: 'Ambulance Calls',
                            value: totals.ambulance,
                            trend: formatSignedPercent(calcDeltaPercent(totals.ambulance, previous.ambulance)) || 'LIVE',
                            icon: Ambulance,
                            color: 'hsl(var(--warning))',
                            chartData: growthData
                        },
                        {
                            label: 'Bed Requests',
                            value: totals.bed,
                            trend: formatSignedPercent(calcDeltaPercent(totals.bed, previous.bed)) || 'LIVE',
                            icon: Hospital,
                            color: 'hsl(var(--info))',
                            chartData: growthData
                        }
                    ]}
                />

                {/* C. RESPONSE METRICS */}
                <section className="mb-3">
                    <MobileSectionHeader
                        label="Response Metrics"
                        count={statistics?.responseTime || '2.3min'}
                        color="hsl(var(--warning))"
                    />
                    <MobileSecondaryMetricRail
            loading={showTopSectionLoading}
                        variant="icon"
                        items={[
                            {
                                icon: Clock,
                                title: 'Avg Response',
                                subtitle: 'Last 24h',
                                value: statistics?.avgResponseTime || '2.3m',
                                color: 'hsl(var(--warning))',
                                iconColorClass: 'text-warning',
                                iconBgClass: 'bg-warning/5'
                            },
                            {
                                icon: TrendingUp,
                                title: 'Success Rate',
                                subtitle: 'This month',
                                value: statistics?.successRate || '0%',
                                color: 'hsl(var(--success))',
                                iconColorClass: 'text-success',
                                iconBgClass: 'bg-success/5'
                            },
                            {
                                icon: Shield,
                                title: 'Active',
                                subtitle: 'Live queue',
                                value: totals.active,
                                color: 'hsl(var(--destructive))',
                                iconColorClass: 'text-destructive',
                                iconBgClass: 'bg-destructive/5'
                            },
                            {
                                icon: AlertCircle,
                                title: 'Total',
                                subtitle: 'All requests',
                                value: totals.all,
                                color: 'hsl(var(--info))',
                                iconColorClass: 'text-info',
                                iconBgClass: 'bg-info/5'
                            }
                        ]}
                    />
                </section>

                {/* D. SEARCH & FILTER */}
                <div className="flex items-center gap-2 mb-3 px-1">
                    <div className="flex-1 relative group">
                        <AlertTriangle size={15} className="absolute left-4 top-1/2 z-10 -translate-y-1/2 text-muted-foreground/60 group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="Search emergencies..."
                            value={filters?.search || ''}
                            onChange={(e) => setFilters?.(prev => ({ ...prev, search: e.target.value }))}
                            className="w-full h-11 pl-10 pr-4 rounded-2xl apple-glass-heavy border-0 text-[12px] font-normal placeholder:text-muted-foreground/30 focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                        />
                    </div>
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={(event) => {
                            onOpenFilters?.();
                            triggerFromEvent(event, { variant: FEEDBACK_TYPES.INFO, color: 'hsl(var(--spark))', haptic: true, sound: true });
                        }}
                        className="w-11 h-11 rounded-2xl apple-glass-heavy border-0 flex items-center justify-center active:scale-90 transition-[transform,color,background] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] text-muted-foreground/60 hover:text-[hsl(var(--spark)/0.92)] hover:bg-[hsl(var(--spark)/0.08)]"
                    >
                        <SlidersHorizontal size={18} />
                    </motion.button>

                    {isAdmin && (
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={(event) => {
                                onViewAnalytics?.();
                                triggerFromEvent(event, { variant: FEEDBACK_TYPES.CLICK, color: 'hsl(var(--spark))', haptic: true, sound: true });
                            }}
                            className="w-11 h-11 rounded-2xl apple-glass-heavy border-0 flex items-center justify-center active:scale-90 transition-[transform,color,background] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] text-[hsl(var(--spark)/0.78)] hover:text-[hsl(var(--spark)/0.92)] hover:bg-[hsl(var(--spark)/0.08)]"
                        >
                            <BarChart3 size={18} />
                        </motion.button>
                    )}
                </div>

                {/* E. EMERGENCY DIRECTORY */}
                <MobileSectionHeader
                    label="Emergency Directory"
                    count={displayEmergencies.length}
                    color="hsl(var(--destructive))"
                />

                <div className="space-y-1">
                    {displayEmergencies.map((emergency) => (
                        (() => {
                            const approvalNeeded = needsApproval(emergency);
                            const rowColor = approvalNeeded ? 'hsl(var(--warning))' : getSeverityColor(emergency.service_type);
                            const canonicalStatus = canonicalizeEmergencyStatus(emergency.status, emergency.status);
                            const blade = approvalNeeded
                                ? {
                                    badge: 'APPROVAL',
                                    direction: 'flat',
                                    label: 'Cash Gate',
                                    value: String(emergency.payment_status || 'pending').toUpperCase(),
                                    color: 'hsl(var(--warning))'
                                }
                                : {
                                    badge: isActiveEmergencyStatus(canonicalStatus) ? 'LIVE' : 'RESOLVED',
                                    direction: canonicalStatus === 'completed' ? 'up' : isActiveEmergencyStatus(canonicalStatus) ? 'down' : 'flat',
                                    label: 'Priority',
                                    value: String(emergency.priority || 'normal').toUpperCase(),
                                    color: getStatusColor(canonicalStatus)
                                };
                            return (
                        <MobileMetricRow
                            key={emergency.id}
                            layoutEnabled={false}
                            icon={getStatusIcon(canonicalStatus)}
                            color={rowColor}
                            attentionPulse={approvalNeeded}
                            label={emergency.service_type?.replace('_', ' ').toUpperCase() || 'MEDICAL EMERGENCY'}
                            value={emergency.patient_name || emergency.patient?.name || `Patient #${emergency.id?.slice(-4) || '??'}`}
                            trend={formatDate(emergency.created_at)}
                            statusIndicators={approvalNeeded ? [{
                                icon: AlertCircle,
                                color: 'hsl(var(--warning))',
                                label: 'Approval Needed'
                            }] : []}
                            rightBlade={blade}
                            isExpanded={expandedEmergencyId === emergency.id}
                            onExpand={setExpandedEmergencyId}
                            itemId={emergency.id}
                            expandedContent={
                                <div className="space-y-4 py-3">
                                        {approvalNeeded && (
                                            <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-warning/10 border border-warning/15">
                                                <div className="min-w-0">
                                                    <div className="text-[9px] uppercase tracking-[0.18em] font-semibold text-warning/90">Approval Needed</div>
                                                    <div className="text-xs font-semibold text-foreground truncate">Cash payment awaiting verification</div>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    className="shrink-0 h-10 px-3 rounded-xl bg-warning/15 hover:bg-warning/20 text-warning border-0 active:scale-95"
                                                    onClick={() => onView(emergency)}
                                                >
                                                    <span className="text-[9px] uppercase font-semibold tracking-[0.18em]">Review</span>
                                                </Button>
                                            </div>
                                        )}
                                        {/* Emergency Details */}
                                        <div className="grid grid-cols-1 gap-2">
                                            <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-2xl border-0">
                                                <MapPin size={14} className="text-muted-foreground/40" />
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Location</span>
                                                    <span className="text-xs font-semibold truncate">{emergency.location || 'Location tracking...'}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-2xl border-0">
                                                <Phone size={14} className="text-muted-foreground/40" />
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Contact</span>
                                                    <span className="text-xs font-semibold">{emergency.contact_phone || emergency.patient?.phone || 'No contact'}</span>
                                                </div>
                                            </div>
                                            {emergency.assignedAmbulance && (
                                                <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-2xl border-0">
                                                    <Ambulance size={14} className="text-muted-foreground/40" />
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Ambulance</span>
                                                        <span className="text-xs font-semibold">{emergency.assignedAmbulance.vehicleId} • ETA {emergency.eta || '3min'}</span>
                                                    </div>
                                                </div>
                                            )}
                                            {emergency.assignedHospital && (
                                                <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-2xl border-0">
                                                    <Hospital size={14} className="text-muted-foreground/40" />
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Facility</span>
                                                        <span className="text-xs font-semibold truncate">{emergency.hospital_name || emergency.assignedHospital?.name || 'Not assigned'}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Emergency Information */}
                                        <div className="flex items-center justify-between px-1">
                                            <div className="flex flex-col">
                                                <span className="text-[8px] uppercase tracking-widest text-muted-foreground font-medium">Emergency ID</span>
                                                <span className="text-[10px] font-mono text-foreground/40 font-normal">#{emergency.id?.slice(0, 12).toUpperCase()}</span>
                                            </div>
                                            <Badge className={`squircle-sm border-0 font-semibold tracking-tight text-[9px] py-1 px-3 ${getSeverityColor(emergency.service_type).replace('hsl(var(', 'bg-').replace('))', '/20 text-')}`}>
                                                {emergency.service_type?.replace('_', ' ').toUpperCase() || 'AMBULANCE'}
                                            </Badge>
                                        </div>

                                        {/* Quick Actions */}
                                        <div className="flex gap-2 pt-2">
                                            <Button
                                                variant="ghost"
                                                className="flex-1 h-12 rounded-2xl apple-glass border-0 flex items-center justify-center gap-2 active:scale-95 transition-[transform,color,background] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-white/[0.06] active:bg-white/[0.12] hover:text-foreground"
                                                onClick={() => onView(emergency)}
                                            >
                                                <Eye size={16} className="text-primary/60" />
                                                <span className="text-[9px] uppercase font-semibold tracking-[0.2em]">{approvalNeeded ? 'Review' : 'Details'}</span>
                                            </Button>
                                            {(isAdmin || emergency.status === 'active' || approvalNeeded) && (
                                                <>
                                                    <Button
                                                        variant="ghost"
                                                        className="flex-1 h-12 rounded-2xl apple-glass border-0 flex items-center justify-center gap-2 active:scale-95 transition-[transform,color,background] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-white/[0.06] active:bg-white/[0.12] hover:text-foreground"
                                                        onClick={() => approvalNeeded ? onView(emergency) : onEdit(emergency)}
                                                    >
                                                        {approvalNeeded ? (
                                                            <CheckCircle2 size={16} className="text-warning/70" />
                                                        ) : (
                                                            <Navigation size={16} className="text-warning/60" />
                                                        )}
                                                        <span className="text-[9px] uppercase font-semibold tracking-[0.2em]">{approvalNeeded ? 'Approve' : 'Navigate'}</span>
                                                    </Button>
                                                    {isAdmin && (
                                                        <Button
                                                            variant="ghost"
                                                            className="w-12 h-12 rounded-2xl apple-glass border-0 flex items-center justify-center active:scale-95 transition-[transform,color,background] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-destructive/10 active:bg-destructive/15 hover:text-destructive"
                                                            onClick={() => onDelete(emergency)}
                                                        >
                                                            <Trash2 size={16} className="text-destructive/60" />
                                                        </Button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                </div>
                            }
                        />
                            );
                        })()
                    ))}

                    {/* Infinite Scroll Sentinel */}
                    <div ref={observerTarget} className="min-h-[64px] flex items-center justify-center">
                        {loading && <MobileListSkeletonRows />}
                        {!loading && hasMore && <MobileListLoadMore armed={armed} onRequest={requestLoad} />}
                        {!loading && !hasMore && displayEmergencies.length > 0 && (
                            <MobileListEnd label="End of emergency list" />
                        )}
                    </div>

                    {displayEmergencies.length === 0 && !loading && (
                        <MobileListEmpty icon={AlertTriangle} label="No active emergencies" />
                    )}
                </div>
            </MobilePageShell>
        </PullToRefresh>
    );
};


