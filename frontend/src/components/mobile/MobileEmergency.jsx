import React, { useMemo, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
import { MobileSecondaryMetricCard } from './MobileSecondaryMetricCard';
import { PullToRefresh } from './PullToRefresh';
import { MobilePageShell } from './MobilePageShell';
import { MobileListLoadingMore, MobileListEnd, MobileListEmpty } from './MobileListStates';
import { formatDate } from '../../lib/utils';
import { useFeedback } from '../../hooks/useFeedback';
import { FEEDBACK_TYPES } from '../../contexts/FeedbackContext';

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

    useEffect(() => {
        if (!hasMore || loading) return;

        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && hasMore) {
                    onLoadMore();
                }
            },
            { threshold: 0.1, rootMargin: '100px' }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => observer.disconnect();
    }, [hasMore, loading, onLoadMore]);

    const totals = {
        all: Number(statistics?.total) || emergencies.length,
        ambulance: Number(statistics?.ambulance) || emergencies.filter(e => e.service_type === 'ambulance').length,
        bed: Number(statistics?.bed) || emergencies.filter(e => e.service_type === 'bed').length,
        active: Number(statistics?.active) || emergencies.filter(e => e.status === 'active' || e.status === 'in_progress').length
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

    const activeCount = emergencies.filter(e => e.status === 'active').length;
    const resolvedCount = emergencies.filter(e => e.status === 'resolved' || e.status === 'completed').length;
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
        switch (status) {
            case 'active': return AlertCircle;
            case 'responding': return Activity;
            case 'resolved': return CheckCircle2;
            default: return AlertTriangle;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'active': return 'hsl(var(--destructive))';
            case 'responding': return 'hsl(var(--warning))';
            case 'resolved': return 'hsl(var(--success))';
            default: return 'hsl(var(--primary))';
        }
    };

    return (
        <PullToRefresh onRefresh={onRefresh}>
            <MobilePageShell
                kpiStrip={(
                    <MobileKPIStrip
                        kpis={emergencyKPIs}
                        activeKpi={kpiFilter || 'all'}
                        onKpiClick={(id) => setKpiFilter?.(id)}
                    />
                )}
                contentClassName="px-2 pt-4 pb-4 text-foreground"
            >
                {/* B. LIVE EMERGENCIES */}
                <MobileFeaturedMetric
                    label="Live Emergencies"
                    value={activeCount}
                    trend={trendBadge}
                    icon={AlertTriangle}
                    color="hsl(var(--destructive))"
                    chartData={growthData}
                />

                {/* C. RESPONSE METRICS */}
                <section className="mb-3">
                    <MobileSectionHeader
                        label="Response Metrics"
                        count={statistics?.responseTime || '2.3min'}
                        color="hsl(var(--warning))"
                    />
                    <div className="grid grid-cols-2 gap-3">
                        <MobileSecondaryMetricCard
                            variant="icon"
                            icon={Clock}
                            title="Avg Response"
                            subtitle="Last 24h"
                            value={statistics?.avgResponseTime || '2.3m'}
                            color="hsl(var(--warning))"
                            iconColorClass="text-warning"
                            iconBgClass="bg-warning/5"
                        />
                        <MobileSecondaryMetricCard
                            variant="icon"
                            icon={TrendingUp}
                            title="Success Rate"
                            subtitle="This month"
                            value={statistics?.successRate || '0%'}
                            color="hsl(var(--success))"
                            iconColorClass="text-success"
                            iconBgClass="bg-success/5"
                        />
                    </div>
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
                    count={emergencies.length}
                    color="hsl(var(--destructive))"
                />

                <div className="space-y-1">
                    <AnimatePresence mode="popLayout">
                        {emergencies.map((emergency) => (
                            <MobileMetricRow
                                key={emergency.id}
                                icon={getStatusIcon(emergency.status)}
                                color={getSeverityColor(emergency.service_type)}
                                label={emergency.service_type?.replace('_', ' ').toUpperCase() || 'MEDICAL EMERGENCY'}
                                value={emergency.patient_name || emergency.patient?.name || `Patient #${emergency.id?.slice(-4) || '??'}`}
                                trend={formatDate(emergency.created_at)}
                                rightBlade={{
                                    badge: emergency.status === 'active' ? 'LIVE' : emergency.status === 'responding' ? 'ENROUTE' : 'RESOLVED',
                                    direction: emergency.status === 'resolved' ? 'up' : emergency.status === 'active' ? 'down' : 'flat',
                                    label: 'Priority',
                                    value: String(emergency.priority || 'normal').toUpperCase(),
                                    color: getStatusColor(emergency.status)
                                }}
                                isExpanded={expandedEmergencyId === emergency.id}
                                onExpand={setExpandedEmergencyId}
                                itemId={emergency.id}
                                expandedContent={
                                    <div className="space-y-4 py-3">
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
                                                <span className="text-[9px] uppercase font-semibold tracking-[0.2em]">Details</span>
                                            </Button>
                                            {(isAdmin || emergency.status === 'active') && (
                                                <>
                                                    <Button
                                                        variant="ghost"
                                                        className="flex-1 h-12 rounded-2xl apple-glass border-0 flex items-center justify-center gap-2 active:scale-95 transition-[transform,color,background] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-white/[0.06] active:bg-white/[0.12] hover:text-foreground"
                                                        onClick={() => onEdit(emergency)}
                                                    >
                                                        <Navigation size={16} className="text-warning/60" />
                                                        <span className="text-[9px] uppercase font-semibold tracking-[0.2em]">Navigate</span>
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
                        ))}
                    </AnimatePresence>

                    {/* Infinite Scroll Sentinel */}
                    <div ref={observerTarget} className="h-20 flex items-center justify-center">
                        {hasMore && (
                            <MobileListLoadingMore label="Loading more emergencies" />
                        )}
                        {!hasMore && emergencies.length > 0 && (
                            <MobileListEnd label="End of emergency list" />
                        )}
                    </div>

                    {emergencies.length === 0 && !loading && (
                        <MobileListEmpty icon={AlertTriangle} label="No active emergencies" />
                    )}
                </div>
            </MobilePageShell>
        </PullToRefresh>
    );
};
