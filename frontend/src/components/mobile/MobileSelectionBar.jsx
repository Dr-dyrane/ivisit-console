import React from 'react';
import { X } from 'lucide-react';

/**
 * MobileSelectionBar — the shared mobile multi-select action bar.
 *
 * Renders only when count > 0. Sticky + borderless, styled to match the canon list
 * surfaces. Anatomy: "N selected · Select all · <action slot> · Clear (X)". The action
 * slot is PAGE-OWNED (children) so command authority stays per page — a real action
 * (Approve N / Cancel N) where the mutation is authorized, or a disabled/locked control
 * where the write is fail-closed. This component never decides authority; it only lays
 * out the bar so selection UX cannot drift page-to-page.
 *
 * @param {number}   count        selected row count (bar hides at 0)
 * @param {Function} [onSelectAll] select-all handler; omit to hide the Select all button
 * @param {Function} onClear      clear-selection handler (the X)
 * @param {React.ReactNode} [children] the page's action control(s)
 */
export const MobileSelectionBar = ({ count = 0, onSelectAll, onClear, children }) => {
  if (!count) return null;
  return (
    <div className="sticky top-2 z-30 flex items-center gap-2 rounded-inner bg-background/85 px-3 py-2 shadow-sm backdrop-blur-xl">
      <span className="text-[13px] font-semibold text-foreground tabular-nums">{count} selected</span>
      {onSelectAll && (
        <button
          type="button"
          onClick={onSelectAll}
          className="text-[12px] font-semibold text-muted-foreground transition-transform active:scale-95"
        >
          Select all
        </button>
      )}
      <div className="ml-auto flex items-center gap-2">
        {children}
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear selection"
          className="flex h-8 w-8 items-center justify-center rounded-button bg-foreground/[0.05] text-muted-foreground transition-transform active:scale-95 dark:bg-white/[0.06]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default MobileSelectionBar;
