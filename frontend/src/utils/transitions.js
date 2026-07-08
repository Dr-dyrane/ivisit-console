/**
 * transitions.js - L4 lifecycle-legality interpreters (pure, no deps).
 *
 * Companion to constants/lifecycles.js (the transition-table data). Implements
 * the Console Layer-Model Plan's L4 seam (frontend/docs/architecture/
 * CONSOLE_LAYER_MODEL_PLAN.md, section D + steps S2-2 / S2-3):
 *
 *   canTransition(domain, state, action)  -> boolean legality (pure table lookup)
 *   getActionState(domain, record)        -> per-domain action surface for a row
 *
 * plus small pure helpers (getNextState, getLegalActions, isTerminalState).
 *
 * getActionState('emergency', record) re-expresses the legacy
 * getEmergencyActionState (utils/emergencyActions.js:7) OVER the emergency table:
 * the dispatch / complete / retryPayment gates are read from the table via
 * canTransition, then constrained by record-shape guards (bed flow, ambulance
 * presence, patient id, cash settlement). It returns the exact same object shape
 * as the legacy helper, and utils/transitions.test.js locks the two in parity
 * for every canonical status.
 *
 * IMPORTANT (no import cycle): this module must NOT import from
 * utils/emergencyActions.js. emergencyActions.js imports canTransition FROM here
 * (one-directional), so the emergency action-state assembly is intentionally
 * expressed once here and once in emergencyActions.js (the backward-compatible
 * public surface pinned by EmergencyRequestsPage.contract.test.js). The single
 * source of TRUTH -- transition legality -- lives only in the table.
 */

import { LIFECYCLES } from '../constants/lifecycles';
import { canonicalizeEmergencyStatus, isTerminalEmergencyStatus } from './emergencyStatus';
import { canonicalizeVisitStatus } from './visitStatus';

const CASH_METHODS = new Set(['cash', 'cash_payment']);

const toLower = (value) => String(value ?? '').trim().toLowerCase();

// Per-domain state normalisers. Emergency and visit reuse their canonicalisers
// so aliases (e.g. "dispatched" -> "in_progress") resolve before table lookup;
// other domains fall back to trimmed lowercase.
const STATE_NORMALIZERS = {
  emergency: (state) => toLower(canonicalizeEmergencyStatus(state, state)),
  visit: (state) => toLower(canonicalizeVisitStatus(state, state)),
};

function normalizeState(domain, state) {
  const normalizer = STATE_NORMALIZERS[domain];
  return normalizer ? normalizer(state) : toLower(state);
}

function edgesFor(domain, state) {
  const lifecycle = LIFECYCLES[domain];
  if (!lifecycle) return null;
  const normalized = normalizeState(domain, state);
  return lifecycle.TRANSITIONS[normalized] || null;
}

// Union of every action defined anywhere in a domain, memoised per domain.
const ACTION_UNIVERSE_CACHE = {};
function domainActionUniverse(domain) {
  if (ACTION_UNIVERSE_CACHE[domain]) return ACTION_UNIVERSE_CACHE[domain];
  const lifecycle = LIFECYCLES[domain];
  const universe = new Set();
  if (lifecycle) {
    Object.values(lifecycle.TRANSITIONS).forEach((edges) => {
      Object.keys(edges).forEach((action) => universe.add(action));
    });
  }
  const frozen = Object.freeze([...universe]);
  ACTION_UNIVERSE_CACHE[domain] = frozen;
  return frozen;
}

/**
 * True when `action` is a legal transition out of `state` for `domain`.
 * Unknown domain, unknown state, or unknown action all return false.
 */
export function canTransition(domain, state, action) {
  const edges = edgesFor(domain, state);
  if (!edges) return false;
  return Object.prototype.hasOwnProperty.call(edges, action);
}

/**
 * The target state for a legal (domain, state, action), or null when the
 * transition is not legal.
 */
export function getNextState(domain, state, action) {
  const edges = edgesFor(domain, state);
  if (!edges || !Object.prototype.hasOwnProperty.call(edges, action)) return null;
  return edges[action];
}

/** All legal action names out of `state` (empty array for terminal/unknown). */
export function getLegalActions(domain, state) {
  const edges = edgesFor(domain, state);
  return edges ? Object.keys(edges) : [];
}

/** True when `state` is a structural terminal state of `domain`. */
export function isTerminalState(domain, state) {
  const lifecycle = LIFECYCLES[domain];
  if (!lifecycle) return false;
  return lifecycle.TERMINAL.includes(normalizeState(domain, state));
}

/**
 * Emergency action surface, re-expressed over the emergency transition table.
 * Returns the exact legacy getEmergencyActionState shape. Kept private to this
 * module (the exported public name lives in utils/emergencyActions.js).
 */
function resolveEmergencyActionState(request) {
  const canonicalStatus = canonicalizeEmergencyStatus(request?.status, request?.status);
  const status = toLower(canonicalStatus);
  const serviceType = toLower(request?.service_type || request?.serviceType);
  const paymentMethod = toLower(request?.payment_method || request?.payment_method_id);
  const paymentStatus = toLower(request?.payment_status);
  const hasAmbulance = Boolean(request?.ambulance_id);
  const isBedFlow = serviceType === 'bed' || serviceType === 'booking';
  const isTerminal = isTerminalEmergencyStatus(status);

  // Action legality comes from the table; record-shape guards further constrain.
  const canDispatch =
    canTransition('emergency', status, 'dispatch') && (isBedFlow || !hasAmbulance);
  const canComplete = canTransition('emergency', status, 'complete');
  const canRetryPayment =
    canTransition('emergency', status, 'retryPayment') && Boolean(request?.user_id);
  const canCancel = !isTerminal;

  const hasUnsettledCash =
    status === 'completed' &&
    CASH_METHODS.has(paymentMethod) &&
    paymentStatus !== 'completed';
  const showClinicalRecord = status === 'completed' || status === 'cancelled';

  return {
    status,
    isTerminal,
    hasAmbulance,
    isBedFlow,
    canDispatch,
    canComplete,
    canProcessCash: false,
    canCancel,
    hasUnsettledCash,
    cashDisabledReason: hasUnsettledCash
      ? 'Manual cash settlement is blocked until Pass 2 finance authority is implemented.'
      : null,
    canRetryPayment,
    showClinicalRecord,
  };
}

/**
 * Generic action surface for a record in `domain`.
 *
 * Emergency returns the rich legacy shape (parity-locked with
 * getEmergencyActionState). Every other domain returns a uniform descriptor:
 *
 *   { domain, status, isTerminal, actions, can }
 *
 * where `actions` is the list of currently-legal action names and `can` maps
 * every action known in the domain to whether it is legal right now. Derived
 * state is never stored -- this is a pure projection of the table for `record`.
 */
export function getActionState(domain, record) {
  if (domain === 'emergency') {
    return resolveEmergencyActionState(record);
  }

  const rawStatus = record?.status || record?.verification_status || record?.state;
  const status = normalizeState(domain, rawStatus);
  const lifecycle = LIFECYCLES[domain];

  if (!lifecycle) {
    return {
      domain,
      status,
      isTerminal: false,
      actions: [],
      can: {},
    };
  }

  const edges = lifecycle.TRANSITIONS[status] || {};
  const actions = Object.keys(edges);
  const isTerminal = lifecycle.TERMINAL.includes(status);

  const can = {};
  domainActionUniverse(domain).forEach((action) => {
    can[action] = Object.prototype.hasOwnProperty.call(edges, action);
  });

  return {
    domain,
    status,
    isTerminal,
    actions,
    can,
  };
}

export { LIFECYCLES };
