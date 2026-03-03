export const EMERGENCY_STATUS_ALIAS_TO_CANONICAL = Object.freeze({
  pending: 'pending_approval',
  pending_approval: 'pending_approval',
  dispatched: 'in_progress',
  in_progress: 'in_progress',
  assigned: 'accepted',
  responding: 'accepted',
  en_route: 'accepted',
  accepted: 'accepted',
  arrived: 'arrived',
  resolved: 'completed',
  completed: 'completed',
  canceled: 'cancelled',
  cancelled: 'cancelled',
  declined: 'payment_declined',
  payment_declined: 'payment_declined',
});

export const CANONICAL_EMERGENCY_STATUSES = Object.freeze([
  'pending_approval',
  'payment_declined',
  'in_progress',
  'accepted',
  'arrived',
  'completed',
  'cancelled',
]);

export function canonicalizeEmergencyStatus(status, fallback = null) {
  const normalized = String(status ?? '').trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }
  return EMERGENCY_STATUS_ALIAS_TO_CANONICAL[normalized] || normalized;
}

export function isActiveEmergencyStatus(status) {
  const canonical = canonicalizeEmergencyStatus(status, null);
  return canonical === 'pending_approval' || canonical === 'in_progress' || canonical === 'accepted' || canonical === 'arrived';
}

export function isTerminalEmergencyStatus(status) {
  const canonical = canonicalizeEmergencyStatus(status, null);
  return canonical === 'completed' || canonical === 'cancelled' || canonical === 'payment_declined';
}
