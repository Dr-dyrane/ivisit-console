import React, { useMemo, useEffect, useRef, useState } from 'react';
import {
    Ambulance,
    Activity,
    MapPin,
    Eye,
    Edit,
    Car,
    Clock,
    Hash,
    Radio,
    Wrench
} from 'lucide-react';
// Canon kit re-composition (2026-07-09, pre-rebuild changelog in
// docs/audit/FEATURE_PARITY_VS_MAIN.md): SearchRow bakes in the 300ms debounce this
// page lacked + clear-x + haptic triggers; useSkeletonWarmup covers cached bottom-nav
// mounts; UpdatingPillRow is the background-refetch signal. The dropdown-row
// pseudo-sheet became the canonical MobileDetailSheet (Doctors/Insurance grammar —
// NOT the Hospitals GroupPanel pilot; siblings hold until that look is approved).
import { SearchRow, useSkeletonWarmup, UpdatingPillRow } from './canon';
import { MobileKPIStrip } from './MobileKPIStrip';
import { MobileSectionHeader, MobileMetricRow } from './MobileMetricList';
import { MobileSecondaryMetricRail } from './MobileSecondaryMetricCard';
import { MobileDetailSheet } from './MobileDetailSheet';
import { PullToRefresh } from './PullToRefresh';
import { MobilePageShell } from './MobilePageShell';
import { MobileListEnd, MobileListEmpty, MobileListSkeletonRows, MobileListLoadMore } from './MobileListStates';
import { useStableList } from './useStableList';
import { useLoadMoreControl } from './useLoadMoreControl';
import { statusPill } from '../../constants/vitalTracks';

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
    errorMessage = null,
    onRetry,
    selectionEnabled = false,
    selectedIds = [],
    onSelect,
    onSelectAll
}) => {
    const observerTarget = useRef(null);
    const [activeAmbulance, setActiveAmbulance] = useState(null);
    const selectionMode = selectionEnabled && selectedIds.length > 0;
    const canManage = isAdmin || isOrgAdmin;
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

    // Literal status hues (emerald/amber/cyan) — the semantic tokens (--primary/--success/
    // --warning/--info) all resolve to brand red in this theme and are reserved for danger.
    const ambulanceKPIs = [
        {
            id: 'all',
            label: 'Fleet',
            value: totals.all,
            color: 'hsl(var(--muted-foreground))'
        },
        {
            id: 'available',
            label: 'Ready',
            value: totals.available,
            color: 'hsl(160 84% 39%)'
        },
        {
            id: 'on_route',
            label: 'En route',
            value: totals.onRoute,
            color: 'hsl(38 92% 50%)'
        },
        {
            id: 'busy',
            label: 'Active',
            value: totals.busy,
            color: 'hsl(189 94% 43%)'
        }
    ];

    const { displayItems: displayAmbulances, isBuffering } = useStableList(sourceAmbulances, loading);
    const warmingUp = useSkeletonWarmup();
    const showTopSectionLoading = warmingUp || (loading && displayAmbulances.length === 0);

    const getStatusColor = (status) => {
        if (status === 'available') return 'hsl(160 84% 39%)';
        if (status === 'on_route' || status === 'en_route') return 'hsl(38 92% 50%)';
        if (ACTIVE_FLEET_STATUSES.has(status)) return 'hsl(189 94% 43%)';
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
                    />
                )}
                contentClassName="pt-4 pb-4 text-foreground"
            >
                <section className="mb-3">
                    <MobileSectionHeader
                        label="Fleet signals"
                        count={totals.onRoute}
                        color="hsl(38 92% 50%)"
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
                                color: 'hsl(38 92% 50%)',
                                iconColorClass: 'text-amber-600 dark:text-amber-300',
                                iconBgClass: 'bg-amber-500/10',
                                onClick: onViewAnalytics
                            },
                            {
                                icon: Ambulance,
                                title: 'Active',
                                subtitle: null,
                                value: totals.busy,
                                color: 'hsl(189 94% 43%)',
                                iconColorClass: 'text-cyan-700 dark:text-cyan-300',
                                iconBgClass: 'bg-cyan-500/10',
                                onClick: onViewAnalytics
                            },
                            {
                                icon: Ambulance,
                                title: 'Available',
                                subtitle: null,
                                value: totals.available,
                                color: 'hsl(160 84% 39%)',
                                iconColorClass: 'text-emerald-600 dark:text-emerald-300',
                                iconBgClass: 'bg-emerald-500/10',
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

                <div className="mb-3 px-1">
                    {/* SearchRow bakes the trigger aria-labels from its props:
                        entityLabel="fleet" -> "Filter fleet"; statsLabel carries
                        "Open fleet statistics" verbatim. */}
                    <SearchRow
                        placeholder="Search ambulances..."
                        search={filters?.search || ''}
                        onSearchCommit={(value) => setFilters(prev => ({ ...prev, search: value }))}
                        entityLabel="fleet"
                        onOpenFilters={onOpenFilters}
                        onOpenStats={canManage ? onViewAnalytics : null}
                        statsLabel="Open fleet statistics"
                    />
                </div>

                <MobileSectionHeader
                    label="Fleet directory"
                    count={displayAmbulances.length}
                    color="hsl(var(--muted-foreground))"
                    labelTone="plain"
                    onSelectAll={selectionEnabled && displayAmbulances.length > 0 ? () => onSelectAll?.(displayAmbulances) : null}
                    isAllSelected={selectionEnabled && displayAmbulances.length > 0 && selectedIds.length === displayAmbulances.length}
                />

                {errorMessage && displayAmbulances.length > 0 && (
                    <div
                        className="mb-3 rounded-card bg-destructive/10 p-4 text-destructive"
                        data-testid="mobile-ambulances-degraded-state"
                    >
                        <p className="text-sm font-semibold">Fleet did not refresh</p>
                        <p className="mt-1 text-xs text-destructive/75">Showing the last loaded fleet rows.</p>
                        {onRetry && (
                            <button
                                type="button"
                                onClick={onRetry}
                                className="mt-3 h-9 rounded-inner bg-destructive/10 px-4 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/15 active:scale-[0.96]"
                            >
                                Try again
                            </button>
                        )}
                    </div>
                )}

                <div className="space-y-1">
                    {displayAmbulances.map((ambulance) => {
                            const status = getStatus(ambulance);
                            const color = getStatusColor(status);
                            const station = ambulance.station_name || ambulance.hospital || 'No station';
                            const typeLabel = String(ambulance.type || 'Standard');
                            const activeRun = ACTIVE_FLEET_STATUSES.has(status) || status === 'on_route';
                            // The defining detail rides the readable secondary line, not a
                            // decorative blade (Pricing precedent): ETA while on a run,
                            // vehicle identity at rest.
                            const secondary = activeRun && ambulance.eta
                                ? `${station} · ETA ${ambulance.eta}`
                                : `${station} · ${ambulance.vehicle_label || ambulance.vehicle_number || 'No vehicle ID'}`;
                            return (
                                <MobileMetricRow
                                    key={ambulance.id}
                                    icon={Ambulance}
                                    color={color}
                                    label={typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)}
                                    value={ambulance.call_sign || 'Unknown Unit'}
                                    secondary={secondary}
                                    statusPill={statusPill(status, getAvailabilityLabel(status))}
                                    // Tap opens the canonical detail bottom sheet (MobileDetailSheet),
                                    // not an inline dropdown — the approved mobile design + the
                                    // desktop detail-rail behaviour.
                                    onClick={() => setActiveAmbulance(ambulance)}
                                    itemId={ambulance.id}
                                    isSelected={selectionEnabled && selectedIds.includes(ambulance.id)}
                                    onSelect={selectionEnabled ? onSelect : undefined}
                                    selectionMode={selectionMode}
                                />
                            );
                    })}

                    <div ref={observerTarget} className="min-h-[64px] flex flex-col items-center justify-center gap-2">
                        {showTopSectionLoading && <MobileListSkeletonRows />}
                        <UpdatingPillRow show={isBuffering && !showTopSectionLoading} />
                        {!loading && hasMore && <MobileListLoadMore armed={armed} onRequest={requestLoad} labelTone="plain" />}
                        {!loading && !hasMore && displayAmbulances.length > 0 && <MobileListEnd label="End of fleet list" />}
                    </div>

                    {displayAmbulances.length === 0 && !loading && !showTopSectionLoading && (
                        <MobileListEmpty
                            icon={Ambulance}
                            label={errorMessage ? 'Fleet did not load' : 'No ambulances found'}
                            hint={errorMessage ? 'Try again before treating the fleet as empty.' : undefined}
                            labelTone="plain"
                        />
                    )}
                </div>

                {activeAmbulance && (() => {
                    const status = getStatus(activeAmbulance);
                    const color = getStatusColor(status);
                    const station = activeAmbulance.station_name || activeAmbulance.hospital || 'No station';
                    const typeLabel = String(activeAmbulance.type || 'Standard');
                    const activeRun = ACTIVE_FLEET_STATUSES.has(status) || status === 'on_route';
                    // Display IDs are labels: prefer the service-projected display_id; the
                    // truncated UUID is only a fallback, never mutation identity. Same for
                    // the active-call reference (a label, not a link — Requests has no ?id
                    // receiver to deep-link into).
                    const unitId = activeAmbulance.display_id || `#${String(activeAmbulance.id || '').slice(0, 12).toUpperCase()}`;
                    const vehicleLabel = activeAmbulance.vehicle_label
                        || activeAmbulance.license_plate
                        || activeAmbulance.vehicle_number
                        || null;

                    return (
                        <MobileDetailSheet
                            isOpen={!!activeAmbulance}
                            onClose={() => setActiveAmbulance(null)}
                            icon={Ambulance}
                            iconTone={color}
                            eyebrow={typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)}
                            title={activeAmbulance.call_sign || 'Unknown Unit'}
                            statusPill={statusPill(status, getAvailabilityLabel(status))}
                            islands={[
                                { icon: MapPin, label: 'Station', value: station },
                                activeRun && { icon: Clock, label: 'ETA', value: activeAmbulance.eta || 'Unknown' },
                                vehicleLabel && { icon: Car, label: 'Vehicle', value: vehicleLabel },
                                activeAmbulance.current_call && {
                                    icon: Radio,
                                    label: 'Active call',
                                    value: `Request ${String(activeAmbulance.current_call).slice(0, 8).toUpperCase()}`
                                },
                                { icon: Activity, label: 'Status', value: getAvailabilityLabel(status) },
                                { icon: Hash, label: 'Unit ID', value: unitId },
                            ]}
                            primary={{ label: 'Details', icon: Eye, onClick: () => { setActiveAmbulance(null); onView(activeAmbulance); } }}
                            secondary={canManage ? { icon: Edit, onClick: () => { setActiveAmbulance(null); onEdit(activeAmbulance); }, 'aria-label': `Edit ${activeAmbulance.call_sign || 'unit'}` } : undefined}
                        />
                    );
                })()}
            </MobilePageShell>
        </PullToRefresh>
    );
};
