import React, { useMemo, useState, useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Users, Search, Eye, Mail, Clock, Crown, BadgeCheck, SlidersHorizontal, BarChart3 } from 'lucide-react';
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
import { MobileDetailSheet } from './MobileDetailSheet';
import { resolveVital } from '../../constants/vitalTracks';
import { groupByMonth } from '../../utils/groupByMonth';

const formatLabel = (value, fallback = 'Unknown') => {
  const text = String(value || fallback).replace(/_/g, ' ').trim();
  return text ? text.replace(/\b\w/g, (letter) => letter.toUpperCase()) : fallback;
};

export const MobileSubscriptions = ({
  subscribers = [],
  filters,
  setFilters,
  onView,
  onRefresh,
  loading = false,
  onOpenFilters,
  onViewAnalytics,
  selectedIds = [],
  onSelect,
  onSelectAll,
  hasMore = false,
  onLoadMore
}) => {
  const [activeSubscriber, setActiveSubscriber] = useState(null);
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
    { id: 'all', label: 'Subscribers', value: counts.total, color: 'hsl(var(--foreground))', delta: 'Shown', direction: 'flat' },
    { id: 'active', label: 'Active', value: counts.active, color: 'hsl(160 60% 40%)', delta: 'Shown', direction: 'flat' },
    { id: 'paid', label: 'Paid', value: counts.paid, color: 'hsl(38 92% 45%)', delta: 'Shown', direction: 'flat' },
    { id: 'free', label: 'Free', value: counts.free, color: 'hsl(var(--muted-foreground))', delta: 'Shown', direction: 'flat' }
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
              color: 'hsl(38 92% 45%)',
              chartData: [{ value: 24 }, { value: 30 }, { value: 36 }, { value: 44 }, { value: 46 }, { value: 53 }]
            },
            {
              label: 'Active share',
              value: `${Math.round(((counts.active || 0) / (counts.total || 1)) * 100)}%`,
              trend: periodTrends.activeMix.deltaText,
              icon: Users,
              color: 'hsl(199 89% 48%)',
              chartData: [{ value: 22 }, { value: 27 }, { value: 33 }, { value: 39 }, { value: 43 }, { value: 48 }]
            },
            {
              label: 'Shown',
              value: counts.total,
              trend: 'Loaded',
              icon: Mail,
              color: 'hsl(var(--foreground))',
              chartData: [{ value: 14 }, { value: 18 }, { value: 22 }, { value: 26 }, { value: 30 }, { value: 34 }]
            },
            {
              label: 'Paid type',
              value: counts.paid,
              trend: 'Loaded',
              icon: BadgeCheck,
              color: 'hsl(160 60% 40%)',
              chartData: [{ value: 12 }, { value: 16 }, { value: 19 }, { value: 23 }, { value: 27 }, { value: 31 }]
            }
          ]}
        />

        <section className="mb-3">
          <MobileSectionHeader
            label="Subscriber mix"
            count={counts.total}
            color="hsl(38 92% 45%)"
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
                color: 'hsl(38 92% 45%)',
                trendDirection: periodTrends.paidMix.direction,
                trendText: periodTrends.paidMix.deltaText
              },
              {
                icon: Users,
                title: 'Active Mix',
                subtitle: 'Status share',
                value: `${Math.round(((counts.active || 0) / (counts.total || 1)) * 100)}%`,
                color: 'hsl(199 89% 48%)',
                trendDirection: periodTrends.activeMix.direction,
                trendText: periodTrends.activeMix.deltaText
              },
              {
                icon: Mail,
                title: 'Shown',
                subtitle: 'Loaded rows',
                value: counts.total,
                color: 'hsl(var(--foreground))',
                trendDirection: 'flat',
                trendText: 'Loaded'
              },
              {
                icon: BadgeCheck,
                title: 'Paid',
                subtitle: 'Type label',
                value: counts.paid,
                color: 'hsl(160 60% 40%)',
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
          color="hsl(var(--foreground))"
          onSelectAll={onSelectAll ? () => onSelectAll(selectedIds.length !== displaySubscribers.length) : null}
          isAllSelected={displaySubscribers.length > 0 && selectedIds.length === displaySubscribers.length}
        />

        <div className="space-y-1">
          <AnimatePresence mode="popLayout">
            {/* Date-grouped feed (rollout S5): newest-first, a month header at each
                boundary. Grouping is render-only; the active-record state is id-agnostic. */}
            {groupByMonth(displaySubscribers, (sub) => sub.subscription_date || sub.created_at).map(({ item: sub, header }) => {
              const vital = resolveVital('subscription', sub.status);
              const paid = sub.type === 'paid';
              return (
                <React.Fragment key={sub.id}>
                  {header && (
                    <div className="px-2 pb-1 pt-3 text-[11px] font-semibold text-muted-foreground/70">
                      {header}
                    </div>
                  )}
                  {/* Tap opens the detail bottom sheet (MobileDetailSheet) - the approved
                      design + desktop rail behaviour - not an inline dropdown. */}
                  <MobileMetricRow
                    icon={paid ? Crown : Users}
                    color={vital?.accent || 'hsl(var(--muted-foreground))'}
                    label="Subscriber"
                    value={sub.email || 'No email'}
                    secondary={`${formatLabel(sub.type, 'Free')} plan`}
                    statusPill={vital?.pill}
                    onClick={() => setActiveSubscriber(sub)}
                    isSelected={selectedIds.includes(sub.id)}
                    onSelect={onSelect ? (id) => onSelect(id, !selectedIds.includes(id)) : null}
                    selectionMode={selectionMode}
                  />
                </React.Fragment>
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

        {activeSubscriber && (() => {
          const vital = resolveVital('subscription', activeSubscriber.status);
          const paid = activeSubscriber.type === 'paid';
          // Read-only: a single Details CTA. No edit/delete/status/email - subscriber
          // command authority stays fail-closed and unauthorized here.
          return (
            <MobileDetailSheet
              isOpen={!!activeSubscriber}
              onClose={() => setActiveSubscriber(null)}
              icon={paid ? Crown : Users}
              iconTone={vital?.tone}
              eyebrow="Subscriber"
              title={activeSubscriber.email || 'No email'}
              statusPill={vital?.pill}
              vital={vital ? { ...vital, label: 'Subscription status' } : null}
              islands={[
                { icon: Mail, label: 'Email', value: activeSubscriber.email || 'No email' },
                { icon: Crown, label: 'Plan', value: formatLabel(activeSubscriber.type, 'Free') },
                { icon: BadgeCheck, label: 'Status', value: formatLabel(activeSubscriber.status) },
                { icon: Clock, label: 'Subscribed', value: activeSubscriber.subscription_date ? new Date(activeSubscriber.subscription_date).toLocaleDateString() : 'Date unknown' },
                { icon: Mail, label: 'Welcome email', value: activeSubscriber.welcome_email_sent ? 'Sent' : 'Pending' },
              ]}
              primary={{ label: 'Details', icon: Eye, onClick: () => { setActiveSubscriber(null); onView(activeSubscriber); } }}
            />
          );
        })()}
      </MobilePageShell>
    </PullToRefresh>
  );
};


