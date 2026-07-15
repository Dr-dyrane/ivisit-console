import { useCallback, useEffect } from 'react';

// Open dialogs own the keyboard: the list shortcuts below and the tablet
// pushed-detail Escape (TabletPageShell) both yield to any modal or filter
// sheet layered above them by sharing this ONE guard selector.
export const OPEN_DIALOG_GUARD_SELECTOR = '[role="dialog"], [role="alertdialog"], [data-modal-shell="true"], [data-filter-sheet-shell="true"]';

// Keyboard list navigation for the canonical rows viewport (donor: Requests):
// ArrowDown/ArrowUp move row focus (clamped to the current page), Enter opens the
// focused row, Escape returns focus to the default. Typing surfaces and open
// dialogs are ignored so the shortcuts never steal keys from inputs or modals.
export const useListKeyboardNav = ({
  items,
  focusedItem,
  setFocusedId,
  onOpen,
  scrollRef,
  rowAttr,
  focusSelector,
}) => useCallback((event) => {
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp' && event.key !== 'Enter' && event.key !== 'Escape') return;
  if (event.defaultPrevented) return;
  const target = event.target;
  if (target instanceof HTMLElement) {
    const tag = target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) return;
  }
  if (typeof document !== 'undefined' && document.querySelector(OPEN_DIALOG_GUARD_SELECTOR)) return;

  if (event.key === 'Escape') {
    setFocusedId(null);
    if (focusSelector) scrollRef.current?.focus();
    return;
  }
  if (items.length === 0) return;
  if (event.key === 'Enter') {
    // Native activation wins on real controls: Enter while a row button/link has
    // focus must click IT, never hijack to opening the focused row (WCAG 2.1.1).
    if (target instanceof HTMLElement && target.closest('button, a')) return;
    if (focusedItem) {
      event.preventDefault();
      onOpen(focusedItem);
    }
    return;
  }

  event.preventDefault();
  const delta = event.key === 'ArrowDown' ? 1 : -1;
  const currentIndex = items.findIndex((row) => row.id === focusedItem?.id);
  const nextIndex = currentIndex === -1
    ? (delta > 0 ? 0 : items.length - 1)
    : Math.min(items.length - 1, Math.max(0, currentIndex + delta));
  const next = items[nextIndex];
  if (!next) return;
  setFocusedId(next.id);
  const nextRow = scrollRef.current?.querySelector(`[${rowAttr}="${next.id}"]`);
  nextRow?.scrollIntoView({ block: 'nearest' });
  if (focusSelector) nextRow?.querySelector(focusSelector)?.focus();
}, [items, focusedItem, setFocusedId, onOpen, scrollRef, rowAttr, focusSelector]);

// A page change resets the rows viewport to the top; otherwise the next page
// opens mid-scroll wherever the last one left off.
export const useScrollResetOnPage = (scrollRef, currentPage) => {
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [scrollRef, currentPage]);
};
