import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ProposalSummary } from './ProposalSummary';

const proposal = {
  title: 'Request REQ-514070',
  summary: 'Five current signals are available for review.',
  evidence: [
    {
      label: 'Lifecycle status',
      value: 'Completed',
      status: 'neutral',
    },
    {
      label: 'Patient arrival',
      value: 'Confirmed 3:46 PM',
      status: 'ready',
    },
    {
      label: 'Payment',
      value: 'Cash Payment \u00b7 160.00 USD \u00b7 Completed',
      status: 'neutral',
    },
    {
      label: 'Responder',
      value: `Demo Driver 2 \u00b7 ETA pending \u00b7 ${'unbroken'.repeat(24)}`,
      status: 'neutral',
    },
  ],
  guardrail: 'This explanation cannot change the emergency lifecycle.',
};

describe('ProposalSummary constrained evidence layout', () => {
  it('stacks values under semantic labels and keeps long content breakable', () => {
    const markup = renderToStaticMarkup(
      <ProposalSummary proposal={proposal} isPreparing={false} error={null} />,
    );

    expect(markup).toContain('<dl');
    expect(markup).toContain('<dt');
    expect(markup).toContain('>Payment</dt>');
    expect(markup).toContain('<dd class="mt-1.5 min-w-0 max-w-full whitespace-pre-wrap');
    expect(markup).toContain('[overflow-wrap:anywhere]');
    expect(markup).toContain('Cash Payment \u00b7 160.00 USD \u00b7 Completed');
    expect(markup).toContain('Demo Driver 2 \u00b7 ETA pending');
  });

  it('humanizes consequential states and suppresses neutral implementation labels', () => {
    const markup = renderToStaticMarkup(
      <ProposalSummary proposal={proposal} isPreparing={false} error={null} />,
    );

    expect(markup).toContain('>Confirmed</span>');
    expect(markup).not.toContain('>ready</span>');
    expect(markup).not.toContain('>neutral</span>');
  });

  it('does not render internal capability guardrails as user-facing copy', () => {
    const markup = renderToStaticMarkup(
      <ProposalSummary proposal={proposal} isPreparing={false} error={null} />,
    );

    expect(markup).not.toContain(proposal.guardrail);
    expect(markup).not.toMatch(/backend|receiver|proposal-only|current screen/i);
  });

  it('renders prepared workflow cards and a concise confirmation state', () => {
    const action = {
      id: 'prepare.schedules',
      label: 'Prepare schedules',
      description: 'Open staff scheduling.',
      availability: 'available',
      stages: ['prepare', 'confirm', 'execute'],
      requiresConfirmation: true,
      command: { id: 'workflow.open_schedules' },
    };
    const actionMarkup = renderToStaticMarkup(
      <ProposalSummary
        proposal={{ ...proposal, suggestedActions: [action] }}
        isPreparing={false}
        error={null}
      />,
    );
    const confirmationMarkup = renderToStaticMarkup(
      <ProposalSummary
        proposal={{ ...proposal, suggestedActions: [action] }}
        pendingAction={action}
        isPreparing={false}
        error={null}
      />,
    );

    expect(actionMarkup).toContain('Prepare schedules');
    expect(actionMarkup).toContain('Open staff scheduling.');
    expect(confirmationMarkup).toContain('Open workflow');
    expect(confirmationMarkup).toContain('You will review any changes there.');
  });

  it('provides a product-language retry action for a preparation error', () => {
    const markup = renderToStaticMarkup(
      <ProposalSummary proposal={null} isPreparing={false} error={new Error('invalid request')} onRetry={() => {}} />,
    );

    expect(markup).toContain('Copilot is unavailable right now.');
    expect(markup).toContain('Try again');
    expect(markup).not.toContain('invalid request');
  });
});
