import React, { useRef } from 'react';
import { AlertTriangle, BadgeDollarSign, Building2, Clock, Globe, Info } from 'lucide-react';
import { WorkspaceStage, DetailRailShell, RailInsetHero } from '../../console/WorkspaceStage';
import { SignalPanel } from '../../console/SignalPanel';
import { KpiStrip } from '../../console/KpiStrip';
import { ActivitySheet, SheetToolbar, SortableColumnHeader, ListRowShell } from '../../console/ActivitySheet';
import { DetailLine, EmptyState, LoadErrorState, Shimmer, StatusPill } from '../../console/primitives';
import { Button } from '../../ui/button';
import { Checkbox } from '../../ui/checkbox';
import { useListKeyboardNav, useScrollResetOnPage } from '../../../hooks/useListKeyboardNav';

const OPTIONS = [
  { id: 'all', label: 'Rules', icon: BadgeDollarSign, countKey: 'total', colorClass: 'text-sky-700 dark:text-sky-200', activeClass: 'bg-sky-500/10 text-sky-700 shadow-e2 dark:text-sky-200' },
  { id: 'override', label: 'Facility', icon: Building2, countKey: 'facilityPriceCount', colorClass: 'text-emerald-700 dark:text-emerald-200', activeClass: 'bg-emerald-500/10 text-emerald-700 shadow-e2 dark:text-emerald-200' },
  { id: 'global', label: 'Platform', icon: Globe, countKey: 'globalFallbackCount', colorClass: 'text-amber-700 dark:text-amber-200', activeClass: 'bg-amber-500/10 text-amber-700 shadow-e2 dark:text-amber-200' },
];
const GRID = 'grid-cols-[minmax(220px,1.8fr)_minmax(120px,1fr)_minmax(105px,auto)_minmax(110px,auto)_96px]';
const GRID_SELECT = 'grid-cols-[28px_minmax(220px,1.8fr)_minmax(120px,1fr)_minmax(105px,auto)_minmax(110px,auto)_96px]';
const TONES = { primary: 'bg-sky-500/10 text-sky-700 shadow-e2 dark:text-sky-200', clear: 'bg-emerald-500/10 text-emerald-700 shadow-e2 dark:text-emerald-200', warning: 'bg-amber-500/10 text-amber-700 shadow-e2 dark:text-amber-200', danger: 'bg-destructive/12 text-destructive shadow-e2', muted: 'bg-foreground/[0.055] text-muted-foreground dark:bg-white/[0.06]' };
const count = (summary, total, id) => id === 'all' ? Number(summary?.totalCount ?? total ?? 0) : Number(summary?.[OPTIONS.find((option) => option.id === id)?.countKey] || 0);
const name = (row) => row.name || row.service_name || row.room_name || 'Unnamed pricing rule';
const amount = (row) => new Intl.NumberFormat('en-US', { style: 'currency', currency: row.currency || 'USD' }).format(Number(row.amount ?? row.base_price ?? row.price_per_night ?? 0) || 0);
const date = (value) => value && !Number.isNaN(new Date(value).getTime()) ? new Date(value).toLocaleDateString() : 'Not set';
const isGlobal = (row) => !row.hospital_id && !row.hospitalId;
const scopeTone = (row) => isGlobal(row) ? 'bg-amber-500/10 text-amber-700 dark:text-amber-200' : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200';

export const PricingDesktopWorkspace = ({ rows, summary, totalCount, loading, isFetching, error, filters, setFilters, retry, pagination, sortConfig, onSort, focusedPrice, setFocused, selectable = false, selectedIds = [], allSelected = false, someSelected = false, onToggleSelect, onSelectClick, onSelectAll, moduleRailItems, routingPath, onRailNavigate }) => {
  const listRef = useRef(null);
  const failedEmpty = Boolean(error) && rows.length === 0;
  const active = filters.kpiFilter || 'all';
  const option = OPTIONS.find((item) => item.id === active) || OPTIONS[0];
  const activeCount = count(summary, totalCount, active);
  const hasFilter = Boolean(filters.search || active !== 'all' || filters.family !== 'all');
  const signalHeadline = activeCount
    ? `${activeCount} ${active === 'all' ? 'pricing ' : `${option.label.toLowerCase()} `}rule${activeCount === 1 ? '' : 's'}`
    : active === 'all' ? 'No pricing rules' : `No ${option.label.toLowerCase()} rules`;
  const signal = failedEmpty ? { icon: AlertTriangle, tone: 'danger', label: 'Load failed', headline: 'Pricing did not load', subhead: 'Try again to view pricing rules.' } : { icon: option.icon, tone: activeCount ? (active === 'override' ? 'clear' : active === 'global' ? 'warning' : 'primary') : 'muted', label: option.label, headline: signalHeadline, subhead: 'Review platform fallbacks and facility prices. Select a facility before changing prices.' };
  const grid = selectable ? GRID_SELECT : GRID;
  useScrollResetOnPage(listRef, pagination.currentPage);
  const onKeyDown = useListKeyboardNav({ items: rows, focusedItem: focusedPrice, setFocusedId: setFocused, onOpen: (row) => setFocused(row.id), scrollRef: listRef, rowAttr: 'data-pricing-row' });

  return <WorkspaceStage moduleRailItems={moduleRailItems} activePath="/pricing" routingPath={routingPath} onRailNavigate={onRailNavigate} rail={<PricingRail price={focusedPrice} loading={loading} hasFilter={hasFilter} />}>
    <SignalPanel signal={signal} loading={loading} toneClassMap={TONES}><KpiStrip options={OPTIONS} getCount={(id) => count(summary, totalCount, id)} kpiFilter={active} setKpiFilter={(id) => setFilters((prev) => ({ ...prev, kpiFilter: id }))} loading={loading} isFetching={isFetching} pinnedIds={['override', 'global']} importance={{ all: 0, override: 1, global: 2 }} defaultId="all" dataAttr="data-pricing-state" /></SignalPanel>
    <ActivitySheet loading={loading} isFetching={isFetching} failedEmpty={failedEmpty} pagination={pagination} itemNoun="pricing rules" toolbar={<SheetToolbar searchValue={filters.search} onSearchCommit={(search) => setFilters((prev) => ({ ...prev, search }))} searchPlaceholder="Search pricing rules..." searchTestId="pricing-sheet-search" onRefresh={retry} refreshing={isFetching} refreshNoun="pricing rules" />} errorBanner={error && rows.length ? <div className="mt-3 rounded-inner bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">Pricing did not refresh. Showing the previous results.</div> : null}>
      <div className="mt-3 flex gap-1 rounded-inner bg-muted/20 p-1">{['all', 'services', 'rooms'].map((family) => <button key={family} type="button" onClick={() => setFilters((prev) => ({ ...prev, family }))} className={`h-9 rounded-button px-4 text-sm font-semibold capitalize transition-colors ${filters.family === family ? 'bg-background shadow-e1 text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>{family}</button>)}</div>
      <div ref={listRef} tabIndex={0} onKeyDown={onKeyDown} aria-label="Pricing rules list" style={{ outline: 'none' }} className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-card bg-background/30 p-3 no-scrollbar dark:bg-black/[0.08]">
        <div className={`grid ${grid} items-center gap-2 px-4 pb-3 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground`}>
          {selectable && <Checkbox checked={someSelected ? 'indeterminate' : allSelected} onCheckedChange={onSelectAll} onClick={(event) => event.stopPropagation()} aria-label={allSelected ? 'Clear pricing selection' : 'Select all pricing rules'} className="h-4 w-4" />}
          <span>Rule</span><span>Family</span><span>Applies to</span><SortableColumnHeader label="Updated" sortKey="updated_at" sortConfig={sortConfig} onSort={onSort} /><span className="justify-self-end">Action</span>
        </div>
        {loading && <div className="space-y-2">{Array.from({ length: 7 }, (_, index) => <Shimmer key={index} className="h-[80px] rounded-card" />)}</div>}
        {!loading && failedEmpty && <LoadErrorState title="Pricing did not load" message={error} onRetry={retry} />}
        {!loading && !error && totalCount === 0 && <EmptyState icon={BadgeDollarSign} heading={hasFilter ? 'No matching pricing rules' : 'No pricing rules'} body={hasFilter ? 'Change the family, price source, or search.' : 'Pricing rules will appear here.'}>{hasFilter && <Button variant="ghost" onClick={() => setFilters((prev) => ({ ...prev, search: '', family: 'all', kpiFilter: 'all' }))} className="rounded-pill bg-muted/30 px-5 font-semibold active:scale-95">Show all pricing rules</Button>}</EmptyState>}
        {!loading && rows.map((row) => {
          const checked = selectedIds.includes(row.id);
          const ruleName = name(row);
          return <ListRowShell key={`${row.family || row._pricingType}-${row.id}`} id={row.id} dataAttrName="data-pricing-row" gridCols={grid} selected={focusedPrice?.id === row.id} onFocus={() => setFocused(row.id)} onOpen={() => setFocused(row.id)}>
            {selectable && <Checkbox checked={checked} onCheckedChange={(value) => onToggleSelect?.(row.id, value)} onClick={(event) => { onSelectClick?.(event); event.stopPropagation(); }} aria-label={checked ? `Deselect ${ruleName}` : `Select ${ruleName}`} className="h-4 w-4" />}
            <div className="flex min-w-0 items-center gap-3"><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-icon ${scopeTone(row)}`}>{isGlobal(row) ? <Globe className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}</span><div className="min-w-0"><div className="truncate text-[15px] font-semibold">{ruleName}</div><div className="mt-1 text-xs text-muted-foreground">{amount(row)}</div></div></div><span className="text-sm capitalize text-muted-foreground">{row.family || row._pricingType || 'service'}</span><StatusPill label={isGlobal(row) ? 'Platform' : 'Facility'} className={scopeTone(row)} compact /><span className="text-sm text-muted-foreground">{date(row.updated_at || row.created_at)}</span><Button variant="ghost" size="icon" onClick={(event) => { event.stopPropagation(); setFocused(row.id); }} className="h-8 w-8 justify-self-end rounded-pill bg-background/45 text-muted-foreground hover:bg-foreground hover:text-background" aria-label="Inspect pricing rule"><Info className="h-4 w-4" /></Button>
          </ListRowShell>;
        })}
      </div>
    </ActivitySheet>
  </WorkspaceStage>;
};

const PricingRail = ({ price, loading, hasFilter }) => {
  if (loading && !price) return <DetailRailShell><Shimmer className="h-32 rounded-modal" /><div className="mt-4 space-y-2">{[0, 1, 2, 3].map((i) => <Shimmer key={i} className="h-[52px] rounded-inner" />)}</div></DetailRailShell>;
  if (!price) return <DetailRailShell><div className="flex min-h-[360px] flex-col items-center justify-center text-center"><BadgeDollarSign className="mb-4 h-10 w-10 text-muted-foreground/60" /><h2 className="text-xl font-semibold">No rule selected</h2><p className="mt-2 max-w-[260px] text-sm text-muted-foreground">{hasFilter ? 'Rules matching the current filters will appear here.' : 'Select a pricing rule to view its details.'}</p></div></DetailRailShell>;
  return <DetailRailShell><RailInsetHero><div className="min-w-0"><h2 className="text-xl font-semibold">Pricing details</h2><p className="mt-1 truncate text-xs text-muted-foreground">{name(price)}</p></div><div className={`mt-4 inline-flex rounded-pill px-3 py-1 text-xs font-semibold ${scopeTone(price)}`}>{isGlobal(price) ? 'Platform fallback' : 'Facility price'}</div><h3 className="mt-4 text-2xl font-semibold">{amount(price)}</h3></RailInsetHero><div className="space-y-2"><DetailLine icon={BadgeDollarSign} label="Family" value={price.family || price._pricingType || 'service'} /><DetailLine icon={isGlobal(price) ? Globe : Building2} label="Applies to" value={isGlobal(price) ? 'Platform fallback' : price.facilityName || 'Facility price'} /><DetailLine icon={Building2} label="Facility" value={price.facilityName || 'Not assigned'} /><DetailLine icon={Clock} label="Updated" value={date(price.updated_at || price.created_at)} /></div><div role="note" className="mt-5 rounded-inner bg-muted/25 px-4 py-3 text-sm text-muted-foreground">Select a facility before changing prices.</div></DetailRailShell>;
};
