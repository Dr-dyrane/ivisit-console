// Data-driven adaptive grouping — the mechanized form of the user's standing rule
// (2026-07-10): "if a grouping gives you just one or two items under it, regroup by
// another factor like date; use the real data distribution to decide."
//
// A directory page (Hospitals, Ambulances) has no recency feed to bucket by, so it
// wants to group by a DOMAIN factor (station, capacity...). But a factor chosen by
// intuition is often DEGENERATE on the real data — measured 2026-07-10: ambulance
// `station` = 147 groups / 85% singletons; hospital `capacity` = 194 reporting / 3
// silent. A wall of one-row panels is worse than no grouping.
//
// So: never trust a factor blindly. Build the grouping, SCORE its distribution, and
// use it only if healthy; otherwise fall through to the next candidate. Recency is
// the reliable last resort because dates almost always distribute. The chosen factor
// is data-driven PER RENDER, so the same page adapts to whatever the tenant's data
// actually looks like.

import { groupByRecency } from './groupByRecency';

/**
 * Score a grouping's health on the actual data.
 * Degenerate =
 *   - < 2 groups (no differentiation — one giant panel), OR
 *   - > 8 groups (fragmented — a wall of tiny panels), OR
 *   - > 50% of groups are singletons (mostly one-row panels), OR
 *   - one group holds > 85% of items (a lopsided split hiding a near-empty bucket).
 */
export const scoreGrouping = (groups, total) => {
  const nonEmpty = (groups || []).filter((g) => g.items && g.items.length > 0);
  const n = nonEmpty.length;
  if (n === 0 || !total) return { healthy: false, n, reason: 'empty' };
  const singletons = nonEmpty.filter((g) => g.items.length === 1).length;
  const singletonRatio = singletons / n;
  const maxShare = Math.max(...nonEmpty.map((g) => g.items.length)) / total;
  const healthy = n >= 2 && n <= 8 && singletonRatio <= 0.5 && maxShare <= 0.85;
  return { healthy, n, singletons, singletonRatio, maxShare };
};

// Build groups for one categorical factor. factor.assign(item) -> group key (or null
// => the item drops into the `emptyKey` bucket, rendered last). factor.labelFor(key)
// gives the panel header; factor.order(keys) optionally sorts the keys.
const buildCategoricalGroups = (rows, factor) => {
  const byKey = new Map();
  const orphans = [];
  rows.forEach((item) => {
    const key = factor.assign(item);
    if (key === null || key === undefined || key === '') { orphans.push(item); return; }
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(item);
  });
  let keys = [...byKey.keys()];
  keys = factor.order ? factor.order(keys) : keys.sort((a, b) => String(a).localeCompare(String(b)));
  const groups = keys.map((key) => ({ key, label: factor.labelFor ? factor.labelFor(key) : String(key), items: byKey.get(key) }));
  if (orphans.length) groups.push({ key: '__orphans', label: factor.orphanLabel || 'Unassigned', items: orphans });
  return groups;
};

// Recency factor — always distributes, so it is the guaranteed fallback. Reuses the
// canon groupByRecency (same buckets the feed pages use), keyed on the freshness date.
const buildRecencyGroups = (rows, getDate) =>
  groupByRecency(rows, getDate).map((b) => ({ key: b.key, label: b.label, items: b.items }));

/**
 * Resolve the best grouping for `items` from an ordered list of candidate factors.
 * Each factor is either:
 *   categorical: { type?: 'categorical', key, assign, labelFor?, order?, orphanLabel? }
 *   recency:     { type: 'recency', key, getDate }   (the reliable fallback; always used
 *                 if reached, regardless of health, since dates distribute)
 * Returns { factorKey, groups, score } — groups is [{ key, label, items }], empties dropped.
 * The LAST factor should be a recency (or otherwise always-valid) factor so a result is
 * guaranteed; if none is provided and all categorical factors are degenerate, falls back
 * to a single flat group (honest: "no useful grouping for this data").
 */
export const resolveAdaptiveGroups = (items, factors) => {
  const rows = Array.isArray(items) ? items : [];
  const total = rows.length;
  if (total === 0) return { factorKey: 'empty', groups: [], score: null };

  for (const factor of factors) {
    if (factor.type === 'recency') {
      return { factorKey: factor.key, groups: buildRecencyGroups(rows, factor.getDate), score: null };
    }
    const groups = buildCategoricalGroups(rows, factor);
    const score = scoreGrouping(groups, total);
    if (score.healthy) return { factorKey: factor.key, groups, score };
  }
  // No factor healthy and no recency fallback provided: one flat group (honest).
  return { factorKey: 'flat', groups: [{ key: '__all', label: null, items: rows }], score: null };
};
