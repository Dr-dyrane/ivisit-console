/**
 * vitalTracks.test.js - locks the mobile lifecycle presentation to the L4 tables.
 *
 * The load-bearing test is GROUNDING: every display step of a modelled domain must be
 * a real state in constants/lifecycles.js, so the mobile track can never drift from the
 * canonical state machine. Display-only domains (subscription, healthNews) are exempt
 * by design and asserted separately.
 */

import { LIFECYCLES } from './lifecycles';
import {
  resolveVital,
  statusPill,
  statusTone,
  getVitalDomains,
  _getDomainConfig,
} from './vitalTracks';

const GROUNDED = ['visit', 'emergency', 'verification', 'support', 'insurance'];
const DISPLAY_ONLY = ['subscription', 'healthNews'];

describe('vitalTracks grounding', () => {
  it.each(GROUNDED)('every %s step is a real lifecycle state', (domain) => {
    const states = new Set(LIFECYCLES[domain].STATES);
    const config = _getDomainConfig(domain);
    config.steps.forEach((step) => {
      expect(states.has(step.key)).toBe(true);
    });
  });

  it.each(GROUNDED)('every %s status/collapse/muted key is a real lifecycle state', (domain) => {
    const states = new Set(LIFECYCLES[domain].STATES);
    const config = _getDomainConfig(domain);
    Object.keys(config.status).forEach((k) => expect(states.has(k)).toBe(true));
    (config.muted || []).forEach((k) => expect(states.has(k)).toBe(true));
    Object.entries(config.collapse || {}).forEach(([from, to]) => {
      expect(states.has(from)).toBe(true);
      expect(config.steps.some((s) => s.key === to)).toBe(true);
    });
  });

  it('display-only domains are intentionally NOT in lifecycles.js', () => {
    DISPLAY_ONLY.forEach((domain) => {
      expect(LIFECYCLES[domain]).toBeUndefined();
      expect(_getDomainConfig(domain)).not.toBeNull();
    });
  });

  it('exposes exactly the grounded + display-only domains', () => {
    expect(getVitalDomains().sort()).toEqual([...GROUNDED, ...DISPLAY_ONLY].sort());
  });
});

describe('resolveVital', () => {
  it('returns null for an unknown domain', () => {
    expect(resolveVital('nope', 'x')).toBeNull();
  });

  it('maps a mid-lifecycle status to the right step + pill', () => {
    const r = resolveVital('support', 'in_progress');
    expect(r.currentKey).toBe('in_progress');
    expect(r.cancelled).toBe(false);
    expect(r.pill.label).toBe('In progress');
    expect(r.pill.className).toContain('amber');
    expect(r.steps.map((s) => s.key)).toEqual(['open', 'in_progress', 'resolved']);
  });

  it('renders a muted/terminated track for an off-track terminal', () => {
    const r = resolveVital('support', 'closed');
    expect(r.cancelled).toBe(true);
    expect(r.currentKey).toBe('resolved'); // points at last step so the track reads terminated
    expect(r.pill.label).toBe('Closed');
  });

  it('collapses emergency accepted -> in_progress for the display track', () => {
    const r = resolveVital('emergency', 'accepted');
    expect(r.currentKey).toBe('in_progress');
    expect(r.cancelled).toBe(false);
    expect(r.pill.label).toBe('Dispatched');
  });

  it('treats emergency payment_declined as a muted track', () => {
    const r = resolveVital('emergency', 'payment_declined');
    expect(r.cancelled).toBe(true);
  });

  it('normalizes visit aliases through the canonicaliser', () => {
    // canonicalizeVisitStatus should resolve to a modelled key; completed stays completed
    const r = resolveVital('visit', 'completed');
    expect(r.currentKey).toBe('completed');
    expect(r.pill.label).toBe('Completed');
  });
});

describe('generic statusPill / statusTone (non-lifecycle pages)', () => {
  it('maps common status words to distinct raw hues', () => {
    expect(statusTone('completed')).toBe('emerald');
    expect(statusTone('pending')).toBe('amber');
    expect(statusTone('scheduled')).toBe('cyan');
    expect(statusTone('cancelled')).toBe('slate');
    expect(statusTone('mystery')).toBe('sky');
  });

  it('title-cases an unknown status for the pill label', () => {
    expect(statusPill('on_hold').label).toBe('On Hold');
    expect(statusPill('active', 'Live').label).toBe('Live');
  });
});
