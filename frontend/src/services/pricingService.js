import { supabase } from '../lib/supabase';

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

/**
 * For Room Pricing, we don't have an RPC yet, so we use direct table access if allowed
 * or we should create one. For now, let's use direct access if it's simpler or 
 * I should create the RPC for consistency if I have time.
 * The instruction says "implement full CRUD for pricing", and I already added RPC for service_pricing.
 * I'll add one for room_pricing too to be safe.
 */
