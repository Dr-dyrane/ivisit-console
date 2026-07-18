import React from 'react';
import { Sparkles } from 'lucide-react';
import { ModalShell } from '../../../components/ui/ModalShell';
import { ProposalSummary } from '../components/ProposalSummary';

export const MobileCopilotSheet = ({ isOpen, onClose, proposal, isPreparing, error }) => (
  <ModalShell
    isOpen={isOpen}
    onClose={onClose}
    title="Copilot"
    subtitle="Quick insights"
    icon={<Sparkles className="h-4 w-4 text-primary" />}
    size="lg"
  >
    <div className="px-4 pb-5 md:px-6">
      <ProposalSummary proposal={proposal} isPreparing={isPreparing} error={error} />
    </div>
  </ModalShell>
);
