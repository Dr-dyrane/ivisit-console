import React from 'react';
import { MessageSquareText } from 'lucide-react';
import { ModalShell } from '../../../components/ui/ModalShell';
import { ProposalSummary } from '../components/ProposalSummary';

export const MobileCopilotSheet = ({ isOpen, onClose, proposal, isPreparing, error }) => (
  <ModalShell
    isOpen={isOpen}
    onClose={onClose}
    title="Copilot"
    subtitle="Read-only guidance from this screen"
    icon={<MessageSquareText className="h-4 w-4 text-muted-foreground" />}
    size="lg"
  >
    <div className="px-4 pb-5 md:px-6">
      <ProposalSummary proposal={proposal} isPreparing={isPreparing} error={error} />
    </div>
  </ModalShell>
);
