import React from 'react';

const STATUS_TONE = {
  neutral: 'bg-muted text-muted-foreground',
  ready: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  attention: 'bg-amber-500/10 text-amber-800 dark:text-amber-300',
  blocked: 'bg-destructive/10 text-destructive',
  critical: 'bg-destructive/10 text-destructive',
};

export const ProposalSummary = ({ proposal, isPreparing, error }) => {
  if (isPreparing) {
    return (
      <div className="space-y-3" aria-live="polite" aria-busy="true">
        <div className="h-5 w-3/5 animate-pulse rounded-inner bg-muted" />
        <div className="h-4 w-full animate-pulse rounded-inner bg-muted" />
        <div className="h-4 w-4/5 animate-pulse rounded-inner bg-muted" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-2" role="alert">
        <p className="text-sm font-medium text-foreground">Copilot could not prepare this explanation.</p>
        <p className="text-sm leading-relaxed text-muted-foreground">Use the existing page controls while the screen context is refreshed.</p>
      </div>
    );
  }

  if (!proposal) return null;

  return (
    <div className="space-y-5" aria-live="polite">
      <div className="space-y-2">
        <p className="text-base font-semibold text-foreground">{proposal.title}</p>
        <p className="text-sm leading-relaxed text-muted-foreground">{proposal.summary}</p>
      </div>

      {proposal.evidence.length > 0 && (
        <div className="space-y-2">
          {proposal.evidence.map((item, index) => (
            <div key={`${item.label}-${index}`} className="rounded-inner bg-muted/45 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  {item.description && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.description}</p>}
                </div>
                {item.value !== undefined && <span className="shrink-0 text-sm font-semibold text-foreground">{item.value}</span>}
              </div>
              {item.status && (
                <span className={`mt-2 inline-flex rounded-pill px-2 py-1 text-[11px] font-medium ${STATUS_TONE[item.status] || STATUS_TONE.neutral}`}>
                  {item.status}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-xs leading-relaxed text-muted-foreground">{proposal.guardrail}</p>
    </div>
  );
};
