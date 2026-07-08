/**
 * vitalTracks.js - the single grounded source for mobile lifecycle presentation.
 *
 * Part of the Mobile Energy Rollout (docs/design-system/MOBILE_ENERGY_ROLLOUT_PLAN.md).
 * Every mobile entity page renders its lifecycle context (the VitalTrack stepped track
 * + the row status pill) from THIS module, so the "energy" is identical everywhere and
 * cannot drift page-to-page.
 *
 * GROUNDING: the display `steps` for stateful domains are a subset of the test-locked
 * STATES in constants/lifecycles.js (the L4 transition tables). This module is
 * PRESENTATION only - it never decides transition legality (that lives in
 * utils/transitions.js). It only answers: "for this status, which step is current, is
 * the track terminated/muted, what tone, and what does the status pill say?"
 *
 * PALETTE NOTE: status hues are raw & distinct (cyan/amber/emerald/slate/sky) on
 * purpose. The semantic tokens collapse (--primary==--info, --success==--warning) and
 * would render status as brand-red, so status must NOT route through them.
 *
 * Public API:
 *   resolveVital(domain, status) -> { steps, currentKey, tone, cancelled, pill } | null
 *   statusPill(status, label?)   -> { label, className }   (generic keyword fallback)
 *   getVitalDomains()            -> string[]               (domains with a track)
 */

import { LIFECYCLES } from './lifecycles';
import { canonicalizeEmergencyStatus } from '../utils/emergencyStatus';
import { canonicalizeVisitStatus } from '../utils/visitStatus';

// Raw distinct status hues. `hex` drives the VitalTrack nodes (opaque content, and its
// `${tone}22` hex-alpha shadow); `accent` is the SAME hue as a space-separated hsl() so
// MobileMetricRow's alpha injection (color.replace(/\)$/, ' / 0.2)')) yields valid CSS;
// `pill` is the row status-pill tailwind tone.
const TONES = {
  cyan: { hex: '#0891B2', accent: 'hsl(192 91% 36%)', pill: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-200' },
  amber: { hex: '#B45309', accent: 'hsl(26 90% 37%)', pill: 'bg-amber-500/10 text-amber-700 dark:text-amber-200' },
  emerald: { hex: '#047857', accent: 'hsl(162 94% 24%)', pill: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200' },
  sky: { hex: '#0284C7', accent: 'hsl(200 98% 39%)', pill: 'bg-sky-500/10 text-sky-700 dark:text-sky-200' },
  slate: { hex: '#64748B', accent: 'hsl(215 16% 47%)', pill: 'bg-muted/34 text-muted-foreground' },
};

const norm = (value) => String(value ?? '').trim().toLowerCase();

const titleCase = (value) =>
  norm(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase()) || 'Unknown';

/**
 * Per-domain presentation config.
 *   steps    ordered display steps (key must be a member of LIFECYCLES[domain].STATES
 *            for grounded domains; asserted by vitalTracks.test.js).
 *   collapse optional map folding an off-track state onto a display step
 *            (e.g. emergency 'accepted' -> 'in_progress').
 *   muted    statuses that render the track as terminated/muted (cancelled-style).
 *   status   label + tone for EVERY status the row can display.
 *   normalize optional canonicaliser so aliases resolve before lookup.
 */
const DOMAINS = {
  // Grounded in VISIT_LIFECYCLE (scheduled -> in_progress -> completed; cancelled).
  visit: {
    steps: [
      { key: 'scheduled', label: 'Scheduled', tone: 'cyan' },
      { key: 'in_progress', label: 'Active', tone: 'amber' },
      { key: 'completed', label: 'Done', tone: 'emerald' },
    ],
    muted: ['cancelled'],
    status: {
      scheduled: { label: 'Scheduled', tone: 'cyan' },
      in_progress: { label: 'Active', tone: 'amber' },
      completed: { label: 'Completed', tone: 'emerald' },
      cancelled: { label: 'Cancelled', tone: 'slate' },
    },
    normalize: (s) => canonicalizeVisitStatus(s, s),
  },

  // Grounded in EMERGENCY_LIFECYCLE. Display collapses 'accepted' into the
  // 'in_progress' node so the track stays four legible steps; payment_declined and
  // cancelled render muted.
  emergency: {
    steps: [
      { key: 'pending_approval', label: 'Requested', tone: 'cyan' },
      { key: 'in_progress', label: 'Dispatched', tone: 'amber' },
      { key: 'arrived', label: 'Arrived', tone: 'amber' },
      { key: 'completed', label: 'Completed', tone: 'emerald' },
    ],
    collapse: { accepted: 'in_progress' },
    muted: ['cancelled', 'payment_declined'],
    status: {
      pending_approval: { label: 'Requested', tone: 'cyan' },
      payment_declined: { label: 'Payment declined', tone: 'slate' },
      in_progress: { label: 'In progress', tone: 'amber' },
      accepted: { label: 'Dispatched', tone: 'amber' },
      arrived: { label: 'Arrived', tone: 'amber' },
      completed: { label: 'Completed', tone: 'emerald' },
      cancelled: { label: 'Cancelled', tone: 'slate' },
    },
    normalize: (s) => canonicalizeEmergencyStatus(s, s),
  },

  // Grounded in VERIFICATION_LIFECYCLE (pending -> in_progress -> verified; rejected).
  verification: {
    steps: [
      { key: 'pending', label: 'Pending', tone: 'cyan' },
      { key: 'in_progress', label: 'In review', tone: 'amber' },
      { key: 'verified', label: 'Verified', tone: 'emerald' },
    ],
    muted: ['rejected'],
    status: {
      pending: { label: 'Pending', tone: 'cyan' },
      in_progress: { label: 'In review', tone: 'amber' },
      verified: { label: 'Verified', tone: 'emerald' },
      rejected: { label: 'Rejected', tone: 'slate' },
    },
  },

  // Grounded in SUPPORT_LIFECYCLE (open -> in_progress -> resolved; closed).
  support: {
    steps: [
      { key: 'open', label: 'Open', tone: 'cyan' },
      { key: 'in_progress', label: 'In progress', tone: 'amber' },
      { key: 'resolved', label: 'Resolved', tone: 'emerald' },
    ],
    muted: ['closed'],
    status: {
      open: { label: 'Open', tone: 'cyan' },
      in_progress: { label: 'In progress', tone: 'amber' },
      resolved: { label: 'Resolved', tone: 'emerald' },
      closed: { label: 'Closed', tone: 'slate' },
    },
  },

  // Grounded in INSURANCE_LIFECYCLE (pending -> active -> expired; inactive). The
  // `verified` flag is a separate axis (surfaced as its own pill by the page).
  insurance: {
    steps: [
      { key: 'pending', label: 'Pending', tone: 'cyan' },
      { key: 'active', label: 'Active', tone: 'emerald' },
      { key: 'expired', label: 'Expired', tone: 'amber' },
    ],
    muted: ['inactive'],
    status: {
      pending: { label: 'Pending', tone: 'cyan' },
      active: { label: 'Active', tone: 'emerald' },
      expired: { label: 'Expired', tone: 'amber' },
      inactive: { label: 'Inactive', tone: 'slate' },
    },
  },

  // Display-only (NOT in lifecycles.js): a 2-step presentational track with no
  // transition-legality need. Promote into lifecycles.js if real gating is ever added.
  subscription: {
    steps: [
      { key: 'pending', label: 'Pending', tone: 'cyan' },
      { key: 'active', label: 'Active', tone: 'emerald' },
    ],
    muted: ['cancelled', 'expired', 'inactive'],
    status: {
      pending: { label: 'Pending', tone: 'cyan' },
      active: { label: 'Active', tone: 'emerald' },
      cancelled: { label: 'Cancelled', tone: 'slate' },
      expired: { label: 'Expired', tone: 'slate' },
      inactive: { label: 'Inactive', tone: 'slate' },
    },
  },

  // Display-only (NOT in lifecycles.js): draft -> published.
  healthNews: {
    steps: [
      { key: 'draft', label: 'Draft', tone: 'cyan' },
      { key: 'published', label: 'Published', tone: 'emerald' },
    ],
    muted: ['archived'],
    status: {
      draft: { label: 'Draft', tone: 'cyan' },
      published: { label: 'Published', tone: 'emerald' },
      archived: { label: 'Archived', tone: 'slate' },
    },
  },
};

/** Domains that own a VitalTrack (used by tests + docs). */
export function getVitalDomains() {
  return Object.keys(DOMAINS);
}

/** Raw domain config accessor (kept for the grounding test only). */
export function _getDomainConfig(domain) {
  return DOMAINS[domain] || null;
}

export { LIFECYCLES };

/**
 * Everything a mobile page needs to render lifecycle context for one record, in a
 * single call. Returns null for an unknown domain so callers can guard.
 */
export function resolveVital(domain, statusRaw) {
  const config = DOMAINS[domain];
  if (!config) return null;

  const status = config.normalize ? norm(config.normalize(statusRaw)) : norm(statusRaw);
  const displayKey = config.collapse?.[status] || status;
  const cancelled = config.muted.includes(status);

  const steps = config.steps.map((s) => ({ key: s.key, label: s.label }));
  const known = steps.some((s) => s.key === displayKey);
  // When the status is off-track (muted/unknown) point currentKey at the last step so
  // a muted track reads as "terminated" rather than "stuck at step one".
  const currentKey = known ? displayKey : steps[steps.length - 1].key;

  const stepTone = config.steps.find((s) => s.key === currentKey)?.tone || 'slate';
  const meta = config.status[status] || { label: titleCase(status), tone: 'slate' };

  return {
    steps,
    currentKey,
    cancelled,
    tone: TONES[stepTone].hex, // hex, for <VitalTrack tone=...>
    accent: TONES[cancelled ? 'slate' : stepTone].accent, // hsl, for MobileMetricRow color=
    pill: { label: meta.label, className: TONES[meta.tone].pill },
  };
}

const EMERALD_WORDS = new Set(['completed', 'verified', 'resolved', 'active', 'published', 'available', 'paid', 'success', 'approved', 'online', 'delivered']);
const AMBER_WORDS = new Set(['in_progress', 'pending', 'open', 'processing', 'review', 'in_review', 'on_call', 'busy', 'dispatched']);
const CYAN_WORDS = new Set(['scheduled', 'draft', 'new', 'requested', 'created', 'invited']);
const SLATE_WORDS = new Set(['cancelled', 'canceled', 'rejected', 'closed', 'inactive', 'expired', 'failed', 'declined', 'offline', 'suspended', 'deleted', 'archived', 'off_duty']);

/** Keyword -> tone for domains without a modelled lifecycle (wallet, pricing, ...). */
export function statusTone(status) {
  const s = norm(status);
  if (EMERALD_WORDS.has(s)) return 'emerald';
  if (AMBER_WORDS.has(s)) return 'amber';
  if (CYAN_WORDS.has(s)) return 'cyan';
  if (SLATE_WORDS.has(s)) return 'slate';
  return 'sky';
}

/**
 * Generic status pill for a page WITHOUT a modelled lifecycle. Lifecycle pages should
 * prefer resolveVital(domain, status).pill so their pill stays grounded in the table.
 */
export function statusPill(status, label) {
  return { label: label || titleCase(status), className: TONES[statusTone(status)].pill };
}
