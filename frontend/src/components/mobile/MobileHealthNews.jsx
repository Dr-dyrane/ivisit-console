import React, { useMemo, useState, useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Newspaper, Search, Eye, FileCheck, Tag, BookOpen, Globe, Clock, SlidersHorizontal, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { MobileKPIStrip } from './MobileKPIStrip';
import { MobileSectionHeader, MobileMetricRow } from './MobileMetricList';
import { MobileFeaturedMetric } from './MobileFeaturedMetric';
import { MobileSecondaryMetricRail } from './MobileSecondaryMetricCard';
import { PullToRefresh } from './PullToRefresh';
import { MobilePageShell } from './MobilePageShell';
import { MobileListEnd, MobileListEmpty, MobileListSkeletonRows, MobileListLoadMore } from './MobileListStates';
import { useStableList } from './useStableList';
import { useLoadMoreControl } from './useLoadMoreControl';

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
  const [expandedId, setExpandedId] = useState(null);
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
    return [
      { id: 'all', label: 'Articles', value: total, color: 'hsl(var(--primary))', delta: 'Current', direction: 'flat' },
      { id: 'published', label: 'Published', value: published, color: 'hsl(var(--success))', delta: 'Current', direction: 'flat' },
      { id: 'draft', label: 'Drafts', value: draft, color: 'hsl(var(--warning))', delta: 'Locked', direction: 'flat' },
      { id: 'medical', label: 'Medical', value: medical, color: 'hsl(var(--info))', delta: 'Current', direction: 'flat' },
      { id: 'recent', label: 'Recent', value: recent, color: 'hsl(var(--secondary))', delta: 'Current', direction: 'flat' }
    ];
  }, [articles, stats]);

  const sourceArticles = useMemo(() => (Array.isArray(articles) ? articles : []), [articles]);
  const { displayItems: displayArticles } = useStableList(sourceArticles, loading);
  const showTopSectionLoading = loading && displayArticles.length === 0;

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
              color: 'hsl(var(--info))'
            },
            {
              label: 'Readable',
              value: stats?.published || 0,
              trend: 'Current',
              icon: FileCheck,
              color: 'hsl(var(--success))'
            },
            {
              label: 'Medical',
              value: stats?.medical || 0,
              trend: 'Current',
              icon: Tag,
              color: 'hsl(var(--warning))'
            },
            {
              label: 'Feed',
              value: stats?.total || articles.length,
              trend: 'Current',
              icon: BookOpen,
              color: 'hsl(var(--primary))'
            }
          ]}
        />

        <section className="mb-3">
          <MobileSectionHeader
            label="Feed Summary"
            count={stats?.total || articles.length}
            color="hsl(var(--info))"
          />
          <MobileSecondaryMetricRail
            loading={showTopSectionLoading}
            items={[
              {
                icon: FileCheck,
                title: 'Readable',
                subtitle: 'Ready to open',
                value: stats?.published || 0,
                color: 'hsl(var(--success))',
                trendDirection: 'flat',
                trendText: 'Current'
              },
              {
                icon: Tag,
                title: 'Medical',
                subtitle: 'Category',
                value: stats?.medical || 0,
                color: 'hsl(var(--warning))',
                trendDirection: 'flat',
                trendText: 'Current'
              },
              {
                icon: BookOpen,
                title: 'Feed',
                subtitle: 'Visible now',
                value: stats?.total || articles.length,
                color: 'hsl(var(--primary))',
                trendDirection: 'flat',
                trendText: 'Current'
              },
              {
                icon: Newspaper,
                title: 'Drafts',
                subtitle: 'Authoring locked',
                value: stats?.draft || 0,
                color: 'hsl(var(--info))',
                trendDirection: 'flat',
                trendText: 'Locked'
              }
            ]}
          />
        </section>

        <div className="flex items-center gap-2 mb-3 px-1">
          <div className="flex-1 relative">
            <Search size={15} className="absolute left-4 top-1/2 z-10 -translate-y-1/2 text-muted-foreground/60" />
            <input
              type="text"
              data-testid="mobile-health-news-search"
              placeholder="Search articles..."
              value={filters?.search || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full h-11 pl-10 pr-4 rounded-button apple-glass-heavy text-[12px] placeholder:text-muted-foreground/30 focus-visible:shadow-[0_0_0_3px_hsl(var(--primary)/0.16)]"
            />
          </div>
          {onOpenFilters && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => onOpenFilters()}
              className="w-11 h-11 rounded-button apple-glass-heavy flex items-center justify-center text-muted-foreground/60 active:text-[hsl(var(--spark)/0.92)] hover:text-[hsl(var(--spark)/0.92)] hover:bg-[hsl(var(--spark)/0.08)] transition-[color,background,transform] duration-200"
              aria-label="Open filters"
            >
              <SlidersHorizontal size={18} />
            </motion.button>
          )}
          {onViewAnalytics && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => onViewAnalytics()}
              className="w-11 h-11 rounded-button apple-glass-heavy flex items-center justify-center text-[hsl(var(--spark)/0.78)] active:text-[hsl(var(--spark)/0.92)] hover:text-[hsl(var(--spark)/0.92)] hover:bg-[hsl(var(--spark)/0.08)] transition-[color,background,transform] duration-200 shadow-sm"
              aria-label="Open analytics"
            >
              <BarChart3 size={18} />
            </motion.button>
          )}
        </div>

        <MobileSectionHeader
          label="Article List"
          count={displayArticles.length}
          color="hsl(var(--primary))"
        />

        <div className="space-y-1" data-testid="mobile-health-news-activity-sheet">
          <AnimatePresence mode="popLayout">
            {displayArticles.map((article) => {
              const published = !!article.published;
              return (
                <MobileMetricRow
                  key={article.id}
                  icon={Newspaper}
                  color={published ? 'hsl(var(--success))' : 'hsl(var(--warning))'}
                  label={String(article.category || 'general').toUpperCase()}
                  value={article.title || 'Untitled article'}
                  rightBlade={{
                    badge: published ? 'PUBLISHED' : 'DRAFT',
                    direction: published ? 'up' : 'flat',
                    label: 'Source',
                    value: article.source || 'Unknown',
                    color: published ? 'hsl(var(--success))' : 'hsl(var(--warning))'
                  }}
                  isExpanded={expandedId === article.id}
                  onExpand={(id) => setExpandedId(prev => (prev === id ? null : id))}
                  itemId={article.id}
                  expandedContent={(
                    <div className="space-y-4 py-3">
                      <div className="grid grid-cols-1 gap-2">
                        <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-inner">
                          <Globe size={14} className="text-muted-foreground/40" />
                          <span className="text-xs font-normal truncate">{article.source || 'No source'}</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-inner">
                          <Clock size={14} className="text-muted-foreground/40" />
                          <span className="text-xs font-normal">{article.created_at ? new Date(article.created_at).toLocaleString() : 'No date'}</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-inner">
                          <Tag size={14} className="text-muted-foreground/40" />
                          <span className="text-xs font-normal">{article.category || 'general'}</span>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button variant="ghost" className="flex-1 h-12 rounded-button apple-glass flex items-center justify-center gap-2" onClick={() => onView(article)}>
                          <Eye size={16} className="text-primary/60" />
                          <span className="text-[9px] uppercase font-semibold tracking-[0.2em]">Details</span>
                        </Button>
                      </div>
                    </div>
                  )}
                />
              );
            })}
          </AnimatePresence>

          {errorMessage && !loading && displayArticles.length === 0 && (
            <div className="py-8 text-center" data-testid="mobile-health-news-error-state">
              <MobileListEmpty icon={Newspaper} label="Health news could not load" />
              {onRetry && (
                <Button variant="ghost" className="mt-3 h-11 rounded-button apple-glass px-4 text-xs font-semibold" onClick={onRetry}>
                  Try again
                </Button>
              )}
            </div>
          )}

          {!errorMessage && displayArticles.length === 0 && (
            <MobileListEmpty icon={Newspaper} label="No articles found" />
          )}

          <div ref={observerTarget} className="min-h-[64px] flex items-center justify-center">
            {loading && <MobileListSkeletonRows />}
            {!loading && hasMore && <MobileListLoadMore armed={armed} onRequest={requestLoad} />}
            {!loading && !hasMore && displayArticles.length > 0 && <MobileListEnd label="End of article list" />}
          </div>
        </div>
      </MobilePageShell>
    </PullToRefresh>
  );
};


