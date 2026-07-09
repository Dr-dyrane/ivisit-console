/**
 * requestDisplay.js - CANONICAL shared request-display helpers.
 *
 * Extracted verbatim from components/pages/EmergencyRequestsPage.jsx per the
 * 2026-07-09 cross-lane arbitration (mobile lane owns shared extractions this
 * batch). The desktop page still holds local copies of these helpers and will
 * adopt these imports in the next desktop batch - do NOT let the two copies
 * drift; any behaviour change lands HERE first.
 */

import { isCashPaymentMethod } from './emergencyRequestMapper';

// Day-aware timestamp: clock-time alone made a 3-week-old request read like today's.
// today -> "2:14 PM"; yesterday -> "Yesterday, 2:14 PM"; this year -> "Jun 18, 2:14 PM";
// older -> "Jun 18, 2025".
export const formatRequestDayTime = (value) => {
  if (!value) return 'No time';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No time';
  const now = new Date();
  const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayDelta = Math.round((startOfDay(now) - startOfDay(date)) / 86400000);
  if (dayDelta === 0) return time;
  if (dayDelta === 1) return `Yesterday, ${time}`;
  if (date.getFullYear() === now.getFullYear()) {
    return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${time}`;
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};

// Payment states that mean cash has been settled - anything else on a cash request
// stays visibly flagged for the operator.
const SETTLED_PAYMENT_STATUSES = new Set(['settled', 'succeeded', 'completed', 'paid']);
export const isUnsettledCashRequest = (request) => (
  isCashPaymentMethod(request?.payment_method) &&
  !SETTLED_PAYMENT_STATUSES.has(String(request?.payment_status || '').toLowerCase())
);
