import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Check,
  ChevronRight,
  Filter,
  Loader2,
  Minus,
  RefreshCw,
  Search,
} from 'lucide-react';
import { TabletPageShell } from './TabletPageShell';

const defaultStatusClass = 'bg-muted/38 text-muted-foreground';

const TabletIconButton = ({ label, onClick, active = false, disabled = false, children }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    title={label}
    data-state={active ? 'active' : 'idle'}
    className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-icon transition-all active:scale-95 disabled:opacity-40 ${active
      ? 'bg-foreground text-background shadow-e2'
      : 'bg-card/72 text-muted-foreground shadow-e1 hover:bg-foreground/[0.07] hover:text-foreground'
    }`}
  >
    {children}
  </button>
);

export const TabletCheckbox = ({ checked = false, onCheckedChange, label, disabled = false }) => {
  const indeterminate = checked === 'indeterminate';
  const selected = checked === true;
  const active = selected || indeterminate;
  const Icon = indeterminate ? Minus : Check;

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : selected}
      aria-label={label}
      disabled={disabled}
      data-state={indeterminate ? 'indeterminate' : (selected ? 'checked' : 'unchecked')}
      onClick={() => onCheckedChange?.(!selected)}
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-icon shadow-e1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 disabled:cursor-not-allowed disabled:opacity-50 ${active
        ? 'bg-foreground text-background dark:bg-white dark:text-background'
        : 'bg-foreground/[0.08] text-transparent dark:bg-white/[0.10]'
      }`}
    >
      {active && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
    </button>
  );
};

const getVisibleTabletKpis = (options, activeId) => {
  const visible = options.slice(0, 3);
  const active = options.find((option) => option.id === activeId);

  if (!active || visible.some((option) => option.id === activeId)) return visible;
  return [...visible.slice(0, 2), active];
};

export const TabletKpiStrip = ({ options = [], activeId, onChange, loading = false }) => {
  const visibleOptions = getVisibleTabletKpis(options, activeId);

  return (
    <div
      data-tablet-kpis
      className="flex min-h-11 gap-2 overflow-x-auto pb-1 no-scrollbar"
      role="group"
      aria-label="Page scope"
    >
      {visibleOptions.map((option) => {
        const Icon = option.icon;
        const active = option.id === activeId;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange?.(option.id)}
            aria-pressed={active}
            className={`flex h-10 shrink-0 items-center gap-2 rounded-pill px-3 text-xs font-semibold transition-all active:scale-[0.97] ${active
              ? option.activeClass || 'bg-foreground text-background shadow-e2'
              : 'bg-card/68 text-muted-foreground shadow-e1 hover:bg-foreground/[0.06] hover:text-foreground'
            }`}
          >
            {Icon && <Icon className="h-3.5 w-3.5" />}
            <span>{option.label}</span>
            <span className="tabular-nums opacity-75">{loading ? '-' : option.value}</span>
          </button>
        );
      })}
    </div>
  );
};

const TabletSearchToolbar = ({
  searchValue = '',
  onSearchCommit,
  placeholder,
  onOpenFilters,
  filtersActive = false,
  onOpenAnalytics,
  onRefresh,
  refreshing = false,
}) => {
  const [draft, setDraft] = useState(searchValue || '');

  useEffect(() => setDraft(searchValue || ''), [searchValue]);

  const commit = () => {
    if (draft !== (searchValue || '')) onSearchCommit?.(draft);
  };

  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        commit();
      }}
      role="search"
    >
      <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-button bg-card/72 px-3 shadow-e1 focus-within:bg-card focus-within:shadow-e2">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="sr-only">Search</span>
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/70"
        />
      </label>
      {onRefresh && (
        <TabletIconButton label={refreshing ? 'Refreshing' : 'Refresh'} onClick={onRefresh} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </TabletIconButton>
      )}
      {onOpenFilters && (
        <TabletIconButton label="Filters" onClick={onOpenFilters} active={filtersActive}>
          <Filter className="h-4 w-4" />
          {filtersActive && <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-pill bg-current" />}
        </TabletIconButton>
      )}
      {onOpenAnalytics && (
        <TabletIconButton label="Statistics" onClick={onOpenAnalytics}>
          <BarChart3 className="h-4 w-4" />
        </TabletIconButton>
      )}
    </form>
  );
};

const TabletRecordRow = ({
  record,
  focused,
  onFocus,
  onOpen,
  selectable,
  selected,
  onToggleSelect,
}) => {
  const Icon = record.icon;
  const statusClass = record.statusClass || defaultStatusClass;

  return (
    <div
      data-tablet-record-row={record.id}
      data-state={focused ? 'focused' : 'idle'}
      className={`group flex min-h-[72px] items-center gap-3 px-3 py-2.5 transition-colors ${focused
        ? 'bg-foreground/[0.055] dark:bg-white/[0.06]'
        : 'hover:bg-foreground/[0.035] dark:hover:bg-white/[0.04]'
      }`}
    >
      {selectable && (
        <TabletCheckbox
          checked={selected}
          onCheckedChange={(checked) => onToggleSelect?.(record.id, checked)}
          label={selected ? `Deselect ${record.title}` : `Select ${record.title}`}
        />
      )}
      <button
        type="button"
        onClick={() => onFocus?.(record.id)}
        onDoubleClick={() => onOpen?.(record.source)}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
        aria-label={`Focus ${record.title}`}
      >
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-icon ${record.iconClass || 'bg-muted/38 text-muted-foreground'}`}>
          {Icon ? <Icon className="h-[18px] w-[18px]" /> : <span className="text-xs font-semibold">{record.initials}</span>}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-semibold text-foreground">{record.title}</span>
          {record.subtitle && <span className="mt-0.5 block truncate text-xs text-muted-foreground">{record.subtitle}</span>}
          {record.meta && <span className="mt-1 block truncate text-[11px] text-muted-foreground/80">{record.meta}</span>}
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1.5">
          {record.trailing && <span className="text-[11px] font-medium tabular-nums text-muted-foreground">{record.trailing}</span>}
          {record.statusLabel && (
            <span className={`rounded-pill px-2.5 py-1 text-[10px] font-semibold ${statusClass}`}>{record.statusLabel}</span>
          )}
        </span>
      </button>
      {onOpen && (
        <button
          type="button"
          onClick={() => onOpen(record.source)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-icon text-muted-foreground transition-colors hover:bg-foreground/[0.07] hover:text-foreground active:scale-95"
          aria-label={`Open ${record.title}`}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

const TabletRowsSkeleton = () => (
  <div className="space-y-px" aria-hidden="true">
    {Array.from({ length: 6 }).map((_, index) => (
      <div key={index} className="flex min-h-[72px] items-center gap-3 px-3 py-2.5">
        <span className="h-10 w-10 shrink-0 rounded-icon bg-muted/25 shimmer" />
        <span className="min-w-0 flex-1">
          <span className="block h-4 w-3/5 rounded-pill bg-muted/25 shimmer" />
          <span className="mt-2 block h-3 w-4/5 rounded-pill bg-muted/18 shimmer" />
        </span>
        <span className="h-6 w-16 rounded-pill bg-muted/20 shimmer" />
      </div>
    ))}
  </div>
);

export const TabletCollectionPage = ({
  detail,
  records = [],
  kpis = [],
  activeKpi,
  onKpiChange,
  loading = false,
  isFetching = false,
  error = null,
  onRetry,
  onRefresh,
  searchValue = '',
  onSearchCommit,
  searchPlaceholder = 'Search...',
  onOpenFilters,
  filtersActive = false,
  onOpenAnalytics,
  focusedId,
  onFocus,
  onOpen,
  selectable = false,
  selectedIds = [],
  onToggleSelect,
  onSelectAll,
  allSelected,
  someSelected,
  emptyTitle = 'Nothing here yet',
  emptyBody = 'Records will appear here when they are available.',
  countLabel,
  footer = null,
  toolbarSlot = null,
}) => {
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const visibleSelectedCount = useMemo(
    () => records.reduce((count, record) => count + (selectedSet.has(record.id) ? 1 : 0), 0),
    [records, selectedSet],
  );
  const pageAllSelected = allSelected ?? (records.length > 0 && visibleSelectedCount === records.length);
  const pageSomeSelected = someSelected ?? (visibleSelectedCount > 0 && !pageAllSelected);

  return (
    <TabletPageShell detail={detail}>
      <div className="flex h-full min-h-0 flex-col gap-3">
        {kpis.length > 0 && (
          <TabletKpiStrip options={kpis} activeId={activeKpi} onChange={onKpiChange} loading={loading} />
        )}
        {toolbarSlot}
        <TabletSearchToolbar
          searchValue={searchValue}
          onSearchCommit={onSearchCommit}
          placeholder={searchPlaceholder}
          onOpenFilters={onOpenFilters}
          filtersActive={filtersActive}
          onOpenAnalytics={onOpenAnalytics}
          onRefresh={onRefresh}
          refreshing={isFetching}
        />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-card bg-card/68 shadow-e2 backdrop-blur-xl">
          <div className="flex h-9 shrink-0 items-center justify-between gap-3 px-3 text-[11px] font-medium text-muted-foreground">
            <div className="flex min-w-0 items-center gap-2">
              {selectable && onSelectAll && (
                <TabletCheckbox
                  checked={pageAllSelected ? true : (pageSomeSelected ? 'indeterminate' : false)}
                  onCheckedChange={(checked) => onSelectAll(checked === true)}
                  label={pageAllSelected ? 'Deselect all visible records' : 'Select all visible records'}
                />
              )}
              <span className="truncate">
                {selectedIds.length > 0 ? `${selectedIds.length} selected` : (countLabel || `${records.length} records`)}
              </span>
            </div>
            {isFetching && !loading && (
              <span className="inline-flex items-center gap-1.5" role="status">
                <Loader2 className="h-3 w-3 animate-spin" /> Updating
              </span>
            )}
          </div>
          <div className="mx-3 h-px shrink-0 bg-[hsl(var(--muted-foreground)/0.08)]" />
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain no-scrollbar">
            {loading && records.length === 0 ? (
              <TabletRowsSkeleton />
            ) : error && records.length === 0 ? (
              <div className="flex min-h-[260px] flex-col items-center justify-center px-8 text-center">
                <p className="text-sm font-semibold text-foreground">Records did not load</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{error}</p>
                {onRetry && (
                  <button type="button" onClick={onRetry} className="mt-4 h-10 rounded-button bg-foreground px-4 text-xs font-semibold text-background active:scale-95">
                    Retry
                  </button>
                )}
              </div>
            ) : records.length === 0 ? (
              <div className="flex min-h-[260px] flex-col items-center justify-center px-8 text-center">
                <p className="text-sm font-semibold text-foreground">{emptyTitle}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{emptyBody}</p>
              </div>
            ) : (
              records.map((record, index) => (
                <React.Fragment key={record.id}>
                  <TabletRecordRow
                    record={record}
                    focused={focusedId === record.id}
                    onFocus={onFocus}
                    onOpen={onOpen}
                    selectable={selectable}
                    selected={selectedSet.has(record.id)}
                    onToggleSelect={onToggleSelect}
                  />
                  {index < records.length - 1 && (
                    <div className="ml-[64px] h-px bg-[hsl(var(--muted-foreground)/0.08)]" />
                  )}
                </React.Fragment>
              ))
            )}
          </div>
          {footer && <div className="shrink-0 px-3 pb-3 pt-2">{footer}</div>}
        </div>
      </div>
    </TabletPageShell>
  );
};

export default TabletCollectionPage;
