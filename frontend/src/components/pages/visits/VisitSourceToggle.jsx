import React from 'react';
import { CalendarClock } from 'lucide-react';

const surfaceClass = {
  mobile: 'h-9 w-9 rounded-button bg-background/60 shadow-sm dark:bg-white/[0.06]',
  tablet: 'h-11 w-11 rounded-icon bg-card/72 shadow-e1',
};

export const VisitSourceToggle = ({ viewMode = 'all', onChange, surface = 'mobile' }) => {
  const scheduled = viewMode === 'scheduled';
  const actionLabel = scheduled ? 'Show visit history' : 'Show scheduled visits';

  return (
    <button
      type="button"
      onClick={() => onChange?.(scheduled ? 'all' : 'scheduled')}
      aria-label={actionLabel}
      aria-pressed={scheduled}
      title={actionLabel}
      data-state={scheduled ? 'active' : 'idle'}
      className={`flex shrink-0 items-center justify-center transition-all active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/25 ${surfaceClass[surface] || surfaceClass.mobile} ${scheduled
        ? 'bg-foreground text-background'
        : 'text-muted-foreground hover:bg-foreground/10 hover:text-foreground'
      }`}
    >
      <CalendarClock className="h-[18px] w-[18px]" aria-hidden="true" />
    </button>
  );
};

export default VisitSourceToggle;
