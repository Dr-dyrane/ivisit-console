import { canonicalizeEmergencyStatus } from './emergencyStatus';

export const VISIT_STATUS_ALIAS_TO_CANONICAL = Object.freeze({
  scheduled: 'scheduled',
  upcoming: 'scheduled',
  booked: 'scheduled',
  pending: 'scheduled',
  in_progress: 'in_progress',
  active: 'in_progress',
  accepted: 'in_progress',
  arrived: 'in_progress',
  completed: 'completed',
  done: 'completed',
  resolved: 'completed',
  canceled: 'cancelled',
  cancelled: 'cancelled',
  no_show: 'cancelled',
  'no-show': 'cancelled',
});

export const EMERGENCY_STATUS_TO_VISIT_STATUS = Object.freeze({
  pending_approval: 'scheduled',
  payment_declined: 'cancelled',
  in_progress: 'in_progress',
  accepted: 'in_progress',
  arrived: 'in_progress',
  completed: 'completed',
  cancelled: 'cancelled',
});

export const VISIT_STATUS_STATE_IDS = Object.freeze([
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
]);

export function canonicalizeVisitStatus(status, fallback = null) {
  const normalized = String(status ?? '').trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }
  return VISIT_STATUS_ALIAS_TO_CANONICAL[normalized] || normalized;
}

export function resolveVisitStatus({ visitStatus, emergencyStatus } = {}) {
  const canonicalVisit = canonicalizeVisitStatus(visitStatus, null);
  const canonicalEmergency = canonicalizeEmergencyStatus(emergencyStatus, null);
  const emergencyDerived = canonicalEmergency
    ? EMERGENCY_STATUS_TO_VISIT_STATUS[canonicalEmergency] || null
    : null;

  if (!canonicalVisit || canonicalVisit === 'scheduled') {
    return emergencyDerived || canonicalVisit || 'scheduled';
  }

  return canonicalVisit;
}

export function isActiveVisitStatus(status) {
  return canonicalizeVisitStatus(status, null) === 'in_progress';
}

export function getVisitStateFromKpi(kpiFilter) {
  if (!kpiFilter || kpiFilter === 'all') return null;
  const canonical = canonicalizeVisitStatus(kpiFilter, null);
  return VISIT_STATUS_STATE_IDS.includes(canonical) ? canonical : null;
}

export function visitMatchesResolvedState(visit, state) {
  const canonicalState = canonicalizeVisitStatus(state, null);
  if (!canonicalState) return true;
  return canonicalizeVisitStatus(visit?.status, null) === canonicalState;
}

export function countVisitsByResolvedStatus(visits = []) {
  const rows = Array.isArray(visits) ? visits : [];
  return rows.reduce((acc, visit) => {
    const status = canonicalizeVisitStatus(visit?.status, null);
    if (status === 'scheduled') acc.scheduled += 1;
    if (status === 'in_progress') acc.inProgress += 1;
    if (status === 'completed') acc.completed += 1;
    if (status === 'cancelled') acc.cancelled += 1;
    return acc;
  }, {
    total: rows.length,
    scheduled: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
  });
}
