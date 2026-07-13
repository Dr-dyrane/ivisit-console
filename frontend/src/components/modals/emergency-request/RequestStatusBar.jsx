import React from 'react';
import {
  STATUS_LABELS,
  STATUS_SHORT_LABELS,
  STATUS_STEPS,
} from './requestModel';

export const RequestStatusBar = ({
  currentStatus,
  currentStepIndex,
  isEdit,
  setFormData,
}) => (
  <div className="flex items-center justify-between gap-2 rounded-inner bg-foreground/[0.05] p-1.5 dark:bg-white/[0.07]">
    {STATUS_STEPS.map((step, index) => {
      const isCurrent = currentStatus === step;
      const isPast = currentStepIndex > index;
      return (
        <button
          key={step}
          type="button"
          disabled={!isEdit}
          aria-pressed={isCurrent}
          onClick={isEdit ? () => setFormData((previous) => ({ ...previous, status: step })) : undefined}
          className={`min-w-0 flex-1 rounded-button px-1.5 py-2 text-[9px] font-semibold uppercase tracking-wide transition-all active:scale-[0.96] sm:px-3 sm:text-[10px] sm:tracking-wider ${isCurrent ? 'bg-primary text-primary-foreground' :
            isPast ? 'text-primary/70 bg-primary/5' : 'text-muted-foreground/40'
          }`}
        >
          <span className="hidden sm:inline">{STATUS_LABELS[step] || step.replace(/_/g, ' ')}</span>
          <span className="sm:hidden">{STATUS_SHORT_LABELS[step] || STATUS_LABELS[step] || step.replace(/_/g, ' ')}</span>
        </button>
      );
    })}
  </div>
);
