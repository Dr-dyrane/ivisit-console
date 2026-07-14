import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LockKeyhole } from 'lucide-react';
import {
  MobileHeading,
  SearchRow,
  UpdatingPillRow,
  useSkeletonWarmup,
} from './canon';
import { MobileKPIStrip } from './MobileKPIStrip';
import { MobileSelectionBar } from './MobileSelectionBar';
import { PullToRefresh } from './PullToRefresh';
import { MobilePageShell } from './MobilePageShell';
import { useStableList } from './useStableList';
import { useLoadMoreControl } from './useLoadMoreControl';
import { useNavigation } from '../../contexts/NavigationContext';
import { MobilePricingAtlasLayer } from './pricing/MobilePricingAtlasLayer';
import { MobilePricingDetailSheet } from './pricing/MobilePricingDetailSheet';
import { MobilePricingList } from './pricing/MobilePricingList';
import { PricingFamilyTabs } from './pricing/PricingFamilyTabs';
import {
  getMobilePricingCounts,
  getMobilePricingGroups,
  getMobilePricingKpis,
  getMobilePricingScopeCount,
  hasMobilePricingFilters,
} from './pricing/mobilePricingModel';

// LIST grammar. The page owns a growing server window (page 1 with an expanding
// pageSize), so this component renders the complete received window directly.
// grammar:loadmore-append=PricingManagementPage owns the growing server window.

export const MobilePricing = ({
  pricing = [],
  allPricing = [],
  loading = false,
  isFetching = false,
  errorMessage = null,
  activeTab = 'all',
  setActiveTab,
  searchTerm = '',
  setSearchTerm,
  kpiFilter = 'all',
  setKpiFilter,
  onRefresh,
  onViewAnalytics,
  actionNotice = '',
  pricingProjection = null,
  hasMore = false,
  onLoadMore,
  isLoadingMore = false,
  selectionEnabled = false,
  selectedIds = [],
  onSelect,
  onSelectAll,
  onFocusPrice,
  tabletPane,
}) => {
  const { isTablet } = useNavigation();
  const observerTarget = useRef(null);
  const [activeItem, setActiveItem] = useState(null);
  const selectedIdSet = useMemo(() => new Set(selectedIds || []), [selectedIds]);
  const selectionMode = selectionEnabled && selectedIdSet.size > 0;
  const counts = useMemo(() => getMobilePricingCounts({
    pricingProjection,
    allPricing,
  }), [allPricing, pricingProjection]);
  const kpis = useMemo(() => getMobilePricingKpis(counts), [counts]);
  const { displayItems, isBuffering } = useStableList(pricing, loading);
  const warmingUp = useSkeletonWarmup();
  const showLoading = warmingUp || (loading && displayItems.length === 0);
  const refetching = Boolean(isFetching);
  const hasFilter = hasMobilePricingFilters({ searchTerm, kpiFilter, activeTab });
  const scopeCount = getMobilePricingScopeCount(counts, kpiFilter);
  const { armed, requestLoad, triggerLoad } = useLoadMoreControl({
    hasMore,
    loading: loading || isLoadingMore,
    onLoadMore,
  });
  const hasTabletDetailPane = Boolean(isTablet && tabletPane);
  const handleOpenItem = (item) => {
    if (hasTabletDetailPane && onFocusPrice) {
      onFocusPrice(item.id);
      return;
    }
    setActiveItem(item);
  };

  useEffect(() => {
    if (!hasMore) return undefined;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) triggerLoad();
    }, { threshold: 0.1, rootMargin: '120px' });
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [hasMore, triggerLoad]);

  const groups = useMemo(
    () => getMobilePricingGroups(displayItems),
    [displayItems],
  );

  const resetFilters = () => {
    setSearchTerm('');
    setKpiFilter('all');
    setActiveTab('all');
  };

  return (
    <PullToRefresh onRefresh={onRefresh}>
      <MobilePageShell
        animatePageLoad={false}
        tabletPane={tabletPane}
        contentClassName="relative min-h-[calc(100dvh-3rem)] overflow-hidden px-0 pb-32 pt-8 text-foreground"
      >
        <MobilePricingAtlasLayer />
        <div className="relative z-10 space-y-3">
          <MobileHeading
            title="Pricing"
            noun="rule"
            count={scopeCount}
            summary={showLoading
              ? 'Loading pricing...'
              : errorMessage && displayItems.length === 0
                ? 'Pricing did not load'
                : `${scopeCount} ${scopeCount === 1 ? 'rule' : 'rules'}`}
          />

          <MobileKPIStrip
            loading={showLoading}
            kpis={kpis}
            activeKpi={kpiFilter}
            onKpiClick={setKpiFilter}
          />

          <section className="px-4">
            <PricingFamilyTabs activeTab={activeTab} setActiveTab={setActiveTab} />
            <SearchRow
              placeholder="Search pricing..."
              search={searchTerm}
              onSearchCommit={setSearchTerm}
              entityLabel="pricing"
              onOpenStats={onViewAnalytics}
              statsLabel="Open analytics"
            />
            <UpdatingPillRow show={(refetching || isBuffering) && !showLoading} />

            {selectionEnabled && (
              <MobileSelectionBar
                count={selectedIdSet.size}
                onSelectAll={() => onSelectAll?.(true)}
                onClear={() => onSelectAll?.(false)}
              >
                <button
                  type="button"
                  disabled
                  aria-label="Bulk price changes are unavailable"
                  title="Bulk price changes are unavailable"
                  className="flex h-8 items-center gap-1 rounded-button bg-foreground/[0.05] px-2 text-[11px] font-semibold text-muted-foreground opacity-50 dark:bg-white/[0.06]"
                >
                  <LockKeyhole className="h-3.5 w-3.5" />
                  Locked
                </button>
              </MobileSelectionBar>
            )}

            {actionNotice && (
              <p
                role="status"
                aria-live="polite"
                className="mt-3 rounded-inner bg-muted/20 px-4 py-3 text-xs text-muted-foreground"
              >
                {actionNotice}
              </p>
            )}

            {errorMessage && displayItems.length > 0 && (
              <div className="mt-3 rounded-card bg-amber-500/10 p-4 text-amber-800 dark:text-amber-200">
                <p className="text-sm font-semibold">Pricing did not refresh</p>
                <p className="mt-1 text-xs opacity-80">
                  Showing the last loaded pricing rules.
                </p>
                <button
                  type="button"
                  onClick={onRefresh}
                  className="mt-3 h-9 rounded-inner bg-amber-500/10 px-4 text-xs font-semibold active:scale-[0.96]"
                >
                  Try again
                </button>
              </div>
            )}

            <MobilePricingList
              groups={groups}
              showLoading={showLoading}
              selectionEnabled={selectionEnabled}
              selectedIdSet={selectedIdSet}
              selectionMode={selectionMode}
              onSelect={onSelect}
              onOpen={handleOpenItem}
              observerTarget={observerTarget}
              isLoadingMore={isLoadingMore}
              displayItems={displayItems}
              loading={loading}
              hasMore={hasMore}
              armed={armed}
              requestLoad={requestLoad}
              errorMessage={errorMessage}
              searchTerm={searchTerm}
              hasFilter={hasFilter}
              onRefresh={onRefresh}
              onResetFilters={resetFilters}
            />
          </section>
        </div>

        {!hasTabletDetailPane && (
          <MobilePricingDetailSheet
            activeItem={activeItem}
            onClose={() => setActiveItem(null)}
          />
        )}
      </MobilePageShell>
    </PullToRefresh>
  );
};

export { MobilePricingDetailSheet } from './pricing/MobilePricingDetailSheet';
export { MobilePricingList } from './pricing/MobilePricingList';
