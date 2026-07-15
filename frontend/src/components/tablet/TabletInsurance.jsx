import React, { useMemo } from 'react';
import { Shield } from 'lucide-react';
import {
  formatInsuranceCoverage,
  formatInsurancePlanType,
} from '../pages/insurance/insurancePageModel';
import {
  getInsurancePolicyPill,
  getInsuranceStateCount,
  hasInsuranceWorkspaceFilter,
  INSURANCE_STATE_IMPORTANCE,
  INSURANCE_STATE_OPTIONS,
} from '../pages/insurance/insurancePresentation';
import { TABLET_FOCUS_RING, TabletCollectionPage } from './TabletCollectionPage';
import { formatTabletDateTime } from './tabletFormatters';

export const TabletInsurance = ({
  policies = [],
  stats = {},
  count,
  filters = {},
  setFilters,
  loading = false,
  isFetching = false,
  denied = false,
  error = null,
  onRetry,
  onRefresh,
  onOpenFilters,
  filterSheetOpen = false,
  onViewAnalytics,
  focusedPolicy,
  onFocusPolicy,
  onView,
  selectionEnabled = false,
  selectedIds = [],
  onSelect,
  onSelectClick,
  onSelectAll,
  allSelected,
  someSelected,
  hasMore = false,
  onLoadMore,
  isLoadingMore = false,
  detail,
}) => {
  const activeKpi = filters.kpiFilter || 'all';
  const kpis = useMemo(() => INSURANCE_STATE_OPTIONS.map((option) => ({
    ...option,
    value: getInsuranceStateCount(stats, policies, option.id),
  })), [policies, stats]);

  const records = useMemo(() => policies.map((policy) => {
    const status = getInsurancePolicyPill(policy.status);
    const plan = formatInsurancePlanType(policy);
    const coverage = formatInsuranceCoverage(policy);
    return {
      id: policy.id,
      source: policy,
      title: policy.policy_holder_name || policy.policy_number || 'Unnamed policy',
      subtitle: policy.provider_name || 'Unknown provider',
      meta: [plan, coverage].filter(Boolean).join(' - '),
      trailing: formatTabletDateTime(policy.created_at),
      statusLabel: status.label,
      statusClass: status.className,
      icon: Shield,
      iconClass: status.className,
    };
  }), [policies]);

  // This feed genuinely accumulates (grow-window fetch), so "Load more" is honest.
  const footer = hasMore ? (
    <button
      type="button"
      onClick={onLoadMore}
      disabled={loading || isFetching || isLoadingMore}
      className={`h-11 w-full rounded-button bg-foreground/[0.06] text-xs font-semibold text-foreground transition-all active:scale-[0.98] disabled:opacity-50 ${TABLET_FOCUS_RING}`}
    >
      {isLoadingMore ? 'Loading policies...' : 'Load more'}
    </button>
  ) : null;

  return (
    <TabletCollectionPage
      detail={detail}
      records={records}
      kpis={kpis}
      activeKpi={activeKpi}
      onKpiChange={(id) => setFilters?.((current) => ({ ...current, kpiFilter: id }))}
      kpiPinnedIds={['pending', 'unverified']}
      kpiImportance={INSURANCE_STATE_IMPORTANCE}
      loading={loading}
      isFetching={isFetching || isLoadingMore}
      error={denied ? null : error}
      onRetry={onRetry}
      onRefresh={onRefresh}
      searchValue={filters.search || ''}
      onSearchCommit={(value) => setFilters?.((current) => ({ ...current, search: value }))}
      searchPlaceholder="Search policy, provider, or plan..."
      onOpenFilters={onOpenFilters}
      filtersActive={hasInsuranceWorkspaceFilter(filters)}
      filterSheetOpen={filterSheetOpen}
      onOpenAnalytics={onViewAnalytics}
      focusedId={focusedPolicy?.id}
      onFocus={onFocusPolicy}
      onOpen={onView}
      selectable={selectionEnabled}
      selectedIds={selectedIds}
      onToggleSelect={onSelect}
      onSelectClick={onSelectClick}
      onSelectAll={onSelectAll}
      allSelected={allSelected}
      someSelected={someSelected}
      emptyTitle={denied ? 'Insurance access unavailable' : 'No policies found'}
      emptyBody={denied
        ? 'This account does not have access to policy records.'
        : 'Policies in this scope will appear here.'}
      countLabel={`${count ?? policies.length} policies`}
      footer={footer}
    />
  );
};

export default TabletInsurance;
