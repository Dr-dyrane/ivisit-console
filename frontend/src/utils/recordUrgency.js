/**
 * recordUrgency — per-entity "most urgent record" resolution.
 *
 * Foundation for the console-wide focused-record system. When a page has no
 * explicit user selection, the DetailRail should surface the record that most
 * needs an operator's attention — NOT `list[0]` (lists sort by recency/name,
 * so `list[0]` is arbitrary, not urgent).
 *
 * `mostUrgent(list, entity)` looks up a per-entity ranker from RANKERS,
 * stable-sorts the list by that ranker (lower rank = more urgent, oldest as
 * tie-break), and returns the top record (or `null` for empty/undefined lists).
 *
 * Rankers REUSE existing domain helpers where they exist (e.g. emergency uses
 * `getEmergencyActionState`) so urgency stays consistent with the action UI.
 * Entities without a meaningful priority order fall back to a no-op ranker that
 * preserves the incoming list order (returns `list[0]`), which is a safe no-op.
 *
 * Purity contract: no side effects, no mutation of the input list, tolerant of
 * empty/undefined/malformed lists (→ `null`).
 */

import { getEmergencyActionState } from './emergencyActions';
import { canonicalizeEmergencyStatus } from './emergencyStatus';

const toLower = (value) => String(value ?? '').trim().toLowerCase();

/** Parse a timestamp to epoch millis; unparseable/empty → +Infinity (sorts last). */
const timeValue = (value) => {
  const parsed = Date.parse(String(value ?? ''));
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
};

/** Oldest `created_at` first (older = more urgent). Missing dates sort last. */
const oldestCreatedAt = (record) => timeValue(record?.created_at || record?.submitted_at);

// ---------------------------------------------------------------------------
// Per-entity rankers.
//
// Each ranker returns { rank, tie } for a record:
//   rank  — primary ordering bucket (lower = more urgent)
//   tie   — numeric tie-break within a bucket (lower = more urgent; usually a
//           timestamp so the oldest actionable record wins)
// `mostUrgent` performs a stable sort by (rank, tie) and returns the head.
// ---------------------------------------------------------------------------

/**
 * emergency — mirror the operator action surface via getEmergencyActionState.
 * needs-review / payment_declined > canDispatch > canComplete >
 * hasUnsettledCash > in-progress > terminal. Tie-break: oldest created_at.
 */
const rankEmergency = (record) => {
  const state = getEmergencyActionState(record);
  const canonical = canonicalizeEmergencyStatus(record?.status, record?.status);
  const status = toLower(canonical);
  const needsReview = status === 'pending_approval' || state.canRetryPayment;

  let rank;
  if (needsReview) rank = 0; // pending approval or payment_declined-with-retry
  else if (state.canDispatch) rank = 1;
  else if (state.canComplete) rank = 2;
  else if (state.hasUnsettledCash) rank = 3;
  else if (!state.isTerminal) rank = 4; // any other in-progress / active state
  else rank = 5; // terminal (completed / cancelled / declined without retry)

  return { rank, tie: oldestCreatedAt(record) };
};

/**
 * visits — actionable-soonest.
 * in_progress > scheduled/overdue (by date asc) > upcoming (future, date asc) >
 * completed/cancelled. Tie-break inside a bucket: soonest scheduled date.
 */
const visitDateValue = (record) =>
  timeValue(record?.date || record?.visit_date || record?.scheduled_at || record?.created_at);

const rankVisits = (record) => {
  const status = toLower(record?.status);
  const when = visitDateValue(record);
  const now = Date.now();

  if (status === 'in_progress') return { rank: 0, tie: when };
  if (
    status === 'completed' ||
    status === 'cancelled' ||
    status === 'canceled' ||
    status === 'no_show' ||
    status === 'no-show'
  ) {
    return { rank: 4, tie: when };
  }

  // scheduled (or unknown non-terminal) — split past-due vs upcoming by date.
  const isPastDue = Number.isFinite(when) && when <= now;
  const rank = isPastDue ? 1 : 2;
  return { rank, tie: when };
};

const PRIORITY_ORDER = { critical: 0, urgent: 0, high: 1, medium: 2, normal: 2, low: 3 };
const priorityRank = (value, fallback = 2) => {
  const key = toLower(value);
  return key in PRIORITY_ORDER ? PRIORITY_ORDER[key] : fallback;
};

/**
 * verification — priority (critical/high) then pending>in_progress then oldest.
 * Records may not carry an explicit `priority`; missing → neutral (medium).
 */
const rankVerification = (record) => {
  const priority = priorityRank(record?.priority, 2);
  const status = toLower(record?.status || record?.verification_status);
  let statusRank;
  if (status === 'pending') statusRank = 0;
  else if (status === 'in_progress') statusRank = 1;
  else statusRank = 2; // approved / rejected / verified / terminal
  // Combine so priority dominates but status still separates within a priority.
  return { rank: priority * 10 + statusRank, tie: oldestCreatedAt(record) };
};

/**
 * support — open > in_progress > resolved (then closed) then oldest.
 */
const rankSupport = (record) => {
  const status = toLower(record?.status);
  let rank;
  if (status === 'open') rank = 0;
  else if (status === 'in_progress') rank = 1;
  else if (status === 'resolved') rank = 2;
  else rank = 3; // closed / unknown
  return { rank, tie: oldestCreatedAt(record) };
};

/**
 * insurance — pending/expired > active; unverified before verified.
 */
const rankInsurance = (record) => {
  const status = toLower(record?.status);
  const verified = Boolean(record?.verified);
  let statusRank;
  if (status === 'pending' || status === 'expired') statusRank = 0;
  else if (status === 'active') statusRank = 2;
  else statusRank = 1; // unknown / inactive
  // Unverified is more urgent than verified within the same status bucket.
  return { rank: statusRank * 2 + (verified ? 1 : 0), tie: oldestCreatedAt(record) };
};

// Operational fleet/staff/facility urgency: active work (on-route/busy) first,
// then available (ready to be tasked), then off-duty/offline (least urgent).
const ACTIVE_OPERATIONAL = new Set([
  'dispatched', 'on_trip', 'en_route', 'on_route', 'on_scene', 'returning', 'busy', 'on_call', 'full',
]);
const AVAILABLE_OPERATIONAL = new Set(['available', 'ready', 'active']);
const OFF_OPERATIONAL = new Set(['off_duty', 'offline', 'maintenance', 'inactive', 'unavailable']);

const rankOperational = (record) => {
  const status = toLower(record?.status);
  let rank;
  if (ACTIVE_OPERATIONAL.has(status)) rank = 0;
  else if (AVAILABLE_OPERATIONAL.has(status)) rank = 1;
  else if (OFF_OPERATIONAL.has(status)) rank = 3;
  else rank = 2; // unknown / pending_approval / other
  return { rank, tie: oldestCreatedAt(record) };
};

/** default — no meaningful urgency order; preserve incoming order (list[0]). */
const rankDefault = () => ({ rank: 0, tie: 0 });

const RANKERS = Object.freeze({
  emergency: rankEmergency,
  emergencies: rankEmergency,
  visits: rankVisits,
  visit: rankVisits,
  verification: rankVerification,
  support: rankSupport,
  supportTickets: rankSupport,
  insurance: rankInsurance,
  ambulances: rankOperational,
  ambulance: rankOperational,
  doctors: rankOperational,
  doctor: rankOperational,
  hospitals: rankOperational,
  hospital: rankOperational,
});

/**
 * Resolve the per-entity ranker. Unknown entities → the safe no-op ranker.
 * @param {string} entity
 * @returns {(record: object) => { rank: number, tie: number }}
 */
export const getRanker = (entity) => RANKERS[entity] || rankDefault;

/**
 * Return the single most urgent record in `list` for `entity`.
 *
 * Pure and defensive: never mutates `list`, tolerates empty/undefined/malformed
 * input, and returns `null` when there is nothing to focus.
 *
 * @param {Array<object>|null|undefined} list
 * @param {string} entity
 * @returns {object|null}
 */
export function mostUrgent(list, entity) {
  if (!Array.isArray(list) || list.length === 0) return null;

  const ranker = getRanker(entity);

  // Stable sort: decorate with original index so equal (rank, tie) keeps order.
  const decorated = list.map((record, index) => {
    let scored;
    try {
      scored = ranker(record) || {};
    } catch {
      scored = {};
    }
    const rank = Number.isFinite(scored.rank) ? scored.rank : Number.POSITIVE_INFINITY;
    const tie = Number.isFinite(scored.tie) ? scored.tie : Number.POSITIVE_INFINITY;
    return { record, index, rank, tie };
  });

  decorated.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    if (a.tie !== b.tie) return a.tie - b.tie;
    return a.index - b.index; // stability
  });

  return decorated[0]?.record ?? null;
}

export default mostUrgent;
