import { canonicalizeVisitStatus } from '../../utils/visitStatus';

export const SCHEDULED_CARE_MODES = Object.freeze(['in_person', 'telemedicine_async']);

const firstObject = (...values) => values.find((value) => value && typeof value === 'object') || null;
const firstText = (...values) => {
  const value = values.find((item) => item !== null && item !== undefined && String(item).trim());
  return value === undefined ? null : String(value).trim();
};

export const isScheduledVisitSource = (visit) => Boolean(
  visit
  && !visit.request_id
  && SCHEDULED_CARE_MODES.includes(visit.care_mode)
  && visit.scheduled_start_at
);

export const getVisitSourceKind = (visit) => {
  if (visit?.request_id) return 'emergency_visit';
  if (isScheduledVisitSource(visit)) return 'scheduled_visit';
  return 'legacy_visit';
};

export const getCareModeLabel = (careMode) => {
  if (careMode === 'telemedicine_async') return 'Async consult';
  if (careMode === 'in_person') return 'In person';
  return 'Legacy visit';
};

export const normalizeVisitForUI = (visit) => {
  if (!visit) return visit;
  const patient = firstObject(visit.patient, visit.profiles);
  const doctorRecord = firstObject(visit.assignedDoctor, visit.doctor_record);
  const hospitalRecord = firstObject(visit.facility, visit.hospital_record);
  const doctorName = firstText(doctorRecord?.name, visit.doctor_name, visit.doctor);
  const hospitalName = firstText(hospitalRecord?.name, visit.hospital_name, visit.hospital);
  const sourceKind = getVisitSourceKind(visit);
  const sourceStatus = visit.source_status ?? visit.status ?? null;
  const statusInput = sourceKind === 'scheduled_visit' ? sourceStatus : (visit.status ?? sourceStatus);
  const status = canonicalizeVisitStatus(statusInput, sourceKind === 'scheduled_visit' ? 'scheduled' : null);
  const careMode = visit.care_mode ?? null;

  return {
    ...visit,
    patient,
    profiles: undefined,
    doctor_record: undefined,
    hospital_record: undefined,
    assignedDoctor: doctorRecord ? {
      id: doctorRecord.id || visit.doctor_id || null,
      profile_id: doctorRecord.profile_id || null,
      name: doctorName || 'Unassigned clinician',
      image: doctorRecord.image || visit.doctor_image || null,
      specialization: doctorRecord.specialization || visit.specialty || null,
      hospital_id: doctorRecord.hospital_id || visit.hospital_id || null,
    } : (visit.doctor_id || doctorName ? {
      id: visit.doctor_id || null,
      profile_id: null,
      name: doctorName || 'Unassigned clinician',
      image: visit.doctor_image || null,
      specialization: visit.specialty || null,
      hospital_id: visit.hospital_id || null,
    } : null),
    facility: hospitalRecord ? {
      id: hospitalRecord.id || visit.hospital_id || null,
      name: hospitalName || 'Unknown facility',
      address: hospitalRecord.address || visit.address || null,
      timezone: hospitalRecord.timezone || visit.scheduled_timezone || null,
    } : (visit.hospital_id || hospitalName ? {
      id: visit.hospital_id || null,
      name: hospitalName || 'Unknown facility',
      address: visit.address || null,
      timezone: visit.scheduled_timezone || null,
    } : null),
    doctor: visit.doctor ?? doctorName ?? null,
    doctor_name: doctorName,
    hospital_name: hospitalName,
    visit_type: visit.visit_type ?? visit.type ?? null,
    room_number: visit.room_number ?? null,
    source_status: sourceStatus,
    status: status || sourceStatus,
    sourceKind,
    source_kind: sourceKind,
    careMode,
    careModeLabel: getCareModeLabel(careMode),
    scheduledStartAt: visit.scheduled_start_at || null,
    scheduledEndAt: visit.scheduled_end_at || null,
    scheduledTimezone: visit.scheduled_timezone || hospitalRecord?.timezone || null,
    asyncConsultAvailability: careMode === 'telemedicine_async'
      ? (['scheduled', 'in_progress'].includes(status) ? 'Active' : 'Closed')
      : null,
  };
};

export const formatVisitInFacilityTimezone = (visit, options = {}) => {
  const value = visit?.scheduled_start_at || visit?.scheduledStartAt || visit?.date || visit?.created_at;
  if (!value) return 'Time not set';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Time not set';
  const timezone = firstText(
    visit?.scheduled_timezone,
    visit?.scheduledTimezone,
    visit?.facility?.timezone,
  );
  if (!timezone) return 'Timezone unavailable';
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: options.includeYear ? 'numeric' : undefined,
      hour: 'numeric',
      minute: '2-digit',
      timeZone: timezone,
      timeZoneName: options.includeZone === false ? undefined : 'short',
    }).format(parsed);
  } catch {
    return 'Timezone unavailable';
  }
};
