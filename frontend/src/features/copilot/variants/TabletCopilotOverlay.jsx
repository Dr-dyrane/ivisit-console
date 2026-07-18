import React from 'react';
import { Sparkles } from 'lucide-react';
import { ModalShell } from '../../../components/ui/ModalShell';
import { ProposalSummary } from '../components/ProposalSummary';

/** A bounded overlay so tablet master-detail geometry remains route-owned. */
export const TabletCopilotOverlay = ({ isOpen, onClose, proposal, isPreparing, error }) => (
  <ModalShell
    isOpen={isOpen}
    onClose={onClose}
    title="Copilot"
    subtitle="Quick insights"
    icon={<Sparkles className="h-4 w-4 text-primary" />}
    size="md"
  >
    <div className="px-5 pb-6 md:px-6">
      <ProposalSummary proposal={proposal} isPreparing={isPreparing} error={error} />
    </div>
  </ModalShell>
);
