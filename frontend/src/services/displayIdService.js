import { supabase } from '../lib/supabase';


/**
 * Fluid Display ID Service (v2.0)
 * Handles lookup and validation of human-readable IDs without a mapping table.
 */

export const ID_PREFIXES = {
    USER: 'USR',
    ORGANIZATION: 'ORG',
    HOSPITAL: 'HSP',
    DOCTOR: 'DOC',
    AMBULANCE: 'AMB',
    REQUEST: 'REQ',
    VISIT: 'VIST',
    PAYMENT: 'PAY',
    NOTIFICATION: 'NTF'
};

/**
 * Check if a string looks like a valid display ID
 */
export function isDisplayId(value) {
    if (!value || typeof value !== 'string') return false;
    const pattern = /^(USR|ORG|HSP|DOC|AMB|REQ|VIST|PAY|NTF)-[A-F0-9]{6}$/i;
    return pattern.test(value);
}

/**
 * Resolve a display ID to a UUID via virtual lookup
 */
export async function getEntityId(displayId) {
    if (!displayId || !isDisplayId(displayId)) return null;

    try {
        const { data, error } = await supabase.rpc('get_entity_id', {
            p_display_id: displayId.toUpperCase()
        });

        if (error) {
            console.error('[DisplayID] Resolution Error:', error);
            return null;
        }
        return data;
    } catch (error) {
        return null;
    }
}

/**
 * Passive resolution: Pass UUID through or resolve Display ID
 */
export async function resolveEntityId(idOrDisplayId) {
    if (!idOrDisplayId) return null;
    if (isDisplayId(idOrDisplayId)) {
        return await getEntityId(idOrDisplayId);
    }
    return idOrDisplayId;
}

/**
 * Get Display ID for a profile directly
 */
export async function getProfileDisplayId(userId) {
    const { data } = await supabase
        .from('profiles')
        .select('display_id')
        .eq('id', userId)
        .single();
    return data?.display_id;
}

/**
 * Universal getDisplayId (Alias for getProfileDisplayId to match app usage)
 */
export const getDisplayId = getProfileDisplayId;

/**
 * Bulk resolve display IDs for a list of UUIDs
 * Note: Currently optimized for Hospitals/Orgs based on usage.
 * @param {string[]} ids - Array of UUIDs
 * @returns {Promise<Map>} Map of UUID -> Display ID
 */
export async function getDisplayIds(ids) {
    if (!ids || ids.length === 0) return new Map();

    // De-duplicate IDs
    const uniqueIds = [...new Set(ids)];

    // Query 'hospitals' first since this is primarily used by OrgVerificationService
    const { data, error } = await supabase
        .from('hospitals')
        .select('id, display_id')
        .in('id', uniqueIds);

    if (error) {
        console.error('[DisplayID] Bulk fetch error:', error);
        return new Map();
    }

    const idMap = new Map();
    data?.forEach(item => {
        if (item.display_id) {
            idMap.set(item.id, item.display_id);
        }
    });

    return idMap;
}
