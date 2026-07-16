import { formatVisitInFacilityTimezone } from '../../../services/visits/normalization';
import { formatRelativeTime } from '../../../utils/activityUtils';
import { getVisitCareTeamDisplay } from '../../../utils/visitRowProjection';
import { visitStatusPillClass } from './visitPageModel';

// ADOPT-33 / ADOPT-34 read-surfacing presentation. Every helper here projects
// ALREADY-FETCHED truth (SCHEDULED_VISIT_SELECT lifecycle + window columns,
// pageEnrichment identity joins) into rail evidence. Missing truth returns
// null so the rail renders honest absence, never a fabricated default.

const cleanText = (value) => {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text || null;
};

const isScheduledSource = (visit) => (
  visit?.sourceKind === 'scheduled_visit' || visit?.source_kind === 'scheduled_visit'
);

// Chip tone reuses the page's canonical status palette; post-completion
// follow-through states share the completed tone, no-show shares cancelled.
const LIFECYCLE_CHIP_TONE = {
  scheduled: visitStatusPillClass.scheduled,
  rescheduled: visitStatusPillClass.scheduled,
  in_progress: visitStatusPillClass.in_progress,
  completed: visitStatusPillClass.completed,
  rating_pending: visitStatusPillClass.completed,
  rated: visitStatusPillClass.completed,
  post_completion: visitStatusPillClass.completed,
  cancelled: visitStatusPillClass.cancelled,
  no_show: visitStatusPillClass.cancelled,
};
const LIFECYCLE_CHIP_FALLBACK_TONE = 'bg-muted/34 text-muted-foreground';

export const humanizeVisitLifecycleState = (state) => {
  const key = cleanText(state)?.toLowerCase() || null;
  if (!key) return null;
  const text = key.replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export const getLifecycleUpdatedRelative = (value) => {
  const text = cleanText(value);
  if (!text) return null;
  const parsed = Date.parse(text);
  if (!Number.isFinite(parsed)) return null;
  return formatRelativeTime(text);
};

// Scheduled-lane lifecycle chip: humanized visits.lifecycle_state plus the
// relative lifecycle_updated_at stamp. Only the scheduled projection fetches
// these columns, so other source kinds return null.
export const getScheduledLifecycleChip = (visit) => {
  if (!isScheduledSource(visit)) return null;
  const stateKey = cleanText(visit?.lifecycle_state)?.toLowerCase() || null;
  const label = humanizeVisitLifecycleState(stateKey);
  if (!label) return null;
  const updatedRelative = getLifecycleUpdatedRelative(visit?.lifecycle_updated_at);
  return {
    stateKey,
    label,
    updatedRelative,
    chipLabel: updatedRelative ? `${label} \u00b7 ${updatedRelative}` : label,
    className: LIFECYCLE_CHIP_TONE[stateKey] || LIFECYCLE_CHIP_FALLBACK_TONE,
  };
};

// Clinical window (scheduled_start_at to scheduled_end_at) in the facility
// timezone. Absent end truth means no window line; missing timezone stays the
// honest 'Timezone unavailable' the Scheduled line already uses.
export const getScheduledClinicalWindow = (visit) => {
  if (!isScheduledSource(visit)) return null;
  const endValue = cleanText(visit?.scheduled_end_at) || cleanText(visit?.scheduledEndAt);
  if (!endValue) return null;
  const timezone = cleanText(visit?.scheduled_timezone)
    || cleanText(visit?.scheduledTimezone)
    || cleanText(visit?.facility?.timezone);
  const startLabel = formatVisitInFacilityTimezone(visit, { includeZone: false });
  const endLabel = formatVisitInFacilityTimezone({
    scheduled_start_at: endValue,
    scheduled_timezone: timezone,
  });
  if (startLabel === 'Time not set' || endLabel === 'Time not set') return null;
  if (startLabel === 'Timezone unavailable' || endLabel === 'Timezone unavailable') {
    return 'Timezone unavailable';
  }
  const dayPrefix = `${startLabel.split(', ')[0]}, `;
  const compactEnd = endLabel.startsWith(dayPrefix) ? endLabel.slice(dayPrefix.length) : endLabel;
  return `${startLabel} to ${compactEnd}`;
};

// Patient contact from the already-fetched profiles join (both lanes select
// profiles.phone). The identity projection's 'No contact' sentinel means the
// truth is missing, so it renders as absence here.
export const getVisitPatientContact = (visit) => {
  const direct = cleanText(visit?.patient?.phone);
  if (direct) return direct;
  const identityPhone = cleanText(visit?.identity?.patient?.phone);
  if (identityPhone && identityPhone !== 'No contact') return identityPhone;
  return null;
};

// Care-team meta lines: doctor rows surface the fetched specialization
// (doctor_record join or visit.specialty snapshot); responder rows surface the
// fetched emergency_requests.responder_phone via the identity projection.
export const getVisitCareTeamMeta = (visit) => {
  const careTeam = getVisitCareTeamDisplay(visit);
  if (careTeam.kind === 'responder') {
    const responderIdentity = visit?.identity?.responder;
    const identityPhone = responderIdentity?.hasResponder
      ? cleanText(responderIdentity?.phone)
      : null;
    return {
      kind: 'responder',
      specialty: null,
      contact: identityPhone || cleanText(visit?.responder?.phone),
    };
  }
  return {
    kind: 'doctor',
    specialty: cleanText(visit?.identity?.doctor?.specialty)
      || cleanText(visit?.assignedDoctor?.specialization)
      || cleanText(visit?.specialty),
    contact: null,
  };
};
