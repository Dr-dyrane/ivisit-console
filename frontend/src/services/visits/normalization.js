import { canonicalizeVisitStatus } from '../../utils/visitStatus';

export const SCHEDULED_CARE_MODES = Object.freeze(['in_person', 'telemedicine_async']);

const firstObject = (...values) => values.find((value) => value && typeof value === 'object') || null;
const firstText = (...values) => {
  const value = values.find((item) => item !== null && item !== undefined && String(item).trim());
  return value === undefined ? null : String(value).trim();
};

// ADOPT-30 boundary parsers for the adopted post-completion outcome columns.
// Junk collapses to null and the raw value is preserved nowhere: Number('')
// is 0 and must not read as a zero score, booleans/objects never coerce, and
// out-of-range scores (outside 1..5) are dropped rather than clamped.
const toFiniteNumber = (value) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }
  return null;
};

const normalizeVisitRating = (value) => {
  const numeric = toFiniteNumber(value);
  return numeric !== null && numeric >= 1 && numeric <= 5 ? numeric : null;
};

const normalizeVisitTipAmount = (value) => {
  const numeric = toFiniteNumber(value);
  return numeric !== null && numeric > 0 ? numeric : null;
};

const normalizeVisitTipCurrency = (value) => {
  const text = firstText(value);
  return text ? text.toUpperCase() : null;
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
  // Adopted evidence columns (schema: estimated_duration text, insurance_covered
  // boolean, preparation text[]). Shape is normalized here; missing truth stays
  // null so the UI can render an honest Unknown instead of a fabricated default.
  const preparationSteps = (Array.isArray(visit.preparation) ? visit.preparation : [visit.preparation])
    .map((step) => firstText(step))
    .filter(Boolean);

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
    estimated_duration: firstText(visit.estimated_duration),
    insurance_covered: typeof visit.insurance_covered === 'boolean' ? visit.insurance_covered : null,
    preparation: preparationSteps.length > 0 ? preparationSteps : null,
    // ADOPT-30: numeric/financial post-completion outcomes only. rating is a
    // 1..5 finite score or null; tip_amount is a finite positive number or
    // null; tip_currency is a trimmed uppercase code or null; timestamps stay
    // strings or null. rating_comment (patient free text) and tip_payment_id
    // (bare FK) are never projected -- stripped here even if a caller leaks them.
    rating: normalizeVisitRating(visit.rating),
    rated_at: firstText(visit.rated_at),
    tip_amount: normalizeVisitTipAmount(visit.tip_amount),
    tip_currency: normalizeVisitTipCurrency(visit.tip_currency),
    tipped_at: firstText(visit.tipped_at),
    rating_comment: undefined,
    tip_payment_id: undefined,
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
