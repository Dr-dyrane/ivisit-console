// Console design system - activity sheet, toolbar, sortable header, row shell
// (donor: Requests). ARCHITECTURE RULES LIVE HERE:
//   - sheet: frosted sheet radius, bg-card/68, neutral shadow-e3,
//     drag handle, count-row triplet (loading / failed-empty / normal) + Updating pill
//   - toolbar: debounced search (300ms draft commit), refresh with spin, Filters
//     trigger with aria-haspopup/aria-expanded, primary command slot (fg-on-bg pill)
//   - rows: min-h-[80px] canonical grid rows with focus/open/keyboard/context-menu
//     semantics; selected = e2-strong raise, rest = hairline hover lift; NO entrance
//     stagger ever (replace-in-place canon)
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpDown, ChevronDown, ChevronUp, Filter, Plus, RefreshCw, Search } from 'lucide-react';
import { Button } from '../ui/button';
import { PaginationControls } from '../ui/PaginationControls';
import { UpdatingPill } from './primitives';

export const ActivitySheet = ({ loading, isFetching, failedEmpty, pagination, itemNoun = 'items', loadingLabel, toolbar, errorBanner, children }) => (
  <section
    className="flex min-h-0 flex-1 flex-col rounded-t-sheet bg-card/68 p-3 shadow-e3 backdrop-blur-2xl dark:bg-card/50 md:rounded-sheet"
    data-testid={`${itemNoun}-activity-sheet`}
  >
    <div className="mx-auto mb-3 h-1.5 w-[42px] rounded-pill bg-foreground/20" />
    {toolbar}

    <div className="mt-3 flex items-center justify-between px-2 text-xs font-semibold text-muted-foreground">
      <span>{loading ? (loadingLabel || `Loading ${itemNoun}`) : failedEmpty ? "Couldn't load" : `${pagination.totalCount} ${itemNoun}`}</span>
      <span className="flex items-center gap-2">
        {isFetching && !loading && <UpdatingPill />}
        <span>{loading ? 'One moment' : failedEmpty ? 'Retry below' : `Page ${pagination.currentPage} of ${pagination.totalPages}`}</span>
      </span>
    </div>

    {errorBanner}

    {children}

    <PaginationControls
      currentPage={pagination.currentPage}
      totalPages={pagination.totalPages}
      totalCount={pagination.totalCount}
      itemsPerPage={pagination.itemsPerPage}
      onPrevPage={pagination.prevPage}
      onNextPage={pagination.nextPage}
      hasPrevPage={pagination.hasPrevPage}
      hasNextPage={pagination.hasNextPage}
      loading={loading}
    />
  </section>
);

export const SheetToolbar = ({
  searchValue,
  onSearchCommit,
  searchPlaceholder,
  searchTestId,
  onRefresh,
  refreshing = false,
  refreshNoun = 'list',
  onOpenFilters,
  filterSheetOpen = false,
  filtersActive = false,
  filtersOpening = false,
  primarySlot = null,
}) => {
  // Debounced search: the input edits a local draft; the committed filter follows
  // 300ms after typing pauses -- one refetch per pause, not one per keystroke.
  const [searchDraft, setSearchDraft] = useState(searchValue || '');

  useEffect(() => {
    setSearchDraft(searchValue || '');
  }, [searchValue]);

  useEffect(() => {
    if ((searchValue || '') === searchDraft) return undefined;
    const timer = setTimeout(() => {
      onSearchCommit(searchDraft);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchDraft, searchValue, onSearchCommit]);

  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/65" />
        <input
          type="search"
          value={searchDraft}
          onChange={(event) => setSearchDraft(event.target.value)}
          placeholder={searchPlaceholder}
          className="h-12 w-full rounded-button bg-muted/30 pl-11 pr-4 text-sm font-medium text-foreground shadow-sm transition-all placeholder:text-muted-foreground/55 focus-visible:shadow-[0_0_0_2px_hsl(var(--foreground)/0.22)]"
          data-testid={searchTestId}
        />
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={onRefresh}
        disabled={refreshing}
        className="h-12 w-12 rounded-button bg-muted/30 text-muted-foreground shadow-sm transition-all hover:bg-foreground/10 hover:text-foreground active:scale-95 disabled:opacity-60"
        aria-label={refreshing ? `Refreshing ${refreshNoun}` : `Refresh ${refreshNoun}`}
        title={refreshing ? 'Refreshing...' : 'Refresh'}
      >
        <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
      </Button>
      <Button
        variant="ghost"
        onClick={onOpenFilters}
        className={`h-12 rounded-button bg-muted/30 px-4 text-sm font-semibold text-muted-foreground shadow-sm transition-all hover:bg-foreground/10 hover:text-foreground active:scale-95 ${filtersOpening ? 'bg-foreground/10 text-foreground scale-95' : ''}`}
        aria-busy={filtersOpening}
        aria-haspopup="dialog"
        aria-expanded={filterSheetOpen}
        data-state={filtersOpening ? 'opening' : 'idle'}
      >
        <Filter className="mr-2 h-4 w-4" />
        {filtersOpening ? 'Opening' : 'Filters'}
        {filtersActive && <span className="ml-2 h-2 w-2 rounded-pill bg-foreground/60" />}
      </Button>
      {primarySlot}
    </div>
  );
};

// The page's first visible command: canonical foreground-on-background pill in the
// toolbar (never the auto-hiding header, never a light fill with light text).
export const PrimaryCommand = ({ onClick, opening = false, label, openingLabel = 'Opening...' }) => (
  <Button
    onClick={onClick}
    className={`h-12 rounded-button bg-foreground px-4 text-sm font-semibold text-background shadow-sm transition-all hover:bg-foreground/90 active:scale-95 ${opening ? 'scale-95' : ''}`}
    aria-busy={opening}
    data-state={opening ? 'opening' : 'idle'}
  >
    <Plus className="mr-2 h-4 w-4" />
    {opening ? openingLabel : label}
  </Button>
);

export const SortableColumnHeader = ({ label, sortKey, sortConfig, onSort, className = '' }) => {
  const isSorted = sortConfig?.key === sortKey;
  const direction = isSorted ? sortConfig.direction : null;
  return (
    // aria-sort lives on a columnheader-roled wrapper (accessibility canon).
    <span
      role="columnheader"
      aria-sort={isSorted ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        onClick={() => onSort?.(sortKey)}
        data-state={isSorted ? 'sorted' : 'idle'}
        className={`flex items-center gap-1 transition-colors hover:text-foreground active:scale-[0.96] ${className}`}
        aria-label={`Sort by ${label}`}
      >
        {label}
        {isSorted ? (
          direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" />
        )}
      </button>
    </span>
  );
};

// Canonical list row shell: focus/open/keyboard/context-menu semantics + the
// selected/rest elevation states. Cells are children on the page's grid.
export const ListRowShell = ({ id, dataAttrName, gridCols, selected, onFocus, onOpen, minHeight = 'min-h-[80px]', children }) => (
  <motion.div
    layout="position"
    className={`group mb-2 grid ${minHeight} ${gridCols} items-center gap-2 rounded-card px-4 py-3.5 transition-[background,box-shadow,transform] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${selected ? 'bg-card/88 shadow-e2-strong dark:bg-white/[0.08]' : 'bg-card/50 hover:-translate-y-0.5 hover:bg-card/72 hover:shadow-e2 dark:bg-white/[0.035] dark:hover:bg-white/[0.06]'}`}
    {...{ [dataAttrName]: id }}
    data-state={selected ? 'selected' : 'idle'}
    role="button"
    tabIndex={0}
    onClick={onFocus}
    onDoubleClick={(event) => {
      event.stopPropagation();
      onOpen();
    }}
    onContextMenu={(event) => {
      // Cheap context-menu stand-in: right-click focuses the row so the rail (the
      // action home) reflects it.
      event.preventDefault();
      onFocus();
    }}
    onKeyDown={(event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onFocus();
      }
    }}
    aria-pressed={selected}
  >
    {children}
  </motion.div>
);
