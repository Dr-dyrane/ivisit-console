import {
  buildEmergencyLifecyclePresentation,
  canActorCompleteEmergency,
} from './emergencyLifecyclePresentation';

const READY_PAYMENT = {
  payment_id: 'payment-1',
  payment_method: 'cash',
  payment_status: 'completed',
};

const ACCEPTED_ASSIGNMENT = {
  current_responder_assignment_id: 'assignment-1',
  ambulance_id: 'ambulance-1',
  responder_id: 'responder-1',
};

const present = (request, options = {}) => buildEmergencyLifecyclePresentation(request, {
  canManage: true,
  receivers: { details: true, dispatch: true, complete: true, cancel: true },
  ...options,
});

describe('emergency lifecycle presentation', () => {
  it('offers ambulance dispatch only for a paid, unassigned in-progress request', () => {
    const lifecycle = present({
      id: 'request-1',
      status: 'in_progress',
      service_type: 'ambulance',
      ...READY_PAYMENT,
    });

    expect(lifecycle.status.label).toBe('Ready to dispatch');
    expect(lifecycle.progress).toMatchObject({ currentKey: 'pending_approval', activeIndex: 0 });
    expect(lifecycle.actions.primary).toMatchObject({
      kind: 'dispatch',
      label: 'Dispatch',
      available: true,
      receiver: 'console_dispatch_emergency',
    });
  });

  it('treats an active responder offer as awaiting acceptance, never dispatchable again', () => {
    const lifecycle = present({
      id: 'request-2',
      status: 'in_progress',
      service_type: 'ambulance',
      ...READY_PAYMENT,
      current_responder_assignment_id: 'assignment-1',
      ambulance_id: 'ambulance-1',
    });

    expect(lifecycle.status.label).toBe('Awaiting responder');
    expect(lifecycle.progress).toMatchObject({ currentKey: 'pending_approval', activeIndex: 0 });
    expect(lifecycle.actions.dispatch).toMatchObject({ available: false });
    expect(lifecycle.actions.primary.kind).toBe('details');
  });

  it('shows dispatched only after accepted assignment evidence and hides earlier commands', () => {
    const lifecycle = present({
      id: 'request-3',
      status: 'accepted',
      service_type: 'ambulance',
      ...READY_PAYMENT,
      ...ACCEPTED_ASSIGNMENT,
    });

    expect(lifecycle.status.label).toBe('Dispatched');
    expect(lifecycle.progress.currentKey).toBe('accepted');
    expect(lifecycle.actions.dispatch.available).toBe(false);
    expect(lifecycle.actions.complete.available).toBe(false);
    expect(lifecycle.actions.primary.kind).toBe('details');
  });

  it('allows arrival completion only for the assigned responder', () => {
    const request = {
      id: 'request-4',
      status: 'arrived',
      service_type: 'ambulance',
      ...ACCEPTED_ASSIGNMENT,
    };
    const assignedResponderCanComplete = canActorCompleteEmergency(request, {
      isProvider: true,
      userId: 'responder-1',
    });
    const lifecycle = present(request, {
      canComplete: assignedResponderCanComplete,
      receivers: { details: true, complete: true },
    });

    expect(assignedResponderCanComplete).toBe(true);
    expect(canActorCompleteEmergency(request, {
      canManage: true,
      isProvider: false,
      userId: 'manager-1',
    })).toBe(false);
    expect(lifecycle.actions.primary).toMatchObject({
      kind: 'complete',
      available: true,
      receiver: 'responder_complete_emergency',
    });
  });

  it('distinguishes responder arrival from patient confirmation', () => {
    const awaitingPatient = present({
      id: 'request-arrived',
      status: 'arrived',
      service_type: 'ambulance',
      ...ACCEPTED_ASSIGNMENT,
    });
    const confirmed = present({
      id: 'request-confirmed',
      status: 'arrived',
      service_type: 'ambulance',
      patient_acknowledged_arrival_at: '2026-07-14T20:40:00.000Z',
      ...ACCEPTED_ASSIGNMENT,
    });

    expect(awaitingPatient.status.label).toBe('Arrived');
    expect(awaitingPatient.arrival).toEqual({
      acknowledged: false,
      patientAcknowledgedAt: null,
    });
    expect(confirmed.status.label).toBe('Arrival confirmed');
    expect(confirmed.arrival).toEqual({
      acknowledged: true,
      patientAcknowledgedAt: '2026-07-14T20:40:00.000Z',
    });
  });

  it.each(['completed', 'cancelled'])(
    'keeps %s requests free of dispatch, complete, and cancel commands',
    (status) => {
      const lifecycle = present({
        id: `request-${status}`,
        status,
        service_type: 'ambulance',
        ...READY_PAYMENT,
        ...ACCEPTED_ASSIGNMENT,
      }, { canComplete: true });

      expect(lifecycle.actions).toMatchObject({
        dispatch: { available: false },
        complete: { available: false },
        cancel: { available: false },
        primary: { kind: 'details' },
      });
    }
  );

  it('uses the bed receivers only when payment and facility evidence are ready', () => {
    const ready = present({
      id: 'bed-1',
      status: 'in_progress',
      service_type: 'bed',
      hospital_id: 'hospital-1',
      ...READY_PAYMENT,
    });
    const accepted = present({
      id: 'bed-2',
      status: 'accepted',
      service_type: 'bed',
      hospital_id: 'hospital-1',
    }, { canComplete: true });

    expect(ready.status.label).toBe('Ready to accept');
    expect(ready.actions.primary).toMatchObject({
      kind: 'dispatch',
      label: 'Accept bed',
      receiver: 'console_accept_bed_emergency',
    });
    expect(accepted.actions.primary).toMatchObject({
      kind: 'complete',
      receiver: 'console_complete_emergency',
    });
  });

  it.each([
    [
      'missing payment identity',
      { payment_method: 'cash', payment_status: 'completed' },
      'Awaiting payment',
    ],
    [
      'missing settlement method',
      { payment_id: 'payment-1', payment_status: 'completed' },
      'Awaiting payment',
    ],
    [
      'partial assignment evidence',
      { ...READY_PAYMENT, ambulance_id: 'ambulance-1' },
      'Assignment pending',
    ],
  ])('fails closed with %s', (_, evidence, label) => {
    const lifecycle = present({
      id: 'request-closed',
      status: 'in_progress',
      service_type: 'ambulance',
      ...evidence,
    });

    expect(lifecycle.status.label).toBe(label);
    expect(lifecycle.actions.dispatch.available).toBe(false);
    expect(lifecycle.actions.primary.kind).toBe('details');
  });

  it('does not invent dispatch or completion receivers for booking or unknown states', () => {
    const booking = present({
      id: 'booking-1',
      status: 'in_progress',
      service_type: 'booking',
      ...READY_PAYMENT,
    }, { canComplete: true });
    const unknown = present({
      id: 'request-unknown',
      status: 'mystery',
      service_type: 'ambulance',
      ...READY_PAYMENT,
    }, { canComplete: true });

    expect(booking.service).toMatchObject({ dispatchReceiver: null, completeReceiver: null });
    expect(booking.actions.primary.kind).toBe('details');
    expect(unknown.status).toMatchObject({ label: 'Unknown status', degraded: true });
    expect(unknown.actions.primary.kind).toBe('details');
  });

  it('normalizes the legacy dispatched alias before deriving its status and CTA', () => {
    const lifecycle = present({
      id: 'request-alias',
      status: 'dispatched',
      service_type: 'ambulance',
      ...READY_PAYMENT,
    });

    expect(lifecycle.status).toMatchObject({ key: 'in_progress', label: 'Ready to dispatch' });
    expect(lifecycle.progress.currentKey).toBe('pending_approval');
    expect(lifecycle.actions.primary.kind).toBe('dispatch');
  });

  it('requires an explicit mounted receiver before exposing a command', () => {
    const lifecycle = buildEmergencyLifecyclePresentation({
      id: 'request-no-receiver',
      status: 'in_progress',
      service_type: 'ambulance',
      ...READY_PAYMENT,
    }, { canManage: true, receivers: { details: true } });

    expect(lifecycle.actions.dispatch).toMatchObject({
      available: false,
      reason: 'Dispatch is not available from this request.',
    });
    expect(lifecycle.actions.primary.kind).toBe('details');
  });

  it('keeps payment retry unavailable even when a callback is mounted', () => {
    const lifecycle = buildEmergencyLifecyclePresentation({
      id: 'request-payment-declined',
      user_id: 'patient-1',
      status: 'payment_declined',
      service_type: 'ambulance',
    }, {
      canManage: true,
      receivers: { details: true, retryPayment: true },
    });

    expect(lifecycle.actions.retryPayment).toEqual({
      kind: 'retry',
      label: 'Retry payment',
      available: false,
      receiver: null,
      reason: 'Payment retry is not available here.',
    });
    expect(lifecycle.actions.primary.kind).toBe('details');
  });
});
