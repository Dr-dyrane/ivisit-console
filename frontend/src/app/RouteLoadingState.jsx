import React from 'react';

const Pulse = ({ className }) => (
  <div className={`animate-pulse bg-muted/38 dark:bg-white/[0.055] ${className}`} />
);

export const RouteLoadingState = () => (
  <section
    role="status"
    aria-live="polite"
    data-testid="route-loading-state"
    className="relative min-h-[calc(100dvh-3rem)] overflow-hidden"
  >
    <span className="sr-only">Loading page</span>

    <div className="flex min-h-[calc(100dvh-3rem)] w-full min-w-0 flex-col gap-5 px-4 pb-8 pt-20 sm:px-5 md:pt-24 lg:h-[calc(100dvh-3rem)] lg:flex-row lg:items-center lg:px-6 lg:pl-24 lg:pt-8 xl:pl-28">
      <section className="flex min-w-0 flex-1 flex-col gap-4 lg:min-h-0 lg:self-stretch">
        <div className="flex min-h-[270px] items-end px-1 py-3 md:px-3 md:py-5 lg:min-h-[330px]">
          <div className="w-full min-w-0 space-y-4">
            <Pulse className="h-8 w-36 rounded-pill" />
            <Pulse className="h-12 w-3/4 rounded-card md:h-[72px]" />
            <Pulse className="h-5 w-1/2 rounded-inner" />

            <div className="mt-5 grid max-w-2xl grid-cols-2 gap-2 sm:grid-cols-3">
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className="flex min-h-[66px] items-start justify-between gap-2 rounded-inner bg-card/65 px-3 py-2.5 backdrop-blur-xl sm:px-4 md:py-3"
                >
                  <div className="min-w-0 space-y-2">
                    <Pulse className="h-3 w-16 rounded-pill" />
                    <Pulse className="h-6 w-9 rounded-inner" />
                  </div>
                  <Pulse className="h-7 w-7 rounded-icon" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col rounded-t-sheet bg-card/68 p-3 shadow-[0_12px_32px_rgb(0_0_0/0.10)] backdrop-blur-2xl dark:bg-card/50 md:rounded-sheet">
          <div className="mx-auto mb-3 h-1.5 w-[42px] rounded-pill bg-foreground/20" />
          <div className="mt-3 min-h-0 flex-1 space-y-2 rounded-card bg-background/30 p-3 dark:bg-black/[0.08]">
            {[0, 1, 2, 3, 4, 5, 6].map((item) => (
              <Pulse key={item} className="h-[78px] rounded-card" />
            ))}
          </div>
        </div>
      </section>

      <aside className="relative z-20 mt-auto rounded-t-sheet bg-card/78 p-4 shadow-[0_12px_32px_rgb(0_0_0/0.10)] backdrop-blur-2xl dark:bg-card/55 md:mx-5 md:mb-5 md:rounded-sheet lg:mt-5 lg:h-[calc(100dvh-5.5rem)] lg:w-[380px] lg:shrink-0 lg:self-stretch xl:w-[440px]">
        <div className="mx-auto mb-4 h-1.5 w-[42px] rounded-pill bg-foreground/20" />

        <div className="space-y-2">
          <Pulse className="h-4 w-24 rounded-pill" />
          <Pulse className="h-6 w-2/3 rounded-inner" />
        </div>

        <div className="mt-5 flex items-center gap-3">
          <Pulse className="h-14 w-14 rounded-pill" />
          <div className="min-w-0 flex-1 space-y-2">
            <Pulse className="h-4 w-1/2 rounded-pill" />
            <Pulse className="h-3 w-2/3 rounded-pill" />
          </div>
        </div>

        <div className="mt-5 space-y-2">
          {[0, 1, 2, 3].map((item) => (
            <Pulse key={item} className="h-[52px] rounded-inner" />
          ))}
        </div>

        <div className="mt-5 space-y-2">
          <Pulse className="h-12 w-full rounded-button" />
          <div className="grid grid-cols-2 gap-2">
            <Pulse className="h-11 rounded-button" />
            <Pulse className="h-11 rounded-button" />
          </div>
        </div>
      </aside>
    </div>
  </section>
);
