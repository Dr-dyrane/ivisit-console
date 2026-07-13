import React, { useMemo, useEffect, useRef, useState } from 'react';
import {
    Headphones,
    CheckCircle,
    Eye,
    Edit,
    Trash2,
    User,
    AlertTriangle,
    Tag,
    Clock,
    MessageSquare,
    UserPlus
} from 'lucide-react';
// LIST-type page, LIFECYCLE expression (MOBILE_DESIGN_SYSTEM Sec 5) -- rebuilt to canon
// 2026-07-10, mirroring MobileUsers exactly (same 5-stage state machine, same canon kit).
// Support is a GENUINE lifecycle (open -> in_progress -> resolved -> closed), so status is a
// real grouping + KPI-pill axis (unlike the degenerate Doctors/Users status that fell to
// recency). Phase A's server projection (getSupportTicketsPageStats) supplies EXACT scoped
// counts (total/open/inProgress/resolved/closed/urgent/active), so the KPI strip renders
// MEASURED stats -- no loaded-row hedge.
// COMMAND AUTHORITY (scout contract): create + edit are WORKING (create owned by the dock
// FAB 'New ticket'; edit gated per-row by canEditTicket = isAdmin||isOrgAdmin OR provider
// owns the row). Provider self-assign is a WORKING admitted status-carrying write (sets
// assigned_to + status='in_progress'). Single delete is WORKING but GATED to canManage
// (isAdmin||isOrgAdmin). Free status transition (updateTicketStatus) is service-inventory
// only and NEVER wired here. Bulk selection stays DESKTOP-ONLY by design -- this mobile
// carries no row-selection state / selection bar.
// grammar:loadmore-append=page-keyed-accumulator -- the page query is WINDOWED (offset =
// paginationRange.start), so each page REPLACES `tickets`; the accumulatorRef below retains
// each settled window. Receiver-confirmed delete tombstones prune every window and block stale
// cache or later load-more rows from reviving a deleted ticket.
import { SearchRow, useSkeletonWarmup, UpdatingPillRow, MobileHeading, GroupPanel, MobileListRow, Hairline, SkeletonGroupPanel } from './canon';
import { MobileKPIStrip } from './MobileKPIStrip';
import { MobileDetailSheet } from './MobileDetailSheet';
import { PullToRefresh } from './PullToRefresh';
import { MobilePageShell } from './MobilePageShell';
import { MobileListEnd, MobileListEmpty, MobileListLoadMore, MobileListLoadingMore } from './MobileListStates';
import { useStableList } from './useStableList';
import { useLoadMoreControl } from './useLoadMoreControl';
import { resolveVital } from '../../constants/vitalTracks';
import { formatRelativeTime } from '../../utils/activityUtils';
import { resolveAdaptiveGroups } from '../../utils/adaptiveGrouping';

const metricValue = (value, fallback = 0) => {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : fallback;
};

const EMPTY_TICKET_IDS = Object.freeze([]);
const ticketIdKey = (value) => {
    if (value === null || value === undefined) return null;
    const key = String(value).trim();
    return key || null;
};

const deletedTicketIdSet = (ticketIds = EMPTY_TICKET_IDS) => new Set(
    (Array.isArray(ticketIds) ? ticketIds : [])
        .map(ticketIdKey)
        .filter(Boolean)
);

export const createMobileSupportAccumulator = () => ({
    signature: null,
    pages: new Map(),
    lastSourceByPage: new Map(),
    deletedIds: new Set(),
});

export const reconcileMobileSupportAccumulator = ({
    accumulator,
    signature,
    pageKey = 1,
    sourceTickets = [],
    confirmedDeletedTicketIds = EMPTY_TICKET_IDS,
}) => {
    const store = accumulator || createMobileSupportAccumulator();
    if (!(store.pages instanceof Map)) store.pages = new Map();
    if (!(store.lastSourceByPage instanceof Map)) store.lastSourceByPage = new Map();
    if (!(store.deletedIds instanceof Set)) store.deletedIds = new Set();

    const normalizedPage = Number.isFinite(Number(pageKey)) && Number(pageKey) > 0
        ? Number(pageKey)
        : 1;
    const rows = Array.isArray(sourceTickets) ? sourceTickets : [];

    deletedTicketIdSet(confirmedDeletedTicketIds).forEach((id) => store.deletedIds.add(id));

    if (store.signature !== signature) {
        store.signature = signature;
        store.pages = new Map();
        store.lastSourceByPage = new Map();
    }

    if (store.lastSourceByPage.get(normalizedPage) !== rows) {
        store.lastSourceByPage.set(normalizedPage, rows);
        store.pages.set(normalizedPage, rows.filter((ticket) => {
            const id = ticketIdKey(ticket?.id);
            return id && !store.deletedIds.has(id);
        }));
    }

    for (const [page, pageRows] of store.pages.entries()) {
        const visibleRows = pageRows.filter((ticket) => {
            const id = ticketIdKey(ticket?.id);
            return id && !store.deletedIds.has(id);
        });
        if (visibleRows.length !== pageRows.length) store.pages.set(page, visibleRows);
    }

    const orderedPages = [...store.pages.entries()].sort(([left], [right]) => Number(left) - Number(right));
    const order = [];
    const byId = new Map();
    orderedPages.forEach(([, pageRows]) => {
        pageRows.forEach((ticket) => {
            const id = ticketIdKey(ticket?.id);
            if (!id || store.deletedIds.has(id)) return;
            if (!byId.has(id)) order.push(id);
            byId.set(id, ticket);
        });
    });

    return order.map((id) => byId.get(id));
};

export const pruneSupportTicketIdsFromCache = (cache, ticketIds = EMPTY_TICKET_IDS) => {
    if (!cache || !Array.isArray(cache.data)) return cache;

    const deletedIds = deletedTicketIdSet(ticketIds);
    if (deletedIds.size === 0) return cache;

    const data = cache.data.filter((ticket) => !deletedIds.has(ticketIdKey(ticket?.id)));
    const removedCount = cache.data.length - data.length;
    if (removedCount === 0) return cache;

    const currentCount = Number(cache.count);
    return {
        ...cache,
        data,
        count: Number.isFinite(currentCount)
            ? Math.max(0, currentCount - removedCount)
            : cache.count,
    };
};

const priorityLabel = (value) => {
    const text = String(value || 'normal').replace(/[_-]+/g, ' ');
    return text.charAt(0).toUpperCase() + text.slice(1);
};

const categoryLabel = (value) => {
    const text = String(value || 'general').replace(/[_-]+/g, ' ');
    return text.charAt(0).toUpperCase() + text.slice(1);
};

// Normalized row surfaces customer_name (= row.customer_name || row.requester_name); the
// extra fallbacks keep the sheet honest for any un-normalized shape.
const requesterName = (ticket) =>
    ticket?.customer_name || ticket?.requester_name || ticket?.user_name || ticket?.name || ticket?.email || ticket?.user?.email || 'Unknown requester';

const openedLabel = (ticket) => {
    const value = ticket?.created_at;
    if (!value) return 'Unknown date';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'Unknown date';
    return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const isResolved = (status) => status === 'resolved' || status === 'closed';
const statusIcon = (status) => (isResolved(status) ? CheckCircle : Headphones);

// Status-tinted orb. Literal hues (the semantic tokens collapse to brand red); the orb hue
// MATCHES the row's own pill (resolveVital('support', status).pill) so the row reads as one
// tone. open=cyan, in_progress=amber, resolved=emerald, closed=slate (the vitalTracks
// support domain tones).
const orbClassFor = (status) => {
    switch (status) {
        case 'open': return 'bg-cyan-500/12 text-cyan-700 dark:text-cyan-300';
        case 'in_progress': return 'bg-amber-500/12 text-amber-700 dark:text-amber-300';
        case 'resolved': return 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-300';
        case 'closed': return 'bg-muted/40 text-muted-foreground';
        default: return 'bg-cyan-500/12 text-cyan-700 dark:text-cyan-300';
    }
};

// Lifecycle spine order for the status grouping: open -> in_progress -> resolved -> closed.
const STATUS_ORDER = ['open', 'in_progress', 'resolved', 'closed'];
const statusRank = (status) => {
    const index = STATUS_ORDER.indexOf(status);
    return index === -1 ? STATUS_ORDER.length : index;
};

// Atlas stage (donor recipe: MobileUsersAtlasLayer; ambient brand tint is sanctioned
// expression, Lesson 18).
const MobileSupportAtlasLayer = () => (
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

// Filter-trigger truth: any committed narrowing counts (search, KPI status, or the sheet's
// status/priority/category multiselects), so the trigger's filtered state never lies.
const hasActiveSupportFilters = (filters = {}) => Boolean(
    filters?.search ||
    (filters?.kpiFilter && filters.kpiFilter !== 'all') ||
    (Array.isArray(filters?.status) && filters.status.length > 0) ||
    (Array.isArray(filters?.priority) && filters.priority.length > 0) ||
    (Array.isArray(filters?.category) && filters.category.length > 0)
);

/**
 * MobileSupportTickets -- the support queue on the canon LIST grammar. Server-owned
 * search/KPI (the page refetches); this component renders + the working commands
 * (create via dock FAB, edit/assign/delete via the detail sheet) keep their exact gates.
 */
export const MobileSupportTickets = ({
    tickets = [],
    stats,
    filters,
    setFilters,
    onView,
    onEdit,
    onDelete,
    onAssign,
    canAssign = false,
    canEditTicket,
    onRefresh,
    canManage = false,
    loading = false,
    isFetching = false,
    errorMessage = null,
    convergenceMessage = null,
    onRetry,
    onOpenFilters,
    onViewAnalytics,
    filterSheetOpen = false,
    analyticsOpen = false,
    hasMore = false,
    onLoadMore,
    currentPage = 1,
    confirmedDeletedTicketIds = EMPTY_TICKET_IDS,
}) => {
    const observerTarget = useRef(null);
    const [activeTicket, setActiveTicket] = useState(null);
    // Background-refetch signal (KPI switch / search / pull-refresh keep loading=false).
    const refetching = isFetching || false;
    const sourceTickets = useMemo(() => (Array.isArray(tickets) ? tickets : []), [tickets]);

    // Per-row edit gate: honor the finer canEditTicket (isAdmin||isOrgAdmin OR provider owns
    // the row) when the page passes it; fall back to canManage otherwise.
    const editAllowed = (ticket) => (typeof canEditTicket === 'function' ? canEditTicket(ticket) : canManage);

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

    // Load-more retains each page window separately. That lets an optimistic delete roll a
    // failed page back exactly, while only receiver-confirmed ids become durable tombstones.
    // Tombstones prune every loaded page and are also applied to every future page payload.
    const filterSignature = JSON.stringify({
        search: filters?.search || '',
        kpi: filters?.kpiFilter || 'all',
        status: filters?.status || [],
        priority: filters?.priority || [],
        category: filters?.category || [],
    });
    const accumulatorRef = useRef(createMobileSupportAccumulator());
    const ticketRows = useMemo(() => reconcileMobileSupportAccumulator({
        accumulator: accumulatorRef.current,
        signature: filterSignature,
        pageKey: currentPage,
        sourceTickets,
        confirmedDeletedTicketIds,
    }), [confirmedDeletedTicketIds, currentPage, filterSignature, sourceTickets]);
    const confirmedDeletedIds = useMemo(
        () => deletedTicketIdSet(confirmedDeletedTicketIds),
        [confirmedDeletedTicketIds]
    );

    useEffect(() => {
        if (!activeTicket) return;
        const activeId = ticketIdKey(activeTicket.id);
        if (activeId && confirmedDeletedIds.has(activeId)) setActiveTicket(null);
    }, [activeTicket, confirmedDeletedIds]);

    const { displayItems: displayTickets, isBuffering } = useStableList(ticketRows, loading);
    const warmingUp = useSkeletonWarmup();
    const showTopSectionLoading = warmingUp || (loading && displayTickets.length === 0);

    // MEASURED, server-scoped counts (getSupportTicketsPageStats) -- a real lifecycle
    // partition, exactly the desktop supportStateOptions axis. Chip hues are SINGLE-SOURCED
    // from the row orb/pill tones (open=cyan, in_progress=amber, resolved=emerald) so a chip
    // and the rows it filters read as ONE hue, NOT the --success/--warning/--info tokens
    // (red-token trap). The 'in_progress' chip COUNT is stats.active (open + in_progress),
    // exactly as desktop's 'Active' chip does. URGENT is an OVERLAY (a per-row markerChip),
    // never a status chip: the page hardcodes kpiFilter -> status, so an 'urgent' chip would
    // send status='urgent' (empty set).
    const ticketKPIs = [
        { id: 'all', label: 'All', value: metricValue(stats?.total, sourceTickets.length), color: 'hsl(var(--muted-foreground))' },
        { id: 'open', label: 'Open', value: metricValue(stats?.open, 0), color: 'hsl(200 98% 39%)' },
        { id: 'in_progress', label: 'Active', value: metricValue(stats?.active, 0), color: 'hsl(26 90% 37%)' },
        { id: 'resolved', label: 'Resolved', value: metricValue(stats?.resolved, 0), color: 'hsl(162 94% 24%)' },
    ];

    // Count integrity (Sec 5): the heading tracks the ACTIVE KPI scope, never the raw total.
    // in_progress maps to the REAL scoped count `inProgress` (NOT `active` = open+inProgress):
    // when the Active chip is selected the list is server-scoped to status='in_progress' only,
    // so the heading must count in_progress rows. The chip keeps the wider `active` glance
    // count (desktop parity); the heading tells the truth about what is actually in the list.
    const kpiToKey = { all: 'total', open: 'open', in_progress: 'inProgress', resolved: 'resolved' };
    const activeKpi = filters?.kpiFilter || 'all';
    const scopeCount = activeKpi === 'all'
        ? metricValue(stats?.total, sourceTickets.length)
        : metricValue(stats?.[kpiToKey[activeKpi]], 0);

    const hasFilter = hasActiveSupportFilters(filters);

    // Adaptive, DATA-DRIVEN grouping: STATUS is the genuine lifecycle spine here (unlike the
    // degenerate Doctors/Users status). The scorer keeps it only if healthy (2-8 groups,
    // <=50% singletons, <=85% max share) and self-corrects two ways: (1) an all-resolved
    // tenant exceeds the 85% cap -> coarse-recency; (2) when a STATUS KPI chip is active the
    // server returns a single status, so status-grouping is 100% one bucket -> coarse-recency
    // (group-by-opened within the scoped status). Labels come from vitalTracks support.status
    // so panel headers match the row pills. Grouping is render-only; server sort stays
    // created_at desc.
    const { groups: ticketGroups } = useMemo(() => resolveAdaptiveGroups(displayTickets, [
        {
            key: 'status',
            assign: (t) => t.status || 'open',
            labelFor: (k) => resolveVital('support', k)?.pill?.label ?? k,
            order: (keys) => keys.slice().sort((a, b) => statusRank(a) - statusRank(b)),
            orphanLabel: 'Other',
        },
        { type: 'coarse-recency', key: 'opened', getDate: (t) => t.created_at },
    ]), [displayTickets]);

    const renderTicketRow = (ticket) => {
        const status = ticket.status || 'open';
        const priority = ticket.priority || 'normal';
        const urgent = priority === 'urgent' || priority === 'high';
        const vital = resolveVital('support', status);
        return (
            <MobileListRow
                item={ticket}
                dataAttr="data-mobile-support-row"
                onOpen={setActiveTicket}
                ariaLabel={`${ticket.subject || 'Support request'}, ${vital?.pill?.label || status}`}
                orbClass={orbClassFor(status)}
                icon={statusIcon(status)}
                title={ticket.subject || `Ticket ${String(ticket.id || '').slice(0, 8)}`}
                meta={`${priorityLabel(priority)} priority - ${categoryLabel(ticket.category)}`}
                time={formatRelativeTime(ticket.created_at)}
                markerChip={urgent ? priorityLabel(priority) : null}
                pill={vital?.pill}
            />
        );
    };

    return (
        <PullToRefresh onRefresh={onRefresh}>
            <MobilePageShell
                animatePageLoad={false}
                contentClassName="relative min-h-[calc(100dvh-3rem)] overflow-hidden px-0 pb-32 pt-8 text-foreground"
            >
                <MobileSupportAtlasLayer />
                <div className="relative z-10 space-y-3">
                    <MobileHeading
                        title="Support"
                        noun="request"
                        count={scopeCount}
                        showSkeleton={showTopSectionLoading}
                        failedEmpty={Boolean(errorMessage) && displayTickets.length === 0}
                    />

                    <MobileKPIStrip
                        loading={showTopSectionLoading}
                        kpis={ticketKPIs}
                        activeKpi={activeKpi}
                        onKpiClick={(id) => setFilters(prev => ({ ...prev, kpiFilter: id }))}
                    />

                    <section className="px-4">
                        <SearchRow
                            placeholder="Search support"
                            search={filters?.search || ''}
                            onSearchCommit={(value) => setFilters(prev => ({ ...prev, search: value }))}
                            entityLabel="support requests"
                            onOpenFilters={onOpenFilters}
                            filterSheetOpen={filterSheetOpen}
                            hasFilter={hasFilter}
                            onOpenStats={onViewAnalytics}
                            statsOpen={analyticsOpen}
                            statsLabel="Open support analytics"
                        />

                        <UpdatingPillRow show={(refetching || isBuffering) && !showTopSectionLoading} />

                        <div className="mt-3 space-y-2">
                            {convergenceMessage && (
                                <div
                                    role="status"
                                    className="rounded-card bg-amber-500/10 p-4 text-amber-900 dark:text-amber-100"
                                    data-testid="mobile-support-create-convergence-warning"
                                >
                                    <div className="flex items-start gap-2">
                                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold">Request saved</p>
                                            <p className="mt-1 text-xs leading-5 text-amber-900/75 dark:text-amber-100/75">
                                                {convergenceMessage}
                                            </p>
                                        </div>
                                    </div>
                                    {onRetry && (
                                        <button
                                            type="button"
                                            onClick={onRetry}
                                            className="mt-3 h-9 rounded-inner bg-amber-500/10 px-4 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-500/15 active:scale-[0.96] dark:text-amber-100"
                                        >
                                            Refresh
                                        </button>
                                    )}
                                </div>
                            )}

                            {errorMessage && !convergenceMessage && displayTickets.length > 0 && (
                                <div
                                    className="rounded-card bg-destructive/10 p-4 text-destructive"
                                    data-testid="mobile-support-degraded-state"
                                >
                                    <p className="text-sm font-semibold">Support did not refresh</p>
                                    <p className="mt-1 text-xs text-destructive/75">Showing the last loaded support rows.</p>
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

                            {/* Group-shaped skeleton (Sec 5.2): mirrors the panel 1:1 for replace-in-place. */}
                            {showTopSectionLoading ? (
                                <SkeletonGroupPanel rows={6} />
                            ) : (
                                <div className="space-y-[18px]">
                                    {ticketGroups.map((group) => (
                                        <GroupPanel key={group.key} label={group.label} count={group.items.length}>
                                            {group.items.map((ticket, index) => (
                                                <React.Fragment key={ticket.id}>
                                                    {renderTicketRow(ticket)}
                                                    {index < group.items.length - 1 && <Hairline />}
                                                </React.Fragment>
                                            ))}
                                        </GroupPanel>
                                    ))}
                                </div>
                            )}

                            <div ref={observerTarget} className="min-h-[64px] flex flex-col items-center justify-center gap-2">
                                {refetching && !showTopSectionLoading && hasMore && displayTickets.length > 0 && <MobileListLoadingMore />}
                                {!loading && !refetching && hasMore && <MobileListLoadMore armed={armed} onRequest={requestLoad} labelTone="plain" />}
                                {!loading && !hasMore && displayTickets.length > 0 && <MobileListEnd label="End of support queue" />}
                            </div>

                            {displayTickets.length === 0 && !loading && !showTopSectionLoading && (
                                <MobileListEmpty
                                    icon={Headphones}
                                    label={errorMessage ? 'Support did not load' : 'No support requests'}
                                    reason={filters?.search ? 'search' : hasFilter ? 'filtered' : 'empty'}
                                    hint={errorMessage
                                        ? 'Try again before treating the queue as clear.'
                                        : filters?.search
                                            ? `No support requests match "${filters.search}".`
                                            : hasFilter
                                                ? 'Try clearing filters to see the full queue.'
                                                : 'Use New ticket when you need support.'}
                                    onRecover={!errorMessage && (filters?.search || hasFilter)
                                        ? () => setFilters(prev => ({ ...prev, search: '', kpiFilter: 'all', status: [], priority: [], category: [] }))
                                        : undefined}
                                    recoverLabel={!errorMessage && filters?.search ? 'Clear Search' : !errorMessage && hasFilter ? 'Reset Filters' : undefined}
                                    labelTone="plain"
                                />
                            )}
                        </div>
                    </section>
                </div>

                {/* Tap-opened record detail bottom sheet. Support IS a lifecycle domain, so the
                    sheet carries the VitalTrack; status the pill, priority/category the islands. */}
                {activeTicket && (() => {
                    const ticket = activeTicket;
                    const status = ticket.status || 'open';
                    const vital = resolveVital('support', status);

                    return (
                        <MobileDetailSheet
                            isOpen={!!activeTicket}
                            onClose={() => setActiveTicket(null)}
                            icon={statusIcon(status)}
                            iconTone={vital?.tone}
                            eyebrow="Support request"
                            title={ticket.subject || `Ticket ${String(ticket.id || '').slice(0, 8)}`}
                            statusPill={vital?.pill}
                            vital={vital ? { ...vital, label: 'Ticket status' } : null}
                            islands={[
                                { icon: User, label: 'Requester', value: requesterName(ticket) },
                                { icon: AlertTriangle, label: 'Priority', value: priorityLabel(ticket.priority) },
                                { icon: Tag, label: 'Category', value: categoryLabel(ticket.category) },
                                { icon: Clock, label: 'Opened', value: openedLabel(ticket) },
                            ]}
                            primary={{ label: 'Details', icon: Eye, onClick: () => { setActiveTicket(null); onView?.(ticket); } }}
                            secondary={editAllowed(ticket) ? { icon: Edit, onClick: () => { setActiveTicket(null); onEdit?.(ticket); }, 'aria-label': `Edit ${ticket.subject || 'support request'}` } : undefined}
                        >
                            {ticket.message && (
                                <div className="rounded-inner surface-card p-3 text-xs leading-5 text-muted-foreground">
                                    <span className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground/70">
                                        <MessageSquare className="h-3.5 w-3.5" />
                                        Message
                                    </span>
                                    {ticket.message}
                                </div>
                            )}
                            {/* Provider self-assign ('Assign to me') sets assigned_to + status='in_progress'
                                (the only status-carrying write reachable from the UI -- an admitted assignment,
                                not a free transition). Delete stays GATED to canManage (isAdmin||isOrgAdmin);
                                the page confirms via ConfirmationModal before the audited mutation. */}
                            {(canAssign || canManage) && (
                                <div className="flex gap-2 pt-1">
                                    {canAssign && (
                                        <button
                                            type="button"
                                            onClick={() => { setActiveTicket(null); onAssign?.(ticket); }}
                                            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-button bg-foreground/[0.06] text-sm font-semibold text-foreground transition-all active:scale-[0.96] hover:bg-foreground/10 dark:bg-white/[0.08]"
                                        >
                                            <UserPlus className="h-4 w-4" />
                                            Assign to me
                                        </button>
                                    )}
                                    {canManage && (
                                        <button
                                            type="button"
                                            onClick={() => { setActiveTicket(null); onDelete?.(ticket); }}
                                            aria-label={`Delete ${ticket.subject || 'support request'}`}
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
