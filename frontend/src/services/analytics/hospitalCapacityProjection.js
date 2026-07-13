import { supabase } from '../../lib/supabase';
import { applyAuthFilter } from '../authService';

const EMPTY_SCOPE_UUID = '00000000-0000-0000-0000-000000000000';

export const HOSPITAL_CAPACITY_PAGE_SIZE = 1000;
export const HOSPITAL_CAPACITY_COLUMNS = 'id, total_beds, available_beds, icu_beds_available';

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
    rows.push(...pageRows);

    if (totalCount !== null && rows.length >= totalCount) break;
    if (pageRows.length < HOSPITAL_CAPACITY_PAGE_SIZE) break;
    offset += HOSPITAL_CAPACITY_PAGE_SIZE;
  }

  return {
    data: rows,
    count: totalCount,
    error: null,
    complete: totalCount !== null && rows.length >= totalCount,
    pageSize: HOSPITAL_CAPACITY_PAGE_SIZE,
  };
}
