import React from 'react';

export const RequestStatusBar = ({ presentation }) => (
  <div
    role="list"
    aria-label="Request lifecycle"
    className="flex items-center justify-between gap-2 rounded-inner bg-foreground/[0.05] p-1.5 dark:bg-white/[0.07]"
  >
    {presentation.progress.steps.map((step, index) => {
      const isCurrent = presentation.progress.currentKey === step.key;
      const isPast = presentation.progress.activeIndex > index;
      return (
        <span
          key={step.key}
          role="listitem"
          aria-current={isCurrent ? 'step' : undefined}
          className={`min-w-0 flex-1 rounded-button px-1.5 py-2 text-[9px] font-semibold uppercase tracking-wide transition-all active:scale-[0.96] sm:px-3 sm:text-[10px] sm:tracking-wider ${isCurrent ? 'bg-primary text-primary-foreground' :
            isPast ? 'text-primary/70 bg-primary/5' : 'text-muted-foreground/40'
          }`}
        >
          {step.label}
        </span>
      );
    })}
  </div>
);
