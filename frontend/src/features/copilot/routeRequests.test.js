import {
  createDashboardExplainRequest,
  createEmergencyNextActionRequest,
  createOrganizationReadinessRequest,
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

  it('prepares role-scoped Today workflows across the P1-P3 ladder', () => {
    const admin = createDashboardExplainRequest({
      today: { headline: 'Today' },
      live: true,
      roleKind: 'admin',
    });
    const provider = createDashboardExplainRequest({
      today: { headline: 'Today' },
      live: true,
      roleKind: 'provider',
    });

    expect(admin.context.dashboard.suggestedActions.map((action) => action.label))
      .toEqual(expect.arrayContaining([
        'Review requests',
        'Review approvals',
        'Review organizations',
        'Review facilities',
        'Manage providers',
        'Prepare schedules',
      ]));
    expect(provider.context.dashboard.suggestedActions.map((action) => action.label))
      .toEqual(['Review requests', 'Open live map']);
    admin.context.dashboard.suggestedActions.forEach((action) => {
      expect(action.stages).toEqual(['prepare', 'confirm', 'execute']);
      expect(action.requiresConfirmation).toBe(true);
    });
  });

  it('guides organization onboarding and emergency operations through canonical workflows', () => {
    const organization = createOrganizationReadinessRequest({
      organization: { name: 'Care Group', verification_status: 'pending' },
      verificationLabel: 'Pending',
    });
    const emergency = createEmergencyNextActionRequest({
      heading: 'Request REQ-1',
      statusLabel: 'Active',
      primaryAction: { kind: 'details', label: 'Details', available: true },
      canOpenFinance: true,
    });

    expect(organization.context.organization.suggestedActions.map((action) => action.label))
      .toEqual(['Review verification', 'Review facilities', 'Manage providers', 'Prepare schedules']);
    expect(emergency.context.emergency.suggestedActions.map((action) => action.label))
      .toEqual(['Open request workspace', 'Open live map', 'Open Finance']);
  });

  it('keeps finance out of emergency guidance without finance-route authority', () => {
    const emergency = createEmergencyNextActionRequest({
      heading: 'Request REQ-2',
      statusLabel: 'Active',
      primaryAction: { kind: 'details', label: 'Details', available: true },
    });

    expect(emergency.context.emergency.suggestedActions.map((action) => action.label))
      .toEqual(['Open request workspace', 'Open live map']);
  });
});
