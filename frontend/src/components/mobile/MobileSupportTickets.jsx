import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { BarChart3, CheckCircle, Edit, Eye, Headphones, Search, SlidersHorizontal } from 'lucide-react';
import { Button } from '../ui/button';
import { MobileKPIStrip } from './MobileKPIStrip';
import { MobileMetricRow, MobileSectionHeader } from './MobileMetricList';
import { PullToRefresh } from './PullToRefresh';
import { MobilePageShell } from './MobilePageShell';
import { MobileListEmpty, MobileListEnd, MobileListLoadMore, MobileListSkeletonRows } from './MobileListStates';
import { useLoadMoreControl } from './useLoadMoreControl';
import { useStableList } from './useStableList';

const STATUS_LABELS = {
  open: 'Open',
  in_progress: 'In progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

const priorityLabel = (value) => {
  const text = String(value || 'normal').replace('_', ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const statusLabel = (value) => STATUS_LABELS[value] || STATUS_LABELS.open;

export const MobileSupportTickets = ({
  tickets = [],
  stats,
  filters,
  setFilters,
  onView,
  onEdit,
  onRefresh,
  canManage = false,
  loading = false,
  errorMessage = null,
  onRetry,
  onOpenFilters,
  onViewAnalytics,
  hasMore = false,
  onLoadMore,
}) => {
  const [expandedId, setExpandedId] = useState(null);
  const observerTarget = useRef(null);
  const { armed, requestLoad, triggerLoad } = useLoadMoreControl({ hasMore, loading, onLoadMore });
  const { displayItems, isBuffering } = useStableList(tickets, loading);
  const showSkeleton = loading && displayItems.length === 0;

  useEffect(() => {
    if (!hasMore) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) triggerLoad();
      },
      { threshold: 0.1, rootMargin: '120px' }
    );
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [hasMore, triggerLoad]);

  const counts = useMemo(() => ({
    total: Number(stats?.total) || tickets.length,
    open: Number(stats?.open) || tickets.filter((ticket) => ticket.status === 'open').length,
    active: Number(stats?.active) || tickets.filter((ticket) => ticket.status === 'open' || ticket.status === 'in_progress').length,
    resolved: Number(stats?.resolved) || tickets.filter((ticket) => ticket.status === 'resolved').length,
  }), [stats, tickets]);

  const kpis = [
    { id: 'all', label: 'Requests', value: counts.total, color: 'hsl(var(--primary))' },
    { id: 'open', label: 'Open', value: counts.open, color: 'hsl(var(--warning))' },
    { id: 'in_progress', label: 'Active', value: counts.active, color: 'hsl(var(--info))' },
    { id: 'resolved', label: 'Resolved', value: counts.resolved, color: 'hsl(var(--success))' },
  ];

  const handleSearch = (event) => {
    setFilters((current) => ({ ...current, search: event.target.value }));
  };

  return (
    <PullToRefresh onRefresh={onRefresh}>
      <MobilePageShell
        animatePageLoad={false}
        kpiStrip={(
          <MobileKPIStrip
            loading={showSkeleton}
            kpis={kpis}
            activeKpi={filters?.kpiFilter || 'all'}
            onKpiClick={(id) => setFilters((current) => ({ ...current, kpiFilter: id }))}
            labelTone="plain"
          />
        )}
        contentClassName="pt-4 pb-4 text-foreground"
      >
        <section className="mb-3 rounded-[32px] bg-card/72 p-4 shadow-[0_22px_64px_rgb(0_0_0/0.14)] backdrop-blur-xl dark:bg-card/46">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-3xl bg-primary/10 text-primary shadow-[0_14px_34px_hsl(var(--primary)/0.12)]">
              <Headphones className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-muted-foreground">Support</p>
              <h2 className="mt-1 text-2xl font-semibold leading-tight text-foreground">
                {counts.active > 0 ? `${counts.active} active request${counts.active === 1 ? '' : 's'}` : 'Support queue is clear'}
              </h2>
              <p className="mt-2 text-sm leading-5 text-muted-foreground">
                {errorMessage || 'Review one request, then open details when more context is needed.'}
              </p>
            </div>
          </div>
          {errorMessage && onRetry && (
            <Button
              type="button"
              onClick={onRetry}
              className="mt-4 h-10 rounded-2xl px-4 text-sm font-semibold shadow-[0_14px_34px_hsl(var(--primary)/0.18)]"
            >
              Try again
            </Button>
          )}
        </section>

        <div className="mb-3 flex items-center gap-2 px-1">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-4 top-1/2 z-10 -translate-y-1/2 text-muted-foreground/60" />
            <input
              type="text"
              placeholder="Search support"
              value={filters?.search || ''}
              onChange={handleSearch}
              className="h-11 w-full rounded-2xl bg-card/72 pl-10 pr-4 text-[13px] shadow-inner placeholder:text-muted-foreground/45 transition-[background,box-shadow] focus-visible:bg-card/88 focus-visible:shadow-[0_0_0_3px_hsl(var(--primary)/0.14)] dark:bg-card/46"
            />
          </div>
          {onOpenFilters && (
            <button
              type="button"
              onClick={onOpenFilters}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-card/72 text-muted-foreground shadow-[0_14px_32px_rgb(0_0_0/0.10)] transition-[background,color,transform] active:scale-[0.96] hover:bg-card/88 hover:text-primary dark:bg-card/46"
              aria-label="Filter support"
            >
              <SlidersHorizontal size={18} />
            </button>
          )}
          {onViewAnalytics && (
            <button
              type="button"
              onClick={onViewAnalytics}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-[0_14px_32px_hsl(var(--primary)/0.12)] transition-[background,transform] active:scale-[0.96] hover:bg-primary/15"
              aria-label="Open support analytics"
            >
              <BarChart3 size={18} />
            </button>
          )}
        </div>

        <MobileSectionHeader
          label="Support queue"
          count={Number(stats?.total) || displayItems.length}
          color="hsl(var(--primary))"
          labelTone="plain"
        />

        <div className="space-y-1">
          <AnimatePresence mode="popLayout">
            {displayItems.map((ticket) => {
              const resolved = ticket.status === 'resolved' || ticket.status === 'closed';
              const active = ticket.status === 'open' || ticket.status === 'in_progress';
              const color = resolved ? 'hsl(var(--success))' : active ? 'hsl(var(--warning))' : 'hsl(var(--primary))';

              return (
                <MobileMetricRow
                  key={ticket.id}
                  icon={resolved ? CheckCircle : Headphones}
                  color={color}
                  label={statusLabel(ticket.status)}
                  value={ticket.subject || `Ticket ${String(ticket.id || '').slice(0, 8)}`}
                  rightBlade={{
                    badge: priorityLabel(ticket.priority),
                    direction: resolved ? 'up' : active ? 'flat' : 'down',
                    label: 'Category',
                    value: ticket.category || 'general',
                    color,
                  }}
                  isExpanded={expandedId === ticket.id}
                  onExpand={(id) => setExpandedId((current) => (current === id ? null : id))}
                  itemId={ticket.id}
                  expandedContent={(
                    <div className="space-y-3 py-3">
                      <div className="rounded-2xl bg-white/[0.03] p-3 text-xs leading-5 text-muted-foreground">
                        {ticket.message || 'No extra message was added.'}
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Button
                          type="button"
                          variant="ghost"
                          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-card/70 text-sm font-medium shadow-[0_12px_28px_rgb(0_0_0/0.08)] hover:bg-card/90"
                          onClick={() => onView?.(ticket)}
                        >
                          <Eye className="h-4 w-4 text-primary" />
                          Details
                        </Button>
                        {canManage && (
                          <Button
                            type="button"
                            variant="ghost"
                            className="flex h-11 items-center justify-center rounded-2xl bg-card/70 px-4 shadow-[0_12px_28px_rgb(0_0_0/0.08)] hover:bg-card/90"
                            onClick={() => onEdit?.(ticket)}
                            aria-label={`Edit ${ticket.subject || 'support request'}`}
                          >
                            <Edit className="h-4 w-4 text-primary" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                />
              );
            })}
          </AnimatePresence>

          {displayItems.length === 0 && !loading && (
            <MobileListEmpty
              icon={Headphones}
              label={errorMessage ? 'Support did not load' : 'No support requests'}
              hint={errorMessage ? 'Try again before treating support as clear.' : 'Use New ticket when you need support.'}
              labelTone="plain"
            />
          )}

          <div ref={observerTarget} className="flex min-h-[64px] items-center justify-center">
            {(loading || isBuffering) && <MobileListSkeletonRows />}
            {!loading && hasMore && <MobileListLoadMore armed={armed} onRequest={requestLoad} labelTone="plain" />}
            {!loading && !hasMore && displayItems.length > 0 && <MobileListEnd label="End of support queue" />}
          </div>
        </div>
      </MobilePageShell>
    </PullToRefresh>
  );
};
