import { formatVisitInFacilityTimezone } from '../services/visits/normalization';
import { getStandardizedHospital } from './hospitalUtils';
import { getStandardizedPatient } from './patientUtils';

const firstNonEmpty = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return '';
};

export const formatVisitType = (visit) => {
  if (visit?.sourceKind === 'scheduled_visit' && visit?.careModeLabel) return visit.careModeLabel;
  const raw = String(visit?.visit_type || visit?.type || 'Visit').replace(/_/g, ' ');
  return raw.replace(/\b\w/g, (letter) => letter.toUpperCase());
};

export const getVisitStatusKey = (status) => {
  const value = String(status || '').toLowerCase();
  if (value === 'completed') return 'completed';
  if (value === 'in_progress' || value === 'active') return 'in_progress';
  if (['cancelled', 'canceled', 'no_show', 'no-show'].includes(value)) return 'cancelled';
  return 'scheduled';
};

export const getStatusLabel = (status) => {
  const key = getVisitStatusKey(status);
  if (key === 'completed') return 'Done';
  if (key === 'in_progress') return 'Active';
  if (key === 'cancelled') return 'Cancelled';
  return 'Scheduled';
};

export const getVisitFacilityLabel = (visit) => {
  if (!visit) return 'Unlinked visit';
  const standardized = getStandardizedHospital(visit);
  const standardizedName = standardized?.name !== 'Unknown Facility' ? standardized?.name : '';
  return firstNonEmpty(
    visit.facility?.name,
    standardizedName,
    visit.hospital?.name,
    visit.hospital_name,
    typeof visit.hospital === 'string' ? visit.hospital : '',
    visit.room_number ? `Room ${visit.room_number}` : '',
  ) || 'Unlinked visit';
};

export const getVisitPatientLabel = (visit) => {
  if (!visit) return 'No patient';
  const standardized = getStandardizedPatient(visit);
  const standardizedName = standardized?.name !== 'Unknown Patient' ? standardized?.name : '';
  return firstNonEmpty(
    visit.identity?.patient?.name,
    standardizedName,
    visit.patient?.full_name,
    visit.patient?.username,
    visit.patient_name,
  ) || (visit.user_id ? 'Linked patient' : 'No patient');
};

export const isAmbulanceEmergencyVisit = (visit) => {
  const sourceKind = firstNonEmpty(visit?.sourceKind, visit?.source_kind).toLowerCase();
  const serviceType = firstNonEmpty(
    visit?.service_type,
    visit?.visit_type,
    visit?.type,
  ).toLowerCase();
  const requestLinked = sourceKind === 'emergency_visit' || Boolean(visit?.request_id);
  const responderIdentity = visit?.identity?.responder;
  const hasAmbulanceIdentity = Boolean(
    visit?.identity?.keys?.ambulanceId
    || responderIdentity?.ambulanceId
    || responderIdentity?.hasResponder
    || visit?.ambulance_id
    || visit?.responder_id
  );

  return requestLinked && (serviceType === 'ambulance' || hasAmbulanceIdentity);
};

export const getVisitCareTeamDisplay = (visit) => {
  if (isAmbulanceEmergencyVisit(visit)) {
    const canonicalResponder = visit?.identity?.responder;
    const responderName = canonicalResponder
      ? firstNonEmpty(canonicalResponder.name)
      : firstNonEmpty(
        visit?.responder?.name,
        visit?.responder?.full_name,
        visit?.responder_name,
      );

    return {
      kind: 'responder',
      rowLabel: 'Driver',
      detailLabel: 'Responder',
      name: responderName || 'Unassigned',
    };
  }

  const canonicalDoctor = visit?.identity?.doctor;
  const doctorName = canonicalDoctor
    ? firstNonEmpty(canonicalDoctor.name)
    : firstNonEmpty(
      visit?.assignedDoctor?.name,
      visit?.doctor?.name,
      typeof visit?.doctor === 'string' ? visit.doctor : '',
      visit?.doctor_name,
    );

  return {
    kind: 'doctor',
    rowLabel: 'Doctor',
    detailLabel: 'Practitioner',
    name: doctorName || 'Unassigned',
  };
};

const formatLegacyWhen = (visit) => {
  const value = visit?.date || visit?.scheduled_at || visit?.created_at;
  if (!value) return 'Time not set';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Time not set';
  return parsed.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

export const visitRowProjection = (visit) => {
  const serviceType = formatVisitType(visit);
  const patientName = getVisitPatientLabel(visit);
  const careTeam = getVisitCareTeamDisplay(visit);
  const statusKey = getVisitStatusKey(visit?.status);
  const when = visit?.sourceKind === 'scheduled_visit'
    ? formatVisitInFacilityTimezone(visit)
    : formatLegacyWhen(visit);
  const metaParts = [when];
  if (visit?.sourceKind !== 'scheduled_visit' && visit?.room_number) {
    metaParts.push(`Room ${visit.room_number}`);
  } else if (visit?.display_id) {
    metaParts.push(String(visit.display_id));
  }

  return {
    primary: getVisitFacilityLabel(visit),
    caption: serviceType,
    secondary: `${patientName} \u00b7 ${serviceType}`,
    patientName,
    careTeam,
    serviceType,
    statusKey,
    statusLabel: getStatusLabel(visit?.status),
    meta: metaParts.filter(Boolean).join(' \u00b7 '),
  };
};

export default visitRowProjection;
