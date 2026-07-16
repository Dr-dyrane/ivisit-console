import { supabase } from '../../lib/supabase';

/**
 * Read-only reference resolution for trigger-created insurance billing rows.
 *
 * Billing outcomes carry bare UUID references (hospital_id,
 * emergency_request_id, user_id). This module resolves them into human labels
 * AFTER the billing window lands, with batched .in() reads. It owns no write
 * path, and a failed or empty lookup leaves the truncated-UUID fallback in
 * place at the render layer -- it never fabricates a name.
 */

export const EMPTY_INSURANCE_BILLING_REFERENCES = Object.freeze({
  hospitalNamesById: {},
  requestDisplayIdsById: {},
  memberNamesById: {},
  failed: false,
});

const collectIds = (outcomes, key) => [
  ...new Set(
    (Array.isArray(outcomes) ? outcomes : [])
      .map((outcome) => outcome?.[key])
      .filter(Boolean)
  ),
];

// Only non-empty labels enter the map; a row with a null label stays
// unresolved so the UI keeps the honest UUID fallback.
const toLabelMap = (rows, labelKey) => (rows || []).reduce((labels, row) => {
  const label = String(row?.[labelKey] || '').trim();
  if (row?.id && label) labels[row.id] = label;
  return labels;
}, {});

async function fetchReferenceRows(table, columns, ids) {
  if (!ids.length) return { rows: [], failed: false };
  try {
    const { data, error } = await supabase.from(table).select(columns).in('id', ids);
    if (error) return { rows: [], failed: true };
    return { rows: data || [], failed: false };
  } catch {
    return { rows: [], failed: true };
  }
}

export async function resolveInsuranceBillingReferences(outcomes = []) {
  const hospitalIds = collectIds(outcomes, 'hospital_id');
  const requestIds = collectIds(outcomes, 'emergency_request_id');
  const memberIds = collectIds(outcomes, 'user_id');
  if (!hospitalIds.length && !requestIds.length && !memberIds.length) {
    return { ...EMPTY_INSURANCE_BILLING_REFERENCES };
  }

  const [hospitals, requests, members] = await Promise.all([
    fetchReferenceRows('hospitals', 'id,name', hospitalIds),
    fetchReferenceRows('emergency_requests', 'id,display_id', requestIds),
    fetchReferenceRows('profiles', 'id,full_name', memberIds),
  ]);

  return {
    hospitalNamesById: toLabelMap(hospitals.rows, 'name'),
    requestDisplayIdsById: toLabelMap(requests.rows, 'display_id'),
    memberNamesById: toLabelMap(members.rows, 'full_name'),
    failed: hospitals.failed || requests.failed || members.failed,
  };
}
