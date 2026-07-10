// Mobile canon kit - flat search bar + filter/stats triggers (CANON_COMPONENT_SPECS
// S5). 300ms draft-debounce; the clear-x commits immediately. The filter trigger is
// context-aware: data-state open/filtered/idle. Both triggers render only when the
// page wires a surface for them -- a trigger with no sheet is a dead tap (found by
// the MobilePricing Wave-2 pass: tabs + KPI chips are its only filter grammar).
import React, { useEffect, useState } from 'react';
import { Search, X, Filter, BarChart3 } from 'lucide-react';
import { FEEDBACK_TYPES } from '../../../contexts/FeedbackContext';
import { SEARCH_DEBOUNCE_MS } from './constants';
import { TapButton } from './Tap';

export const getFilterTriggerState = ({ isOpen, hasFilter }) => {
  if (isOpen) return 'open';
  if (hasFilter) return 'filtered';
  return 'idle';
};

// The 300ms draft-debounce pattern; external writes sync back into the draft.
export const useSearchDraft = (search, commit) => {
  const [searchDraft, setSearchDraft] = useState(search || '');

  useEffect(() => { setSearchDraft(search || ''); }, [search]);

  useEffect(() => {
    const handle = setTimeout(() => {
      if ((search || '') !== searchDraft) commit(searchDraft);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [searchDraft, search, commit]);

  return [searchDraft, setSearchDraft];
};

const TRIGGER_CLASS = 'flex h-9 w-9 items-center justify-center rounded-button bg-background/60 text-muted-foreground shadow-sm transition-all hover:bg-foreground/10 hover:text-foreground active:scale-[0.96] dark:bg-white/[0.06]';

export const SearchRow = ({
  placeholder,
  search,
  onSearchCommit,
  searchTestId = undefined,
  entityLabel = 'items',
  onOpenFilters,
  filterSheetOpen = false,
  hasFilter = false,
  onOpenStats = null,
  statsLabel = 'Open statistics',
  // Stats trigger context state (kit gap closed after the MobileEmergency
  // re-composition): pages with an open analytics sheet wire statsOpen so the
  // trigger tells the truth (data-state open/idle + aria-expanded).
  statsOpen = false,
}) => {
  const [searchDraft, setSearchDraft] = useSearchDraft(search, onSearchCommit);

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <Search size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
        <input
          type="text"
          inputMode="search"
          placeholder={placeholder}
          value={searchDraft}
          onChange={(e) => setSearchDraft(e.target.value)}
          className="h-9 w-full rounded-inner bg-background/60 pl-10 pr-10 text-[13px] font-medium text-foreground shadow-sm transition-all placeholder:text-muted-foreground/50 focus-visible:shadow-[0_0_0_3px_hsl(var(--primary)/0.18)] dark:bg-white/[0.06]"
          data-testid={searchTestId}
        />
        {searchDraft && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => { setSearchDraft(''); onSearchCommit(''); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-pill bg-foreground/10 text-muted-foreground transition-colors hover:bg-foreground/15 active:scale-95"
          >
            <X size={12} />
          </button>
        )}
      </div>
      {onOpenFilters && (
        <TapButton
          feedbackVariant={FEEDBACK_TYPES.INFO}
          feedbackColor="hsl(var(--foreground))"
          data-state={getFilterTriggerState({ isOpen: filterSheetOpen, hasFilter })}
          onClick={() => onOpenFilters()}
          className={TRIGGER_CLASS}
          aria-label={`Filter ${entityLabel}`}
          aria-haspopup="dialog"
          aria-expanded={filterSheetOpen}
        >
          <Filter size={18} />
        </TapButton>
      )}
      {onOpenStats && (
        <TapButton
          feedbackVariant={FEEDBACK_TYPES.CLICK}
          feedbackColor="hsl(var(--foreground))"
          data-state={statsOpen ? 'open' : 'idle'}
          onClick={() => onOpenStats()}
          className={TRIGGER_CLASS}
          aria-label={statsLabel}
          aria-haspopup="dialog"
          aria-expanded={statsOpen}
        >
          <BarChart3 size={18} />
        </TapButton>
      )}
    </div>
  );
};
