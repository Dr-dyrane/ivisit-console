/**
 * groupByMonth.js - the shared date-grouping used by every temporal mobile feed.
 *
 * Extracted from the MobileVisits flagship (visitMonthLabel + timeOf + the
 * month-boundary render) so every feed groups IDENTICALLY (Mobile Energy Rollout,
 * docs/design-system/MOBILE_ENERGY_ROLLOUT_PLAN.md, criterion S5).
 *
 * Pure: no side effects, safe to unit test (utils/groupByMonth.test.js).
 */

/** "May 2026" for a date-ish value, or null when unparseable/absent. */
export const monthLabel = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

/** Epoch ms for a date-ish value, or 0 when unparseable/absent (sinks to the bottom). */
export const timeOf = (value) => {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = value instanceof Date ? value : new Date(value);
  const ms = parsed.getTime();
  return Number.isNaN(ms) ? 0 : ms;
};

/**
 * Sort items newest-first and attach the month header to render before each item.
 * Returns `[{ item, header }]` where `header` is the month string when the item opens
 * a new month section, else null. Mirrors the flagship exactly: undated rows (header
 * null) simply append under the previous section with no header of their own.
 *
 * @param {Array} items
 * @param {(item:any) => (string|number|Date|null)} getDate  extracts the date-ish field
 * @returns {Array<{ item:any, header:(string|null) }>}
 */
export function groupByMonth(items, getDate) {
  const list = Array.isArray(items) ? items : [];
  const ordered = [...list].sort((a, b) => timeOf(getDate(b)) - timeOf(getDate(a)));
  let last = null;
  return ordered.map((item) => {
    const month = monthLabel(getDate(item));
    const header = month && month !== last ? month : null;
    if (month) last = month;
    return { item, header };
  });
}

export default groupByMonth;
