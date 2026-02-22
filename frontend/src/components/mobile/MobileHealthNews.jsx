import React, { useMemo, useState, useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Newspaper, Search, Eye, Edit, Trash2, FileCheck, File, Tag, Globe, Clock, SlidersHorizontal, BarChart3, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { MobileKPIStrip } from './MobileKPIStrip';
import { MobileSectionHeader, MobileMetricRow } from './MobileMetricList';
import { MobileFeaturedMetric } from './MobileFeaturedMetric';
import { PullToRefresh } from './PullToRefresh';
import { MobilePageShell } from './MobilePageShell';
import { MobileListLoadingMore, MobileListEnd, MobileListEmpty } from './MobileListStates';

export const MobileHealthNews = ({
  articles = [],
  stats,
  filters,
  setFilters,
  onView,
  onEdit,
  onDelete,
  onTogglePublish,
  onRefresh,
  canManage = false,
  loading = false,
  onOpenFilters,
  onViewAnalytics,
  selectedIds = [],
  onSelect,
  onSelectAll,
  hasMore = false,
  onLoadMore
}) => {
  const [expandedId, setExpandedId] = useState(null);
  const observerTarget = useRef(null);
  const selectionMode = selectedIds.length > 0;

  useEffect(() => {
    if (!hasMore || loading || !onLoadMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) onLoadMore();
      },
      { threshold: 0.1, rootMargin: '100px' }
    );
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [hasMore, loading, onLoadMore]);

  const kpis = useMemo(() => [
    { id: 'all', label: 'Articles', value: stats?.total || articles.length, color: 'hsl(var(--primary))', delta: 'LIVE', direction: 'flat' },
    { id: 'published', label: 'Published', value: stats?.published || 0, color: 'hsl(var(--success))', delta: 'LIVE', direction: 'flat' },
    { id: 'draft', label: 'Drafts', value: stats?.draft || 0, color: 'hsl(var(--warning))', delta: 'LIVE', direction: 'flat' }
  ], [articles.length, stats]);

  const filteredArticles = useMemo(() => {
    let result = Array.isArray(articles) ? [...articles] : [];
    const search = String(filters?.search || '').toLowerCase();
    const kpi = String(filters?.kpiFilter || 'all');

    if (search) {
      result = result.filter(a =>
        String(a.title || '').toLowerCase().includes(search) ||
        String(a.source || '').toLowerCase().includes(search) ||
        String(a.category || '').toLowerCase().includes(search)
      );
    }
    if (kpi === 'published') result = result.filter(a => a.published === true);
    if (kpi === 'draft') result = result.filter(a => a.published === false);
    if (kpi === 'medical') result = result.filter(a => String(a.category || '').toLowerCase() === 'medical');
    if (kpi === 'recent') {
      const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000);
      result = result.filter(a => new Date(a.created_at).getTime() >= cutoff);
    }

    return result;
  }, [articles, filters]);

  const periodTrends = useMemo(() => {
    const periodMs = 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const getTime = (item) => new Date(item.created_at || item.updated_at || 0).getTime();
    const currentWindow = articles.filter((item) => {
      const ts = getTime(item);
      return Number.isFinite(ts) && ts >= now - periodMs;
    });
    const previousWindow = articles.filter((item) => {
      const ts = getTime(item);
      return Number.isFinite(ts) && ts < now - periodMs && ts >= now - (2 * periodMs);
    });

    const buildTrend = (currentValue, previousValue) => {
      if (!Number.isFinite(currentValue) || !Number.isFinite(previousValue) || currentValue === 0 || previousValue === 0) {
        return { direction: 'flat', deltaText: 'N/A', hasRealData: false };
      }
      const delta = ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
      return {
        direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat',
        deltaText: `${delta > 0 ? '+' : ''}${delta.toFixed(Math.abs(delta) >= 10 ? 0 : 1)}%`,
        hasRealData: true
      };
    };

    const currentPublishedRatio = currentWindow.length > 0
      ? currentWindow.filter((item) => item.published).length / currentWindow.length
      : 0;
    const previousPublishedRatio = previousWindow.length > 0
      ? previousWindow.filter((item) => item.published).length / previousWindow.length
      : 0;
    const currentMedicalRatio = currentWindow.length > 0
      ? currentWindow.filter((item) => String(item.category || '').toLowerCase() === 'medical').length / currentWindow.length
      : 0;
    const previousMedicalRatio = previousWindow.length > 0
      ? previousWindow.filter((item) => String(item.category || '').toLowerCase() === 'medical').length / previousWindow.length
      : 0;

    return {
      publishedRatio: buildTrend(currentPublishedRatio, previousPublishedRatio),
      medicalRatio: buildTrend(currentMedicalRatio, previousMedicalRatio)
    };
  }, [articles]);

  return (
    <PullToRefresh onRefresh={onRefresh}>
      <MobilePageShell
        kpiStrip={(
          <MobileKPIStrip
            kpis={kpis}
            activeKpi={filters?.kpiFilter || 'all'}
            onKpiClick={(id) => setFilters(prev => ({ ...prev, kpiFilter: id }))}
          />
        )}
        contentClassName="px-2 pt-4 pb-4 text-foreground"
      >
        <MobileFeaturedMetric
          label="Recent Articles"
          value={stats?.recent || 0}
          trend="LIVE"
          icon={Newspaper}
          color="hsl(var(--info))"
          chartData={[{ value: 32 }, { value: 45 }, { value: 41 }, { value: 50 }, { value: 58 }, { value: 63 }]}
        />

        <section className="mb-3">
          <MobileSectionHeader
            label="Publishing Pulse"
            count={stats?.total || articles.length}
            color="hsl(var(--info))"
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="relative p-4 apple-glass-heavy rounded-2xl flex items-center justify-between border-0 overflow-hidden">
              <FileCheck className="absolute top-3 right-3 h-4 w-4 text-primary/30" />
              <div className="flex flex-col pr-6">
                <span className="text-[11px] font-medium tracking-tight">Published Ratio</span>
                <span className="text-[8px] text-muted-foreground uppercase tracking-[0.2em] opacity-50">Live status</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-xl font-medium tracking-tighter font-dashboard-numbers">
                  {Math.round(((stats?.published || 0) / ((stats?.total || 1))) * 100)}%
                </span>
                <span className="flex items-center gap-1 text-[9px] uppercase tracking-[0.16em] text-muted-foreground/70">
                  {periodTrends.publishedRatio.direction === 'up' && <ArrowUpRight className="h-3 w-3 text-success" />}
                  {periodTrends.publishedRatio.direction === 'down' && <ArrowDownRight className="h-3 w-3 text-destructive" />}
                  {periodTrends.publishedRatio.direction === 'flat' && <Minus className="h-3 w-3 text-muted-foreground/60" />}
                  {periodTrends.publishedRatio.deltaText}
                </span>
              </div>
            </div>
            <div className="relative p-4 apple-glass-heavy rounded-2xl flex items-center justify-between border-0 overflow-hidden">
              <Tag className="absolute top-3 right-3 h-4 w-4 text-primary/30" />
              <div className="flex flex-col pr-6">
                <span className="text-[11px] font-medium tracking-tight">Medical Share</span>
                <span className="text-[8px] text-muted-foreground uppercase tracking-[0.2em] opacity-50">Category mix</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-xl font-medium tracking-tighter font-dashboard-numbers">
                  {Math.round(((stats?.medical || 0) / ((stats?.total || 1))) * 100)}%
                </span>
                <span className="flex items-center gap-1 text-[9px] uppercase tracking-[0.16em] text-muted-foreground/70">
                  {periodTrends.medicalRatio.direction === 'up' && <ArrowUpRight className="h-3 w-3 text-success" />}
                  {periodTrends.medicalRatio.direction === 'down' && <ArrowDownRight className="h-3 w-3 text-destructive" />}
                  {periodTrends.medicalRatio.direction === 'flat' && <Minus className="h-3 w-3 text-muted-foreground/60" />}
                  {periodTrends.medicalRatio.deltaText}
                </span>
              </div>
            </div>
          </div>
        </section>

        <div className="flex items-center gap-2 mb-3 px-1">
          <div className="flex-1 relative">
            <Search size={15} className="absolute left-4 top-1/2 z-10 -translate-y-1/2 text-muted-foreground/60" />
            <input
              type="text"
              placeholder="Search articles..."
              value={filters?.search || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full h-11 pl-10 pr-4 rounded-2xl apple-glass-heavy border-0 text-[12px] placeholder:text-muted-foreground/30 focus:ring-1 focus:ring-primary/20 outline-none"
            />
          </div>
          {onOpenFilters && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => onOpenFilters()}
              className="w-11 h-11 rounded-2xl apple-glass-heavy flex items-center justify-center text-muted-foreground/60 active:text-[hsl(var(--spark)/0.92)] hover:text-[hsl(var(--spark)/0.92)] hover:bg-[hsl(var(--spark)/0.08)] transition-[color,background,transform] duration-200 border-0"
              aria-label="Open filters"
            >
              <SlidersHorizontal size={18} />
            </motion.button>
          )}
          {onViewAnalytics && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => onViewAnalytics()}
              className="w-11 h-11 rounded-2xl apple-glass-heavy flex items-center justify-center text-[hsl(var(--spark)/0.78)] active:text-[hsl(var(--spark)/0.92)] hover:text-[hsl(var(--spark)/0.92)] hover:bg-[hsl(var(--spark)/0.08)] transition-[color,background,transform] duration-200 border-0 shadow-sm"
              aria-label="Open analytics"
            >
              <BarChart3 size={18} />
            </motion.button>
          )}
        </div>

        <MobileSectionHeader
          label="News Registry"
          count={filteredArticles.length}
          color="hsl(var(--primary))"
          onSelectAll={onSelectAll ? () => onSelectAll(selectedIds.length !== filteredArticles.length) : null}
          isAllSelected={filteredArticles.length > 0 && selectedIds.length === filteredArticles.length}
        />

        <div className="space-y-1">
          <AnimatePresence mode="popLayout">
            {filteredArticles.map((article) => {
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
                  isSelected={selectedIds.includes(article.id)}
                  onSelect={onSelect ? (id) => onSelect(id, !selectedIds.includes(id)) : null}
                  selectionMode={selectionMode}
                  expandedContent={(
                    <div className="space-y-4 py-3">
                      <div className="grid grid-cols-1 gap-2">
                        <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-2xl border-0">
                          <Globe size={14} className="text-muted-foreground/40" />
                          <span className="text-xs font-normal truncate">{article.source || 'No source'}</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-2xl border-0">
                          <Clock size={14} className="text-muted-foreground/40" />
                          <span className="text-xs font-normal">{article.created_at ? new Date(article.created_at).toLocaleString() : 'No date'}</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-2xl border-0">
                          <Tag size={14} className="text-muted-foreground/40" />
                          <span className="text-xs font-normal">{article.category || 'general'}</span>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button variant="ghost" className="flex-1 h-12 rounded-2xl apple-glass border-0 flex items-center justify-center gap-2" onClick={() => onView(article)}>
                          <Eye size={16} className="text-primary/60" />
                          <span className="text-[9px] uppercase font-semibold tracking-[0.2em]">Details</span>
                        </Button>
                        {canManage && (
                          <>
                            <Button variant="ghost" className="h-12 rounded-2xl apple-glass border-0 px-3" onClick={() => onTogglePublish(article)}>
                              {article.published ? <File className="h-4 w-4 text-warning/70" /> : <FileCheck className="h-4 w-4 text-success/70" />}
                            </Button>
                            <Button variant="ghost" className="h-12 rounded-2xl apple-glass border-0 px-3" onClick={() => onEdit(article)}>
                              <Edit size={16} className="text-warning/60" />
                            </Button>
                            <Button variant="ghost" className="h-12 rounded-2xl apple-glass border-0 px-3 hover:bg-destructive/10 hover:text-destructive" onClick={() => onDelete(article)}>
                              <Trash2 size={16} className="text-destructive/60" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                />
              );
            })}
          </AnimatePresence>

          {filteredArticles.length === 0 && (
            <MobileListEmpty icon={Newspaper} label="No articles found" />
          )}

          <div ref={observerTarget} className="h-20 flex items-center justify-center">
            {hasMore && <MobileListLoadingMore label="Loading more articles" />}
            {!hasMore && filteredArticles.length > 0 && <MobileListEnd label="End of article list" />}
          </div>
        </div>
      </MobilePageShell>
    </PullToRefresh>
  );
};
