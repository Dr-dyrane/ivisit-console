import React, { useMemo, useEffect, useRef, useState } from 'react';
import {
    Users,
    Stethoscope,
    Shield,
    ShieldCheck,
    UserRound,
    User,
    Eye,
    Edit,
    Trash2,
    Mail,
    Phone,
    Building,
    Hash
} from 'lucide-react';
// LIST-type page, DIRECTORY expression (MOBILE_DESIGN_SYSTEM §5) — rebuilt to canon
// 2026-07-10 following the desktop admission (Users Phase B/C). Off the billboard +
// metric-rail + MobileMetricRow onto the canon grouped panel. Phase A's server-projection
// (getUserPageStats) supplies EXACT scoped counts, so the KPI strip renders MEASURED
// stats — the "mobile metric blocker" (loaded-row visible/source-pending hedge) is closed.
// INVARIANT (Users != Doctors): create/invite/delete stay INTENTIONALLY fail-closed —
// the sheet delete is gated off (canDelete={false}) and the bulk bar carries a DISABLED
// locked control, never a live mutation. Blur ban: GroupPanel/SkeletonGroupPanel and the
// selection bar render frosted={false} (UsersPage.contract forbids the frosted blur on
// Users surfaces).
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

// Users is a directory (no modelled lifecycle): role is a categorical facet.
const roleLabel = (role) => {
    const text = String(role || 'patient').replace(/_/g, ' ');
    return text.charAt(0).toUpperCase() + text.slice(1);
};

const roleIcon = (role) => (
    role === 'provider' ? Stethoscope
        : (role === 'admin' || role === 'org_admin') ? Shield
            : role === 'patient' ? UserRound
                : User
);

// Role-tinted orb (literal hues — the semantic tokens collapse to brand red).
const orbClassForRole = (role) => (
    role === 'provider' ? 'bg-amber-500/12 text-amber-700 dark:text-amber-300'
        : (role === 'admin' || role === 'org_admin') ? 'bg-sky-500/12 text-sky-700 dark:text-sky-300'
            : 'bg-muted/40 text-muted-foreground'
);

// Atlas stage (donor recipe: MobileDoctorsAtlasLayer; ambient brand tint is sanctioned
// expression, Lesson 18).
const MobileUsersAtlasLayer = () => (
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

const hasActiveUserFilters = (filters = {}) => Boolean(
    filters?.search ||
    (filters?.kpiFilter && filters.kpiFilter !== 'all') ||
    filters?.created_at?.start ||
    filters?.created_at?.end
);

/**
 * MobileUsers — the user directory on the canon LIST grammar. Server-owned search/KPI
 * (the page refetches); this component renders + the delete path stays fail-closed.
 */
export const MobileUsers = ({
    users,
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
    selectionEnabled = false,
    selectedIds = [],
    onSelect,
    onSelectAll,
    canDelete = false
}) => {
    const observerTarget = useRef(null);
    const [activeUser, setActiveUser] = useState(null);
    const canManage = Boolean(isAdmin || isOrgAdmin);
    const refetching = isFetching || false;
    const sourceUsers = useMemo(() => (Array.isArray(users) ? users : []), [users]);

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

    // Load-more ACCUMULATES (id-keyed store): the page query is WINDOWED (offset =
    // paginationRange.start), so each page REPLACES `users`; this stitches windows into the
    // growing list. Scope change (search/kpi/date) resets; same-scope non-empty appends;
    // same-scope settled-empty clears (kills placeholder poisoning).
    const filterSignature = JSON.stringify({
        search: filters?.search || '',
        kpi: filters?.kpiFilter || 'all',
        date: filters?.created_at || null,
    });
    const accumulatorRef = useRef({ signature: null, order: [], byId: new Map(), lastSource: null });
    const userRows = useMemo(() => {
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
            store.lastSource = sourceUsers;
            reset();
            sourceUsers.forEach(absorb);
        } else if (store.lastSource !== sourceUsers) {
            store.lastSource = sourceUsers;
            if (sourceUsers.length === 0) reset();
            else sourceUsers.forEach(absorb);
        }
        return store.order.map((id) => store.byId.get(id));
    }, [sourceUsers, filterSignature]);

    const { displayItems: displayUsers, isBuffering } = useStableList(userRows, loading);
    const warmingUp = useSkeletonWarmup();
    const showTopSectionLoading = warmingUp || (loading && displayUsers.length === 0);

    // MEASURED, server-scoped counts (Phase A getUserPageStats) — a role partition, exactly
    // the desktop KPI axis. No loaded-row "visible/source-pending" hedge: the projection is
    // proved, so the strip shows real totals while the active chip narrows the list.
    const userKPIs = [
        { id: 'all', label: 'All', value: metricValue(statistics?.total, sourceUsers.length), color: 'hsl(var(--muted-foreground))' },
        { id: 'provider', label: 'Providers', value: metricValue(statistics?.provider, 0), color: 'hsl(38 92% 50%)' },
        { id: 'org_admin', label: 'Org admins', value: metricValue(statistics?.org_admin, 0), color: 'hsl(199 89% 48%)' },
        { id: 'patient', label: 'Patients', value: metricValue(statistics?.patient, 0), color: 'hsl(var(--muted-foreground))' },
    ];

    // Count integrity (§5): the heading tracks the ACTIVE KPI scope, never the raw total.
    const kpiToKey = { all: 'total', provider: 'provider', org_admin: 'org_admin', patient: 'patient' };
    const activeKpi = filters?.kpiFilter || 'all';
    const scopeCount = activeKpi === 'all'
        ? metricValue(statistics?.total, sourceUsers.length)
        : metricValue(statistics?.[kpiToKey[activeKpi]], 0);

    const hasFilter = hasActiveUserFilters(filters);

    // Selection: gated to managers. Users delete is fail-closed (identity authority
    // unproved), so the bar carries a DISABLED locked control — the selection mechanism
    // mirrors desktop, the destructive write never fires.
    const selectionActive = selectionEnabled && canManage && Boolean(onSelect);
    const selectedIdSet = useMemo(() => new Set(selectedIds || []), [selectedIds]);
    const selectionMode = selectionActive && selectedIdSet.size > 0;

    // Adaptive, DATA-DRIVEN grouping: ROLE is the directory's mental axis, but on a
    // provider-heavy tenant one role can exceed the scorer's 85% share cap, so it falls to
    // coarse join-recency (always buckets). Decided per-render from the actual rows.
    const { groups: userGroups } = useMemo(() => resolveAdaptiveGroups(displayUsers, [
        { key: 'role', assign: (u) => u.role || 'patient', labelFor: (k) => roleLabel(k), orphanLabel: 'Other' },
        { type: 'coarse-recency', key: 'joined', getDate: (u) => u.created_at },
    ]), [displayUsers]);

    const renderUserRow = (user) => {
        const role = user.role || 'patient';
        const verified = Boolean(user.bvn_verified);
        return (
            <MobileListRow
                item={user}
                dataAttr="data-mobile-user-row"
                onOpen={setActiveUser}
                ariaLabel={`${user.full_name || user.username || 'Unknown user'}, ${roleLabel(role)}`}
                orbClass={orbClassForRole(role)}
                icon={roleIcon(role)}
                title={user.full_name || user.username || 'Unknown User'}
                meta={`${roleLabel(role)} · ${user.organization_name || 'Independent'}`}
                time={formatRelativeTime(user.created_at)}
                markerChip={verified ? 'KYC' : null}
                pill={statusPill(verified ? 'verified' : 'pending')}
                selectable={selectionActive}
                selected={selectedIdSet.has(user.id)}
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
                <MobileUsersAtlasLayer />
                <div className="relative z-10 space-y-3">
                    <MobileHeading
                        title="Users"
                        noun="user"
                        count={scopeCount}
                        showSkeleton={showTopSectionLoading}
                        failedEmpty={Boolean(errorMessage) && displayUsers.length === 0}
                    />

                    <MobileKPIStrip
                        loading={showTopSectionLoading}
                        kpis={userKPIs}
                        activeKpi={activeKpi}
                        onKpiClick={(id) => setFilters(prev => ({ ...prev, kpiFilter: id }))}
                    />

                    <section className="px-4">
                        <SearchRow
                            placeholder="Search users..."
                            search={filters?.search || ''}
                            onSearchCommit={(value) => setFilters(prev => ({ ...prev, search: value }))}
                            entityLabel="users"
                            onOpenFilters={onOpenFilters}
                            filterSheetOpen={filterSheetOpen}
                            hasFilter={hasFilter}
                            onOpenStats={canManage ? onViewAnalytics : null}
                            statsOpen={analyticsOpen}
                            statsLabel="Open user analytics"
                        />

                        <UpdatingPillRow show={(refetching || isBuffering) && !showTopSectionLoading} />

                        <div className="mt-3 space-y-2">
                            {selectionActive && (
                                <MobileSelectionBar
                                    count={selectedIdSet.size}
                                    onSelectAll={() => onSelectAll?.(true)}
                                    onClear={() => onSelectAll?.(false)}
                                    frosted={false}
                                >
                                    {/* Fail-closed: user deletion has no proved identity receiver, so the
                                        bulk control is DISABLED (mirrors the desktop BulkActionBar). */}
                                    <button
                                        type="button"
                                        disabled
                                        aria-label="User deletion is locked until identity authority is verified"
                                        title="User deletion is locked until identity authority is verified"
                                        className="flex h-8 w-8 items-center justify-center rounded-button bg-destructive/12 text-destructive opacity-40"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </MobileSelectionBar>
                            )}

                            {errorMessage && displayUsers.length > 0 && (
                                <div
                                    className="rounded-card bg-destructive/10 p-4 text-destructive"
                                    data-testid="mobile-users-degraded-state"
                                >
                                    <p className="text-sm font-semibold">Users did not refresh</p>
                                    <p className="mt-1 text-xs text-destructive/75">Showing the last loaded user rows.</p>
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

                            {/* Group-shaped skeleton (§5.2). frosted={false} — Users bans the frosted blur. */}
                            {showTopSectionLoading ? (
                                <SkeletonGroupPanel rows={6} frosted={false} />
                            ) : (
                                <div className="space-y-[18px]">
                                    {userGroups.map((group) => (
                                        <GroupPanel key={group.key} label={group.label} count={group.items.length} frosted={false}>
                                            {group.items.map((user, index) => (
                                                <React.Fragment key={user.id}>
                                                    {renderUserRow(user)}
                                                    {index < group.items.length - 1 && <Hairline />}
                                                </React.Fragment>
                                            ))}
                                        </GroupPanel>
                                    ))}
                                </div>
                            )}

                            <div ref={observerTarget} className="min-h-[64px] flex flex-col items-center justify-center gap-2">
                                {refetching && !showTopSectionLoading && hasMore && displayUsers.length > 0 && <MobileListLoadingMore />}
                                {!loading && !refetching && hasMore && <MobileListLoadMore armed={armed} onRequest={requestLoad} labelTone="plain" />}
                                {!loading && !hasMore && displayUsers.length > 0 && <MobileListEnd label="End of user list" />}
                            </div>

                            {displayUsers.length === 0 && !loading && !showTopSectionLoading && (
                                <MobileListEmpty
                                    icon={Users}
                                    label={errorMessage ? 'Users did not load' : 'No users found'}
                                    reason={filters?.search ? 'search' : hasFilter ? 'filtered' : 'empty'}
                                    hint={errorMessage
                                        ? 'Try again before treating the directory as empty.'
                                        : filters?.search
                                            ? `No users match "${filters.search}".`
                                            : hasFilter
                                                ? 'Try clearing filters to see the full directory.'
                                                : 'Users will appear here once registered.'}
                                    onRecover={!errorMessage && (filters?.search || hasFilter)
                                        ? () => setFilters(prev => ({ ...prev, search: '', kpiFilter: 'all' }))
                                        : undefined}
                                    recoverLabel={!errorMessage && filters?.search ? 'Clear Search' : !errorMessage && hasFilter ? 'Reset Filters' : undefined}
                                    labelTone="plain"
                                />
                            )}
                        </div>
                    </section>
                </div>

                {/* Tap-opened record detail bottom sheet. Users is a directory (no lifecycle),
                    so NO VitalTrack; role is the eyebrow facet, verification the pill. */}
                {activeUser && (() => {
                    const user = activeUser;
                    const role = user.role || 'patient';
                    const verified = Boolean(user.bvn_verified);
                    const joined = user.created_at ? formatRelativeTime(user.created_at) : null;
                    const idValue = user.display_id || `#${String(user.id || '').slice(0, 12).toUpperCase()}`;

                    return (
                        <MobileDetailSheet
                            isOpen={!!activeUser}
                            onClose={() => setActiveUser(null)}
                            icon={roleIcon(role)}
                            iconTone={role === 'provider' ? 'hsl(38 92% 50%)' : (role === 'admin' || role === 'org_admin') ? 'hsl(199 89% 48%)' : 'hsl(var(--muted-foreground))'}
                            eyebrow={roleLabel(role)}
                            title={user.full_name || user.username || 'Unknown User'}
                            statusPill={statusPill(verified ? 'verified' : 'pending')}
                            islands={[
                                user.email && { icon: Mail, label: 'Email', value: user.email, href: `mailto:${user.email}` },
                                user.phone && { icon: Phone, label: 'Phone', value: user.phone },
                                { icon: Building, label: 'Organization', value: user.organization_name || 'Independent' },
                                { icon: Shield, label: 'Role', value: roleLabel(role) },
                                { icon: verified ? ShieldCheck : Shield, label: 'KYC', value: verified ? 'Verified' : 'Pending' },
                                { icon: Hash, label: 'ID', value: idValue },
                            ]}
                            primary={{ label: 'Details', icon: Eye, onClick: () => { setActiveUser(null); onView(user); } }}
                            secondary={(isAdmin || isOrgAdmin) ? { icon: Edit, onClick: () => { setActiveUser(null); onEdit(user); }, 'aria-label': `Edit ${user.full_name || user.username || 'user'}` } : undefined}
                        >
                            {/* Delete stays a demoted, gated, fail-closed destructive control
                                (canDelete && isAdmin only; the page hard-passes canDelete={false},
                                so it never renders — identity authority is unproved). */}
                            {canDelete && isAdmin && (
                                <button
                                    type="button"
                                    onClick={() => onDelete(user)}
                                    className="flex w-full items-center justify-center gap-2 rounded-button py-2.5 text-xs font-semibold text-destructive/70 transition-colors hover:bg-destructive/10 hover:text-destructive active:scale-[0.96]"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Delete user
                                </button>
                            )}
                        </MobileDetailSheet>
                    );
                })()}
            </MobilePageShell>
        </PullToRefresh>
    );
};
