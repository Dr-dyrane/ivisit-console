import React, { useMemo, useEffect, useRef, useState } from 'react';
import {
    Stethoscope,
    Eye,
    Edit,
    Trash2,
    Hospital,
    Mail,
    Phone,
    BadgeCheck,
    Clock
} from 'lucide-react';
// LIST-type page, DIRECTORY expression (MOBILE_DESIGN_SYSTEM §5) — rebuilt to canon
// 2026-07-10 (harness-driven: the grammar linter flagged "not yet on the grouped panel").
// A staff directory's obvious axes are all DEGENERATE on the live data (specialization
// 99.7% "Emergency", status 99.7% "available", a single provider_type), so panels group
// ADAPTIVELY: resolveAdaptiveGroups scores the FACILITY split and uses it only if it
// distributes, else falls to join-recency (the proven fallback — always buckets, never
// singleton-sprawls). Trailing time = directory freshness (when the record was last
// touched). Bulk delete is a REAL authorized action here (deleteDoctor receiver), unlike
// the fleet/facility/visit pages whose bulk control is a fail-closed disabled stub.
// grammar:loadmore-append=cumulative-limit — the mobile query uses offset 0 + a limit that
// grows with currentPage, so the server returns the ACCUMULATED list; useStableList over
// sourceDoctors already holds the full set. No client accumulator needed (unlike windowed
// pages), so rows never replace the window.
import { SearchRow, useSkeletonWarmup, UpdatingPillRow, MobileHeading, GroupPanel, MobileListRow, Hairline, SkeletonGroupPanel } from './canon';
import { MobileKPIStrip } from './MobileKPIStrip';
import { MobileDetailSheet } from './MobileDetailSheet';
import { MobileSelectionBar } from './MobileSelectionBar';
import { PullToRefresh } from './PullToRefresh';
import { MobilePageShell } from './MobilePageShell';
import { MobileListEnd, MobileListEmpty, MobileListLoadMore, MobileListLoadingMore } from './MobileListStates';
import { useStableList } from './useStableList';
import { useLoadMoreControl } from './useLoadMoreControl';
import { statusPill } from '../../constants/vitalTracks';
import { formatRelativeTime } from '../../utils/activityUtils';
import { resolveAdaptiveGroups } from '../../utils/adaptiveGrouping';

const metricValue = (value, fallback = 0) => {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : fallback;
};

const getStatus = (doctor) => String(doctor?.status || 'available').toLowerCase();

// The staff member's home facility — the directory's orthogonal grouping axis.
const getFacility = (doctor) => doctor?.hospitals?.name || null;

// Contacts-style directory grouping: strip a leading title, take the first letter, and
// coarsen to A-F / G-L / M-R / S-Z (+ # for non-letters) so it stays within the scorer's
// healthy 2-8 group cap. Only USED when it distributes (else recency, per the scorer) —
// so a shared title prefix or a monoliteral name set can't force a degenerate split.
const ALPHA_ORDER = ['A-F', 'G-L', 'M-R', 'S-Z', '#'];
const coarseAlpha = (name) => {
    const stripped = String(name || '').replace(/^\s*(dr|prof|mr|mrs|ms)\.?\s+/i, '').trim().toUpperCase();
    const code = stripped.charCodeAt(0);
    if (!(code >= 65 && code <= 90)) return '#';
    if (code <= 70) return 'A-F';
    if (code <= 76) return 'G-L';
    if (code <= 82) return 'M-R';
    return 'S-Z';
};

// Status-tinted orb. Literal hues (the semantic tokens collapse to brand red); status is
// degenerate on live data (mostly 'available'), but the tint stays honest per-record.
const orbClassFor = (status) => (
    status === 'available'
        ? 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-300'
        : status === 'on_call'
            ? 'bg-sky-500/12 text-sky-700 dark:text-sky-300'
            : status === 'busy'
                ? 'bg-amber-500/12 text-amber-700 dark:text-amber-300'
                : status === 'off_duty'
                    ? 'bg-muted/40 text-muted-foreground'
                    : 'bg-sky-500/12 text-sky-700 dark:text-sky-300'
);

// Atlas stage (donor recipe: MobileAmbulancesAtlasLayer — Lesson 25 macro-stage item 1;
// ambient brand tint is sanctioned expression, Lesson 18).
const MobileDoctorsAtlasLayer = () => (
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

// Filter-trigger truth: any committed narrowing counts, so the trigger's filtered state
// never lies. The KPI chips are a separate axis (status), not part of this signal.
const hasActiveDoctorFilters = (filters = {}) => Boolean(
    filters?.search ||
    (filters?.kpiFilter && filters.kpiFilter !== 'all') ||
    filters?.created_at?.start ||
    filters?.created_at?.end
);

export const MobileDoctors = ({
    doctors,
    loading,
    statistics,
    filters,
    setFilters,
    onView,
    onEdit,
    onDelete,
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
    canManage: canManageOverride,
    canDelete = false,
    selectionEnabled = false,
    selectedIds = [],
    onSelect,
    onSelectAll,
    onBulkDelete,
    canBulkDelete = false
}) => {
    const observerTarget = useRef(null);
    const [activeDoctor, setActiveDoctor] = useState(null);
    const canManage = Boolean(canManageOverride ?? (isAdmin || isOrgAdmin));
    // Background-refetch signal (KPI switch / search / pull-refresh keep loading=false).
    const refetching = isFetching || false;
    const sourceDoctors = useMemo(() => (Array.isArray(doctors) ? doctors : []), [doctors]);

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

    const { displayItems: displayDoctors, isBuffering } = useStableList(sourceDoctors, loading);
    const warmingUp = useSkeletonWarmup();
    const showTopSectionLoading = warmingUp || (loading && displayDoctors.length === 0);

    const totals = {
        all: metricValue(statistics?.total, sourceDoctors.length),
        available: metricValue(statistics?.available, sourceDoctors.filter(d => getStatus(d) === 'available').length),
        onCall: metricValue(statistics?.onCall, sourceDoctors.filter(d => getStatus(d) === 'on_call').length),
        busy: metricValue(statistics?.busy, sourceDoctors.filter(d => getStatus(d) === 'busy').length),
    };

    const doctorKPIs = [
        { id: 'all', label: 'Staff', value: totals.all, color: 'hsl(var(--muted-foreground))' },
        { id: 'available', label: 'Available', value: totals.available, color: 'hsl(160 84% 39%)' },
        { id: 'on_call', label: 'On call', value: totals.onCall, color: 'hsl(199 89% 48%)' },
        { id: 'busy', label: 'Busy', value: totals.busy, color: 'hsl(38 92% 50%)' },
    ];

    // Count integrity (§5): the heading tracks the ACTIVE KPI scope, never the raw total.
    const kpiToTotal = { all: 'all', available: 'available', on_call: 'onCall', busy: 'busy' };
    const activeKpi = filters?.kpiFilter || 'all';
    const scopeCount = totals[kpiToTotal[activeKpi] || 'all'] ?? totals.all;

    const hasFilter = hasActiveDoctorFilters(filters);

    // Selection (restored to canon 2026-07-10): gated to managers, using the SHARED page
    // selection (useRowSelection passes selectedIds/onSelect/onSelectAll).
    const canSelect = selectionEnabled && canManage && Boolean(onSelect);
    const selectedIdSet = useMemo(() => new Set(selectedIds || []), [selectedIds]);
    const selectionMode = canSelect && selectedIdSet.size > 0;

    // Adaptive, DATA-DRIVEN grouping: score FACILITY (the directory's mental axis) and use
    // it only if it distributes into a healthy 2–8 groups; otherwise fall to join-recency
    // (always buckets). Same resolution ambulances-by-station landed on. Decided per-render
    // from the actual rows, never assumed — the live data (99.7% one specialty/status)
    // would collapse any categorical spine.
    const { groups: doctorGroups } = useMemo(() => resolveAdaptiveGroups(displayDoctors, [
        { key: 'facility', assign: getFacility, orphanLabel: 'Unassigned' },
        // Staff DIRECTORY axis (Contacts-style A-Z, coarsened to <=8 buckets so the scorer
        // accepts it). Safe: if names don't distribute (e.g. a shared title prefix), the
        // scorer rejects it and we fall to recency — the adaptive-grouping contract.
        { key: 'alpha', assign: (d) => coarseAlpha(d.name), order: (keys) => keys.slice().sort((a, b) => ALPHA_ORDER.indexOf(a) - ALPHA_ORDER.indexOf(b)) },
        { type: 'coarse-recency', key: 'joined', getDate: (d) => d.updated_at || d.created_at },
    ]), [displayDoctors]);

    const renderDoctorRow = (doctor) => {
        const status = getStatus(doctor);
        const specialty = doctor.specialization || 'General';
        const facility = getFacility(doctor) || 'No facility';
        return (
            <MobileListRow
                item={doctor}
                dataAttr="data-mobile-doctor-row"
                onOpen={setActiveDoctor}
                ariaLabel={`${doctor.name || 'Unknown staff'}, ${status.replace(/_/g, ' ')}`}
                orbClass={orbClassFor(status)}
                icon={Stethoscope}
                title={doctor.name || 'Unknown staff'}
                meta={`${specialty} · ${facility}`}
                time={formatRelativeTime(doctor.updated_at || doctor.created_at)}
                pill={statusPill(status)}
                selectable={canSelect}
                selected={selectedIdSet.has(doctor.id)}
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
                <MobileDoctorsAtlasLayer />
                <div className="relative z-10 space-y-3">
                    <MobileHeading
                        title="Staff"
                        noun="member"
                        count={scopeCount}
                        showSkeleton={showTopSectionLoading}
                        failedEmpty={Boolean(errorMessage) && displayDoctors.length === 0}
                    />

                    <MobileKPIStrip
                        loading={showTopSectionLoading}
                        kpis={doctorKPIs}
                        activeKpi={activeKpi}
                        onKpiClick={(id) => setFilters?.(prev => ({ ...prev, kpiFilter: id }))}
                    />

                    <section className="px-4">
                        <SearchRow
                            placeholder="Search staff..."
                            search={filters?.search || ''}
                            onSearchCommit={(value) => setFilters?.(prev => ({ ...prev, search: value }))}
                            entityLabel="staff"
                            onOpenFilters={onOpenFilters}
                            filterSheetOpen={filterSheetOpen}
                            hasFilter={hasFilter}
                            onOpenStats={canManage ? onViewAnalytics : null}
                            statsOpen={analyticsOpen}
                            statsLabel="Open staff statistics"
                        />

                        <UpdatingPillRow show={(refetching || isBuffering) && !showTopSectionLoading} />

                        <div className="mt-3 space-y-2">
                            {canSelect && (
                                <MobileSelectionBar
                                    count={selectedIdSet.size}
                                    onSelectAll={() => onSelectAll?.(true)}
                                    onClear={() => onSelectAll?.(false)}
                                >
                                    {/* Staff bulk delete is AUTHORIZED (deleteDoctor receiver), so this is a
                                        LIVE control — routed to the page's handleBulkDelete, which confirms via
                                        ConfirmationModal before the mutation. Not the fail-closed disabled stub
                                        the fleet/facility/visit pages carry. */}
                                    {canBulkDelete && onBulkDelete && (
                                        <button
                                            type="button"
                                            onClick={() => onBulkDelete()}
                                            aria-label={`Delete ${selectedIdSet.size} staff`}
                                            className="flex h-8 items-center gap-1.5 rounded-button bg-destructive/12 px-3 text-[12px] font-semibold text-destructive transition-transform active:scale-95 hover:bg-destructive/20"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                            Delete {selectedIdSet.size}
                                        </button>
                                    )}
                                </MobileSelectionBar>
                            )}

                            {errorMessage && displayDoctors.length > 0 && (
                                <div
                                    className="rounded-card bg-destructive/10 p-4 text-destructive"
                                    data-testid="mobile-doctors-degraded-state"
                                >
                                    <p className="text-sm font-semibold">Staff did not refresh</p>
                                    <p className="mt-1 text-xs text-destructive/75">Showing the last loaded staff rows.</p>
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

                            {/* Group-shaped skeleton (§5.2): mirrors the panel 1:1 for replace-in-place. */}
                            {showTopSectionLoading ? (
                                <SkeletonGroupPanel rows={6} />
                            ) : (
                                <div className="space-y-[18px]">
                                    {doctorGroups.map((group) => (
                                        <GroupPanel key={group.key} label={group.label} count={group.items.length}>
                                            {group.items.map((doctor, index) => (
                                                <React.Fragment key={doctor.id}>
                                                    {renderDoctorRow(doctor)}
                                                    {index < group.items.length - 1 && <Hairline />}
                                                </React.Fragment>
                                            ))}
                                        </GroupPanel>
                                    ))}
                                </div>
                            )}

                            <div ref={observerTarget} className="min-h-[64px] flex flex-col items-center justify-center gap-2">
                                {refetching && !showTopSectionLoading && hasMore && displayDoctors.length > 0 && <MobileListLoadingMore />}
                                {!loading && !refetching && hasMore && <MobileListLoadMore armed={armed} onRequest={requestLoad} labelTone="plain" />}
                                {!loading && !hasMore && displayDoctors.length > 0 && <MobileListEnd label="End of staff list" />}
                            </div>

                            {displayDoctors.length === 0 && !loading && !showTopSectionLoading && (
                                <MobileListEmpty
                                    icon={Stethoscope}
                                    label={errorMessage ? 'Staff did not load' : 'No staff found'}
                                    reason={filters?.search ? 'search' : hasFilter ? 'filtered' : 'empty'}
                                    hint={errorMessage
                                        ? 'Try again before treating the directory as empty.'
                                        : filters?.search
                                            ? `No staff match "${filters.search}".`
                                            : hasFilter
                                                ? 'Try clearing filters to see the full directory.'
                                                : 'Staff will appear here once added.'}
                                    onRecover={!errorMessage && (filters?.search || hasFilter)
                                        ? () => setFilters?.(prev => ({ ...prev, search: '', kpiFilter: 'all' }))
                                        : undefined}
                                    recoverLabel={!errorMessage && filters?.search ? 'Clear Search' : !errorMessage && hasFilter ? 'Reset Filters' : undefined}
                                    labelTone="plain"
                                />
                            )}
                        </div>
                    </section>
                </div>

                {activeDoctor && (() => {
                    const name = activeDoctor.name || 'Unknown staff';
                    const specialty = activeDoctor.specialization || 'General';
                    const facility = getFacility(activeDoctor) || 'No facility';
                    const phone = activeDoctor.phone || 'No phone';
                    const status = getStatus(activeDoctor);

                    return (
                        <MobileDetailSheet
                            isOpen={!!activeDoctor}
                            onClose={() => setActiveDoctor(null)}
                            icon={Stethoscope}
                            iconTone={status === 'busy' ? 'hsl(38 92% 50%)' : status === 'off_duty' ? 'hsl(var(--muted-foreground))' : 'hsl(199 89% 48%)'}
                            eyebrow="Staff member"
                            title={name}
                            statusPill={statusPill(status)}
                            islands={[
                                { icon: Stethoscope, label: 'Specialty', value: specialty },
                                { icon: Hospital, label: 'Facility', value: facility },
                                { icon: Phone, label: 'Contact', value: phone },
                                activeDoctor.email && { icon: Mail, label: 'Email', value: activeDoctor.email, href: `mailto:${activeDoctor.email}` },
                                activeDoctor.license_number && { icon: BadgeCheck, label: 'License', value: activeDoctor.license_number },
                                { icon: Clock, label: 'Experience', value: activeDoctor.experience != null ? `${activeDoctor.experience} years` : 'Not set' },
                            ]}
                            primary={{ label: 'Details', icon: Eye, onClick: () => { setActiveDoctor(null); onView?.(activeDoctor); } }}
                            secondary={canManage ? { icon: Edit, onClick: () => { setActiveDoctor(null); onEdit?.(activeDoctor); }, 'aria-label': `Edit ${name}` } : undefined}
                        >
                            {canManage && canDelete && onDelete && (
                                <button
                                    type="button"
                                    onClick={() => { setActiveDoctor(null); onDelete(activeDoctor); }}
                                    className="flex h-11 w-full items-center justify-center gap-2 rounded-button bg-destructive/10 text-sm font-semibold text-destructive transition-transform hover:bg-destructive/15 active:scale-[0.96]"
                                    aria-label={`Delete ${name}`}
                                >
                                    <Trash2 className="h-4 w-4" />
                                    Delete staff member
                                </button>
                            )}
                        </MobileDetailSheet>
                    );
                })()}
            </MobilePageShell>
        </PullToRefresh>
    );
};
