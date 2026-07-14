import React, { useRef } from 'react';
import { AlertTriangle, Clock, Crown, Eye, Info, Mail, UserPlus, Users } from 'lucide-react';
import { WorkspaceStage, DetailRailShell, RailInsetHero } from '../../console/WorkspaceStage';
import { SignalPanel } from '../../console/SignalPanel';
import { KpiStrip } from '../../console/KpiStrip';
import { ActivitySheet, SheetToolbar, SortableColumnHeader, ListRowShell } from '../../console/ActivitySheet';
import { DetailLine, EmptyState, LoadErrorState, Shimmer, StatusPill } from '../../console/primitives';
import { Button } from '../../ui/button';
import { Checkbox } from '../../ui/checkbox';
import { useListKeyboardNav, useScrollResetOnPage } from '../../../hooks/useListKeyboardNav';
import { getSubscriberStatusTone } from './subscriptionPageModel';

const OPTIONS = [
  { id: 'all', label: 'Subscribers', icon: Users, countKey: 'total', colorClass: 'text-sky-700 dark:text-sky-200', activeClass: 'bg-sky-500/10 text-sky-700 shadow-e2 dark:text-sky-200' },
  { id: 'pending', label: 'Pending', icon: Clock, countKey: 'pending', colorClass: 'text-cyan-700 dark:text-cyan-200', activeClass: 'bg-cyan-500/10 text-cyan-700 shadow-e2 dark:text-cyan-200' },
  { id: 'new', label: 'New subscribers', icon: UserPlus, countKey: 'newUsers', colorClass: 'text-emerald-700 dark:text-emerald-200', activeClass: 'bg-emerald-500/10 text-emerald-700 shadow-e2 dark:text-emerald-200' },
];
const GRID = 'grid-cols-[minmax(220px,1.8fr)_minmax(105px,auto)_minmax(100px,auto)_minmax(110px,auto)_96px]';
const GRID_SELECT = 'grid-cols-[28px_minmax(220px,1.8fr)_minmax(105px,auto)_minmax(100px,auto)_minmax(110px,auto)_96px]';
const TONES = { primary: 'bg-sky-500/10 text-sky-700 shadow-e2 dark:text-sky-200', clear: 'bg-emerald-500/10 text-emerald-700 shadow-e2 dark:text-emerald-200', warning: 'bg-amber-500/10 text-amber-700 shadow-e2 dark:text-amber-200', danger: 'bg-destructive/12 text-destructive shadow-e2', muted: 'bg-foreground/[0.055] text-muted-foreground dark:bg-white/[0.06]' };
const count = (stats, id) => Number(stats?.[OPTIONS.find((option) => option.id === id)?.countKey || 'total'] || 0);
const date = (value) => value && !Number.isNaN(new Date(value).getTime()) ? new Date(value).toLocaleDateString() : 'Not set';

export const SubscriptionsDesktopWorkspace = ({ rows, stats, denied, loading, isFetching, error, filters, setFilters, filterSheetOpen, openFilters, retry, clearFilters, pagination, sortConfig, onSort, focusedSubscriber, setFocused, onView, selectable = false, selectedIds = [], allSelected = false, someSelected = false, onToggleSelect, onSelectClick, onSelectAll, moduleRailItems, routingPath, onRailNavigate }) => {
  const listRef = useRef(null);
  const loadError = error;
  const failedEmpty = !denied && Boolean(loadError) && rows.length === 0;
  const active = filters.kpiFilter || 'all';
  const option = OPTIONS.find((item) => item.id === active) || OPTIONS[0];
  const activeCount = count(stats, active);
  const hasFilter = Boolean(filters.search || active !== 'all' || filters.status?.length || filters.type?.length || filters.welcomeEmailSent || (filters.dateRange && filters.dateRange !== 'all'));
  const signalHeadline = activeCount
    ? `${activeCount} ${active === 'pending' ? 'pending ' : active === 'new' ? 'new ' : ''}subscriber${activeCount === 1 ? '' : 's'}`
    : active === 'pending' ? 'No pending subscribers' : active === 'new' ? 'No new subscribers' : 'No subscribers';
  const signal = denied ? { icon: Users, tone: 'muted', label: 'Access unavailable', headline: 'Subscriber access is unavailable', subhead: 'This account does not have access to subscriber records.' } : failedEmpty ? { icon: AlertTriangle, tone: 'danger', label: 'Load failed', headline: 'Subscribers did not load', subhead: 'Try again to view subscribers.' } : { icon: option.icon, tone: activeCount ? (active === 'new' ? 'clear' : 'primary') : 'muted', label: option.label, headline: signalHeadline, subhead: 'View subscriber status, plan type, and welcome email details. Subscriber and email changes are currently unavailable.' };
  useScrollResetOnPage(listRef, pagination.currentPage);
  const onKeyDown = useListKeyboardNav({ items: rows, focusedItem: focusedSubscriber, setFocusedId: setFocused, onOpen: onView, scrollRef: listRef, rowAttr: 'data-subscription-row' });
  // Selection is navigation-only until a subscriber command receiver is proved. The page owns
  // the visible-row selection state; this workspace only renders its admin-gated controls.

  return <WorkspaceStage moduleRailItems={moduleRailItems} activePath="/subscriptions" routingPath={routingPath} onRailNavigate={onRailNavigate} rail={<SubscriberDetailRail subscriber={focusedSubscriber} denied={denied} loading={loading} hasFilter={hasFilter} onView={onView} />}>
    <SignalPanel signal={signal} loading={loading} toneClassMap={TONES}><KpiStrip options={OPTIONS} getCount={(id) => count(stats, id)} kpiFilter={active} setKpiFilter={(id) => setFilters((prev) => ({ ...prev, kpiFilter: id }))} loading={loading} isFetching={isFetching} pinnedIds={['pending', 'new']} importance={{ all: 0, pending: 1, new: 2 }} defaultId="all" dataAttr="data-subscription-state" /></SignalPanel>
    <ActivitySheet loading={loading} isFetching={isFetching} failedEmpty={failedEmpty} pagination={pagination} itemNoun="subscribers" toolbar={<SheetToolbar searchValue={filters.search} onSearchCommit={(search) => setFilters((prev) => ({ ...prev, search }))} searchPlaceholder="Search subscriber email..." searchTestId="subscriptions-sheet-search" onRefresh={retry} refreshing={isFetching} refreshNoun="subscribers" onOpenFilters={openFilters} filterSheetOpen={filterSheetOpen} filtersActive={hasFilter} />} errorBanner={!denied && error && rows.length ? <div className="mt-3 rounded-inner bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">Subscribers did not refresh. Showing the previous results.</div> : null}>
      <div ref={listRef} role="list" tabIndex={0} onKeyDown={onKeyDown} aria-label="Subscribers list" style={{ outline: 'none' }} className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-card bg-background/30 p-3 no-scrollbar dark:bg-black/[0.08]">
        <SubscriptionsListHeader
          selectable={selectable}
          allSelected={allSelected}
          someSelected={someSelected}
          onSelectAll={onSelectAll}
          sortConfig={sortConfig}
          onSort={onSort}
        />
        {loading && <div className="space-y-2">{Array.from({ length: 7 }, (_, index) => <Shimmer key={index} className="h-[80px] rounded-card" />)}</div>}
        {!loading && denied && <EmptyState icon={Users} heading="Subscriber access unavailable" body="This account does not have access to subscriber records." />}
        {!loading && !denied && failedEmpty && <LoadErrorState title="Subscribers did not load" message={String(error)} onRetry={retry} />}
        {!loading && !denied && !error && pagination.totalCount === 0 && <EmptyState icon={Users} heading={hasFilter ? 'No matching subscribers' : 'No subscribers'} body={hasFilter ? 'Change filters or search again.' : 'Subscriber records will appear here.'}>{hasFilter && <Button variant="ghost" onClick={clearFilters} className="rounded-pill bg-muted/30 px-5 font-semibold active:scale-95">Show all subscribers</Button>}</EmptyState>}
        {!loading && !denied && rows.map((subscriber) => (
          <SubscriberRow
            key={subscriber.id}
            subscriber={subscriber}
            focused={focusedSubscriber?.id === subscriber.id}
            onFocus={() => setFocused(subscriber.id)}
            onView={onView}
            selectable={selectable}
            checked={selectedIds.includes(subscriber.id)}
            onToggleSelect={onToggleSelect}
            onSelectClick={onSelectClick}
          />
        ))}
      </div>
    </ActivitySheet>
  </WorkspaceStage>;
};

const SubscriptionsListHeader = ({ selectable, allSelected, someSelected, onSelectAll, sortConfig, onSort }) => (
  <div className={`grid ${selectable ? GRID_SELECT : GRID} items-center gap-2 px-4 pb-3 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground`}>
    {selectable && (
      <Checkbox
        checked={someSelected ? 'indeterminate' : allSelected}
        onCheckedChange={onSelectAll}
        onClick={(event) => event.stopPropagation()}
        aria-label={allSelected ? 'Clear subscriber selection' : 'Select all subscribers'}
        className="h-4 w-4"
      />
    )}
    <span>Subscriber</span>
    <span>Plan</span>
    <span>Status</span>
    <SortableColumnHeader label="Joined" sortKey="created_at" sortConfig={sortConfig} onSort={onSort} />
    <span className="justify-self-end">Action</span>
  </div>
);

const SubscriberRow = ({ subscriber, focused, onFocus, onView, selectable, checked, onToggleSelect, onSelectClick }) => {
  const email = subscriber.email || 'Unknown subscriber';

  return (
    <ListRowShell
      id={subscriber.id}
      dataAttrName="data-subscription-row"
      gridCols={selectable ? GRID_SELECT : GRID}
      selected={focused}
      onFocus={onFocus}
      onOpen={() => onView(subscriber)}
    >
      {selectable && (
        <Checkbox
          checked={checked}
          onCheckedChange={(value) => onToggleSelect?.(subscriber.id, value)}
          onClick={(event) => {
            onSelectClick?.(event);
            event.stopPropagation();
          }}
          aria-label={checked ? `Deselect ${email}` : `Select ${email}`}
          className="h-4 w-4"
        />
      )}
      <div className="flex min-w-0 items-center gap-3">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-icon ${getSubscriberStatusTone(subscriber.status)}`}>
          <Mail className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <div className="truncate text-[15px] font-semibold">{email}</div>
          <div className="mt-1 text-xs text-muted-foreground">{subscriber.welcome_email_sent ? 'Welcome sent' : 'Welcome pending'}</div>
        </div>
      </div>
      <span className="text-sm capitalize text-muted-foreground">{subscriber.type || 'free'}</span>
      <StatusPill label={subscriber.status || 'pending'} className={getSubscriberStatusTone(subscriber.status)} compact />
      <span className="text-sm text-muted-foreground">{date(subscriber.subscription_date || subscriber.created_at)}</span>
      <Button
        variant="ghost"
        size="icon"
        onClick={(event) => {
          event.stopPropagation();
          onView(subscriber);
        }}
        className="h-8 w-8 justify-self-end rounded-pill bg-background/45 text-muted-foreground hover:bg-foreground hover:text-background"
        aria-label="View subscriber"
      >
        <Eye className="h-4 w-4" />
      </Button>
    </ListRowShell>
  );
};

export const SubscriberDetailRail = ({ subscriber, denied, loading, hasFilter, onView, embedded = false }) => {
  if (loading && !subscriber) return <DetailRailShell embedded={embedded}><Shimmer className="h-32 rounded-modal" /><div className="mt-4 space-y-2">{[0, 1, 2, 3].map((i) => <Shimmer key={i} className="h-[52px] rounded-inner" />)}</div></DetailRailShell>;
  if (denied) return <DetailRailShell embedded={embedded}><div className="flex min-h-[360px] flex-col items-center justify-center text-center"><Users className="mb-4 h-10 w-10 text-muted-foreground/60" /><h2 className="text-xl font-semibold">Subscriber access unavailable</h2><p className="mt-2 max-w-[260px] text-sm text-muted-foreground">This account does not have access to subscriber records.</p></div></DetailRailShell>;
  if (!subscriber) return <DetailRailShell embedded={embedded}><div className="flex min-h-[360px] flex-col items-center justify-center text-center"><Users className="mb-4 h-10 w-10 text-muted-foreground/60" /><h2 className="text-xl font-semibold">No subscriber selected</h2><p className="mt-2 max-w-[260px] text-sm text-muted-foreground">{hasFilter ? 'Subscribers matching the current filters will appear here.' : 'Select a subscriber to view details.'}</p></div></DetailRailShell>;
  return <DetailRailShell embedded={embedded}><RailInsetHero><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="text-xl font-semibold">Subscriber details</h2><p className="mt-1 truncate text-xs text-muted-foreground">{subscriber.email || 'Unknown subscriber'}</p></div><Button variant="ghost" size="icon" onClick={() => onView(subscriber)} className="h-9 w-9 rounded-pill bg-muted/30" aria-label="Open subscriber details"><Info className="h-4 w-4" /></Button></div><div className={`mt-4 inline-flex rounded-pill px-3 py-1 text-xs font-semibold ${getSubscriberStatusTone(subscriber.status)}`}>{subscriber.status || 'pending'}</div></RailInsetHero><div className="space-y-2"><DetailLine icon={Mail} label="Email" value={subscriber.email || 'Not set'} /><DetailLine icon={Crown} label="Plan" value={subscriber.type || 'free'} /><DetailLine icon={Clock} label="Joined" value={date(subscriber.subscription_date || subscriber.created_at)} /><DetailLine icon={Mail} label="Welcome email" value={subscriber.welcome_email_sent ? 'Sent' : 'Pending'} /></div><Button onClick={() => onView(subscriber)} className="mt-5 h-12 w-full rounded-button bg-foreground text-background hover:bg-foreground/90"><Eye className="mr-2 h-4 w-4" />View details</Button><div role="note" className="mt-3 rounded-inner bg-muted/25 px-4 py-3 text-sm text-muted-foreground">You can view subscriber details here. Subscriber and email changes are currently unavailable.</div></DetailRailShell>;
};
