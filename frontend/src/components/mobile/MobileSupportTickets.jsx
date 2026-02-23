import React, { useMemo, useState, useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Headphones, Search, Eye, Edit, Trash2, User, Calendar, AlertTriangle, CheckCircle, Ticket, Clock, SlidersHorizontal, BarChart3, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
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

export const MobileSupportTickets = ({
  tickets = [],
  analytics,
  filters,
  setFilters,
  onView,
  onEdit,
  onDelete,
  onAssign,
  onRefresh,
  canManage = false,
  canAssign = false,
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
    total: analytics?.total || tickets.length,
    open: analytics?.open || tickets.filter(t => t.status === 'open').length,
    inProgress: analytics?.inProgress || tickets.filter(t => t.status === 'in_progress').length,
    resolved: analytics?.resolved || tickets.filter(t => t.status === 'resolved').length
  }), [analytics, tickets]);

  const kpis = [
    { id: 'all', label: 'Tickets', value: counts.total, color: 'hsl(var(--primary))', delta: 'LIVE', direction: 'flat' },
    { id: 'open', label: 'Open', value: counts.open, color: 'hsl(var(--warning))', delta: 'LIVE', direction: 'flat' },
    { id: 'in_progress', label: 'Active', value: counts.inProgress, color: 'hsl(var(--info))', delta: 'LIVE', direction: 'flat' },
    { id: 'resolved', label: 'Resolved', value: counts.resolved, color: 'hsl(var(--success))', delta: 'LIVE', direction: 'flat' }
  ];

  const filteredTickets = useMemo(() => {
    let result = [...tickets];
    const search = String(filters?.search || '').toLowerCase();
    const kpi = String(filters?.kpiFilter || 'all');
    if (search) {
      result = result.filter(t =>
        String(t.subject || '').toLowerCase().includes(search) ||
        String(t.customer_name || '').toLowerCase().includes(search) ||
        String(t.id || '').toLowerCase().includes(search)
      );
    }
    if (kpi !== 'all' && kpi !== 'avg') result = result.filter(t => t.status === kpi);
    return result;
  }, [tickets, filters]);
  const { displayItems: displayTickets, isBuffering } = useStableList(filteredTickets, loading);

  const periodTrends = useMemo(() => {
    const periodMs = 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const getTime = (item) => new Date(item.created_at || item.updated_at || 0).getTime();
    const currentWindow = tickets.filter((item) => {
      const ts = getTime(item);
      return Number.isFinite(ts) && ts >= now - periodMs;
    });
    const previousWindow = tickets.filter((item) => {
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
    const currentResolvedRatio = currentWindow.length > 0
      ? currentWindow.filter((t) => t.status === 'resolved' || t.status === 'closed').length / currentWindow.length
      : 0;
    const previousResolvedRatio = previousWindow.length > 0
      ? previousWindow.filter((t) => t.status === 'resolved' || t.status === 'closed').length / previousWindow.length
      : 0;
    const currentOpenQueue = currentWindow.filter((t) => t.status === 'open' || t.status === 'in_progress').length;
    const previousOpenQueue = previousWindow.filter((t) => t.status === 'open' || t.status === 'in_progress').length;
    return {
      resolutionRate: buildTrend(currentResolvedRatio, previousResolvedRatio),
      queueLoad: buildTrend(currentOpenQueue, previousOpenQueue)
    };
  }, [tickets]);

  return (
    <PullToRefresh onRefresh={onRefresh}>
      <MobilePageShell
        kpiStrip={<MobileKPIStrip kpis={kpis} activeKpi={filters?.kpiFilter || 'all'} onKpiClick={(id) => setFilters(prev => ({ ...prev, kpiFilter: id }))} />}
        contentClassName="pt-4 pb-4 text-foreground"
      >
        <MobileFeaturedMetric
          items={[
            {
              label: 'Avg Resolution',
              value: `${analytics?.averageResolutionTime || 0}h`,
              trend: 'LIVE',
              icon: Headphones,
              color: 'hsl(var(--info))',
              chartData: [{ value: 60 }, { value: 56 }, { value: 51 }, { value: 46 }, { value: 42 }, { value: 38 }]
            },
            {
              label: 'Resolution Rate',
              value: `${Math.round(((counts.resolved || 0) / (counts.total || 1)) * 100)}%`,
              trend: periodTrends.resolutionRate.deltaText,
              icon: CheckCircle,
              color: 'hsl(var(--success))',
              chartData: [{ value: 42 }, { value: 46 }, { value: 50 }, { value: 54 }, { value: 58 }, { value: 62 }]
            },
            {
              label: 'Active Queue',
              value: counts.open + counts.inProgress,
              trend: periodTrends.queueLoad.deltaText,
              icon: AlertTriangle,
              color: 'hsl(var(--warning))',
              chartData: [{ value: 34 }, { value: 38 }, { value: 42 }, { value: 45 }, { value: 41 }, { value: 36 }]
            },
            {
              label: 'Total Tickets',
              value: counts.total,
              trend: 'LIVE',
              icon: Ticket,
              color: 'hsl(var(--primary))',
              chartData: [{ value: 22 }, { value: 28 }, { value: 31 }, { value: 36 }, { value: 40 }, { value: 45 }]
            }
          ]}
        />

        <section className="mb-3">
          <MobileSectionHeader
            label="Queue Dynamics"
            count={counts.total}
            color="hsl(var(--info))"
          />
          <MobileSecondaryMetricRail
            items={[
              {
                icon: CheckCircle,
                title: 'Resolution Rate',
                subtitle: 'Service quality',
                value: `${Math.round(((counts.resolved || 0) / (counts.total || 1)) * 100)}%`,
                color: 'hsl(var(--success))',
                trendDirection: periodTrends.resolutionRate.direction,
                trendText: periodTrends.resolutionRate.deltaText
              },
              {
                icon: AlertTriangle,
                title: 'Active Queue',
                subtitle: 'Open + In Progress',
                value: counts.open + counts.inProgress,
                color: 'hsl(var(--warning))',
                trendDirection: periodTrends.queueLoad.direction,
                trendText: periodTrends.queueLoad.deltaText
              },
              {
                icon: Ticket,
                title: 'Total Tickets',
                subtitle: 'Registry',
                value: counts.total,
                color: 'hsl(var(--primary))',
                trendDirection: 'flat',
                trendText: 'LIVE'
              },
              {
                icon: Clock,
                title: 'Avg Resolution',
                subtitle: 'Hours',
                value: `${analytics?.averageResolutionTime || 0}h`,
                color: 'hsl(var(--info))',
                trendDirection: 'flat',
                trendText: 'LIVE'
              }
            ]}
          />
        </section>

        <div className="flex items-center gap-2 mb-3 px-1">
          <div className="flex-1 relative">
            <Search size={15} className="absolute left-4 top-1/2 z-10 -translate-y-1/2 text-muted-foreground/60" />
            <input
              type="text"
              placeholder="Search tickets..."
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
          label="Support Queue"
          count={displayTickets.length}
          color="hsl(var(--primary))"
          onSelectAll={onSelectAll ? () => onSelectAll(selectedIds.length !== displayTickets.length) : null}
          isAllSelected={displayTickets.length > 0 && selectedIds.length === displayTickets.length}
        />

        <div className="space-y-1">
          <AnimatePresence mode="popLayout">
            {displayTickets.map((ticket) => {
              const urgent = ticket.priority === 'urgent' || ticket.priority === 'high';
              const resolved = ticket.status === 'resolved' || ticket.status === 'closed';
              const color = resolved ? 'hsl(var(--success))' : urgent ? 'hsl(var(--warning))' : 'hsl(var(--primary))';
              return (
                <MobileMetricRow
                  key={ticket.id}
                  icon={Headphones}
                  color={color}
                  label={String(ticket.status || 'open').replace('_', ' ').toUpperCase()}
                  value={ticket.subject || `Ticket ${String(ticket.id || '').slice(0, 8)}`}
                  rightBlade={{
                    badge: String(ticket.priority || 'normal').toUpperCase(),
                    direction: resolved ? 'up' : urgent ? 'down' : 'flat',
                    label: 'Customer',
                    value: ticket.customer_name || String(ticket.id || '').slice(0, 8),
                    color
                  }}
                  isExpanded={expandedId === ticket.id}
                  onExpand={(id) => setExpandedId(prev => (prev === id ? null : id))}
                  itemId={ticket.id}
                  isSelected={selectedIds.includes(ticket.id)}
                  onSelect={onSelect ? (id) => onSelect(id, !selectedIds.includes(id)) : null}
                  selectionMode={selectionMode}
                  expandedContent={(
                    <div className="space-y-4 py-3">
                      <div className="grid grid-cols-1 gap-2">
                        <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-2xl border-0">
                          <User size={14} className="text-muted-foreground/40" />
                          <span className="text-xs font-normal">Customer: {ticket.customer_name || 'Unknown'}</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-2xl border-0">
                          <Calendar size={14} className="text-muted-foreground/40" />
                          <span className="text-xs font-normal">Created: {ticket.created_at ? new Date(ticket.created_at).toLocaleString() : 'N/A'}</span>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <Button variant="ghost" className="flex-1 h-12 rounded-2xl apple-glass border-0 flex items-center justify-center gap-2" onClick={() => onView(ticket)}>
                          <Eye size={16} className="text-primary/60" />
                          <span className="text-[9px] uppercase font-semibold tracking-[0.2em]">Details</span>
                        </Button>
                        {(canManage || canAssign) && (
                          <Button variant="ghost" className="h-12 rounded-2xl apple-glass border-0 px-3" onClick={() => onEdit(ticket)}>
                            <Edit size={16} className="text-warning/60" />
                          </Button>
                        )}
                        {canAssign && (
                          <Button variant="ghost" className="h-12 rounded-2xl apple-glass border-0 px-3" onClick={() => onAssign(ticket)}>
                            {resolved ? <CheckCircle className="h-4 w-4 text-success/70" /> : <AlertTriangle className="h-4 w-4 text-info/70" />}
                          </Button>
                        )}
                        {canManage && (
                          <Button variant="ghost" className="h-12 rounded-2xl apple-glass border-0 px-3 hover:bg-destructive/10 hover:text-destructive" onClick={() => onDelete(ticket)}>
                            <Trash2 size={16} className="text-destructive/60" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                />
              );
            })}
          </AnimatePresence>

          {displayTickets.length === 0 && <MobileListEmpty icon={Headphones} label="No tickets found" />}

          <div ref={observerTarget} className="min-h-[64px] flex items-center justify-center">
            {loading && <MobileListSkeletonRows />}
            {!loading && hasMore && <MobileListLoadMore armed={armed} onRequest={requestLoad} />}
            {!loading && !hasMore && displayTickets.length > 0 && <MobileListEnd label="End of ticket list" />}
          </div>
        </div>
      </MobilePageShell>
    </PullToRefresh>
  );
};


