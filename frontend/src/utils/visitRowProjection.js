/**
 * Visit Row Projection
 * -----------------------------------------------------------------------------
 * ONE shared, UI-agnostic mapping for how a visit record identifies itself in a
 * list row. Every visit surface (mobile list, right panel, list view, table
 * view) consumes this so record identity is decided in a single place instead
 * of four divergent inline fallback chains.
 *
 * Doctrine (mirrors ivisit-app `VisitCard` / `useMapVisitDetailModel`):
 *   - LEAD with the FACILITY — the high-cardinality, human-recognizable anchor.
 *   - Demote the low-cardinality service `type` to a small caption.
 *   - Patient real name + service type ride together in the secondary line.
 *   - Status is a normalized chip.
 *   - `when` (date + time) lives in the meta line, optionally with room / id.
 *
 * Returns plain strings (no JSX) so it stays framework/renderer agnostic.
 *
 * @typedef {Object} VisitRowProjection
 * @property {string} primary      Facility-first record identity.
 * @property {string} caption      Small service-type caption (e.g. "Emergency").
 * @property {string} secondary    "{patientRealName} · {serviceType}".
 * @property {string} patientName  Resolved patient real name.
 * @property {string} serviceType  Human service type (same as caption).
 * @property {string} statusKey    Normalized status key (scheduled|in_progress|completed|cancelled).
 * @property {string} statusLabel  Short status label (Scheduled|Active|Done|Cancelled).
 * @property {string} meta         Localized when + optional room / display id.
 */

import { getStandardizedHospital } from './hospitalUtils';
import { getStandardizedPatient } from './patientUtils';

/**
 * Human-readable service type, snake_case → Title Case.
 * Lifted from the inline `formatVisitType` in MobileVisits so every surface
 * agrees on the same label.
 */
export const formatVisitType = (visit) => {
  const raw = String(visit?.visit_type || visit?.type || 'Visit').replace(/_/g, ' ');
  return raw.replace(/\b\w/g, (letter) => letter.toUpperCase());
};

/**
 * Normalize a raw status into a stable key.
 */
export const getVisitStatusKey = (status) => {
  const value = String(status || '').toLowerCase();
  if (value === 'completed') return 'completed';
  if (value === 'in_progress' || value === 'active') return 'in_progress';
  if (value === 'cancelled' || value === 'canceled') return 'cancelled';
  return 'scheduled';
};

/**
 * Short status label. Lifted from the inline `getStatusLabel` in MobileVisits.
 */
export const getStatusLabel = (status) => {
  switch (getVisitStatusKey(status)) {
    case 'completed':
      return 'Done';
    case 'in_progress':
      return 'Active';
    case 'cancelled':
      return 'Cancelled';
    default:
      return 'Scheduled';
  }
};

const firstNonEmpty = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (text !== '') return text;
  }
  return '';
};

/**
 * Facility-first record identity (the primary slot).
 * Reuses `getStandardizedHospital` but applies the visit-row fallback ladder so
 * an unlinked visit still reads as a room or an explicit "Unlinked visit"
 * instead of the generic "Unknown Facility".
 */
export const getVisitFacilityLabel = (visit) => {
  if (!visit) return 'Unlinked visit';
  const hospital = getStandardizedHospital(visit);
  const hospitalName =
    hospital?.name && hospital.name !== 'Unknown Facility' ? hospital.name : '';
  return (
    firstNonEmpty(
      hospitalName,
      visit.hospital?.name,
      visit.hospital_name,
      typeof visit.hospital === 'string' ? visit.hospital : '',
      visit.room_number ? `Room ${visit.room_number}` : ''
    ) || 'Unlinked visit'
  );
};

/**
 * Patient real name for the secondary slot. Prefers full_name, falls back
 * through username / patient_name, then a linked/no-patient sentinel.
 */
export const getVisitPatientLabel = (visit) => {
  if (!visit) return 'No patient';
  const patient = getStandardizedPatient(visit);
  const patientName =
    patient?.name && patient.name !== 'Unknown Patient' ? patient.name : '';
  return (
    firstNonEmpty(
      patientName,
      visit.patient?.full_name,
      visit.patient?.username,
      visit.patient_name
    ) || (visit.user_id ? 'Linked patient' : 'No patient')
  );
};

const formatWhen = (visit) => {
  const value = visit?.date || visit?.scheduled_at || visit?.created_at;
  if (!value) return 'Time not set';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Time not set';
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * The single source of truth for a visit list row.
 *
 * @param {Object} visit
 * @returns {VisitRowProjection}
 */
export const visitRowProjection = (visit) => {
  const serviceType = formatVisitType(visit);
  const patientName = getVisitPatientLabel(visit);
  const statusKey = getVisitStatusKey(visit?.status);

  const metaParts = [formatWhen(visit)];
  if (visit?.room_number) {
    metaParts.push(`Room ${visit.room_number}`);
  } else if (visit?.display_id) {
    metaParts.push(String(visit.display_id));
  }

  return {
    primary: getVisitFacilityLabel(visit),
    caption: serviceType,
    secondary: `${patientName} · ${serviceType}`,
    patientName,
    serviceType,
    statusKey,
    statusLabel: getStatusLabel(visit?.status),
    meta: metaParts.filter(Boolean).join(' · '),
  };
};

export default visitRowProjection;
