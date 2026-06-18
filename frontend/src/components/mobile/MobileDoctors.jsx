import React, { useMemo, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Stethoscope,
    Phone,
    Hospital,
    Star,
    Eye,
    Edit,
    Trash2,
    Search,
    SlidersHorizontal,
    BarChart3,
    BadgeCheck,
    BadgeX
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
import { useFeedback } from '../../hooks/useFeedback';
import { FEEDBACK_TYPES } from '../../contexts/FeedbackContext';
import { useStableList } from './useStableList';
import { useLoadMoreControl } from './useLoadMoreControl';
import { calcDeltaPercent, formatSignedPercent, toDeltaBadge } from '../../utils/metricsUtils';

export const MobileDoctors = ({
    doctors,
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
    const observerTarget = useRef(null);
    const [expandedDoctorId, setExpandedDoctorId] = useState(null);
    const selectionMode = selectedIds.length > 0;
    const canManage = isAdmin || isOrgAdmin;
    const { triggerFromEvent } = useFeedback();




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

    const getStatus = (doctor) => String(doctor?.status || 'available').toLowerCase();

    const totals = {
        all: Number(statistics?.total) || doctors.length,
        available: Number(statistics?.available) || doctors.filter(d => getStatus(d) === 'available').length,
        onCall: Number(statistics?.onCall) || doctors.filter(d => getStatus(d) === 'on_call').length,
        busy: Number(statistics?.busy) || doctors.filter(d => getStatus(d) === 'busy').length
    };

    const allTrend = toDeltaBadge(calcDeltaPercent(totals.all, statistics?.previous?.total ?? statistics?.previousTotal));
    const availableTrend = toDeltaBadge(calcDeltaPercent(totals.available, statistics?.previous?.available ?? statistics?.previousAvailable));
    const onCallTrend = toDeltaBadge(calcDeltaPercent(totals.onCall, statistics?.previous?.onCall ?? statistics?.previousOnCall));
    const busyTrend = toDeltaBadge(calcDeltaPercent(totals.busy, statistics?.previous?.busy ?? statistics?.previousBusy));

    const doctorKpis = [
        {
            id: 'all',
            label: 'Doctors',
            value: totals.all,
            color: 'hsl(var(--primary))',
            delta: allTrend.delta,
            direction: allTrend.direction
        },
        {
            id: 'available',
            label: 'Available',
            value: totals.available,
            color: 'hsl(var(--success))',
            delta: availableTrend.delta,
            direction: availableTrend.direction
        },
        {
            id: 'on_call',
            label: 'On Call',
            value: totals.onCall,
            color: 'hsl(var(--info))',
            delta: onCallTrend.delta,
            direction: onCallTrend.direction
        },
        {
            id: 'busy',
            label: 'Busy',
            value: totals.busy,
            color: 'hsl(var(--warning))',
            delta: busyTrend.delta,
            direction: busyTrend.direction
        }
    ];

    const filteredDoctors = useMemo(() => {
        let result = Array.isArray(doctors) ? [...doctors] : [];
        const search = String(filters?.search || '').trim().toLowerCase();
        const kpi = String(filters?.kpiFilter || 'all');

        if (search) {
            result = result.filter(d => {
                const name = String(d?.name || '').toLowerCase();
                const spec = String(d?.specialization || '').toLowerCase();
                const phone = String(d?.phone || '').toLowerCase();
                return name.includes(search) || spec.includes(search) || phone.includes(search);
            });
        }

        if (kpi !== 'all') {
            result = result.filter(d => getStatus(d) === kpi);
        }

        return result;
    }, [doctors, filters]);
    const { displayItems: displayDoctors, isBuffering } = useStableList(filteredDoctors, loading);
  const showTopSectionLoading = loading && displayDoctors.length === 0;

    const avgRating = filteredDoctors.length
        ? filteredDoctors.reduce((sum, d) => sum + (Number(d.rating) || 0), 0) / filteredDoctors.length
        : 0;

    const growthData = useMemo(() => [
        { value: 28 }, { value: 36 }, { value: 44 }, { value: 41 }, { value: 57 }, { value: 63 }
    ], []);

    const getStatusColor = (status) => {
        if (status === 'available') return 'hsl(var(--success))';
        if (status === 'on_call') return 'hsl(var(--info))';
        if (status === 'busy') return 'hsl(var(--warning))';
        if (status === 'off_duty') return 'hsl(var(--muted-foreground))';
        return 'hsl(var(--primary))';
    };

    return (
        <PullToRefresh onRefresh={onRefresh}>
            <MobilePageShell
                animatePageLoad={false}
                kpiStrip={(
                    <MobileKPIStrip
            loading={showTopSectionLoading}
                        kpis={doctorKpis}
                        activeKpi={filters?.kpiFilter || 'all'}
                        onKpiClick={(id) => setFilters(prev => ({ ...prev, kpiFilter: id }))}
                    />
                )}
                contentClassName="pt-4 pb-4 text-foreground"
            >
                <MobileFeaturedMetric
          loading={showTopSectionLoading}
                    items={[
                        {
                            label: 'Clinical Readiness',
                            value: totals.available,
                            trend: formatSignedPercent(avgRating - 4) || 'LIVE',
                            icon: Stethoscope,
                            color: 'hsl(var(--success))',
                            chartData: growthData
                        },
                        {
                            label: 'On Call Pulse',
                            value: totals.onCall,
                            trend: onCallTrend.delta,
                            icon: Phone,
                            color: 'hsl(var(--info))',
                            chartData: growthData
                        },
                        {
                            label: 'Avg Rating',
                            value: avgRating > 0 ? avgRating.toFixed(1) : '0.0',
                            trend: 'LIVE',
                            icon: Star,
                            color: 'hsl(var(--warning))',
                            chartData: growthData
                        },
                        {
                            label: 'Busy Coverage',
                            value: totals.busy,
                            trend: busyTrend.delta,
                            icon: BadgeX,
                            color: 'hsl(var(--destructive))',
                            chartData: growthData
                        }
                    ]}
                />

                <section className="mb-3">
                    <MobileSectionHeader
                        label="Staff Velocity"
                        count={totals.onCall}
                        color="hsl(var(--info))"
                    />
                    <MobileSecondaryMetricRail
            loading={showTopSectionLoading}
                        variant="icon"
                        items={[
                            {
                                icon: Phone,
                                title: 'On Call',
                                subtitle: 'Current roster',
                                value: totals.onCall,
                                color: 'hsl(var(--info))',
                                iconColorClass: 'text-info',
                                iconBgClass: 'bg-info/5',
                                onClick: onViewAnalytics
                            },
                            {
                                icon: Star,
                                title: 'Avg Rating',
                                subtitle: 'Service quality',
                                value: avgRating > 0 ? avgRating.toFixed(1) : '0.0',
                                color: 'hsl(var(--warning))',
                                iconColorClass: 'text-warning',
                                iconBgClass: 'bg-warning/5',
                                onClick: onViewAnalytics
                            },
                            {
                                icon: BadgeCheck,
                                title: 'Available',
                                subtitle: 'Ready now',
                                value: totals.available,
                                color: 'hsl(var(--success))',
                                iconColorClass: 'text-success',
                                iconBgClass: 'bg-success/5',
                                onClick: onViewAnalytics
                            },
                            {
                                icon: BadgeX,
                                title: 'Busy',
                                subtitle: 'Active load',
                                value: totals.busy,
                                color: 'hsl(var(--destructive))',
                                iconColorClass: 'text-destructive',
                                iconBgClass: 'bg-destructive/5',
                                onClick: onViewAnalytics
                            }
                        ]}
                    />
                </section>

                <div className="flex items-center gap-2 mb-3 px-1">
                    <div className="flex-1 relative group">
                        <Search size={15} className="absolute left-4 top-1/2 z-10 -translate-y-1/2 text-muted-foreground/60 group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="Search doctors..."
                            value={filters?.search || ''}
                            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                            className="w-full h-11 pl-10 pr-4 rounded-2xl apple-glass-heavy border-0 text-[12px] font-normal placeholder:text-muted-foreground/30 focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                        />
                    </div>
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={(event) => {
                            onOpenFilters?.();
                            triggerFromEvent(event, { variant: FEEDBACK_TYPES.INFO, color: 'hsl(var(--spark))', haptic: true, sound: true });
                        }}
                        className="w-11 h-11 rounded-2xl apple-glass-heavy flex items-center justify-center text-muted-foreground/60 active:text-[hsl(var(--spark)/0.92)] hover:text-[hsl(var(--spark)/0.92)] hover:bg-[hsl(var(--spark)/0.08)] transition-[color,background,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] border-0"
                    >
                        <SlidersHorizontal size={18} />
                    </motion.button>
                    {canManage && (
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={(event) => {
                                onViewAnalytics?.();
                                triggerFromEvent(event, { variant: FEEDBACK_TYPES.CLICK, color: 'hsl(var(--spark))', haptic: true, sound: true });
                            }}
                            className="w-11 h-11 rounded-2xl apple-glass-heavy flex items-center justify-center text-[hsl(var(--spark)/0.78)] active:text-[hsl(var(--spark)/0.92)] hover:text-[hsl(var(--spark)/0.92)] hover:bg-[hsl(var(--spark)/0.08)] transition-[color,background,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] border-0 shadow-sm"
                        >
                            <BarChart3 size={18} />
                        </motion.button>
                    )}
                </div>

                <MobileSectionHeader
                    label="Doctor Directory"
                    count={displayDoctors.length}
                    color="hsl(var(--primary))"
                    onSelectAll={displayDoctors.length > 0 ? () => onSelectAll?.(selectedIds.length !== displayDoctors.length, displayDoctors) : null}
                    isAllSelected={displayDoctors.length > 0 && selectedIds.length === displayDoctors.length}
                />

                <div className="space-y-1">
                    <AnimatePresence mode="popLayout">
                        {displayDoctors.map((doctor) => {
                            const status = getStatus(doctor);
                            const color = getStatusColor(status);
                            return (
                                <MobileMetricRow
                                    key={doctor.id}
                                    icon={Stethoscope}
                                    color={color}
                                    label={String(doctor.specialization || 'General').toUpperCase()}
                                    value={doctor.name || 'Unknown Doctor'}
                                    rightBlade={{
                                        badge: status.replace('_', ' ').toUpperCase(),
                                        direction: status === 'available' ? 'up' : status === 'busy' ? 'down' : 'flat',
                                        label: 'Hospital',
                                        value: doctor.hospitals?.name || 'Unassigned',
                                        color
                                    }}
                                    statusIndicators={[
                                        {
                                            icon: status === 'available' ? BadgeCheck : BadgeX,
                                            color: status === 'available' ? 'hsl(var(--success))' : 'hsl(var(--muted-foreground)/0.4)',
                                            label: status
                                        },
                                        {
                                            icon: Hospital,
                                            color: 'hsl(var(--info))',
                                            label: doctor.hospitals?.name || 'No hospital'
                                        }
                                    ]}
                                    isExpanded={expandedDoctorId === doctor.id}
                                    onExpand={(id) => setExpandedDoctorId(prev => (prev === id ? null : id))}
                                    itemId={doctor.id}
                                    isSelected={selectedIds.includes(doctor.id)}
                                    onSelect={onSelect}
                                    selectionMode={selectionMode}
                                    expandedContent={(
                                        <div className="space-y-4 py-3">
                                            <div className="grid grid-cols-1 gap-2">
                                                <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-2xl border-0">
                                                    <Hospital size={14} className="text-muted-foreground/40" />
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Facility</span>
                                                        <span className="text-xs font-semibold truncate">{doctor.hospitals?.name || 'No Hospital'}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-2xl border-0">
                                                    <Phone size={14} className="text-muted-foreground/40" />
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Contact</span>
                                                        <span className="text-xs font-semibold">{doctor.phone || 'No phone'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between px-1">
                                                <div className="flex flex-col">
                                                    <span className="text-[8px] uppercase tracking-widest text-muted-foreground font-medium">Experience</span>
                                                    <span className="text-[10px] font-mono text-foreground/40 font-normal">{doctor.experience || 0} years</span>
                                                </div>
                                                <Badge className="squircle-sm border-0 font-semibold tracking-tight text-[9px] py-1 px-3 bg-warning/20 text-warning">
                                                    <Star className="w-3 h-3 mr-1" />
                                                    {Number(doctor.rating || 0).toFixed(1)}
                                                </Badge>
                                            </div>

                                            <div className="flex gap-2 pt-2">
                                                <Button
                                                    variant="ghost"
                                                    className="flex-1 h-12 rounded-2xl apple-glass border-0 flex items-center justify-center gap-2 active:scale-95 transition-[transform,color,background] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-white/[0.06] active:bg-white/[0.12] hover:text-foreground"
                                                    onClick={() => onView(doctor)}
                                                >
                                                    <Eye size={16} className="text-primary/60" />
                                                    <span className="text-[9px] uppercase font-semibold tracking-[0.2em]">Details</span>
                                                </Button>
                                                {canManage && (
                                                    <>
                                                        <Button
                                                            variant="ghost"
                                                            className="flex-1 h-12 rounded-2xl apple-glass border-0 flex items-center justify-center gap-2 active:scale-95 transition-[transform,color,background] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-white/[0.06] active:bg-white/[0.12] hover:text-foreground"
                                                            onClick={() => onEdit(doctor)}
                                                        >
                                                            <Edit size={16} className="text-warning/60" />
                                                            <span className="text-[9px] uppercase font-semibold tracking-[0.2em]">Edit</span>
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            className="w-12 h-12 rounded-2xl apple-glass border-0 flex items-center justify-center active:scale-95 transition-[transform,color,background] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-destructive/10 active:bg-destructive/15 hover:text-destructive"
                                                            onClick={() => onDelete(doctor)}
                                                        >
                                                            <Trash2 size={16} className="text-destructive/60" />
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                />
                            );
                        })}
                    </AnimatePresence>

                    <div ref={observerTarget} className="min-h-[64px] flex items-center justify-center">
                        {loading && <MobileListSkeletonRows />}
                        {!loading && hasMore && <MobileListLoadMore armed={armed} onRequest={requestLoad} />}
                        {!loading && !hasMore && displayDoctors.length > 0 && <MobileListEnd label="End of doctor list" />}
                    </div>

                    {displayDoctors.length === 0 && !loading && (
                        <MobileListEmpty icon={Stethoscope} label="No doctors found" />
                    )}
                </div>
            </MobilePageShell>
        </PullToRefresh>
    );
};


