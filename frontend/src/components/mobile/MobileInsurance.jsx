import React, { useMemo, useEffect, useRef, useState } from 'react';
import {
  Shield,
  ShieldCheck,
  Eye,
  Clock,
  AlertTriangle,
  Calendar,
  Percent,
  User,
  Building2,
  Hash,
  Tag
} from 'lucide-react';
// LIST-type page, LIFECYCLE expression (MOBILE_DESIGN_SYSTEM Sec 5) -- rebuilt to canon
// 2026-07-11, MIRRORING MobileSupportTickets / MobileHealthNews / MobileUsers exactly (the
// same 5-stage state machine: warm-up -> group-shaped SkeletonGroupPanel -> useStableList
// buffer -> isFetching Updating pill -> terminal empty/degraded/error). Off the old
// dashboard billboard + glance-tile summary rail + floating metric-row cards onto the grouped
// panel -- the LIST grammar FATALLY bans the billboard + glance rail (the same drop
// MobileHealthNews made).
//
// KPI AXIS = policy STATUS with VERIFICATION as an OVERLAY (desktop INSURANCE_STATE_OPTIONS:
// all/active/pending/expired/unverified). Counts are MEASURED from the server projection
// stats (getInsurancePageStats returns exact total/active/pending/expired/verified/
// unverified/expiringSoon) -- no loaded-row hedge. Chip hues are SINGLE-SOURCED from the
// vitalTracks insurance status pills (pending=cyan, active=emerald, expired=amber), which
// FIXES the old expired=destructive second-palette drop (chip now agrees with the amber row
// pill). The 'unverified' chip is the honest KPI expression of the verification overlay:
// it is server-wired (kpiFilter='unverified' -> verified.eq(false)) and returns REAL rows.
//
// COMMAND AUTHORITY (fail-closed by design, INSURANCE-class read-only per
// INSURANCE_COMMAND_AUTHORITY_DECISION_2026-07-07 + CRUD_RECEIVER_BACKLOG.md): /insurance is
// a faithful read-only mirror of patient-owned policy truth (insurance_policies is patient-
// owner CRUD only; no admin INSERT/UPDATE/DELETE RLS/RPC, no reconciled receiver). This
// surface is VIEW-ONLY: the detail sheet's single CTA is Details (onView -> read-only
// InsuranceModal). It receives no mutation, capability, or selection props, carries no
// destructive control, no secondary write affordance, and no create. Verification is
// DISPLAY-ONLY (an overlay pill / row markerChip / detail island, never a command).
//
// ROUTE-OWNED dock FAB: Policy Stats dispatches the page's namespaced
// openInsuranceAnalytics event. Read-only mutation authority does not make the route
// actionless: analytics is proved read work, while filter stays in the SearchRow and policy
// create/edit/delete/verify remain absent. usePageShell({ hideFab: true }) suppresses only the
// generic context FAB so DynamicBottomBar can render this single Insurance-owned action.
//
// grammar:loadmore-append=page owns the growing-window accumulation -- the mobile query is a
// GROWING WINDOW (offset = 0, limit = currentPage * itemsPerPage), so `policies` is already
// the full accumulated window and this component renders useStableList(policies, loading)
// DIRECTLY (no client accumulatorRef). useStableList holds the last settled set so a refetch
// never flashes the list to empty.
import { SearchRow, useSkeletonWarmup, UpdatingPillRow, MobileHeading, GroupPanel, MobileListRow, Hairline, SkeletonGroupList } from './canon';
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

const normalizedStatus = (value) => String(value || '').trim().toLowerCase() || 'unknown';
const formatStatusLabel = (value) => String(value || 'unknown')
  .replace(/[_-]+/g, ' ')
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatPlanType = (policy) => {
  const raw = policy?.policy_type || policy?.coverage_type || policy?.plan_type;
  if (!raw) return '';
  const text = String(raw).replace(/[_-]+/g, ' ').trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
};

const coverageLabel = (policy) => {
  if (policy?.coverage_percentage === null || policy?.coverage_percentage === undefined || policy?.coverage_percentage === '') return null;
  const value = Number(policy?.coverage_percentage);
  return Number.isFinite(value) ? `${value.toLocaleString()}%` : null;
};

const expiresLabel = (policy) => {
  if (!policy?.end_date) return null;
  const parsed = new Date(policy.end_date);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toLocaleDateString();
};

// Status-tinted orb. Literal hues (the semantic tokens collapse to brand red); the orb hue
// MATCHES the row's own pill (resolveVital('insurance', status).pill) so the row reads as one
// tone. pending=cyan, active=emerald, expired=amber, inactive=slate (the vitalTracks
// insurance domain tones).
const orbClassFor = (status) => {
  switch (status) {
    case 'active': return 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300';
    case 'pending': return 'bg-cyan-500/12 text-cyan-700 dark:text-cyan-300';
    case 'expired': return 'bg-amber-500/12 text-amber-700 dark:text-amber-300';
    case 'inactive': return 'bg-muted/40 text-muted-foreground';
    default: return 'bg-muted/40 text-muted-foreground';
  }
};

const statusIcon = (status) => {
  switch (status) {
    case 'active': return ShieldCheck;
    case 'pending': return Clock;
    case 'expired': return AlertTriangle;
    default: return Shield;
  }
};

// Lifecycle spine order for the status grouping: pending -> active -> expired -> inactive
// (INSURANCE_LIFECYCLE spine order, NOT alpha).
const STATUS_ORDER = ['pending', 'active', 'expired', 'inactive'];
const insuranceVital = (status) => (
  STATUS_ORDER.includes(normalizedStatus(status))
    ? resolveVital('insurance', normalizedStatus(status))
    : null
);
const insurancePill = (status) => insuranceVital(status)?.pill || {
  label: formatStatusLabel(status),
  className: 'bg-muted/40 text-muted-foreground',
};
const statusRank = (status) => {
  const index = STATUS_ORDER.indexOf(status);
  return index === -1 ? STATUS_ORDER.length : index;
};

// Atlas stage (donor recipe: MobileUsersAtlasLayer / MobileSupportAtlasLayer; ambient brand
// tint is sanctioned expression, Lesson 18).
const MobileInsuranceAtlasLayer = () => (
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

// Filter-trigger truth: any committed narrowing counts (search, KPI status/verification, or
// the sheet's status/type/verified/date facets), so the trigger's filtered state never lies.
// The KPI chips are a separate axis (status + verification overlay), not this signal.
const hasActiveInsuranceFilters = (filters = {}) => Boolean(
  filters?.search ||
  (Array.isArray(filters?.status) && filters.status.length > 0) ||
  (Array.isArray(filters?.type)
    ? filters.type.length > 0
    : Boolean(String(filters?.type || '').trim())) ||
  (filters?.verified && filters.verified !== 'all') ||
  filters?.created_at?.start ||
  filters?.created_at?.end
);

/**
 * MobileInsurance -- the policy evidence mirror on the canon LIST grammar. Server-owned
 * search/KPI (the page refetches + grows the window); this component renders. Read-only: the
 * detail sheet's single CTA is Details, and there is no create / edit / delete / verify.
 */
export const MobileInsurance = ({
  policies = [],
  filters,
  setFilters,
  onView,
  onRefresh,
  loading = false,
  error = null,
  onRetry,
  onOpenFilters,
  onViewAnalytics,
  stats,
  count,
  hasMore = false,
  onLoadMore,
  isLoadingMore = false,
  filterSheetOpen = false,
  analyticsOpen = false,
  isFetching = false
}) => {
  const observerTarget = useRef(null);
  const [activePolicy, setActivePolicy] = useState(null);
  // Background-refetch signal (KPI switch / search / pull-refresh keep the list from re-
  // skeletoning; the page passes isFetching so the Updating pill uses the REAL signal).
  const refetching = isFetching || false;

  const { armed, requestLoad, triggerLoad } = useLoadMoreControl({
    hasMore,
    loading: loading || refetching || isLoadingMore,
    onLoadMore,
  });

  useEffect(() => {
    if (!hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) triggerLoad();
      },
      { threshold: 0.1, rootMargin: '120px' }
    );
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [hasMore, triggerLoad]);

  // Page-owned growing-window accumulation (offset = 0, limit grows): render `policies`
  // DIRECTLY through useStableList -- no client accumulatorRef (see the loadmore-append
  // waiver at the top of the file).
  const { displayItems: displayPolicies, isBuffering } = useStableList(policies, loading);
  const warmingUp = useSkeletonWarmup();
  const showTopSectionLoading = warmingUp || (loading && displayPolicies.length === 0);

  // MEASURED, server-scoped counts (getInsurancePageStats returns EXACT counts). Axis =
  // policy STATUS with verification as an OVERLAY, exactly the desktop INSURANCE_STATE_OPTIONS
  // (all/active/pending/expired/unverified). Chip hues are SINGLE-SOURCED from the vitalTracks
  // insurance status pills: active=emerald hsl(162 94% 24%), pending=cyan hsl(192 91% 36%),
  // expired=amber hsl(26 90% 37%) -- NOT --destructive (the old second-palette drop). The
  // 'unverified' chip (slate) is the verification overlay expressed as a KPI: it is server-
  // wired (kpiFilter='unverified' -> verified.eq(false)) and returns REAL rows.
  const insuranceKPIs = [
    { id: 'all', label: 'Policies', value: metricValue(stats?.total, policies.length), color: 'hsl(var(--muted-foreground))' },
    { id: 'active', label: 'Active', value: metricValue(stats?.active, 0), color: 'hsl(162 94% 24%)' },
    { id: 'pending', label: 'Pending', value: metricValue(stats?.pending, 0), color: 'hsl(192 91% 36%)' },
    { id: 'expired', label: 'Expired', value: metricValue(stats?.expired, 0), color: 'hsl(26 90% 37%)' },
    { id: 'unverified', label: 'Unverified', value: metricValue(stats?.unverified, 0), color: 'hsl(215 16% 47%)' },
  ];

  // The route count is exact for the complete active query (KPI + search + sheet facets).
  // KPI values remain axis-level navigation counts, but they cannot replace this heading
  // count once another narrowing facet is active.
  const activeKpi = filters?.kpiFilter || 'all';
  const scopeCount = metricValue(count, policies.length);

  // 'policy' pluralizes irregularly (policy -> policies), so the count line is composed here
  // rather than through MobileHeading's naive +s (which would render "policys").
  const headingSummary = showTopSectionLoading
    ? 'Loading policies...'
    : (Boolean(error) && displayPolicies.length === 0)
      ? 'Policies did not load'
      : `${scopeCount} ${scopeCount === 1 ? 'policy' : 'policies'}`;

  const hasFilter = hasActiveInsuranceFilters(filters);
  const kpiEmptyCause = activeKpi !== 'all' && !filters?.search && !hasFilter;
  const activeKpiLabel = insuranceKPIs.find((item) => item.id === activeKpi)?.label || 'selected';

  // Adaptive, DATA-DRIVEN grouping: STATUS is the genuine lifecycle spine for insurance
  // (pending -> active -> expired; inactive), so it is the primary group (mirrors Support).
  // Labels come from resolveVital('insurance', key).pill.label so panel headers match the
  // row pills; order by the lifecycle rank [pending, active, expired, inactive]. It self-
  // corrects to coarse-recency two ways: (1) when a STATUS KPI chip is active (active/pending/
  // expired) the service hard-scopes the query to one status, so status-grouping is 100% one
  // bucket -> the scorer's maxShare>0.85 rejects it -> coarse-recency groups by intake date
  // within the scoped status; (2) an all-active tenant that exceeds the 85% share cap likewise
  // falls to coarse-recency. created_at is the real intake-freshness column (starts_at/
  // expires_at are coverage dates). Grouping is render-only; the service sort stays created_at
  // desc.
  const { groups: policyGroups } = useMemo(() => resolveAdaptiveGroups(displayPolicies, [
    {
      key: 'status',
      assign: (p) => normalizedStatus(p.status),
      labelFor: (k) => insurancePill(k).label,
      order: (keys) => keys.slice().sort((a, b) => statusRank(a) - statusRank(b)),
      orphanLabel: 'Other',
    },
    { type: 'coarse-recency', key: 'opened', getDate: (p) => p.created_at },
  ]), [displayPolicies]);

  const renderPolicyRow = (policy) => {
    const status = normalizedStatus(policy.status);
    const vital = insuranceVital(status);
    const planType = formatPlanType(policy);
    const providerLabel = policy.provider_name || 'Unknown provider';
    return (
      <MobileListRow
        item={policy}
        dataAttr="data-mobile-insurance-row"
        onOpen={setActivePolicy}
        ariaLabel={`${policy.policy_holder_name || policy.policy_number || 'Insurance policy'}, ${vital?.pill?.label || status}`}
        orbClass={orbClassFor(status)}
        icon={statusIcon(status)}
        title={policy.policy_holder_name || policy.policy_number || 'Unnamed policy'}
        meta={planType ? `${providerLabel} / ${planType}` : providerLabel}
        time={formatRelativeTime(policy.created_at)}
        markerChip={policy.verified ? 'Verified' : null}
        pill={vital?.pill || insurancePill(status)}
      />
    );
  };

  return (
    <PullToRefresh onRefresh={onRefresh}>
      <MobilePageShell
        animatePageLoad={false}
        contentClassName="relative min-h-[calc(100dvh-3rem)] overflow-hidden px-0 pb-32 pt-8 text-foreground"
      >
        <MobileInsuranceAtlasLayer />
        <div className="relative z-10 space-y-3">
          <MobileHeading
            title="Insurance"
            noun="policy"
            count={scopeCount}
            summary={headingSummary}
          />

          <MobileKPIStrip
            loading={showTopSectionLoading}
            kpis={insuranceKPIs}
            activeKpi={activeKpi}
            onKpiClick={(id) => setFilters(prev => ({ ...prev, kpiFilter: id }))}
          />

          <section className="px-4">
            <SearchRow
              placeholder="Search policy, provider, or plan..."
              search={filters?.search || ''}
              onSearchCommit={(value) => setFilters(prev => ({ ...prev, search: value }))}
              entityLabel="policies"
              onOpenFilters={onOpenFilters}
              filterSheetOpen={filterSheetOpen}
              hasFilter={hasFilter}
              onOpenStats={onViewAnalytics}
              statsOpen={analyticsOpen}
              statsLabel="Open analytics"
            />

            <UpdatingPillRow show={(refetching || isBuffering) && !showTopSectionLoading} />

            <div className="mt-3 space-y-2">
              {error && displayPolicies.length > 0 && (
                <div
                  className="rounded-card bg-destructive/10 p-4 text-destructive"
                  data-testid="mobile-insurance-degraded-state"
                >
                  <p className="text-sm font-semibold">Insurance did not refresh</p>
                  <p className="mt-1 text-xs text-destructive/75">Showing the last loaded policy rows.</p>
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
                <SkeletonGroupList groups={2} rowsPerGroup={[3, 2]} trailing="timePill" />
              ) : (
                <div className="space-y-[18px]">
                  {policyGroups.map((group) => (
                    <GroupPanel key={group.key} label={group.label} count={group.items.length}>
                      {group.items.map((policy, index) => (
                        <React.Fragment key={policy.id}>
                          {renderPolicyRow(policy)}
                          {index < group.items.length - 1 && <Hairline />}
                        </React.Fragment>
                      ))}
                    </GroupPanel>
                  ))}
                </div>
              )}

              <div ref={observerTarget} className="min-h-[64px] flex flex-col items-center justify-center gap-2">
                {isLoadingMore && !showTopSectionLoading && hasMore && displayPolicies.length > 0 && <MobileListLoadingMore />}
                {!loading && !isLoadingMore && hasMore && <MobileListLoadMore armed={armed} onRequest={requestLoad} labelTone="plain" />}
                {!loading && !hasMore && displayPolicies.length > 0 && <MobileListEnd label="End of policy list" />}
              </div>

              {displayPolicies.length === 0 && !loading && !showTopSectionLoading && error && (
                <MobileListEmpty
                  icon={Shield}
                  label="Policies did not load"
                  reason="error"
                  hint="Something went wrong loading insurance policies."
                  onRecover={onRetry}
                  recoverLabel="Retry"
                  labelTone="plain"
                />
              )}

              {displayPolicies.length === 0 && !loading && !showTopSectionLoading && !error && (
                <MobileListEmpty
                  icon={Shield}
                  label="No policies found"
                  reason={filters?.search ? 'search' : hasFilter || kpiEmptyCause ? 'filtered' : 'empty'}
                  hint={filters?.search
                    ? `No policies match "${filters.search}".`
                    : hasFilter
                      ? 'Try clearing filters to see the full policy list.'
                      : kpiEmptyCause
                        ? `No policies in the ${activeKpiLabel} scope.`
                      : 'Policy records for this scope will appear here.'}
                  onRecover={filters?.search
                    ? () => setFilters(prev => ({ ...prev, search: '' }))
                    : hasFilter
                      ? () => setFilters(prev => ({ ...prev, status: [], type: '', verified: '', created_at: { start: '', end: '' } }))
                      : kpiEmptyCause
                        ? () => setFilters(prev => ({ ...prev, kpiFilter: 'all' }))
                        : undefined}
                  recoverLabel={filters?.search ? 'Clear Search' : hasFilter ? 'Reset Filters' : kpiEmptyCause ? 'Show all policies' : undefined}
                  labelTone="plain"
                />
              )}
            </div>
          </section>
        </div>

        {/* Tap-opened record detail bottom sheet. Insurance IS a lifecycle domain, so the sheet
            carries the VitalTrack (status the pill). Read-only: the ONLY CTA is Details (onView
            -> read-only InsuranceModal). NO secondary edit action, NO delete, NO verify command
            -- verification is display-only (the island / row markerChip), never a write. */}
        {activePolicy && (() => {
          const policyStatus = normalizedStatus(activePolicy.status);
          const v = insuranceVital(policyStatus);
          const planType = formatPlanType(activePolicy);
          return (
            <MobileDetailSheet
              isOpen={!!activePolicy}
              onClose={() => setActivePolicy(null)}
              icon={statusIcon(policyStatus)}
              iconTone={v?.tone || 'hsl(215 16% 47%)'}
              eyebrow="Insurance policy"
              title={activePolicy.policy_holder_name || activePolicy.policy_number || 'Unnamed policy'}
              statusPill={v?.pill || insurancePill(policyStatus)}
              vital={v ? { ...v, label: 'Policy status' } : null}
              islands={[
                { icon: User, label: 'Holder', value: activePolicy.policy_holder_name },
                { icon: Building2, label: 'Provider', value: activePolicy.provider_name },
                { icon: Hash, label: 'Policy number', value: activePolicy.policy_number },
                { icon: Tag, label: 'Plan type', value: planType },
                { icon: Percent, label: 'Coverage rate', value: coverageLabel(activePolicy) },
                { icon: Calendar, label: 'Expires', value: expiresLabel(activePolicy) },
                { icon: ShieldCheck, label: 'Verification', value: activePolicy.verified ? 'Verified' : 'Not verified' },
              ]}
              primary={{ label: 'Details', icon: Eye, onClick: () => { setActivePolicy(null); onView?.(activePolicy); }, tone: v?.accent }}
            />
          );
        })()}
      </MobilePageShell>
    </PullToRefresh>
  );
};
