import { supabase } from '../lib/supabase';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DISPLAY_ID_LOOKUP_CHUNK_SIZE = 80;

function normalizeUuidList(ids) {
    if (!Array.isArray(ids)) return [];
    return [...new Set(
        ids
            .map(id => (typeof id === 'string' ? id.trim() : ''))
            .filter(id => UUID_PATTERN.test(id))
    )];
}

function chunkList(items, size) {
    const chunks = [];
    for (let index = 0; index < items.length; index += size) {
        chunks.push(items.slice(index, index + size));
    }
    return chunks;
}


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
export async function getDisplayIds(ids, options = {}) {
    if (!ids || ids.length === 0) return new Map();

    const idMap = new Map();
    const uniqueIds = normalizeUuidList(ids);
    if (uniqueIds.length === 0) return idMap;

    for (const chunk of chunkList(uniqueIds, DISPLAY_ID_LOOKUP_CHUNK_SIZE)) {
        // Query 'hospitals' first since this is primarily used by OrgVerificationService
        const { data, error } = await supabase
            .from('hospitals')
            .select('id, display_id')
            .in('id', chunk);

        if (error) {
            if (options?.quiet) {
                return idMap;
            }
            console.error('[DisplayID] Bulk fetch error:', error);
            return idMap;
        }

        data?.forEach(item => {
            if (item.display_id) {
                idMap.set(item.id, item.display_id);
            }
        });
    }

    return idMap;
}
