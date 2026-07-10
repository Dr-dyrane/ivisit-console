import React, { useMemo, useState, useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Newspaper, Eye, FileCheck, Tag, BookOpen, Globe, Clock, Link } from 'lucide-react';
// Canon kit migration (Wave 2, 2026-07-09): SearchRow bakes in the 300ms debounce
// this page lacked + clear-x + haptic triggers; useSkeletonWarmup covers cached
// mounts; UpdatingPillRow is the background-refetch signal.
import { SearchRow, useSkeletonWarmup, UpdatingPillRow } from './canon';
import { Button } from '../ui/button';
import { MobileKPIStrip } from './MobileKPIStrip';
import { MobileSectionHeader, MobileMetricRow } from './MobileMetricList';
import { MobileFeaturedMetric } from './MobileFeaturedMetric';
import { MobileSecondaryMetricRail } from './MobileSecondaryMetricCard';
import { MobileDetailSheet } from './MobileDetailSheet';
import { PullToRefresh } from './PullToRefresh';
import { MobilePageShell } from './MobilePageShell';
import { MobileListEnd, MobileListEmpty, MobileListSkeletonRows, MobileListLoadMore } from './MobileListStates';
import { useStableList } from './useStableList';
import { useLoadMoreControl } from './useLoadMoreControl';
import { resolveVital } from '../../constants/vitalTracks';
import { groupByMonth } from '../../utils/groupByMonth';

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
  hasMore = false,
  onLoadMore
}) => {
  const [activeArticle, setActiveArticle] = useState(null);
  const observerTarget = useRef(null);

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

  const kpis = useMemo(() => {
    const total = stats?.total || articles.length;
    const published = stats?.published || 0;
    const draft = stats?.draft || Math.max(total - published, 0);
    const medical = stats?.medical || articles.filter(a => String(a.category || '').toLowerCase() === 'medical').length;
    const recentCutoff = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const recent = stats?.recent || articles.filter(a => new Date(a.created_at || 0).getTime() >= recentCutoff).length;
    // Semantic tokens (--success/--warning/--info/--secondary) collapse to crimson in
    // this theme (red-token trap); status hues use the raw vitalTracks accents instead.
    return [
      { id: 'all', label: 'Articles', value: total, color: 'hsl(var(--muted-foreground))', delta: 'Current', direction: 'flat' },
      { id: 'published', label: 'Published', value: published, color: 'hsl(162 94% 24%)', delta: 'Current', direction: 'flat' },
      { id: 'draft', label: 'Drafts', value: draft, color: 'hsl(26 90% 37%)', delta: 'Locked', direction: 'flat' },
      { id: 'medical', label: 'Medical', value: medical, color: 'hsl(192 91% 36%)', delta: 'Current', direction: 'flat' },
      { id: 'recent', label: 'Recent', value: recent, color: 'hsl(200 98% 39%)', delta: 'Current', direction: 'flat' }
    ];
  }, [articles, stats]);

  const sourceArticles = useMemo(() => (Array.isArray(articles) ? articles : []), [articles]);
  const { displayItems: displayArticles, isBuffering } = useStableList(sourceArticles, loading);
  const warmingUp = useSkeletonWarmup();
  const showTopSectionLoading = warmingUp || (loading && displayArticles.length === 0);

  // Date-grouped feed (rollout S5): newest-first by published/created date. Grouping is
  // render-only; the month header carries a tabular count (group-header canon, DS v1.2 §3).
  const groupedArticles = useMemo(
    () => groupByMonth(displayArticles, (article) => article.published_at || article.created_at),
    [displayArticles]
  );
  const monthCounts = useMemo(() => {
    const counts = {};
    let current = null;
    groupedArticles.forEach(({ header }) => {
      if (header) current = header;
      if (current) counts[current] = (counts[current] || 0) + 1;
    });
    return counts;
  }, [groupedArticles]);

  return (
    <PullToRefresh onRefresh={onRefresh}>
      <MobilePageShell
        kpiStrip={(
          <MobileKPIStrip
            loading={showTopSectionLoading}
            kpis={kpis}
            activeKpi={filters?.kpiFilter || 'all'}
            onKpiClick={(id) => setFilters(prev => ({ ...prev, kpiFilter: id }))}
          />
        )}
        contentClassName="pt-4 pb-4 text-foreground"
      >
        <MobileFeaturedMetric
          loading={showTopSectionLoading}
          items={[
            {
              label: 'Recent',
              value: stats?.recent || 0,
              trend: 'Current',
              icon: Newspaper,
              color: 'hsl(200 98% 39%)'
            },
            {
              label: 'Readable',
              value: stats?.published || 0,
              trend: 'Current',
              icon: FileCheck,
              color: 'hsl(162 94% 24%)'
            },
            {
              label: 'Medical',
              value: stats?.medical || 0,
              trend: 'Current',
              icon: Tag,
              color: 'hsl(192 91% 36%)'
            },
            {
              label: 'Feed',
              value: stats?.total || articles.length,
              trend: 'Current',
              icon: BookOpen,
              color: 'hsl(var(--muted-foreground))'
            }
          ]}
        />

        <section className="mb-3">
          <MobileSectionHeader
            label="Feed Summary"
            count={stats?.total || articles.length}
            color="hsl(var(--muted-foreground))"
            labelTone="plain"
          />
          <MobileSecondaryMetricRail
            loading={showTopSectionLoading}
            items={[
              {
                icon: FileCheck,
                title: 'Readable',
                subtitle: 'Ready to open',
                value: stats?.published || 0,
                color: 'hsl(162 94% 24%)',
                trendDirection: 'flat',
                trendText: 'Current'
              },
              {
                icon: Tag,
                title: 'Medical',
                subtitle: 'Category',
                value: stats?.medical || 0,
                color: 'hsl(192 91% 36%)',
                trendDirection: 'flat',
                trendText: 'Current'
              },
              {
                icon: BookOpen,
                title: 'Feed',
                subtitle: 'Visible now',
                value: stats?.total || articles.length,
                color: 'hsl(var(--muted-foreground))',
                trendDirection: 'flat',
                trendText: 'Current'
              },
              {
                icon: Newspaper,
                title: 'Drafts',
                subtitle: 'Authoring locked',
                value: stats?.draft || 0,
                color: 'hsl(26 90% 37%)',
                trendDirection: 'flat',
                trendText: 'Locked'
              }
            ]}
          />
        </section>

        <div className="mb-3 px-1">
          <SearchRow
            placeholder="Search articles..."
            search={filters?.search || ''}
            onSearchCommit={(value) => setFilters(prev => ({ ...prev, search: value }))}
            searchTestId="mobile-health-news-search"
            entityLabel="articles"
            onOpenFilters={onOpenFilters}
            onOpenStats={onViewAnalytics}
            statsLabel="Open analytics"
          />
        </div>

        <MobileSectionHeader
          label="Article List"
          count={displayArticles.length}
          color="hsl(var(--muted-foreground))"
          labelTone="plain"
        />

        <div className="space-y-1" data-testid="mobile-health-news-activity-sheet">
          <AnimatePresence mode="popLayout">
            {/* Date-grouped feed (rollout S5): newest-first by published/created date,
                a sentence-case bold month header + tabular count at each boundary
                (group-header canon, DS v1.2 §3 — the eyebrow is detail furniture only). */}
            {groupedArticles.map(({ item: article, header }) => {
              const published = isArticlePublished(article);
              const vital = resolveVital('healthNews', published ? 'published' : 'draft');

              return (
                <React.Fragment key={article.id}>
                  {header && (
                    <div className="flex items-center justify-between px-2 pb-1 pt-3">
                      <span className="text-[13px] font-bold leading-[17px] text-muted-foreground">{header}</span>
                      <span className="text-[13px] font-bold text-muted-foreground/60 tabular-nums">{monthCounts[header]}</span>
                    </div>
                  )}
                  {/* Tap opens the canonical detail bottom sheet (MobileDetailSheet) — the
                      approved mobile design + desktop detail-rail behaviour — not an inline
                      dropdown. */}
                  <MobileMetricRow
                    icon={published ? FileCheck : Newspaper}
                    color={vital?.accent || 'hsl(var(--muted-foreground))'}
                    label="Health article"
                    value={article.title || 'Untitled article'}
                    secondary={`${categoryLabel(article.category)} · ${article.source || 'Unknown source'}`}
                    statusPill={vital?.pill}
                    onClick={() => setActiveArticle(article)}
                  />
                </React.Fragment>
              );
            })}
          </AnimatePresence>

          {errorMessage && !loading && displayArticles.length === 0 && (
            <div className="py-8 text-center" data-testid="mobile-health-news-error-state">
              <MobileListEmpty icon={Newspaper} label="Health news could not load" labelTone="plain" />
              {onRetry && (
                <Button variant="ghost" className="mt-3 h-11 rounded-button bg-background/85 px-4 text-xs font-semibold" onClick={onRetry}>
                  Try again
                </Button>
              )}
            </div>
          )}

          {!errorMessage && displayArticles.length === 0 && (
            <MobileListEmpty icon={Newspaper} label="No articles found" labelTone="plain" />
          )}

          <div ref={observerTarget} className="min-h-[64px] flex flex-col items-center justify-center gap-2">
            {showTopSectionLoading && <MobileListSkeletonRows />}
            <UpdatingPillRow show={isBuffering && !showTopSectionLoading} />
            {!loading && hasMore && <MobileListLoadMore armed={armed} onRequest={requestLoad} labelTone="plain" />}
            {!loading && !hasMore && displayArticles.length > 0 && <MobileListEnd label="End of article list" />}
          </div>
        </div>

        {activeArticle && (() => {
          const published = isArticlePublished(activeArticle);
          const derivedStatus = published ? 'published' : 'draft';
          const vital = resolveVital('healthNews', derivedStatus);
          const linkValue = activeArticle.source_url_valid
            ? (activeArticle.source_host || activeArticle.source || 'Valid link')
            : (activeArticle.raw_url || activeArticle.url ? 'Unverified link' : null);

          // S7: Health News is a contract-locked read-only published feed
          // (HealthNewsManagementPage.contract.test.js forbids surfacing
          // publish/edit/delete in mobile, and the page passes no mutation
          // handler), so the single state-CTA is Details.
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
                { icon: Clock, label: 'Published', value: dateLabel(activeArticle.published_at || activeArticle.created_at) },
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
