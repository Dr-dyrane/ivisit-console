import React, { useMemo } from 'react';
import { BadgeDollarSign, Building2, Globe } from 'lucide-react';
import {
  formatPricingAmount,
  formatPricingDate,
  getPricingKpiCount,
  getPricingRuleName,
  getPricingScopeTone,
  isGlobalPricingRule,
  PRICING_KPI_DEFINITIONS,
} from '../pages/pricing/pricingPageModel';
import { TABLET_FOCUS_RING, TabletCollectionPage } from './TabletCollectionPage';

const pricingFamilyTabs = [
  { id: 'all', label: 'All' },
  { id: 'services', label: 'Services' },
  { id: 'rooms', label: 'Rooms' },
];

const pricingKpiIcons = {
  all: BadgeDollarSign,
  override: Building2,
  global: Globe,
};

const TabletPricingTabs = ({ activeTab, onChange, actionNotice }) => (
  <div className="space-y-2">
    <div
      className="grid grid-cols-3 gap-1 rounded-inner bg-muted/20 p-1"
      role="tablist"
      aria-label="Pricing family"
    >
      {pricingFamilyTabs.map((tab) => {
        const selected = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            onClick={() => onChange?.(tab.id)}
            aria-selected={selected}
            className={`h-11 rounded-button text-xs font-semibold transition-all active:scale-[0.97] ${TABLET_FOCUS_RING} ${selected
              ? 'bg-card text-foreground shadow-e1'
              : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
    {actionNotice && (
      <p className="rounded-inner bg-muted/25 px-3 py-2 text-xs text-muted-foreground" role="status">
        {actionNotice}
      </p>
    )}
  </div>
);

export const TabletPricing = ({
  pricing = [],
  summary = {},
  totalCount = 0,
  activeTab = 'all',
  setActiveTab,
  kpiFilter = 'all',
  setKpiFilter,
  searchTerm = '',
  setSearchTerm,
  loading = false,
  isFetching = false,
  isLoadingMore = false,
  errorMessage = null,
  onRetry,
  onRefresh,
  onViewAnalytics,
  actionNotice = '',
  focusedPrice,
  onFocusPrice,
  selectionEnabled = false,
  selectedIds = [],
  onSelect,
  onSelectClick,
  onSelectAll,
  allSelected,
  someSelected,
  hasMore = false,
  onLoadMore,
  detail,
}) => {
  const kpis = useMemo(() => PRICING_KPI_DEFINITIONS.map((option) => ({
    ...option,
    icon: pricingKpiIcons[option.id],
    value: getPricingKpiCount(summary, totalCount, option.id),
  })), [summary, totalCount]);

  const records = useMemo(() => pricing.map((price) => {
    const globalRule = isGlobalPricingRule(price);
    return {
      id: price.id,
      source: price,
      title: getPricingRuleName(price),
      subtitle: `${price.family || price._pricingType || 'service'} - ${formatPricingAmount(price)}`,
      meta: globalRule
        ? 'Platform fallback'
        : price.facilityName || price.facility_name || 'Facility price',
      trailing: formatPricingDate(price.updated_at || price.created_at),
      statusLabel: globalRule ? 'Platform' : 'Facility',
      statusClass: getPricingScopeTone(price),
      icon: globalRule ? Globe : Building2,
      iconClass: getPricingScopeTone(price),
    };
  }), [pricing]);

  // This feed genuinely accumulates (grow-window fetch), so "Load more" is honest.
  const footer = hasMore ? (
    <button
      type="button"
      onClick={onLoadMore}
      disabled={loading || isFetching || isLoadingMore}
      className={`h-11 w-full rounded-button bg-foreground/[0.06] text-xs font-semibold text-foreground transition-all active:scale-[0.98] disabled:opacity-50 ${TABLET_FOCUS_RING}`}
    >
      {isLoadingMore ? 'Loading pricing...' : 'Load more'}
    </button>
  ) : null;

  return (
    <TabletCollectionPage
      detail={detail}
      records={records}
      kpis={kpis}
      activeKpi={kpiFilter}
      onKpiChange={setKpiFilter}
      kpiPinnedIds={['override', 'global']}
      kpiImportance={{ all: 0, override: 1, global: 2 }}
      loading={loading}
      isFetching={isFetching || isLoadingMore}
      error={errorMessage}
      onRetry={onRetry}
      onRefresh={onRefresh}
      searchValue={searchTerm}
      onSearchCommit={setSearchTerm}
      searchPlaceholder="Search pricing rules..."
      filtersActive={Boolean(searchTerm || activeTab !== 'all' || kpiFilter !== 'all')}
      onOpenAnalytics={onViewAnalytics}
      focusedId={focusedPrice?.id}
      onFocus={onFocusPrice}
      onOpen={(price) => onFocusPrice?.(price.id)}
      selectable={selectionEnabled}
      selectedIds={selectedIds}
      onToggleSelect={onSelect}
      onSelectClick={onSelectClick}
      onSelectAll={onSelectAll}
      allSelected={allSelected}
      someSelected={someSelected}
      emptyTitle="No pricing rules found"
      emptyBody="Pricing rules in this scope will appear here."
      countLabel={`${totalCount || pricing.length} pricing rules`}
      footer={footer}
      toolbarSlot={(
        <TabletPricingTabs
          activeTab={activeTab}
          onChange={setActiveTab}
          actionNotice={actionNotice}
        />
      )}
    />
  );
};

export default TabletPricing;
