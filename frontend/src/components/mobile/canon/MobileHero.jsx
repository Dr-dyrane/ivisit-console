// Mobile canon kit - page heading (list pages) + dashboard hero (CANON_COMPONENT_
// SPECS S1). Chrome is always present - no entrance motion; the summary line
// tracks the ACTIVE KPI scope and a failed load never renders a confident zero.
import React from 'react';
import { UpdatingPill } from './Loading';

// List-page heading: title + honest count line (ME:311-322 / MV:300-311).
// Copy derivation is baked so every page states loading/failure/count the same
// way: 'Loading requests...' / 'Requests did not load' / '3 requests'.
export const MobileHeading = ({ title, noun, count, showSkeleton, failedEmpty, summary = null }) => {
  const nounPlural = `${noun}s`;
  const line = summary != null
    ? summary
    : showSkeleton
      ? `Loading ${nounPlural}...`
      : failedEmpty
        ? `${nounPlural.charAt(0).toUpperCase()}${nounPlural.slice(1)} did not load`
        : `${count} ${noun}${count === 1 ? '' : 's'}`;

  return (
    <section className="px-4">
      <h1 className="text-2xl font-semibold leading-tight tracking-tight text-foreground">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{line}</p>
    </section>
  );
};

// Dashboard hero (MT:323-356): status pill row (Updating pill right-anchored,
// no layout shift) -> headline -> subhead -> pills row (children).
export const MobileHero = ({ toneClass, icon: Icon = null, statusLabel, headline, subhead, isFetching = false, children }) => (
  <section className="px-4">
    <div className="flex items-center justify-between gap-3">
      <span className={`inline-flex items-center gap-2 rounded-pill px-3 py-1.5 text-xs font-semibold ${toneClass}`} role="status" aria-live="polite">
        {Icon && <Icon className="h-4 w-4" />}
        {statusLabel}
      </span>
      {isFetching && <UpdatingPill />}
    </div>
    <h1 className="mt-4 text-2xl font-semibold leading-tight tracking-tight text-foreground [overflow-wrap:anywhere]">
      {headline}
    </h1>
    <p className="mt-2 text-sm leading-6 text-muted-foreground">{subhead}</p>
    {children && <div className="mt-4 flex flex-wrap gap-2">{children}</div>}
  </section>
);
