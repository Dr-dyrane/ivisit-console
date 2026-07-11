import React, { useMemo, useState } from 'react';
import { BadgeDollarSign, Building2, CalendarDays, Eye, Globe, Layers } from 'lucide-react';
import { SearchRow, useSkeletonWarmup, UpdatingPillRow, MobileHeading, GroupPanel, MobileListRow, Hairline, SkeletonGroupPanel } from './canon';
import { MobileKPIStrip } from './MobileKPIStrip';
import { MobileDetailSheet } from './MobileDetailSheet';
import { PullToRefresh } from './PullToRefresh';
import { MobilePageShell } from './MobilePageShell';
import { MobileListEmpty, MobileListEnd } from './MobileListStates';
import { useStableList } from './useStableList';
import { statusPill } from '../../constants/vitalTracks';
import { formatRelativeTime } from '../../utils/activityUtils';
import { resolveAdaptiveGroups } from '../../utils/adaptiveGrouping';

const formatLabel = (value, fallback = 'Unknown') => String(value || fallback).replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const amount = (item) => Number(item.amount ?? item.base_price ?? item.price_per_night ?? 0) || 0;
const family = (item) => item.family || item._pricingType || (item.price_per_night !== undefined ? 'room' : 'service');
const updatedAt = (item) => item.updatedAt || item.updated_at || item.created_at;
const isGlobal = (item) => !item.organization_id && !item.hospital_id;
const money = (item) => new Intl.NumberFormat('en-US', { style: 'currency', currency: item.currency || 'USD' }).format(amount(item));

export const MobilePricing = ({ pricing = [], allPricing = [], loading = false, errorMessage = null, activeTab = 'services', setActiveTab, searchTerm = '', setSearchTerm, kpiFilter = 'all', setKpiFilter, onView, onRefresh, onViewAnalytics, actionNotice = '', pricingProjection = null }) => {
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
  const hasFilter = Boolean(searchTerm) || kpiFilter !== 'all';
  const scopeCount = kpiFilter === 'global' ? counts.global : kpiFilter === 'override' ? counts.override : counts.all;
  const groups = useMemo(() => resolveAdaptiveGroups(displayItems, [
    { key: 'scope', assign: (item) => isGlobal(item) ? 'platform' : 'facility', labelFor: (key) => key === 'platform' ? 'Platform fallback' : 'Facility price', order: (keys) => ['facility', 'platform'].filter((key) => keys.includes(key)) },
    { type: 'coarse-recency', key: 'updated', getDate: updatedAt },
  ]).groups, [displayItems]);

  return <PullToRefresh onRefresh={onRefresh}><MobilePageShell animatePageLoad={false} contentClassName="relative min-h-[calc(100dvh-3rem)] overflow-hidden px-0 pb-32 pt-8 text-foreground"><div className="relative z-10 space-y-3">
    <MobileHeading title="Pricing" noun="rule" count={scopeCount} summary={showLoading ? 'Loading pricing...' : `${scopeCount} ${scopeCount === 1 ? 'rule' : 'rules'}`} />
    <MobileKPIStrip loading={showLoading} kpis={kpis} activeKpi={kpiFilter} onKpiClick={setKpiFilter} />
    <section className="px-4">
      <div className="mb-3 grid grid-cols-3 gap-1 rounded-inner bg-muted/20 p-1" role="tablist" aria-label="Pricing family"><button type="button" onClick={() => setActiveTab('all')} aria-selected={activeTab === 'all'} className={`h-9 rounded-button text-xs font-semibold transition-all active:scale-[0.96] ${activeTab === 'all' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}>All</button><button type="button" onClick={() => setActiveTab('services')} aria-selected={activeTab === 'services'} className={`h-9 rounded-button text-xs font-semibold transition-all active:scale-[0.96] ${activeTab === 'services' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}>Services</button><button type="button" onClick={() => setActiveTab('rooms')} aria-selected={activeTab === 'rooms'} className={`h-9 rounded-button text-xs font-semibold transition-all active:scale-[0.96] ${activeTab === 'rooms' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}>Rooms</button></div>
      <SearchRow placeholder="Search pricing..." search={searchTerm} onSearchCommit={setSearchTerm} entityLabel="pricing" onOpenStats={onViewAnalytics} statsLabel="Open analytics" />
      <UpdatingPillRow show={isBuffering && !showLoading} />
      {actionNotice && <p role="status" aria-live="polite" className="mt-3 rounded-inner bg-muted/20 px-4 py-3 text-xs text-muted-foreground">{actionNotice}</p>}
      <div className="mt-3 space-y-[18px]">{showLoading ? <SkeletonGroupPanel rows={6} /> : groups.map((group) => <GroupPanel key={group.key} label={group.label} count={group.items.length}>{group.items.map((item, index) => <React.Fragment key={item.id}><MobileListRow item={item} dataAttr="data-mobile-pricing-row" onOpen={setActiveItem} ariaLabel={`${item.name || item.service_name || item.room_name || 'Pricing rule'}, ${money(item)}`} orbClass={isGlobal(item) ? 'bg-sky-500/12 text-sky-700 dark:text-sky-200' : 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-200'} icon={isGlobal(item) ? Globe : Building2} title={item.name || item.service_name || item.room_name || 'Unnamed price'} meta={`${money(item)} / ${family(item) === 'room' ? 'night' : 'unit'}`} time={formatRelativeTime(updatedAt(item))} pill={statusPill(item.status || (item.is_active ? 'active' : 'inactive'))} />{index < group.items.length - 1 && <Hairline />}</React.Fragment>)}</GroupPanel>)}</div>
      {!showLoading && displayItems.length === 0 && <MobileListEmpty icon={BadgeDollarSign} label={errorMessage ? 'Pricing did not load' : 'No pricing rules found'} reason={errorMessage ? 'error' : searchTerm ? 'search' : hasFilter ? 'filtered' : 'empty'} hint={errorMessage || (searchTerm ? `No pricing matches "${searchTerm}".` : hasFilter ? 'Reset filters to view all pricing rules.' : 'Pricing rules for this scope will appear here.')} onRecover={errorMessage ? onRefresh : hasFilter ? () => { setSearchTerm(''); setKpiFilter('all'); } : undefined} recoverLabel={errorMessage ? 'Try Again' : searchTerm ? 'Clear Search' : hasFilter ? 'Reset Filters' : undefined} />}
      {!showLoading && displayItems.length > 0 && <MobileListEnd label="End of pricing list" />}
    </section>
  </div>
  {activeItem && <MobileDetailSheet isOpen onClose={() => setActiveItem(null)} icon={BadgeDollarSign} iconTone="hsl(var(--foreground))" eyebrow={formatLabel(family(activeItem))} title={activeItem.name || activeItem.service_name || activeItem.room_name || 'Unnamed price'} statusPill={statusPill(activeItem.status || (activeItem.is_active ? 'active' : 'inactive'))} islands={[{ icon: BadgeDollarSign, label: 'Price', value: `${money(activeItem)} / ${family(activeItem) === 'room' ? 'night' : 'unit'}` }, activeItem.unit ? { icon: Layers, label: 'Unit', value: activeItem.unit } : null, (activeItem.facilityName || activeItem.facility_name) ? { icon: Building2, label: 'Facility', value: activeItem.facilityName || activeItem.facility_name } : { icon: Globe, label: 'Scope', value: 'Platform fallback' }, { icon: CalendarDays, label: 'Updated', value: updatedAt(activeItem) ? new Date(updatedAt(activeItem)).toLocaleDateString() : 'Date unknown' }]} primary={{ label: 'Details', icon: Eye, onClick: () => { const item = activeItem; setActiveItem(null); onView(item); } }} />}
  </MobilePageShell></PullToRefresh>;
};
