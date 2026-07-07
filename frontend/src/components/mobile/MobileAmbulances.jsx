import React, { useMemo, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Ambulance,
    Activity,
    MapPin,
    Eye,
    Edit,
    Search,
    SlidersHorizontal,
    BarChart3,
    BadgeCheck,
    BadgeX,
    Wrench
} from 'lucide-react';
import { Badge } from '../ui/badge';
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

const ACTIVE_FLEET_STATUSES = new Set(['dispatched', 'on_trip', 'en_route', 'on_scene']);

const metricValue = (value, fallback = 0) => {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : fallback;
};

export const MobileAmbulances = ({
    ambulances,
    loading,
    statistics,
    filters,
    setFilters,
    kpiFilter,
    setKpiFilter,
    onView,
    onEdit,
    onRefresh,
    onViewAnalytics,
    isAdmin,
    isOrgAdmin,
    onOpenFilters,
    hasMore,
    onLoadMore,
    selectionEnabled = false,
    selectedIds = [],
    onSelect,
    onSelectAll
}) => {
    const observerTarget = useRef(null);
    const [expandedAmbulanceId, setExpandedAmbulanceId] = useState(null);
    const selectionMode = selectionEnabled && selectedIds.length > 0;
    const canManage = isAdmin || isOrgAdmin;
    const { triggerFromEvent } = useFeedback();
    const sourceAmbulances = useMemo(() => (Array.isArray(ambulances) ? ambulances : []), [ambulances]);

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

    const getStatus = (a) => String(a?.status || 'available').toLowerCase();

    const totals = {
        all: metricValue(statistics?.total, sourceAmbulances.length),
        available: metricValue(statistics?.available, sourceAmbulances.filter(a => getStatus(a) === 'available').length),
        onRoute: metricValue(statistics?.onRoute, sourceAmbulances.filter(a => getStatus(a) === 'on_route' || getStatus(a) === 'en_route').length),
        busy: metricValue(statistics?.busy, sourceAmbulances.filter(a => ACTIVE_FLEET_STATUSES.has(getStatus(a))).length),
        maintenance: metricValue(statistics?.maintenance, sourceAmbulances.filter(a => getStatus(a) === 'maintenance').length)
    };

    const ambulanceKPIs = [
        {
            id: 'all',
            label: 'Fleet',
            value: totals.all,
            color: 'hsl(var(--primary))'
        },
        {
            id: 'available',
            label: 'Ready',
            value: totals.available,
            color: 'hsl(var(--success))'
        },
        {
            id: 'on_route',
            label: 'En route',
            value: totals.onRoute,
            color: 'hsl(var(--warning))'
        },
        {
            id: 'busy',
            label: 'Active',
            value: totals.busy,
            color: 'hsl(var(--info))'
        }
    ];

    const { displayItems: displayAmbulances } = useStableList(sourceAmbulances, loading);
  const showTopSectionLoading = loading && displayAmbulances.length === 0;

    const getStatusColor = (status) => {
        if (status === 'available') return 'hsl(var(--success))';
        if (status === 'on_route' || status === 'en_route') return 'hsl(var(--warning))';
        if (ACTIVE_FLEET_STATUSES.has(status)) return 'hsl(var(--info))';
        if (status === 'maintenance' || status === 'offline') return 'hsl(var(--muted-foreground))';
        return 'hsl(var(--muted-foreground))';
    };

    const getAvailabilityLabel = (status) => {
        if (status === 'available') return 'Ready';
        if (status === 'dispatched') return 'Dispatched';
        if (status === 'on_route' || status === 'en_route') return 'En route';
        if (status === 'on_trip') return 'On trip';
        if (status === 'on_scene') return 'On scene';
        if (status === 'returning') return 'Returning';
        if (status === 'maintenance') return 'Offline';
        if (status === 'pending_approval') return 'Pending';
        return String(status || 'Unknown').replace(/_/g, ' ');
    };

    return (
        <PullToRefresh onRefresh={onRefresh}>
            <MobilePageShell
                animatePageLoad={false}
                kpiStrip={(
                    <MobileKPIStrip
            loading={showTopSectionLoading}
                        kpis={ambulanceKPIs}
                        activeKpi={kpiFilter || 'all'}
                        onKpiClick={(id) => setKpiFilter?.(id)}
                        labelTone="plain"
                    />
                )}
                contentClassName="pt-4 pb-4 text-foreground"
            >
                <section className="mb-3">
                    <MobileSectionHeader
                        label="Fleet signals"
                        count={totals.onRoute}
                        color="hsl(var(--warning))"
                        labelTone="plain"
                    />
                    <MobileSecondaryMetricRail
            loading={showTopSectionLoading}
                        variant="icon"
                        items={[
                            {
                                icon: Activity,
                                title: 'On Route',
                                subtitle: null,
                                value: totals.onRoute,
                                color: 'hsl(var(--warning))',
                                iconColorClass: 'text-warning',
                                iconBgClass: 'bg-warning/5',
                                onClick: onViewAnalytics
                            },
                            {
                                icon: Ambulance,
                                title: 'Active',
                                subtitle: null,
                                value: totals.busy,
                                color: 'hsl(var(--info))',
                                iconColorClass: 'text-info',
                                iconBgClass: 'bg-info/5',
                                onClick: onViewAnalytics
                            },
                            {
                                icon: Ambulance,
                                title: 'Available',
                                subtitle: null,
                                value: totals.available,
                                color: 'hsl(var(--success))',
                                iconColorClass: 'text-success',
                                iconBgClass: 'bg-success/5',
                                onClick: onViewAnalytics
                            },
                            {
                                icon: Wrench,
                                title: 'Maintenance',
                                subtitle: null,
                                value: totals.maintenance,
                                color: 'hsl(var(--muted-foreground))',
                                iconColorClass: 'text-muted-foreground',
                                iconBgClass: 'bg-muted/20',
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
                            placeholder="Search ambulances..."
                            value={filters?.search || ''}
                            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                            className="w-full h-11 pl-10 pr-4 rounded-2xl apple-glass-heavy text-[12px] font-normal placeholder:text-muted-foreground/30 shadow-sm transition-all focus-visible:shadow-[0_0_0_3px_hsl(var(--primary)/0.18)]"
                        />
                    </div>
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={(event) => {
                            onOpenFilters?.();
                            triggerFromEvent(event, { variant: FEEDBACK_TYPES.INFO, color: 'hsl(var(--spark))', haptic: true, sound: true });
                        }}
                        className="w-11 h-11 rounded-2xl apple-glass-heavy flex items-center justify-center text-muted-foreground/60 active:text-[hsl(var(--spark)/0.92)] hover:text-[hsl(var(--spark)/0.92)] hover:bg-[hsl(var(--spark)/0.08)] transition-[color,background,transform] duration-200 ease-out"
                        aria-label="Filter fleet"
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
                            className="w-11 h-11 rounded-2xl apple-glass-heavy flex items-center justify-center text-[hsl(var(--spark)/0.78)] active:text-[hsl(var(--spark)/0.92)] hover:text-[hsl(var(--spark)/0.92)] hover:bg-[hsl(var(--spark)/0.08)] shadow-sm transition-[color,background,transform] duration-200 ease-out"
                            aria-label="Open fleet statistics"
                        >
                            <BarChart3 size={18} />
                        </motion.button>
                    )}
                </div>

                <MobileSectionHeader
                    label="Fleet directory"
                    count={displayAmbulances.length}
                    color="hsl(var(--primary))"
                    labelTone="plain"
                    onSelectAll={selectionEnabled && displayAmbulances.length > 0 ? () => onSelectAll?.(displayAmbulances) : null}
                    isAllSelected={selectionEnabled && displayAmbulances.length > 0 && selectedIds.length === displayAmbulances.length}
                />

                <div className="space-y-1">
                    <AnimatePresence mode="popLayout">
                        {displayAmbulances.map((ambulance) => {
                            const status = getStatus(ambulance);
                            const color = getStatusColor(status);
                            const station = ambulance.station_name || ambulance.hospital || 'No station';
                            return (
                                <MobileMetricRow
                                    key={ambulance.id}
                                    icon={Ambulance}
                                    color={color}
                                    label={String(ambulance.type || 'Standard').toUpperCase()}
                                    value={ambulance.call_sign || 'Unknown Unit'}
                                    rightBlade={{
                                        badge: getAvailabilityLabel(status),
                                        direction: status === 'available' ? 'up' : 'flat',
                                        label: ACTIVE_FLEET_STATUSES.has(status) || status === 'on_route' ? 'ETA' : 'Vehicle',
                                        value: ACTIVE_FLEET_STATUSES.has(status) || status === 'on_route'
                                            ? String(ambulance.eta || 'Unknown')
                                            : (ambulance.vehicle_number || 'N/A'),
                                        color
                                    }}
                                    statusIndicators={[
                                        {
                                            icon: status === 'available' ? BadgeCheck : BadgeX,
                                            color: status === 'available' ? 'hsl(var(--success))' : 'hsl(var(--muted-foreground)/0.4)',
                                            label: status
                                        },
                                        {
                                            icon: MapPin,
                                            color: 'hsl(var(--info))',
                                            label: station
                                        }
                                    ]}
                                    isExpanded={expandedAmbulanceId === ambulance.id}
                                    onExpand={(id) => setExpandedAmbulanceId(prev => (prev === id ? null : id))}
                                    itemId={ambulance.id}
                                    isSelected={selectionEnabled && selectedIds.includes(ambulance.id)}
                                    onSelect={selectionEnabled ? onSelect : undefined}
                                    selectionMode={selectionMode}
                                    expandedContent={(
                                        <div className="space-y-4 py-3">
                                            <div className="grid grid-cols-1 gap-2">
                                                <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-2xl">
                                                    <MapPin size={14} className="text-muted-foreground/40" />
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Station</span>
                                                        <span className="text-xs font-semibold truncate">{station}</span>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-2xl">
                                                        <Activity size={14} className="text-muted-foreground/40" />
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Status</span>
                                                            <span className="text-xs font-semibold">{getAvailabilityLabel(status)}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-2xl">
                                                        <Ambulance size={14} className="text-muted-foreground/40" />
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">ETA</span>
                                                            <span className="text-xs font-semibold font-dashboard-numbers">{ambulance.eta || 'Unknown'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between px-1">
                                                <div className="flex flex-col">
                                                    <span className="text-[8px] uppercase tracking-widest text-muted-foreground font-medium">Vehicle</span>
                                                    <span className="text-[10px] font-mono text-foreground/40 font-normal">{ambulance.vehicle_number || 'N/A'}</span>
                                                </div>
                                                <Badge className="squircle-sm font-semibold tracking-tight text-[9px] py-1 px-3 bg-primary/20 text-primary">
                                                    {String(ambulance.type || 'Standard').toUpperCase()}
                                                </Badge>
                                            </div>

                                            <div className="flex gap-2 pt-2">
                                                <Button
                                                    variant="ghost"
                                                    className="flex-1 h-12 rounded-2xl apple-glass flex items-center justify-center gap-2 active:scale-95 transition-[transform,color,background] duration-200 ease-out hover:bg-white/[0.06] active:bg-white/[0.12] hover:text-foreground"
                                                    onClick={() => onView(ambulance)}
                                                >
                                                    <Eye size={16} className="text-primary/60" />
                                                    <span className="text-[9px] uppercase font-semibold tracking-[0.2em]">Details</span>
                                                </Button>
                                                {canManage && (
                                                    <>
                                                        <Button
                                                            variant="ghost"
                                                            className="flex-1 h-12 rounded-2xl apple-glass flex items-center justify-center gap-2 active:scale-95 transition-[transform,color,background] duration-200 ease-out hover:bg-white/[0.06] active:bg-white/[0.12] hover:text-foreground"
                                                            onClick={() => onEdit(ambulance)}
                                                        >
                                                            <Edit size={16} className="text-warning/60" />
                                                            <span className="text-[9px] uppercase font-semibold tracking-[0.2em]">Edit</span>
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
                        {!loading && hasMore && <MobileListLoadMore armed={armed} onRequest={requestLoad} labelTone="plain" />}
                        {!loading && !hasMore && displayAmbulances.length > 0 && <MobileListEnd label="End of fleet list" />}
                    </div>

                    {displayAmbulances.length === 0 && !loading && (
                        <MobileListEmpty icon={Ambulance} label="No ambulances found" />
                    )}
                </div>
            </MobilePageShell>
        </PullToRefresh>
    );
};
