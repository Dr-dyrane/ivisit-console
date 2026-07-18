import React from 'react';
import { MessageSquareText, X } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { ProposalSummary } from '../components/ProposalSummary';

/**
 * Context-panel compatible content. It owns no fixed geometry so the global
 * ContextPanel shell can mount it without creating a competing desktop rail.
 */
export const DesktopCopilotRail = ({ isOpen, onClose, proposal, isPreparing, error, className = '' }) => {
  if (!isOpen) return null;

  return (
    <section
      aria-label="Copilot guidance"
      className={`min-h-full ${className}`}
      data-copilot-rail
      data-context-panel-content="true"
    >
      <div className="sticky top-0 z-10 -mx-4 -mt-4 mb-4 flex items-center justify-between gap-3 bg-background/95 px-4 pb-3 pt-4 backdrop-blur-xl dark:bg-background/92">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-icon bg-muted">
            <MessageSquareText className="h-4 w-4 text-muted-foreground" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">Copilot</p>
            <p className="truncate text-xs text-muted-foreground">Read-only guidance</p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          onClick={onClose}
          className="h-8 w-8 shrink-0 rounded-pill p-0"
          aria-label="Close Copilot"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <ProposalSummary proposal={proposal} isPreparing={isPreparing} error={error} />
    </section>
  );
};
