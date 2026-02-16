/**
 * Organizations Service
 * Handles all Supabase queries for organizations table
 */

import { supabase } from '../lib/supabase';
import { getCurrentUser } from './authService';

const TABLE_NAME = 'organizations';

/**
 * Get all organizations
 */
/**
 * Fetches all organizations and manually maps their respective wallet balances.
 * 
 * NOTE (2026-02-16): Fixed unsuccessful natural join mapping by fetching 
 * organization_wallets separately and mapping by organization_id in JS.
 * This ensures data integrity even when Supabase relationship detection fluctuates.
 */
export async function getOrganizations() {
    try {
        const [orgsRes, walletsRes] = await Promise.all([
            supabase.from(TABLE_NAME).select('*').order('name', { ascending: true }),
            supabase.from('organization_wallets').select('*')
        ]);

        if (orgsRes.error) throw orgsRes.error;
        if (walletsRes.error) throw walletsRes.error;

        const walletsMap = (walletsRes.data || []).reduce((acc, w) => {
            acc[w.organization_id] = w.balance;
            return acc;
        }, {});

        return (orgsRes.data || []).map(org => ({
            ...org,
            wallet_balance: walletsMap[org.id] || 0
        }));
    } catch (error) {
        console.error('Error fetching organizations:', error);
        throw error;
    }
}

/**
 * Get single organization by ID
 */
export async function getOrganization(orgId) {
    try {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select('*')
            .eq('id', orgId)
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error(`Error fetching organization ${orgId}:`, error);
        throw error;
    }
}

/**
 * Create or update organization
 */
export async function saveOrganization(org) {
    try {
        const isUpdate = !!org.id;
        const payload = {
            name: org.name,
            stripe_account_id: org.stripe_account_id,
            ivisit_fee_percentage: org.ivisit_fee_percentage,
            fee_tier: org.fee_tier,
            contact_email: org.contact_email,
            is_active: org.is_active !== undefined ? org.is_active : true,
            updated_at: new Date().toISOString(),
        };

        if (!isUpdate) {
            payload.created_at = new Date().toISOString();
        }

        const query = isUpdate
            ? supabase.from(TABLE_NAME).update(payload).eq('id', org.id)
            : supabase.from(TABLE_NAME).insert([payload]);

        const { data, error } = await query.select().single();
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error saving organization:', error);
        throw error;
    }
}

/**
 * Delete organization
 */
export async function deleteOrganization(orgId) {
    try {
        const { error } = await supabase
            .from(TABLE_NAME)
            .delete()
            .eq('id', orgId);

        if (error) throw error;
    } catch (error) {
        console.error(`Error deleting organization ${orgId}:`, error);
        throw error;
    }
}
