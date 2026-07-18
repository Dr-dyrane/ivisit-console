import {
  createEmergencyNextActionRequest,
  formatPaymentEvidence,
} from './routeRequests';

describe('Copilot route evidence presentation', () => {
  it('humanizes payment method and terminal status tokens without changing the amount', () => {
    expect(formatPaymentEvidence('CASH_PAYMENT \u00b7 160.00 USD \u00b7 completed'))
      .toBe('Cash Payment \u00b7 160.00 USD \u00b7 Completed');
  });

  it('does not mark read-only details as an attention state', () => {
    const request = createEmergencyNextActionRequest({
      heading: 'Request REQ-514070',
      statusLabel: 'Completed',
      primaryAction: { kind: 'details', label: 'Details', available: true },
      arrivalConfirmation: 'Confirmed 3:46 PM',
      paymentValue: 'CASH_PAYMENT \u00b7 160.00 USD \u00b7 completed',
      responderValue: 'Demo Driver 2 \u00b7 ETA pending',
    });

    expect(request.context.emergency.evidence).toEqual(expect.arrayContaining([
      expect.objectContaining({
        label: 'Next available action',
        value: 'Details',
        status: 'neutral',
      }),
      expect.objectContaining({
        label: 'Payment',
        value: 'Cash Payment \u00b7 160.00 USD \u00b7 Completed',
      }),
    ]));
  });
});
