import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    AlertCircle,
    Calendar,
    Clock,
    Edit,
    Eye,
    Hash,
    Hospital,
    MapPin,
    Siren,
    Stethoscope,
    Trash2,
} from 'lucide-react';
import { PullToRefresh } from './PullToRefresh';
import { MobilePageShell } from './MobilePageShell';
import { MobileKPIStrip } from './MobileKPIStrip';
import { MobileListEnd, MobileListEmpty, MobileListLoadMore, MobileListLoadingMore } from './MobileListStates';
import { MobileDetailSheet } from './MobileDetailSheet';
import { MobileSelectionBar } from './MobileSelectionBar';
import { useFeedback } from '../../hooks/useFeedback';
import { FEEDBACK_TYPES } from '../../contexts/FeedbackContext';
import { useStableList } from './useStableList';
import { useLoadMoreControl } from './useLoadMoreControl';
// Mobile canon kit: the grouped-list grammar, loading truth, search row, and
// heading live in shared components (extraction source: CANON_COMPONENT_SPECS.md);
// this page keeps only its DOMAIN - visit projection, states, sheet, empty logic.
import { useSkeletonWarmup, UpdatingPillRow, SkeletonGroupList } from './canon/Loading';
import { GroupedList, MobileListRow } from './canon/GroupedList';
import { SearchRow } from './canon/SearchRow';
import { MobileHeading } from './canon/MobileHero';
import { LOAD_MORE_ROOT_MARGIN } from './canon/constants';
import { visitRowProjection, getVisitStatusKey } from '../../utils/visitRowProjection';
import { formatRequestDayTime } from '../../utils/requestDisplay';
import { resolveVital } from '../../constants/vitalTracks';

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

/**
 * MobileVisits — the Visits mobile surface on the MobileEmergency list grammar:
 * flat header + chip strip + flat search row + iOS-Settings recency-grouped frosted
 * panels + MobileDetailSheet reveal. Search/KPI truth stays service-owned (the page
 * refetches); this component renders and accumulates, it never re-filters locally.
 */
export const MobileVisits = ({
    visits,
    loading,
    // Background-refetch signal (wired by the desktop conversion): the Updating
    // pill + local load-more spinner; the list never re-skeletons on refetch.
    isFetching = false,
    // Visible-scope total (the page's filtered count); statistics-derived fallback.
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
    selectedIds = [],
    onSelect,
    onSelectAll,
    onOpenFilters,
    hasMore,
    onLoadMore,
}) => {
    const observerTarget = useRef(null);
    // Multi-select restored 2026-07-10 as a fail-closed MIRROR of desktop: the selection
    // MECHANISM renders but the bulk WRITE stays locked — VisitsPage's only bulk control
    // is a DISABLED delete ("locked until backend authority is proved"), so mobile shows
    // the same disabled bar, never a live mutation. Gated by selectionEnabled (page: isAdmin).
    const selectedIdSet = useMemo(() => new Set(selectedIds || []), [selectedIds]);
    const selectionMode = selectionEnabled && selectedIdSet.size > 0;
    const [activeVisit, setActiveVisit] = useState(null);
    const { triggerFromEvent } = useFeedback();
    // Forced skeleton on every mount (canon useSkeletonWarmup): guarantees a
    // skeleton-first load on cached bottom-nav navigation, not just on refresh.
    const warmingUp = useSkeletonWarmup();

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

    const kpis = useMemo(() => mobileVisitStates.map((item) => ({
        id: item.id,
        label: item.label,
        value: getMobileVisitStateCount({ item, statistics, visits: visitRows }),
        color: item.color,
    })), [statistics, visitRows]);

    const totalCount = countNumber(statistics?.total, visitRows.length);
    // Header count tracks the ACTIVE scope, not the raw total — "62 visits" must not sit
    // above a 3-row Cancelled-filtered list. The `count` prop is the page's real
    // visible-scope total; the per-KPI stat is the fallback honest scope count.
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
                    <MobileHeading
                        title="Visits"
                        noun="visit"
                        count={visibleCount}
                        showSkeleton={showSkeleton}
                        failedEmpty={Boolean(errorMessage) && displayVisits.length === 0}
                    />

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
                        <SearchRow
                            placeholder="Search visits..."
                            search={filters?.search}
                            onSearchCommit={(value) => setFilters?.((prev) => ({ ...prev, search: value }))}
                            searchTestId="mobile-visits-sheet-search"
                            entityLabel="visits"
                            onOpenFilters={onOpenFilters}
                            hasFilter={hasFilter}
                            onOpenStats={(isAdmin || isOrgAdmin) ? onViewAnalytics : null}
                            statsLabel="Open visit statistics"
                        />

                        {/* Background-refetch feedback: placeholder data stays on screen while
                            refetching (KPI switch, search, filter, pull-to-refresh, load-more),
                            so `loading` stays false — `isFetching` is the only signal. Hidden
                            under the skeleton, which already communicates load. */}
                        <UpdatingPillRow show={isFetching && !showSkeleton} />

                        <div className="mt-3 space-y-2">
                        {selectionEnabled && (
                            <MobileSelectionBar
                                count={selectedIdSet.size}
                                onSelectAll={() => onSelectAll?.(true)}
                                onClear={() => onSelectAll?.(false)}
                            >
                                {/* Fail-closed: bulk visit outcomes have no receiver, so the
                                    bulk control is DISABLED (mirrors VisitsPage's locked bar). */}
                                <button
                                    type="button"
                                    disabled
                                    aria-label="Bulk visit outcomes are locked until authorized"
                                    title="Bulk visit outcomes are locked until authorized"
                                    className="flex h-8 w-8 items-center justify-center rounded-button bg-destructive/12 text-destructive opacity-40"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </MobileSelectionBar>
                        )}
                        {!loading && errorMessage && displayVisits.length > 0 && (
                            <MobileVisitErrorBanner message={errorMessage} onRetry={onRetry || onRefresh} />
                        )}

                        {/* iOS-Settings grouped list (canon kit): one frosted PANEL per recency
                            bucket over the atlas; rows are transparent, separated by a slate
                            hairline — separation is fill/frost, never a stroke. Grouping is
                            render-only; the group-shaped skeleton holds the exact final layout
                            and the real list REPLACES it in place (no entrance motion). */}
                        {showSkeleton ? (
                            <SkeletonGroupList groups={2} rowsPerGroup={[3, 3]} />
                        ) : (
                            <GroupedList
                                items={displayVisits}
                                getDate={visitWhen}
                                getStatus={(visit) => getVisitStatusKey(visit?.status)}
                                renderRow={(visit) => (
                                    <MobileVisitRow
                                        visit={visit}
                                        onOpen={setActiveVisit}
                                        selectable={selectionEnabled}
                                        selected={selectedIdSet.has(visit.id)}
                                        selectionMode={selectionMode}
                                        onToggleSelect={(it) => onSelect?.(it.id, !selectedIdSet.has(it.id))}
                                        onLongPress={(it) => onSelect?.(it.id, true)}
                                    />
                                )}
                            />
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

// Donor row anatomy with the visit identity (canon MobileListRow): status-tinted
// orb (vitalTracks tones), patient name 15/500, "{type} · {facility}" meta, trailing
// day-aware time + status pill + chevron. Tap opens the MobileDetailSheet (approved
// design + desktop rail behaviour), never an inline dropdown.
const MobileVisitRow = ({ visit, onOpen, selectable, selected, selectionMode, onToggleSelect, onLongPress }) => {
    const row = visitRowProjection(visit);
    const vital = resolveVital('visit', row.statusKey);
    const pill = vital?.pill;
    const orbClass = pill?.className || 'bg-muted/34 text-muted-foreground';
    const isEmergency = String(visit?.visit_type || visit?.type || '').includes('emergency');
    const TypeIcon = isEmergency ? Siren : Stethoscope;

    return (
        <MobileListRow
            item={visit}
            dataAttr="data-mobile-visit-row"
            onOpen={() => onOpen(visit)}
            ariaLabel={`Open ${row.patientName}`}
            orbClass={orbClass}
            icon={TypeIcon}
            title={row.patientName}
            meta={`${row.serviceType} · ${row.primary}`}
            time={formatRequestDayTime(visitWhen(visit))}
            pill={{ className: orbClass, label: pill?.label || row.statusLabel, dataStatus: row.statusKey }}
            selectable={selectable}
            selected={selected}
            selectionMode={selectionMode}
            onToggleSelect={onToggleSelect}
            onLongPress={onLongPress}
        />
    );
};
