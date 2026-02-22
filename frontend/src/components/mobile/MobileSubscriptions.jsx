import React, { useMemo, useState, useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Users, Search, Eye, Edit, Trash2, Mail, Clock, Crown, SlidersHorizontal, BarChart3, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { Button } from '../ui/button';
import { motion } from 'framer-motion';
import { MobileKPIStrip } from './MobileKPIStrip';
import { MobileSectionHeader, MobileMetricRow } from './MobileMetricList';
import { MobileFeaturedMetric } from './MobileFeaturedMetric';
import { PullToRefresh } from './PullToRefresh';
import { MobilePageShell } from './MobilePageShell';
import { MobileListLoadingMore, MobileListEnd, MobileListEmpty } from './MobileListStates';

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

  const kpis = [
    { id: 'all', label: 'Subscribers', value: counts.total, color: 'hsl(var(--primary))', delta: 'LIVE', direction: 'flat' },
    { id: 'active', label: 'Active', value: counts.active, color: 'hsl(var(--success))', delta: 'LIVE', direction: 'flat' },
    { id: 'paid', label: 'Paid', value: counts.paid, color: 'hsl(var(--warning))', delta: 'LIVE', direction: 'flat' },
    { id: 'free', label: 'Free', value: counts.free, color: 'hsl(var(--info))', delta: 'LIVE', direction: 'flat' }
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
        return { direction: 'flat', deltaText: 'N/A' };
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
        kpiStrip={<MobileKPIStrip kpis={kpis} activeKpi={filters?.kpiFilter || 'all'} onKpiClick={(id) => setFilters(prev => ({ ...prev, kpiFilter: id }))} />}
        contentClassName="px-2 pt-4 pb-4 text-foreground"
      >
        <MobileFeaturedMetric
          label="Paid Conversion"
          value={`${counts.total ? Math.round((counts.paid / counts.total) * 100) : 0}%`}
          trend="LIVE"
          icon={Crown}
          color="hsl(var(--warning))"
          chartData={[{ value: 24 }, { value: 30 }, { value: 36 }, { value: 44 }, { value: 46 }, { value: 53 }]}
        />

        <section className="mb-3">
          <MobileSectionHeader
            label="Revenue Dynamics"
            count={counts.total}
            color="hsl(var(--warning))"
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="relative p-4 apple-glass-heavy rounded-2xl flex items-center justify-between border-0 overflow-hidden">
              <Crown className="absolute top-3 right-3 h-4 w-4 text-primary/30" />
              <div className="flex flex-col pr-6">
                <span className="text-[11px] font-medium tracking-tight">Paid Mix</span>
                <span className="text-[8px] text-muted-foreground uppercase tracking-[0.2em] opacity-50">Monetization</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-xl font-medium tracking-tighter font-dashboard-numbers">
                  {Math.round(((counts.paid || 0) / (counts.total || 1)) * 100)}%
                </span>
                <span className="flex items-center gap-1 text-[9px] uppercase tracking-[0.16em] text-muted-foreground/70">
                  {periodTrends.paidMix.direction === 'up' && <ArrowUpRight className="h-3 w-3 text-success" />}
                  {periodTrends.paidMix.direction === 'down' && <ArrowDownRight className="h-3 w-3 text-destructive" />}
                  {periodTrends.paidMix.direction === 'flat' && <Minus className="h-3 w-3 text-muted-foreground/60" />}
                  {periodTrends.paidMix.deltaText}
                </span>
              </div>
            </div>
            <div className="relative p-4 apple-glass-heavy rounded-2xl flex items-center justify-between border-0 overflow-hidden">
              <Users className="absolute top-3 right-3 h-4 w-4 text-primary/30" />
              <div className="flex flex-col pr-6">
                <span className="text-[11px] font-medium tracking-tight">Active Mix</span>
                <span className="text-[8px] text-muted-foreground uppercase tracking-[0.2em] opacity-50">Engagement</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-xl font-medium tracking-tighter font-dashboard-numbers">
                  {Math.round(((counts.active || 0) / (counts.total || 1)) * 100)}%
                </span>
                <span className="flex items-center gap-1 text-[9px] uppercase tracking-[0.16em] text-muted-foreground/70">
                  {periodTrends.activeMix.direction === 'up' && <ArrowUpRight className="h-3 w-3 text-success" />}
                  {periodTrends.activeMix.direction === 'down' && <ArrowDownRight className="h-3 w-3 text-destructive" />}
                  {periodTrends.activeMix.direction === 'flat' && <Minus className="h-3 w-3 text-muted-foreground/60" />}
                  {periodTrends.activeMix.deltaText}
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
              placeholder="Search subscribers..."
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
          label="Subscriber Registry"
          count={filteredSubscribers.length}
          color="hsl(var(--primary))"
          onSelectAll={onSelectAll ? () => onSelectAll(selectedIds.length !== filteredSubscribers.length) : null}
          isAllSelected={filteredSubscribers.length > 0 && selectedIds.length === filteredSubscribers.length}
        />

        <div className="space-y-1">
          <AnimatePresence mode="popLayout">
            {filteredSubscribers.map((sub) => {
              const active = sub.status === 'active';
              const paid = sub.type === 'paid';
              return (
                <MobileMetricRow
                  key={sub.id}
                  icon={Users}
                  color={active ? 'hsl(var(--success))' : 'hsl(var(--muted-foreground))'}
                  label={String(sub.status || 'unknown').toUpperCase()}
                  value={sub.email || 'No email'}
                  rightBlade={{
                    badge: paid ? 'PAID' : 'FREE',
                    direction: paid ? 'up' : 'flat',
                    label: 'Type',
                    value: String(sub.type || 'free').toUpperCase(),
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
                        <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-2xl border-0">
                          <Mail size={14} className="text-muted-foreground/40" />
                          <span className="text-xs font-normal">Welcome Email: {sub.welcome_email_sent ? 'Sent' : 'Pending'}</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-2xl border-0">
                          <Clock size={14} className="text-muted-foreground/40" />
                          <span className="text-xs font-normal">Joined: {sub.subscription_date ? new Date(sub.subscription_date).toLocaleDateString() : 'N/A'}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Button variant="ghost" className="flex-1 h-12 rounded-2xl apple-glass border-0 flex items-center justify-center gap-2" onClick={() => onView(sub)}>
                          <Eye size={16} className="text-primary/60" />
                          <span className="text-[9px] uppercase font-semibold tracking-[0.2em]">Details</span>
                        </Button>
                        {canManage && (
                          <>
                            <Button variant="ghost" className="h-12 rounded-2xl apple-glass border-0 px-3" onClick={() => onEdit(sub)}>
                              <Edit size={16} className="text-warning/60" />
                            </Button>
                            <Button variant="ghost" className="h-12 rounded-2xl apple-glass border-0 px-3 hover:bg-destructive/10 hover:text-destructive" onClick={() => onDelete(sub)}>
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

          {filteredSubscribers.length === 0 && <MobileListEmpty icon={Users} label="No subscribers found" />}

          <div ref={observerTarget} className="h-20 flex items-center justify-center">
            {hasMore && <MobileListLoadingMore label="Loading more subscribers" />}
            {!hasMore && filteredSubscribers.length > 0 && <MobileListEnd label="End of subscriber list" />}
          </div>
        </div>
      </MobilePageShell>
    </PullToRefresh>
  );
};
