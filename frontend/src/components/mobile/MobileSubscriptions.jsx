import React, { useMemo, useEffect, useRef, useState } from 'react';
import { Users, Mail, Crown, BadgeCheck, Clock, Eye, Trash2 } from 'lucide-react';
// LIST-type page, DIRECTORY expression (MOBILE_DESIGN_SYSTEM section 5) -- rebuilt to canon
// 2026-07-11, MIRRORING MobileUsers / MobileSupportTickets / MobileHealthNews: the 5-stage
// state machine (warm-up -> group-shaped skeleton -> useStableList buffer -> isFetching
// Updating pill -> terminal empty/error), the canon SearchRow, adaptive GroupPanel, the
// MobileHeading scope count, the MobileKPIStrip status axis, and the read-only
// MobileDetailSheet. Off the old dashboard billboard + glance-tile summary rail + groupByMonth
// date grouping (the list grammar FATALLY bans the first two) onto the grouped status panel.
//
// COMMAND AUTHORITY (fail-closed by design; CRUD_RECEIVER_BACKLOG: Subscriptions FULLY
// fail-closed). Subscribers are a read-only admin mirror: no create, no edit, no delete, no
// status/type write, no welcome/custom/bulk email. The page hard-passes onEdit=null,
// onDelete=null, canManage=false, so the detail sheet's ONLY CTA is Details (onView) and the
// selection machinery below never activates (canManage gates it). This surface adds NO mutation.
//
// KPI / GROUPING AXIS = subscriber STATUS (the real desktop status vocabulary: active /
// pending / unsubscribed / bounced). The 'unsubscribed' chip is the TERMINAL bucket (folds
// unsubscribed + bounced + inactive), mirroring desktop's railStatusClass/getStatusBadge which
// treat both as a single terminal tone. TONES ARE SINGLE-SOURCED (Wave-1 lesson) from LITERAL
// status hues via orbClassFor() so the orb, the row pill, and the KPI chip read as ONE hue:
// active=emerald, pending=cyan, unsubscribed/bounced=slate. We do NOT use resolveVital(...).accent
// for the orb -- resolveVital('subscription','unsubscribed'|'bounced') returns a MISLEADING emerald
// accent (those keys are absent from the domain status map AND its muted list, so the accent
// falls through to the last step 'active'=emerald while the pill correctly degrades to slate --
// an orb/pill mismatch). COUNT INTEGRITY / NO-PHANTOM (Wave-1 lesson): counts are full-list
// client aggregation of the REAL status column (there is no server projection); the page scopes
// filteredSubscribers to the active status chip AND builds a status-keyed stats object so the
// heading scope count equals the rendered scope (phantom-chip guard).
//
// grammar:refetch-signal=page synthesises isFetching (loading over a non-empty list) since
// useSubscription exposes no React Query isFetching; the component consumes it for the pill.
// grammar:loadmore-append=page owns the growing prefix (mobileVisibleSubscribers =
// filteredSubscribers.slice(0, page*itemsPerPage)); each load-more grows the SAME prefix, so the
// window only ever appends -- no client id-keyed accumulator is needed (useStableList holds the
// last settled set so a refetch never flashes to empty).
import { SearchRow, useSkeletonWarmup, UpdatingPillRow, MobileHeading, GroupPanel, MobileListRow, Hairline, SkeletonGroupPanel } from './canon';
import { MobileKPIStrip } from './MobileKPIStrip';
import { MobileDetailSheet } from './MobileDetailSheet';
import { MobileSelectionBar } from './MobileSelectionBar';
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

const planLabel = (type) => {
    const text = String(type || 'free').replace(/[_-]+/g, ' ');
    return text.charAt(0).toUpperCase() + text.slice(1);
};

const dateLabel = (value) => {
    if (!value) return 'Date unknown';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'Date unknown';
    return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// Terminal statuses fold into the single 'unsubscribed' bucket (desktop treats unsubscribed +
// bounced as one terminal tone). Normalized subscriber status: null defaults to 'pending', the
// same default the grouping assign uses.
const TERMINAL_SUB_STATUSES = new Set(['unsubscribed', 'bounced', 'inactive', 'cancelled', 'expired']);
const normalizeSubStatus = (subscriber) => String(subscriber?.status || 'pending').toLowerCase();

// Status-tinted orb. LITERAL hues (the semantic tokens collapse to brand red; resolveVital's
// accent is misleading for the terminal statuses -- see the file header). The orb hue MATCHES
// the row's own pill (resolveVital('subscription', status).pill) so the row reads as one tone.
const orbClassFor = (status) => {
    if (status === 'active') return 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-300';
    if (TERMINAL_SUB_STATUSES.has(status)) return 'bg-muted/40 text-muted-foreground';
    return 'bg-cyan-500/12 text-cyan-700 dark:text-cyan-300';
};

// Status spine order for the status grouping: pending -> active -> unsubscribed -> bounced.
const STATUS_ORDER = ['pending', 'active', 'unsubscribed', 'bounced'];
const statusRank = (status) => {
    const index = STATUS_ORDER.indexOf(status);
    return index === -1 ? STATUS_ORDER.length : index;
};

// Atlas stage (donor recipe: MobileUsersAtlasLayer; ambient brand tint is sanctioned
// expression, Lesson 18).
const MobileSubscriptionsAtlasLayer = () => (
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
// status/type/welcome/date filters), so the trigger's filtered state never lies.
const hasActiveSubscriptionFilters = (filters = {}) => Boolean(
    filters?.search ||
    (filters?.kpiFilter && filters.kpiFilter !== 'all') ||
    (Array.isArray(filters?.status) && filters.status.length > 0) ||
    (Array.isArray(filters?.type) && filters.type.length > 0) ||
    filters?.welcomeEmailSent ||
    filters?.created_at ||
    (filters?.dateRange && filters.dateRange !== 'all')
);

/**
 * MobileSubscriptions -- the subscriber directory on the canon LIST grammar. Page-owned
 * search/KPI (the page re-filters + grows the prefix); this component renders. Read-only:
 * the detail sheet's single CTA is Details, and there is no create / edit / delete / status /
 * email path -- subscriber command authority stays fail-closed and unauthorized here.
 */
export const MobileSubscriptions = ({
    subscribers = [],
    stats,
    filters,
    setFilters,
    onView,
    onEdit,
    onDelete,
    onRefresh,
    canManage = false,
    loading = false,
    isFetching = false,
    errorMessage = null,
    onRetry,
    onOpenFilters,
    onViewAnalytics,
    filterSheetOpen = false,
    analyticsOpen = false,
    selectionEnabled = false,
    selectedIds = [],
    onSelect,
    onSelectAll,
    hasMore = false,
    onLoadMore,
}) => {
    const observerTarget = useRef(null);
    const [activeSubscriber, setActiveSubscriber] = useState(null);
    // Background-refetch signal (KPI switch / search / pull-refresh keep loading=false at the
    // query layer; the page synthesises isFetching = loading over a non-empty list).
    const refetching = isFetching || false;

    // NOTE: the dock FAB is a GATED "Add subscriber" (DynamicBottomBar) -- subscriber authoring
    // is fail-closed (the page's handleSubscriptionCommandUnavailable fires a toast + the
    // subscriptions-action-feedback banner), so the FAB dispatches 'openSubscriptionModal' to the
    // page and surfaces the honest "not ready" feedback, like Health News' "New article". This
    // LIST stays read-only (the detail sheet's only CTA is Details); the SearchRow owns the
    // in-page filter -- so the FAB is a gated create, never a filter.

    // The PAGE grows the prefix (mobileVisibleSubscribers) and passes it as `subscribers`, so
    // render directly -- no client accumulator (see the loadmore-append waiver in the header).
    const sourceSubscribers = useMemo(() => (Array.isArray(subscribers) ? subscribers : []), [subscribers]);

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

    const { displayItems: displaySubscribers, isBuffering } = useStableList(sourceSubscribers, loading);
    const warmingUp = useSkeletonWarmup();
    const showTopSectionLoading = warmingUp || (loading && displaySubscribers.length === 0);

    // Full-list client-aggregated, status-scoped counts (there is NO server projection). The axis
    // is the REAL desktop status vocabulary; chip hues are SINGLE-SOURCED from the row orb/pill
    // literals (active=emerald, pending=cyan, unsubscribed=slate) so a chip and the rows it filters
    // read as ONE hue, NOT the semantic --success/--info tokens (red-token trap). The page scopes
    // filteredSubscribers to the active chip AND supplies matching stats, so the heading count
    // tracks the real scope (phantom-chip guard).
    const subscriberKPIs = [
        { id: 'all', label: 'All', value: metricValue(stats?.total, sourceSubscribers.length), color: 'hsl(var(--muted-foreground))' },
        { id: 'active', label: 'Active', value: metricValue(stats?.active, 0), color: 'hsl(162 94% 24%)' },
        { id: 'pending', label: 'Pending', value: metricValue(stats?.pending, 0), color: 'hsl(192 91% 36%)' },
        { id: 'unsubscribed', label: 'Unsubscribed', value: metricValue(stats?.unsubscribed, 0), color: 'hsl(215 16% 47%)' },
    ];

    // Count integrity (section 5): the heading tracks the ACTIVE KPI scope, never the raw total.
    const kpiToKey = { all: 'total', active: 'active', pending: 'pending', unsubscribed: 'unsubscribed' };
    const activeKpi = filters?.kpiFilter || 'all';
    const scopeCount = activeKpi === 'all' || !kpiToKey[activeKpi]
        ? metricValue(stats?.total, sourceSubscribers.length)
        : metricValue(stats?.[kpiToKey[activeKpi]], 0);

    const hasFilter = hasActiveSubscriptionFilters(filters);

    // Welcome-email OVERLAY (Support 'urgent' precedent): a per-row markerChip, NOT a KPI chip.
    // Rendered only when welcome_email_sent DISTRIBUTES across the loaded set (some sent, some
    // not) -- an all-same column carries no signal, so no chip.
    const welcomeEmailDistributes = useMemo(() => {
        let sent = 0;
        let unsent = 0;
        for (const s of displaySubscribers) {
            if (s?.welcome_email_sent === true) sent += 1;
            else unsent += 1;
            if (sent > 0 && unsent > 0) return true;
        }
        return false;
    }, [displaySubscribers]);

    // Selection: gated to managers. Subscriber writes are fail-closed (subscriber authority
    // unproved), so the mechanism is preserved but INERT -- the page hard-passes canManage=false,
    // so selectionActive is false, no row is selectable, and the DISABLED locked bulk control
    // (mirrors MobileUsers) never surfaces. No selection tap ever reaches a live mutation.
    const selectionActive = selectionEnabled && canManage && Boolean(onSelect);
    const selectedIdSet = useMemo(() => new Set(selectedIds || []), [selectedIds]);
    const selectionMode = selectionActive && selectedIdSet.size > 0;

    // Adaptive, DATA-DRIVEN grouping: STATUS mirrors the KPI axis (donor-parity with Support).
    // The scorer keeps status only if healthy (2-8 groups, <=50% singletons, <=85% max share) and
    // self-corrects to coarse-recency two ways: (1) a skewed tenant where one status (realistically
    // 'active' after welcome) exceeds the 85% cap; (2) when a STATUS KPI chip is active the scoped
    // list is a single status = 100% one bucket -> coarse-recency (group-by-subscribed within the
    // scoped status). Because the subscription vital is a thin 2-step display track and most rows
    // settle to 'active', coarse-recency renders often -- that is honest. Panel labels come from
    // resolveVital('subscription', k).pill.label so headers match the row pills. Uses REAL freshness
    // columns only (subscription_date / created_at). REPLACES the old groupByMonth date grouping.
    const { groups: subscriberGroups } = useMemo(() => resolveAdaptiveGroups(displaySubscribers, [
        {
            key: 'status',
            assign: (s) => normalizeSubStatus(s),
            labelFor: (k) => resolveVital('subscription', k)?.pill?.label ?? k,
            order: (keys) => keys.slice().sort((a, b) => statusRank(a) - statusRank(b)),
            orphanLabel: 'Other',
        },
        { type: 'coarse-recency', key: 'subscribed', getDate: (s) => s.subscription_date || s.created_at },
    ]), [displaySubscribers]);

    const renderSubscriberRow = (subscriber) => {
        const status = normalizeSubStatus(subscriber);
        const paid = subscriber.type === 'paid';
        const vital = resolveVital('subscription', status);
        const welcomed = welcomeEmailDistributes && subscriber.welcome_email_sent === true;
        return (
            <MobileListRow
                item={subscriber}
                dataAttr="data-mobile-subscription-row"
                onOpen={setActiveSubscriber}
                ariaLabel={`${subscriber.email || 'Subscriber'}, ${vital?.pill?.label || status}`}
                orbClass={orbClassFor(status)}
                icon={paid ? Crown : Mail}
                title={subscriber.email || 'No email'}
                meta={`${planLabel(subscriber.type)} plan`}
                time={formatRelativeTime(subscriber.subscription_date || subscriber.created_at)}
                markerChip={welcomed ? 'Welcome' : null}
                pill={vital?.pill}
                selectable={selectionActive}
                selected={selectedIdSet.has(subscriber.id)}
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
                <MobileSubscriptionsAtlasLayer />
                <div className="relative z-10 space-y-3">
                    <MobileHeading
                        title="Subscribers"
                        noun="subscriber"
                        count={scopeCount}
                        showSkeleton={showTopSectionLoading}
                        failedEmpty={Boolean(errorMessage) && displaySubscribers.length === 0}
                    />

                    <MobileKPIStrip
                        loading={showTopSectionLoading}
                        kpis={subscriberKPIs}
                        activeKpi={activeKpi}
                        onKpiClick={(id) => setFilters(prev => ({ ...prev, kpiFilter: id }))}
                    />

                    <section className="px-4">
                        <SearchRow
                            placeholder="Search subscribers..."
                            search={filters?.search || ''}
                            onSearchCommit={(value) => setFilters(prev => ({ ...prev, search: value }))}
                            entityLabel="subscribers"
                            onOpenFilters={onOpenFilters}
                            filterSheetOpen={filterSheetOpen}
                            hasFilter={hasFilter}
                            onOpenStats={onViewAnalytics}
                            statsOpen={analyticsOpen}
                            statsLabel="Open subscriber analytics"
                        />

                        <UpdatingPillRow show={(refetching || isBuffering) && !showTopSectionLoading} />

                        <div className="mt-3 space-y-2">
                            {selectionActive && (
                                <MobileSelectionBar
                                    count={selectedIdSet.size}
                                    onSelectAll={() => onSelectAll?.(true)}
                                    onClear={() => onSelectAll?.(false)}
                                >
                                    {/* Fail-closed: subscriber deletion has no proved receiver, so the
                                        bulk control is DISABLED (mirrors the desktop BulkActionBar). */}
                                    <button
                                        type="button"
                                        disabled
                                        aria-label="Subscriber deletion is locked until subscriber authority is verified"
                                        title="Subscriber deletion is locked until subscriber authority is verified"
                                        className="flex h-8 w-8 items-center justify-center rounded-button bg-destructive/12 text-destructive opacity-40"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </MobileSelectionBar>
                            )}

                            {errorMessage && displaySubscribers.length > 0 && (
                                <div
                                    className="rounded-card bg-destructive/10 p-4 text-destructive"
                                    data-testid="mobile-subscriptions-degraded-state"
                                >
                                    <p className="text-sm font-semibold">Subscribers did not refresh</p>
                                    <p className="mt-1 text-xs text-destructive/75">Showing the last loaded subscriber rows.</p>
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

                            {/* Group-shaped skeleton (section 5.2): mirrors the panel 1:1 for replace-in-place. */}
                            {showTopSectionLoading ? (
                                <SkeletonGroupPanel rows={6} />
                            ) : (
                                <div className="space-y-[18px]">
                                    {subscriberGroups.map((group) => (
                                        <GroupPanel key={group.key} label={group.label} count={group.items.length}>
                                            {group.items.map((subscriber, index) => (
                                                <React.Fragment key={subscriber.id}>
                                                    {renderSubscriberRow(subscriber)}
                                                    {index < group.items.length - 1 && <Hairline />}
                                                </React.Fragment>
                                            ))}
                                        </GroupPanel>
                                    ))}
                                </div>
                            )}

                            <div ref={observerTarget} className="min-h-[64px] flex flex-col items-center justify-center gap-2">
                                {refetching && !showTopSectionLoading && hasMore && displaySubscribers.length > 0 && <MobileListLoadingMore />}
                                {!loading && !refetching && hasMore && <MobileListLoadMore armed={armed} onRequest={requestLoad} labelTone="plain" />}
                                {!loading && !hasMore && displaySubscribers.length > 0 && <MobileListEnd label="End of subscriber list" />}
                            </div>

                            {displaySubscribers.length === 0 && !loading && !showTopSectionLoading && (
                                <MobileListEmpty
                                    icon={Users}
                                    label={errorMessage ? 'Subscribers did not load' : 'No subscribers found'}
                                    reason={filters?.search ? 'search' : hasFilter ? 'filtered' : 'empty'}
                                    hint={errorMessage
                                        ? 'Try again before treating the list as empty.'
                                        : filters?.search
                                            ? `No subscribers match "${filters.search}".`
                                            : hasFilter
                                                ? 'Try clearing filters to see every subscriber.'
                                                : 'Subscribers will appear here once they register.'}
                                    onRecover={!errorMessage && (filters?.search || hasFilter)
                                        ? () => setFilters(prev => ({ ...prev, search: '', kpiFilter: 'all', status: [], type: [], welcomeEmailSent: '', dateRange: 'all' }))
                                        : errorMessage ? onRetry : undefined}
                                    recoverLabel={!errorMessage && filters?.search ? 'Clear Search' : !errorMessage && hasFilter ? 'Reset Filters' : errorMessage ? 'Try again' : undefined}
                                    labelTone="plain"
                                />
                            )}
                        </div>
                    </section>
                </div>

                {/* Tap-opened record detail bottom sheet. Subscription IS a (thin) lifecycle domain,
                    so the sheet carries the VitalTrack; status the pill, plan/status/subscribed/welcome
                    the islands. Read-only: the ONLY CTA is Details (onView) -- NO secondary edit action,
                    NO delete control. Subscriber command authority stays fail-closed. */}
                {activeSubscriber && (() => {
                    const status = normalizeSubStatus(activeSubscriber);
                    const paid = activeSubscriber.type === 'paid';
                    const vital = resolveVital('subscription', status);

                    return (
                        <MobileDetailSheet
                            isOpen={!!activeSubscriber}
                            onClose={() => setActiveSubscriber(null)}
                            icon={paid ? Crown : Mail}
                            iconTone={vital?.tone}
                            eyebrow="Subscriber"
                            title={activeSubscriber.email || 'No email'}
                            statusPill={vital?.pill}
                            vital={vital ? { ...vital, label: 'Subscription status' } : null}
                            islands={[
                                { icon: Mail, label: 'Email', value: activeSubscriber.email || 'No email' },
                                { icon: Crown, label: 'Plan', value: planLabel(activeSubscriber.type) },
                                { icon: BadgeCheck, label: 'Status', value: vital?.pill?.label || planLabel(activeSubscriber.status) },
                                { icon: Clock, label: 'Subscribed', value: dateLabel(activeSubscriber.subscription_date || activeSubscriber.created_at) },
                                { icon: Mail, label: 'Welcome email', value: activeSubscriber.welcome_email_sent ? 'Sent' : 'Pending' },
                            ]}
                            primary={{ label: 'Details', icon: Eye, onClick: () => { setActiveSubscriber(null); onView?.(activeSubscriber); } }}
                        />
                    );
                })()}
            </MobilePageShell>
        </PullToRefresh>
    );
};
