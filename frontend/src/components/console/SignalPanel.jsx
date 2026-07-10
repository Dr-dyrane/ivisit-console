// Console design system - signal panel (donor: Requests).
// ARCHITECTURE RULES LIVE HERE: hero region heights (min-h-[270px] / lg:min-h-[330px]),
// eyebrow tone chip, display-scale headline, subhead width cap. NO entrance motion --
// the shimmer skeleton holds this exact layout and content swaps in where it stood
// (lesson 15; a frozen entrance once left this panel at 39% opacity).
import React from 'react';
import { Shimmer } from './primitives';

export const SignalPanel = ({ signal, loading, toneClassMap, children }) => {
  const SignalIcon = signal.icon;

  return (
    <section className="flex min-h-[270px] items-end px-1 py-3 md:px-3 md:py-5 lg:min-h-[330px]">
      <div className="w-full min-w-0">
        {loading ? (
          <div className="space-y-4">
            <Shimmer className="h-8 w-36 rounded-pill" />
            <Shimmer className="h-12 w-3/4 rounded-card md:h-[72px]" />
            <Shimmer className="h-5 w-1/2 rounded-inner" />
          </div>
        ) : (
          <div>
            <div className={`mb-3 inline-flex items-center gap-2 rounded-pill px-3 py-2 text-xs font-semibold ${toneClassMap[signal.tone] || toneClassMap.muted}`}>
              <SignalIcon className="h-4 w-4" />
              {signal.label}
            </div>
            <h1 className="text-[34px] font-semibold leading-[1.05] tracking-tight text-foreground md:text-6xl">
              {signal.headline}
            </h1>
            <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
              {signal.subhead}
            </p>
          </div>
        )}

        {children}
      </div>
    </section>
  );
};
