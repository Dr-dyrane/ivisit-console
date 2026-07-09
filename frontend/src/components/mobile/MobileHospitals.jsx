import React, { useMemo, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
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
    BadgeCheck,
    BadgeX
} from 'lucide-react';
import { Button } from '../ui/button';
import { MobileKPIStrip } from './MobileKPIStrip';
import { MobileSectionHeader, MobileMetricRow } from './MobileMetricList';
import { MobileSecondaryMetricRail } from './MobileSecondaryMetricCard';
import { PullToRefresh } from './PullToRefresh';
import { MobilePageShell } from './MobilePageShell';
import { MobileListEnd, MobileListEmpty, MobileListSkeletonRows, MobileListLoadMore } from './MobileListStates';
import { useFeedback } from '../../hooks/useFeedback';
import { FEEDBACK_TYPES } from '../../contexts/FeedbackContext';
import { useStableList } from './useStableList';
import { useLoadMoreControl } from './useLoadMoreControl';

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
    canDelete = false,
    selectionEnabled = false,
    selectedIds = [],
    onSelect,
    onSelectAll
}) => {
    const observerTarget = useRef(null);
    const [expandedHospitalId, setExpandedHospitalId] = useState(null);
    const selectionMode = selectionEnabled && selectedIds.length > 0;
    const { triggerFromEvent } = useFeedback();
    const sourceHospitals = useMemo(() => (Array.isArray(hospitals) ? hospitals : []), [hospitals]);

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

    const getHospitalStatus = (hospital) => String(hospital?.status || hospital?.verification_status || 'available').toLowerCase();
    const metricValue = (value, fallback = 0) => {
        const numericValue = Number(value);
        return Number.isFinite(numericValue) ? numericValue : fallback;
    };

    const hospitalTotals = {
        total: metricValue(statistics?.total, sourceHospitals.length),
        available: metricValue(statistics?.available, sourceHospitals.filter(h => getHospitalStatus(h) === 'available').length),
        full: metricValue(statistics?.full, sourceHospitals.filter(h => getHospitalStatus(h) === 'full').length),
        busy: metricValue(statistics?.busy, sourceHospitals.filter(h => getHospitalStatus(h) === 'busy').length),
        verified: metricValue(statistics?.verified, sourceHospitals.filter(h => h.verified).length),
        beds: metricValue(statistics?.visibleBeds, sourceHospitals.reduce((sum, h) => sum + (Number(h.available_beds) || 0), 0)),
        fleet: metricValue(statistics?.visibleAmbulances, sourceHospitals.reduce((sum, h) => sum + (Number(h.ambulances_count) || 0), 0))
    };

    // Literal status hues (sky/emerald/amber) — the semantic tokens (--primary/--success/
    // --warning/--info) all resolve to brand red in this theme and are reserved for danger.
    const kpis = [
        {
            id: 'all',
            label: 'Hospitals',
            value: hospitalTotals.total,
            color: 'hsl(var(--muted-foreground))'
        },
        {
            id: 'available',
            label: 'Available',
            value: hospitalTotals.available,
            color: 'hsl(160 84% 39%)'
        },
        {
            id: 'busy',
            label: 'Busy',
            value: hospitalTotals.busy,
            color: 'hsl(38 92% 50%)'
        },
        {
            id: 'full',
            label: 'Full',
            value: hospitalTotals.full,
            color: 'hsl(var(--destructive))'
        }
    ];

    const { displayItems: displayHospitals } = useStableList(sourceHospitals, loading);
    const showTopSectionLoading = loading && displayHospitals.length === 0;

    const canManage = isAdmin || isOrgAdmin;
    const activeStatusFilter = Array.isArray(filters?.status)
        ? (filters.status.length === 1 ? filters.status[0] : 'all')
        : (filters?.status || 'all');
    const handleStatusFilter = (id) => {
        setFilters(prev => {
            const nextFilters = { ...prev };
            if (id === 'all') {
                delete nextFilters.status;
            } else {
                nextFilters.status = id;
            }
            return nextFilters;
        });
    };

    return (
        <PullToRefresh onRefresh={onRefresh}>
            <MobilePageShell
                animatePageLoad={false}
                kpiStrip={(
                    <MobileKPIStrip
                        loading={showTopSectionLoading}
                        kpis={kpis}
                        activeKpi={activeStatusFilter}
                        onKpiClick={handleStatusFilter}
                    />
                )}
                contentClassName="pt-4 pb-4 text-foreground"
            >
                <section className="mb-3">
                    <MobileSectionHeader
                        label="Facility Signals"
                        count={hospitalTotals.available}
                        color="hsl(160 84% 39%)"
                        labelTone="plain"
                    />
                    <MobileSecondaryMetricRail
                        loading={showTopSectionLoading}
                        variant="icon"
                        items={[
                            {
                                icon: Hospital,
                                title: 'Available Sites',
                                subtitle: 'Current status',
                                value: hospitalTotals.available,
                                color: 'hsl(160 84% 39%)',
                                iconColorClass: 'text-emerald-600 dark:text-emerald-300',
                                iconBgClass: 'bg-emerald-500/10',
                                onClick: onViewAnalytics
                            },
                            {
                                icon: BadgeCheck,
                                title: 'Verified',
                                subtitle: 'Approved sites',
                                value: hospitalTotals.verified,
                                color: 'hsl(38 92% 50%)',
                                iconColorClass: 'text-amber-600 dark:text-amber-300',
                                iconBgClass: 'bg-amber-500/10',
                                onClick: onViewAnalytics
                            },
                            {
                                icon: Bed,
                                title: 'Visible Beds',
                                subtitle: 'This page',
                                value: hospitalTotals.beds,
                                color: 'hsl(189 94% 43%)',
                                iconColorClass: 'text-cyan-700 dark:text-cyan-300',
                                iconBgClass: 'bg-cyan-500/10',
                                onClick: onViewAnalytics
                            },
                            {
                                icon: Ambulance,
                                title: 'Visible Fleet',
                                subtitle: 'This page',
                                value: hospitalTotals.fleet,
                                color: 'hsl(199 89% 48%)',
                                iconColorClass: 'text-sky-700 dark:text-sky-300',
                                iconBgClass: 'bg-sky-500/10',
                                onClick: onViewAnalytics
                            }
                        ]}
                    />
                </section>

                <div className="flex items-center gap-2 mb-3 px-1">
                    <div className="flex-1 relative group">
                        <Search size={15} className="absolute left-4 top-1/2 z-10 -translate-y-1/2 text-muted-foreground/60" />
                        <input
                            type="text"
                            placeholder="Search hospitals..."
                            value={filters?.search || ''}
                            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                            className="w-full h-11 pl-10 pr-4 rounded-button bg-muted/40 text-meta font-normal placeholder:text-muted-foreground/30 shadow-sm transition-all focus-visible:shadow-[0_0_0_3px_hsl(var(--primary)/0.18)]"
                        />
                    </div>
                    <motion.button
                        whileTap={{ scale: 0.96 }}
                        onClick={(event) => {
                            onOpenFilters?.();
                            triggerFromEvent(event, { variant: FEEDBACK_TYPES.INFO, color: 'hsl(var(--spark))', haptic: true, sound: true });
                        }}
                        className="w-11 h-11 rounded-button bg-muted/40 flex items-center justify-center text-muted-foreground/60 active:text-[hsl(var(--spark)/0.92)] hover:text-[hsl(var(--spark)/0.92)] hover:bg-[hsl(var(--spark)/0.08)] transition-[color,background,transform] duration-200 ease-out"
                    >
                        <SlidersHorizontal size={18} />
                    </motion.button>
                    {canManage && (
                        <motion.button
                            whileTap={{ scale: 0.96 }}
                            onClick={(event) => {
                                onViewAnalytics?.();
                                triggerFromEvent(event, { variant: FEEDBACK_TYPES.CLICK, color: 'hsl(var(--spark))', haptic: true, sound: true });
                            }}
                            className="w-11 h-11 rounded-button bg-muted/40 flex items-center justify-center text-[hsl(var(--spark)/0.78)] active:text-[hsl(var(--spark)/0.92)] hover:text-[hsl(var(--spark)/0.92)] hover:bg-[hsl(var(--spark)/0.08)] shadow-sm transition-[color,background,transform] duration-200 ease-out"
                        >
                            <BarChart3 size={18} />
                        </motion.button>
                    )}
                </div>

                <MobileSectionHeader
                    label="Facility Directory"
                    count={displayHospitals.length}
                    color="hsl(var(--muted-foreground))"
                    labelTone="plain"
                    onSelectAll={selectionEnabled && displayHospitals.length > 0 ? () => onSelectAll?.(displayHospitals) : null}
                    isAllSelected={selectionEnabled && displayHospitals.length > 0 && selectedIds.length === displayHospitals.length}
                />

                <div className="space-y-1">
                    {displayHospitals.map((hospital) => {
                            const status = getHospitalStatus(hospital);
                            const statusColor = status === 'available' || status === 'verified'
                                ? 'hsl(160 84% 39%)'
                                : status === 'full' || status === 'pending'
                                    ? 'hsl(38 92% 50%)'
                                    : 'hsl(var(--muted-foreground))';
                            const fleet = Number(hospital.ambulances_count) || 0;
                            const beds = Number(hospital.available_beds) || 0;

                            return (
                                <MobileMetricRow
                                    key={hospital.id}
                                    icon={Hospital}
                                    color={statusColor}
                                    label={status.charAt(0).toUpperCase() + status.slice(1)}
                                    value={hospital.name || 'Unnamed Hospital'}
                                    rightBlade={{
                                        badge: hospital.verified ? 'Verified' : 'Unverified',
                                        direction: hospital.verified ? 'up' : 'flat',
                                        label: 'Fleet',
                                        value: `${fleet} units`,
                                        color: statusColor
                                    }}
                                    statusIndicators={[
                                        {
                                            icon: hospital.verified ? BadgeCheck : BadgeX,
                                            color: hospital.verified ? 'hsl(160 84% 39%)' : 'hsl(var(--muted-foreground)/0.4)',
                                            label: hospital.verified ? 'Verified' : 'Unverified'
                                        },
                                        {
                                            icon: Ambulance,
                                            color: fleet > 0 ? 'hsl(189 94% 43%)' : 'hsl(var(--muted-foreground)/0.35)',
                                            label: `${fleet} ambulances`
                                        }
                                    ]}
                                    isExpanded={expandedHospitalId === hospital.id}
                                    onExpand={(id) => setExpandedHospitalId(prev => (prev === id ? null : id))}
                                    itemId={hospital.id}
                                    isSelected={selectionEnabled && selectedIds.includes(hospital.id)}
                                    onSelect={selectionEnabled ? onSelect : undefined}
                                    selectionMode={selectionMode}
                                    expandedContent={(
                                        <div className="space-y-4 py-3">
                                            <div className="grid grid-cols-1 gap-2">
                                                <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-button">
                                                    <MapPin size={14} className="text-muted-foreground/40" />
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="eyebrow">Address</span>
                                                        <span className="text-xs font-semibold truncate">{hospital.address || 'No address provided'}</span>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-button">
                                                        <Bed size={14} className="text-muted-foreground/40" />
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="eyebrow">Beds</span>
                                                            <span className="text-xs font-semibold font-dashboard-numbers">{beds}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-button">
                                                        <Ambulance size={14} className="text-muted-foreground/40" />
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="eyebrow">Fleet</span>
                                                            <span className="text-xs font-semibold font-dashboard-numbers">{fleet}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between px-1">
                                                <div className="flex flex-col">
                                                    <span className="eyebrow">Hospital ID</span>
                                                    <span className="text-[11px] font-mono text-foreground/40 font-normal">#{(hospital.id || '').slice(0, 12).toUpperCase()}</span>
                                                </div>
                                                <span className="inline-flex items-center rounded-pill font-semibold tracking-tight text-[11px] py-1 px-3 bg-sky-500/20 text-sky-600 dark:text-sky-300">
                                                    <Star className="w-3 h-3 mr-1" />
                                                    {Number(hospital.rating || 0).toFixed(1)}
                                                </span>
                                            </div>

                                            <div className="flex gap-2 pt-2">
                                                <Button
                                                    variant="ghost"
                                                    className="flex-1 h-12 rounded-button bg-background/85 flex items-center justify-center gap-2 active:scale-[0.96] transition-[transform,color,background] duration-200 ease-out hover:bg-white/[0.06] active:bg-white/[0.12] hover:text-foreground"
                                                    onClick={() => onView(hospital)}
                                                >
                                                    <Eye size={16} className="text-muted-foreground" />
                                                    <span className="text-[11px] font-semibold">Details</span>
                                                </Button>
                                                {canManage && (
                                                    <>
                                                        <Button
                                                            variant="ghost"
                                                            className="flex-1 h-12 rounded-button bg-background/85 flex items-center justify-center gap-2 active:scale-[0.96] transition-[transform,color,background] duration-200 ease-out hover:bg-white/[0.06] active:bg-white/[0.12] hover:text-foreground"
                                                            onClick={() => onEdit(hospital)}
                                                        >
                                                            <Edit size={16} className="text-amber-700 dark:text-amber-300" />
                                                            <span className="text-[11px] font-semibold">Edit</span>
                                                        </Button>
                                                        {onSchedule && (
                                                            <Button
                                                                variant="ghost"
                                                                className="w-12 h-12 rounded-button bg-background/85 flex items-center justify-center active:scale-[0.96] transition-[transform,color,background] duration-200 ease-out hover:bg-white/[0.06] active:bg-white/[0.12] hover:text-foreground"
                                                                onClick={() => onSchedule(hospital)}
                                                            >
                                                                <CalendarDays size={16} className="text-cyan-700 dark:text-cyan-300" />
                                                            </Button>
                                                        )}
                                                        {canDelete && onDelete && (
                                                            <Button
                                                                variant="ghost"
                                                                className="w-12 h-12 rounded-button bg-background/85 flex items-center justify-center active:scale-[0.96] transition-[transform,color,background] duration-200 ease-out hover:bg-destructive/10 active:bg-destructive/15 hover:text-destructive"
                                                                onClick={() => onDelete(hospital)}
                                                            >
                                                                <Trash2 size={16} className="text-destructive/60" />
                                                            </Button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                />
                            );
                    })}

                    <div ref={observerTarget} className="min-h-[64px] flex items-center justify-center">
                        {loading && <MobileListSkeletonRows />}
                        {!loading && hasMore && <MobileListLoadMore armed={armed} onRequest={requestLoad} labelTone="plain" />}
                        {!loading && !hasMore && displayHospitals.length > 0 && <MobileListEnd label="End of hospital list" />}
                    </div>

                    {displayHospitals.length === 0 && !loading && (
                        <MobileListEmpty icon={Hospital} label="No hospitals found" labelTone="plain" />
                    )}
                </div>
            </MobilePageShell>
        </PullToRefresh>
    );
};
