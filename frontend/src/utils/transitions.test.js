import {
  canTransition,
  getActionState,
  getNextState,
  getLegalActions,
  isTerminalState,
  LIFECYCLES,
} from './transitions';
import { getEmergencyActionState } from './emergencyActions';
import { CANONICAL_EMERGENCY_STATUSES } from './emergencyStatus';

// The action universe for a domain: every action defined anywhere in its table.
const actionUniverse = (lifecycle) => {
  const set = new Set();
  Object.values(lifecycle.TRANSITIONS).forEach((edges) => {
    Object.keys(edges).forEach((action) => set.add(action));
  });
  return [...set];
};

// Expected legacy getEmergencyActionState output for a STATUS-ONLY record
// (no service_type / payment / ambulance / user_id fields). Encodes the
// behaviour of emergencyActions.js BEFORE the table re-expression so the test
// pins "the current output", not merely self-agreement.
const emergencyBase = (status, overrides = {}) => ({
  status,
  isTerminal: false,
  hasAmbulance: false,
  isBedFlow: false,
  canDispatch: false,
  canComplete: false,
  canProcessCash: false,
  canCancel: true,
  hasUnsettledCash: false,
  cashDisabledReason: null,
  canRetryPayment: false,
  showClinicalRecord: false,
  ...overrides,
});

const EXPECTED_EMERGENCY = {
  pending_approval: emergencyBase('pending_approval'),
  payment_declined: emergencyBase('payment_declined', { isTerminal: true, canCancel: false }),
  in_progress: emergencyBase('in_progress', { canDispatch: true }),
  accepted: emergencyBase('accepted', { canComplete: true }),
  arrived: emergencyBase('arrived', { canComplete: true }),
  completed: emergencyBase('completed', { isTerminal: true, canCancel: false, showClinicalRecord: true }),
  cancelled: emergencyBase('cancelled', { isTerminal: true, canCancel: false, showClinicalRecord: true }),
};

describe('L4 transition table - emergency parity', () => {
  it('getActionState("emergency", r) equals the current getEmergencyActionState(r) for every canonical status', () => {
    CANONICAL_EMERGENCY_STATUSES.forEach((status) => {
      const record = { status };
      const expected = EXPECTED_EMERGENCY[status];
      expect(expected).toBeDefined();
      // getActionState (table-derived) matches the pinned legacy output...
      expect(getActionState('emergency', record)).toEqual(expected);
      // ...and so does the re-exported getEmergencyActionState compat surface.
      expect(getEmergencyActionState(record)).toEqual(expected);
    });
  });

  it('keeps getActionState and getEmergencyActionState in lockstep across record-shape guards and aliases', () => {
    const matrix = [
      { status: 'payment_declined', user_id: 'u1' }, // retryPayment gate opens with a patient id
      { status: 'payment_declined' }, // no patient id -> no retry
      { status: 'in_progress', ambulance_id: 'a1' }, // dispatch blocked (already has ambulance, not bed)
      { status: 'in_progress', ambulance_id: 'a1', service_type: 'bed' }, // bed flow re-opens dispatch
      { status: 'in_progress' },
      { status: 'accepted', ambulance_id: 'a1' },
      { status: 'arrived' },
      { status: 'completed', payment_method: 'cash', payment_status: 'pending' }, // unsettled cash
      { status: 'completed', payment_method: 'cash', payment_status: 'completed' }, // settled
      { status: 'completed', payment_method: 'card' },
      { status: 'dispatched' }, // alias -> in_progress
      { status: 'assigned' }, // alias -> accepted
      { status: 'resolved' }, // alias -> completed
      { status: 'canceled' }, // alias -> cancelled
    ];
    matrix.forEach((record) => {
      expect(getActionState('emergency', record)).toEqual(getEmergencyActionState(record));
    });
  });

  it('reads legal emergency edges from the table', () => {
    expect(canTransition('emergency', 'in_progress', 'dispatch')).toBe(true);
    expect(canTransition('emergency', 'accepted', 'complete')).toBe(true);
    expect(canTransition('emergency', 'arrived', 'complete')).toBe(true);
    expect(canTransition('emergency', 'payment_declined', 'retryPayment')).toBe(true);
    expect(canTransition('emergency', 'pending_approval', 'cancel')).toBe(true);

    expect(getNextState('emergency', 'in_progress', 'dispatch')).toBe('accepted');
    expect(getNextState('emergency', 'accepted', 'complete')).toBe('completed');
    expect(getNextState('emergency', 'payment_declined', 'retryPayment')).toBe('pending_approval');
  });
});

describe('L4 transition table - illegal actions', () => {
  it('returns false for an action that is not legal from the given state', () => {
    // complete is not reachable from pending_approval or in_progress.
    expect(canTransition('emergency', 'pending_approval', 'complete')).toBe(false);
    expect(canTransition('emergency', 'in_progress', 'complete')).toBe(false);
    // dispatch is not reachable from accepted.
    expect(canTransition('emergency', 'accepted', 'dispatch')).toBe(false);
    // an entirely unknown action name is never legal.
    expect(canTransition('emergency', 'in_progress', 'frobnicate')).toBe(false);
    // unknown domain / unknown state are false, never throwing.
    expect(canTransition('not_a_domain', 'in_progress', 'dispatch')).toBe(false);
    expect(canTransition('emergency', 'not_a_state', 'dispatch')).toBe(false);
    // getNextState mirrors the illegal-action verdict.
    expect(getNextState('emergency', 'accepted', 'dispatch')).toBeNull();
    expect(getNextState('not_a_domain', 'x', 'y')).toBeNull();
  });
});

describe('L4 transition table - terminal states', () => {
  it('accepts no transitions out of any terminal state, in every domain', () => {
    Object.entries(LIFECYCLES).forEach(([domain, lifecycle]) => {
      const universe = actionUniverse(lifecycle);
      lifecycle.TERMINAL.forEach((terminalState) => {
        // No action in the domain is legal from a terminal state.
        universe.forEach((action) => {
          expect(canTransition(domain, terminalState, action)).toBe(false);
          expect(getNextState(domain, terminalState, action)).toBeNull();
        });
        // And the terminal state exposes zero legal actions.
        expect(getLegalActions(domain, terminalState)).toEqual([]);
        expect(isTerminalState(domain, terminalState)).toBe(true);
      });
    });
  });
});

describe('L4 transition table - structural invariants', () => {
  it('is self-consistent for every domain', () => {
    Object.values(LIFECYCLES).forEach((lifecycle) => {
      const stateSet = new Set(lifecycle.STATES);

      // 1. Every state is a transition source (keys(TRANSITIONS) === STATES).
      expect(new Set(Object.keys(lifecycle.TRANSITIONS))).toEqual(stateSet);

      lifecycle.TERMINAL.forEach((terminalState) => {
        // 2a. Terminal states are real states...
        expect(stateSet.has(terminalState)).toBe(true);
        // 2b. ...with an empty transition map.
        expect(Object.keys(lifecycle.TRANSITIONS[terminalState])).toEqual([]);
      });

      // 3. Every transition target is itself a valid state.
      Object.values(lifecycle.TRANSITIONS).forEach((edges) => {
        Object.values(edges).forEach((target) => {
          expect(stateSet.has(target)).toBe(true);
        });
      });
    });
  });

  it('covers exactly the six planned domains', () => {
    expect(Object.keys(LIFECYCLES).sort()).toEqual(
      ['emergency', 'insurance', 'operational', 'support', 'verification', 'visit'],
    );
  });
});

describe('L4 transition table - generic getActionState', () => {
  it('projects the table for non-emergency domains', () => {
    const openTicket = getActionState('support', { status: 'open' });
    expect(openTicket).toEqual({
      domain: 'support',
      status: 'open',
      isTerminal: false,
      actions: ['start', 'resolve', 'close'],
      can: { start: true, resolve: true, close: true, reopen: false },
    });

    const closedTicket = getActionState('support', { status: 'closed' });
    expect(closedTicket.isTerminal).toBe(true);
    expect(closedTicket.actions).toEqual([]);

    // verification reads verification_status when status is absent.
    const pendingReview = getActionState('verification', { verification_status: 'pending' });
    expect(pendingReview.can.approve).toBe(true);
    expect(pendingReview.can.reject).toBe(true);
  });

  it('is defensive for unknown domain / empty record', () => {
    expect(getActionState('nope', { status: 'whatever' })).toEqual({
      domain: 'nope',
      status: 'whatever',
      isTerminal: false,
      actions: [],
      can: {},
    });
    expect(() => getActionState('support', null)).not.toThrow();
    expect(getActionState('support', null).status).toBe('');
  });
});
