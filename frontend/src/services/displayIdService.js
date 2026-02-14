/**
 * Display ID Service
 * 
 * @description
 * Converts between UUIDs and human-readable iVisit IDs:
 * - IVP-XXXXXX = iVisit Patient
 * - PRV-XXXXXX = Provider
 * - ORG-XXXXXX = Organization/Hospital
 * - AMB-XXX    = Ambulance (uses call_sign field directly)
 * 
 * @usage
 * // Get UUID from display ID for filtering
 * const uuid = await getEntityId('IVP-000123');
 * 
 * // Get display ID for showing to users
 * const displayId = await getDisplayId(user.id);
 * 
 * @see migrations/20260202180000_id_beautification_system.sql
 */

import { supabase } from '../lib/supabase';

/**
 * Entity type prefixes
 */
export const ID_PREFIXES = {
    PATIENT: 'IVP',
    PROVIDER: 'PRV',
    ADMIN: 'ADM',
    DISPATCHER: 'DSP',
    ORGANIZATION: 'ORG',
    AMBULANCE: 'AMB', // Uses call_sign field directly
};

/**
 * Get entity UUID from display ID
 * @param {string} displayId - Human-readable ID (e.g., IVP-000001)
 * @returns {Promise<string|null>} Entity UUID or null if not found
 * 
 * @example
 * const patientId = await getEntityId('IVP-000123');
 * const visits = await supabase.from('visits').select().eq('user_id', patientId);
 */
export async function getEntityId(displayId) {
    if (!displayId) return null;

    try {
        const { data, error } = await supabase.rpc('get_entity_id', {
            p_display_id: displayId.toUpperCase()
        });

        if (error) {
            console.error('[DisplayID] Error getting entity ID:', error);
            return null;
        }
        return data;
    } catch (error) {
        console.error('[DisplayID] Exception getting entity ID:', error);
        return null;
    }
}

/**
 * Get display ID from entity UUID
 * @param {string} entityId - Entity UUID
 * @returns {Promise<string|null>} Display ID or null if not found
 * 
 * @example
 * const displayId = await getDisplayId(user.id);
 * // Returns: 'IVP-000123'
 */
export async function getDisplayId(entityId) {
    if (!entityId) return null;

    try {
        const { data, error } = await supabase.rpc('get_display_id', {
            p_entity_id: entityId
        });

        if (error) {
            console.error('[DisplayID] Error getting display ID:', error);
            return await getDisplayIdFromProfile(entityId);
        }

        // [BUG-FIX] Robustly handle different return formats (scalar vs array of objects)
        if (data) {
            if (Array.isArray(data) && data.length > 0) {
                return data[0].display_id || data[0];
            }
            if (typeof data === 'object' && data.display_id) {
                return data.display_id;
            }
            return data;
        }

        return await getDisplayIdFromProfile(entityId);
    } catch (error) {
        console.error('[DisplayID] Exception getting display ID:', error);
        return await getDisplayIdFromProfile(entityId);
    }
}

/**
 * Fallback to look up display_id column from profiles table
 * @private
 */
async function getDisplayIdFromProfile(userId) {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('display_id')
            .eq('id', userId)
            .single();

        if (error || !data) return null;
        return data.display_id;
    } catch (e) {
        return null;
    }
}

/**
 * Batch get display IDs for multiple entities
 * @param {string[]} entityIds - Array of entity UUIDs
 * @returns {Promise<Map<string, string>>} Map of entityId → displayId
 * 
 * @example
 * const displayIds = await getDisplayIds([user1.id, user2.id]);
 * const user1DisplayId = displayIds.get(user1.id); // 'IVP-000001'
 */
export async function getDisplayIds(entityIds) {
    if (!entityIds?.length) return new Map();

    try {
        const { data, error } = await supabase.rpc('get_display_ids', {
            p_entity_ids: entityIds
        });

        if (error) {
            console.error('[DisplayID] Error batch getting display IDs:', error);
            return new Map();
        }

        // Convert to Map for easy lookup
        const map = new Map();
        (data || []).forEach(row => {
            map.set(row.entity_id, row.display_id);
        });
        return map;
    } catch (error) {
        console.error('[DisplayID] Exception batch getting display IDs:', error);
        return new Map();
    }
}

/**
 * Parse display ID to determine entity type
 * @param {string} displayId - Human-readable ID
 * @returns {'patient' | 'provider' | 'hospital' | 'ambulance' | null}
 * 
 * @example
 * parseDisplayIdType('IVP-000123'); // 'patient'
 * parseDisplayIdType('ORG-000001'); // 'hospital'
 */
export function parseDisplayIdType(displayId) {
    if (!displayId) return null;

    const prefix = displayId.split('-')[0]?.toUpperCase();

    switch (prefix) {
        case 'IVP': return 'patient';
        case 'PRV': return 'provider';
        case 'ADM': return 'admin';
        case 'DSP': return 'dispatcher';
        case 'ORG': return 'hospital';
        case 'AMB': return 'ambulance';
        default: return null;
    }
}

/**
 * Format display ID with proper casing
 * @param {string} displayId - Raw display ID
 * @returns {string} Formatted display ID
 * 
 * @example
 * formatDisplayId('ivp-000123'); // 'IVP-000123'
 */
export function formatDisplayId(displayId) {
    if (!displayId) return '';
    return displayId.toUpperCase();
}

/**
 * Check if a string looks like a valid display ID
 * @param {string} value - String to check
 * @returns {boolean}
 * 
 * @example
 * isDisplayId('IVP-000123'); // true
 * isDisplayId('some-uuid-here'); // false
 */
export function isDisplayId(value) {
    if (!value) return false;
    const pattern = /^(IVP|PRV|ORG|AMB|ADM|DSP)-\d{3,6}$/i;
    return pattern.test(value);
}

/**
 * Get entity ID from either a display ID or pass through a UUID
 * Useful when input could be either format
 * @param {string} idOrDisplayId - UUID or display ID
 * @returns {Promise<string|null>} Entity UUID
 * 
 * @example
 * // Works with both:
 * await resolveEntityId('IVP-000123'); // Looks up UUID
 * await resolveEntityId('a1b2c3d4-...'); // Returns as-is
 */
export async function resolveEntityId(idOrDisplayId) {
    if (!idOrDisplayId) return null;

    // Check if it's a display ID format
    if (isDisplayId(idOrDisplayId)) {
        return await getEntityId(idOrDisplayId);
    }

    // Assume it's already a UUID
    return idOrDisplayId;
}
