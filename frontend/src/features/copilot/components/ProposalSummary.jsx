import React from 'react';

const STATUS_META = {
  neutral: { label: null, className: '' },
  ready: {
    label: 'Confirmed',
    className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  },
  attention: {
    label: 'Review',
    className: 'bg-amber-500/10 text-amber-800 dark:text-amber-300',
  },
  blocked: {
    label: 'Blocked',
    className: 'bg-destructive/10 text-destructive',
  },
  critical: {
    label: 'Urgent',
    className: 'bg-destructive/10 text-destructive',
  },
};

const EvidenceCard = ({ item }) => {
  const status = STATUS_META[item.status] || STATUS_META.neutral;

  return (
    <div className="min-w-0 rounded-inner bg-muted/35 p-3.5">
      <div className="flex min-w-0 items-start justify-between gap-2">
        <dt className="min-w-0 text-xs font-medium leading-5 text-muted-foreground">
          {item.label}
        </dt>
        {status.label && (
          <span
            className={`inline-flex shrink-0 rounded-pill px-2 py-1 text-[10px] font-semibold leading-none ${status.className}`}
          >
            {status.label}
          </span>
        )}
      </div>
      {item.value !== undefined && (
        <dd className="mt-1.5 min-w-0 max-w-full whitespace-pre-wrap text-sm font-semibold leading-5 text-foreground [overflow-wrap:anywhere]">
          {item.value}
        </dd>
      )}
      {item.description && (
        <dd className="mt-1.5 min-w-0 text-xs leading-5 text-muted-foreground [overflow-wrap:anywhere]">
          {item.description}
        </dd>
      )}
    </div>
  );
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
        <p className="text-sm font-medium text-foreground">Copilot is unavailable right now.</p>
        <p className="text-sm leading-relaxed text-muted-foreground">Try again shortly.</p>
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
        <dl className="space-y-2">
          {proposal.evidence.map((item, index) => (
            <EvidenceCard key={`${item.label}-${index}`} item={item} />
          ))}
        </dl>
      )}

    </div>
  );
};
