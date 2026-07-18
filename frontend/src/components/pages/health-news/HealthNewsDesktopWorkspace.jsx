import React, { useRef } from 'react';
import { Eye, Newspaper } from 'lucide-react';
import {
  useListKeyboardNav,
  useScrollResetOnPage,
} from '../../../hooks/useListKeyboardNav';
import {
  ActivitySheet,
  ListRowShell,
  SheetToolbar,
  SortableColumnHeader,
} from '../../console/ActivitySheet';
import { KpiStrip } from '../../console/KpiStrip';
import {
  EmptyState,
  LoadErrorState,
  SkeletonRows,
  StatusPill,
} from '../../console/primitives';
import { SignalPanel } from '../../console/SignalPanel';
import { WorkspaceStage } from '../../console/WorkspaceStage';
import { Button } from '../../ui/button';
import { HealthNewsDetailRail } from './HealthNewsDetailRail';
import { HealthNewsProjectionStatsNotice } from './HealthNewsProjectionStatsNotice';
import {
  formatHealthNewsDate,
  getNewsSignal,
  getStateCount,
  getStatusMeta,
  NEWS_GRID_COLS,
  NEWS_KPI_IMPORTANCE,
  NEWS_KPI_OPTIONS,
  newsToneClass,
  PINNED_NEWS_KPI_IDS,
} from './healthNewsPageModel';

export const HealthNewsDesktopWorkspace = ({
  items,
  stats,
  statsUnavailable,
  loading,
  isFetching,
  loadError,
  focusedNews,
  setFocused,
  filters,
  kpiFilter,
  setKpiFilter,
  setSearchFilter,
  hasFilter,
  filterSheetOpen,
  openFilters,
  onRetry,
  onClearFilters,
  pagination,
  sortConfig,
  onSort,
  onView,
  activeActionFeedback,
  moduleRailItems,
  routingPath,
  onRailNavigate,
}) => {
  const listScrollRef = useRef(null);
  const failedEmpty = Boolean(loadError) && items.length === 0;
  const hasAny = items.length > 0;
  const signal = getNewsSignal({ stats, news: items, kpiFilter, loadError, hasAny });

  useScrollResetOnPage(listScrollRef, pagination.currentPage);
  const handleListKeyDown = useListKeyboardNav({
    items,
    focusedItem: focusedNews,
    setFocusedId: setFocused,
    onOpen: onView,
    scrollRef: listScrollRef,
    rowAttr: 'data-health-news-row',
  });

  return (
    <WorkspaceStage
      moduleRailItems={moduleRailItems}
      activePath="/health-news"
      routingPath={routingPath}
      onRailNavigate={onRailNavigate}
      rail={(
        <HealthNewsDetailRail
          news={focusedNews}
          loading={loading}
          hasFilter={hasFilter}
          onView={onView}
          activeActionFeedback={activeActionFeedback}
          relatedEntries={items}
        />
      )}
    >
      <SignalPanel signal={signal} loading={loading} toneClassMap={newsToneClass}>
        <KpiStrip
          options={NEWS_KPI_OPTIONS}
          getCount={(id) => getStateCount({ id, stats, news: items })}
          kpiFilter={kpiFilter}
          setKpiFilter={setKpiFilter}
          loading={loading}
          isFetching={isFetching}
          pinnedIds={PINNED_NEWS_KPI_IDS}
          importance={NEWS_KPI_IMPORTANCE}
          defaultId="all"
          dataAttr="data-health-news-state"
        />
        {statsUnavailable && <HealthNewsProjectionStatsNotice className="mt-3" />}
      </SignalPanel>

      <ActivitySheet
        loading={loading}
        isFetching={isFetching}
        failedEmpty={failedEmpty}
        pagination={pagination}
        itemNoun="articles"
        toolbar={(
          <SheetToolbar
            searchValue={filters.search}
            onSearchCommit={setSearchFilter}
            searchPlaceholder="Search health news by title, source, or category..."
            searchTestId="health-news-sheet-search"
            onRefresh={onRetry}
            refreshing={isFetching}
            refreshNoun="health news"
            onOpenFilters={openFilters}
            filterSheetOpen={filterSheetOpen}
            filtersActive={hasFilter}
          />
        )}
      >
        <div
          ref={listScrollRef}
          role="region"
          tabIndex={0}
          onKeyDown={handleListKeyDown}
          aria-label="Health news list"
          style={{ outline: 'none' }}
          className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-card bg-background/30 p-3 no-scrollbar dark:bg-black/[0.08]"
          data-testid="health-news-list"
        >
          <HealthNewsListHeader sortConfig={sortConfig} onSort={onSort} />

          {loading && <SkeletonRows />}

          {!loading && loadError && items.length === 0 && (
            <LoadErrorState title="Health news did not load" message={loadError} onRetry={onRetry} />
          )}

          {!loading && !loadError && Number(pagination.totalCount) === 0 && (
            <EmptyState
              icon={Newspaper}
              heading={hasFilter ? 'No matching articles' : 'No published articles'}
              body={hasFilter ? 'Clear filters or search a different source.' : 'Published health news will appear here when available.'}
            >
              {hasFilter && (
                <Button
                  variant="ghost"
                  onClick={onClearFilters}
                  className="rounded-pill bg-muted/30 px-5 font-semibold transition-all hover:bg-foreground/10 hover:text-foreground active:scale-95"
                >
                  Show all articles
                </Button>
              )}
            </EmptyState>
          )}

          {!loading && items.length > 0 && items.map((news) => (
            <HealthNewsRow
              key={news.id}
              news={news}
              selected={focusedNews?.id === news.id}
              onFocus={() => setFocused(news.id)}
              onView={onView}
              activeActionFeedback={activeActionFeedback}
            />
          ))}
        </div>
      </ActivitySheet>
    </WorkspaceStage>
  );
};

export const HealthNewsListHeader = ({ sortConfig, onSort }) => (
  <div className={`grid ${NEWS_GRID_COLS} items-center gap-2 px-4 pb-3 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground`}>
    <span>Title</span>
    <span>Source</span>
    <span>Category</span>
    <span>Status</span>
    <SortableColumnHeader label="Published" sortKey="created_at" sortConfig={sortConfig} onSort={onSort} />
    <span className="justify-self-end text-right">Action</span>
  </div>
);

export const HealthNewsRow = ({
  news,
  selected,
  onFocus,
  onView,
  activeActionFeedback,
}) => {
  const statusMeta = getStatusMeta(news.published);
  const title = news.title || 'Untitled article';

  return (
    <ListRowShell
      id={news.id}
      dataAttrName="data-health-news-row"
      gridCols={NEWS_GRID_COLS}
      selected={selected}
      onFocus={onFocus}
      onOpen={() => onView(news)}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-icon ${statusMeta.tone}`}>
          <Newspaper className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <div className="truncate text-[15px] font-semibold text-foreground" title={title}>{title}</div>
          <div className="mt-1 truncate text-xs text-muted-foreground" title={news.source || undefined}>{news.source || 'Unknown source'}</div>
        </div>
      </div>

      <div className="min-w-0 truncate text-sm font-medium text-muted-foreground" title={news.source || undefined}>{news.source || 'Unknown source'}</div>
      <div className="min-w-0 truncate text-sm font-medium capitalize text-muted-foreground">{news.category || 'General'}</div>
      <div className="min-w-0">
        <StatusPill label={statusMeta.label} className={statusMeta.tone} compact />
      </div>
      <div className="text-sm font-medium text-muted-foreground">{formatHealthNewsDate(news.created_at)}</div>
      <div className="flex items-center justify-end">
        <Button
          variant="ghost"
          size="icon"
          onClick={(event) => {
            event.stopPropagation();
            onView(news);
          }}
          data-state={activeActionFeedback === `view-${news.id}` ? 'opening' : 'idle'}
          className="h-8 w-8 rounded-pill bg-background/45 text-muted-foreground transition-all hover:bg-foreground hover:text-background active:scale-95"
          aria-label={`View ${title}`}
        >
          <Eye className="h-4 w-4" />
        </Button>
      </div>
    </ListRowShell>
  );
};
