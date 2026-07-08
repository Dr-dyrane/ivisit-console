import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { mostUrgent } from '../utils/recordUrgency';

/**
 * FocusedRecordContext — the console-wide focused-record store.
 *
 * Today, 13 DetailRail pages each keep a PRIVATE `focusedXId` state and resolve
 * the rail's record with `list.find(id) || list[0] || null`. `list[0]` is never
 * "most urgent" (lists sort by recency/name), and the row→rail toggle is wired
 * inconsistently across pages. This provider is the shared foundation that
 * replaces those private stores with a single map of `{ [entity]: focusedId }`
 * plus an urgency-aware fallback (`mostUrgent`, NOT `list[0]`).
 *
 * This is a FOUNDATION only — it is inert until pages consume `useFocusedRecord`.
 * It is intentionally distinct from `FocusContext` (a hover-dimming overlay);
 * do NOT overload that one.
 *
 * Usage — in a page/rail component:
 *
 *   const { focusedRecord, setFocused, isFocused } = useFocusedRecord('emergency', requests);
 *   // focusedRecord === explicit selection OR the most urgent request OR null
 *   // onRowClick={() => setFocused(row.id)}   // toggles off if already focused
 *   // isActive={isFocused(row.id)}
 */

const FocusedRecordContext = createContext(null);

export const FocusedRecordProvider = ({ children }) => {
  // Map of entity key → focused record id (or null when cleared).
  const [focusedByEntity, setFocusedByEntity] = useState({});

  /**
   * Set (or toggle off) the focused id for an entity.
   * Passing the currently-focused id, or a nullish id, clears the focus so a
   * second click on the same row collapses the rail back to its urgency default.
   */
  const setFocusedId = useCallback((entity, id) => {
    if (!entity) return;
    setFocusedByEntity((prev) => {
      const current = prev[entity] ?? null;
      const next = id == null || current === id ? null : id;
      if (current === next) return prev; // no-op — avoid a needless re-render
      return { ...prev, [entity]: next };
    });
  }, []);

  const clearFocus = useCallback((entity) => {
    if (!entity) return;
    setFocusedByEntity((prev) => {
      if ((prev[entity] ?? null) === null) return prev;
      return { ...prev, [entity]: null };
    });
  }, []);

  const getFocusedId = useCallback(
    (entity) => (entity ? focusedByEntity[entity] ?? null : null),
    [focusedByEntity]
  );

  const value = useMemo(
    () => ({ focusedByEntity, setFocusedId, clearFocus, getFocusedId }),
    [focusedByEntity, setFocusedId, clearFocus, getFocusedId]
  );

  return (
    <FocusedRecordContext.Provider value={value}>
      {children}
    </FocusedRecordContext.Provider>
  );
};

/**
 * Low-level store accessor. Prefer `useFocusedRecord` in pages.
 * @returns {{ focusedByEntity: object, setFocusedId: function, clearFocus: function, getFocusedId: function }}
 */
export const useFocusedRecordStore = () => {
  const ctx = useContext(FocusedRecordContext);
  if (!ctx) {
    throw new Error('useFocusedRecordStore must be used within a FocusedRecordProvider');
  }
  return ctx;
};

/**
 * Resolve the focused record for `entity` against `list`.
 *
 * `focusedRecord` = the explicitly-focused row (`list.find(r => r.id === focusedId)`)
 * OR, when there is no explicit selection (or it fell out of the list), the most
 * urgent record via `mostUrgent(list, entity)` — NOT `list[0]`. Ends in `null`
 * for an empty list, mirroring `ivisit-app`'s ordered focus fallback.
 *
 * @param {string} entity — entity key (e.g. 'emergency', 'visits', 'verification')
 * @param {Array<object>} list — the current, possibly-sorted record list
 * @returns {{ focusedId: string|null, focusedRecord: object|null, setFocused: (id:any)=>void, isFocused: (id:any)=>boolean }}
 */
export const useFocusedRecord = (entity, list) => {
  const { setFocusedId, getFocusedId } = useFocusedRecordStore();
  const focusedId = getFocusedId(entity);

  const focusedRecord = useMemo(() => {
    const rows = Array.isArray(list) ? list : [];
    const explicit = focusedId != null ? rows.find((r) => r?.id === focusedId) : undefined;
    return explicit ?? mostUrgent(rows, entity);
  }, [entity, list, focusedId]);

  const setFocused = useCallback((id) => setFocusedId(entity, id), [setFocusedId, entity]);

  const isFocused = useCallback((id) => focusedRecord?.id === id, [focusedRecord]);

  return { focusedId, focusedRecord, setFocused, isFocused };
};

export default FocusedRecordProvider;
