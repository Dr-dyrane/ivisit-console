import React, { useMemo, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar,
    Clock,
    User,
    Hospital,
    Eye,
    Edit,
    Trash2,
    CheckCircle2,
    AlertCircle,
    MapPin,
    Stethoscope,
    Activity,
    Search,
    SlidersHorizontal,
    Loader2,
    BarChart3,
    Siren,
    BadgeCheck,
    BadgeX
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { MobileKPIStrip } from './MobileKPIStrip';
import { MobileSectionHeader, MobileMetricRow } from './MobileMetricList';
import { MobileFeaturedMetric } from './MobileFeaturedMetric';
import { PullToRefresh } from './PullToRefresh';
import { formatDate } from '../../lib/utils';

/**
 * MobileVisits
 * Visit Management interface with clean, accessible design
 * Features: Infinite scroll, user-friendly terminology, Apple-level UI
 */
export const MobileVisits = ({
    visits,
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
    isOrgAdmin,
    onOpenFilters,
    hasMore,
    onLoadMore,
    selectedIds = [],
    onSelect,
    onSelectAll
}) => {
    // 1. Infinite scroll setup with Intersection Observer
    const observerTarget = useRef(null);
    const [expandedVisitId, setExpandedVisitId] = useState(null);
    const selectionMode = selectedIds.length > 0;

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
    const scheduledCount = Number(statistics?.scheduled) || visits.filter(v => v.status === 'scheduled').length;
    const activeCount = Number(statistics?.inProgress) || visits.filter(v => v.status === 'in_progress').length;
    const completedCount = Number(statistics?.completed) || visits.filter(v => v.status === 'completed').length;
    const cancelledCount = Number(statistics?.cancelled) || visits.filter(v => v.status === 'cancelled').length;

    const scheduledTrend = toDeltaBadge(calcDeltaPercent(scheduledCount, statistics?.previous?.scheduled ?? statistics?.previousScheduled));
    const activeTrend = toDeltaBadge(calcDeltaPercent(activeCount, statistics?.previous?.inProgress ?? statistics?.previousInProgress));
    const completedTrend = toDeltaBadge(calcDeltaPercent(completedCount, statistics?.previous?.completed ?? statistics?.previousCompleted));
    const cancelledTrend = toDeltaBadge(calcDeltaPercent(cancelledCount, statistics?.previous?.cancelled ?? statistics?.previousCancelled));

    // Visit KPIs with tiny live deltas and adaptive 3/4 packing
    const visitKPIs = [
        {
            id: 'scheduled',
            label: 'Scheduled',
            value: scheduledCount,
            color: 'hsl(var(--info))',
            delta: scheduledTrend.delta,
            direction: scheduledTrend.direction
        },
        {
            id: 'active',
            label: 'Active',
            value: activeCount,
            color: 'hsl(var(--warning))',
            delta: activeTrend.delta,
            direction: activeTrend.direction
        },
        {
            id: 'completed',
            label: 'Done',
            value: completedCount,
            color: 'hsl(var(--success))',
            delta: completedTrend.delta,
            direction: completedTrend.direction
        },
        ...((isAdmin || isOrgAdmin) ? [{
            id: 'cancelled',
            label: 'Cancelled',
            value: cancelledCount,
            color: 'hsl(var(--spark))',
            delta: cancelledTrend.delta,
            direction: cancelledTrend.direction
        }] : [])
    ];

    const growthData = useMemo(() => [
        { value: 25 }, { value: 40 }, { value: 55 }, { value: 45 }, { value: 65 }, { value: 80 }
    ], []);

    const todayCount = visits.filter(v => {
        const today = new Date().toDateString();
        const visitDate = new Date(v.date || v.created_at).toDateString();
        return today === visitDate;
    }).length;
    const completionRate = visits.length ? (completedCount / visits.length) * 100 : 0;

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed': return 'hsl(var(--success))';
            case 'in_progress': return 'hsl(var(--warning))';
            case 'cancelled': return 'hsl(var(--destructive))';
            default: return 'hsl(var(--info))';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'completed': return CheckCircle2;
            case 'in_progress': return Clock;
            case 'cancelled': return AlertCircle;
            default: return Calendar;
        }
    };

    return (
        <PullToRefresh onRefresh={onRefresh}>
            <div className="flex flex-col min-h-screen no-scrollbar">
                {/* A. VISIT KPI STRIP */}
                <MobileKPIStrip
                    kpis={visitKPIs}
                    activeKpi={filters?.kpiFilter || 'all'}
                    onKpiClick={(id) => setFilters?.(prev => ({ ...prev, kpiFilter: id }))}
                />

                <div className="px-2 pt-4 text-foreground">
                    {/* B. TODAY'S APPOINTMENTS */}
                    <MobileFeaturedMetric
                        label="Today's Appointments"
                        value={todayCount}
                        trend={formatSignedPercent(completionRate - 50) || 'LIVE'}
                        icon={Calendar}
                        color="hsl(var(--info))"
                        chartData={growthData}
                    />

                    {/* C. VISIT VELOCITY */}
                    <section className="mb-3">
                        <MobileSectionHeader
                            label="Visit Velocity"
                            count={completedCount}
                            color="hsl(var(--success))"
                        />
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-4 apple-glass-heavy rounded-2xl flex items-center justify-between border-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-success/5 flex items-center justify-center">
                                        <Activity className="text-success w-5 h-5 opacity-70" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[11px] font-medium tracking-tight">Completed Today</span>
                                        <span className="text-[8px] text-muted-foreground uppercase tracking-[0.2em] opacity-50">Last 24h</span>
                                    </div>
                                </div>
                                <span className="text-xl font-medium tracking-tighter font-dashboard-numbers">{completedCount}</span>
                            </div>
                            <div className="p-4 apple-glass-heavy rounded-2xl flex items-center justify-between border-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-info/5 flex items-center justify-center">
                                        <CheckCircle2 className="text-info w-5 h-5 opacity-70" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[11px] font-medium tracking-tight">Completion</span>
                                        <span className="text-[8px] text-muted-foreground uppercase tracking-[0.2em] opacity-50">Current ratio</span>
                                    </div>
                                </div>
                                <span className="text-xl font-medium tracking-tighter font-dashboard-numbers">{Math.round(completionRate)}%</span>
                            </div>
                        </div>
                    </section>

                    {/* D. SEARCH & FILTER */}
                    <div className="flex items-center gap-2 mb-4 px-1">
                        <div className="flex-1 relative group">
                            <Search size={15} className="absolute left-4 top-1/2 z-10 -translate-y-1/2 text-muted-foreground/60 group-focus-within:text-primary transition-colors" />
                            <input
                                type="text"
                                placeholder="Search visits..."
                                value={filters?.search || ''}
                                onChange={(e) => setFilters?.(prev => ({ ...prev, search: e.target.value }))}
                                className="w-full h-11 pl-10 pr-4 rounded-2xl apple-glass-heavy border-0 text-[12px] font-normal placeholder:text-muted-foreground/30 focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                            />
                        </div>
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => onOpenFilters?.()}
                            className="w-11 h-11 rounded-2xl apple-glass-heavy flex items-center justify-center text-muted-foreground/60 active:text-[hsl(var(--spark)/0.92)] hover:text-[hsl(var(--spark)/0.92)] hover:bg-[hsl(var(--spark)/0.08)] transition-[color,background,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] border-0"
                        >
                            <SlidersHorizontal size={18} />
                        </motion.button>

                        {(isAdmin || isOrgAdmin) && (
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={() => onViewAnalytics?.()}
                                className="w-11 h-11 rounded-2xl apple-glass-heavy flex items-center justify-center text-[hsl(var(--spark)/0.64)] active:text-[hsl(var(--spark)/0.92)] hover:text-[hsl(var(--spark)/0.92)] hover:bg-[hsl(var(--spark)/0.08)] transition-[color,background,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] border-0 shadow-sm"
                            >
                                <BarChart3 size={18} />
                            </motion.button>
                        )}
                    </div>

                    {/* E. VISIT DIRECTORY */}
                    <MobileSectionHeader
                        label="Visit Directory"
                        count={visits.length}
                        color="hsl(var(--primary))"
                        onSelectAll={visits.length > 0 ? () => onSelectAll?.(visits) : null}
                        isAllSelected={visits.length > 0 && selectedIds.length === visits.length}
                    />

                    <div className="space-y-1">
                        <AnimatePresence mode="popLayout">
                            {visits.map((visit) => (
                                <MobileMetricRow
                                    key={visit.id}
                                    icon={getStatusIcon(visit.status)}
                                    color={getStatusColor(visit.status)}
                                    label={visit.visit_type?.replace('_', ' ').toUpperCase() || 'GENERAL VISIT'}
                                    value={visit.patient?.username || visit.patient?.full_name || `Patient #${visit.user_id?.slice(-4) || '??'}`}
                                    rightBlade={{
                                        badge: visit.status === 'completed' ? 'DONE' : visit.status === 'in_progress' ? 'LIVE' : 'SCHED',
                                        direction: visit.status === 'completed' ? 'up' : visit.status === 'cancelled' ? 'down' : 'flat',
                                        label: 'Visit',
                                        value: visit.status?.replace('_', ' ').toUpperCase() || 'PENDING',
                                        color: getStatusColor(visit.status)
                                    }}
                                    statusIndicators={[
                                        {
                                            icon: visit.visit_type?.includes('emergency') || visit.type?.includes('emergency') ? Siren : Stethoscope,
                                            color: visit.visit_type?.includes('emergency') || visit.type?.includes('emergency') ? 'hsl(var(--destructive))' : 'hsl(var(--muted-foreground)/0.4)',
                                            label: visit.visit_type || 'Routine'
                                        },
                                        {
                                            icon: getStatusIcon(visit.status),
                                            color: getStatusColor(visit.status),
                                            label: visit.status
                                        }
                                    ]}
                                    isExpanded={expandedVisitId === visit.id}
                                    onExpand={(id) => setExpandedVisitId(prev => prev === id ? null : id)}
                                    itemId={visit.id}
                                    isSelected={selectedIds.includes(visit.id)}
                                    onSelect={onSelect}
                                    selectionMode={selectionMode}
                                    expandedContent={
                                        <div className="space-y-4 py-3">
                                            {/* Visit Details */}
                                            <div className="grid grid-cols-1 gap-2">
                                                <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-2xl border-0">
                                                    <Stethoscope size={14} className="text-muted-foreground/40" />
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Practitioner</span>
                                                        <span className="text-xs font-semibold">{visit.doctor?.name || visit.doctor || 'Unassigned'}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-2xl border-0">
                                                    <Hospital size={14} className="text-muted-foreground/40" />
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Facility</span>
                                                        <span className="text-xs font-semibold truncate">{visit.hospital?.name || visit.hospital || 'Direct Consultation'}</span>
                                                    </div>
                                                </div>
                                                {visit.room_number && (
                                                    <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-2xl border-0">
                                                        <MapPin size={14} className="text-muted-foreground/40" />
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Location</span>
                                                            <span className="text-xs font-semibold">Ward 4 • Room {visit.room_number}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Visit Information */}
                                            <div className="flex items-center justify-between px-1">
                                                <div className="flex flex-col">
                                                    <span className="text-[8px] uppercase tracking-widest text-muted-foreground font-medium">Visit ID</span>
                                                    <span className="text-[10px] font-mono text-foreground/40 font-normal">#{visit.id?.slice(0, 12).toUpperCase()}</span>
                                                </div>
                                                <Badge className={`squircle-sm border-0 font-semibold tracking-tight text-[9px] py-1 px-3 ${getStatusColor(visit.status).replace('hsl(var(', 'bg-').replace('))', '/20 text-')}`}>
                                                    {visit.status?.replace('_', ' ').toUpperCase() || 'SCHEDULED'}
                                                </Badge>
                                            </div>

                                            {/* Quick Actions */}
                                            <div className="flex gap-2 pt-2">
                                                <Button
                                                    variant="ghost"
                                                    className="flex-1 h-12 rounded-2xl apple-glass border-0 flex items-center justify-center gap-2 active:scale-95 transition-[transform,color,background] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-white/[0.06] active:bg-white/[0.12] hover:text-foreground"
                                                    onClick={() => onView(visit)}
                                                >
                                                    <Eye size={16} className="text-primary/60" />
                                                    <span className="text-[9px] uppercase font-semibold tracking-[0.2em]">Details</span>
                                                </Button>
                                                {(isAdmin || isOrgAdmin) && (
                                                    <>
                                                        <Button
                                                            variant="ghost"
                                                            className="flex-1 h-12 rounded-2xl apple-glass border-0 flex items-center justify-center gap-2 active:scale-95 transition-[transform,color,background] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-white/[0.06] active:bg-white/[0.12] hover:text-foreground"
                                                            onClick={() => onEdit(visit)}
                                                        >
                                                            <Edit size={16} className="text-warning/60" />
                                                            <span className="text-[9px] uppercase font-semibold tracking-[0.2em]">Edit</span>
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            className="w-12 h-12 rounded-2xl apple-glass border-0 flex items-center justify-center active:scale-95 transition-[transform,color,background] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-destructive/10 active:bg-destructive/15 hover:text-destructive"
                                                            onClick={() => onDelete(visit)}
                                                        >
                                                            <Trash2 size={16} className="text-destructive/60" />
                                                        </Button>
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
                                <div className="flex flex-col items-center gap-2">
                                    <div className="flex gap-1">
                                        {[0, 1, 2].map((i) => (
                                            <motion.div
                                                key={i}
                                                animate={{
                                                    scale: [1, 1.2, 1],
                                                    opacity: [0.3, 1, 0.3],
                                                }}
                                                transition={{
                                                    duration: 1,
                                                    repeat: Infinity,
                                                    delay: i * 0.2,
                                                }}
                                                className="w-1.5 h-1.5 rounded-full bg-primary/40"
                                            />
                                        ))}
                                    </div>
                                    <span className="text-[8px] font-medium uppercase tracking-[0.2em] text-muted-foreground/40">Loading more visits</span>
                                </div>
                            )}
                            {!hasMore && visits.length > 0 && (
                                <p className="text-[8px] font-normal text-muted-foreground uppercase tracking-[0.4em] opacity-20 py-8">End of visit list</p>
                            )}
                        </div>

                        {visits.length === 0 && !loading && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="py-24 text-center"
                            >
                                <Calendar className="h-10 w-10 mx-auto mb-4 text-muted-foreground/10" />
                                <p className="text-[10px] font-normal text-muted-foreground uppercase tracking-[0.4em] opacity-30">No visits found</p>
                            </motion.div>
                        )}
                    </div>
                </div>
            </div>
        </PullToRefresh>
    );
};
