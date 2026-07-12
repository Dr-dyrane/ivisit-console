import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BadgeDollarSign,
  Building2,
  CalendarDays,
  Globe,
  Layers,
} from 'lucide-react';
import {
  GroupPanel,
  Hairline,
  MobileHeading,
  MobileListRow,
  SearchRow,
  SkeletonGroupList,
  UpdatingPillRow,
  useSkeletonWarmup,
} from './canon';
import { MobileKPIStrip } from './MobileKPIStrip';
import { MobileDetailSheet } from './MobileDetailSheet';
import { PullToRefresh } from './PullToRefresh';
import { MobilePageShell } from './MobilePageShell';
import {
  MobileListEmpty,
  MobileListEnd,
  MobileListLoadMore,
  MobileListLoadingMore,
} from './MobileListStates';
import { useStableList } from './useStableList';
import { useLoadMoreControl } from './useLoadMoreControl';
import { statusPill } from '../../constants/vitalTracks';
import { formatRelativeTime } from '../../utils/activityUtils';
import { resolveAdaptiveGroups } from '../../utils/adaptiveGrouping';

// LIST grammar. The page owns a growing server window (page 1 with an expanding
// pageSize), so this component renders the complete received window directly.
// grammar:loadmore-append=PricingManagementPage owns the growing server window.

const formatLabel = (value, fallback = 'Unknown') => String(value || fallback)
  .replace(/_/g, ' ')
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

const amount = (item) => Number(
  item.amount ?? item.base_price ?? item.price_per_night ?? 0
) || 0;

const family = (item) => item.family
  || item._pricingType
  || (item.price_per_night !== undefined ? 'room' : 'service');

const updatedAt = (item) => item.updatedAt || item.updated_at || item.created_at;
const isGlobal = (item) => !item.organization_id && !item.hospital_id;

const MobilePricingAtlasLayer = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden bg-background">
    <div
      className="absolute inset-0 opacity-[0.30] dark:opacity-[0.24]"
      style={{
        backgroundImage:
          'linear-gradient(115deg, transparent 0 45%, hsl(var(--foreground) / 0.06) 45% 48%, transparent 48%), linear-gradient(28deg, transparent 0 42%, hsl(var(--foreground) / 0.05) 42% 45%, transparent 45%), linear-gradient(155deg, transparent 0 64%, hsl(199 89% 48% / 0.07) 64% 67%, transparent 67%)',
        backgroundSize: '260px 180px, 340px 240px, 420px 280px',
        backgroundPosition: '20px 10px, -80px 50px, 18% 38%',
      }}
    />
    <div
      className="absolute inset-0"
      style={{
        background:
          'radial-gradient(circle at 22% 34%, hsl(199 89% 48% / 0.09), transparent 28%), radial-gradient(circle at 78% 62%, hsl(var(--foreground) / 0.06), transparent 26%), linear-gradient(180deg, hsl(var(--background) / 0.22), hsl(var(--background)) 92%)',
      }}
    />
  </div>
);

const money = (item) => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: item.currency || 'USD',
}).format(amount(item));

const PricingFamilyTabs = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'all', label: 'All' },
    { id: 'services', label: 'Services' },
    { id: 'rooms', label: 'Rooms' },
  ];

  return (
    <div
      className="mb-3 grid grid-cols-3 gap-1 rounded-inner bg-muted/20 p-1"
      role="tablist"
      aria-label="Pricing family"
    >
      {tabs.map((tab) => {
        const selected = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            onClick={() => setActiveTab(tab.id)}
            aria-selected={selected}
            className={`h-9 rounded-button text-xs font-semibold transition-all active:scale-[0.96] ${
              selected
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};

export const MobilePricing = ({
  pricing = [],
  allPricing = [],
  loading = false,
  isFetching = false,
  errorMessage = null,
  activeTab = 'all',
  setActiveTab,
  searchTerm = '',
  setSearchTerm,
  kpiFilter = 'all',
  setKpiFilter,
  onRefresh,
  onViewAnalytics,
  actionNotice = '',
  pricingProjection = null,
  hasMore = false,
  onLoadMore,
  isLoadingMore = false,
}) => {
  const observerTarget = useRef(null);
  const [activeItem, setActiveItem] = useState(null);
  const summary = pricingProjection?.summary || {};
  const total = Number(pricingProjection?.totalCount ?? allPricing.length ?? 0);
  const counts = {
    all: total,
    global: Number(summary.globalFallbackCount ?? allPricing.filter(isGlobal).length),
    override: Number(summary.facilityPriceCount ?? allPricing.filter((item) => !isGlobal(item)).length),
  };
  const kpis = [
    { id: 'all', label: 'Rules', value: counts.all, color: 'hsl(var(--muted-foreground))' },
    { id: 'global', label: 'Platform', value: counts.global, color: 'hsl(199 89% 38%)' },
    { id: 'override', label: 'Facility', value: counts.override, color: 'hsl(162 94% 24%)' },
  ];
  const { displayItems, isBuffering } = useStableList(pricing, loading);
  const warmingUp = useSkeletonWarmup();
  const showLoading = warmingUp || (loading && displayItems.length === 0);
  const refetching = Boolean(isFetching);
  const hasFilter = Boolean(searchTerm) || kpiFilter !== 'all' || activeTab !== 'all';
  const scopeCount = kpiFilter === 'global'
    ? counts.global
    : kpiFilter === 'override'
      ? counts.override
      : counts.all;
  const { armed, requestLoad, triggerLoad } = useLoadMoreControl({
    hasMore,
    loading: loading || isLoadingMore,
    onLoadMore,
  });

  useEffect(() => {
    if (!hasMore) return undefined;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) triggerLoad();
    }, { threshold: 0.1, rootMargin: '120px' });
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [hasMore, triggerLoad]);

  const groups = useMemo(() => resolveAdaptiveGroups(displayItems, [
    {
      key: 'scope',
      assign: (item) => (isGlobal(item) ? 'platform' : 'facility'),
      labelFor: (key) => (key === 'platform' ? 'Platform fallback' : 'Facility price'),
      order: (keys) => ['facility', 'platform'].filter((key) => keys.includes(key)),
    },
    { type: 'coarse-recency', key: 'updated', getDate: updatedAt },
  ]).groups, [displayItems]);

  const resetFilters = () => {
    setSearchTerm('');
    setKpiFilter('all');
    setActiveTab('all');
  };

  return (
    <PullToRefresh onRefresh={onRefresh}>
      <MobilePageShell
        animatePageLoad={false}
        contentClassName="relative min-h-[calc(100dvh-3rem)] overflow-hidden px-0 pb-32 pt-8 text-foreground"
      >
        <MobilePricingAtlasLayer />
        <div className="relative z-10 space-y-3">
          <MobileHeading
            title="Pricing"
            noun="rule"
            count={scopeCount}
            summary={showLoading
              ? 'Loading pricing...'
              : errorMessage && displayItems.length === 0
                ? 'Pricing did not load'
                : `${scopeCount} ${scopeCount === 1 ? 'rule' : 'rules'}`}
          />

          <MobileKPIStrip
            loading={showLoading}
            kpis={kpis}
            activeKpi={kpiFilter}
            onKpiClick={setKpiFilter}
          />

          <section className="px-4">
            <PricingFamilyTabs activeTab={activeTab} setActiveTab={setActiveTab} />
            <SearchRow
              placeholder="Search pricing..."
              search={searchTerm}
              onSearchCommit={setSearchTerm}
              entityLabel="pricing"
              onOpenStats={onViewAnalytics}
              statsLabel="Open analytics"
            />
            <UpdatingPillRow show={(refetching || isBuffering) && !showLoading} />

            {actionNotice && (
              <p
                role="status"
                aria-live="polite"
                className="mt-3 rounded-inner bg-muted/20 px-4 py-3 text-xs text-muted-foreground"
              >
                {actionNotice}
              </p>
            )}

            {errorMessage && displayItems.length > 0 && (
              <div className="mt-3 rounded-card bg-amber-500/10 p-4 text-amber-800 dark:text-amber-200">
                <p className="text-sm font-semibold">Pricing did not refresh</p>
                <p className="mt-1 text-xs opacity-80">Showing the last loaded pricing rules.</p>
                <button
                  type="button"
                  onClick={onRefresh}
                  className="mt-3 h-9 rounded-inner bg-amber-500/10 px-4 text-xs font-semibold active:scale-[0.96]"
                >
                  Try again
                </button>
              </div>
            )}

            <div className="mt-3 space-y-[18px]">
              {showLoading ? (
                <SkeletonGroupList groups={2} rowsPerGroup={[3, 2]} trailing="timePill" />
              ) : groups.map((group) => (
                <GroupPanel key={group.key} label={group.label} count={group.items.length}>
                  {group.items.map((item, index) => (
                    <React.Fragment key={item.id}>
                      <MobileListRow
                        item={item}
                        dataAttr="data-mobile-pricing-row"
                        onOpen={setActiveItem}
                        ariaLabel={`${item.name || item.service_name || item.room_name || 'Pricing rule'}, ${money(item)}`}
                        orbClass={isGlobal(item)
                          ? 'bg-sky-500/12 text-sky-700 dark:text-sky-200'
                          : 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-200'}
                        icon={isGlobal(item) ? Globe : Building2}
                        title={item.name || item.service_name || item.room_name || 'Unnamed price'}
                        meta={`${money(item)} / ${family(item) === 'room' ? 'night' : 'unit'}`}
                        time={formatRelativeTime(updatedAt(item))}
                        pill={statusPill(item.status || (item.is_active ? 'active' : 'inactive'))}
                      />
                      {index < group.items.length - 1 && <Hairline />}
                    </React.Fragment>
                  ))}
                </GroupPanel>
              ))}
            </div>

            <div ref={observerTarget} className="min-h-[64px] flex flex-col items-center justify-center gap-2">
              {isLoadingMore && displayItems.length > 0 && <MobileListLoadingMore />}
              {!loading && !isLoadingMore && hasMore && (
                <MobileListLoadMore armed={armed} onRequest={requestLoad} labelTone="plain" />
              )}
              {!loading && !hasMore && displayItems.length > 0 && (
                <MobileListEnd label="End of pricing list" />
              )}
            </div>

            {!showLoading && displayItems.length === 0 && (
              <MobileListEmpty
                icon={BadgeDollarSign}
                label={errorMessage ? 'Pricing did not load' : 'No pricing rules found'}
                reason={errorMessage ? 'error' : searchTerm ? 'search' : hasFilter ? 'filtered' : 'empty'}
                hint={errorMessage || (searchTerm
                  ? `No pricing matches "${searchTerm}".`
                  : hasFilter
                    ? 'Reset filters to view all pricing rules.'
                    : 'Pricing rules for this scope will appear here.')}
                onRecover={errorMessage ? onRefresh : hasFilter ? resetFilters : undefined}
                recoverLabel={errorMessage ? 'Try Again' : searchTerm ? 'Clear Search' : hasFilter ? 'Reset Filters' : undefined}
                labelTone="plain"
              />
            )}
          </section>
        </div>

        {activeItem && (
          <MobileDetailSheet
            isOpen
            onClose={() => setActiveItem(null)}
            icon={BadgeDollarSign}
            iconTone="hsl(var(--foreground))"
            eyebrow={formatLabel(family(activeItem))}
            title={activeItem.name || activeItem.service_name || activeItem.room_name || 'Unnamed price'}
            statusPill={statusPill(activeItem.status || (activeItem.is_active ? 'active' : 'inactive'))}
            islands={[
              { icon: BadgeDollarSign, label: 'Price', value: `${money(activeItem)} / ${family(activeItem) === 'room' ? 'night' : 'unit'}` },
              activeItem.unit ? { icon: Layers, label: 'Unit', value: activeItem.unit } : null,
              (activeItem.facilityName || activeItem.facility_name)
                ? { icon: Building2, label: 'Facility', value: activeItem.facilityName || activeItem.facility_name }
                : { icon: Globe, label: 'Scope', value: 'Platform fallback' },
              { icon: CalendarDays, label: 'Updated', value: updatedAt(activeItem) ? new Date(updatedAt(activeItem)).toLocaleDateString() : 'Date unknown' },
            ]}
          />
        )}
      </MobilePageShell>
    </PullToRefresh>
  );
};
