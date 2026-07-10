import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
    AlertCircle,
    Ambulance,
    BarChart3,
    BedDouble,
    Calendar,
    CheckCheck,
    ClipboardCheck,
    Clock,
    CreditCard,
    Eye,
    Filter,
    Hash,
    Hospital,
    Mail,
    MapPin,
    Phone,
    RefreshCw,
    Search,
    Send,
    User,
    X,
} from 'lucide-react';
import { PullToRefresh } from './PullToRefresh';
import { MobilePageShell } from './MobilePageShell';
import { MobileKPIStrip } from './MobileKPIStrip';
import { MobileListEnd, MobileListEmpty, MobileListLoadMore, MobileListLoadingMore } from './MobileListStates';
import { MobileDetailSheet } from './MobileDetailSheet';
import { useFeedback } from '../../hooks/useFeedback';
import { FEEDBACK_TYPES } from '../../contexts/FeedbackContext';
import { useStableList } from './useStableList';
import { useReverseGeocode } from '../../hooks/useReverseGeocode';
import { useLoadMoreControl } from './useLoadMoreControl';
// Mobile canon kit: the grouped-list grammar, loading truth, and heading live in
// shared components (extraction source: CANON_COMPONENT_SPECS.md); this page keeps
// only its DOMAIN - request projection, chips, search/action triggers, sheet islands.
// The search row stays PAGE-LOCAL on purpose: the kit SearchRow's stats trigger has
// no open-state (this page wires analyticsOpen -> data-state + aria-expanded), and
// the load scaffold stays page-local because its trailing column (single pill bar)
// differs from the kit scaffold's time+pill column. Fidelity wins this pass.
import { useSkeletonWarmup, UpdatingPillRow } from './canon/Loading';
import { GroupedList, MobileListRow } from './canon/GroupedList';
import { MobileHeading } from './canon/MobileHero';
import { LOAD_MORE_ROOT_MARGIN } from './canon/constants';
import { canonicalizeEmergencyStatus } from '../../utils/emergencyStatus';
import { getEmergencyActionState } from '../../utils/emergencyActions';
import { buildEmergencyRenderProjection, formatEmergencyServiceToken } from '../../utils/emergencyRequestMapper';
import { formatRequestDayTime, isUnsettledCashRequest } from '../../utils/requestDisplay';
import { resolveVital } from '../../constants/vitalTracks';

// State filter chips for MobileKPIStrip. `color` is the raw status hue for the chip
// dot (active chip is brand-filled by MobileKPIStrip itself). Hues mirror the row
// avatars/pills and the desktop RequestKpiStrip: attention=destructive, active=amber,
// bed=cyan, ambulance=sky. `icon` feeds the compact signal header.
const mobileKpis = [
    { id: 'all', label: 'All', color: 'hsl(var(--muted-foreground))' },
    { id: 'pending', label: 'Needs attention', icon: AlertCircle, color: 'hsl(var(--destructive))' },
    { id: 'active', label: 'Active', icon: Clock, color: '#f59e0b' },
    { id: 'bed', label: 'Beds', icon: BedDouble, color: '#06b6d4' },
    { id: 'ambulance', label: 'Ambulance', icon: Ambulance, color: '#0ea5e9' },
];

const countNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const serviceLabel = (request) => {
    const raw = String(request?.service_type || 'request').replace(/_/g, ' ');
    return raw.replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const createdDateLabel = (value) => {
    if (!value) return 'Unknown date';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Unknown date';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const getMobileRequestAvatarClass = (request) => {
    const key = canonicalizeEmergencyStatus(request?.status, 'pending_approval');
    if (key === 'pending_approval' || key === 'payment_declined') {
        return 'bg-destructive/14 text-destructive';
    }
    if (key === 'completed') {
        return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200';
    }
    if (key === 'cancelled') {
        return 'bg-muted/34 text-muted-foreground';
    }
    if (key === 'in_progress') {
        return 'bg-amber-500/10 text-amber-700 dark:text-amber-200';
    }
    if (key === 'accepted') {
        return 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-200';
    }
    if (key === 'arrived') {
        return 'bg-sky-500/10 text-sky-700 dark:text-sky-200';
    }
    return 'bg-muted/34 text-muted-foreground';
};

// Orb glyph by service type: ambulance/bed get their literal icon, everything else the
// generic facility mark. Mirrors the app's inferRequestType icon mapping.
const getMobileRequestTypeIcon = (request) => {
    const type = String(request?.service_type || '').toLowerCase();
    if (type === 'ambulance') return Ambulance;
    if (type === 'bed') return BedDouble;
    return Hospital;
};

const hasMobileRequestFilters = (filters = {}) => Boolean(
    filters.search ||
    (Array.isArray(filters.status) && filters.status.length > 0) ||
    filters.created_at?.start ||
    filters.created_at?.end
);

const getKpiValue = ({ id, statistics, emergencies }) => {
    if (id === 'all') {
        return countNumber(statistics?.total, emergencies.length);
    }
    if (id === 'pending') {
        const rowCount = emergencies.filter((item) => item.status === 'pending_approval').length;
        return countNumber(statistics?.pending, rowCount);
    }
    if (id === 'active') {
        const rowCount = emergencies.filter((item) => {
            const status = canonicalizeEmergencyStatus(item?.status, null);
            return status === 'pending_approval' || status === 'in_progress' || status === 'accepted' || status === 'arrived';
        }).length;
        return countNumber(statistics?.active, rowCount);
    }
    if (id === 'critical') {
        const rowCount = emergencies.filter((item) => item.service_type === 'critical_care').length;
        return countNumber(statistics?.critical, rowCount);
    }
    if (id === 'bed') {
        const rowCount = emergencies.filter((item) => item.service_type === 'bed').length;
        return countNumber(statistics?.bed, rowCount);
    }
    if (id === 'ambulance') {
        const rowCount = emergencies.filter((item) => item.service_type === 'ambulance').length;
        return countNumber(statistics?.ambulance, rowCount);
    }
    return countNumber(statistics?.total, emergencies.length);
};

const MobileRequestsAtlasLayer = () => (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-background">
        <div
            className="absolute inset-0 opacity-[0.30] dark:opacity-[0.24]"
            style={{
                backgroundImage:
                    'linear-gradient(115deg, transparent 0 45%, hsl(var(--foreground) / 0.06) 45% 48%, transparent 48%), linear-gradient(28deg, transparent 0 42%, hsl(var(--foreground) / 0.05) 42% 45%, transparent 45%), linear-gradient(155deg, transparent 0 64%, hsl(var(--destructive) / 0.07) 64% 67%, transparent 67%)',
                backgroundSize: '260px 180px, 340px 240px, 420px 280px',
                backgroundPosition: '20px 10px, -80px 50px, 18% 38%',
            }}
        />
        <div
            className="absolute inset-0"
            style={{
                background:
                    'radial-gradient(circle at 22% 34%, hsl(var(--destructive) / 0.11), transparent 28%), radial-gradient(circle at 78% 62%, hsl(var(--foreground) / 0.06), transparent 26%), linear-gradient(180deg, hsl(var(--background) / 0.22), hsl(var(--background)) 92%)',
            }}
        />
    </div>
);

// Group-shaped load scaffold: mirrors the real recency panel 1:1 (same header row,
// frosted panel, row rhythm, and 62px hairline inset) so the list REPLACES it in place
// with zero layout jump — no top-to-bottom entrance, the skeleton holds the layout and
// content materializes where it already sat. Apple/iOS loading model.
// PAGE-LOCAL (not the kit SkeletonGroupList): this scaffold's trailing column is a
// single pill bar, the kit's is a time+pill column — swapping would be visual drift.
// grammar:skeleton=page-local group-shaped skeleton -- mirrors THIS page's recency
// panel 1:1 (its trailing column carries the request-specific time+pill+marker, which
// the generic kit SkeletonGroupList does not); satisfies §5.2 replace-in-place.
const MobileRequestsListSkeleton = ({ groups = 2, rowsPerGroup = 3 }) => (
    <div className="space-y-[18px]" aria-hidden="true">
        {Array.from({ length: groups }).map((_, groupIndex) => (
            <div key={groupIndex}>
                <div className="flex items-center justify-between px-1 pb-2.5">
                    <span className="h-[13px] w-24 rounded-pill bg-muted/25 shimmer" />
                    <span className="h-[13px] w-5 rounded-pill bg-muted/20 shimmer" />
                </div>
                <div className="rounded-inner bg-foreground/[0.06] dark:bg-white/[0.08] backdrop-blur-xl px-3 py-1.5">
                    {Array.from({ length: rowsPerGroup }).map((_, rowIndex) => (
                        <React.Fragment key={rowIndex}>
                            <div className="flex items-center gap-3 px-2 py-3">
                                <span className="h-10 w-10 shrink-0 rounded-pill bg-muted/25 shimmer" />
                                <div className="min-w-0 flex-1 space-y-2">
                                    <span className="block h-[15px] w-2/5 rounded-pill bg-muted/25 shimmer" />
                                    <span className="block h-3 w-3/5 rounded-pill bg-muted/15 shimmer" />
                                </div>
                                <span className="ml-2 h-6 w-14 shrink-0 rounded-pill bg-muted/20 shimmer" />
                            </div>
                            {rowIndex < rowsPerGroup - 1 && (
                                <div className="h-px bg-[hsl(var(--muted-foreground)/0.08)] ml-[62px]" />
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </div>
        ))}
    </div>
);

// Donor row anatomy with the request identity (canon MobileListRow): status-tinted
// orb + service glyph, patient name 15/500, "{service} · {date}" meta, trailing
// day-aware time + status pill + chevron. Tap opens the MobileDetailSheet, never an
// inline dropdown.
const MobileRequestRow = ({ request, onOpen }) => {
    const projection = buildEmergencyRenderProjection(request);
    const vital = resolveVital('emergency', request.status);
    const pill = vital?.pill;
    const name = projection.patientDisplay.name;
    const avatarClass = getMobileRequestAvatarClass(request);
    const TypeIcon = getMobileRequestTypeIcon(request);
    // Same quiet muted marker the desktop RequestRow shows next to
    // its status pill: cash requests stay flagged until settled.
    const showCashChip = isUnsettledCashRequest(request);

    return (
        <MobileListRow
            item={request}
            dataAttr="data-mobile-request-row"
            onOpen={() => onOpen(request)}
            ariaLabel={`Open ${name}`}
            orbClass={avatarClass}
            icon={TypeIcon}
            title={name}
            meta={`${serviceLabel(request)} · ${createdDateLabel(request.created_at)}`}
            time={formatRequestDayTime(request.created_at)}
            markerChip={showCashChip ? 'Cash' : null}
            pill={pill}
        />
    );
};

export const MobileEmergency = ({
    emergencies,
    loading,
    isFetching = false,
    statistics,
    filters,
    setFilters,
    onView,
    onDispatch,
    onComplete,
    onProcessCash,
    onRetryPayment,
    onRefresh,
    onViewAnalytics,
    isAdmin,
    onOpenFilters,
    filterSheetOpen = false,
    analyticsOpen = false,
    hasMore,
    onLoadMore,
    loadError,
    onRetry,
    kpiFilter,
    setKpiFilter
}) => {
    const observerTarget = useRef(null);
    const [activeRequest, setActiveRequest] = useState(null);
    const { triggerFromEvent } = useFeedback();
    // Forced skeleton on every mount (canon useSkeletonWarmup): guarantees a
    // skeleton-first load on cached bottom-nav navigation, not just on refresh.
    const warmingUp = useSkeletonWarmup();
    const { displayItems } = useStableList(emergencies, loading);
    const { armed, requestLoad, triggerLoad } = useLoadMoreControl({ hasMore, loading, onLoadMore });
    // Skeleton while warming up OR while the first real fetch is still pending.
    // When it clears, the whole list swaps in a single commit — no top-to-bottom assemble.
    const showSkeleton = warmingUp || (loading && displayItems.length === 0);
    const filterTriggerState = filterSheetOpen ? 'open' : hasMobileRequestFilters(filters) ? 'filtered' : 'idle';
    const analyticsTriggerState = analyticsOpen ? 'open' : 'idle';
    // Search debounce: typing edits a local draft; the server filter (and its
    // network refetch) commits 300ms after the last keystroke instead of per
    // character. External writes (Clear Search recovery) sync back into the draft.
    const [searchDraft, setSearchDraft] = useState(filters?.search || '');
    useEffect(() => {
        setSearchDraft(filters?.search || '');
    }, [filters?.search]);
    useEffect(() => {
        const handle = setTimeout(() => {
            setFilters?.((prev) => {
                if ((prev?.search || '') === searchDraft) return prev;
                return { ...prev, search: searchDraft };
            });
        }, 300);
        return () => clearTimeout(handle);
    }, [searchDraft, setFilters]);

    // Transcribe the active request's coordinates into a place label (same
    // Google -> Nominatim chain the desktop rail uses). Lives at the top level
    // because the detail-sheet render below is an inline IIFE (no hooks there);
    // the hook caches by quantized coords, so reopening a sheet never re-fetches.
    const activeCoordinates = useMemo(() => (
        activeRequest
            ? buildEmergencyRenderProjection(activeRequest).locationDisplay.coordinates
            : null
    ), [activeRequest]);
    const { place: activePlace } = useReverseGeocode(activeCoordinates);

    useEffect(() => {
        if (!hasMore) return;
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting) triggerLoad();
            },
            { threshold: 0.1, rootMargin: LOAD_MORE_ROOT_MARGIN }
        );
        if (observerTarget.current) observer.observe(observerTarget.current);
        return () => observer.disconnect();
    }, [hasMore, triggerLoad]);

    const kpis = useMemo(() => mobileKpis.map((item) => ({
        ...item,
        value: getKpiValue({ id: item.id, statistics, emergencies }),
    })), [statistics, emergencies]);
    // Header count tracks the ACTIVE KPI, not the raw total — otherwise "40 requests"
    // sits above a 3-row Ambulance-filtered list (the count must equal the visible scope,
    // matching the desktop filtered count). KPI-agnostic stats give the right per-KPI total.
    const totalRequests = getKpiValue({ id: kpiFilter || 'pending', statistics, emergencies });
    // Empty-state cause priority mirrors desktop: search > sheet filters > KPI > true-empty.
    // The KPI cause only fires when it is the sole narrowing scope, and recovery resets the
    // chip to All (the list itself may be non-empty under a different KPI).
    const kpiEmptyCause = Boolean(kpiFilter && kpiFilter !== 'all') && !filters?.search && !hasMobileRequestFilters(filters);
    const kpiEmptyLabel = mobileKpis.find((item) => item.id === kpiFilter)?.label || 'selected';

    return (
        <PullToRefresh onRefresh={onRefresh}>
            <MobilePageShell
                animatePageLoad={false}
                contentClassName="relative min-h-[calc(100dvh-3rem)] overflow-hidden px-0 pb-32 pt-8 text-foreground"
            >
                <MobileRequestsAtlasLayer />
                <div className="relative z-10 space-y-3">
                    {/* Chrome (title + summary) is always present — no entrance motion.
                        Only DATA regions load; they scaffold with skeletons and replace
                        in place, so nothing sweeps in top-to-bottom. */}
                    <MobileHeading
                        title="Requests"
                        noun="request"
                        count={totalRequests}
                        showSkeleton={showSkeleton}
                        failedEmpty={Boolean(loadError) && displayItems.length === 0}
                    />

                    <MobileKPIStrip
                        kpis={kpis}
                        activeKpi={kpiFilter || 'pending'}
                        onKpiClick={(id) => setKpiFilter?.(id)}
                        loading={showSkeleton}
                    />

                    <section className="px-4">
                        {/* grammar:search=inline flat search row -- this page is the DONOR /
                            extraction source the kit SearchRow was lifted FROM; byte-identical.
                            Consolidation to <SearchRow> is the donor-consolidation flag (ledger,
                            desktop lane). Flat search row (canon Apple search bar): no wrapping
                            surface, no drag-handle. The input + filter + stats controls sit
                            directly on the page over the atlas; the grouped list follows below. */}
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <Search size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
                                <input
                                    type="text"
                                    inputMode="search"
                                    placeholder="Search requests..."
                                    value={searchDraft}
                                    onChange={(event) => setSearchDraft(event.target.value)}
                                    className="h-9 w-full rounded-inner bg-background/60 pl-10 pr-10 text-[13px] font-medium text-foreground shadow-sm transition-all placeholder:text-muted-foreground/50 focus-visible:shadow-[0_0_0_3px_hsl(var(--primary)/0.18)] dark:bg-white/[0.06]"
                                />
                                {searchDraft && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            // Clear commits immediately (no debounce wait).
                                            setSearchDraft('');
                                            setFilters?.((prev) => ({ ...prev, search: '' }));
                                        }}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-pill bg-foreground/10 text-muted-foreground transition-colors hover:bg-foreground/15 active:scale-95"
                                        aria-label="Clear search"
                                    >
                                        <X size={12} />
                                    </button>
                                )}
                            </div>
                            <motion.button
                                type="button"
                                whileTap={{ scale: 0.96 }}
                                onClick={(event) => {
                                    onOpenFilters?.();
                                    triggerFromEvent(event, { variant: FEEDBACK_TYPES.INFO, color: 'hsl(var(--foreground))', haptic: true, sound: true });
                                }}
                                data-state={filterTriggerState}
                                className="flex h-9 w-9 items-center justify-center rounded-button bg-background/60 text-muted-foreground shadow-sm transition-all hover:bg-foreground/10 hover:text-foreground active:scale-[0.96] dark:bg-white/[0.06]"
                                aria-label="Filter requests"
                                aria-haspopup="dialog"
                                aria-expanded={filterSheetOpen}
                            >
                                <Filter size={18} />
                            </motion.button>

                            {isAdmin && (
                                <motion.button
                                    type="button"
                                    whileTap={{ scale: 0.96 }}
                                    onClick={(event) => {
                                        onViewAnalytics?.();
                                        triggerFromEvent(event, { variant: FEEDBACK_TYPES.CLICK, color: 'hsl(var(--foreground))', haptic: true, sound: true });
                                    }}
                                    data-state={analyticsTriggerState}
                                    className="flex h-9 w-9 items-center justify-center rounded-button bg-background/60 text-muted-foreground shadow-sm transition-all hover:bg-foreground/10 hover:text-foreground active:scale-[0.96] dark:bg-white/[0.06]"
                                    aria-label="Open request statistics"
                                    aria-haspopup="dialog"
                                    aria-expanded={analyticsOpen}
                                >
                                    <BarChart3 size={18} />
                                </motion.button>
                            )}
                        </div>

                        {/* Background-refetch feedback: React Query keeps placeholder data on
                            screen while refetching (KPI switch, search, filter, pull-to-refresh,
                            load-more), so `loading` stays false — `isFetching` is the only
                            signal. Hidden under the skeleton, which already communicates load. */}
                        <UpdatingPillRow show={isFetching && !showSkeleton} />

                        <div className="mt-3 space-y-2">
                        {!loading && loadError && displayItems.length > 0 && (
                            <div className="rounded-inner bg-destructive/10 p-4 text-sm text-destructive shadow-[0_18px_54px_rgba(239,68,68,0.10)]">
                                <p className="font-semibold">Requests could not refresh</p>
                                <p className="mt-1 text-xs text-destructive/75">Showing the last loaded requests. Try again.</p>
                                <button
                                    type="button"
                                    onClick={() => onRetry?.()}
                                    className="mt-3 h-9 rounded-pill bg-destructive/10 px-4 text-xs font-semibold transition-all hover:bg-destructive/15 active:scale-[0.96]"
                                >
                                    Retry
                                </button>
                            </div>
                        )}

                        {/* iOS-Settings grouped list (canon kit): one frosted PANEL per recency
                            bucket over the atlas; rows are transparent, separated by a slate
                            hairline — separation is fill/frost, never a border. Grouping is
                            render-only; id-keyed state is unaffected. The group-shaped skeleton
                            holds the exact final layout and the real list REPLACES it in place
                            (no entrance motion): reload and cached navigation stay identical. */}
                        {showSkeleton ? (
                            <MobileRequestsListSkeleton />
                        ) : (
                            <GroupedList
                                items={displayItems}
                                getDate={(request) => request.created_at}
                                getStatus={(request) => canonicalizeEmergencyStatus(request.status, null)}
                                renderRow={(request) => <MobileRequestRow request={request} onOpen={setActiveRequest} />}
                            />
                        )}

                        <div ref={observerTarget} className="flex min-h-[64px] items-center justify-center">
                            {/* While the next page is in flight the sentinel swaps the load-more
                                button for a local spinner; the top "Updating" pill may show at the
                                same time (global signal), the spinner is the local one. */}
                            {isFetching && !showSkeleton && hasMore && displayItems.length > 0 && <MobileListLoadingMore />}
                            {!loading && !isFetching && hasMore && <MobileListLoadMore armed={armed} onRequest={requestLoad} labelTone="plain" />}
                            {!loading && !hasMore && displayItems.length > 0 && (
                                <MobileListEnd label="End of requests" />
                            )}
                        </div>

                        {displayItems.length === 0 && !loading && loadError && (
                            <MobileListEmpty
                                icon={AlertCircle}
                                label="Requests did not load"
                                hint="Something went wrong loading requests."
                                onRecover={onRetry}
                                recoverLabel="Retry"
                                labelTone="plain"
                            />
                        )}

                        {displayItems.length === 0 && !loading && !loadError && (
                            <MobileListEmpty
                                icon={ClipboardCheck}
                                label="No requests found"
                                reason={filters?.search ? 'search' : hasMobileRequestFilters(filters) ? 'filtered' : kpiEmptyCause ? 'filtered' : 'empty'}
                                hint={kpiEmptyCause ? `No requests in the ${kpiEmptyLabel} scope.` : undefined}
                                onRecover={
                                    filters?.search
                                        ? () => setFilters?.((prev) => ({ ...prev, search: '' }))
                                        : hasMobileRequestFilters(filters)
                                            ? () => onOpenFilters?.()
                                            : kpiEmptyCause
                                                ? () => setKpiFilter?.('all')
                                                : undefined
                                }
                                recoverLabel={filters?.search ? 'Clear Search' : hasMobileRequestFilters(filters) ? 'Adjust Filters' : kpiEmptyCause ? 'Show all requests' : undefined}
                                labelTone="plain"
                            />
                        )}
                        </div>
                    </section>
                </div>

                {activeRequest && (() => {
                    const projection = buildEmergencyRenderProjection(activeRequest);
                    const vital = resolveVital('emergency', activeRequest.status);
                    const name = projection.patientDisplay.name;
                    const facility = projection.facilityDisplay.name;
                    const location = projection.locationDisplay.label;
                    const responder = projection.responderDisplay.label;
                    const actionState = getEmergencyActionState(activeRequest);
                    const terminal = projection.statusDisplay.terminal;
                    const phone = projection.patientDisplay.phone;
                    // Same placeholder guard as the desktop rail's hasEmail: the mapper emits
                    // the literal 'No email' fallback, which must never become a mailto link.
                    const patientEmail = projection.patientDisplay.email && projection.patientDisplay.email !== 'No email'
                        ? projection.patientDisplay.email
                        : null;
                    const coordinates = projection.locationDisplay.coordinates;
                    const displayId = projection.identity.displayId;
                    const isAmbulanceService = String(activeRequest.service_type || '').toLowerCase() === 'ambulance';
                    // Unsettled cash stays visibly flagged (desktop marks these rows with a quiet
                    // 'Cash' chip). Here the Payment island leads with 'Cash owed', replacing the
                    // redundant 'Cash' method token; amount + status still follow.
                    const unsettledCash = isUnsettledCashRequest(activeRequest);
                    // Payment line composes only the parts that actually exist; the island is
                    // skipped entirely when neither a real method nor a status is present.
                    const paymentParts = [
                        unsettledCash ? 'Cash owed' : null,
                        projection.paymentDisplay.amountLabel !== 'Unavailable' ? projection.paymentDisplay.amountLabel : null,
                        !unsettledCash && projection.paymentDisplay.method ? projection.paymentDisplay.methodLabel : null,
                        projection.paymentDisplay.status ? formatEmergencyServiceToken(projection.paymentDisplay.status) : null,
                    ].filter(Boolean);
                    const hasPayment = Boolean(projection.paymentDisplay.method || projection.paymentDisplay.status) && paymentParts.length > 0;
                    const vehicleParts = [
                        activeRequest.responder_vehicle_plate || null,
                        activeRequest.responder_vehicle_type ? formatEmergencyServiceToken(activeRequest.responder_vehicle_type, '') : null,
                    ].filter(Boolean);
                    const bedParts = [
                        projection.serviceDisplay.specialtyLabel !== 'N/A' ? projection.serviceDisplay.specialtyLabel : null,
                        activeRequest.bed_number ? `Bed ${activeRequest.bed_number}` : null,
                    ].filter(Boolean);
                    // Primary CTA mirrors the desktop getPrimaryRailAction priority 1:1
                    // (review > dispatch > complete > retry payment > details) with the same
                    // gating. `isAdmin` here is the page's admin + org_admin fold (desktop
                    // canManage). Desktop's provider complete (canCompleteAsProvider) reduces
                    // to actionState.canComplete alone because this route only admits
                    // provider-and-above, so canComplete is the effective gate for every
                    // reachable role. Every receiver is an existing page handler (onView /
                    // onDispatch -> console_dispatch_emergency / onComplete -> the page-level
                    // completion modal / onRetryPayment, which re-checks canRetryPayment
                    // itself); no new mutation is introduced. Tones reuse the vitalTracks
                    // accent palette (sky/emerald/amber) - no new colors.
                    const detailsAction = { label: 'Details', icon: Eye, onClick: () => { setActiveRequest(null); onView?.(activeRequest); } };
                    let primaryAction = detailsAction;
                    let primaryKind = 'details';
                    if (canonicalizeEmergencyStatus(activeRequest.status, null) === 'pending_approval') {
                        primaryKind = 'review';
                        primaryAction = { label: 'Review', icon: ClipboardCheck, tone: 'hsl(var(--destructive))', onClick: () => { setActiveRequest(null); onView?.(activeRequest); } };
                    } else if (isAdmin && actionState.canDispatch) {
                        primaryKind = 'dispatch';
                        primaryAction = { label: 'Dispatch', icon: Send, tone: 'hsl(200 98% 39%)', onClick: () => { setActiveRequest(null); onDispatch?.(activeRequest); } };
                    } else if (actionState.canComplete) {
                        primaryKind = 'complete';
                        primaryAction = { label: 'Complete', icon: CheckCheck, tone: 'hsl(162 94% 24%)', onClick: () => { setActiveRequest(null); onComplete?.(activeRequest); } };
                    } else if (actionState.canRetryPayment) {
                        primaryKind = 'retry';
                        primaryAction = { label: 'Retry payment', icon: RefreshCw, tone: 'hsl(26 90% 37%)', onClick: () => { setActiveRequest(null); onRetryPayment?.(activeRequest); } };
                    }
                    const secondaryAction = primaryKind === 'details' ? undefined : detailsAction;
                    // Every OTHER eligible action lands in the quiet 2-col grid below the CTA
                    // row — the desktop RequestDetailRail grid, gate for gate (Dispatch when
                    // canManage && canDispatch, Complete when canComplete under the same
                    // provider-route fold as the primary chain, Retry when canRetryPayment),
                    // each minus whatever the primary already claims. Details is the sheet's
                    // secondary CTA above, so it never repeats here. Icons + tones reuse the
                    // primary chain's exact values; each extra closes the sheet then routes to
                    // the same page receiver — no new mutation path.
                    const extraActions = [
                        isAdmin && actionState.canDispatch && primaryKind !== 'dispatch' &&
                            { label: 'Dispatch', icon: Send, tone: 'hsl(200 98% 39%)', onClick: () => { setActiveRequest(null); onDispatch?.(activeRequest); } },
                        actionState.canComplete && primaryKind !== 'complete' &&
                            { label: 'Complete', icon: CheckCheck, tone: 'hsl(162 94% 24%)', onClick: () => { setActiveRequest(null); onComplete?.(activeRequest); } },
                        actionState.canRetryPayment && primaryKind !== 'retry' &&
                            { label: 'Retry', icon: RefreshCw, tone: 'hsl(26 90% 37%)', onClick: () => { setActiveRequest(null); onRetryPayment?.(activeRequest); } },
                    ].filter(Boolean);
                    // Islands render through MobileDetailSheet -> MobileDetailIslands (canon
                    // tiles); falsy entries are skipped, so conditional facts drop out cleanly.
                    return (
                        <MobileDetailSheet
                            isOpen
                            onClose={() => setActiveRequest(null)}
                            icon={ClipboardCheck}
                            iconTone={vital?.tone}
                            avatarUrl={projection.patientDisplay.avatar}
                            avatarInitials={projection.patientDisplay.initials}
                            eyebrow={serviceLabel(activeRequest)}
                            title={name}
                            statusPill={vital?.pill}
                            vital={vital ? { ...vital, label: 'Request status' } : null}
                            islands={[
                                { icon: User, label: 'Patient', value: name },
                                phone && { icon: Phone, label: 'Phone', value: phone, href: `tel:${String(phone).replace(/[\s-]/g, '')}` },
                                patientEmail && { icon: Mail, label: 'Email', value: patientEmail, href: `mailto:${patientEmail}` },
                                { icon: ClipboardCheck, label: 'Service type', value: serviceLabel(activeRequest) },
                                { icon: Hospital, label: 'Facility', value: facility },
                                { icon: Ambulance, label: 'Responder', value: responder },
                                !terminal && projection.responderDisplay.hasResponder && { icon: Clock, label: 'ETA', value: projection.responderDisplay.etaLabel },
                                isAmbulanceService && projection.serviceDisplay.hasAmbulanceType && { icon: Ambulance, label: 'Ambulance type', value: projection.serviceDisplay.ambulanceTypeLabel },
                                isAmbulanceService && vehicleParts.length > 0 && { icon: Ambulance, label: 'Vehicle', value: vehicleParts.join(' · ') },
                                actionState.isBedFlow && bedParts.length > 0 && { icon: BedDouble, label: 'Bed', value: bedParts.join(' · ') },
                                {
                                    icon: MapPin,
                                    label: 'Location',
                                    // Transcribed place label when the reverse geocode resolves;
                                    // raw coords stay as the honest fallback while loading/unresolved.
                                    value: activePlace?.shortLabel || location,
                                    // Reuses the EmergencyDetailsModal external-map URL shape.
                                    href: projection.locationDisplay.canOpenExternalMap && coordinates
                                        ? `https://maps.google.com/?q=${coordinates.lat},${coordinates.lng}`
                                        : undefined,
                                },
                                hasPayment && { icon: CreditCard, label: 'Payment', value: paymentParts.join(' · ') },
                                displayId && {
                                    icon: Hash,
                                    label: 'Reference',
                                    value: displayId,
                                    onPress: (event) => {
                                        navigator.clipboard?.writeText(String(displayId))?.catch(() => {});
                                        triggerFromEvent(event, { variant: FEEDBACK_TYPES.SUCCESS, color: 'hsl(var(--spark))', haptic: true, sound: true });
                                    },
                                },
                                // Day-aware stamps (desktop DetailLine parity): date-only labels
                                // dropped the clock time these lifecycle facts hinge on.
                                { icon: Calendar, label: 'Created', value: formatRequestDayTime(activeRequest.created_at) },
                                terminal && activeRequest.completed_at && { icon: CheckCheck, label: 'Completed', value: formatRequestDayTime(activeRequest.completed_at) },
                                terminal && activeRequest.cancelled_at && { icon: X, label: 'Cancelled', value: formatRequestDayTime(activeRequest.cancelled_at) },
                            ]}
                            primary={primaryAction}
                            secondary={secondaryAction}
                            extras={extraActions}
                        >
                            {/* Cash settlement stays fail-closed BY DESIGN (canProcessCash is
                                hardwired false until the finance receiver pass lands). Same
                                gated branch as the desktop rail: it never renders today, and
                                when the flag opens it routes to the same onProcessCash stub. */}
                            {actionState.canProcessCash && (
                                <button
                                    type="button"
                                    onClick={() => onProcessCash?.(activeRequest)}
                                    className="h-12 w-full rounded-button bg-muted/25 text-sm font-semibold text-muted-foreground transition-all hover:bg-muted/35 active:scale-[0.96]"
                                >
                                    Cash settlement handled in Finance
                                </button>
                            )}
                        </MobileDetailSheet>
                    );
                })()}
            </MobilePageShell>
        </PullToRefresh>
    );
};
