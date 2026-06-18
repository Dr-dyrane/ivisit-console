import React, { useMemo, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Ambulance,
    Activity,
    AlertTriangle,
    MapPin,
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
    const [expandedAmbulanceId, setExpandedAmbulanceId] = useState(null);
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

    const getStatus = (a) => String(a?.status || 'available').toLowerCase();

    const totals = {
        all: Number(statistics?.total) || ambulances.length,
        available: Number(statistics?.available) || ambulances.filter(a => getStatus(a) === 'available').length,
        onRoute: Number(statistics?.onRoute) || ambulances.filter(a => getStatus(a) === 'on_route' || getStatus(a) === 'en_route').length,
        busy: Number(statistics?.busy) || ambulances.filter(a => getStatus(a) === 'busy').length
    };

    const totalTrend = toDeltaBadge(calcDeltaPercent(totals.all, statistics?.previous?.total ?? statistics?.previousTotal));
    const availableTrend = toDeltaBadge(calcDeltaPercent(totals.available, statistics?.previous?.available ?? statistics?.previousAvailable));
    const onRouteTrend = toDeltaBadge(calcDeltaPercent(totals.onRoute, statistics?.previous?.onRoute ?? statistics?.previousOnRoute));
    const busyTrend = toDeltaBadge(calcDeltaPercent(totals.busy, statistics?.previous?.busy ?? statistics?.previousBusy));

    const ambulanceKPIs = [
        {
            id: 'all',
            label: 'Fleet',
            value: totals.all,
            color: 'hsl(var(--primary))',
            delta: totalTrend.delta,
            direction: totalTrend.direction
        },
        {
            id: 'available',
            label: 'Ready',
            value: totals.available,
            color: 'hsl(var(--success))',
            delta: availableTrend.delta,
            direction: availableTrend.direction
        },
        {
            id: 'on_route',
            label: 'En Route',
            value: totals.onRoute,
            color: 'hsl(var(--warning))',
            delta: onRouteTrend.delta,
            direction: onRouteTrend.direction
        },
        {
            id: 'busy',
            label: 'Busy',
            value: totals.busy,
            color: 'hsl(var(--destructive))',
            delta: busyTrend.delta,
            direction: busyTrend.direction
        }
    ];

    const filteredAmbulances = useMemo(() => {
        let result = Array.isArray(ambulances) ? [...ambulances] : [];
        const search = String(filters?.search || '').trim().toLowerCase();

        if (search) {
            result = result.filter(a => {
                const callSign = String(a?.call_sign || '').toLowerCase();
                const vehicle = String(a?.vehicle_number || '').toLowerCase();
                const station = String(a?.hospital || '').toLowerCase();
                return callSign.includes(search) || vehicle.includes(search) || station.includes(search);
            });
        }

        if (kpiFilter && kpiFilter !== 'all') {
            if (kpiFilter === 'on_route') {
                result = result.filter(a => {
                    const status = getStatus(a);
                    return status === 'on_route' || status === 'en_route';
                });
            } else {
                result = result.filter(a => getStatus(a) === kpiFilter);
            }
        }

        return result;
    }, [ambulances, filters, kpiFilter]);
    const { displayItems: displayAmbulances, isBuffering } = useStableList(filteredAmbulances, loading);
  const showTopSectionLoading = loading && displayAmbulances.length === 0;

    const growthData = useMemo(() => [
        { value: 26 }, { value: 38 }, { value: 54 }, { value: 48 }, { value: 66 }, { value: 72 }
    ], []);

    const avgRating = filteredAmbulances.length > 0
        ? filteredAmbulances.reduce((sum, a) => sum + (Number(a.rating) || 0), 0) / filteredAmbulances.length
        : 0;

    const getStatusColor = (status) => {
        if (status === 'available') return 'hsl(var(--success))';
        if (status === 'on_route' || status === 'en_route') return 'hsl(var(--warning))';
        if (status === 'busy') return 'hsl(var(--destructive))';
        return 'hsl(var(--muted-foreground))';
    };

    const getAvailabilityLabel = (status) => {
        if (status === 'available') return 'READY';
        if (status === 'on_route' || status === 'en_route') return 'ACTIVE';
        if (status === 'busy') return 'ENGAGED';
        if (status === 'maintenance') return 'OFFLINE';
        return status.toUpperCase();
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
                    />
                )}
                contentClassName="pt-4 pb-4 text-foreground"
            >
                <MobileFeaturedMetric
          loading={showTopSectionLoading}
                    items={[
                        {
                            label: 'Fleet Response',
                            value: totals.available,
                            trend: formatSignedPercent(avgRating - 4) || 'LIVE',
                            icon: Ambulance,
                            color: 'hsl(var(--success))',
                            chartData: growthData
                        },
                        {
                            label: 'On Route',
                            value: totals.onRoute,
                            trend: onRouteTrend.delta,
                            icon: Activity,
                            color: 'hsl(var(--warning))',
                            chartData: growthData
                        },
                        {
                            label: 'Avg Rating',
                            value: avgRating > 0 ? avgRating.toFixed(1) : '0.0',
                            trend: 'LIVE',
                            icon: Star,
                            color: 'hsl(var(--info))',
                            chartData: growthData
                        },
                        {
                            label: 'Busy Units',
                            value: totals.busy,
                            trend: busyTrend.delta,
                            icon: AlertTriangle,
                            color: 'hsl(var(--destructive))',
                            chartData: growthData
                        }
                    ]}
                />

                <section className="mb-3">
                    <MobileSectionHeader
                        label="Operations Pulse"
                        count={totals.onRoute}
                        color="hsl(var(--warning))"
                    />
                    <MobileSecondaryMetricRail
            loading={showTopSectionLoading}
                        variant="icon"
                        items={[
                            {
                                icon: Activity,
                                title: 'On Route',
                                subtitle: 'Live dispatch',
                                value: totals.onRoute,
                                color: 'hsl(var(--warning))',
                                iconColorClass: 'text-warning',
                                iconBgClass: 'bg-warning/5',
                                onClick: onViewAnalytics
                            },
                            {
                                icon: Star,
                                title: 'Avg Rating',
                                subtitle: 'Service quality',
                                value: avgRating > 0 ? avgRating.toFixed(1) : '0.0',
                                color: 'hsl(var(--info))',
                                iconColorClass: 'text-info',
                                iconBgClass: 'bg-info/5',
                                onClick: onViewAnalytics
                            },
                            {
                                icon: Ambulance,
                                title: 'Available',
                                subtitle: 'Ready now',
                                value: totals.available,
                                color: 'hsl(var(--success))',
                                iconColorClass: 'text-success',
                                iconBgClass: 'bg-success/5',
                                onClick: onViewAnalytics
                            },
                            {
                                icon: AlertTriangle,
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
                            placeholder="Search ambulances..."
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
                    label="Fleet Directory"
                    count={displayAmbulances.length}
                    color="hsl(var(--primary))"
                    onSelectAll={displayAmbulances.length > 0 ? () => onSelectAll?.(selectedIds.length !== displayAmbulances.length, displayAmbulances) : null}
                    isAllSelected={displayAmbulances.length > 0 && selectedIds.length === displayAmbulances.length}
                />

                <div className="space-y-1">
                    <AnimatePresence mode="popLayout">
                        {displayAmbulances.map((ambulance) => {
                            const status = getStatus(ambulance);
                            const color = getStatusColor(status);
                            return (
                                <MobileMetricRow
                                    key={ambulance.id}
                                    icon={Ambulance}
                                    color={color}
                                    label={String(ambulance.type || 'Standard').toUpperCase()}
                                    value={ambulance.call_sign || 'Unknown Unit'}
                                    rightBlade={{
                                        badge: getAvailabilityLabel(status),
                                        direction: status === 'available' ? 'up' : status === 'busy' ? 'down' : 'flat',
                                        label: status === 'on_route' || status === 'en_route' ? 'ETA' : 'Vehicle',
                                        value: status === 'on_route' || status === 'en_route'
                                            ? String(ambulance.eta || 'N/A')
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
                                            label: ambulance.hospital || 'HQ'
                                        }
                                    ]}
                                    isExpanded={expandedAmbulanceId === ambulance.id}
                                    onExpand={(id) => setExpandedAmbulanceId(prev => (prev === id ? null : id))}
                                    itemId={ambulance.id}
                                    isSelected={selectedIds.includes(ambulance.id)}
                                    onSelect={onSelect}
                                    selectionMode={selectionMode}
                                    expandedContent={(
                                        <div className="space-y-4 py-3">
                                            <div className="grid grid-cols-1 gap-2">
                                                <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-2xl border-0">
                                                    <MapPin size={14} className="text-muted-foreground/40" />
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Station</span>
                                                        <span className="text-xs font-semibold truncate">{ambulance.hospital || 'HQ'}</span>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-2xl border-0">
                                                        <Activity size={14} className="text-muted-foreground/40" />
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Status</span>
                                                            <span className="text-xs font-semibold">{getAvailabilityLabel(status)}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-2xl border-0">
                                                        <Star size={14} className="text-muted-foreground/40" />
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Rating</span>
                                                            <span className="text-xs font-semibold font-dashboard-numbers">{Number(ambulance.rating || 0).toFixed(1)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between px-1">
                                                <div className="flex flex-col">
                                                    <span className="text-[8px] uppercase tracking-widest text-muted-foreground font-medium">Vehicle</span>
                                                    <span className="text-[10px] font-mono text-foreground/40 font-normal">{ambulance.vehicle_number || 'N/A'}</span>
                                                </div>
                                                <Badge className="squircle-sm border-0 font-semibold tracking-tight text-[9px] py-1 px-3 bg-primary/20 text-primary">
                                                    {String(ambulance.type || 'Standard').toUpperCase()}
                                                </Badge>
                                            </div>

                                            <div className="flex gap-2 pt-2">
                                                <Button
                                                    variant="ghost"
                                                    className="flex-1 h-12 rounded-2xl apple-glass border-0 flex items-center justify-center gap-2 active:scale-95 transition-[transform,color,background] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-white/[0.06] active:bg-white/[0.12] hover:text-foreground"
                                                    onClick={() => onView(ambulance)}
                                                >
                                                    <Eye size={16} className="text-primary/60" />
                                                    <span className="text-[9px] uppercase font-semibold tracking-[0.2em]">Details</span>
                                                </Button>
                                                {canManage && (
                                                    <>
                                                        <Button
                                                            variant="ghost"
                                                            className="flex-1 h-12 rounded-2xl apple-glass border-0 flex items-center justify-center gap-2 active:scale-95 transition-[transform,color,background] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-white/[0.06] active:bg-white/[0.12] hover:text-foreground"
                                                            onClick={() => onEdit(ambulance)}
                                                        >
                                                            <Edit size={16} className="text-warning/60" />
                                                            <span className="text-[9px] uppercase font-semibold tracking-[0.2em]">Edit</span>
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            className="w-12 h-12 rounded-2xl apple-glass border-0 flex items-center justify-center active:scale-95 transition-[transform,color,background] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-destructive/10 active:bg-destructive/15 hover:text-destructive"
                                                            onClick={() => onDelete(ambulance)}
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


