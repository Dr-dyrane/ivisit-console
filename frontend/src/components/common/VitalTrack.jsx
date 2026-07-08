import React from 'react';
import { Check } from 'lucide-react';

/**
 * VitalTrack — the canonical stepped progress track (Trip Summary golden standard,
 * CONSOLE_DESIGN_SYSTEM_FROM_APP.md §9.5). Tells a record's story as a lifecycle:
 * e.g. Scheduled -> Active -> Done. Reusable across any stateful entity (visits,
 * emergencies, verification, onboarding, ...) so the "context" energy is identical
 * everywhere.
 *
 * Canon: borderless, semantic radius, one tone accent; motion is CSS transition only
 * (honors the global prefers-reduced-motion rule in index.css). Content, not chrome —
 * renders on an opaque muted surface, never glass.
 *
 * @param {Array<{key:string,label:string}>} steps  ordered lifecycle steps
 * @param {string} currentKey   key of the active step
 * @param {string} [tone]       CSS color for done/active nodes (default brand red)
 * @param {boolean} [cancelled] render a muted, terminated track (e.g. cancelled)
 * @param {string} [label]      eyebrow label (default "Progress")
 * @param {string} [className]  extra classes on the wrapper
 */
export const VitalTrack = ({
  steps = [],
  currentKey,
  tone = 'hsl(var(--primary))',
  cancelled = false,
  label = 'Progress',
  className = '',
}) => {
  if (!steps.length) return null;

  const rawIdx = steps.findIndex((s) => s.key === currentKey);
  const idx = rawIdx < 0 ? 0 : rawIdx;
  const accent = cancelled ? 'hsl(var(--muted-foreground))' : tone;
  const muted = 'hsl(var(--muted))';

  return (
    <div className={`rounded-inner bg-muted/22 p-4 ${className}`}>
      <p className="eyebrow mb-3">
        {label}
      </p>
      <div className="flex items-center">
        {steps.map((step, i) => {
          const reached = i <= idx;
          const isCurrent = i === idx && !cancelled;
          const isTodo = i > idx || cancelled;
          return (
            <React.Fragment key={step.key}>
              {i > 0 && (
                <span
                  className="h-[3px] flex-1 rounded-pill transition-colors duration-500"
                  style={{ background: reached && !cancelled ? accent : muted }}
                  aria-hidden="true"
                />
              )}
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-pill text-[11px] transition-all duration-500"
                style={{
                  background: isTodo ? muted : accent,
                  color: isTodo ? 'hsl(var(--muted-foreground))' : 'hsl(var(--primary-foreground))',
                  boxShadow: isCurrent ? `0 0 0 4px ${accent}22` : 'none',
                }}
              >
                {reached && !cancelled && <Check className="h-3 w-3" strokeWidth={3} />}
              </span>
            </React.Fragment>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between">
        {steps.map((step, i) => (
          <span
            key={step.key}
            className="text-[10px] font-semibold"
            style={{ color: i === idx && !cancelled ? accent : 'hsl(var(--muted-foreground))' }}
          >
            {step.label}
          </span>
        ))}
      </div>
    </div>
  );
};

export default VitalTrack;
