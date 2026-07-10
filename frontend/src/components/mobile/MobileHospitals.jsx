import React, { useMemo, useEffect, useRef, useState } from 'react';
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
    Phone,
    Hash,
    Clock,
    History,
    Zap,
    BadgeCheck,
    BadgeX
} from 'lucide-react';
// Canon kit re-composition (2026-07-09, changelog + failure audit in
// docs/audit/FEATURE_PARITY_VS_MAIN.md). LIST-type page per the locked page-type
// grammar (MOBILE_DESIGN_SYSTEM §5): heading -> KPI chips -> search -> grouped list.
// No metric rails / glance tiles on a list page — the old signals rail is gone and
// its beds/fleet aggregates ride AnalyticsModal via hospitalPageStats.
//
// DIRECTORY expression of the LIST grammar (data-fitted, 2026-07-09): a facility
// registry has no recency to bucket by, but it HAS a capacity signal — the operator's
// routing question. Panels group by it (Reporting capacity / No capacity reported),
// so dead zeros collapse into one honest group header instead of shouting per-row.
// Rows lead with what the data actually discriminates: name, address, and
// availability FRESHNESS in the trailing time slot (stale capacity is the risk).
import { SearchRow, useSkeletonWarmup, UpdatingPillRow, MobileHeading, GroupPanel, MobileListRow, Hairline, SkeletonGroupPanel } from './canon';
import { MobileKPIStrip } from './MobileKPIStrip';
import { MobileDetailSheet } from './MobileDetailSheet';
import { MobileSelectionBar } from './MobileSelectionBar';
import { PullToRefresh } from './PullToRefresh';
import { MobilePageShell } from './MobilePageShell';
import { MobileListEnd, MobileListEmpty, MobileListLoadMore, MobileListLoadingMore } from './MobileListStates';
import { useFeedback } from '../../hooks/useFeedback';
import { FEEDBACK_TYPES } from '../../contexts/FeedbackContext';
import { useStableList } from './useStableList';
import { useLoadMoreControl } from './useLoadMoreControl';
import { statusPill } from '../../constants/vitalTracks';
import { formatRelativeTime } from '../../utils/activityUtils';
import { resolveAdaptiveGroups } from '../../utils/adaptiveGrouping';

// Atlas stage (donor recipe: MobileVisitsAtlasLayer — Lesson 25 macro-stage item 1;
// ambient brand tint is sanctioned expression, Lesson 18).
const MobileHospitalsAtlasLayer = () => (
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

// Sentence-case a raw facility type token ('specialty_clinic' -> 'Specialty clinic').
const facilityTypeLabel = (hospital) => {
    const raw = hospital?.type || hospital?.provider_type;
    if (!raw) return 'Facility';
    const text = String(raw).replace(/[_-]+/g, ' ').trim();
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : 'Facility';
};

// Native reads (read-the-data-we-have rule): coordinates win, address text is the
// fallback; either way the island deep-links into the user's maps app.
const mapsHref = (hospital) => {
    const lat = Number(hospital?.latitude);
    const lng = Number(hospital?.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)) {
        return `https://maps.google.com/?q=${lat},${lng}`;
    }
    if (hospital?.address) {
        return `https://maps.google.com/?q=${encodeURIComponent(hospital.address)}`;
    }
    return undefined;
};

// Filter-trigger truth (donor: hasMobileRequestFilters / hasMobileVisitFilters):
// any committed narrowing counts, so the trigger's filtered state never lies.
const hasMobileHospitalFilters = (filters = {}) => Boolean(
    filters?.search ||
    filters?.status ||
    filters?.created_at?.start ||
    filters?.created_at?.end
);

// The operator's routing question: does this facility report ANY capacity signal?
const hasCapacitySignal = (hospital) => (
    (Number(hospital?.available_beds) || 0) > 0 ||
    (Number(hospital?.total_beds) || 0) > 0 ||
    (Number(hospital?.ambulances_count) || 0) > 0
);

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
    filterSheetOpen = false,
    analyticsOpen = false,
    hasMore,
    onLoadMore,
    isFetching = false,
    errorMessage = null,
    onRetry,
    canDelete = false,
    selectionEnabled = false,
    selectedIds = [],
    onSelect,
    onSelectAll
}) => {
    const observerTarget = useRef(null);
    const [activeHospital, setActiveHospital] = useState(null);
    // Multi-select restored 2026-07-10 as a fail-closed MIRROR of desktop: the selection
    // MECHANISM renders but the bulk WRITE stays locked — HospitalsPage's only bulk
    // control is a DISABLED delete ("locked, no DELETE receiver"), so mobile shows the
    // same disabled bar, never a live mutation. Gated by selectionEnabled (page: isAdmin).
    const selectedIdSet = useMemo(() => new Set(selectedIds || []), [selectedIds]);
    const selectionMode = selectionEnabled && selectedIdSet.size > 0;
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
        busy: metricValue(statistics?.busy, sourceHospitals.filter(h => getHospitalStatus(h) === 'busy').length)
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

    // Load-more ACCUMULATES (donor interim, MobileVisits/MobileEmergency): the RQ page
    // cache replaces rows per window, so an id-keyed map keeps every row seen since
    // the last scope change; a narrowed scope resets it, a same-scope refetch updates
    // rows in place by id. Without this, "infinite scroll" swaps the visible window.
    const filterSignature = JSON.stringify({
        search: filters?.search || '',
        status: filters?.status || null,
        date: filters?.created_at || null,
    });
    const accumulatorRef = useRef({ signature: null, order: [], byId: new Map(), lastSource: null, provisional: false });
    const hospitalRows = useMemo(() => {
        const store = accumulatorRef.current;
        const absorb = (row) => {
            const id = row?.id;
            if (id === null || id === undefined) return;
            if (!store.byId.has(id)) store.order.push(id);
            store.byId.set(id, row);
        };
        const scopeChanged = store.signature !== filterSignature;
        if (scopeChanged) {
            store.signature = filterSignature;
            store.order = [];
            store.byId = new Map();
            // Placeholder guard (live-caught 2026-07-09): on a scope change React
            // Query still serves the PREVIOUS scope's rows as placeholderData (the
            // same array reference). They may display for §5.5 refetch continuity,
            // but they are PROVISIONAL — without this flag a no-match search kept
            // showing 20 stale rows forever ("0 hospitals" heading over a full list).
            store.provisional = true;
        }
        if (store.lastSource !== sourceHospitals) {
            store.lastSource = sourceHospitals;
            if (store.provisional && !scopeChanged) {
                // First REAL response after a scope change: rebuild from it alone.
                store.order = [];
                store.byId = new Map();
                store.provisional = false;
            }
            sourceHospitals.forEach(absorb);
        } else if (scopeChanged) {
            // Same array reference across the scope change = placeholder continuity.
            sourceHospitals.forEach(absorb);
        }
        return store.order.map((id) => store.byId.get(id));
    }, [sourceHospitals, filterSignature]);

    const { displayItems: displayHospitals, isBuffering } = useStableList(hospitalRows, loading);
    // Background-refetch signal: the REAL isFetching from the query (isBuffering =
    // Boolean(loading) is false during a refetch, so the pill was dead — 2026-07-10 fix).
    const refetching = isFetching || false;
    const warmingUp = useSkeletonWarmup();
    const showTopSectionLoading = warmingUp || (loading && displayHospitals.length === 0);

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

    // Count integrity (§5): the heading tracks the ACTIVE KPI scope, never the raw
    // total — "1514 hospitals" must not sit above an available-filtered list.
    const scopeCount = activeStatusFilter === 'all'
        ? hospitalTotals.total
        : (hospitalTotals[activeStatusFilter] ?? hospitalTotals.total);

    const hasFilter = hasMobileHospitalFilters(filters);

    // Adaptive, DATA-DRIVEN grouping (2026-07-10): capacity-reporting is the operator's
    // routing question, but on the real network it's degenerate — measured live: 98% of
    // facilities report capacity, so the split collapses to one giant panel + a 3-row
    // scrap. resolveAdaptiveGroups SCORES the capacity split and uses it only if it
    // distributes; otherwise it falls to availability-freshness recency (a facility
    // whose capacity hasn't updated in weeks is stale/suspect — the same operational
    // risk, and it always buckets). The factor is chosen per-render from the actual rows.
    const { groups: hospitalGroups } = useMemo(() => resolveAdaptiveGroups(displayHospitals, [
        {
            key: 'capacity',
            assign: (h) => (hasCapacitySignal(h) ? 'reporting' : 'silent'),
            labelFor: (k) => (k === 'reporting' ? 'Reporting capacity' : 'No capacity reported'),
            order: (keys) => ['reporting', 'silent'].filter((k) => keys.includes(k)),
        },
        { type: 'coarse-recency', key: 'freshness', getDate: (h) => h.last_availability_update || h.updated_at },
    ]), [displayHospitals]);

    const statusColorFor = (status) => (
        status === 'available' || status === 'verified'
            ? 'hsl(160 84% 39%)'
            : status === 'full' || status === 'pending'
                ? 'hsl(38 92% 50%)'
                : 'hsl(var(--muted-foreground))'
    );

    // Status-tinted row orb (kit MobileListRow anatomy; literal palette — the
    // theme's semantic tokens resolve to brand red and are reserved for danger).
    const orbClassFor = (status) => (
        status === 'available'
            ? 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-300'
            : status === 'busy'
                ? 'bg-cyan-500/12 text-cyan-700 dark:text-cyan-300'
                : status === 'full'
                    ? 'bg-amber-500/12 text-amber-700 dark:text-amber-300'
                    : 'bg-muted/40 text-muted-foreground'
    );

    const renderHospitalRow = (hospital) => {
        const status = getHospitalStatus(hospital);
        const beds = Number(hospital.available_beds) || 0;
        const totalBeds = Number(hospital.total_beds) || 0;
        const fleet = Number(hospital.ambulances_count) || 0;
        // Meta leads with what discriminates: capacity when reported, then address
        // (the most-populated readable fact after the name). Dead zeros never ride
        // a row — their group header already said it once.
        const capacityText = totalBeds > 0
            ? `${beds} of ${totalBeds} beds`
            : beds > 0
                ? `${beds} beds`
                : fleet > 0
                    ? `${fleet} unit${fleet === 1 ? '' : 's'}`
                    : null;
        const address = hospital.address || 'No address provided';
        const meta = capacityText ? `${capacityText} · ${address}` : address;
        // Freshness is the trailing time (donor anatomy): stale capacity is the
        // operator's risk, and updated_at always exists as the honest fallback.
        const freshness = formatRelativeTime(hospital.last_availability_update || hospital.updated_at);

        return (
            <MobileListRow
                item={hospital}
                dataAttr="data-mobile-hospital-row"
                onOpen={setActiveHospital}
                ariaLabel={`${hospital.name || 'Unnamed Hospital'}, ${status}`}
                orbClass={orbClassFor(status)}
                icon={Hospital}
                title={hospital.name || 'Unnamed Hospital'}
                meta={meta}
                time={freshness}
                markerChip={hospital.verified ? 'Verified' : null}
                pill={statusPill(status)}
                selectable={selectionEnabled}
                selected={selectedIdSet.has(hospital.id)}
                selectionMode={selectionMode}
                onToggleSelect={(it) => onSelect?.(it.id, !selectedIdSet.has(it.id))}
                onLongPress={(it) => onSelect?.(it.id, true)}
            />
        );
    };

    return (
        <PullToRefresh onRefresh={onRefresh}>
            <MobilePageShell
                animatePageLoad={false}
                contentClassName="relative min-h-[calc(100dvh-3rem)] overflow-hidden px-0 pb-32 pt-8 text-foreground"
            >
                <MobileHospitalsAtlasLayer />
                <div className="relative z-10 space-y-3">
                {/* Chrome (title + summary) is always present — no entrance motion.
                    Only DATA regions load; they scaffold with skeletons and replace
                    in place (donor: MobileEmergency/MobileVisits heading order). */}
                <MobileHeading
                    title="Hospitals"
                    noun="hospital"
                    count={scopeCount}
                    showSkeleton={showTopSectionLoading}
                    failedEmpty={Boolean(errorMessage) && displayHospitals.length === 0}
                />

                <MobileKPIStrip
                    loading={showTopSectionLoading}
                    kpis={kpis}
                    activeKpi={activeStatusFilter}
                    onKpiClick={handleStatusFilter}
                />

                <section className="px-4">
                    {/* Flat search row (canon Apple search bar): input + filter + stats
                        controls sit directly on the page; the panel list follows below. */}
                    <SearchRow
                        placeholder="Search hospitals..."
                        search={filters?.search || ''}
                        onSearchCommit={(value) => setFilters(prev => ({ ...prev, search: value }))}
                        entityLabel="hospitals"
                        onOpenFilters={onOpenFilters}
                        filterSheetOpen={filterSheetOpen}
                        hasFilter={hasFilter}
                        onOpenStats={canManage ? onViewAnalytics : null}
                        statsOpen={analyticsOpen}
                        statsLabel="Open analytics"
                    />

                    <UpdatingPillRow show={(refetching || isBuffering) && !showTopSectionLoading} />

                    <div className="mt-3 space-y-2">
                        {selectionEnabled && (
                            <MobileSelectionBar
                                count={selectedIdSet.size}
                                onSelectAll={() => onSelectAll?.(true)}
                                onClear={() => onSelectAll?.(false)}
                            >
                                {/* Fail-closed: facility delete has no receiver, so the bulk
                                    control is DISABLED (mirrors HospitalsPage's locked bar). */}
                                <button
                                    type="button"
                                    disabled
                                    aria-label="Facility deletion is locked until authorized"
                                    title="Facility deletion is locked until authorized"
                                    className="flex h-8 w-8 items-center justify-center rounded-button bg-destructive/12 text-destructive opacity-40"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </MobileSelectionBar>
                        )}
                        {errorMessage && displayHospitals.length > 0 && (
                            <div
                                className="rounded-card bg-destructive/10 p-4 text-destructive"
                                data-testid="mobile-hospitals-degraded-state"
                            >
                                <p className="text-sm font-semibold">Hospitals did not refresh</p>
                                <p className="mt-1 text-xs text-destructive/75">Showing the last loaded facility rows.</p>
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

                        {/* Group-shaped skeleton (§5.2): mirrors the panel 1:1 so content
                            replaces it in place with zero layout jump. */}
                        {showTopSectionLoading ? (
                            <SkeletonGroupPanel rows={6} />
                        ) : (
                            <div className="space-y-[18px]">
                                {hospitalGroups.map((group) => (
                                    <GroupPanel key={group.key} label={group.label} count={group.items.length}>
                                        {group.items.map((hospital, index) => (
                                            <React.Fragment key={hospital.id}>
                                                {renderHospitalRow(hospital)}
                                                {index < group.items.length - 1 && <Hairline />}
                                            </React.Fragment>
                                        ))}
                                    </GroupPanel>
                                ))}
                            </div>
                        )}

                        <div ref={observerTarget} className="min-h-[64px] flex flex-col items-center justify-center gap-2">
                            {refetching && !showTopSectionLoading && hasMore && displayHospitals.length > 0 && <MobileListLoadingMore />}
                            {!loading && !refetching && hasMore && <MobileListLoadMore armed={armed} onRequest={requestLoad} labelTone="plain" />}
                            {!loading && !hasMore && displayHospitals.length > 0 && <MobileListEnd label="End of hospital list" />}
                        </div>

                        {displayHospitals.length === 0 && !loading && !showTopSectionLoading && (
                            <MobileListEmpty
                                icon={Hospital}
                                label={errorMessage ? 'Hospitals did not load' : 'No hospitals found'}
                                reason={filters?.search ? 'search' : hasFilter ? 'filtered' : 'empty'}
                                hint={errorMessage
                                    ? 'Try again before treating the network as empty.'
                                    : filters?.search
                                        ? `No hospitals match "${filters.search}".`
                                        : hasFilter
                                            ? 'Try resetting filters to see the full network.'
                                            : 'Facilities will appear here once registered.'}
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

                {activeHospital && (() => {
                    const status = getHospitalStatus(activeHospital);
                    const statusColor = statusColorFor(status);
                    const fleet = Number(activeHospital.ambulances_count) || 0;
                    const beds = Number(activeHospital.available_beds) || 0;
                    const totalBeds = Number(activeHospital.total_beds) || 0;
                    const rating = Number(activeHospital.rating) || 0;
                    const phone = activeHospital.phone;
                    // Display IDs are labels: prefer the ORG-XXXXXX display_id the service
                    // projects; the truncated UUID is only a fallback, never mutation identity.
                    const facilityId = activeHospital.display_id || `#${String(activeHospital.id || '').slice(0, 12).toUpperCase()}`;
                    // Operational reads the schema already carries (data-sync pass 2026-07-09):
                    // wait time, ICU beds, app-eligibility flags, availability freshness.
                    // Null stays hidden (Number(null) coerces to a lying 0); a 0-minute wait
                    // also reads as default-unset, so only a positive wait is claimed.
                    const icuBeds = activeHospital.icu_beds_available != null
                        ? Number(activeHospital.icu_beds_available)
                        : null;
                    const waitMinutes = Number(activeHospital.emergency_wait_time_minutes);
                    const waitValue = Number.isFinite(waitMinutes) && waitMinutes > 0
                        ? `≈ ${waitMinutes} min`
                        : (activeHospital.wait_time || null);
                    const eligibility = [
                        activeHospital.emergency_eligible && 'Emergency',
                        activeHospital.dispatch_eligible && 'Dispatch',
                        activeHospital.booking_eligible && 'Booking'
                    ].filter(Boolean).join(' · ');
                    const availabilityUpdated = activeHospital.last_availability_update
                        ? formatRelativeTime(activeHospital.last_availability_update)
                        : null;
                    const specialties = Array.isArray(activeHospital.specialties)
                        ? activeHospital.specialties.filter(Boolean)
                        : [];

                    return (
                        <MobileDetailSheet
                            isOpen={!!activeHospital}
                            onClose={() => setActiveHospital(null)}
                            icon={Hospital}
                            iconTone={statusColor}
                            eyebrow={facilityTypeLabel(activeHospital)}
                            title={activeHospital.name || 'Unnamed Hospital'}
                            statusPill={statusPill(status)}
                            islands={[
                                {
                                    icon: MapPin,
                                    label: 'Address',
                                    value: activeHospital.address || 'No address provided',
                                    href: mapsHref(activeHospital)
                                },
                                phone && {
                                    icon: Phone,
                                    label: 'Phone',
                                    value: phone,
                                    href: `tel:${String(phone).replace(/[\s-]/g, '')}`
                                },
                                {
                                    icon: Bed,
                                    label: 'Beds',
                                    value: totalBeds > 0 ? `${beds} of ${totalBeds} available` : `${beds} available`
                                },
                                icuBeds != null && Number.isFinite(icuBeds) && {
                                    icon: Bed,
                                    label: 'ICU beds',
                                    value: `${icuBeds}`
                                },
                                {
                                    icon: Ambulance,
                                    label: 'Fleet',
                                    value: `${fleet} ambulance${fleet === 1 ? '' : 's'}`
                                },
                                waitValue && {
                                    icon: Clock,
                                    label: 'Wait time',
                                    value: waitValue
                                },
                                eligibility && {
                                    icon: Zap,
                                    label: 'Eligibility',
                                    value: eligibility
                                },
                                availabilityUpdated && {
                                    icon: History,
                                    label: 'Availability updated',
                                    value: availabilityUpdated
                                },
                                {
                                    icon: Star,
                                    label: 'Rating',
                                    value: rating > 0 ? rating.toFixed(1) : 'Not rated'
                                },
                                {
                                    icon: activeHospital.verified ? BadgeCheck : BadgeX,
                                    label: 'Verification',
                                    value: activeHospital.verified ? 'Verified' : 'Not verified'
                                },
                                {
                                    icon: Hash,
                                    label: 'Facility ID',
                                    value: facilityId,
                                    // Copyable identifier with confirmation haptic (Visits Reference
                                    // island parity — the desktop rail uses CopyChip; the mobile sheet
                                    // owed the same tap-to-copy micro-interaction).
                                    onPress: (event) => {
                                        navigator.clipboard?.writeText(facilityId)?.catch(() => {});
                                        triggerFromEvent(event, { variant: FEEDBACK_TYPES.SUCCESS, color: 'hsl(var(--spark))', haptic: true, sound: true });
                                    },
                                }
                            ]}
                            primary={{ label: 'Details', icon: Eye, onClick: () => { setActiveHospital(null); onView(activeHospital); } }}
                            secondary={canManage ? { icon: Edit, onClick: () => { setActiveHospital(null); onEdit(activeHospital); }, 'aria-label': `Edit ${activeHospital.name || 'facility'}` } : undefined}
                        >
                            {specialties.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {specialties.slice(0, 4).map((specialty) => (
                                        <span
                                            key={specialty}
                                            className="inline-flex items-center rounded-pill bg-foreground/[0.06] px-2.5 py-1 text-[11px] font-semibold text-muted-foreground dark:bg-white/[0.08]"
                                        >
                                            {specialty}
                                        </span>
                                    ))}
                                    {specialties.length > 4 && (
                                        <span className="inline-flex items-center rounded-pill px-2 py-1 text-[11px] font-semibold text-muted-foreground/60">
                                            +{specialties.length - 4} more
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* Gated command inventory (gate ledger: scheduling + destructive
                                delete stay unavailable until receiver proof; the page passes
                                canDelete={false} and no onSchedule today). */}
                            {canManage && (onSchedule || (canDelete && onDelete)) && (
                                <div className="flex gap-2 pt-1">
                                    {onSchedule && (
                                        <button
                                            type="button"
                                            onClick={() => { setActiveHospital(null); onSchedule(activeHospital); }}
                                            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-button bg-foreground/[0.06] text-sm font-semibold text-foreground transition-all active:scale-[0.96] hover:bg-foreground/10 dark:bg-white/[0.08]"
                                        >
                                            <CalendarDays className="h-4 w-4" />
                                            Schedule
                                        </button>
                                    )}
                                    {canDelete && onDelete && (
                                        <button
                                            type="button"
                                            onClick={() => { setActiveHospital(null); onDelete(activeHospital); }}
                                            aria-label={`Delete ${activeHospital.name || 'facility'}`}
                                            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-button bg-destructive/10 text-sm font-semibold text-destructive transition-transform active:scale-[0.96] hover:bg-destructive/20"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            Delete
                                        </button>
                                    )}
                                </div>
                            )}
                        </MobileDetailSheet>
                    );
                })()}
            </MobilePageShell>
        </PullToRefresh>
    );
};
