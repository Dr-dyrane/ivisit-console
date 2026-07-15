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
  INSURANCE_STATE_OPTIONS,
} from '../pages/insurance/insurancePresentation';
import { TabletCollectionPage } from './TabletCollectionPage';
import { formatTabletDateTime } from './tabletFormatters';

const getTabletInsuranceKpis = (activeId) => {
  const ids = ['all', 'active', 'pending'];
  if (activeId && !ids.includes(activeId)) ids[2] = activeId;
  return ids
    .map((id) => INSURANCE_STATE_OPTIONS.find((option) => option.id === id))
    .filter(Boolean);
};

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
  onViewAnalytics,
  focusedPolicy,
  onFocusPolicy,
  onView,
  selectionEnabled = false,
  selectedIds = [],
  onSelect,
  onSelectAll,
  allSelected,
  someSelected,
  hasMore = false,
  onLoadMore,
  isLoadingMore = false,
  detail,
}) => {
  const activeKpi = filters.kpiFilter || 'all';
  const kpis = useMemo(() => getTabletInsuranceKpis(activeKpi).map((option) => ({
    ...option,
    value: getInsuranceStateCount(stats, policies, option.id),
  })), [activeKpi, policies, stats]);

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

  const footer = hasMore ? (
    <button
      type="button"
      onClick={onLoadMore}
      disabled={loading || isFetching || isLoadingMore}
      className="h-10 w-full rounded-button bg-foreground/[0.06] text-xs font-semibold text-foreground transition-all active:scale-[0.98] disabled:opacity-50"
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
      onOpenAnalytics={onViewAnalytics}
      focusedId={focusedPolicy?.id}
      onFocus={onFocusPolicy}
      onOpen={onView}
      selectable={selectionEnabled}
      selectedIds={selectedIds}
      onToggleSelect={onSelect}
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
