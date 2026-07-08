/**
 * Record Normalize (L1.5 shared seam)
 * -----------------------------------------------------------------------------
 * Two pure, framework-free helpers that sit on the projection/normalize seam
 * described in CONSOLE_LAYER_MODEL_PLAN.md section E (step S2-1) and section C
 * (the target read path: `mapRow + dedupeByIdKeepNewest + recordIdentity`).
 *
 *   1. dedupeByIdKeepNewest(list, getId, getTs)
 *        Collapse a list to one row per id, keeping the newest row per id.
 *        IDEMPOTENT: running it again on an already-deduped list is a no-op
 *        (same rows, same order, structurally equal).
 *
 *   2. recordIdentity(row) -> { id, primary, secondary, status, meta }
 *        A generic, domain-agnostic list-row identity projection. Factored to
 *        match the { primary, secondary, status, meta } conventions already in
 *        `visitRowProjection` (visitRowProjection.js:138 -> primary/secondary/
 *        statusKey/meta) and `buildEmergencyRenderProjection`
 *        (emergencyRequestMapper.js:148 -> identity.id / patientDisplay /
 *        serviceDisplay / statusDisplay / locationDisplay), with safe fallbacks
 *        for missing or empty fields so an unlabeled row still resolves.
 *
 * No React, no side effects, no dependencies. Changes no existing callers.
 */

/**
 * First value that is neither null/undefined nor an empty/blank string.
 * Preserves the ORIGINAL value (does not coerce numbers to strings) so it can
 * be reused for ids as well as text. Returns null when nothing qualifies.
 *
 * @param {...*} values
 * @returns {*|null}
 */
const firstDefined = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    if (typeof value === 'string' && value.trim() === '') continue;
    return value;
  }
  return null;
};

/**
 * First value coerced to a trimmed non-empty string, else ''.
 *
 * @param {...*} values
 * @returns {string}
 */
const firstNonEmptyString = (...values) => {
  const picked = firstDefined(...values);
  if (picked === null) return '';
  const text = typeof picked === 'string' ? picked.trim() : String(picked);
  return text;
};

/**
 * Convert a timestamp-ish value (ISO string, epoch number, or Date) into a
 * comparable epoch number, or null when it carries no usable time information.
 *
 * @param {*} ts
 * @returns {number|null}
 */
const toEpoch = (ts) => {
  if (ts === null || ts === undefined || ts === '') return null;
  if (ts instanceof Date) {
    const time = ts.getTime();
    return Number.isNaN(time) ? null : time;
  }
  if (typeof ts === 'number') {
    return Number.isFinite(ts) ? ts : null;
  }
  const parsed = new Date(ts).getTime();
  return Number.isNaN(parsed) ? null : parsed;
};

/**
 * True only when `candidate` is STRICTLY newer than `current`. Ties and
 * unknown/unparseable candidate timestamps keep the incumbent (first-seen
 * wins) so the result is deterministic and stable across re-runs.
 *
 * @param {*} candidateTs
 * @param {*} currentTs
 * @returns {boolean}
 */
const isStrictlyNewer = (candidateTs, currentTs) => {
  const candidate = toEpoch(candidateTs);
  const current = toEpoch(currentTs);
  if (candidate === null) return false;
  if (current === null) return true;
  return candidate > current;
};

/**
 * Collapse a list to one row per id, keeping the NEWEST row per id.
 *
 * Ordering: the result preserves the position of each id's FIRST occurrence.
 * When a later duplicate is newer, its content replaces the incumbent in that
 * same slot. Rows whose id resolves to null/undefined cannot be collapsed and
 * are kept as-is, each in place.
 *
 * IDEMPOTENCY: after one pass every id is unique, so a second pass finds no
 * duplicates to merge and returns a structurally identical list (same rows,
 * same order). Non-arrays yield an empty array.
 *
 * @template T
 * @param {T[]} list
 * @param {(row: T) => *} [getId]  id selector (default: r.id)
 * @param {(row: T) => *} [getTs]  timestamp selector (default: r.updated_at)
 * @returns {T[]}
 */
export const dedupeByIdKeepNewest = (
  list,
  getId = (row) => (row == null ? undefined : row.id),
  getTs = (row) => (row == null ? undefined : row.updated_at)
) => {
  if (!Array.isArray(list)) return [];

  const indexById = new Map();
  const result = [];

  for (const row of list) {
    const id = getId(row);

    if (id === null || id === undefined) {
      // Unidentifiable rows can't be deduped; keep each in place.
      result.push(row);
      continue;
    }

    if (!indexById.has(id)) {
      indexById.set(id, result.length);
      result.push(row);
      continue;
    }

    const existingIndex = indexById.get(id);
    if (isStrictlyNewer(getTs(row), getTs(result[existingIndex]))) {
      result[existingIndex] = row;
    }
  }

  return result;
};

/**
 * Normalize a raw status into a stable lowercase key; 'unknown' when absent.
 *
 * @param {*} value
 * @returns {string}
 */
const normalizeStatus = (value) => {
  if (value === null || value === undefined) return 'unknown';
  const text = String(value).trim().toLowerCase();
  return text === '' ? 'unknown' : text;
};

/**
 * Generic, domain-agnostic list-row identity projection.
 *
 * Mirrors the { primary, secondary, status, meta } contract already used by the
 * per-domain projections, resolved through broad fallback ladders so it works
 * on a visit row, an emergency row, or any other entity, and always returns a
 * fully-populated shape even for an empty/partial/nullish input.
 *
 * @param {Object} [row]
 * @returns {{ id: *, primary: string, secondary: string, status: string, meta: string }}
 */
export const recordIdentity = (row) => {
  const safe = row && typeof row === 'object' ? row : {};

  const id = firstDefined(
    safe.id,
    safe.uuid,
    safe.request_id,
    safe.record_id,
    safe.display_id
  );

  // High-cardinality human anchor (visit leads with facility, emergency with
  // the patient/service label). Fall back to any resolved id, then a sentinel.
  const primary =
    firstNonEmptyString(
      safe.primary,
      safe.name,
      safe.title,
      safe.full_name,
      safe.hospital_name,
      safe.patient_name,
      safe.label,
      safe.display_name,
      safe.email
    ) ||
    (id === null ? '' : String(id)) ||
    'Untitled record';

  const secondary = firstNonEmptyString(
    safe.secondary,
    safe.subtitle,
    safe.description,
    safe.summary,
    safe.service_type,
    safe.type,
    safe.category
  );

  const status = normalizeStatus(safe.status ?? safe.state);

  const meta = firstNonEmptyString(
    safe.meta,
    safe.display_id,
    safe.location,
    safe.created_at,
    safe.updated_at,
    safe.date
  );

  return { id, primary, secondary, status, meta };
};

export default recordIdentity;
