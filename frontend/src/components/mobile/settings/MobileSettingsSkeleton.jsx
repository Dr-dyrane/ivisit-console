import React from 'react';

import { Hairline } from '../canon/GroupedList';

export const MobileSettingsSkeleton = () => (
  <div className="space-y-7" aria-hidden="true">
    <section className="px-4">
      <div className="surface-card rounded-card p-4">
        <div className="flex items-center gap-3">
          <span className="h-16 w-16 shrink-0 rounded-icon bg-muted/25 shimmer" />
          <div className="min-w-0 flex-1 space-y-2">
            <span className="block h-5 w-3/5 rounded-pill bg-muted/25 shimmer" />
            <span className="block h-3 w-4/5 rounded-pill bg-muted/15 shimmer" />
            <span className="block h-6 w-24 rounded-pill bg-muted/20 shimmer" />
          </div>
        </div>
        <span className="mt-4 block h-9 w-full rounded-inner bg-muted/15 shimmer" />
      </div>
    </section>

    {[2, 1, 2].map((rows, sectionIndex) => (
      <section key={sectionIndex} className="px-4">
        <span className="mb-2 block h-3 w-20 rounded-pill bg-muted/20 shimmer" />
        <div className="rounded-inner bg-foreground/[0.06] px-3 py-1.5 dark:bg-white/[0.08]">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <React.Fragment key={rowIndex}>
              <div className="flex items-center gap-3 px-2 py-3">
                <span className="h-9 w-9 shrink-0 rounded-icon bg-muted/25 shimmer" />
                <div className="min-w-0 flex-1 space-y-2">
                  <span className="block h-4 w-2/5 rounded-pill bg-muted/25 shimmer" />
                  <span className="block h-3 w-3/5 rounded-pill bg-muted/15 shimmer" />
                </div>
                <span className="h-4 w-4 shrink-0 rounded-icon bg-muted/20 shimmer" />
              </div>
              {rowIndex < rows - 1 && <Hairline inset={56} />}
            </React.Fragment>
          ))}
        </div>
      </section>
    ))}
  </div>
);
