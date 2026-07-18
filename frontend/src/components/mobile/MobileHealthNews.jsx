import React from 'react';
import { MobileHealthNewsAtlasLayer } from './health-news/MobileHealthNewsAtlasLayer';
import { MobileHealthNewsDetailSheet } from './health-news/MobileHealthNewsDetailSheet';
import { MobileHealthNewsList } from './health-news/MobileHealthNewsList';
import { useMobileHealthNewsController } from './health-news/useMobileHealthNewsController';
import { MobilePageShell } from './MobilePageShell';
import { PullToRefresh } from './PullToRefresh';

// Published-feed reader on the canonical mobile list grammar. It intentionally owns no
// selection or content mutation path; the page supplies server-scoped rows and counts.
// grammar:loadmore-append=route controller accumulates page windows and de-duplicates by id
export const MobileHealthNews = ({
  articles = [],
  stats,
  filters,
  setFilters,
  onView,
  onRefresh,
  loading = false,
  errorMessage = null,
  onRetry,
  onOpenFilters,
  onViewAnalytics,
  filterSheetOpen = false,
  analyticsOpen = false,
  hasMore = false,
  onLoadMore,
  isFetching = false,
}) => {
  const controller = useMobileHealthNewsController({
    articles,
    stats,
    filters,
    loading,
    isFetching,
    hasMore,
    onLoadMore,
  });

  return (
    <PullToRefresh onRefresh={onRefresh}>
      <MobilePageShell
        animatePageLoad={false}
        contentClassName="relative min-h-[calc(100dvh-3rem)] overflow-hidden px-0 pb-32 pt-8 text-foreground"
      >
        <MobileHealthNewsAtlasLayer />
        <MobileHealthNewsList
          activeKpi={controller.activeKpi}
          analyticsOpen={analyticsOpen}
          armed={controller.armed}
          articleGroups={controller.articleGroups}
          displayArticles={controller.displayArticles}
          errorMessage={errorMessage}
          filterSheetOpen={filterSheetOpen}
          filters={filters}
          hasFilter={controller.hasFilter}
          hasMore={hasMore}
          isBuffering={controller.isBuffering}
          loading={loading}
          newsKPIs={controller.newsKPIs}
          observerTarget={controller.observerTarget}
          onOpenFilters={onOpenFilters}
          onRetry={onRetry}
          onViewAnalytics={onViewAnalytics}
          refetching={controller.refetching}
          requestLoad={controller.requestLoad}
          scopeCount={controller.scopeCount}
          setActiveArticle={controller.setActiveArticle}
          setFilters={setFilters}
          showTopSectionLoading={controller.showTopSectionLoading}
        />
        <MobileHealthNewsDetailSheet
          article={controller.activeArticle}
          onClose={() => controller.setActiveArticle(null)}
          onView={onView}
          relatedEntries={articles}
        />
      </MobilePageShell>
    </PullToRefresh>
  );
};
