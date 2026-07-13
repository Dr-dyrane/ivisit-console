import { supabase } from '../lib/supabase';

const PRICING_MUTATION_UNAVAILABLE_REASON = 'Price changes need a selected facility before they can run.';
const USD_CURRENCY = 'USD';

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

const getPricingTableForFamily = (family) => (family === 'service' ? 'service_pricing' : 'room_pricing');

const normalizeSearch = (value = '') => String(value || '').trim().toLowerCase();

const getPricingRowUpdatedAt = (row) => row.updated_at || row.created_at || null;

const sortPricingRows = (a, b, direction = 'desc') => {
    const dateA = new Date(getPricingRowUpdatedAt(a) || 0).getTime();
    const dateB = new Date(getPricingRowUpdatedAt(b) || 0).getTime();
    return direction === 'asc' ? dateA - dateB : dateB - dateA;
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

const matchesPricingSearch = (row, searchTerm) => {
    if (!searchTerm) return true;
    return [
        row.name,
        row.type,
        row.facilityName,
        row.sourceLabel,
    ].some((value) => normalizeSearch(value).includes(searchTerm));
};

const matchesPricingScope = (row, scope = 'all') => {
    if (scope === 'global') return !row.hospitalId;
    if (scope === 'override') return Boolean(row.hospitalId);
    return true;
};

const buildPricingSummary = (rows) => {
    const totalAmount = rows.reduce((sum, row) => sum + row.amount, 0);
    const recentCutoff = Date.now() - (30 * 24 * 60 * 60 * 1000);

    return {
        totalCount: rows.length,
        globalFallbackCount: rows.filter((row) => !row.hospitalId).length,
        facilityPriceCount: rows.filter((row) => Boolean(row.hospitalId)).length,
        averageAmount: rows.length > 0 ? totalAmount / rows.length : null,
        recentCount: rows.filter((row) => {
            const updatedAt = new Date(row.updatedAt || 0).getTime();
            return Number.isFinite(updatedAt) && updatedAt >= recentCutoff;
        }).length,
        basis: 'current_filter'
    };
};

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

    let hospitalsQuery = supabase
        .from('hospitals')
        .select('id, organization_id, name');
    if (organizationId) hospitalsQuery = hospitalsQuery.eq('organization_id', organizationId);

    const { data: hospitals, error: hospitalsError } = await hospitalsQuery;

    if (hospitalsError) throw hospitalsError;

    const hospitalMap = new Map((hospitals || []).map((hospital) => [hospital.id, hospital]));
    const hospitalIds = Array.from(hospitalMap.keys());

    const rowGroups = await Promise.all(requestedFamilies.map(async (requestedFamily) => {
        const table = getPricingTableForFamily(requestedFamily);
        let pricingQuery = supabase
            .from(table)
            .select('*');
        if (organizationId) {
            pricingQuery = hospitalIds.length > 0
                ? pricingQuery.or(`hospital_id.is.null,hospital_id.in.(${hospitalIds.join(',')})`)
                : pricingQuery.is('hospital_id', null);
        }
        const { data, error } = await pricingQuery.order('updated_at', { ascending: false });

        if (error) throw error;

        return (data || []).map((row) => normalizePricingRow(row, requestedFamily, hospitalMap));
    }));

    const allRows = rowGroups.flat();
    const matchingRows = allRows
        .filter((row) => !organizationId || !row.hospitalId || row.organizationId === organizationId)
        .filter((row) => matchesPricingSearch(row, searchTerm))
        .sort((a, b) => sortPricingRows(a, b, sortDirection));
    const scopedRows = matchingRows.filter((row) => matchesPricingScope(row, scope));

    const start = (safePage - 1) * safePageSize;
    const rows = scopedRows.slice(start, start + safePageSize);

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
        totalCount: scopedRows.length,
        summary: buildPricingSummary(matchingRows),
        readState: {
            basis: 'current_filter',
            source: 'service_pricing_room_pricing_projection',
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
