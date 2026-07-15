import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  Check,
  ChevronRight,
  Filter,
  Loader2,
  Minus,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { selectPrimaryKpis } from '../console/KpiStrip';
import { useSearchDraft } from '../../hooks/useSearchDraft';
import { useListKeyboardNav, useScrollResetOnPage } from '../../hooks/useListKeyboardNav';
import { TabletPageShell } from './TabletPageShell';
import { useTabletLayoutMode } from './useTabletLayoutMode';

const defaultStatusClass = 'bg-muted/38 text-muted-foreground';

// Shared focus token for the tablet lane's raw buttons (ui/button bakes its own
// ring in; raw tablet controls compose this so keyboard focus is never invisible).
export const TABLET_FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/25';

const TabletIconButton = ({
  label,
  onClick,
  active = false,
  disabled = false,
  dataState,
  haspopup,
  expanded,
  children,
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    title={label}
    aria-haspopup={haspopup}
    aria-expanded={expanded}
    data-state={dataState || (active ? 'active' : 'idle')}
    className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-icon transition-all active:scale-95 disabled:opacity-40 ${TABLET_FOCUS_RING} ${active
      ? 'bg-foreground text-background shadow-e2'
      : 'bg-card/72 text-muted-foreground shadow-e1 hover:bg-foreground/[0.07] hover:text-foreground'
    }`}
  >
    {children}
  </button>
);

// 44px hit area around the 16px visual box (the before: inset pseudo-element
// extends the tap target without changing the row layout); the click handler
// forwards the MouseEvent through onSelectClick so shift-range selection
// (useRowSelection) works on tablet.
export const TabletCheckbox = ({ checked = false, onCheckedChange, onSelectClick, label, disabled = false }) => {
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
      onClick={(event) => {
        onSelectClick?.(event);
        onCheckedChange?.(!selected);
      }}
      className={`relative z-10 flex h-4 w-4 shrink-0 items-center justify-center rounded-icon shadow-e1 transition-colors before:absolute before:-inset-3.5 before:content-[''] ${TABLET_FOCUS_RING} disabled:cursor-not-allowed disabled:opacity-50 ${active
        ? 'bg-foreground text-background dark:bg-white dark:text-background'
        : 'bg-foreground/[0.08] text-transparent dark:bg-white/[0.10]'
      }`}
    >
      {active && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
    </button>
  );
};

export const TabletKpiStrip = ({
  options = [],
  activeId,
  onChange,
  loading = false,
  pinnedIds = [],
  importance = {},
}) => {
  // Same smart-context selection as the desktop KpiStrip (donor: Requests):
  // pinned ids hold a slot only while their count > 0, the active chip always
  // stays visible, remaining slots fill count-desc then importance.
  const getCount = (id) => {
    const value = options.find((option) => option.id === id)?.value;
    return typeof value === 'number' ? value : Number(value) || 0;
  };
  const visibleOptions = selectPrimaryKpis({
    options,
    getCount,
    kpiFilter: activeId,
    pinnedIds,
    importance,
    max: 3,
  });

  return (
    <div
      data-tablet-kpis
      className="flex min-h-11 gap-2 overflow-x-auto pb-1 no-scrollbar"
      role="group"
      aria-label="Page scope"
    >
      {visibleOptions.map((option) => {
        const Icon = option.icon;
        // Desktop parity: an unset filter means the default scope is active.
        const active = option.id === (activeId || 'all');
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange?.(active && option.id !== 'all' ? 'all' : option.id)}
            aria-pressed={active}
            className={`flex h-11 shrink-0 items-center gap-2 rounded-pill px-3 text-xs font-semibold transition-all active:scale-[0.97] ${TABLET_FOCUS_RING} ${active
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
  filterSheetOpen = false,
  onOpenAnalytics,
  onRefresh,
  refreshing = false,
  scopeControl = null,
}) => {
  // Same 300ms draft-debounce as desktop SheetToolbar / mobile SearchRow;
  // Enter commits immediately, the clear-x commits '' immediately.
  const [draft, setDraft] = useSearchDraft(searchValue || '', onSearchCommit || (() => {}));
  const commit = () => {
    if (draft !== (searchValue || '')) onSearchCommit?.(draft);
  };
  const filterTriggerState = filterSheetOpen ? 'open' : (filtersActive ? 'filtered' : 'idle');

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
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/70"
        />
        {draft && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setDraft('');
              onSearchCommit?.('');
            }}
            className={`-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-icon text-muted-foreground transition-colors hover:text-foreground active:scale-95 ${TABLET_FOCUS_RING}`}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-pill bg-foreground/10">
              <X className="h-3 w-3" />
            </span>
          </button>
        )}
      </label>
      {scopeControl}
      {onRefresh && (
        <TabletIconButton label={refreshing ? 'Refreshing' : 'Refresh'} onClick={onRefresh} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </TabletIconButton>
      )}
      {onOpenFilters && (
        <TabletIconButton
          label="Filters"
          onClick={onOpenFilters}
          active={filterSheetOpen || filtersActive}
          dataState={filterTriggerState}
          haspopup="dialog"
          expanded={filterSheetOpen}
        >
          <Filter className="h-4 w-4" />
          {filtersActive && <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-pill bg-current" />}
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
  onSelectClick,
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
          onSelectClick={onSelectClick}
          label={selected ? `Deselect ${record.title}` : `Select ${record.title}`}
        />
      )}
      <button
        type="button"
        data-tablet-row-trigger
        onClick={() => onFocus?.(record.id)}
        onDoubleClick={() => onOpen?.(record.source)}
        className={`flex min-w-0 flex-1 items-center gap-3 rounded-inner text-left ${TABLET_FOCUS_RING}`}
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
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-icon text-muted-foreground transition-colors hover:bg-foreground/[0.07] hover:text-foreground active:scale-95 ${TABLET_FOCUS_RING}`}
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
  kpiPinnedIds = [],
  kpiImportance = {},
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
  filterSheetOpen = false,
  onOpenAnalytics,
  focusedId,
  onFocus,
  onOpen,
  selectable = false,
  selectedIds = [],
  onToggleSelect,
  onSelectClick,
  onSelectAll,
  allSelected,
  someSelected,
  emptyTitle = 'Nothing here yet',
  emptyBody = 'Records will appear here when they are available.',
  emptyAction = null,
  countLabel,
  scrollResetKey,
  footer = null,
  toolbarSlot = null,
  scopeControl = null,
}) => {
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const visibleSelectedCount = useMemo(
    () => records.reduce((count, record) => count + (selectedSet.has(record.id) ? 1 : 0), 0),
    [records, selectedSet],
  );
  const pageAllSelected = allSelected ?? (records.length > 0 && visibleSelectedCount === records.length);
  const pageSomeSelected = someSelected ?? (visibleSelectedCount > 0 && !pageAllSelected);

  // Keyboard equivalence (donor: Requests desktop list): ArrowUp/ArrowDown move
  // row focus, Enter opens, Escape clears; a page change resets the viewport.
  const scrollRef = useRef(null);
  const focusedRecord = useMemo(
    () => records.find((record) => record.id === focusedId) || null,
    [records, focusedId],
  );
  const handleListKeyDown = useListKeyboardNav({
    items: records,
    focusedItem: focusedRecord,
    setFocusedId: (id) => onFocus?.(id),
    onOpen: (record) => onOpen?.(record.source),
    scrollRef,
    rowAttr: 'data-tablet-record-row',
    focusSelector: '[data-tablet-row-trigger]',
  });
  useScrollResetOnPage(scrollRef, scrollResetKey);

  // Narrow-tablet master-detail push (HIG). The page OWNS the pushed state and
  // it is EDGE-TRIGGERED by row activation -- never derived from focusedId,
  // because controllers (e.g. wallet) auto-focus the first row on load and
  // must not auto-push the detail on every mount.
  const layoutMode = useTabletLayoutMode();
  const [detailPushed, setDetailPushed] = useState(false);
  const pushedRowIdRef = useRef(null);
  const restoreFocusRef = useRef(false);

  const handleRowActivate = useCallback((id) => {
    onFocus?.(id);
    if (layoutMode === 'stacked' && detail) {
      pushedRowIdRef.current = id;
      setDetailPushed(true);
    }
  }, [detail, layoutMode, onFocus]);

  // User-initiated closes (back button, Escape on the layer) restore focus.
  const closeDetail = useCallback(() => {
    restoreFocusRef.current = true;
    setDetailPushed(false);
  }, []);

  // Programmatic closes never yank focus: growing past the split floor keeps
  // the detail as the rail, and a page change replaces the rows underneath.
  useEffect(() => {
    if (layoutMode !== 'stacked') {
      restoreFocusRef.current = false;
      setDetailPushed(false);
    }
  }, [layoutMode]);
  const prevScrollResetKeyRef = useRef(scrollResetKey);
  useEffect(() => {
    if (prevScrollResetKeyRef.current !== scrollResetKey) {
      prevScrollResetKeyRef.current = scrollResetKey;
      restoreFocusRef.current = false;
      setDetailPushed(false);
    }
  }, [scrollResetKey]);

  // Back returns focus to the activated row; if that row left the page while
  // the detail was pushed, fall back to the rows viewport (it has tabIndex=0).
  useEffect(() => {
    if (detailPushed || !restoreFocusRef.current) return;
    restoreFocusRef.current = false;
    const rowId = pushedRowIdRef.current;
    const rowTrigger = rowId == null
      ? null
      : scrollRef.current?.querySelector(`[data-tablet-record-row="${rowId}"] [data-tablet-row-trigger]`);
    (rowTrigger || scrollRef.current)?.focus();
  }, [detailPushed]);

  // Refresh outcome announcement: the transient "Updating" spinner announces the
  // start; this polite live region announces the RESULT when the refetch lands.
  const [refreshOutcome, setRefreshOutcome] = useState('');
  const wasFetchingRef = useRef(isFetching);
  const refreshTickRef = useRef(0);
  useEffect(() => {
    if (wasFetchingRef.current && !isFetching) {
      // Alternate a zero-width suffix so back-to-back identical outcomes still
      // mutate the DOM -- otherwise repeat refreshes announce nothing to AT.
      refreshTickRef.current += 1;
      const nudge = refreshTickRef.current % 2 ? '\u200B' : '';
      setRefreshOutcome((error
        ? 'Refresh failed. Showing the last loaded records.'
        : `List updated. ${records.length} records shown.`) + nudge);
    }
    wasFetchingRef.current = isFetching;
  }, [isFetching, error, records.length]);

  // Filtered-empty and true-empty states must offer a way out: pages can wire
  // an explicit emptyAction; otherwise the page derives an honest recovery from
  // what it knows (clear the committed search, or reopen the filter sheet).
  const fallbackEmptyAction = searchValue && onSearchCommit
    ? { label: 'Clear search', onClick: () => onSearchCommit('') }
    : (filtersActive && onOpenFilters ? { label: 'Adjust filters', onClick: onOpenFilters } : null);
  const resolvedEmptyAction = emptyAction || fallbackEmptyAction;

  return (
    <TabletPageShell
      detail={detail}
      detailOpen={layoutMode === 'stacked' && detailPushed}
      onDetailClose={closeDetail}
    >
      <div className="flex h-full min-h-0 flex-col gap-3">
        {kpis.length > 0 && (
          <TabletKpiStrip
            options={kpis}
            activeId={activeKpi}
            onChange={onKpiChange}
            loading={loading}
            pinnedIds={kpiPinnedIds}
            importance={kpiImportance}
          />
        )}
        {toolbarSlot}
        <TabletSearchToolbar
          searchValue={searchValue}
          onSearchCommit={onSearchCommit}
          placeholder={searchPlaceholder}
          onOpenFilters={onOpenFilters}
          filtersActive={filtersActive}
          filterSheetOpen={filterSheetOpen}
          onOpenAnalytics={onOpenAnalytics}
          onRefresh={onRefresh}
          refreshing={isFetching}
          scopeControl={scopeControl}
        />
        <span className="sr-only" role="status" aria-live="polite">{refreshOutcome}</span>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-card bg-card/68 shadow-e2 backdrop-blur-xl">
          <div className="flex h-11 shrink-0 items-center justify-between gap-3 px-3 text-[11px] font-medium text-muted-foreground">
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
          {error && records.length > 0 && (
            <div
              data-tablet-degraded
              role="alert"
              className="flex shrink-0 items-center justify-between gap-3 bg-amber-500/10 px-3 py-1.5"
            >
              <p className="min-w-0 truncate text-xs font-medium text-amber-800 dark:text-amber-100">
                Refresh failed. Rows shown may be out of date.
              </p>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className={`h-11 shrink-0 rounded-button px-3 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-500/15 dark:text-amber-100 ${TABLET_FOCUS_RING}`}
                >
                  Retry
                </button>
              )}
            </div>
          )}
          <div
            ref={scrollRef}
            role="region"
            tabIndex={0}
            onKeyDown={handleListKeyDown}
            aria-label={countLabel || 'Records'}
            className={`min-h-0 flex-1 overflow-y-auto overscroll-contain no-scrollbar ${TABLET_FOCUS_RING}`}
          >
            {loading && records.length === 0 ? (
              <TabletRowsSkeleton />
            ) : error && records.length === 0 ? (
              <div className="flex min-h-[260px] flex-col items-center justify-center px-8 text-center">
                <p className="text-sm font-semibold text-foreground">Records did not load</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{error}</p>
                {onRetry && (
                  <button type="button" onClick={onRetry} className={`mt-4 h-11 rounded-button bg-foreground px-4 text-xs font-semibold text-background active:scale-95 ${TABLET_FOCUS_RING}`}>
                    Retry
                  </button>
                )}
              </div>
            ) : records.length === 0 ? (
              <div className="flex min-h-[260px] flex-col items-center justify-center px-8 text-center">
                <p className="text-sm font-semibold text-foreground">{emptyTitle}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{emptyBody}</p>
                {resolvedEmptyAction && (
                  <button
                    type="button"
                    onClick={resolvedEmptyAction.onClick}
                    className={`mt-4 h-11 rounded-button bg-foreground px-4 text-xs font-semibold text-background active:scale-95 ${TABLET_FOCUS_RING}`}
                  >
                    {resolvedEmptyAction.label}
                  </button>
                )}
              </div>
            ) : (
              records.map((record, index) => (
                <React.Fragment key={record.id}>
                  <TabletRecordRow
                    record={record}
                    focused={focusedId === record.id}
                    onFocus={handleRowActivate}
                    onOpen={onOpen}
                    selectable={selectable}
                    selected={selectedSet.has(record.id)}
                    onToggleSelect={onToggleSelect}
                    onSelectClick={onSelectClick}
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
