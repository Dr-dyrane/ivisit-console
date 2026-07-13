import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Building2,
  Clock,
  CreditCard,
  Eye,
  Hash,
  Mail,
  Trash2,
  Wallet,
} from 'lucide-react';
import {
  GroupPanel,
  Hairline,
  MobileHeading,
  MobileListRow,
  SearchRow,
  SkeletonGroupPanel,
  UpdatingPillRow,
  useSkeletonWarmup,
} from './canon';
import { MobileKPIStrip } from './MobileKPIStrip';
import { MobileDetailSheet } from './MobileDetailSheet';
import { MobileSelectionBar } from './MobileSelectionBar';
import { PullToRefresh } from './PullToRefresh';
import { MobilePageShell } from './MobilePageShell';
import {
  MobileListEmpty,
  MobileListEnd,
  MobileListLoadingMore,
  MobileListLoadMore,
} from './MobileListStates';
import { useStableList } from './useStableList';
import { useLoadMoreControl } from './useLoadMoreControl';
import { useRowSelection } from '../../hooks/useRowSelection';
import { useFeedback } from '../../hooks/useFeedback';
import { FEEDBACK_TYPES } from '../../contexts/FeedbackContext';
import { formatRelativeTime } from '../../utils/activityUtils';
import { resolveAdaptiveGroups } from '../../utils/adaptiveGrouping';

const metricValue = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const isFunded = (organization) => Number(organization?.wallet_balance || 0) > 0;

const formatWallet = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 'Not available';
  return `$${numeric.toLocaleString()}`;
};

const formatDate = (value) => {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};

const organizationPill = (organization) => (organization?.is_active
  ? {
      label: 'Active',
      className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200',
      dataStatus: 'active',
    }
  : {
      label: 'Inactive',
      className: 'bg-muted/40 text-muted-foreground',
      dataStatus: 'inactive',
    });

const readinessLabel = (key) => (key === 'funded' ? 'Funded' : 'Payout gap');

const MobileOrganizationsAtlasLayer = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden bg-background">
    <div
      className="absolute inset-0 opacity-[0.28] dark:opacity-[0.22]"
      style={{
        backgroundImage:
          'linear-gradient(118deg, transparent 0 45%, hsl(var(--foreground) / 0.05) 45% 48%, transparent 48%), linear-gradient(32deg, transparent 0 41%, hsl(var(--foreground) / 0.04) 41% 44%, transparent 44%), linear-gradient(154deg, transparent 0 64%, hsl(var(--primary) / 0.06) 64% 67%, transparent 67%)',
        backgroundSize: '250px 178px, 330px 236px, 410px 276px',
        backgroundPosition: '18px 10px, -72px 48px, 16% 38%',
      }}
    />
    <div
      className="absolute inset-0"
      style={{
        background:
          'linear-gradient(145deg, hsl(var(--background) / 0.12), transparent 42%), linear-gradient(180deg, hsl(var(--background) / 0.2), hsl(var(--background)) 92%)',
      }}
    />
  </div>
);

const hasActiveOrganizationFilters = (filters = {}) => Boolean(
  filters.search || (filters.kpiFilter && filters.kpiFilter !== 'all')
);

export const MobileOrganizations = ({
  organizations = [],
  statistics = null,
  filters = {},
  setFilters,
  onView,
  onRefresh,
  loading = false,
  isFetching = false,
  isPlaceholderData = false,
  errorMessage = null,
  onRetry,
  onOpenFilters,
  filterSheetOpen = false,
  onViewAnalytics,
  analyticsOpen = false,
  selectionEnabled = false,
  hasMore = false,
  onLoadMore,
  page = 1,
}) => {
  const observerTarget = useRef(null);
  const [activeOrganization, setActiveOrganization] = useState(null);
  const { triggerFromEvent } = useFeedback();
  const sourceOrganizations = useMemo(
    () => (Array.isArray(organizations) ? organizations : []),
    [organizations]
  );
  const busy = loading || isFetching;
  const { armed, requestLoad, triggerLoad } = useLoadMoreControl({
    hasMore,
    loading: busy,
    onLoadMore,
  });

  useEffect(() => {
    if (!hasMore || busy) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) triggerLoad();
      },
      { threshold: 0.1, rootMargin: '120px' }
    );
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [busy, hasMore, triggerLoad]);

  // The query is windowed. This id-keyed accumulator replaces page 1 and appends later pages.
  // Placeholder rows are never absorbed, so changing search/KPI cannot poison the new scope with
  // the previous query's rows. A settled empty page 1 clears; an empty later page keeps page 1.
  const filterSignature = JSON.stringify({
    search: filters.search || '',
    kpi: filters.kpiFilter || 'all',
  });
  const accumulatorRef = useRef({
    signature: null,
    order: [],
    byId: new Map(),
    lastSource: null,
    lastPlaceholder: null,
  });
  const organizationRows = useMemo(() => {
    const store = accumulatorRef.current;
    const reset = () => {
      store.order = [];
      store.byId = new Map();
    };
    const absorb = (row) => {
      const id = row?.id;
      if (id === null || id === undefined) return;
      if (!store.byId.has(id)) store.order.push(id);
      store.byId.set(id, row);
    };

    if (store.signature !== filterSignature) {
      store.signature = filterSignature;
      reset();
      store.lastSource = null;
      store.lastPlaceholder = null;
    }

    if (store.lastSource !== sourceOrganizations || store.lastPlaceholder !== isPlaceholderData) {
      store.lastSource = sourceOrganizations;
      store.lastPlaceholder = isPlaceholderData;
      if (!isPlaceholderData) {
        if (page === 1) reset();
        sourceOrganizations.forEach(absorb);
      }
    }

    return store.order.map((id) => store.byId.get(id));
  }, [filterSignature, isPlaceholderData, page, sourceOrganizations]);

  const { displayItems: displayOrganizations, isBuffering } = useStableList(organizationRows, loading);
  const warmingUp = useSkeletonWarmup();
  const showTopSectionLoading = warmingUp
    || ((loading || isPlaceholderData) && displayOrganizations.length === 0);

  const organizationKPIs = [
    {
      id: 'all',
      label: 'Registry',
      value: metricValue(statistics?.total, sourceOrganizations.length),
      color: 'hsl(var(--muted-foreground))',
    },
    {
      id: 'funded',
      label: 'Funded',
      value: metricValue(statistics?.funded, 0),
      color: 'hsl(162 94% 24%)',
    },
    {
      id: 'payout_gap',
      label: 'Payout gap',
      value: metricValue(statistics?.payoutGap, 0),
      color: 'hsl(38 92% 50%)',
    },
  ];
  const activeKpi = filters.kpiFilter || 'all';
  const scopeCount = activeKpi === 'funded'
    ? metricValue(statistics?.funded, 0)
    : activeKpi === 'payout_gap'
      ? metricValue(statistics?.payoutGap, 0)
      : metricValue(statistics?.total, sourceOrganizations.length);
  const hasFilter = hasActiveOrganizationFilters(filters);

  const {
    selectedIds,
    handleToggleSelect,
    handleSelectAll,
    clearSelection,
  } = useRowSelection(organizationRows);
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectionMode = selectionEnabled && selectedIdSet.size > 0;

  const { groups: organizationGroups } = useMemo(() => resolveAdaptiveGroups(
    displayOrganizations,
    [
      {
        key: 'payout-readiness',
        assign: (organization) => (isFunded(organization) ? 'funded' : 'payout_gap'),
        labelFor: readinessLabel,
        order: (keys) => keys.slice().sort((a, b) => (a === 'funded' ? -1 : b === 'funded' ? 1 : 0)),
      },
      {
        type: 'coarse-recency',
        key: 'added',
        getDate: (organization) => organization.created_at || organization.updated_at,
      },
    ]
  ), [displayOrganizations]);

  const renderOrganizationRow = (organization) => {
    const funded = isFunded(organization);
    return (
      <MobileListRow
        item={organization}
        dataAttr="data-mobile-organization-row"
        onOpen={setActiveOrganization}
        ariaLabel={`${organization.name || 'Unnamed organization'}, ${funded ? 'funded' : 'payout gap'}`}
        orbClass={funded
          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200'
          : 'bg-amber-500/10 text-amber-700 dark:text-amber-200'}
        icon={Building2}
        title={organization.name || 'Unnamed organization'}
        meta={organization.contact_email || 'No contact email'}
        time={formatRelativeTime(organization.created_at || organization.updated_at)}
        markerChip={funded ? 'Funded' : null}
        pill={organizationPill(organization)}
        selectable={selectionEnabled}
        selected={selectedIdSet.has(organization.id)}
        selectionMode={selectionMode}
        onToggleSelect={(item) => handleToggleSelect(item.id, !selectedIdSet.has(item.id))}
        onLongPress={(item) => handleToggleSelect(item.id, true)}
      />
    );
  };

  return (
    <PullToRefresh onRefresh={onRefresh}>
      <MobilePageShell
        animatePageLoad={false}
        contentClassName="relative min-h-[calc(100dvh-3rem)] overflow-hidden px-0 pb-32 pt-8 text-foreground"
      >
        <MobileOrganizationsAtlasLayer />
        <div className="relative z-10 space-y-3">
          <MobileHeading
            title="Organizations"
            noun="organization"
            count={scopeCount}
            showSkeleton={showTopSectionLoading}
            failedEmpty={Boolean(errorMessage) && displayOrganizations.length === 0}
          />

          <MobileKPIStrip
            loading={showTopSectionLoading}
            kpis={organizationKPIs}
            activeKpi={activeKpi}
            onKpiClick={(id) => setFilters((current) => ({ ...current, kpiFilter: id }))}
          />

          <section className="px-4">
            <SearchRow
              placeholder="Search organizations..."
              search={filters.search || ''}
              onSearchCommit={(value) => setFilters((current) => ({ ...current, search: value }))}
              entityLabel="organizations"
              onOpenFilters={onOpenFilters}
              filterSheetOpen={filterSheetOpen}
              hasFilter={hasFilter}
              onOpenStats={onViewAnalytics}
              statsOpen={analyticsOpen}
              statsLabel="Open organization analytics"
            />
            <UpdatingPillRow
              show={(isFetching || isBuffering) && !showTopSectionLoading && !isPlaceholderData}
            />

            <div className="mt-3 space-y-2">
              {selectionEnabled && (
                <MobileSelectionBar
                  count={selectedIds.length}
                  onSelectAll={() => handleSelectAll(true)}
                  onClear={clearSelection}
                >
                  <button
                    type="button"
                    disabled
                    aria-label="Organization deletion is not available"
                    title="Organization deletion is not available"
                    className="flex h-8 w-8 items-center justify-center rounded-button bg-destructive/12 text-destructive opacity-40"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </MobileSelectionBar>
              )}

              {errorMessage && displayOrganizations.length > 0 && (
                <div
                  className="rounded-card bg-destructive/10 p-4 text-destructive"
                  data-testid="mobile-organizations-degraded-state"
                >
                  <p className="text-sm font-semibold">Organizations did not refresh</p>
                  <p className="mt-1 text-xs text-destructive/75">
                    Showing the last loaded organization rows.
                  </p>
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

              {showTopSectionLoading ? (
                <SkeletonGroupPanel rows={6} />
              ) : (
                <div className="space-y-[18px]">
                  {organizationGroups.map((group) => (
                    <GroupPanel key={group.key} label={group.label} count={group.items.length}>
                      {group.items.map((organization, index) => (
                        <React.Fragment key={organization.id}>
                          {renderOrganizationRow(organization)}
                          {index < group.items.length - 1 && <Hairline />}
                        </React.Fragment>
                      ))}
                    </GroupPanel>
                  ))}
                </div>
              )}

              <div
                ref={observerTarget}
                className="flex min-h-[64px] flex-col items-center justify-center gap-2"
              >
                {isFetching && page > 1 && hasMore && displayOrganizations.length > 0 && (
                  <MobileListLoadingMore />
                )}
                {!busy && hasMore && (
                  <MobileListLoadMore armed={armed} onRequest={requestLoad} labelTone="plain" />
                )}
                {!busy && !hasMore && displayOrganizations.length > 0 && (
                  <MobileListEnd label="End of organization list" />
                )}
              </div>

              {displayOrganizations.length === 0 && !showTopSectionLoading && !isFetching && (
                <MobileListEmpty
                  icon={Building2}
                  label={errorMessage ? 'Organizations did not load' : 'No organizations found'}
                  reason={filters.search ? 'search' : hasFilter ? 'filtered' : 'empty'}
                  hint={errorMessage
                    ? 'Try again before treating the registry as empty.'
                    : filters.search
                      ? `No organizations match "${filters.search}".`
                      : hasFilter
                        ? 'Try clearing filters to see the full registry.'
                        : 'Organizations will appear here when available.'}
                  onRecover={errorMessage
                    ? onRetry
                    : hasFilter
                      ? () => setFilters({ search: '', kpiFilter: 'all' })
                      : undefined}
                  recoverLabel={errorMessage ? 'Try again' : hasFilter ? 'Reset filters' : undefined}
                  labelTone="plain"
                />
              )}
            </div>
          </section>
        </div>

        {activeOrganization && (() => {
          const organization = activeOrganization;
          const organizationId = organization.display_id || organization.id || 'Not available';
          return (
            <MobileDetailSheet
              isOpen
              onClose={() => setActiveOrganization(null)}
              icon={Building2}
              iconTone={isFunded(organization) ? 'hsl(162 94% 24%)' : 'hsl(38 92% 50%)'}
              eyebrow={isFunded(organization) ? 'Funded organization' : 'Payout gap'}
              title={organization.name || 'Unnamed organization'}
              statusPill={organizationPill(organization)}
              islands={[
                {
                  icon: Mail,
                  label: 'Contact',
                  value: organization.contact_email || 'Not available',
                  href: organization.contact_email ? `mailto:${organization.contact_email}` : undefined,
                },
                {
                  icon: Wallet,
                  label: 'Wallet',
                  value: formatWallet(organization.wallet_balance),
                },
                {
                  icon: CreditCard,
                  label: 'Stripe',
                  value: organization.stripe_account_id ? 'Connected' : 'Not connected',
                },
                {
                  icon: Clock,
                  label: 'Added',
                  value: formatDate(organization.created_at),
                },
                {
                  icon: Hash,
                  label: 'Organization ID',
                  value: organizationId,
                  onPress: (event) => {
                    navigator.clipboard?.writeText(String(organizationId))?.catch(() => {});
                    triggerFromEvent(event, {
                      variant: FEEDBACK_TYPES.SUCCESS,
                      color: 'hsl(var(--spark))',
                      haptic: true,
                      sound: true,
                    });
                  },
                },
              ]}
              primary={{
                label: 'Details',
                icon: Eye,
                onClick: () => {
                  setActiveOrganization(null);
                  onView?.(organization);
                },
              }}
            />
          );
        })()}
      </MobilePageShell>
    </PullToRefresh>
  );
};

export default MobileOrganizations;
