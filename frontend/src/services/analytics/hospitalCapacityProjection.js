import { supabase } from '../../lib/supabase';
import { applyAuthFilter } from '../authService';

const EMPTY_SCOPE_UUID = '00000000-0000-0000-0000-000000000000';

export const HOSPITAL_CAPACITY_PAGE_SIZE = 1000;
export const HOSPITAL_CAPACITY_COLUMNS = [
  'id',
  'provider_type',
  'provider_source',
  'place_id',
  'total_beds',
  'available_beds',
  'icu_beds_available',
].join(', ');

const toExactCount = (value) => (
  value !== null && value !== undefined && Number.isFinite(Number(value))
    ? Number(value)
    : null
);

export function applyAnalyticsHospitalScope(query, user) {
  if (user?.role === 'provider') {
    const hospitalIds = Array.isArray(user?.hospital_ids)
      ? user.hospital_ids.filter(Boolean)
      : [];

    if (hospitalIds.length > 1) return query.in('id', hospitalIds);
    if (hospitalIds.length === 1) return query.eq('id', hospitalIds[0]);
    if (user?.organization_id) return query.eq('organization_id', user.organization_id);
    return query.eq('id', EMPTY_SCOPE_UUID);
  }

  return applyAuthFilter(query, user, {
    orgIdField: 'organization_id',
    resourceType: 'hospitals',
  });
}

export async function getAnalyticsHospitalCapacitySource(user) {
  const rows = [];
  const rowIds = new Set();
  let hasDuplicateRows = false;
  let totalCount = null;
  let offset = 0;

  while (totalCount === null || rows.length < totalCount) {
    let query = supabase
      .from('hospitals')
      .select(
        HOSPITAL_CAPACITY_COLUMNS,
        offset === 0 ? { count: 'exact' } : undefined,
      );

    query = applyAnalyticsHospitalScope(query, user)
      .order('id', { ascending: true })
      .range(offset, offset + HOSPITAL_CAPACITY_PAGE_SIZE - 1);

    const result = await query;
    if (result.error) {
      return {
        data: rows,
        count: totalCount,
        error: result.error,
        complete: false,
        pageSize: HOSPITAL_CAPACITY_PAGE_SIZE,
      };
    }

    const pageRows = Array.isArray(result.data) ? result.data : [];
    if (offset === 0) totalCount = toExactCount(result.count);
    pageRows.forEach((row) => {
      if (!row?.id || rowIds.has(row.id)) hasDuplicateRows = true;
      if (row?.id) rowIds.add(row.id);
      rows.push(row);
    });

    if (totalCount !== null && rows.length >= totalCount) break;
    if (pageRows.length < HOSPITAL_CAPACITY_PAGE_SIZE) break;
    offset += HOSPITAL_CAPACITY_PAGE_SIZE;
  }

  let finalCountQuery = supabase
    .from('hospitals')
    .select('id', { count: 'exact', head: true });
  finalCountQuery = applyAnalyticsHospitalScope(finalCountQuery, user);
  const finalCountResult = await finalCountQuery;
  const finalCount = toExactCount(finalCountResult.count);

  if (finalCountResult.error) {
    return {
      data: rows,
      count: totalCount,
      error: finalCountResult.error,
      complete: false,
      pageSize: HOSPITAL_CAPACITY_PAGE_SIZE,
    };
  }

  const countStable = totalCount !== null && finalCount === totalCount;
  const rowsComplete = totalCount !== null
    && rows.length === totalCount
    && rowIds.size === rows.length;

  return {
    data: rows,
    count: finalCount ?? totalCount,
    error: null,
    complete: countStable && rowsComplete && !hasDuplicateRows,
    pageSize: HOSPITAL_CAPACITY_PAGE_SIZE,
  };
}
