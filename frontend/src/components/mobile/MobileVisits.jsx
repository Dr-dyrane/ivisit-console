import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    AlertCircle,
    Calendar,
    CalendarClock,
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
import { GroupedList } from './canon/GroupedList';
import { SearchRow } from './canon/SearchRow';
import { MobileHeading } from './canon/MobileHero';
import { LOAD_MORE_ROOT_MARGIN } from './canon/constants';
import { visitRowProjection, getVisitStatusKey } from '../../utils/visitRowProjection';
import { formatVisitInFacilityTimezone } from '../../services/visits/normalization';
import {
    createMobileVisitAccumulator,
    getVisitQueryScopeKey,
    mergeMobileVisitPageSnapshot,
} from '../../services/visits/pageProjection';
import { formatRequestDayTime } from '../../utils/requestDisplay';
import { resolveVital } from '../../constants/vitalTracks';
import {
    countNumber,
    getMobileVisitStateCount,
    hasMobileVisitFilters,
    mobileVisitStates,
    visitWhen,
} from './visits/mobileVisitsModel';
import { MobileVisitErrorBanner, MobileVisitRow } from './visits/MobileVisitRows';

// The map-like backdrop stays local to this presentation; visit state projection
// and row anatomy live in the adjacent mobile Visits modules.
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
    onManageScheduledVisit,
    canManageScheduledVisit,
    viewMode = 'all',
    onViewModeChange,
    scheduledViewEnabled = false,
    pageSnapshot = null,
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
    // is a disabled bulk change, so mobile shows
    // the same disabled bar, never a live mutation. Gated by selectionEnabled (page: isAdmin).
    const selectedIdSet = useMemo(() => new Set(selectedIds || []), [selectedIds]);
    const selectionMode = selectionEnabled && selectedIdSet.size > 0;
    const [activeVisit, setActiveVisit] = useState(null);
    const { triggerFromEvent } = useFeedback();
    // Forced skeleton on every mount (canon useSkeletonWarmup): guarantees a
    // skeleton-first load on cached bottom-nav navigation, not just on refresh.
    const warmingUp = useSkeletonWarmup();

    // Each successful range replaces its previous page snapshot. The server scope
    // key carries all filters, including care_mode, so rows cannot cross scopes.
    const filterSignature = pageSnapshot?.scopeKey || getVisitQueryScopeKey({
        filters,
        kpiFilter: activeKpi,
        viewMode,
    });
    const accumulatorRef = useRef(createMobileVisitAccumulator());
    const visitRows = useMemo(() => {
        return mergeMobileVisitPageSnapshot(accumulatorRef.current, {
            pageStart: pageSnapshot?.start || 0,
            scopeKey: filterSignature,
            totalCount: pageSnapshot?.totalCount ?? count,
            visits,
        });
    }, [count, filterSignature, pageSnapshot?.start, pageSnapshot?.totalCount, visits]);

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
    // True-empty states distinguish facility operators from clinicians without
    // exposing access-control implementation details.
    const trueEmpty = !filters?.search && !hasMobileVisitFilters(filters) && !(activeKpi && activeKpi !== 'all');
    const trueEmptyHint = (isAdmin || isOrgAdmin)
        ? 'No visits are available for your facilities yet.'
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
                        {scheduledViewEnabled && (
                            <div className="mb-3 flex h-10 items-center gap-1 rounded-button bg-muted/30 p-1" role="group" aria-label="Visit source view">
                                <button type="button" onClick={() => onViewModeChange?.('all')} aria-pressed={viewMode === 'all'} className={`h-8 flex-1 rounded-inner text-xs font-semibold ${viewMode === 'all' ? 'bg-foreground text-background' : 'text-muted-foreground'}`}>All</button>
                                <button type="button" onClick={() => onViewModeChange?.('scheduled')} aria-pressed={viewMode === 'scheduled'} className={`flex h-8 flex-1 items-center justify-center rounded-inner text-xs font-semibold ${viewMode === 'scheduled' ? 'bg-foreground text-background' : 'text-muted-foreground'}`}><CalendarClock className="mr-1.5 h-3.5 w-3.5" />Scheduled</button>
                            </div>
                        )}
                        {/* Flat search row (canon Apple search bar): no wrapping surface,
                            no drag-handle. The input + filter + stats controls sit directly
                            on the page over the atlas; the grouped list follows below. */}
                        <SearchRow
                            placeholder={viewMode === 'scheduled' ? 'Search ID, facility, clinician, or type...' : 'Search visits...'}
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
                                    aria-label="Bulk visit changes are unavailable"
                                    title="Bulk visit changes are unavailable"
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
                    const scheduledAt = activeVisit.scheduled_start_at || activeVisit.date || activeVisit.scheduled_at;
                    const scheduledSource = activeVisit.sourceKind === 'scheduled_visit';
                    const canManage = canManageScheduledVisit?.(activeVisit) === true;
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
                                { icon: scheduledSource ? CalendarClock : MapPin, label: scheduledSource ? 'Care mode' : 'Location', value: scheduledSource ? activeVisit.careModeLabel : activeVisit.room_number ? `Room ${activeVisit.room_number}` : 'No room' },
                                // Day-aware lifecycle stamps (desktop DetailLine parity):
                                // date-only labels dropped the clock time these facts hinge on.
                                scheduledAt && { icon: Calendar, label: 'Scheduled', value: scheduledSource ? formatVisitInFacilityTimezone(activeVisit) : formatRequestDayTime(scheduledAt) },
                                activeVisit.asyncConsultAvailability && { icon: CalendarClock, label: 'Async consult', value: activeVisit.asyncConsultAvailability },
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
                            extras={canManage ? [{
                                label: 'Manage visit',
                                icon: CalendarClock,
                                onClick: () => { setActiveVisit(null); onManageScheduledVisit?.(activeVisit); },
                                tone: 'hsl(190 80% 38%)',
                            }] : []}
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

const getDoctorName = (visit) => (
    visit?.assignedDoctor?.name ||
    visit?.doctor?.name ||
    visit?.doctor ||
    visit?.doctor_name ||
    'Unassigned'
);

const getFacilityName = (visit) => (
    visit?.facility?.name ||
    visit?.hospital?.name ||
    visit?.hospital_name ||
    visit?.hospital ||
    (visit?.hospital_id ? 'Linked facility' : 'No facility')
);
