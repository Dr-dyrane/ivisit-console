import React, { useEffect, useRef } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useNavigation } from '../../contexts/NavigationContext';
import { OPEN_DIALOG_GUARD_SELECTOR } from '../../hooks/useListKeyboardNav';
import { TABLET_FOCUS_RING } from './TabletCollectionPage';
import { useTabletLayoutMode } from './useTabletLayoutMode';

const TABLET_HEIGHT = {
  compact: 'h-[calc(100dvh-9.5rem-var(--safe-bottom))]',
  rail: 'h-[calc(100dvh-5rem)]',
};

export const TabletPageShell = ({
  children,
  detail = null,
  mode = 'split',
  className = '',
  primaryClassName = '',
  detailClassName = '',
  // Controlled master-detail push (HIG): a boolean opts in; undefined keeps
  // the uncontrolled callers (TabletSettings/TabletAnalytics) unchanged.
  detailOpen = undefined,
  onDetailClose,
  detailBackLabel = 'Back to list',
}) => {
  const { isWideTablet } = useNavigation();
  // Measured effective content width decides split vs stacked -- never the
  // isWideTablet orientation label (which lies when the sidebar is expanded).
  const layoutMode = useTabletLayoutMode();
  const heightClass = isWideTablet ? TABLET_HEIGHT.rail : TABLET_HEIGHT.compact;
  const backButtonRef = useRef(null);
  const controlled = typeof detailOpen === 'boolean';
  const showDetailLayer = mode !== 'centered' && mode !== 'full'
    && layoutMode === 'stacked' && controlled && detailOpen;

  // Entering the pushed detail announces it to AT: focus lands on the back
  // affordance (the layer's first interactive element) right after it mounts.
  useEffect(() => {
    if (showDetailLayer) backButtonRef.current?.focus();
  }, [showDetailLayer]);

  if (mode === 'centered') {
    return (
      <main
        data-tablet-page-shell
        data-tablet-mode="centered"
        className={`${heightClass} min-h-[34rem] overflow-y-auto overscroll-contain px-5 py-5 no-scrollbar ${className}`}
      >
        <div className="mx-auto flex min-h-full w-full max-w-5xl items-center">
          <div className="w-full">{children}</div>
        </div>
      </main>
    );
  }

  if (mode === 'full') {
    return (
      <main
        data-tablet-page-shell
        data-tablet-mode="full"
        className={`${heightClass} min-h-[34rem] overflow-hidden ${className}`}
      >
        {children}
      </main>
    );
  }

  if (layoutMode === 'stacked' && !controlled) {
    // Narrow tablet, uncontrolled callers: the SAME two surfaces stack into
    // one scroll column -- nothing hidden, no new visual language, a single
    // scroll owner instead of two cramped columns.
    return (
      <main
        data-tablet-page-shell
        data-tablet-mode="split"
        data-tablet-layout="stacked"
        data-scroll-owner="primary"
        className={`${heightClass} min-h-[34rem] overflow-y-auto overscroll-contain px-4 py-4 no-scrollbar ${className}`}
      >
        <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-4">
          <section data-tablet-primary-pane className={`min-w-0 ${primaryClassName}`}>
            {children}
          </section>
          <aside data-tablet-detail-pane aria-label="Record details" className={`min-w-0 ${detailClassName}`}>
            {detail}
          </aside>
        </div>
      </main>
    );
  }

  if (layoutMode === 'stacked') {
    // Narrow tablet master-detail (HIG): the list owns the full width; row
    // activation pushes the detail as a layer with a clear back affordance.
    return (
      <main
        data-tablet-page-shell
        data-tablet-mode="split"
        data-tablet-layout="stacked"
        data-tablet-detail-open={detailOpen ? 'true' : 'false'}
        className={`${heightClass} min-h-[34rem] overflow-hidden px-4 py-4 ${className}`}
      >
        <div className="relative mx-auto h-full w-full max-w-[1180px]">
          <section
            data-tablet-primary-pane
            data-scroll-owner="primary"
            // React 19 boolean prop: the covered list is inert (not tab- or
            // AT-reachable) while the detail layer is pushed over it.
            inert={Boolean(detailOpen)}
            className={`h-full min-h-0 min-w-0 overflow-hidden ${primaryClassName}`}
          >
            {children}
          </section>
          {detailOpen && (
            <div
              data-tablet-detail-layer
              className="absolute inset-0 z-10 flex min-h-0 flex-col gap-3 bg-background"
              onKeyDown={(event) => {
                if (event.key !== 'Escape' || event.defaultPrevented) return;
                // Open dialogs win Escape (same guard as useListKeyboardNav),
                // so a filter sheet or modal above the layer closes alone.
                if (typeof document !== 'undefined' && document.querySelector(OPEN_DIALOG_GUARD_SELECTOR)) return;
                event.preventDefault();
                onDetailClose?.();
              }}
            >
              <div className="flex shrink-0 items-center">
                <button
                  ref={backButtonRef}
                  type="button"
                  onClick={() => onDetailClose?.()}
                  aria-label={detailBackLabel}
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-icon bg-card/72 text-muted-foreground shadow-e1 transition-all hover:bg-foreground/[0.07] hover:text-foreground active:scale-95 ${TABLET_FOCUS_RING}`}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </div>
              <aside
                data-tablet-detail-pane
                data-scroll-owner="detail"
                aria-label="Record details"
                className={`min-h-0 flex-1 overflow-y-auto overscroll-contain no-scrollbar ${detailClassName}`}
              >
                {detail}
              </aside>
            </div>
          )}
        </div>
      </main>
    );
  }

  return (
    <main
      data-tablet-page-shell
      data-tablet-mode="split"
      data-tablet-layout="split"
      className={`${heightClass} min-h-[34rem] overflow-hidden px-4 py-4 ${className}`}
    >
      {/* Hierarchy: the LIST is the flexible primary column (always at least
          as wide as the detail); the detail is a capped secondary rail. */}
      <div className="mx-auto grid h-full w-full max-w-[1180px] grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] gap-4">
        <section
          data-tablet-primary-pane
          data-scroll-owner="primary"
          className={`min-h-0 min-w-0 overflow-hidden ${primaryClassName}`}
        >
          {children}
        </section>
        <aside
          data-tablet-detail-pane
          data-scroll-owner="detail"
          className={`sticky top-0 min-h-0 min-w-0 self-start overflow-y-auto overscroll-contain no-scrollbar ${detailClassName}`}
          style={{ maxHeight: '100%' }}
          aria-label="Record details"
        >
          {detail}
        </aside>
      </div>
    </main>
  );
};

export default TabletPageShell;
