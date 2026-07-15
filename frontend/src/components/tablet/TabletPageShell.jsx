import React from 'react';
import { useNavigation } from '../../contexts/NavigationContext';

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
}) => {
  const { isWideTablet } = useNavigation();
  const heightClass = isWideTablet ? TABLET_HEIGHT.rail : TABLET_HEIGHT.compact;

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

  return (
    <main
      data-tablet-page-shell
      data-tablet-mode="split"
      className={`${heightClass} min-h-[34rem] overflow-hidden px-4 py-4 ${className}`}
    >
      <div className="mx-auto grid h-full w-full max-w-[1180px] grid-cols-[minmax(22rem,29rem)_minmax(18rem,1fr)] gap-4">
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
