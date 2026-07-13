import { supabase } from '../lib/supabase';

const PRICING_MUTATION_UNAVAILABLE_REASON = 'Price changes need a selected facility before they can run.';
const PRICING_PROJECTION_UNAVAILABLE_MESSAGE = 'Pricing rules could not be verified for this scope.';
const USD_CURRENCY = 'USD';
const PRICING_QUERY_CHUNK_SIZE = 500;
const PRICING_HOSPITAL_FILTER_LIMIT = 150;
const PRICING_RECENT_DAYS = 30;

const PRICING_FAMILY_CONFIG = Object.freeze({
    service: {
        table: 'service_pricing',
        searchColumns: ['service_name', 'service_type', 'description'],
    },
    room: {
        table: 'room_pricing',
        searchColumns: ['room_name', 'room_type', 'description'],
    },
});

const normalizePricingFamily = (family = 'all') => {
    if (family === 'services' || family === 'service') return 'services';
    if (family === 'rooms' || family === 'room') return 'rooms';
    return 'all';
};

const getFamiliesForPage = (family = 'all') => {
    const normalizedFamily = normalizePricingFamily(family);
    if (normalizedFamily === 'services') return ['service'];
    if (normalizedFamily === 'rooms') return ['room'];
    return ['service', 'room'];
};

const getPricingTableForFamily = (family) => PRICING_FAMILY_CONFIG[family]?.table;

const normalizeSearch = (value = '') => String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const getPricingRowUpdatedAt = (row) => row.updated_at || row.created_at || null;

const sortPricingRows = (a, b, direction = 'desc') => {
    const dateA = a?.updated_at ? new Date(a.updated_at).getTime() : null;
    const dateB = b?.updated_at ? new Date(b.updated_at).getTime() : null;
    const validA = Number.isFinite(dateA);
    const validB = Number.isFinite(dateB);

    if (validA && validB && dateA !== dateB) {
        return direction === 'asc' ? dateA - dateB : dateB - dateA;
    }
    if (validA !== validB) return validA ? -1 : 1;
    return String(a?.id || '').localeCompare(String(b?.id || ''));
};

const normalizePricingRow = (row, family, hospitalMap) => {
    const hospitalId = row.hospital_id || null;
    const hospital = hospitalId ? hospitalMap.get(hospitalId) : null;
    const organizationId = hospital?.organization_id || null;
    const isService = family === 'service';
    const amount = Number(isService ? row.base_price : row.price_per_night) || 0;
    const name = isService ? row.service_name : row.room_name;
    const type = isService ? row.service_type : row.room_type;
    const sourceLabel = hospitalId ? 'facility price' : 'platform fallback';

    return {
        ...row,
        _pricingType: family,
        family,
        hospitalId,
        hospital_id: hospitalId,
        organizationId,
        organization_id: organizationId,
        facilityName: hospital?.name || null,
        sourceLabel,
        source_label: sourceLabel,
        name,
        type,
        amount,
        currency: USD_CURRENCY,
        active: null,
        updatedAt: getPricingRowUpdatedAt(row),
        unit: isService ? 'Unit' : 'Night'
    };
};

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

const loadOrganizationHospitals = async (organizationId) => {
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

const loadFacilitySearchHospitals = async (searchTerm, organizationHospitals = null) => {
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

const getPricingFamilySummary = async (context, family, recentCutoff) => {
    const [totalCount, globalFallbackCount, facilityPriceCount, recentCount] = await Promise.all([
        getPricingFamilyExactCount(context, family),
        getPricingFamilyExactCount(context, family, { scope: 'global' }),
        getPricingFamilyExactCount(context, family, { scope: 'override' }),
        getPricingFamilyExactCount(context, family, { updatedAfter: recentCutoff }),
    ]);

    return { family, totalCount, globalFallbackCount, facilityPriceCount, recentCount };
};

const getScopedFamilyCount = (summary, scope) => {
    if (scope === 'global') return summary.globalFallbackCount;
    if (scope === 'override') return summary.facilityPriceCount;
    return summary.totalCount;
};

const loadPricingFamilyPrefix = async ({
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

const hydratePricingHospitals = async (entries, seedHospitals = []) => {
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

const combinePricingSummaries = (familySummaries) => familySummaries.reduce((summary, family) => ({
    totalCount: summary.totalCount + family.totalCount,
    globalFallbackCount: summary.globalFallbackCount + family.globalFallbackCount,
    facilityPriceCount: summary.facilityPriceCount + family.facilityPriceCount,
    recentCount: summary.recentCount + family.recentCount,
}), {
    totalCount: 0,
    globalFallbackCount: 0,
    facilityPriceCount: 0,
    recentCount: 0,
});

export const getPricingPageData = async ({
    family = 'all',
    organizationId = null,
    search = '',
    scope = 'all',
    sortDirection = 'desc',
    page = 1,
    pageSize = 12,
} = {}) => {
    const requestedFamilies = getFamiliesForPage(family);
    const searchTerm = normalizeSearch(search);
    const safePage = Math.max(1, Number(page) || 1);
    const safePageSize = Math.max(1, Number(pageSize) || 12);
    const start = (safePage - 1) * safePageSize;
    const prefixSize = start + safePageSize;
    const organizationHospitals = await loadOrganizationHospitals(organizationId);
    const facilitySearchHospitals = await loadFacilitySearchHospitals(
        searchTerm,
        organizationId ? organizationHospitals : null,
    );
    const hospitalIds = organizationHospitals.map((hospital) => hospital.id);
    const facilitySearchIds = facilitySearchHospitals.map((hospital) => hospital.id);
    const context = {
        organizationId,
        hospitalIds,
        searchTerm,
        facilitySearchIds,
    };
    const recentCutoff = new Date(Date.now() - (PRICING_RECENT_DAYS * 86400000)).toISOString();
    const familySummaries = await Promise.all(
        requestedFamilies.map((requestedFamily) => (
            getPricingFamilySummary(context, requestedFamily, recentCutoff)
        )),
    );
    const combinedSummary = combinePricingSummaries(familySummaries);
    const totalCount = familySummaries.reduce(
        (total, familySummary) => total + getScopedFamilyCount(familySummary, scope),
        0,
    );
    const rowGroups = await Promise.all(familySummaries.map((familySummary) => (
        loadPricingFamilyPrefix({
            context,
            family: familySummary.family,
            scope,
            sortDirection,
            prefixSize,
            exactScopedCount: getScopedFamilyCount(familySummary, scope),
        })
    )));
    const pageEntries = rowGroups
        .flat()
        .sort((a, b) => sortPricingRows(a.row, b.row, sortDirection))
        .slice(start, start + safePageSize);
    const seedHospitals = [...organizationHospitals, ...facilitySearchHospitals];
    const hospitalHydration = await hydratePricingHospitals(pageEntries, seedHospitals);
    const rows = pageEntries.map(({ row, family: rowFamily }) => (
        normalizePricingRow(row, rowFamily, hospitalHydration.hospitalMap)
    ));

    return {
        actor: {
            organizationId: organizationId || null,
        },
        scope: {
            mode: organizationId ? 'organization_summary' : 'platform_default',
            hospitalId: null,
            organizationId: organizationId || null,
            editable: false,
            reason: PRICING_MUTATION_UNAVAILABLE_REASON,
        },
        rows,
        totalCount,
        summary: {
            ...combinedSummary,
            averageAmount: null,
            averageAvailable: false,
            exactCounts: true,
            basis: 'exact_server_counts',
            recentBasis: 'updated_at',
        },
        readState: {
            basis: 'exact_server_counts',
            source: 'service_pricing_room_pricing_projection',
            complete: true,
            pagination: 'server_windowed_union',
            average: 'unavailable_without_aggregate_receiver',
            facilityHydration: hospitalHydration.complete ? 'complete' : 'partial',
            unresolvedFacilityCount: hospitalHydration.unresolvedCount,
            boundedBy: {
                family: normalizePricingFamily(family),
                scope,
                search: searchTerm,
                page: safePage,
                pageSize: safePageSize,
            },
        },
    };
};

/**
 * Pricing Service
 * Handles service and room pricing operations via RPCs
 */

export const getPricing = async (type = 'services', organizationId = null) => {
    const table = type === 'services' ? 'service_pricing' : 'room_pricing';
    const [{ data: hospitals, error: hospitalsError }, { data, error }] = await Promise.all([
        supabase.from('hospitals').select('id, organization_id'),
        supabase.from(table).select('*').order('updated_at', { ascending: false })
    ]);

    if (hospitalsError) throw hospitalsError;
    if (error) throw error;

    const hospitalOrgMap = new Map((hospitals || []).map(h => [h.id, h.organization_id]));
    let normalized = (data || []).map(item => ({
        ...item,
        organization_id: item.organization_id ?? (item.hospital_id ? hospitalOrgMap.get(item.hospital_id) || null : null)
    }));

    if (organizationId) {
        // Return items that are global OR mapped to this organization (hospital-scoped pricing)
        normalized = normalized.filter(item => !item.hospital_id || item.organization_id === organizationId);
    }

    return normalized;
};

const resolveHospitalIdForPricing = async (item) => {
    if (item.hospital_id) return item.hospital_id;

    if (!item.organization_id) return null; // global pricing

    const { data, error } = await supabase
        .from('hospitals')
        .select('id')
        .eq('organization_id', item.organization_id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

    if (error) throw error;
    if (!data?.id) {
        throw new Error('No hospital found for the selected organization. Create a hospital first to manage organization pricing.');
    }

    return data.id;
};

export const saveServicePricing = async (item) => {
    const hospitalId = await resolveHospitalIdForPricing(item);
    const payload = {
        id: item.id || null,
        hospital_id: hospitalId,
        service_type: item.service_type || item.category,
        service_name: item.service_name,
        base_price: item.base_price,
        description: item.description ?? item.metadata?.description ?? null
    };

    const { data, error } = await supabase.rpc('upsert_service_pricing', {
        payload
    });

    if (error) throw error;
    if (data && !data.success) throw new Error(data.error);
    return data;
};

export const deleteServicePricing = async (id) => {
    const { data, error } = await supabase.rpc('delete_service_pricing', {
        target_id: id
    });

    if (error) throw error;
    if (data && !data.success) throw new Error(data.error);
    return data;
};

export const saveRoomPricing = async (item) => {
    const hospitalId = await resolveHospitalIdForPricing(item);
    const payload = {
        id: item.id || null,
        hospital_id: hospitalId,
        room_name: item.room_name,
        room_type: item.room_type,
        price_per_night: item.price_per_night,
        description: item.description || null
    };

    const { data, error } = await supabase.rpc('upsert_room_pricing', {
        payload
    });

    if (error) throw error;
    if (data && !data.success) throw new Error(data.error);
    return data;
};

export const deleteRoomPricing = async (id) => {
    const { data, error } = await supabase.rpc('delete_room_pricing', {
        target_id: id
    });

    if (error) throw error;
    if (data && !data.success) throw new Error(data.error);
    return data;
};
