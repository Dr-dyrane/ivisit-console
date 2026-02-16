import { supabase } from '../lib/supabase';

/**
 * Pricing Service
 * Handles service and room pricing operations via RPCs
 */

export const getPricing = async (type = 'services', organizationId = null) => {
    const table = type === 'services' ? 'service_pricing' : 'room_pricing';

    let query = supabase.from(table).select('*');

    if (organizationId) {
        // Return items that are global OR specifically for this organization
        query = query.or(`organization_id.eq.${organizationId},and(organization_id.is.null)`);
    }

    const { data, error } = await query.order('updated_at', { ascending: false });

    if (error) throw error;
    return data;
};

export const saveServicePricing = async (item) => {
    const { data, error } = await supabase.rpc('upsert_service_pricing', {
        p_id: item.id || null,
        p_service_name: item.service_name,
        p_base_price: item.base_price,
        p_unit: item.unit,
        p_category: item.category || item.service_type,
        p_organization_id: item.organization_id || null,
        p_metadata: item.metadata || {}
    });

    if (error) throw error;
    if (data && !data.success) throw new Error(data.error);
    return data;
};

export const deleteServicePricing = async (id) => {
    const { data, error } = await supabase.rpc('delete_service_pricing', {
        p_id: id
    });

    if (error) throw error;
    if (data && !data.success) throw new Error(data.error);
    return data;
};

export const saveRoomPricing = async (item) => {
    const { data, error } = await supabase.rpc('upsert_room_pricing', {
        p_id: item.id || null,
        p_room_name: item.room_name,
        p_room_type: item.room_type,
        p_price_per_night: item.price_per_night,
        p_currency: item.currency || 'USD',
        p_description: item.description || null,
        p_organization_id: item.organization_id || null
    });

    if (error) throw error;
    if (data && !data.success) throw new Error(data.error);
    return data;
};

export const deleteRoomPricing = async (id) => {
    const { data, error } = await supabase.rpc('delete_room_pricing', {
        p_id: id
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
