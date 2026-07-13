import React, { useMemo, useEffect, useRef, useState } from 'react';
import { Newspaper, FileCheck, Eye, Tag, Globe, Clock, Link } from 'lucide-react';
// LIST-type page, FEED expression (MOBILE_DESIGN_SYSTEM section 5) - rebuilt to canon
// 2026-07-10, MIRRORING MobileUsers: the 5-stage state machine (warm-up -> group-shaped
// skeleton -> useStableList buffer -> isFetching Updating pill -> terminal empty/error),
// the canon SearchRow, adaptive GroupPanel, MobileHeading scope count, MobileKPIStrip and
// MobileDetailSheet. Off the old dashboard billboard + glance-tile summary rail (the list
// grammar FATALLY bans both) onto the grouped panel.
//
// COMMAND AUTHORITY (fail-closed by design, INSURANCE-class read-only): /health-news is a
// curated PUBLISHED feed. canManageContent is hard-false on the desktop page, so there is
// no create, no edit, no publish toggle, and no delete receiver ("no parallel truth").
// This surface is VIEW-ONLY: the detail sheet's single CTA is Details (onView -> read-only
// HealthNewsModal). No selection, no destructive control, no secondary edit action.
//
// KEY DATA FACTS the rebuild honours: (a) published/draft is a DEAD axis - the feed is
// HARD-scoped .eq('published', true) so every row is published and the 'draft' stat is
// always 0; published is a row PILL / detail vital, NEVER a group. (b) CATEGORY is the one
// live categorical facet -> the primary adaptive group. (c) recency (created_at -- the
// only real freshness column; health_news has no published_at) is the guaranteed coarse fallback when a tenant's categories don't
// distribute. (d) no React Query isFetching exists - the page synthesises it (loading over
// a non-empty feed) for the section 5.5 Updating pill.
//
// grammar:loadmore-append=page owns mobileNewsFeed accumulation - the page query is
// WINDOWED (offset = paginationRange.start) but the PAGE accumulates the windows into
// mobileNewsFeed (page1 replace, else append + dedupe by id) and passes that here, so the
// component renders `articles` directly (stabilised by useStableList). No client
// accumulator - the append is page-owned.
import { SearchRow, useSkeletonWarmup, UpdatingPillRow, MobileHeading, GroupPanel, MobileListRow, Hairline, SkeletonGroupPanel } from './canon';
import { MobileKPIStrip } from './MobileKPIStrip';
import { MobileDetailSheet } from './MobileDetailSheet';
import { PullToRefresh } from './PullToRefresh';
import { MobilePageShell } from './MobilePageShell';
import { MobileListEnd, MobileListEmpty, MobileListLoadMore, MobileListLoadingMore } from './MobileListStates';
import { useStableList } from './useStableList';
import { useLoadMoreControl } from './useLoadMoreControl';
import { resolveVital } from '../../constants/vitalTracks';
import { formatRelativeTime } from '../../utils/activityUtils';
import { resolveAdaptiveGroups } from '../../utils/adaptiveGrouping';

const metricValue = (value, fallback = 0) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

// Health news has no modelled lifecycle: status is a single boolean. Derive the
// draft->published track key from whichever shape the record carries.
const isArticlePublished = (article) => {
  if (typeof article?.published === 'boolean') return article.published;
  if (typeof article?.is_published === 'boolean') return article.is_published;
  const status = String(article?.status || '').toLowerCase();
  if (status) return status === 'published';
  return false;
};

const categoryLabel = (value) => {
  const text = String(value || 'general').replace(/[_-]+/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const dateLabel = (value) => {
  if (!value) return 'Unknown date';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Unknown date';
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// Status-tinted orb (literal hues - the semantic tokens collapse to brand red). The feed
// is 100% published so this reads emerald in practice; draft (cyan) stays honest per-record
// in case an unpublished row ever reaches the client. Mirrors the healthNews vital tones.
const orbClassFor = (published) => (
  published
    ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300'
    : 'bg-cyan-500/12 text-cyan-700 dark:text-cyan-300'
);

// Atlas stage (donor recipe: MobileUsersAtlasLayer / MobileDoctorsAtlasLayer; ambient brand
// tint is sanctioned expression, Lesson 18).
const MobileHealthNewsAtlasLayer = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden bg-background">
    <div
      className="absolute inset-0 opacity-[0.28] dark:opacity-[0.22]"
      style={{
        backgroundImage:
          'linear-gradient(118deg, transparent 0 46%, hsl(var(--foreground) / 0.055) 46% 49%, transparent 49%), linear-gradient(32deg, transparent 0 42%, hsl(var(--foreground) / 0.045) 42% 45%, transparent 45%), linear-gradient(154deg, transparent 0 64%, hsl(var(--primary) / 0.07) 64% 67%, transparent 67%)',
        backgroundSize: '250px 178px, 330px 236px, 410px 276px',
        backgroundPosition: '18px 10px, -72px 48px, 16% 38%',
      }}
    />
    <div
      className="absolute inset-0"
      style={{
        background:
          'radial-gradient(circle at 20% 32%, hsl(var(--primary) / 0.10), transparent 28%), radial-gradient(circle at 82% 62%, hsl(var(--foreground) / 0.055), transparent 26%), linear-gradient(180deg, hsl(var(--background) / 0.18), hsl(var(--background)) 92%)',
      }}
    />
  </div>
);

// Filter-trigger truth: any committed narrowing counts, so the trigger's filtered state
// never lies. The KPI chips are a separate axis (category/recency facet), not this signal.
const hasActiveNewsFilters = (filters = {}) => Boolean(
  filters?.search ||
  (filters?.kpiFilter && filters.kpiFilter !== 'all') ||
  filters?.category ||
  filters?.source ||
  filters?.published !== undefined ||
  filters?.created_at
);

/**
 * MobileHealthNews - the published-feed reader on the canon LIST grammar. Server-owned
 * search/KPI (the page refetches + accumulates); this component renders. Read-only: the
 * detail sheet's single CTA is Details, and there is no create / edit / publish / delete.
 */
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
  isFetching = false
}) => {
  const observerTarget = useRef(null);
  const [activeArticle, setActiveArticle] = useState(null);
  // Background-refetch signal (KPI switch / search / pull-refresh keep loading=false at the
  // query layer; the page synthesises isFetching = loading over a non-empty feed).
  const refetching = isFetching || false;

  // The dock FAB opens the page-owned statistics view. Authoring remains absent because this is a
  // read-only published-feed projection with no approved Console writer receiver.

  const { armed, requestLoad, triggerLoad } = useLoadMoreControl({ hasMore, loading, onLoadMore });

  useEffect(() => {
    if (!hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) triggerLoad();
      },
      { threshold: 0.1, rootMargin: '120px' }
    );
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [hasMore, triggerLoad]);

  // The PAGE accumulates the windowed pages into mobileNewsFeed and passes them as
  // `articles`, so render directly (no client accumulator - see the loadmore-append waiver
  // at the top of the file). useStableList holds the last settled set so a refetch never
  // flashes the list to empty.
  const sourceArticles = useMemo(() => (Array.isArray(articles) ? articles : []), [articles]);
  const { displayItems: displayArticles, isBuffering } = useStableList(sourceArticles, loading);
  const warmingUp = useSkeletonWarmup();
  const showTopSectionLoading = warmingUp || (loading && displayArticles.length === 0);

  // MEASURED, server-scoped counts (getHealthNewsPageStats returns EXACT counts). These
  // mirror the desktop newsStateOptions ids - the only server-wired KPI chips. Two are
  // honestly degenerate on the real data shape: 'published' === 'total' (the feed is 100%
  // published) and 'draft' is ALWAYS 0 (kept as an honest Locked/0 chip mirroring desktop's
  // fail-closed draft). The semantic tokens collapse to crimson (red-token trap); status
  // hues use the raw vitalTracks accents instead.
  const newsKPIs = [
    { id: 'all', label: 'Articles', value: metricValue(stats?.total, sourceArticles.length), color: 'hsl(var(--muted-foreground))', delta: 'Current', direction: 'flat' },
    { id: 'published', label: 'Published', value: metricValue(stats?.published, 0), color: 'hsl(162 94% 24%)', delta: 'Current', direction: 'flat' },
    { id: 'medical', label: 'Medical', value: metricValue(stats?.medical, 0), color: 'hsl(192 91% 36%)', delta: 'Current', direction: 'flat' },
    { id: 'recent', label: 'Recent', value: metricValue(stats?.recent, 0), color: 'hsl(200 98% 39%)', delta: 'Current', direction: 'flat' },
    { id: 'draft', label: 'Drafts', value: metricValue(stats?.draft, 0), color: 'hsl(26 90% 37%)', delta: 'Locked', direction: 'flat' },
  ];

  // Count integrity (section 5): the heading tracks the ACTIVE KPI scope, never the raw
  // total. Mirrors MobileUsers scopeCount. 'draft' resolves to the honest 0.
  const kpiToKey = { all: 'total', published: 'published', medical: 'medical', recent: 'recent', draft: 'draft' };
  const activeKpi = filters?.kpiFilter || 'all';
  const scopeCount = activeKpi === 'all'
    ? metricValue(stats?.total, sourceArticles.length)
    : metricValue(stats?.[kpiToKey[activeKpi]], 0);

  const hasFilter = hasActiveNewsFilters(filters);

  // Adaptive, DATA-DRIVEN grouping: CATEGORY is the one live categorical facet (desktop
  // CATEGORIES = general/medical/research/wellness/emergency/policy - within the 2-8 healthy
  // band). RISK: normalizeHealthNewsRow defaults missing category to 'general', and a seed
  // feed can skew >85% to one bucket -> the scorer rejects it and falls to coarse-recency
  // (created_at -- health_news has no published_at column), which always distributes. Decided per-render from the
  // actual rows, so the page adapts to whatever the tenant's category distribution is. This
  // REPLACES the old groupByMonth date-grouping. published/draft is a DEAD grouping axis
  // (100% published) - it is the row pill / detail vital, never a group.
  const { groups: articleGroups } = useMemo(() => resolveAdaptiveGroups(displayArticles, [
    { key: 'category', assign: (a) => a.category || 'general', labelFor: (k) => categoryLabel(k), orphanLabel: 'General' },
    { type: 'coarse-recency', key: 'published', getDate: (a) => a.created_at },
  ]), [displayArticles]);

  const renderArticleRow = (article) => {
    const published = isArticlePublished(article);
    const category = article.category || 'general';
    const vital = resolveVital('healthNews', published ? 'published' : 'draft');
    return (
      <MobileListRow
        item={article}
        dataAttr="data-mobile-health-news-row"
        onOpen={setActiveArticle}
        ariaLabel={`${article.title || 'Untitled article'}, ${categoryLabel(category)}`}
        orbClass={orbClassFor(published)}
        icon={published ? FileCheck : Newspaper}
        title={article.title || 'Untitled article'}
        meta={`${categoryLabel(category)} · ${article.source || 'Unknown source'}`}
        time={formatRelativeTime(article.created_at)}
        pill={vital?.pill}
      />
    );
  };

  return (
    <PullToRefresh onRefresh={onRefresh}>
      <MobilePageShell
        animatePageLoad={false}
        contentClassName="relative min-h-[calc(100dvh-3rem)] overflow-hidden px-0 pb-32 pt-8 text-foreground"
      >
        <MobileHealthNewsAtlasLayer />
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
            onKpiClick={(id) => setFilters(prev => ({ ...prev, kpiFilter: id }))}
          />

          <section className="px-4">
            <SearchRow
              placeholder="Search articles..."
              search={filters?.search || ''}
              onSearchCommit={(value) => setFilters(prev => ({ ...prev, search: value }))}
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

              {/* Group-shaped skeleton (section 5.2): mirrors the panel 1:1 for replace-in-place. */}
              {showTopSectionLoading ? (
                <SkeletonGroupPanel rows={6} />
              ) : (
                <div className="space-y-[18px]">
                  {articleGroups.map((group) => (
                    <GroupPanel key={group.key} label={group.label} count={group.items.length}>
                      {group.items.map((article, index) => (
                        <React.Fragment key={article.id}>
                          {renderArticleRow(article)}
                          {index < group.items.length - 1 && <Hairline />}
                        </React.Fragment>
                      ))}
                    </GroupPanel>
                  ))}
                </div>
              )}

              <div ref={observerTarget} className="min-h-[64px] flex flex-col items-center justify-center gap-2">
                {refetching && !showTopSectionLoading && hasMore && displayArticles.length > 0 && <MobileListLoadingMore />}
                {!loading && !refetching && hasMore && <MobileListLoadMore armed={armed} onRequest={requestLoad} labelTone="plain" />}
                {!loading && !hasMore && displayArticles.length > 0 && <MobileListEnd label="End of article list" />}
              </div>

              {/* Terminal error (no rows to show): honest error-vs-empty split with retry. */}
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

              {/* Terminal empty (no error): filtered / search / empty. */}
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
                    ? () => setFilters(prev => ({ ...prev, search: '', kpiFilter: 'all' }))
                    : undefined}
                  recoverLabel={filters?.search ? 'Clear Search' : hasFilter ? 'Reset Filters' : undefined}
                  labelTone="plain"
                />
              )}
            </div>
          </section>
        </div>

        {/* Tap-opened record detail bottom sheet. Read-only: the ONLY CTA is Details (onView
            -> read-only HealthNewsModal). No secondary edit action, no publish toggle, no
            destructive control - authoring is fail-closed until the writer receiver is proved. */}
        {activeArticle && (() => {
          const published = isArticlePublished(activeArticle);
          const derivedStatus = published ? 'published' : 'draft';
          const vital = resolveVital('healthNews', derivedStatus);
          const linkValue = activeArticle.source_url_valid
            ? (activeArticle.source_host || activeArticle.source || 'Valid link')
            : (activeArticle.raw_url || activeArticle.url ? 'Unverified link' : null);

          return (
            <MobileDetailSheet
              isOpen={!!activeArticle}
              onClose={() => setActiveArticle(null)}
              icon={published ? FileCheck : Newspaper}
              iconTone={vital?.tone}
              eyebrow="Health article"
              title={activeArticle.title || 'Untitled article'}
              statusPill={resolveVital('healthNews', derivedStatus).pill}
              vital={vital ? { ...vital, label: 'Article status' } : null}
              islands={[
                { icon: Globe, label: 'Source', value: activeArticle.source || 'Unknown source' },
                { icon: Tag, label: 'Category', value: categoryLabel(activeArticle.category) },
                { icon: Clock, label: 'Published', value: dateLabel(activeArticle.created_at) },
                linkValue ? { icon: Link, label: 'Link', value: linkValue } : null,
              ]}
              primary={{ label: 'Details', icon: Eye, onClick: () => { setActiveArticle(null); onView?.(activeArticle); } }}
            />
          );
        })()}
      </MobilePageShell>
    </PullToRefresh>
  );
};
