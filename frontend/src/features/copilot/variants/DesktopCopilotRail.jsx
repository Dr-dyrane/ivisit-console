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
      className={`space-y-4 ${className}`}
      data-copilot-rail
      data-context-panel-content="true"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-icon bg-muted"><MessageSquareText className="h-4 w-4 text-muted-foreground" /></span>
          <div className="min-w-0"><p className="text-sm font-semibold text-foreground">Copilot</p><p className="text-xs text-muted-foreground">Read-only guidance</p></div>
        </div>
        <Button type="button" variant="ghost" onClick={onClose} className="h-8 w-8 rounded-pill p-0" aria-label="Close Copilot"><X className="h-4 w-4" /></Button>
      </div>
      <ProposalSummary proposal={proposal} isPreparing={isPreparing} error={error} />
    </section>
  );
};
