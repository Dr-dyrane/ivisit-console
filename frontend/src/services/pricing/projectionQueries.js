import { supabase } from '../../lib/supabase';
import {
  PRICING_FAMILY_CONFIG,
  PRICING_HOSPITAL_FILTER_LIMIT,
  PRICING_PROJECTION_UNAVAILABLE_MESSAGE,
  PRICING_QUERY_CHUNK_SIZE,
} from './constants';
import {
  getPricingTableForFamily,
  normalizeSearch,
} from './normalization';

const createPricingProjectionError = (code) => {
  const error = new Error(PRICING_PROJECTION_UNAVAILABLE_MESSAGE);
  error.code = code;
  return error;
};

const assertExactCollection = ({ data, count, code }) => {
  const exactCount = Number(count);
  const rows = Array.isArray(data) ? data : [];
  if (count === null || count === undefined || !Number.isFinite(exactCount) || rows.length < exactCount) {
    throw createPricingProjectionError(code);
  }
  return rows;
};

export const loadOrganizationHospitals = async (organizationId) => {
  if (!organizationId) return [];

  const { data, count, error } = await supabase
    .from('hospitals')
    .select('id, organization_id, name', { count: 'exact' })
    .eq('organization_id', organizationId);

  if (error) throw error;
  const hospitals = assertExactCollection({
    data,
    count,
    code: 'pricing_organization_scope_incomplete',
  });
  if (hospitals.length > PRICING_HOSPITAL_FILTER_LIMIT) {
    throw createPricingProjectionError('pricing_organization_scope_too_large');
  }
  return hospitals;
};

export const loadFacilitySearchHospitals = async (searchTerm, organizationHospitals = null) => {
  if (!searchTerm) return [];
  if (Array.isArray(organizationHospitals)) {
    return organizationHospitals.filter((hospital) => (
      normalizeSearch(hospital?.name).includes(searchTerm)
    ));
  }

  const { data, count, error } = await supabase
    .from('hospitals')
    .select('id, organization_id, name', { count: 'exact' })
    .ilike('name', `%${searchTerm}%`);

  if (error) throw error;
  const hospitals = assertExactCollection({
    data,
    count,
    code: 'pricing_facility_search_incomplete',
  });
  if (hospitals.length > PRICING_HOSPITAL_FILTER_LIMIT) {
    throw createPricingProjectionError('pricing_facility_search_too_large');
  }
  return hospitals;
};

const applyPricingHospitalScope = (query, organizationId, hospitalIds) => {
  if (!organizationId) return query;
  return hospitalIds.length > 0
    ? query.or(`hospital_id.is.null,hospital_id.in.(${hospitalIds.join(',')})`)
    : query.is('hospital_id', null);
};

const applyPricingScope = (query, scope = 'all') => {
  if (scope === 'global') return query.is('hospital_id', null);
  if (scope === 'override') return query.not('hospital_id', 'is', null);
  return query;
};

const applyPricingSearch = (query, family, searchTerm, facilitySearchIds) => {
  if (!searchTerm) return query;
  const filters = PRICING_FAMILY_CONFIG[family].searchColumns
    .map((column) => `${column}.ilike.%${searchTerm}%`);
  if (facilitySearchIds.length > 0) {
    filters.push(`hospital_id.in.(${facilitySearchIds.join(',')})`);
  }
  return query.or(filters.join(','));
};

const buildPricingFamilyQuery = ({
  family,
  organizationId,
  hospitalIds,
  searchTerm,
  facilitySearchIds,
  scope = 'all',
  select = 'id',
  selectOptions,
}) => {
  let query = supabase.from(getPricingTableForFamily(family)).select(select, selectOptions);
  query = applyPricingHospitalScope(query, organizationId, hospitalIds);
  query = applyPricingScope(query, scope);
  query = applyPricingSearch(query, family, searchTerm, facilitySearchIds);
  return query;
};

const getPricingFamilyExactCount = async (context, family, {
  scope = 'all',
  updatedAfter = null,
} = {}) => {
  let query = buildPricingFamilyQuery({
    ...context,
    family,
    scope,
    select: 'id',
    selectOptions: { count: 'exact', head: true },
  });
  if (updatedAfter) query = query.gte('updated_at', updatedAfter);

  const { count, error } = await query;
  if (error) throw error;
  const exactCount = Number(count);
  if (count === null || count === undefined || !Number.isFinite(exactCount)) {
    throw createPricingProjectionError('pricing_count_unavailable');
  }
  return exactCount;
};

export const getPricingFamilySummary = async (context, family, recentCutoff) => {
  const [totalCount, globalFallbackCount, facilityPriceCount, recentCount] = await Promise.all([
    getPricingFamilyExactCount(context, family),
    getPricingFamilyExactCount(context, family, { scope: 'global' }),
    getPricingFamilyExactCount(context, family, { scope: 'override' }),
    getPricingFamilyExactCount(context, family, { updatedAfter: recentCutoff }),
  ]);

  return { family, totalCount, globalFallbackCount, facilityPriceCount, recentCount };
};

export const loadPricingFamilyPrefix = async ({
  context,
  family,
  scope,
  sortDirection,
  prefixSize,
  exactScopedCount,
}) => {
  const expectedCount = Math.min(exactScopedCount, prefixSize);
  if (expectedCount === 0) return [];

  const rows = [];
  for (let offset = 0; offset < expectedCount; offset += PRICING_QUERY_CHUNK_SIZE) {
    const end = Math.min(offset + PRICING_QUERY_CHUNK_SIZE, expectedCount) - 1;
    let query = buildPricingFamilyQuery({
      ...context,
      family,
      scope,
      select: '*',
    });
    query = query
      .order('updated_at', { ascending: sortDirection === 'asc', nullsFirst: false })
      .order('id', { ascending: true })
      .range(offset, end);

    const { data, error } = await query;
    if (error) throw error;
    const chunk = Array.isArray(data) ? data : [];
    if (chunk.length !== end - offset + 1) {
      throw createPricingProjectionError('pricing_page_window_incomplete');
    }
    rows.push(...chunk);
  }

  return rows.map((row) => ({ family, row }));
};

export const hydratePricingHospitals = async (entries, seedHospitals = []) => {
  const hospitalMap = new Map(seedHospitals.map((hospital) => [hospital.id, hospital]));
  const missingIds = Array.from(new Set(
    entries.map((entry) => entry.row?.hospital_id).filter((id) => id && !hospitalMap.has(id)),
  ));

  if (missingIds.length === 0) {
    return { hospitalMap, complete: true, unresolvedCount: 0 };
  }

  const { data, error } = await supabase
    .from('hospitals')
    .select('id, organization_id, name')
    .in('id', missingIds);
  if (error) throw error;

  (data || []).forEach((hospital) => hospitalMap.set(hospital.id, hospital));
  const unresolvedCount = missingIds.filter((id) => !hospitalMap.has(id)).length;
  if (unresolvedCount > 0) {
    throw createPricingProjectionError('pricing_facility_hydration_incomplete');
  }
  return { hospitalMap, complete: unresolvedCount === 0, unresolvedCount };
};
