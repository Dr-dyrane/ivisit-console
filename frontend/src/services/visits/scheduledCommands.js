import { supabase } from '../../lib/supabase';
import { normalizeVisitForUI } from './normalization';

export const SCHEDULED_VISIT_ACTIONS = Object.freeze(['cancel', 'reschedule', 'start', 'complete', 'no_show']);

const classifyScheduledVisitActionError = (error) => {
  const message = String(error?.message || error || 'Scheduled visit action failed.');
  const rules = [
    ['invalid_request', /valid scheduled visit|choose a new start time|reason cannot exceed/i, message],
    ['authorization_denied', /unauthorized|permission|forbidden|row-level|rls/i, 'You do not have permission to make this visit change.'],
    ['illegal_transition', /only an|clinical window|no-show is available|closes 2 hours/i, 'This change is not available for the visit\'s current status or scheduled time.'],
    ['slot_unavailable', /no clinician|already has|available for rescheduling|15-minute slot/i, 'That time is no longer available. Choose another slot.'],
    ['not_found', /not found/i, 'The scheduled visit is no longer available.'],
    ['wrong_source', /emergency and legacy/i, 'Emergency and legacy visits keep their existing lifecycle controls.'],
  ];
  const matched = rules.find(([, pattern]) => pattern.test(message));
  const result = new Error(matched?.[2] || 'The scheduled visit could not be updated. Try again.');
  result.name = 'ScheduledVisitActionError';
  result.code = matched?.[0] || error?.code || 'scheduled_visit_action_failed';
  result.cause = error;
  return result;
};

export async function transitionScheduledVisit({ visitId, action, scheduledStartAt, reason }) {
  try {
    if (!visitId || !SCHEDULED_VISIT_ACTIONS.includes(action)) {
      throw new Error('Valid scheduled visit and action are required.');
    }
    if (action === 'reschedule' && !scheduledStartAt) {
      throw new Error('Choose a new start time before rescheduling.');
    }
    const trimmedReason = String(reason || '').trim();
    if (trimmedReason.length > 500) throw new Error('Reason cannot exceed 500 characters.');

    const args = { p_visit_id: visitId, p_action: action };
    if (scheduledStartAt) args.p_scheduled_start_at = scheduledStartAt;
    if (trimmedReason) args.p_reason = trimmedReason;

    const { data, error } = await supabase.rpc('transition_scheduled_visit', args);
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data?.visit || data?.data || data;
    return row && typeof row === 'object' ? normalizeVisitForUI(row) : row;
  } catch (error) {
    throw classifyScheduledVisitActionError(error);
  }
}

export const zonedLocalDateTimeToUtc = (localValue, timeZone) => {
  const matched = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(String(localValue || ''));
  if (!matched || !timeZone) throw new Error('A valid local date, time, and facility timezone are required.');
  const desired = matched.slice(1).map(Number);
  const desiredUtc = Date.UTC(desired[0], desired[1] - 1, desired[2], desired[3], desired[4]);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    hourCycle: 'h23',
  });
  let candidate = desiredUtc;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(candidate)).map((part) => [part.type, part.value]));
    const rendered = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute));
    candidate += desiredUtc - rendered;
  }
  const finalParts = Object.fromEntries(formatter.formatToParts(new Date(candidate)).map((part) => [part.type, part.value]));
  const finalValues = [finalParts.year, finalParts.month, finalParts.day, finalParts.hour, finalParts.minute].map(Number);
  if (finalValues.some((value, index) => value !== desired[index])) {
    throw new Error('That local time does not exist in the facility timezone. Choose another slot.');
  }
  return new Date(candidate).toISOString();
};
