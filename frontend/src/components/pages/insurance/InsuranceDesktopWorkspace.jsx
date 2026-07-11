import React, { useRef } from 'react';
import { AlertTriangle, CheckCircle, Clock, DollarSign, Eye, Info, Shield } from 'lucide-react';
import { WorkspaceStage, DetailRailShell, RailInsetHero } from '../../console/WorkspaceStage';
import { SignalPanel } from '../../console/SignalPanel';
import { KpiStrip } from '../../console/KpiStrip';
import { ActivitySheet, SheetToolbar, SortableColumnHeader, ListRowShell } from '../../console/ActivitySheet';
import { DetailLine, EmptyState, LoadErrorState, Shimmer, StatusPill } from '../../console/primitives';
import { Button } from '../../ui/button';
import { Checkbox } from '../../ui/checkbox';
import { useListKeyboardNav, useScrollResetOnPage } from '../../../hooks/useListKeyboardNav';

const OPTIONS = [
  { id: 'all', label: 'Policies', icon: Shield, countKey: 'total', colorClass: 'text-sky-700 dark:text-sky-200', activeClass: 'bg-sky-500/10 text-sky-700 shadow-e2 dark:text-sky-200' },
  { id: 'active', label: 'Active', icon: CheckCircle, countKey: 'active', colorClass: 'text-emerald-700 dark:text-emerald-200', activeClass: 'bg-emerald-500/10 text-emerald-700 shadow-e2 dark:text-emerald-200' },
  { id: 'pending', label: 'Pending', icon: Clock, countKey: 'pending', colorClass: 'text-cyan-700 dark:text-cyan-200', activeClass: 'bg-cyan-500/10 text-cyan-700 shadow-e2 dark:text-cyan-200' },
  { id: 'expired', label: 'Expired', icon: AlertTriangle, countKey: 'expired', colorClass: 'text-amber-700 dark:text-amber-200', activeClass: 'bg-amber-500/10 text-amber-700 shadow-e2 dark:text-amber-200' },
  { id: 'unverified', label: 'Unverified', icon: Eye, countKey: 'unverified', colorClass: 'text-muted-foreground', activeClass: 'bg-foreground/[0.055] text-foreground shadow-e2 dark:bg-white/[0.06]' },
];
const IMPORTANCE = { all: 0, active: 1, pending: 2, expired: 3, unverified: 4 };
const GRID = 'grid-cols-[28px_minmax(210px,1.8fr)_minmax(120px,1fr)_minmax(100px,auto)_minmax(105px,auto)_96px]';
const TONES = { primary: 'bg-sky-500/10 text-sky-700 shadow-e2 dark:text-sky-200', clear: 'bg-emerald-500/10 text-emerald-700 shadow-e2 dark:text-emerald-200', warning: 'bg-amber-500/10 text-amber-700 shadow-e2 dark:text-amber-200', danger: 'bg-destructive/12 text-destructive shadow-e2', muted: 'bg-foreground/[0.055] text-muted-foreground dark:bg-white/[0.06]' };

const count = (stats, rows, id) => {
  const key = OPTIONS.find((option) => option.id === id)?.countKey || 'total';
  const value = Number(stats?.[key]);
  if (Number.isFinite(value)) return value;
  if (id === 'all') return rows.length;
  if (id === 'unverified') return rows.filter((row) => !row.verified).length;
  return rows.filter((row) => row.status === id).length;
};
const statusTone = (status) => status === 'active' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200' : status === 'expired' ? 'bg-amber-500/10 text-amber-700 dark:text-amber-200' : 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-200';
const date = (value) => value && !Number.isNaN(new Date(value).getTime()) ? new Date(value).toLocaleDateString() : 'Not set';
const money = (value) => Number.isFinite(Number(value)) ? `$${Number(value).toLocaleString()}` : 'Not set';

export const InsuranceDesktopWorkspace = ({ rows, stats, loading, isFetching, error, filters, setFilters, filterSheetOpen, openFilters, retry, clearFilters, pagination, sortConfig, onSort, focusedPolicy, setFocused, onView, selection, onUnavailable, moduleRailItems, routingPath, onRailNavigate }) => {
  const listRef = useRef(null);
  const loadError = error;
  const failedEmpty = Boolean(loadError) && rows.length === 0;
  // arrival-toast excluded by decision: policy projection is read-only and realtime
  // refreshes replace evidence without implying a newly actionable command.
  // deep-link excluded by decision: no canonical policy URL contract is proved yet.
  // submit-spinner excluded by decision: the reachable modal is read-only and no
  // policy submit receiver exists; unavailable commands never enter a pending state.
  const active = filters.kpiFilter || 'all';
  const activeOption = OPTIONS.find((option) => option.id === active) || OPTIONS[0];
  const activeCount = count(stats, rows, active);
  const signal = failedEmpty
    ? { icon: AlertTriangle, tone: 'danger', label: 'Load failed', headline: 'Insurance did not load', subhead: 'Retry to load the policy projection.' }
    : { icon: activeOption.icon, tone: activeCount ? (active === 'active' ? 'clear' : active === 'expired' ? 'warning' : 'primary') : 'muted', label: activeOption.label, headline: activeCount ? `${activeCount} ${active === 'all' ? 'policy record' : activeOption.label.toLowerCase() + ' policy'}${activeCount === 1 ? '' : 's'}` : `No ${activeOption.label.toLowerCase()}`, subhead: 'Review policy evidence and billing outcomes. Changes remain read-only until authority is proved.' };
  useScrollResetOnPage(listRef, pagination.currentPage);
  const onKeyDown = useListKeyboardNav({ items: rows, focusedItem: focusedPolicy, setFocusedId: setFocused, onOpen: onView, scrollRef: listRef, rowAttr: 'data-insurance-row' });
  const hasFilter = Boolean(filters.search || active !== 'all' || filters.status?.length || filters.type?.length || filters.verified || filters.created_at?.start || filters.created_at?.end);

  return <WorkspaceStage moduleRailItems={moduleRailItems} activePath="/insurance" routingPath={routingPath} onRailNavigate={onRailNavigate} rail={<InsuranceRail policy={focusedPolicy} loading={loading} hasFilter={hasFilter} onView={onView} />}>
    <SignalPanel signal={signal} loading={loading} toneClassMap={TONES}>
      <KpiStrip options={OPTIONS} getCount={(id) => count(stats, rows, id)} kpiFilter={active} setKpiFilter={(id) => setFilters((prev) => ({ ...prev, kpiFilter: id }))} loading={loading} isFetching={isFetching} pinnedIds={['active', 'unverified']} importance={IMPORTANCE} defaultId="all" dataAttr="data-insurance-state" />
    </SignalPanel>
    <ActivitySheet loading={loading} isFetching={isFetching} failedEmpty={failedEmpty} pagination={pagination} itemNoun="policies" toolbar={<SheetToolbar searchValue={filters.search} onSearchCommit={(search) => setFilters((prev) => ({ ...prev, search }))} searchPlaceholder="Search holder, policy, or provider..." searchTestId="insurance-sheet-search" onRefresh={retry} refreshing={isFetching} refreshNoun="policies" onOpenFilters={openFilters} filterSheetOpen={filterSheetOpen} filtersActive={hasFilter} />} errorBanner={error && rows.length ? <div className="mt-3 rounded-inner bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">Insurance did not refresh. Showing the last loaded policy rows.</div> : null}>
      <div ref={listRef} tabIndex={0} onKeyDown={onKeyDown} aria-label="Insurance policies list" style={{ outline: 'none' }} className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-card bg-background/30 p-3 no-scrollbar dark:bg-black/[0.08]" data-testid="insurance-list">
        <div className={`grid ${GRID} items-center gap-2 px-4 pb-3 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground`}>
          <Checkbox checked={selection.someSelected ? 'indeterminate' : selection.allSelected} onCheckedChange={selection.handleSelectAll} aria-label={selection.allSelected ? 'Clear policy selection' : 'Select all policies'} className="h-4 w-4" />
          <span>Policy</span><span>Provider</span><span>Status</span><SortableColumnHeader label="Added" sortKey="created_at" sortConfig={sortConfig} onSort={onSort} /><span className="justify-self-end">Action</span>
        </div>
        {loading && <div className="space-y-2">{Array.from({ length: 7 }, (_, index) => <Shimmer key={index} className="h-[80px] rounded-card" />)}</div>}
        {!loading && failedEmpty && <LoadErrorState title="Insurance did not load" message={error} onRetry={retry} />}
        {!loading && !error && pagination.totalCount === 0 && <EmptyState icon={Shield} heading={hasFilter ? 'No matching policies' : 'No policies'} body={hasFilter ? 'Change filters or search again.' : 'Policy records for this scope will appear here.'}>{hasFilter && <Button variant="ghost" onClick={clearFilters} className="rounded-pill bg-muted/30 px-5 font-semibold active:scale-95">Show all policies</Button>}</EmptyState>}
        {!loading && rows.map((policy) => <ListRowShell key={policy.id} id={policy.id} dataAttrName="data-insurance-row" gridCols={GRID} selected={focusedPolicy?.id === policy.id} onFocus={() => setFocused(policy.id)} onOpen={() => onView(policy)}>
          <Checkbox checked={selection.selectedIds.includes(policy.id)} onCheckedChange={(value) => selection.handleToggleSelect(policy.id, value)} onClick={(event) => { selection.handleSelectClick(event); event.stopPropagation(); }} aria-label={`Select ${policy.policy_holder_name || policy.policy_number || 'policy'}`} className="h-4 w-4" />
          <div className="flex min-w-0 items-center gap-3"><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-icon ${statusTone(policy.status)}`}><Shield className="h-4 w-4" /></span><div className="min-w-0"><div className="truncate text-[15px] font-semibold">{policy.policy_holder_name || 'Unnamed holder'}</div><div className="mt-1 truncate font-mono text-xs text-muted-foreground">{policy.policy_number || 'No policy number'}</div></div></div>
          <span className="truncate text-sm text-muted-foreground">{policy.provider_name || 'Unknown provider'}</span><StatusPill label={policy.status || 'pending'} className={statusTone(policy.status)} compact /><span className="text-sm text-muted-foreground">{date(policy.created_at)}</span><Button variant="ghost" size="icon" onClick={(event) => { event.stopPropagation(); onView(policy); }} className="h-8 w-8 justify-self-end rounded-pill bg-background/45 text-muted-foreground hover:bg-foreground hover:text-background" aria-label="View policy"><Eye className="h-4 w-4" /></Button>
        </ListRowShell>)}
      </div>
      {selection.selectedIds.length > 0 && <div className="mt-3 flex items-center justify-between rounded-inner bg-muted/30 px-4 py-3 text-sm"><span>{selection.selectedIds.length} selected</span><Button variant="ghost" data-state="unavailable" onClick={() => onUnavailable('Bulk policy changes')} className="rounded-pill bg-background/60 font-semibold">Changes unavailable</Button></div>}
    </ActivitySheet>
  </WorkspaceStage>;
};

const InsuranceRail = ({ policy, loading, hasFilter, onView }) => {
  if (loading && !policy) return <DetailRailShell><Shimmer className="h-32 rounded-modal" /><div className="mt-4 space-y-2">{[0, 1, 2, 3].map((i) => <Shimmer key={i} className="h-[52px] rounded-inner" />)}</div></DetailRailShell>;
  if (!policy) return <DetailRailShell><div className="flex min-h-[360px] flex-col items-center justify-center text-center"><Shield className="mb-4 h-10 w-10 text-muted-foreground/60" /><h2 className="text-xl font-semibold">No policy selected</h2><p className="mt-2 max-w-[260px] text-sm text-muted-foreground">{hasFilter ? 'Policies matching the current filters will appear here.' : 'Select a policy to inspect its evidence.'}</p></div></DetailRailShell>;
  return <DetailRailShell><RailInsetHero><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="text-xl font-semibold">Policy details</h2><p className="mt-1 truncate font-mono text-xs text-muted-foreground">{policy.policy_number || 'No policy number'}</p></div><Button variant="ghost" size="icon" onClick={() => onView(policy)} className="h-9 w-9 rounded-pill bg-muted/30" aria-label="Open full policy details"><Info className="h-4 w-4" /></Button></div><div className={`mt-4 inline-flex rounded-pill px-3 py-1 text-xs font-semibold ${statusTone(policy.status)}`}>{policy.status || 'pending'}</div><h3 className="mt-4 truncate text-lg font-semibold">{policy.policy_holder_name || 'Unnamed holder'}</h3><p className="mt-1 truncate text-sm text-muted-foreground">{policy.provider_name || 'Unknown provider'}</p></RailInsetHero><div className="space-y-2"><DetailLine icon={Shield} label="Verification" value={policy.verified ? 'Verified' : 'Not verified'} /><DetailLine icon={DollarSign} label="Coverage" value={money(policy.coverage_amount)} /><DetailLine icon={Clock} label="Expires" value={date(policy.end_date)} /><DetailLine icon={Info} label="Plan type" value={policy.policy_type || policy.coverage_type || policy.plan_type || 'Not set'} /></div><Button onClick={() => onView(policy)} className="mt-5 h-12 w-full rounded-button bg-foreground text-background hover:bg-foreground/90"><Eye className="mr-2 h-4 w-4" />View details</Button><div role="note" className="mt-3 rounded-inner bg-muted/25 px-4 py-3 text-sm text-muted-foreground">Policy changes remain read-only until admin authority is verified.</div></DetailRailShell>;
};
