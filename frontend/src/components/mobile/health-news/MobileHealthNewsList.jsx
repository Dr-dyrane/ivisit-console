import React from 'react';
import { FileCheck, Newspaper } from 'lucide-react';
import { resolveVital } from '../../../constants/vitalTracks';
import { formatRelativeTime } from '../../../utils/activityUtils';
import {
  GroupPanel,
  Hairline,
  MobileHeading,
  MobileListRow,
  SearchRow,
  SkeletonGroupPanel,
  UpdatingPillRow,
} from '../canon';
import {
  MobileListEmpty,
  MobileListEnd,
  MobileListLoadMore,
  MobileListLoadingMore,
} from '../MobileListStates';
import { MobileKPIStrip } from '../MobileKPIStrip';
import {
  categoryLabel,
  healthNewsOrbClass,
  isArticlePublished,
} from './mobileHealthNewsModel';

const MobileHealthNewsRow = ({ article, onOpen }) => {
  const published = isArticlePublished(article);
  const category = article.category || 'general';
  const vital = resolveVital('healthNews', published ? 'published' : 'draft');

  return (
    <MobileListRow
      item={article}
      dataAttr="data-mobile-health-news-row"
      onOpen={onOpen}
      ariaLabel={`${article.title || 'Untitled article'}, ${categoryLabel(category)}`}
      orbClass={healthNewsOrbClass(published)}
      icon={published ? FileCheck : Newspaper}
      title={article.title || 'Untitled article'}
      meta={`${categoryLabel(category)} \u00b7 ${article.source || 'Unknown source'}`}
      time={formatRelativeTime(article.created_at)}
      pill={vital?.pill}
    />
  );
};

export const MobileHealthNewsList = ({
  activeKpi,
  analyticsOpen,
  armed,
  articleGroups,
  displayArticles,
  errorMessage,
  filterSheetOpen,
  filters,
  hasFilter,
  hasMore,
  isBuffering,
  loading,
  newsKPIs,
  observerTarget,
  onOpenFilters,
  onRetry,
  onViewAnalytics,
  refetching,
  requestLoad,
  scopeCount,
  setActiveArticle,
  setFilters,
  showTopSectionLoading,
}) => (
  <div className="relative z-10 space-y-3">
    <MobileHeading
      title="Health News"
      noun="article"
      count={scopeCount}
      showSkeleton={showTopSectionLoading}
      failedEmpty={Boolean(errorMessage) && displayArticles.length === 0}
    />

    <MobileKPIStrip
      loading={showTopSectionLoading}
      kpis={newsKPIs}
      activeKpi={activeKpi}
      onKpiClick={(id) => setFilters((previous) => ({ ...previous, kpiFilter: id }))}
    />

    <section className="px-4">
      <SearchRow
        placeholder="Search articles..."
        search={filters?.search || ''}
        onSearchCommit={(value) => setFilters((previous) => ({ ...previous, search: value }))}
        searchTestId="mobile-health-news-search"
        entityLabel="articles"
        onOpenFilters={onOpenFilters}
        filterSheetOpen={filterSheetOpen}
        hasFilter={hasFilter}
        onOpenStats={onViewAnalytics}
        statsOpen={analyticsOpen}
        statsLabel="Open analytics"
      />

      <UpdatingPillRow show={(refetching || isBuffering) && !showTopSectionLoading} />

      <div className="mt-3 space-y-2" data-testid="mobile-health-news-activity-sheet">
        {errorMessage && displayArticles.length > 0 && (
          <div
            className="rounded-card bg-destructive/10 p-4 text-destructive"
            data-testid="mobile-health-news-degraded-state"
          >
            <p className="text-sm font-semibold">Health news did not refresh</p>
            <p className="mt-1 text-xs text-destructive/75">Showing the last loaded article rows.</p>
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
            {articleGroups.map((group) => (
              <GroupPanel key={group.key} label={group.label} count={group.items.length}>
                {group.items.map((article, index) => (
                  <React.Fragment key={article.id}>
                    <MobileHealthNewsRow article={article} onOpen={setActiveArticle} />
                    {index < group.items.length - 1 && <Hairline />}
                  </React.Fragment>
                ))}
              </GroupPanel>
            ))}
          </div>
        )}

        <div ref={observerTarget} className="min-h-[64px] flex flex-col items-center justify-center gap-2">
          {refetching && !showTopSectionLoading && hasMore && displayArticles.length > 0 && (
            <MobileListLoadingMore />
          )}
          {!loading && !refetching && hasMore && (
            <MobileListLoadMore armed={armed} onRequest={requestLoad} labelTone="plain" />
          )}
          {!loading && !hasMore && displayArticles.length > 0 && (
            <MobileListEnd label="End of article list" />
          )}
        </div>

        {errorMessage && displayArticles.length === 0 && !loading && !showTopSectionLoading && (
          <div data-testid="mobile-health-news-error-state">
            <MobileListEmpty
              icon={Newspaper}
              label="Health news could not load"
              reason="empty"
              hint="Try again before treating the published feed as clear."
              onRecover={onRetry}
              recoverLabel="Try again"
              labelTone="plain"
            />
          </div>
        )}

        {!errorMessage && displayArticles.length === 0 && !loading && !showTopSectionLoading && (
          <MobileListEmpty
            icon={Newspaper}
            label="No articles found"
            reason={filters?.search ? 'search' : hasFilter ? 'filtered' : 'empty'}
            hint={filters?.search
              ? `No articles match "${filters.search}".`
              : hasFilter
                ? 'Try clearing filters to see the full feed.'
                : 'Published health news will appear here when available.'}
            onRecover={(filters?.search || hasFilter)
              ? () => setFilters((previous) => ({ ...previous, search: '', kpiFilter: 'all' }))
              : undefined}
            recoverLabel={filters?.search ? 'Clear Search' : hasFilter ? 'Reset Filters' : undefined}
            labelTone="plain"
          />
        )}
      </div>
    </section>
  </div>
);
