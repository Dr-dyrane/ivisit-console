import React from 'react';
import { LockKeyhole } from 'lucide-react';
import { MobilePricing } from '../../mobile/MobilePricing';
import { TabletPricing } from '../../tablet/TabletPricing';
import { AnalyticsModal } from '../../modals/AnalyticsModal';
import { BulkActionBar } from '../../common/BulkActionBar';
import { SEOHead } from '../../common/SEOHead';
import { Button } from '../../ui/button';
import { PricingDesktopWorkspace } from './PricingDesktopWorkspace';
import { PricingDetailRail } from './PricingDetailRail';

export const PricingManagementPageView = ({ controller, chrome, isPhone, isTablet }) => {
  const {
    actionNotice,
    activeTab,
    analyticsModalOpen,
    canSelectPricing,
    desktopFilters,
    fetchPricing,
    focusedPrice,
    handleMobileLoadMore,
    handleOpenPricingStats,
    handleSort,
    initialLoading,
    isFetching,
    kpiFilter,
    loadError,
    mobileIsFetching,
    mobileLoadingMore,
    paginatedPricing,
    pagination,
    pricing,
    pricingAnalytics,
    pricingProjection,
    pricingSummary,
    pricingTotalCount,
    searchTerm,
    selection,
    setActiveTab,
    setAnalyticsModalOpen,
    setDesktopFilters,
    setFocused,
    setKpiFilter,
    setSearchTerm,
    sortConfig,
  } = controller;

  if (isPhone) {
    return (
      <div className="min-h-screen">
        <SEOHead
          title="Pricing"
          description="Review platform fallback and facility pricing evidence."
        />
        <MobilePricing
          pricing={paginatedPricing}
          allPricing={pricing}
          pricingProjection={pricingProjection}
          loading={initialLoading}
          isFetching={mobileIsFetching}
          isLoadingMore={mobileLoadingMore}
          errorMessage={loadError}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          kpiFilter={kpiFilter}
          setKpiFilter={setKpiFilter}
          onRefresh={fetchPricing}
          hasMore={pagination.hasNextPage}
          onLoadMore={handleMobileLoadMore}
          onViewAnalytics={handleOpenPricingStats}
          actionNotice={actionNotice}
          selectionEnabled={canSelectPricing}
          selectedIds={selection.selectedIds}
          onSelect={selection.handleToggleSelect}
          onSelectAll={selection.handleSelectAll}
        />
        <AnalyticsModal
          open={analyticsModalOpen}
          onClose={() => setAnalyticsModalOpen(false)}
          type="generic"
          analytics={{ ...pricingAnalytics }}
        />
      </div>
    );
  }

  if (isTablet) {
    return (
      <>
        <SEOHead
          title="Pricing"
          description="Review platform fallback and facility pricing evidence."
        />
        <TabletPricing
          pricing={paginatedPricing}
          summary={pricingSummary}
          totalCount={pricingTotalCount}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          kpiFilter={kpiFilter}
          setKpiFilter={setKpiFilter}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          loading={initialLoading}
          isFetching={mobileIsFetching}
          isLoadingMore={mobileLoadingMore}
          errorMessage={loadError}
          onRetry={fetchPricing}
          onRefresh={fetchPricing}
          onViewAnalytics={handleOpenPricingStats}
          actionNotice={actionNotice}
          focusedPrice={focusedPrice}
          onFocusPrice={setFocused}
          selectionEnabled={canSelectPricing}
          selectedIds={selection.selectedIds}
          onSelect={selection.handleToggleSelect}
          onSelectAll={selection.handleSelectAll}
          allSelected={selection.allSelected}
          someSelected={selection.someSelected}
          hasMore={pagination.hasNextPage}
          onLoadMore={handleMobileLoadMore}
          detail={(
            <PricingDetailRail
              price={focusedPrice}
              loading={initialLoading}
              hasFilter={Boolean(
                desktopFilters.search
                || (desktopFilters.kpiFilter || 'all') !== 'all'
                || desktopFilters.family !== 'all'
              )}
              embedded
            />
          )}
        />
        {canSelectPricing && (
          <BulkActionBar
            selectedCount={selection.selectedIds.length}
            onClear={selection.clearSelection}
          >
            <Button
              variant="ghost"
              size="icon"
              disabled
              data-state="unavailable"
              title="Bulk price changes are unavailable"
              aria-label="Bulk price changes are unavailable"
              className="h-10 w-10 rounded-pill bg-muted/30 text-muted-foreground disabled:opacity-40"
            >
              <LockKeyhole className="h-5 w-5" />
            </Button>
          </BulkActionBar>
        )}
        <AnalyticsModal
          open={analyticsModalOpen}
          onClose={() => setAnalyticsModalOpen(false)}
          type="generic"
          analytics={{ ...pricingAnalytics }}
        />
      </>
    );
  }

  return (
    <>
      <SEOHead
        title="Pricing"
        description="Review platform fallback and facility pricing evidence."
      />
      <PricingDesktopWorkspace
        rows={paginatedPricing}
        summary={pricingSummary}
        totalCount={pricingTotalCount}
        loading={initialLoading}
        isFetching={isFetching}
        error={loadError}
        filters={desktopFilters}
        setFilters={setDesktopFilters}
        retry={fetchPricing}
        pagination={pagination}
        sortConfig={sortConfig}
        onSort={handleSort}
        focusedPrice={focusedPrice}
        setFocused={setFocused}
        selectable={canSelectPricing}
        selectedIds={selection.selectedIds}
        allSelected={selection.allSelected}
        someSelected={selection.someSelected}
        onToggleSelect={selection.handleToggleSelect}
        onSelectClick={selection.handleSelectClick}
        onSelectAll={selection.handleSelectAll}
        moduleRailItems={chrome.moduleRailItems}
        routingPath={chrome.routingPath}
        onRailNavigate={chrome.handleRailNavigate}
      />
      {canSelectPricing && (
        <BulkActionBar
          selectedCount={selection.selectedIds.length}
          onClear={selection.clearSelection}
        >
          <Button
            variant="ghost"
            size="icon"
            disabled
            data-state="unavailable"
            title="Bulk price changes are unavailable"
            aria-label="Bulk price changes are unavailable"
            className="h-10 w-10 rounded-pill bg-muted/30 text-muted-foreground disabled:opacity-40"
          >
            <LockKeyhole className="h-5 w-5" />
          </Button>
        </BulkActionBar>
      )}
    </>
  );
};
