import React from 'react';
import { useNavigation } from '../../../contexts/NavigationContext';
import { SEOHead } from '../../common/SEOHead';
import { FilterSheet } from '../../common/FilterSheet';
import { MobileHealthNews } from '../../mobile/MobileHealthNews';
import { AnalyticsModal } from '../../modals/AnalyticsModal';
import { HealthNewsModal } from '../../modals/HealthNewsModal';
import { TabletHealthNews } from '../../tablet/TabletHealthNews';
import { HealthNewsDesktopWorkspace } from './HealthNewsDesktopWorkspace';
import { HealthNewsDetailRail } from './HealthNewsDetailRail';
import { HealthNewsProjectionStatsNotice } from './HealthNewsProjectionStatsNotice';
import { HEALTH_NEWS_FILTER_SCHEMA } from './healthNewsPageModel';

const HealthNewsPageDialogs = ({ controller }) => (
  <>
    {controller.modalMode && (
      <HealthNewsModal
        isOpen={Boolean(controller.modalMode)}
        onClose={controller.handleModalClose}
        news={controller.selectedNews}
      />
    )}

    <FilterSheet
      isOpen={controller.filterSheetOpen}
      onOpenChange={controller.setFilterSheetOpen}
      filterSchema={HEALTH_NEWS_FILTER_SCHEMA}
      onApply={controller.handleApplyFilters}
      initialValues={controller.filters}
      isMobile={controller.isMobile}
    />

    <AnalyticsModal
      open={controller.analyticsModalOpen}
      onClose={() => controller.setAnalyticsModalOpen(false)}
      type="news"
      analytics={controller.newsAnalytics}
    />
  </>
);

export const HealthNewsPageView = ({ controller }) => {
  const { isPhone, isTablet } = useNavigation();

  if (isPhone) {
    return (
      <div className="min-h-screen">
        <SEOHead title="Health News" description="Manage health news, updates, and announcements." />
        {controller.statsUnavailable && (
          <HealthNewsProjectionStatsNotice className="relative z-20 mx-4 mt-3" />
        )}
        <MobileHealthNews
          articles={controller.mobileNewsFeed}
          stats={controller.stats}
          filters={{ ...controller.filters, kpiFilter: controller.kpiFilter }}
          setFilters={controller.handleMobileFiltersChange}
          onView={controller.handleView}
          onRefresh={controller.fetchHealthNews}
          loading={controller.loading}
          isFetching={controller.isFetching}
          errorMessage={controller.healthNewsError}
          onRetry={controller.fetchHealthNews}
          onOpenFilters={controller.handleOpenFilters}
          onViewAnalytics={controller.handleOpenAnalytics}
          filterSheetOpen={controller.filterSheetOpen}
          analyticsOpen={controller.analyticsModalOpen}
          hasMore={controller.pagination.hasNextPage}
          onLoadMore={controller.pagination.nextPage}
        />
        <HealthNewsPageDialogs controller={controller} />
      </div>
    );
  }

  if (isTablet) {
    return (
      <div className="min-h-screen text-foreground">
        <SEOHead title="Health News" description="Manage health news, updates, and announcements." />
        <TabletHealthNews
          articles={controller.newsRows}
          stats={controller.stats}
          statsUnavailable={controller.statsUnavailable}
          loading={controller.loading}
          isFetching={controller.isFetching}
          errorMessage={controller.healthNewsError}
          filters={controller.filters}
          kpiFilter={controller.kpiFilter}
          setKpiFilter={controller.handleKpiFilterChange}
          focusedNews={controller.focusedNews}
          onFocus={controller.setFocused}
          onView={controller.handleView}
          onRefresh={controller.fetchHealthNews}
          onRetry={controller.fetchHealthNews}
          onSearchCommit={controller.setSearchFilter}
          onOpenFilters={controller.handleOpenFilters}
          onViewAnalytics={controller.handleOpenAnalytics}
          filterSheetOpen={controller.filterSheetOpen}
          pagination={controller.pagination}
          detail={(
            <HealthNewsDetailRail
              news={controller.focusedNews}
              loading={controller.loading}
              hasFilter={controller.hasFilter}
              onView={controller.handleView}
              activeActionFeedback={controller.activeActionFeedback}
              relatedEntries={controller.newsRows}
              embedded
            />
          )}
        />
        <HealthNewsPageDialogs controller={controller} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-foreground">
      <SEOHead title="Health News" description="Manage health news, updates, and announcements." />
      <HealthNewsDesktopWorkspace
        items={controller.newsRows}
        stats={controller.stats}
        statsUnavailable={controller.statsUnavailable}
        loading={controller.loading}
        isFetching={controller.isFetching}
        loadError={controller.loadError}
        focusedNews={controller.focusedNews}
        setFocused={controller.setFocused}
        filters={controller.filters}
        kpiFilter={controller.kpiFilter}
        setKpiFilter={controller.handleKpiFilterChange}
        setSearchFilter={controller.setSearchFilter}
        hasFilter={controller.hasFilter}
        filterSheetOpen={controller.filterSheetOpen}
        openFilters={controller.handleOpenFilters}
        onRetry={controller.fetchHealthNews}
        onClearFilters={controller.handleClearFilters}
        pagination={controller.pagination}
        sortConfig={controller.sortConfig}
        onSort={controller.handleSort}
        onView={controller.handleView}
        activeActionFeedback={controller.activeActionFeedback}
        moduleRailItems={controller.visibleModuleRail}
        routingPath={controller.routingPath}
        onRailNavigate={controller.handleRailNavigate}
      />
      <HealthNewsPageDialogs controller={controller} />
    </div>
  );
};
