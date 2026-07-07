import React, { useMemo, useState, useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Users, Search, Eye, Edit, Trash2, Mail, Clock, Crown, BadgeCheck, SlidersHorizontal, BarChart3, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { Button } from '../ui/button';
import { motion } from 'framer-motion';
import { MobileKPIStrip } from './MobileKPIStrip';
import { MobileSectionHeader, MobileMetricRow } from './MobileMetricList';
import { MobileFeaturedMetric } from './MobileFeaturedMetric';
import { MobileSecondaryMetricRail } from './MobileSecondaryMetricCard';
import { PullToRefresh } from './PullToRefresh';
import { MobilePageShell } from './MobilePageShell';
import { MobileListEnd, MobileListEmpty, MobileListSkeletonRows, MobileListLoadMore } from './MobileListStates';
import { useStableList } from './useStableList';
import { useLoadMoreControl } from './useLoadMoreControl';

const formatLabel = (value, fallback = 'Unknown') => {
  const text = String(value || fallback).replace(/_/g, ' ').trim();
  return text ? text.replace(/\b\w/g, (letter) => letter.toUpperCase()) : fallback;
};

export const MobileSubscriptions = ({
  subscribers = [],
  filters,
  setFilters,
  onView,
  onEdit,
  onDelete,
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

  const counts = useMemo(() => ({
    total: subscribers.length,
    active: subscribers.filter(s => s.status === 'active').length,
    paid: subscribers.filter(s => s.type === 'paid').length,
    free: subscribers.filter(s => s.type === 'free').length
  }), [subscribers]);

  const filteredSubscribers = useMemo(() => {
    let result = [...subscribers];
    const search = String(filters?.search || '').toLowerCase();
    const kpi = String(filters?.kpiFilter || 'all');

    if (search) result = result.filter(s => String(s.email || '').toLowerCase().includes(search));
    if (kpi === 'active') result = result.filter(s => s.status === 'active');
    if (kpi === 'paid') result = result.filter(s => s.type === 'paid');
    if (kpi === 'free') result = result.filter(s => s.type === 'free');
    if (kpi === 'new') result = result.filter(s => !!s.new_user);

    return result;
  }, [subscribers, filters]);
  const { displayItems: displaySubscribers, isBuffering } = useStableList(filteredSubscribers, loading);
  const showTopSectionLoading = loading && displaySubscribers.length === 0;

  const kpis = [
    { id: 'all', label: 'Subscribers', value: counts.total, color: 'hsl(var(--primary))', delta: 'Shown', direction: 'flat' },
    { id: 'active', label: 'Active', value: counts.active, color: 'hsl(var(--success))', delta: 'Shown', direction: 'flat' },
    { id: 'paid', label: 'Paid', value: counts.paid, color: 'hsl(var(--warning))', delta: 'Shown', direction: 'flat' },
    { id: 'free', label: 'Free', value: counts.free, color: 'hsl(var(--info))', delta: 'Shown', direction: 'flat' }
  ];

  const periodTrends = useMemo(() => {
    const periodMs = 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const getTime = (item) => new Date(item.subscription_date || item.created_at || 0).getTime();
    const currentWindow = subscribers.filter((item) => {
      const ts = getTime(item);
      return Number.isFinite(ts) && ts >= now - periodMs;
    });
    const previousWindow = subscribers.filter((item) => {
      const ts = getTime(item);
      return Number.isFinite(ts) && ts < now - periodMs && ts >= now - (2 * periodMs);
    });
    const buildTrend = (currentValue, previousValue) => {
      if (!Number.isFinite(currentValue) || !Number.isFinite(previousValue) || currentValue === 0 || previousValue === 0) {
        return { direction: 'flat', deltaText: 'Baseline' };
      }
      const delta = ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
      return { direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat', deltaText: `${delta > 0 ? '+' : ''}${delta.toFixed(Math.abs(delta) >= 10 ? 0 : 1)}%` };
    };
    const currentPaidRatio = currentWindow.length > 0 ? currentWindow.filter((s) => s.type === 'paid').length / currentWindow.length : 0;
    const previousPaidRatio = previousWindow.length > 0 ? previousWindow.filter((s) => s.type === 'paid').length / previousWindow.length : 0;
    const currentActiveRatio = currentWindow.length > 0 ? currentWindow.filter((s) => s.status === 'active').length / currentWindow.length : 0;
    const previousActiveRatio = previousWindow.length > 0 ? previousWindow.filter((s) => s.status === 'active').length / previousWindow.length : 0;
    return {
      paidMix: buildTrend(currentPaidRatio, previousPaidRatio),
      activeMix: buildTrend(currentActiveRatio, previousActiveRatio)
    };
  }, [subscribers]);

  return (
    <PullToRefresh onRefresh={onRefresh}>
      <MobilePageShell
        animatePageLoad={false}
        kpiStrip={<MobileKPIStrip
            loading={showTopSectionLoading} kpis={kpis} activeKpi={filters?.kpiFilter || 'all'} onKpiClick={(id) => setFilters(prev => ({ ...prev, kpiFilter: id }))} />}
        contentClassName="pt-4 pb-4 text-foreground"
      >
        <MobileFeaturedMetric
          loading={showTopSectionLoading}
          items={[
            {
              label: 'Paid share',
              value: `${counts.total ? Math.round((counts.paid / counts.total) * 100) : 0}%`,
              trend: periodTrends.paidMix.deltaText,
              icon: Crown,
              color: 'hsl(var(--warning))',
              chartData: [{ value: 24 }, { value: 30 }, { value: 36 }, { value: 44 }, { value: 46 }, { value: 53 }]
            },
            {
              label: 'Active share',
              value: `${Math.round(((counts.active || 0) / (counts.total || 1)) * 100)}%`,
              trend: periodTrends.activeMix.deltaText,
              icon: Users,
              color: 'hsl(var(--info))',
              chartData: [{ value: 22 }, { value: 27 }, { value: 33 }, { value: 39 }, { value: 43 }, { value: 48 }]
            },
            {
              label: 'Shown',
              value: counts.total,
              trend: 'Loaded',
              icon: Mail,
              color: 'hsl(var(--primary))',
              chartData: [{ value: 14 }, { value: 18 }, { value: 22 }, { value: 26 }, { value: 30 }, { value: 34 }]
            },
            {
              label: 'Paid type',
              value: counts.paid,
              trend: 'Loaded',
              icon: BadgeCheck,
              color: 'hsl(var(--success))',
              chartData: [{ value: 12 }, { value: 16 }, { value: 19 }, { value: 23 }, { value: 27 }, { value: 31 }]
            }
          ]}
        />

        <section className="mb-3">
          <MobileSectionHeader
            label="Subscriber mix"
            count={counts.total}
            color="hsl(var(--warning))"
            labelTone="plain"
          />
          <MobileSecondaryMetricRail
            loading={showTopSectionLoading}
            items={[
              {
                icon: Crown,
                title: 'Paid Mix',
                subtitle: 'Type share',
                value: `${Math.round(((counts.paid || 0) / (counts.total || 1)) * 100)}%`,
                color: 'hsl(var(--warning))',
                trendDirection: periodTrends.paidMix.direction,
                trendText: periodTrends.paidMix.deltaText
              },
              {
                icon: Users,
                title: 'Active Mix',
                subtitle: 'Status share',
                value: `${Math.round(((counts.active || 0) / (counts.total || 1)) * 100)}%`,
                color: 'hsl(var(--info))',
                trendDirection: periodTrends.activeMix.direction,
                trendText: periodTrends.activeMix.deltaText
              },
              {
                icon: Mail,
                title: 'Shown',
                subtitle: 'Loaded rows',
                value: counts.total,
                color: 'hsl(var(--primary))',
                trendDirection: 'flat',
                trendText: 'Loaded'
              },
              {
                icon: BadgeCheck,
                title: 'Paid',
                subtitle: 'Type label',
                value: counts.paid,
                color: 'hsl(var(--success))',
                trendDirection: 'flat',
                trendText: 'Loaded'
              }
            ]}
          />
        </section>

        <div className="flex items-center gap-2 mb-3 px-1">
          <div className="flex-1 relative">
            <Search size={15} className="absolute left-4 top-1/2 z-10 -translate-y-1/2 text-muted-foreground/60" />
            <input
              type="text"
              placeholder="Search subscribers..."
              value={filters?.search || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full h-11 pl-10 pr-4 rounded-inner apple-glass-heavy text-[12px] placeholder:text-muted-foreground/30 focus-visible:bg-white/[0.06]"
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
          label="Subscriber Registry"
          count={displaySubscribers.length}
          color="hsl(var(--primary))"
          onSelectAll={onSelectAll ? () => onSelectAll(selectedIds.length !== displaySubscribers.length) : null}
          isAllSelected={displaySubscribers.length > 0 && selectedIds.length === displaySubscribers.length}
        />

        <div className="space-y-1">
          <AnimatePresence mode="popLayout">
            {displaySubscribers.map((sub) => {
              const active = sub.status === 'active';
              const paid = sub.type === 'paid';
              return (
                <MobileMetricRow
                  key={sub.id}
                  icon={Users}
                  color={active ? 'hsl(var(--success))' : 'hsl(var(--muted-foreground))'}
                  label={formatLabel(sub.status)}
                  value={sub.email || 'No email'}
                  rightBlade={{
                    badge: paid ? 'Paid' : 'Free',
                    direction: paid ? 'up' : 'flat',
                    label: 'Type',
                    value: formatLabel(sub.type, 'Free'),
                    color: paid ? 'hsl(var(--warning))' : 'hsl(var(--info))'
                  }}
                  isExpanded={expandedId === sub.id}
                  onExpand={(id) => setExpandedId(prev => (prev === id ? null : id))}
                  itemId={sub.id}
                  isSelected={selectedIds.includes(sub.id)}
                  onSelect={onSelect ? (id) => onSelect(id, !selectedIds.includes(id)) : null}
                  selectionMode={selectionMode}
                  expandedContent={(
                    <div className="space-y-4 py-3">
                      <div className="grid grid-cols-1 gap-2">
                        <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-inner">
                          <Mail size={14} className="text-muted-foreground/40" />
                          <span className="text-xs font-normal">Welcome Email: {sub.welcome_email_sent ? 'Sent' : 'Pending'}</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-inner">
                          <Clock size={14} className="text-muted-foreground/40" />
                          <span className="text-xs font-normal">Joined: {sub.subscription_date ? new Date(sub.subscription_date).toLocaleDateString() : 'Date unknown'}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Button variant="ghost" className="flex-1 h-12 rounded-button apple-glass flex items-center justify-center gap-2" onClick={() => onView(sub)}>
                          <Eye size={16} className="text-primary/60" />
                          <span className="text-[11px] font-semibold">Details</span>
                        </Button>
                        {canManage && (
                          <>
                            <Button variant="ghost" className="h-12 rounded-button apple-glass px-3" onClick={() => onEdit(sub)}>
                              <Edit size={16} className="text-warning/60" />
                            </Button>
                            <Button variant="ghost" className="h-12 rounded-button apple-glass px-3 hover:bg-destructive/10 hover:text-destructive" onClick={() => onDelete(sub)}>
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

          {displaySubscribers.length === 0 && <MobileListEmpty icon={Users} label="No subscribers found" />}

          <div ref={observerTarget} className="min-h-[64px] flex items-center justify-center">
            {loading && <MobileListSkeletonRows />}
            {!loading && hasMore && <MobileListLoadMore armed={armed} onRequest={requestLoad} />}
            {!loading && !hasMore && displaySubscribers.length > 0 && <MobileListEnd label="End of subscriber list" />}
          </div>
        </div>
      </MobilePageShell>
    </PullToRefresh>
  );
};


