import React, { useMemo, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Hospital,
    Bed,
    Ambulance,
    MapPin,
    Star,
    Eye,
    Edit,
    Trash2,
    CalendarDays,
    Search,
    SlidersHorizontal,
    BarChart3,
    CheckCircle2,
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
import { MobileListLoadingMore, MobileListEnd, MobileListEmpty } from './MobileListStates';
import { useFeedback } from '../../hooks/useFeedback';
import { FEEDBACK_TYPES } from '../../contexts/FeedbackContext';

export const MobileHospitals = ({
    hospitals,
    loading,
    statistics,
    filters,
    setFilters,
    onView,
    onEdit,
    onDelete,
    onSchedule,
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
    const [expandedHospitalId, setExpandedHospitalId] = useState(null);
    const selectionMode = selectedIds.length > 0;
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

    const getHospitalStatus = (hospital) => String(hospital?.verification_status || hospital?.status || 'available').toLowerCase();

    const hospitalTotals = {
        total: Number(statistics?.total) || hospitals.length,
        available: Number(statistics?.available) || hospitals.filter(h => getHospitalStatus(h) === 'available').length,
        beds: Number(statistics?.totalBeds) || hospitals.reduce((sum, h) => sum + (Number(h.available_beds) || 0), 0),
        fleet: Number(statistics?.totalAmbulances) || hospitals.reduce((sum, h) => sum + (Number(h.ambulances_count) || 0), 0)
    };

    const totalTrend = toDeltaBadge(calcDeltaPercent(hospitalTotals.total, statistics?.previous?.total ?? statistics?.previousTotal));
    const availableTrend = toDeltaBadge(calcDeltaPercent(hospitalTotals.available, statistics?.previous?.available ?? statistics?.previousAvailable));
    const bedsTrend = toDeltaBadge(calcDeltaPercent(hospitalTotals.beds, statistics?.previous?.totalBeds ?? statistics?.previousTotalBeds));
    const fleetTrend = toDeltaBadge(calcDeltaPercent(hospitalTotals.fleet, statistics?.previous?.totalAmbulances ?? statistics?.previousTotalAmbulances));

    const kpis = [
        {
            id: 'all',
            label: 'Hospitals',
            value: hospitalTotals.total,
            color: 'hsl(var(--primary))',
            delta: totalTrend.delta,
            direction: totalTrend.direction
        },
        {
            id: 'available',
            label: 'Available',
            value: hospitalTotals.available,
            color: 'hsl(var(--success))',
            delta: availableTrend.delta,
            direction: availableTrend.direction
        },
        {
            id: 'beds',
            label: 'Beds',
            value: hospitalTotals.beds,
            color: 'hsl(var(--info))',
            delta: bedsTrend.delta,
            direction: bedsTrend.direction
        },
        ...((isAdmin || isOrgAdmin) ? [{
            id: 'fleet',
            label: 'Fleet',
            value: hospitalTotals.fleet,
            color: 'hsl(var(--spark))',
            delta: fleetTrend.delta,
            direction: fleetTrend.direction
        }] : [])
    ];

    const filteredHospitals = useMemo(() => {
        let result = Array.isArray(hospitals) ? [...hospitals] : [];
        const search = String(filters?.search || '').trim().toLowerCase();
        const kpiFilter = String(filters?.kpiFilter || 'all');

        if (search) {
            result = result.filter(h => {
                const name = String(h?.name || '').toLowerCase();
                const address = String(h?.address || '').toLowerCase();
                return name.includes(search) || address.includes(search);
            });
        }

        if (kpiFilter === 'available') {
            result = result.filter(h => getHospitalStatus(h) === 'available');
        }

        return result;
    }, [hospitals, filters]);

    const canManage = isAdmin || isOrgAdmin;
    const averageRating = filteredHospitals.length > 0
        ? filteredHospitals.reduce((sum, h) => sum + (Number(h.rating) || 0), 0) / filteredHospitals.length
        : 0;

    const growthData = useMemo(() => [
        { value: 32 }, { value: 44 }, { value: 51 }, { value: 49 }, { value: 61 }, { value: 69 }
    ], []);

    return (
        <PullToRefresh onRefresh={onRefresh}>
            <MobilePageShell
                kpiStrip={(
                    <MobileKPIStrip
                        kpis={kpis}
                        activeKpi={filters?.kpiFilter || 'all'}
                        onKpiClick={(id) => setFilters(prev => ({ ...prev, kpiFilter: id }))}
                    />
                )}
                contentClassName="px-2 pt-4 pb-4 text-foreground"
            >
                <MobileFeaturedMetric
                    label="Network Capacity"
                    value={hospitalTotals.beds}
                    trend={formatSignedPercent(averageRating - 3.5) || 'LIVE'}
                    icon={Bed}
                    color="hsl(var(--info))"
                    chartData={growthData}
                />

                <section className="mb-3">
                    <MobileSectionHeader
                        label="Operations Pulse"
                        count={hospitalTotals.available}
                        color="hsl(var(--success))"
                    />
                    <MobileSecondaryMetricRail
                        variant="icon"
                        items={[
                            {
                                icon: Hospital,
                                title: 'Available Sites',
                                subtitle: 'Live status',
                                value: hospitalTotals.available,
                                color: 'hsl(var(--success))',
                                iconColorClass: 'text-success',
                                iconBgClass: 'bg-success/5',
                                onClick: onViewAnalytics
                            },
                            {
                                icon: Star,
                                title: 'Avg Rating',
                                subtitle: 'Quality signal',
                                value: averageRating > 0 ? averageRating.toFixed(1) : '0.0',
                                color: 'hsl(var(--warning))',
                                iconColorClass: 'text-warning',
                                iconBgClass: 'bg-warning/5',
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
                            placeholder="Search hospitals..."
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
                    label="Facility Directory"
                    count={filteredHospitals.length}
                    color="hsl(var(--primary))"
                    onSelectAll={filteredHospitals.length > 0 ? () => onSelectAll?.(filteredHospitals) : null}
                    isAllSelected={filteredHospitals.length > 0 && selectedIds.length === filteredHospitals.length}
                />

                <div className="space-y-1">
                    <AnimatePresence mode="popLayout">
                        {filteredHospitals.map((hospital) => {
                            const status = getHospitalStatus(hospital);
                            const statusColor = status === 'available' || status === 'verified'
                                ? 'hsl(var(--success))'
                                : status === 'full' || status === 'pending'
                                    ? 'hsl(var(--warning))'
                                    : 'hsl(var(--muted-foreground))';
                            const fleet = Number(hospital.ambulances_count) || 0;
                            const beds = Number(hospital.available_beds) || 0;

                            return (
                                <MobileMetricRow
                                    key={hospital.id}
                                    icon={Hospital}
                                    color={statusColor}
                                    label={status.toUpperCase()}
                                    value={hospital.name || 'Unnamed Hospital'}
                                    rightBlade={{
                                        badge: hospital.verified ? 'VERIFIED' : 'UNVERIFIED',
                                        direction: hospital.verified ? 'up' : 'flat',
                                        label: 'Fleet',
                                        value: `${fleet} units`,
                                        color: statusColor
                                    }}
                                    statusIndicators={[
                                        {
                                            icon: hospital.verified ? BadgeCheck : BadgeX,
                                            color: hospital.verified ? 'hsl(var(--success))' : 'hsl(var(--muted-foreground)/0.4)',
                                            label: hospital.verified ? 'Verified' : 'Unverified'
                                        },
                                        {
                                            icon: Ambulance,
                                            color: fleet > 0 ? 'hsl(var(--info))' : 'hsl(var(--muted-foreground)/0.35)',
                                            label: `${fleet} ambulances`
                                        }
                                    ]}
                                    isExpanded={expandedHospitalId === hospital.id}
                                    onExpand={(id) => setExpandedHospitalId(prev => (prev === id ? null : id))}
                                    itemId={hospital.id}
                                    isSelected={selectedIds.includes(hospital.id)}
                                    onSelect={onSelect}
                                    selectionMode={selectionMode}
                                    expandedContent={(
                                        <div className="space-y-4 py-3">
                                            <div className="grid grid-cols-1 gap-2">
                                                <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-2xl border-0">
                                                    <MapPin size={14} className="text-muted-foreground/40" />
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Address</span>
                                                        <span className="text-xs font-semibold truncate">{hospital.address || 'No address provided'}</span>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-2xl border-0">
                                                        <Bed size={14} className="text-muted-foreground/40" />
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Beds</span>
                                                            <span className="text-xs font-semibold font-dashboard-numbers">{beds}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-2xl border-0">
                                                        <Ambulance size={14} className="text-muted-foreground/40" />
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Fleet</span>
                                                            <span className="text-xs font-semibold font-dashboard-numbers">{fleet}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between px-1">
                                                <div className="flex flex-col">
                                                    <span className="text-[8px] uppercase tracking-widest text-muted-foreground font-medium">Hospital ID</span>
                                                    <span className="text-[10px] font-mono text-foreground/40 font-normal">#{(hospital.id || '').slice(0, 12).toUpperCase()}</span>
                                                </div>
                                                <Badge className="squircle-sm border-0 font-semibold tracking-tight text-[9px] py-1 px-3 bg-info/20 text-info">
                                                    <Star className="w-3 h-3 mr-1" />
                                                    {Number(hospital.rating || 0).toFixed(1)}
                                                </Badge>
                                            </div>

                                            <div className="flex gap-2 pt-2">
                                                <Button
                                                    variant="ghost"
                                                    className="flex-1 h-12 rounded-2xl apple-glass border-0 flex items-center justify-center gap-2 active:scale-95 transition-[transform,color,background] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-white/[0.06] active:bg-white/[0.12] hover:text-foreground"
                                                    onClick={() => onView(hospital)}
                                                >
                                                    <Eye size={16} className="text-primary/60" />
                                                    <span className="text-[9px] uppercase font-semibold tracking-[0.2em]">Details</span>
                                                </Button>
                                                {canManage && (
                                                    <>
                                                        <Button
                                                            variant="ghost"
                                                            className="flex-1 h-12 rounded-2xl apple-glass border-0 flex items-center justify-center gap-2 active:scale-95 transition-[transform,color,background] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-white/[0.06] active:bg-white/[0.12] hover:text-foreground"
                                                            onClick={() => onEdit(hospital)}
                                                        >
                                                            <Edit size={16} className="text-warning/60" />
                                                            <span className="text-[9px] uppercase font-semibold tracking-[0.2em]">Edit</span>
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            className="w-12 h-12 rounded-2xl apple-glass border-0 flex items-center justify-center active:scale-95 transition-[transform,color,background] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-white/[0.06] active:bg-white/[0.12] hover:text-foreground"
                                                            onClick={() => onSchedule?.(hospital)}
                                                        >
                                                            <CalendarDays size={16} className="text-info/60" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            className="w-12 h-12 rounded-2xl apple-glass border-0 flex items-center justify-center active:scale-95 transition-[transform,color,background] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-destructive/10 active:bg-destructive/15 hover:text-destructive"
                                                            onClick={() => onDelete(hospital)}
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

                    <div ref={observerTarget} className="h-20 flex items-center justify-center">
                        {hasMore && <MobileListLoadingMore label="Loading more hospitals" />}
                        {!hasMore && filteredHospitals.length > 0 && <MobileListEnd label="End of hospital list" />}
                    </div>

                    {filteredHospitals.length === 0 && !loading && (
                        <MobileListEmpty icon={Hospital} label="No hospitals found" />
                    )}
                </div>
            </MobilePageShell>
        </PullToRefresh>
    );
};
