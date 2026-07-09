import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
    AlertCircle,
    BarChart3,
    Calendar,
    ChevronRight,
    Clock,
    Edit,
    Eye,
    Filter,
    Hash,
    Hospital,
    MapPin,
    Search,
    Siren,
    Stethoscope,
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
import { useLoadMoreControl } from './useLoadMoreControl';
import { visitRowProjection, getVisitStatusKey } from '../../utils/visitRowProjection';
import { formatRequestDayTime } from '../../utils/requestDisplay';
import { resolveVital } from '../../constants/vitalTracks';
import { groupByRecency } from '../../utils/groupByRecency';

// Minimum skeleton time on every mount. Bottom-nav navigation mounts with cached
// data (loading already false), so without this the page would skip the skeleton and
// assemble cached content top-to-bottom. A short forced warm-up makes navigation load
// skeleton-first then reveal in one commit — identical to a hard refresh. Tunable.
const SKELETON_WARMUP_MS = 400;

const countNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

// Chip-dot hues come straight from vitalTracks (the single mobile status-tone truth):
// resolveVital('visit', ...).accent is a space-separated hsl() string, the same hue the
// row orbs and pills render. No local hex duplicates — a tone change lands in
// vitalTracks once and every visit surface follows.
const visitStateAccent = (statusKey) => resolveVital('visit', statusKey)?.accent || 'hsl(var(--muted-foreground))';

// State filter chips for MobileKPIStrip (active chip is brand-filled by the strip
// itself). countKey maps into the service-owned `statistics` payload.
const mobileVisitStates = [
    { id: 'all', label: 'All', countKey: 'total', color: 'hsl(var(--muted-foreground))' },
    { id: 'scheduled', label: 'Scheduled', countKey: 'scheduled', color: visitStateAccent('scheduled') },
    { id: 'in_progress', label: 'Active', countKey: 'inProgress', color: visitStateAccent('in_progress') },
    { id: 'completed', label: 'Done', countKey: 'completed', color: visitStateAccent('completed') },
    { id: 'cancelled', label: 'Cancelled', countKey: 'cancelled', color: visitStateAccent('cancelled') },
];

const MobileVisitsAtlasLayer = () => (
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

const getMobileVisitStateCount = ({ item, statistics, visits }) => {
    const fallback = item.id === 'all'
        ? visits.length
        : visits.filter((visit) => getVisitStatusKey(visit?.status) === item.id).length;

    return countNumber(statistics?.[item.countKey], fallback);
};

const hasMobileVisitFilters = (filters = {}) => Boolean(
    filters?.search ||
    (filters?.status && filters.status.length > 0) ||
    (filters?.visit_type && filters.visit_type.length > 0) ||
    filters?.date
);

// The resolved date a visit sorts, groups, and stamps by: the scheduled `date` first,
// then the older scheduled_at spelling, then created_at as the honest last resort.
const visitWhen = (visit) => visit?.date || visit?.scheduled_at || visit?.created_at;

// Group-shaped load scaffold: mirrors the real recency panel 1:1 (same header row,
// frosted panel, row rhythm, and 62px hairline inset) so the list REPLACES it in place
// with zero layout jump — no top-to-bottom entrance, the skeleton holds the layout and
// content materializes where it already sat. Apple/iOS loading model.
const MobileVisitsListSkeleton = ({ groups = 2, rowsPerGroup = 3 }) => (
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
                                <div className="ml-2 flex shrink-0 flex-col items-end gap-2">
                                    <span className="h-3 w-12 rounded-pill bg-muted/20 shimmer" />
                                    <span className="h-6 w-14 rounded-pill bg-muted/20 shimmer" />
                                </div>
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

/**
 * MobileVisits — the Visits mobile surface on the MobileEmergency list grammar:
 * flat header + chip strip + flat search row + iOS-Settings recency-grouped frosted
 * panels + MobileDetailSheet reveal. Search/KPI truth stays service-owned (the page
 * refetches); this component renders and accumulates, it never re-filters locally.
 */
export const MobileVisits = ({
    visits,
    loading,
    // ADDITIVE (wave-2a): background-refetch signal. The desktop lane wires the real
    // React Query isFetching later (ledger interface request filed); defaults false so
    // today's page contract works unchanged.
    isFetching = false,
    // ADDITIVE (wave-2a): visible-scope total (the page's filtered count). Until the
    // desktop lane wires it, the summary derives the scope count from `statistics`.
    count,
    statistics,
    filters,
    setFilters,
    activeKpi = 'all',
    onKpiChange,
    onView,
    onEdit,
    onDelete,
    onRefresh,
    errorMessage,
    onRetry,
    onViewAnalytics,
    isAdmin,
    isOrgAdmin,
    canEdit = isAdmin || isOrgAdmin,
    canDelete = false,
    selectionEnabled = false,
    onOpenFilters,
    hasMore,
    onLoadMore,
}) => {
    const observerTarget = useRef(null);
    const [activeVisit, setActiveVisit] = useState(null);
    // Forced skeleton on every mount (see SKELETON_WARMUP_MS): guarantees a
    // skeleton-first load on cached bottom-nav navigation, not just on refresh.
    const [warmingUp, setWarmingUp] = useState(true);
    const { triggerFromEvent } = useFeedback();

    // LOAD MORE = ACCUMULATE (2026-07-09 user arbitration). The page still swaps pages
    // through usePagination + onLoadMore — every fetch replaces `visits` with ONE page —
    // so accumulation lives here: an id-keyed map keeps every row seen since the last
    // scope change and the list renders the accumulation. The serialized scope signature
    // (search + sheet filters + KPI) resets the map so a narrowed scope never shows
    // stale rows from another scope; a same-scope refetch (realtime, pull-to-refresh)
    // updates rows in place by id. Page-level infinite query is the desktop lane's
    // later refinement — this local accumulation is the approved interim.
    const filterSignature = JSON.stringify({
        search: filters?.search || '',
        status: filters?.status || null,
        visitType: filters?.visit_type || null,
        date: filters?.date || null,
        kpi: activeKpi || 'all',
    });
    const accumulatorRef = useRef({ signature: null, order: [], byId: new Map() });
    const visitRows = useMemo(() => {
        const store = accumulatorRef.current;
        if (store.signature !== filterSignature) {
            store.signature = filterSignature;
            store.order = [];
            store.byId = new Map();
        }
        (Array.isArray(visits) ? visits : []).forEach((row) => {
            const id = row?.id;
            if (id === null || id === undefined) return;
            if (!store.byId.has(id)) store.order.push(id);
            store.byId.set(id, row);
        });
        return store.order.map((id) => store.byId.get(id));
    }, [visits, filterSignature]);

    const { displayItems: displayVisits } = useStableList(visitRows, loading);
    const { armed, requestLoad, triggerLoad } = useLoadMoreControl({ hasMore, loading, onLoadMore });
    // Skeleton while warming up OR while the first real fetch is still pending.
    // When it clears, the whole list swaps in a single commit — no top-to-bottom assemble.
    const showSkeleton = warmingUp || (loading && displayVisits.length === 0);
    const hasFilter = hasMobileVisitFilters(filters);

    // Search debounce: typing edits a local draft; the server filter (and its
    // network refetch) commits 300ms after the last keystroke instead of per
    // character. External writes (Clear search recovery) sync back into the draft.
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

    useEffect(() => {
        const timer = setTimeout(() => setWarmingUp(false), SKELETON_WARMUP_MS);
        return () => clearTimeout(timer);
    }, []);

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

    const kpis = useMemo(() => mobileVisitStates.map((item) => ({
        id: item.id,
        label: item.label,
        value: getMobileVisitStateCount({ item, statistics, visits: visitRows }),
        color: item.color,
    })), [statistics, visitRows]);

    const totalCount = countNumber(statistics?.total, visitRows.length);
    // Header count tracks the ACTIVE scope, not the raw total — "62 visits" must not sit
    // above a 3-row Cancelled-filtered list. The additive `count` prop is the page's
    // real visible-scope total; until the desktop lane wires it, the per-KPI stat is
    // the closest honest scope count.
    const activeStateItem = mobileVisitStates.find((item) => item.id === (activeKpi || 'all')) || mobileVisitStates[0];
    const scopedCount = activeStateItem.id === 'all'
        ? totalCount
        : getMobileVisitStateCount({ item: activeStateItem, statistics, visits: visitRows });
    const visibleCount = count === null || count === undefined ? scopedCount : countNumber(count, scopedCount);

    // Empty-state cause priority mirrors desktop: search > sheet filters > KPI > true-empty.
    // The KPI cause only fires when it is the sole narrowing scope, and recovery resets the
    // chip to All (the list itself may be non-empty under a different KPI).
    const kpiEmptyCause = Boolean(activeKpi && activeKpi !== 'all') && !filters?.search && !hasMobileVisitFilters(filters);
    const kpiEmptyLabel = mobileVisitStates.find((item) => item.id === activeKpi)?.label || 'selected';
    // True-empty honest states (2026-07-09 arbitration): with no narrowing cause at all,
    // a zero list means something specific per persona. Keyed on the flags the page
    // already passes: admin/org_admin zero = the RLS void (visits reads are pending a
    // backend access policy for console operators); everyone else on this provider-min
    // route is the provider/doctor persona, whose zero is the doctor-join void (no
    // visits rows are linked to their doctor identity yet).
    const trueEmpty = !filters?.search && !hasMobileVisitFilters(filters) && !(activeKpi && activeKpi !== 'all');
    const trueEmptyHint = (isAdmin || isOrgAdmin)
        ? 'Visit records are pending a backend access policy.'
        : 'No visits are linked to your name yet.';

    return (
        <PullToRefresh onRefresh={onRefresh}>
            <MobilePageShell
                animatePageLoad={false}
                contentClassName="relative min-h-[calc(100dvh-3rem)] overflow-hidden px-0 pb-32 pt-8 text-foreground"
            >
                <MobileVisitsAtlasLayer />
                <div className="relative z-10 space-y-3">
                    {/* Chrome (title + summary) is always present — no entrance motion.
                        Only DATA regions load; they scaffold with skeletons and replace
                        in place, so nothing sweeps in top-to-bottom. */}
                    <section className="px-4">
                        <h1 className="text-2xl font-semibold leading-tight tracking-tight text-foreground">Visits</h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {showSkeleton
                                ? 'Loading visits...'
                                // A failed load must not report a confident "0 visits" —
                                // the summary stays honest about what actually happened.
                                : errorMessage && displayVisits.length === 0
                                    ? 'Visits did not load'
                                    : `${visibleCount} visit${visibleCount === 1 ? '' : 's'}`}
                        </p>
                    </section>

                    <MobileKPIStrip
                        kpis={kpis}
                        activeKpi={activeKpi || 'all'}
                        onKpiClick={onKpiChange}
                        loading={showSkeleton}
                    />

                    <section className="px-4" data-testid="mobile-visits-activity-sheet">
                        {/* Flat search row (canon Apple search bar): no wrapping surface,
                            no drag-handle. The input + filter + stats controls sit directly
                            on the page over the atlas; the grouped list follows below. */}
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <Search size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
                                <input
                                    type="text"
                                    inputMode="search"
                                    placeholder="Search visits..."
                                    value={searchDraft}
                                    onChange={(event) => setSearchDraft(event.target.value)}
                                    className="h-9 w-full rounded-inner bg-background/60 pl-10 pr-10 text-[13px] font-medium text-foreground shadow-sm transition-all placeholder:text-muted-foreground/50 focus-visible:shadow-[0_0_0_3px_hsl(var(--primary)/0.18)] dark:bg-white/[0.06]"
                                    data-testid="mobile-visits-sheet-search"
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
                                data-state={hasFilter ? 'filtered' : 'idle'}
                                className="flex h-9 w-9 items-center justify-center rounded-button bg-background/60 text-muted-foreground shadow-sm transition-all hover:bg-foreground/10 hover:text-foreground active:scale-[0.96] dark:bg-white/[0.06]"
                                aria-label="Filter visits"
                                aria-haspopup="dialog"
                            >
                                <Filter size={18} />
                            </motion.button>

                            {(isAdmin || isOrgAdmin) && (
                                <motion.button
                                    type="button"
                                    whileTap={{ scale: 0.96 }}
                                    onClick={(event) => {
                                        onViewAnalytics?.();
                                        triggerFromEvent(event, { variant: FEEDBACK_TYPES.CLICK, color: 'hsl(var(--foreground))', haptic: true, sound: true });
                                    }}
                                    data-state="idle"
                                    className="flex h-9 w-9 items-center justify-center rounded-button bg-background/60 text-muted-foreground shadow-sm transition-all hover:bg-foreground/10 hover:text-foreground active:scale-[0.96] dark:bg-white/[0.06]"
                                    aria-label="Open visit statistics"
                                    aria-haspopup="dialog"
                                >
                                    <BarChart3 size={18} />
                                </motion.button>
                            )}
                        </div>

                        {/* Background-refetch feedback: placeholder data stays on screen while
                            refetching (KPI switch, search, filter, pull-to-refresh, load-more),
                            so `loading` stays false — `isFetching` is the only signal. Hidden
                            under the skeleton, which already communicates load. */}
                        <div className="mt-4 flex items-center justify-end px-2">
                            {isFetching && !showSkeleton && (
                                <span role="status" aria-live="polite" className="rounded-pill bg-muted/28 px-3 py-1 text-[11px] font-semibold text-muted-foreground">
                                    Updating
                                </span>
                            )}
                        </div>

                        <div className="mt-3 space-y-2">
                        {!loading && errorMessage && displayVisits.length > 0 && (
                            <MobileVisitErrorBanner message={errorMessage} onRetry={onRetry || onRefresh} />
                        )}

                        {/* iOS-Settings grouped list (canon): one frosted PANEL per recency
                            bucket over the atlas; rows are transparent, separated by a slate
                            hairline — separation is fill/frost, never a stroke. Grouping is
                            render-only; id-keyed state is unaffected.

                            Load model: the group-shaped skeleton holds the exact final
                            layout, then the real list REPLACES it in place — no entrance
                            motion at all. A fade here would run FROM BLANK on cached (bottom-
                            nav) mounts where the data is already present, which reads as a
                            top-to-bottom load; instant replace keeps reload and navigation
                            identical. Nothing moves; content is simply there once mounted. */}
                        {showSkeleton ? (
                            <MobileVisitsListSkeleton />
                        ) : (
                        <div className="space-y-[18px]">
                            {groupByRecency(
                                displayVisits,
                                visitWhen,
                                (visit) => getVisitStatusKey(visit?.status),
                            ).map(({ key, label, items }) => (
                                <div key={key}>
                                    <div className="flex items-center justify-between px-1 pb-2.5">
                                        <span className="text-[13px] font-bold leading-[17px] text-muted-foreground">{label}</span>
                                        <span className="text-[13px] font-bold text-muted-foreground/60 tabular-nums">{items.length}</span>
                                    </div>
                                    <div className="rounded-inner bg-foreground/[0.06] dark:bg-white/[0.08] backdrop-blur-xl px-3 py-1.5">
                                        {items.map((visit, index) => (
                                            <React.Fragment key={visit.id}>
                                                <MobileVisitRow visit={visit} onOpen={setActiveVisit} />
                                                {index < items.length - 1 && (
                                                    <div className="h-px bg-[hsl(var(--muted-foreground)/0.08)] ml-[62px]" aria-hidden="true" />
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        )}

                        <div ref={observerTarget} className="flex min-h-[64px] items-center justify-center">
                            {/* While the next page is in flight the sentinel swaps the load-more
                                button for a local spinner; the top "Updating" pill may show at the
                                same time (global signal), the spinner is the local one. */}
                            {isFetching && !showSkeleton && hasMore && displayVisits.length > 0 && <MobileListLoadingMore />}
                            {!loading && !isFetching && hasMore && <MobileListLoadMore armed={armed} onRequest={requestLoad} labelTone="plain" />}
                            {!loading && !hasMore && displayVisits.length > 0 && (
                                <MobileListEnd label="End of visits" />
                            )}
                        </div>

                        {displayVisits.length === 0 && !loading && errorMessage && (
                            <MobileListEmpty
                                icon={AlertCircle}
                                label="Visits did not load"
                                hint="Something went wrong loading visits."
                                onRecover={onRetry || onRefresh}
                                recoverLabel="Retry"
                                labelTone="plain"
                            />
                        )}

                        {displayVisits.length === 0 && !loading && !errorMessage && (
                            <MobileListEmpty
                                icon={Calendar}
                                label="No visits found"
                                reason={filters?.search ? 'search' : hasMobileVisitFilters(filters) ? 'filtered' : kpiEmptyCause ? 'filtered' : 'empty'}
                                hint={
                                    kpiEmptyCause
                                        ? `No visits in the ${kpiEmptyLabel} scope.`
                                        : trueEmpty
                                            ? trueEmptyHint
                                            : undefined
                                }
                                onRecover={
                                    filters?.search
                                        ? () => setFilters?.((prev) => ({ ...prev, search: '' }))
                                        : hasMobileVisitFilters(filters)
                                            ? () => onOpenFilters?.()
                                            : kpiEmptyCause
                                                ? () => onKpiChange?.('all')
                                                : undefined
                                }
                                recoverLabel={filters?.search ? 'Clear search' : hasMobileVisitFilters(filters) ? 'Adjust filters' : kpiEmptyCause ? 'Show all visits' : undefined}
                                labelTone="plain"
                            />
                        )}
                        </div>
                    </section>
                </div>

                {activeVisit && (() => {
                    const row = visitRowProjection(activeVisit);
                    const vital = resolveVital('visit', row.statusKey);
                    const isEmergency = String(activeVisit.visit_type || activeVisit.type || '').includes('emergency');
                    const ServiceIcon = isEmergency ? Siren : Stethoscope;
                    // Copyable reference (donor clipboard+haptic pattern): display_id is the
                    // human label and leads when present; the raw UUID slice only shows when
                    // no display id exists. Copy writes the display id, else the full UUID.
                    const referenceValue = activeVisit.display_id
                        ? String(activeVisit.display_id)
                        : `#${String(activeVisit.id || '').slice(0, 12) || 'visit'}`;
                    const referenceCopy = String(activeVisit.display_id || activeVisit.id || '');
                    const scheduledAt = activeVisit.date || activeVisit.scheduled_at;
                    return (
                        <MobileDetailSheet
                            isOpen
                            onClose={() => setActiveVisit(null)}
                            icon={ServiceIcon}
                            iconTone={vital?.tone}
                            eyebrow={row.serviceType}
                            title={row.patientName}
                            statusPill={vital?.pill}
                            vital={vital ? { ...vital, label: 'Visit status' } : null}
                            islands={[
                                { icon: Stethoscope, label: 'Practitioner', value: getDoctorName(activeVisit) },
                                { icon: Hospital, label: 'Facility', value: getFacilityName(activeVisit) },
                                { icon: MapPin, label: 'Location', value: activeVisit.room_number ? `Room ${activeVisit.room_number}` : 'No room' },
                                // Day-aware lifecycle stamps (desktop DetailLine parity):
                                // date-only labels dropped the clock time these facts hinge on.
                                scheduledAt && { icon: Calendar, label: 'Scheduled', value: formatRequestDayTime(scheduledAt) },
                                activeVisit.created_at && { icon: Clock, label: 'Created', value: formatRequestDayTime(activeVisit.created_at) },
                                referenceCopy && {
                                    icon: Hash,
                                    label: 'Reference',
                                    value: referenceValue,
                                    onPress: (event) => {
                                        navigator.clipboard?.writeText(referenceCopy)?.catch(() => {});
                                        triggerFromEvent(event, { variant: FEEDBACK_TYPES.SUCCESS, color: 'hsl(var(--spark))', haptic: true, sound: true });
                                    },
                                },
                            ]}
                            primary={canEdit
                                ? { label: 'Edit visit', icon: Edit, onClick: () => { setActiveVisit(null); onEdit?.(activeVisit); } }
                                : { label: 'View details', icon: Eye, onClick: () => { setActiveVisit(null); onView?.(activeVisit); } }}
                            secondary={canEdit
                                ? { label: 'Details', icon: Eye, onClick: () => { setActiveVisit(null); onView?.(activeVisit); } }
                                : undefined}
                        >
                            {/* Delete stays fail-closed BY DESIGN: the page hardwires
                                canDelete={false} until a delete receiver/RLS/app consequence is
                                proved (PAGE_REVAMP_GATE). The branch never renders today; when
                                authority lands it routes to the page's handler, nothing local. */}
                            {canDelete && (
                                <button
                                    type="button"
                                    onClick={() => { setActiveVisit(null); onDelete?.(activeVisit); }}
                                    className="h-12 w-full rounded-button bg-destructive/10 text-sm font-semibold text-destructive transition-all hover:bg-destructive/16 active:scale-[0.96]"
                                >
                                    Delete visit
                                </button>
                            )}
                        </MobileDetailSheet>
                    );
                })()}
            </MobilePageShell>
        </PullToRefresh>
    );
};

const MobileVisitErrorBanner = ({ message, onRetry }) => (
    <div
        className="rounded-inner bg-destructive/10 p-4 text-sm text-destructive shadow-[0_18px_54px_rgba(239,68,68,0.10)]"
        data-testid="mobile-visits-error-state"
    >
        <p className="font-semibold">Visits could not load</p>
        <p className="mt-1 text-xs leading-5 text-destructive/75">{message}</p>
        <button
            type="button"
            onClick={onRetry}
            className="mt-3 h-9 rounded-pill bg-destructive/10 px-4 text-xs font-semibold transition-all hover:bg-destructive/15 active:scale-[0.96]"
        >
            Retry
        </button>
    </div>
);

const getDoctorName = (visit) => (
    visit?.doctor?.name ||
    visit?.doctor ||
    visit?.doctor_name ||
    'Unassigned'
);

const getFacilityName = (visit) => (
    visit?.hospital?.name ||
    visit?.hospital_name ||
    visit?.hospital ||
    (visit?.hospital_id ? 'Linked facility' : 'No facility')
);

// Donor row anatomy with the visit identity: status-tinted orb (vitalTracks tones),
// patient name 15/500, "{type} · {facility}" meta, trailing day-aware time + status
// pill + chevron. Tap opens the MobileDetailSheet (approved design + desktop rail
// behaviour), never an inline dropdown.
const MobileVisitRow = ({ visit, onOpen }) => {
    const { triggerFromEvent } = useFeedback();
    const row = visitRowProjection(visit);
    const vital = resolveVital('visit', row.statusKey);
    const pill = vital?.pill;
    const orbClass = pill?.className || 'bg-muted/34 text-muted-foreground';
    const isEmergency = String(visit?.visit_type || visit?.type || '').includes('emergency');
    const TypeIcon = isEmergency ? Siren : Stethoscope;

    return (
        <motion.button
            type="button"
            layout="position"
            whileTap={{ scale: 0.988 }}
            onClick={() => onOpen(visit)}
            onPointerDown={(event) => triggerFromEvent(event, { variant: FEEDBACK_TYPES.CLICK, haptic: true, sound: true })}
            className="group/row w-full flex items-center gap-3 px-2 py-3 text-left rounded-inner transition-colors active:bg-foreground/[0.06] dark:active:bg-white/[0.08]"
            data-mobile-visit-row={visit.id}
            aria-haspopup="dialog"
            aria-label={`Open ${row.patientName}`}
        >
            <span className={`h-10 w-10 shrink-0 rounded-pill flex items-center justify-center ${orbClass}`}>
                <TypeIcon size={20} />
            </span>
            <div className="min-w-0 flex-1">
                <p className="text-[15px] leading-5 font-medium text-foreground truncate">{row.patientName}</p>
                <p className="mt-0.5 text-xs leading-[17px] text-muted-foreground truncate">{row.serviceType} · {row.primary}</p>
            </div>
            <span className="ml-2 shrink-0 flex flex-col items-end gap-2 min-w-[72px]">
                <span className="text-xs leading-[15px] font-bold text-foreground tabular-nums">{formatRequestDayTime(visitWhen(visit))}</span>
                <span className="flex items-center gap-2">
                    <span className={`rounded-pill px-2.5 py-[5px] text-[11px] font-bold ${orbClass}`} data-status={row.statusKey}>{pill?.label || row.statusLabel}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
                </span>
            </span>
        </motion.button>
    );
};
