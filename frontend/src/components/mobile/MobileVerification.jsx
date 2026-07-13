import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Shield, Eye, CheckCircle, Ban, Building2, Ambulance, Stethoscope, Mail, MapPin, Clock, Hash, Tag, X, Loader2 } from 'lucide-react';
// LIST-type page, DUAL-QUEUE (providers + facilities). Composes the canon kit
// (MOBILE_DESIGN_SYSTEM §5): heading -> KPI status chips -> queue switch -> search ->
// grouped list -> tap opens MobileDetailSheet (Approve/Reject in the footer CTA group).
// No metric rail / featured billboard (those are DASHBOARD furniture the LIST grammar
// bans; the old glance-tile summary rail is gone — its share ratios ride the AnalyticsModal).
// Lifecycle context (row pill + sheet track) is grounded in resolveVital('verification')
// so approvals speak the same status vocabulary as every other page.
import { SearchRow, useSkeletonWarmup, UpdatingPillRow, MobileHeading, GroupPanel, MobileListRow, Hairline, SkeletonGroupPanel } from './canon';
import { MobileKPIStrip } from './MobileKPIStrip';
import { MobileDetailSheet } from './MobileDetailSheet';
import { PullToRefresh } from './PullToRefresh';
import { MobilePageShell } from './MobilePageShell';
import { MobileListEmpty } from './MobileListStates';
import { useStableList } from './useStableList';
import { resolveVital } from '../../constants/vitalTracks';
import { formatRelativeTime } from '../../utils/activityUtils';
import { resolveAdaptiveGroups } from '../../utils/adaptiveGrouping';

// Affirmative CTA tone — grounded emerald accent (hsl so MobileSheetActions' glow
// regex yields valid CSS). Approve is the loud primary; decline is a demoted ghost.
const APPROVE_TONE = 'hsl(162 94% 24%)';

// Atlas stage (donor recipe: MobileAmbulancesAtlasLayer; ambient brand tint is
// sanctioned expression, Lesson 18).
const MobileVerificationAtlasLayer = () => (
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

// Sentence-case a raw status/role token ('org_admin' -> 'Org admin').
const tokenLabel = (value, fallback = '') => {
  const text = String(value || fallback).replace(/[_-]+/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
};

// A provider's SUB-PERSONA is its data (profiles.provider_type): a driver/paramedic reads
// as a RESPONDER (ambulance/cyan), a doctor as a CLINICIAN (stethoscope/amber) -- never a
// single generic "Provider" glyph for both. The providers queue is role='provider' with no
// type filter (verificationService select('*')), so provider_type IS on every row here.
// Mirrors the MobileUsers persona helpers (the reference implementation). Facilities have no
// persona split -- they keep the Building2 mark + status-tinted orb.
const AMBULANCE_TYPES = new Set(['driver', 'paramedic', 'ambulance', 'ambulance_service']);
const isResponder = (providerType) => AMBULANCE_TYPES.has(String(providerType || '').toLowerCase());
const providerPersonaIcon = (providerType) => (isResponder(providerType) ? Ambulance : Stethoscope);
const providerPersonaOrb = (providerType) => (
  isResponder(providerType)
    ? 'bg-cyan-500/12 text-cyan-700 dark:text-cyan-300'
    : 'bg-amber-500/12 text-amber-700 dark:text-amber-300'
);
const providerPersonaTone = (providerType) => (isResponder(providerType) ? 'hsl(189 94% 43%)' : 'hsl(38 92% 50%)');
// Honest sub-type label where present (Driver / Doctor / Paramedic), else the generic role.
const providerPersonaLabel = (providerType) => (providerType ? tokenLabel(providerType) : 'Provider');

const isPendingItem = (item, queueType) => (queueType === 'providers'
  ? !item?.bvn_verified
  : String(item?.verification_status || '').toLowerCase() === 'pending');

// Provider status has no lifecycle vocabulary — bvn_verified is a boolean, and there is
// NO rejected state (2026-07-10). Facilities carry a real verification_status.
const itemStatusKey = (item, queueType) => (queueType === 'providers'
  ? (item?.bvn_verified ? 'verified' : 'pending')
  : String(item?.verification_status || 'pending').toLowerCase());

export const approveProvidersSequentially = async (ids, onApprove, onProgress) => {
  const queue = Array.from(new Set(ids || []));
  const succeededIds = [];
  const failedIds = [];

  for (let index = 0; index < queue.length; index += 1) {
    const id = queue[index];
    try {
      const result = await onApprove(id, true);
      if (result === false) failedIds.push(id);
      else succeededIds.push(id);
    } catch {
      failedIds.push(id);
    }
    onProgress?.({ completed: index + 1, total: queue.length });
  }

  return { succeededIds, failedIds };
};

export const MobileVerification = ({
  queueType = 'providers',
  setQueueType,
  providers = [],
  organizations = [],
  loading = false,
  stats,
  orgStats,
  filters,
  setFilters,
  onViewProvider,
  onVerifyProvider,
  onVerifyOrganization,
  canApprove = false,
  onRefresh,
  onOpenFilters,
  filterSheetOpen = false,
  analyticsOpen = false,
  onViewAnalytics,
  isFetching = false,
  selectedIds = [],
  onSelect,
  onSelectAll,
}) => {
  const [activeItem, setActiveItem] = useState(null);
  const [bulkProgress, setBulkProgress] = useState(null);
  // Multi-select (restored 2026-07-10). Uses the SHARED page selection — the desktop
  // page's useRowSelection passes selectedIds/onSelect/onSelectAll — so mobile and
  // desktop never hold divergent selection. Providers-only + admin-gated, mirroring the
  // desktop `selectable = canApprove && queueType === 'providers'`; facilities keep
  // per-row approve/reject with no bulk. Bulk-approve loops onVerifyProvider (the page
  // passes no batch handler to mobile — a batched endpoint is the follow-up).

  // Dock FAB ("Review pending", DynamicBottomBar) dispatches here: the mobile surface
  // owns the queue filter state, so the dock stays decoupled from the desktop page file.
  // A ref holds the latest setFilters (the page hands a fresh identity each render), so we
  // subscribe ONCE and always call the current setter — filtering to pending, the
  // actionable subset an approver lands to act on.
  const setFiltersRef = useRef(setFilters);
  setFiltersRef.current = setFilters;
  useEffect(() => {
    const showPending = () => setFiltersRef.current?.((prev) => ({ ...prev, status: 'pending' }));
    window.addEventListener('approvalsReviewPending', showPending);
    return () => window.removeEventListener('approvalsReviewPending', showPending);
  }, []);

  const activeStats = queueType === 'providers' ? stats : orgStats;
  const items = queueType === 'providers' ? providers : organizations;
  const sourceItems = useMemo(() => (Array.isArray(items) ? items : []), [items]);
  const { displayItems, isBuffering } = useStableList(sourceItems, loading);
  const warmingUp = useSkeletonWarmup();
  const showTopSectionLoading = warmingUp || (loading && displayItems.length === 0);
  const refetching = isFetching || false;

  // Status filter chips. 'Rejected' is FACILITY-ONLY: providers have no rejected state,
  // so the chip would always read 0 (a dead filter) — queue-aware so it never lies.
  const kpis = useMemo(() => [
    { id: 'pending', label: 'Pending', value: activeStats?.pending || 0, color: 'hsl(192 91% 36%)' },
    { id: 'approved', label: 'Approved', value: queueType === 'providers' ? (activeStats?.approved || 0) : (activeStats?.verified || 0), color: 'hsl(162 94% 24%)' },
    ...(queueType === 'providers' ? [] : [{ id: 'rejected', label: 'Rejected', value: activeStats?.rejected || 0, color: 'hsl(var(--destructive))' }]),
    { id: 'all', label: 'Total', value: activeStats?.total || sourceItems.length, color: 'hsl(var(--muted-foreground))' },
  ], [activeStats, sourceItems.length, queueType]);

  // Count integrity (§5): the heading tracks the ACTIVE status-chip scope, not the raw
  // total. Provider stats key on `approved`, facilities on `verified`.
  const activeStatus = filters?.status || 'all';
  const scopeCount = activeStatus === 'all'
    ? (activeStats?.total || sourceItems.length)
    : activeStatus === 'approved'
      ? (queueType === 'providers' ? (activeStats?.approved || 0) : (activeStats?.verified || 0))
      : (activeStats?.[activeStatus] || 0);

  const hasFilter = Boolean(filters?.search) || activeStatus !== 'all';

  // Providers-only + admin-gated selection (facilities have per-row approve/reject, no
  // bulk). selectionMode derives from the SHARED selectedIds, so the row affordance and
  // the bulk bar can never disagree on whether we're selecting.
  const selectionEnabled = canApprove && queueType === 'providers';
  const selectedIdSet = useMemo(() => new Set(selectedIds || []), [selectedIds]);
  const selectionMode = selectionEnabled && selectedIdSet.size > 0;
  const bulkApproving = bulkProgress !== null;
  const bulkApprove = async () => {
    if (!onVerifyProvider || bulkApproving) return;

    const ids = Array.from(selectedIdSet);
    if (ids.length === 0) return;

    setBulkProgress({ completed: 0, total: ids.length });
    try {
      const { succeededIds, failedIds } = await approveProvidersSequentially(
        ids,
        onVerifyProvider,
        setBulkProgress,
      );

      if (onSelect) {
        succeededIds.forEach((id) => onSelect(id, false));
      } else if (failedIds.length === 0) {
        onSelectAll?.(false);
      }
    } finally {
      setBulkProgress(null);
    }
  };

  // Grouped by application recency (adaptive, data-driven): the queue is a feed of
  // applications in time; coarse freshness never fragments into singleton panels.
  const { groups } = useMemo(() => resolveAdaptiveGroups(displayItems, [
    { type: 'coarse-recency', key: 'applied', getDate: (it) => it.created_at },
  ]), [displayItems]);

  const orbClassFor = (statusKey) => (
    statusKey === 'verified'
      ? 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-300'
      : statusKey === 'rejected'
        ? 'bg-muted/40 text-muted-foreground'
        : 'bg-cyan-500/12 text-cyan-700 dark:text-cyan-300'
  );

  const renderRow = (item) => {
    const statusKey = itemStatusKey(item, queueType);
    const pending = isPendingItem(item, queueType);
    const isProviders = queueType === 'providers';
    const title = isProviders ? (item.username || item.email || 'Unknown') : (item.name || 'Unknown');
    // Providers read as their SUB-PERSONA (Driver / Doctor / Paramedic), never a generic
    // "Provider" -- the persona is derived from provider_type, per the persona-pass rule.
    const facet = isProviders ? providerPersonaLabel(item.provider_type) : tokenLabel(item.type, 'facility');
    const detail = isProviders ? (item.email || 'No email') : (item.address || 'No address');
    return (
      <MobileListRow
        item={item}
        dataAttr="data-mobile-approval-row"
        onOpen={setActiveItem}
        ariaLabel={`${title}, ${pending ? 'pending' : statusKey}`}
        orbClass={isProviders ? providerPersonaOrb(item.provider_type) : orbClassFor(statusKey)}
        icon={isProviders ? providerPersonaIcon(item.provider_type) : Building2}
        title={title}
        meta={`${facet} · ${detail}`}
        time={formatRelativeTime(item.created_at)}
        markerChip={!canApprove && pending ? 'Admin' : null}
        pill={resolveVital('verification', statusKey).pill}
        selectable={selectionEnabled}
        selected={selectedIdSet.has(item.id)}
        selectionMode={selectionMode}
        onToggleSelect={(it) => {
          if (!bulkApproving) onSelect?.(it.id, !selectedIdSet.has(it.id));
        }}
        onLongPress={(it) => {
          if (!bulkApproving) onSelect?.(it.id, true);
        }}
      />
    );
  };

  return (
    <PullToRefresh onRefresh={onRefresh}>
      <MobilePageShell
        animatePageLoad={false}
        contentClassName="relative min-h-[calc(100dvh-3rem)] overflow-hidden px-0 pb-32 pt-8 text-foreground"
      >
        <MobileVerificationAtlasLayer />
        <div className="relative z-10 space-y-3">
          {/* Chrome (title + summary) is always present — no entrance motion. */}
          <MobileHeading
            title="Approvals"
            noun={queueType === 'providers' ? 'application' : 'facility'}
            count={scopeCount}
            showSkeleton={showTopSectionLoading}
            failedEmpty={false}
          />

          <MobileKPIStrip
            loading={showTopSectionLoading}
            kpis={kpis}
            activeKpi={activeStatus}
            onKpiClick={(id) => setFilters((prev) => ({ ...prev, status: id }))}
          />

          {/* Dual-queue switch — providers vs facilities are two lanes, two services. */}
          <div className="px-4">
            <div className="flex rounded-inner bg-foreground/[0.05] p-1 dark:bg-white/[0.06]">
              {[{ id: 'providers', label: 'Providers' }, { id: 'organizations', label: 'Facilities' }].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => { if (queueType !== tab.id) onSelectAll?.(false); setQueueType(tab.id); }}
                  aria-pressed={queueType === tab.id}
                            className={`flex-1 rounded-button py-2 text-[13px] font-semibold transition-all active:scale-[0.97] ${queueType === tab.id ? 'bg-background text-foreground shadow-sm dark:bg-white/[0.10]' : 'text-muted-foreground'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <section className="px-4">
            <SearchRow
              placeholder={`Search ${queueType === 'providers' ? 'providers' : 'facilities'}...`}
              search={filters?.search || ''}
              onSearchCommit={(value) => setFilters((prev) => ({ ...prev, search: value }))}
              entityLabel={queueType === 'providers' ? 'providers' : 'facilities'}
              onOpenFilters={onOpenFilters}
              filterSheetOpen={filterSheetOpen}
              hasFilter={hasFilter}
              onOpenStats={onViewAnalytics}
              statsOpen={analyticsOpen}
              statsLabel="Open approval analytics"
            />

            <UpdatingPillRow show={(refetching || isBuffering) && !showTopSectionLoading} />

            <div className="mt-3 space-y-2">
              {/* Multi-select bar — appears only in selection mode (providers + admin).
                  Sticky so it stays reachable while scrolling a long pending queue. */}
              {selectionMode && (
                <div
                  className="sticky top-2 z-30 flex items-center gap-2 rounded-inner bg-background/85 px-3 py-2 shadow-sm backdrop-blur-xl"
                  aria-busy={bulkApproving}
                >
                  <span className="text-[13px] font-semibold text-foreground tabular-nums">{selectedIdSet.size} selected</span>
                  <button
                    type="button"
                    onClick={() => onSelectAll?.(true)}
                    disabled={bulkApproving}
                    className="text-[12px] font-semibold text-muted-foreground transition-transform active:scale-95 disabled:cursor-wait disabled:opacity-50"
                  >
                    Select all
                  </button>
                  <div className="ml-auto flex items-center gap-2">
                    <button
                      type="button"
                      onClick={bulkApprove}
                      disabled={bulkApproving}
                      aria-busy={bulkApproving}
                      className="flex h-8 min-w-[7.75rem] items-center justify-center gap-1.5 rounded-button bg-emerald-500/12 px-3 text-[12px] font-semibold text-emerald-700 transition-transform active:scale-95 disabled:cursor-wait disabled:opacity-70 dark:text-emerald-300"
                    >
                      {bulkApproving ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle className="h-3.5 w-3.5" />
                      )}
                      <span aria-live="polite">
                        {bulkApproving
                          ? `Approving ${bulkProgress.completed}/${bulkProgress.total}`
                          : `Approve ${selectedIdSet.size}`}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectAll?.(false)}
                      disabled={bulkApproving}
                      aria-label="Clear selection"
                      className="flex h-8 w-8 items-center justify-center rounded-button bg-foreground/[0.05] text-muted-foreground transition-transform active:scale-95 disabled:cursor-wait disabled:opacity-50 dark:bg-white/[0.06]"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
              {/* Group-shaped skeleton (§5.2): mirrors the panel 1:1 for replace-in-place. */}
              {showTopSectionLoading ? (
                <SkeletonGroupPanel rows={6} />
              ) : (
                <div className="space-y-[18px]">
                  {groups.map((group) => (
                    <GroupPanel key={group.key} label={group.label} count={group.items.length}>
                      {group.items.map((item, index) => (
                        <React.Fragment key={item.id}>
                          {renderRow(item)}
                          {index < group.items.length - 1 && <Hairline />}
                        </React.Fragment>
                      ))}
                    </GroupPanel>
                  ))}
                </div>
              )}

              {/* Pagination is owned by the page's PaginationControls (rendered below
                  this component), so the mobile list carries no infinite-scroll
                  load-more / accumulator — it mirrors the current page window. */}
              {displayItems.length === 0 && !showTopSectionLoading && !loading && (
                <MobileListEmpty
                  icon={Shield}
                  label={canApprove ? 'No verification items found' : 'No visible approval items'}
                  reason={filters?.search ? 'search' : hasFilter ? 'filtered' : 'empty'}
                  hint={filters?.search
                    ? `No ${queueType === 'providers' ? 'providers' : 'facilities'} match "${filters.search}".`
                    : hasFilter
                      ? 'Try clearing status filters to recover queue visibility.'
                      : canApprove
                        ? 'New verification items will appear here as they arrive.'
                        : 'Approval items are not visible for this role.'}
                  onRecover={hasFilter ? () => setFilters((prev) => ({ ...prev, search: '', status: 'all' })) : undefined}
                  recoverLabel={filters?.search ? 'Clear Search' : hasFilter ? 'Reset Filters' : undefined}
                  labelTone="plain"
                />
              )}
            </div>
          </section>
        </div>

        {activeItem && (() => {
          const item = activeItem;
          const isProviders = queueType === 'providers';
          const pending = isPendingItem(item, queueType);
          const statusKey = itemStatusKey(item, queueType);
          const vital = resolveVital('verification', statusKey);
          const title = isProviders ? (item.username || item.email || 'Unknown') : (item.name || 'Unknown');
          const appliedAt = item.created_at ? formatRelativeTime(item.created_at) : null;
          const idValue = item.display_id || `#${String(item.id || '').slice(0, 12).toUpperCase()}`;

          // Approval COMMANDS are admin-only (canApprove). The provider lane is
          // APPROVE-ONLY (2026-07-10): providers have no rejected state (a single
          // bvn_verified boolean), so a Reject was a no-op that re-wrote pending as
          // pending — Approve verifies, declining leaves it pending. Facilities keep a
          // real Approve + Reject (verification_status has a rejected state).
          const canApproveNow = pending && canApprove;
          const approveProvider = canApproveNow && isProviders && onVerifyProvider
            ? { label: 'Approve', icon: CheckCircle, tone: APPROVE_TONE, onClick: () => { setActiveItem(null); onVerifyProvider(item.id, true); } }
            : null;
          const approveOrg = canApproveNow && !isProviders && onVerifyOrganization
            ? { label: 'Approve', icon: CheckCircle, tone: APPROVE_TONE, onClick: () => { setActiveItem(null); onVerifyOrganization(item.id, true); } }
            : null;
          const rejectOrg = canApproveNow && !isProviders && onVerifyOrganization
            ? { label: 'Reject', icon: Ban, 'aria-label': `Reject ${title}`, onClick: () => { setActiveItem(null); onVerifyOrganization(item.id, false); } }
            : null;
          const viewProvider = isProviders && onViewProvider
            ? { label: 'View', icon: Eye, onClick: () => { setActiveItem(null); onViewProvider(item); } }
            : null;

          let primary;
          let secondary;
          if (approveProvider) { primary = approveProvider; secondary = viewProvider || undefined; }
          else if (approveOrg) { primary = approveOrg; secondary = rejectOrg || undefined; }
          else if (viewProvider) { primary = viewProvider; }

          return (
            <MobileDetailSheet
              isOpen={!!activeItem}
              onClose={() => setActiveItem(null)}
              icon={isProviders ? providerPersonaIcon(item.provider_type) : Building2}
              iconTone={isProviders ? providerPersonaTone(item.provider_type) : vital.tone}
              eyebrow={isProviders ? providerPersonaLabel(item.provider_type) : 'Facility'}
              title={title}
              statusPill={vital.pill}
              vital={{ steps: vital.steps, currentKey: vital.currentKey, tone: vital.tone, cancelled: vital.cancelled, label: 'Verification' }}
              islands={isProviders ? [
                item.email && { icon: Mail, label: 'Email', value: item.email, href: `mailto:${item.email}` },
                { icon: Tag, label: 'Role', value: tokenLabel(item.role, 'provider') },
                item.provider_type && { icon: providerPersonaIcon(item.provider_type), label: 'Type', value: tokenLabel(item.provider_type) },
                appliedAt && { icon: Clock, label: 'Applied', value: appliedAt },
                { icon: Hash, label: 'ID', value: idValue },
              ] : [
                item.address && { icon: MapPin, label: 'Address', value: item.address },
                { icon: Tag, label: 'Type', value: tokenLabel(item.type, 'facility') },
                { icon: Shield, label: 'Status', value: tokenLabel(item.verification_status, 'pending') },
                appliedAt && { icon: Clock, label: 'Registered', value: appliedAt },
                { icon: Hash, label: 'ID', value: idValue },
              ]}
              primary={primary}
              secondary={secondary}
            >
              {/* Non-admin reviewers (org_admin can review, not approve) see the gate. */}
              {pending && !canApprove && (
                <div className="flex h-11 w-full items-center justify-center rounded-button bg-amber-500/10 text-sm font-semibold text-amber-700 dark:text-amber-200">
                  ADMIN REVIEW
                </div>
              )}
            </MobileDetailSheet>
          );
        })()}
      </MobilePageShell>
    </PullToRefresh>
  );
};
