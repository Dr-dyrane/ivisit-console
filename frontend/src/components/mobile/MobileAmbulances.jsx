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
    Radio
} from 'lucide-react';
// LIST-type page, DIRECTORY expression (MOBILE_DESIGN_SYSTEM §5) — built harness-first
// 2026-07-10: the grammar linter (check-mobile-grammar.js) emitted the exact to-do
// (heading + grouped panel + group skeleton + no metric rail + accumulator) and this
// composes to satisfy it. A fleet has no recency to bucket by, so panels group by the
// dispatcher's real orthogonal axis — STATION (the chips filter status; the groups
// answer "who's ready, and WHERE"). Trailing time = ETA on a run, else availability
// freshness (a stale "ready" unit is the dispatcher's risk).
import { SearchRow, useSkeletonWarmup, UpdatingPillRow, MobileHeading, GroupPanel, MobileListRow, Hairline, SkeletonGroupPanel } from './canon';
import { MobileKPIStrip } from './MobileKPIStrip';
import { MobileDetailSheet } from './MobileDetailSheet';
import { PullToRefresh } from './PullToRefresh';
import { MobilePageShell } from './MobilePageShell';
import { MobileListEnd, MobileListEmpty, MobileListLoadMore } from './MobileListStates';
import { useStableList } from './useStableList';
import { useLoadMoreControl } from './useLoadMoreControl';
import { statusPill } from '../../constants/vitalTracks';
import { formatRelativeTime } from '../../utils/activityUtils';

const ACTIVE_FLEET_STATUSES = new Set(['dispatched', 'on_trip', 'en_route', 'on_scene']);

const metricValue = (value, fallback = 0) => {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : fallback;
};

// Atlas stage (donor recipe: MobileVisitsAtlasLayer — Lesson 25 macro-stage item 1;
// ambient brand tint is sanctioned expression, Lesson 18).
const MobileAmbulancesAtlasLayer = () => (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-background">
        <div
            className="absolute inset-0 opacity-[0.28] dark:opacity-[0.22]"
            style={{
                backgroundImage:
                    'linear-gradient(118deg, transparent 0 46%, hsl(var(--foreground) / 0.055) 46% 49%, transparent 49%), linear-gradient(32deg, transparent 0 42%, hsl(var(--foreground) / 0.045) 42% 45%, transparent 45%), linear-gradient(154deg, transparent 0 64%, hsl(var(--primary) / 0.07) 64% 67%, transparent 67%)',
                backgroundSize: '250px 178px, 330px 236px, 410px 276px',
                backgroundPosition: '18px 10px, -72px 48px, 16% 38%',
            }}
        />
        <div
            className="absolute inset-0"
            style={{
                background:
                    'radial-gradient(circle at 20% 32%, hsl(var(--primary) / 0.10), transparent 28%), radial-gradient(circle at 82% 62%, hsl(var(--foreground) / 0.055), transparent 26%), linear-gradient(180deg, hsl(var(--background) / 0.18), hsl(var(--background)) 92%)',
            }}
        />
    </div>
);

// Filter-trigger truth (donor: hasMobileRequestFilters / hasMobileVisitFilters):
// any committed narrowing counts, so the trigger's filtered state never lies. The
// status chips are kpiFilter (separate axis), not part of the sheet-filter signal.
const hasMobileFleetFilters = (filters = {}) => Boolean(
    filters?.search ||
    filters?.type ||
    filters?.station ||
    filters?.created_at?.start ||
    filters?.created_at?.end
);

// The unit's home base — the fleet directory's orthogonal grouping axis.
const getStation = (a) => a?.station_name || a?.hospital || null;

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
    filterSheetOpen = false,
    analyticsOpen = false,
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
    // Selection props stay accepted as dormant inventory (fail-closed estate-wide);
    // the kit MobileListRow carries no selection affordance until receiver proof.
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
        { id: 'all', label: 'Fleet', value: totals.all, color: 'hsl(var(--muted-foreground))' },
        { id: 'available', label: 'Ready', value: totals.available, color: 'hsl(160 84% 39%)' },
        { id: 'on_route', label: 'En route', value: totals.onRoute, color: 'hsl(38 92% 50%)' },
        { id: 'busy', label: 'Active', value: totals.busy, color: 'hsl(189 94% 43%)' }
    ];

    // Load-more ACCUMULATES (id-keyed store; the RQ page cache serves one window at a
    // time, so this stitches windows into the growing list). The rule is provably
    // correct for the three real transitions — verified by the Gate-1 deterministic
    // harness (which caught the earlier `provisional`-flag version silently REPLACING
    // on the first same-scope page):
    //   • scope change (search/filter/chip) -> reset + absorb (fresh scope);
    //   • same-scope NON-EMPTY source (load-more, realtime, placeholder) -> APPEND;
    //   • same-scope EMPTY settled source (no-match) -> clear (kills placeholder
    //     poisoning: a stale window can't sit under a "0 units" heading).
    // The last-page-empty edge can't fire: `hasMore` gates onLoadMore, so an empty
    // window only occurs for a genuinely empty scope. (Kit useScopeAccumulator, when
    // extracted, should key on the query offset to retire this heuristic entirely.)
    const filterSignature = JSON.stringify({
        search: filters?.search || '',
        type: filters?.type || null,
        station: filters?.station || null,
        date: filters?.created_at || null,
        kpi: kpiFilter || 'all',
    });
    const accumulatorRef = useRef({ signature: null, order: [], byId: new Map(), lastSource: null });
    const ambulanceRows = useMemo(() => {
        const store = accumulatorRef.current;
        const reset = () => { store.order = []; store.byId = new Map(); };
        const absorb = (row) => {
            const id = row?.id;
            if (id === null || id === undefined) return;
            if (!store.byId.has(id)) store.order.push(id);
            store.byId.set(id, row);
        };
        if (store.signature !== filterSignature) {
            store.signature = filterSignature;
            store.lastSource = sourceAmbulances;
            reset();
            sourceAmbulances.forEach(absorb);
        } else if (store.lastSource !== sourceAmbulances) {
            store.lastSource = sourceAmbulances;
            if (sourceAmbulances.length === 0) reset();
            else sourceAmbulances.forEach(absorb);
        }
        return store.order.map((id) => store.byId.get(id));
    }, [sourceAmbulances, filterSignature]);

    const { displayItems: displayAmbulances, isBuffering } = useStableList(ambulanceRows, loading);
    const warmingUp = useSkeletonWarmup();
    const showTopSectionLoading = warmingUp || (loading && displayAmbulances.length === 0);

    // Count integrity (§5): the heading tracks the ACTIVE KPI scope, never the raw total.
    const kpiToTotal = { all: 'all', available: 'available', on_route: 'onRoute', busy: 'busy' };
    const scopeCount = totals[kpiToTotal[kpiFilter] || 'all'] ?? totals.all;

    const hasFilter = hasMobileFleetFilters(filters);

    // Directory grouping: by STATION (render-only, orthogonal to the status chips).
    // Unassigned units bucket last; empty groups drop.
    const stationGroups = useMemo(() => {
        const byStation = new Map();
        const unassigned = [];
        displayAmbulances.forEach((a) => {
            const s = getStation(a);
            if (!s) { unassigned.push(a); return; }
            if (!byStation.has(s)) byStation.set(s, []);
            byStation.get(s).push(a);
        });
        const groups = [...byStation.entries()]
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([label, items]) => ({ key: label, label, items }));
        if (unassigned.length) groups.push({ key: '__unassigned', label: 'Unassigned', items: unassigned });
        return groups;
    }, [displayAmbulances]);

    const getStatusColor = (status) => {
        if (status === 'available') return 'hsl(160 84% 39%)';
        if (status === 'on_route' || status === 'en_route') return 'hsl(38 92% 50%)';
        if (ACTIVE_FLEET_STATUSES.has(status)) return 'hsl(189 94% 43%)';
        if (status === 'maintenance' || status === 'offline') return 'hsl(var(--muted-foreground))';
        return 'hsl(var(--muted-foreground))';
    };

    const orbClassFor = (status) => (
        status === 'available'
            ? 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-300'
            : status === 'on_route' || status === 'en_route'
                ? 'bg-amber-500/12 text-amber-700 dark:text-amber-300'
                : ACTIVE_FLEET_STATUSES.has(status)
                    ? 'bg-cyan-500/12 text-cyan-700 dark:text-cyan-300'
                    : 'bg-muted/40 text-muted-foreground'
    );

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

    const renderAmbulanceRow = (ambulance) => {
        const status = getStatus(ambulance);
        const typeLabel = String(ambulance.type || 'Standard');
        const activeRun = ACTIVE_FLEET_STATUSES.has(status) || status === 'on_route';
        const vehicle = ambulance.vehicle_label || ambulance.license_plate || ambulance.vehicle_number || 'No vehicle ID';
        // Station is the GROUP header, so the row meta leads with the next
        // discriminating facts: type + vehicle identity.
        const meta = `${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)} · ${vehicle}`;
        // Trailing time: ETA while committed, availability freshness at rest (a stale
        // "ready" unit is the dispatcher's risk; updated_at is the honest fallback).
        const time = activeRun
            ? (ambulance.eta ? String(ambulance.eta) : 'En route')
            : formatRelativeTime(ambulance.updated_at);

        return (
            <MobileListRow
                item={ambulance}
                dataAttr="data-mobile-ambulance-row"
                onOpen={setActiveAmbulance}
                ariaLabel={`${ambulance.call_sign || 'Unknown Unit'}, ${getAvailabilityLabel(status)}`}
                orbClass={orbClassFor(status)}
                icon={Ambulance}
                title={ambulance.call_sign || 'Unknown Unit'}
                meta={meta}
                time={time}
                pill={statusPill(status, getAvailabilityLabel(status))}
            />
        );
    };

    return (
        <PullToRefresh onRefresh={onRefresh}>
            <MobilePageShell
                animatePageLoad={false}
                contentClassName="relative min-h-[calc(100dvh-3rem)] overflow-hidden px-0 pb-32 pt-8 text-foreground"
            >
                <MobileAmbulancesAtlasLayer />
                <div className="relative z-10 space-y-3">
                {/* Chrome (title + summary) is always present — no entrance motion. */}
                <MobileHeading
                    title="Ambulances"
                    noun="unit"
                    count={scopeCount}
                    showSkeleton={showTopSectionLoading}
                    failedEmpty={Boolean(errorMessage) && displayAmbulances.length === 0}
                />

                <MobileKPIStrip
                    loading={showTopSectionLoading}
                    kpis={ambulanceKPIs}
                    activeKpi={kpiFilter || 'all'}
                    onKpiClick={(id) => setKpiFilter?.(id)}
                />

                <section className="px-4">
                    <SearchRow
                        placeholder="Search ambulances..."
                        search={filters?.search || ''}
                        onSearchCommit={(value) => setFilters(prev => ({ ...prev, search: value }))}
                        entityLabel="fleet"
                        onOpenFilters={onOpenFilters}
                        filterSheetOpen={filterSheetOpen}
                        hasFilter={hasFilter}
                        onOpenStats={canManage ? onViewAnalytics : null}
                        statsOpen={analyticsOpen}
                        statsLabel="Open fleet statistics"
                    />

                    <UpdatingPillRow show={isBuffering && !showTopSectionLoading} />

                    <div className="mt-3 space-y-2">
                        {errorMessage && displayAmbulances.length > 0 && (
                            <div
                                className="rounded-card bg-destructive/10 p-4 text-destructive"
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

                        {/* Group-shaped skeleton (§5.2): mirrors the panel 1:1 for
                            replace-in-place. */}
                        {showTopSectionLoading ? (
                            <SkeletonGroupPanel rows={6} />
                        ) : (
                            <div className="space-y-[18px]">
                                {stationGroups.map((group) => (
                                    <GroupPanel key={group.key} label={group.label} count={group.items.length}>
                                        {group.items.map((ambulance, index) => (
                                            <React.Fragment key={ambulance.id}>
                                                {renderAmbulanceRow(ambulance)}
                                                {index < group.items.length - 1 && <Hairline />}
                                            </React.Fragment>
                                        ))}
                                    </GroupPanel>
                                ))}
                            </div>
                        )}

                        <div ref={observerTarget} className="min-h-[64px] flex flex-col items-center justify-center gap-2">
                            {!loading && hasMore && <MobileListLoadMore armed={armed} onRequest={requestLoad} labelTone="plain" />}
                            {!loading && !hasMore && displayAmbulances.length > 0 && <MobileListEnd label="End of fleet list" />}
                        </div>

                        {displayAmbulances.length === 0 && !loading && !showTopSectionLoading && (
                            <MobileListEmpty
                                icon={Ambulance}
                                label={errorMessage ? 'Fleet did not load' : 'No ambulances found'}
                                reason={filters?.search ? 'search' : hasFilter ? 'filtered' : 'empty'}
                                hint={errorMessage
                                    ? 'Try again before treating the fleet as empty.'
                                    : filters?.search
                                        ? `No units match "${filters.search}".`
                                        : hasFilter
                                            ? 'Try resetting filters to see the full fleet.'
                                            : 'Units will appear here once registered.'}
                                onRecover={!errorMessage && (filters?.search || hasFilter)
                                    ? () => setFilters(() => ({}))
                                    : undefined}
                                recoverLabel={!errorMessage && filters?.search ? 'Clear Search' : !errorMessage && hasFilter ? 'Reset Filters' : undefined}
                                labelTone="plain"
                            />
                        )}
                    </div>
                </section>
                </div>

                {activeAmbulance && (() => {
                    const status = getStatus(activeAmbulance);
                    const color = getStatusColor(status);
                    const station = getStation(activeAmbulance) || 'No station';
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
