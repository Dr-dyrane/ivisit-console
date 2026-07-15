import React, { useMemo } from 'react';
import { Newspaper } from 'lucide-react';
import { HealthNewsProjectionStatsNotice } from '../pages/health-news/HealthNewsProjectionStatsNotice';
import {
  buildVisibleHealthNewsStats,
  formatHealthNewsDate,
  getStateCount,
  getStatusMeta,
  hasAppliedFilters,
  NEWS_KPI_IMPORTANCE,
  NEWS_KPI_OPTIONS,
  PINNED_NEWS_KPI_IDS,
} from '../pages/health-news/healthNewsPageModel';
import { TabletCollectionPage } from './TabletCollectionPage';
import { TabletPaginationFooter } from './TabletCollectionControls';

export const TabletHealthNews = ({
  articles = [],
  stats,
  statsUnavailable = false,
  loading = false,
  isFetching = false,
  errorMessage,
  filters = {},
  kpiFilter = 'all',
  setKpiFilter,
  focusedNews,
  onFocus,
  onView,
  onRefresh,
  onRetry,
  onSearchCommit,
  onOpenFilters,
  onViewAnalytics,
  filterSheetOpen = false,
  pagination,
  detail,
}) => {
  const visibleStats = useMemo(() => (
    statsUnavailable
      ? buildVisibleHealthNewsStats(articles, stats?.reason)
      : stats
  ), [articles, stats, statsUnavailable]);

  const kpis = useMemo(() => NEWS_KPI_OPTIONS.map((option) => ({
    ...option,
    value: getStateCount({ id: option.id, stats: visibleStats, news: articles }),
  })), [articles, visibleStats]);

  const records = useMemo(() => articles.map((article) => {
    const status = getStatusMeta(article.published);
    const source = article.source_host || article.source || 'Unknown source';
    const category = article.category || 'General';

    return {
      id: article.id,
      source: article,
      title: article.title || 'Untitled article',
      subtitle: `${source} | ${category}`,
      meta: article.summary || article.excerpt || null,
      trailing: formatHealthNewsDate(article.created_at),
      statusLabel: status.label,
      statusClass: status.tone,
      icon: Newspaper,
      iconClass: status.tone,
    };
  }), [articles]);

  const totalCount = Number(pagination?.totalCount);

  return (
    <TabletCollectionPage
      detail={detail}
      records={records}
      kpis={kpis}
      activeKpi={kpiFilter}
      onKpiChange={setKpiFilter}
      kpiPinnedIds={PINNED_NEWS_KPI_IDS}
      kpiImportance={NEWS_KPI_IMPORTANCE}
      loading={loading}
      isFetching={isFetching}
      error={errorMessage}
      onRetry={onRetry}
      onRefresh={onRefresh}
      searchValue={filters.search || ''}
      onSearchCommit={onSearchCommit}
      searchPlaceholder="Search title, source, or category..."
      onOpenFilters={onOpenFilters}
      filtersActive={hasAppliedFilters(filters, kpiFilter)}
      filterSheetOpen={filterSheetOpen}
      onOpenAnalytics={onViewAnalytics}
      focusedId={focusedNews?.id}
      onFocus={onFocus}
      onOpen={onView}
      scrollResetKey={pagination?.currentPage}
      emptyTitle={hasAppliedFilters(filters, kpiFilter) ? 'No matching articles' : 'No published articles'}
      emptyBody={hasAppliedFilters(filters, kpiFilter)
        ? 'Change the current filters or search a different source.'
        : 'Published health news will appear here when available.'}
      countLabel={`${Number.isFinite(totalCount) ? totalCount : articles.length} articles`}
      toolbarSlot={statsUnavailable ? <HealthNewsProjectionStatsNotice /> : null}
      footer={pagination?.totalPages > 1
        ? <TabletPaginationFooter pagination={pagination} loading={loading || isFetching} />
        : null}
    />
  );
};

export default TabletHealthNews;
