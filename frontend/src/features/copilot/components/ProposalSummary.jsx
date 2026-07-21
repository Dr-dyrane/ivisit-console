import React, { useState } from 'react';
import { ArrowRight, Check, Copy, Loader2, Sparkles } from 'lucide-react';
import { Button } from '../../../components/ui/button';

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
  const [copyState, setCopyState] = useState('idle');

  const copyLocalDraft = async () => {
    const clipboard = typeof navigator !== 'undefined' ? navigator.clipboard : null;
    if (!clipboard?.writeText || !item.copyText) {
      setCopyState('unavailable');
      return;
    }

    try {
      await clipboard.writeText(item.copyText);
      setCopyState('copied');
    } catch {
      setCopyState('unavailable');
    }
  };

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
      {item.copyText && (
        <dd className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={copyLocalDraft}
            className="h-9 rounded-button bg-background/70 px-3 text-xs font-semibold text-foreground transition-all hover:bg-foreground/10 focus-visible:bg-foreground/10 active:scale-[0.98]"
            aria-live="polite"
          >
            {copyState === 'copied' ? <Check className="mr-1.5 h-3.5 w-3.5" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
            {copyState === 'copied' ? 'Copied locally' : 'Copy draft'}
          </Button>
          {copyState === 'unavailable' && (
            <span className="text-xs text-destructive" role="status">Copy is unavailable in this browser.</span>
          )}
        </dd>
      )}
    </div>
  );
};

const WorkflowActions = ({
  actions,
  pendingAction,
  isExecuting,
  executionError,
  onPrepareAction,
  onCancelAction,
  onConfirmAction,
}) => {
  if (!actions?.length) return null;

  if (pendingAction) {
    return (
      <section className="rounded-card bg-primary/8 p-4" aria-label="Confirm Copilot action">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-icon bg-primary/12 text-primary">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{pendingAction.label}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Copilot will open this workflow. You will review any changes there.
            </p>
          </div>
        </div>
        {executionError && (
          <p className="mt-3 rounded-inner bg-destructive/10 px-3 py-2 text-xs text-destructive" role="alert">
            This workflow could not be opened. Try again.
          </p>
        )}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancelAction}
            disabled={isExecuting}
            className="h-10 rounded-button bg-muted/35 text-sm font-semibold text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
          >
            Back
          </Button>
          <Button
            type="button"
            onClick={onConfirmAction}
            disabled={isExecuting}
            aria-busy={isExecuting}
            className="h-10 rounded-button text-sm font-semibold"
          >
            {isExecuting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isExecuting ? 'Opening' : 'Open workflow'}
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-2" aria-label="Prepared actions">
      <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Next steps
      </p>
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          onClick={() => onPrepareAction?.(action)}
          disabled={action.availability !== 'available'}
          title={action.availability === 'available' ? undefined : action.reason}
          className="group flex w-full items-center gap-3 rounded-inner bg-muted/28 p-3 text-left text-muted-foreground transition-all hover:bg-foreground/10 hover:text-foreground focus-visible:bg-foreground/10 focus-visible:text-foreground active:bg-foreground/15 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-icon bg-background/70 text-primary">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-foreground">{action.label}</span>
            {action.description && (
              <span className="mt-0.5 block text-xs leading-5">{action.description}</span>
            )}
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
        </button>
      ))}
    </section>
  );
};

export const ProposalSummary = ({
  proposal,
  isPreparing,
  error,
  pendingAction,
  isExecuting = false,
  executionError,
  onRetry,
  onPrepareAction,
  onCancelAction,
  onConfirmAction,
}) => {
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
        {onRetry && (
          <Button
            type="button"
            variant="ghost"
            onClick={onRetry}
            className="h-10 rounded-button bg-muted/35 px-4 text-sm font-semibold text-foreground transition-all hover:bg-foreground/10 focus-visible:bg-foreground/10 active:scale-[0.98]"
          >
            Try again
          </Button>
        )}
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

      <WorkflowActions
        actions={proposal.suggestedActions}
        pendingAction={pendingAction}
        isExecuting={isExecuting}
        executionError={executionError}
        onPrepareAction={onPrepareAction}
        onCancelAction={onCancelAction}
        onConfirmAction={onConfirmAction}
      />

    </div>
  );
};
