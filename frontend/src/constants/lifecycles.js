/**
 * lifecycles.js - L4 transition-table source of truth (pure data, no deps).
 *
 * Part of the Console Layer-Model Plan (frontend/docs/architecture/
 * CONSOLE_LAYER_MODEL_PLAN.md, sections D and E, steps S2-2 / S2-3). This file
 * consolidates the per-domain status/gating logic that section D catalogues as
 * "scattered" (emergency in utils/emergencyActions.js + utils/emergencyStatus.js;
 * visit in utils/visitStatus.js; verification inline in VerificationQueue.jsx;
 * support labels in SupportTicketModal.jsx; insurance buckets in
 * utils/recordUrgency.js; operational sets in services/ambulancesService.js +
 * services/doctorsService.js) into one declarative table per domain:
 *
 *   { STATES, TERMINAL, TRANSITIONS: { [state]: { [action]: nextState } } }
 *
 * Invariants (locked by utils/transitions.test.js):
 *   1. new Set(Object.keys(TRANSITIONS)) === new Set(STATES)
 *      (every state is a transition source, even terminal states -> {}).
 *   2. Every state in TERMINAL has an empty transition map (no outgoing action).
 *   3. Every transition target (nextState) is itself a member of STATES.
 *
 * NOTE ON EMERGENCY "terminal": the table's TERMINAL set is a STRUCTURAL notion
 * (states with no outgoing edges). It is intentionally NOT the same as the
 * emergency BUSINESS-terminal set in utils/emergencyStatus.js
 * (isTerminalEmergencyStatus also treats payment_declined as terminal). The
 * table keeps payment_declined non-terminal because it carries a retryPayment
 * edge back to pending_approval; the rich emergency action-state
 * (getEmergencyActionState) still derives its isTerminal field from
 * isTerminalEmergencyStatus, so no consumer behaviour changes.
 *
 * The interpreters (canTransition, getActionState) live in utils/transitions.js.
 * This module holds DATA only, so it can be imported anywhere with no side
 * effects and no behavioural coupling.
 */

import { CANONICAL_EMERGENCY_STATUSES } from '../utils/emergencyStatus';
import { VISIT_STATUS_STATE_IDS } from '../utils/visitStatus';

/**
 * Build a frozen, self-consistent lifecycle from a states list, a terminal list,
 * and a transitions map. Freezing each edge map keeps the table immutable so
 * callers cannot mutate legality at runtime.
 */
function makeLifecycle(states, terminal, transitions) {
  Object.values(transitions).forEach((edges) => Object.freeze(edges));
  return Object.freeze({
    STATES: Object.freeze([...states]),
    TERMINAL: Object.freeze([...terminal]),
    TRANSITIONS: Object.freeze(transitions),
  });
}

// ---------------------------------------------------------------------------
// Emergency - reference domain. STATES reuse CANONICAL_EMERGENCY_STATUSES so the
// table cannot drift from the canonicaliser. Actions: dispatch, complete,
// retryPayment, cancel (see getEmergencyActionState for the record-shape guards
// layered on top of these edges).
// ---------------------------------------------------------------------------
export const EMERGENCY_LIFECYCLE = makeLifecycle(
  CANONICAL_EMERGENCY_STATUSES,
  ['completed', 'cancelled'],
  {
    pending_approval: { cancel: 'cancelled' },
    payment_declined: { retryPayment: 'pending_approval' },
    in_progress: { dispatch: 'accepted', cancel: 'cancelled' },
    accepted: { complete: 'completed', cancel: 'cancelled' },
    arrived: { complete: 'completed', cancel: 'cancelled' },
    completed: {},
    cancelled: {},
  },
);

// ---------------------------------------------------------------------------
// Visit - STATES reuse VISIT_STATUS_STATE_IDS. Mirrors the visit lifecycle that
// utils/visitStatus.js already models (scheduled -> in_progress -> completed,
// with cancellation from either open state).
// ---------------------------------------------------------------------------
export const VISIT_LIFECYCLE = makeLifecycle(
  VISIT_STATUS_STATE_IDS,
  ['completed', 'cancelled'],
  {
    scheduled: { start: 'in_progress', cancel: 'cancelled' },
    in_progress: { complete: 'completed', cancel: 'cancelled' },
    completed: {},
    cancelled: {},
  },
);

// ---------------------------------------------------------------------------
// Verification - from the inline gates in VerificationQueue.jsx (canApprove /
// canReview) and rankVerification in utils/recordUrgency.js.
// ---------------------------------------------------------------------------
export const VERIFICATION_LIFECYCLE = makeLifecycle(
  ['pending', 'in_progress', 'verified', 'rejected'],
  ['verified', 'rejected'],
  {
    pending: { review: 'in_progress', approve: 'verified', reject: 'rejected' },
    in_progress: { approve: 'verified', reject: 'rejected' },
    verified: {},
    rejected: {},
  },
);

// ---------------------------------------------------------------------------
// Support - from STATUS_LABELS in SupportTicketModal.jsx (open, in_progress,
// resolved, closed) and rankSupport in utils/recordUrgency.js.
// ---------------------------------------------------------------------------
export const SUPPORT_LIFECYCLE = makeLifecycle(
  ['open', 'in_progress', 'resolved', 'closed'],
  ['closed'],
  {
    open: { start: 'in_progress', resolve: 'resolved', close: 'closed' },
    in_progress: { resolve: 'resolved', close: 'closed' },
    resolved: { reopen: 'open', close: 'closed' },
    closed: {},
  },
);

// ---------------------------------------------------------------------------
// Insurance - from the status buckets inside rankInsurance in
// utils/recordUrgency.js (pending / active / expired) plus a deactivated
// terminal. The verified flag is a separate axis and is not modelled here.
// ---------------------------------------------------------------------------
export const INSURANCE_LIFECYCLE = makeLifecycle(
  ['pending', 'active', 'expired', 'inactive'],
  ['inactive'],
  {
    pending: { activate: 'active', reject: 'inactive' },
    active: { expire: 'expired', deactivate: 'inactive' },
    expired: { renew: 'active', deactivate: 'inactive' },
    inactive: {},
  },
);

// ---------------------------------------------------------------------------
// Operational (fleet / staff / facility) - a representative availability
// lifecycle derived from VALID_AMBULANCE_STATUSES (services/ambulancesService.js),
// STAFF_STATUSES (services/doctorsService.js) and the rankOperational buckets in
// utils/recordUrgency.js. Not every raw status (en_route, on_trip, on_call,
// busy, off_duty) is a modelled node yet; Session 3 wiring will extend this as
// each operational surface migrates.
// ---------------------------------------------------------------------------
export const OPERATIONAL_LIFECYCLE = makeLifecycle(
  ['pending_approval', 'available', 'dispatched', 'on_scene', 'returning', 'maintenance', 'offline', 'inactive'],
  ['inactive'],
  {
    pending_approval: { approve: 'available', reject: 'inactive' },
    available: { dispatch: 'dispatched', startMaintenance: 'maintenance', takeOffline: 'offline' },
    dispatched: { arrive: 'on_scene', cancel: 'available' },
    on_scene: { complete: 'returning' },
    returning: { arrive: 'available' },
    maintenance: { complete: 'available', takeOffline: 'offline' },
    offline: { bringOnline: 'available' },
    inactive: {},
  },
);

/**
 * The full L4 registry keyed by canonical domain name. transitions.js reads
 * legality from here; consumers should prefer the canTransition / getActionState
 * interpreters over touching this map directly.
 */
export const LIFECYCLES = Object.freeze({
  emergency: EMERGENCY_LIFECYCLE,
  visit: VISIT_LIFECYCLE,
  verification: VERIFICATION_LIFECYCLE,
  support: SUPPORT_LIFECYCLE,
  insurance: INSURANCE_LIFECYCLE,
  operational: OPERATIONAL_LIFECYCLE,
});

export default LIFECYCLES;
