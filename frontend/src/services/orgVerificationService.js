/**
 * Facility Verification Service
 * 
 * @description
 * Handles verification of facilities (hospitals, clinics, etc.) that register
 * through onboarding. Uses hospitals.verification_status column.
 * 
 * Verification Flow:
 * 1. Facility registers via onboarding -> verification_status = 'pending'
 * 2. Admin reviews in Approvals -> approves/rejects
 * 3. Status updates to 'verified' or 'rejected'
 * 
 * @see migrations/20260202180000_id_beautification_system.sql
 */

import { supabase } from '../lib/supabase';
import { getCurrentUser } from './authService';
import { isAdmin, AuthorizationError, logAuthorizationEvent, handleServiceError } from './rbacPatterns';
import { getDisplayIds } from './displayIdService';
import { mergePreservedHospitalArrays } from './hospitalImportService';

const TABLE_NAME = 'hospitals';

/**
 * Get facility verification queue
 * @param {Object} filters - status, search, page, limit
 * @returns {Promise<Object>} Queue data with pagination
 */
export async function getOrgVerificationQueue(filters = {}) {
    try {
        const user = await getCurrentUser();
        const role = user?.role || 'viewer';

        // Admin and org_admin can read Approvals. Mutations stay admin-only.
        if (!['admin', 'org_admin'].includes(role)) {
            throw new AuthorizationError(
                'Admin or Org Admin access required for facility approvals',
                'org_verification',
                'getQueue'
            );
        }

        const {
            status = 'pending', // pending, verified, rejected, all
            search = '',
            page = 1,
            limit = 12,
            orderBy = 'created_at',
            orderDirection = 'asc' // Show oldest first for pending
        } = filters;

        // Build query
        let query = supabase
            .from(TABLE_NAME)
            .select('*', { count: 'exact' });

        // Apply status filter. UI says approved; storage uses verified.
        const normalizedStatus = status === 'approved' ? 'verified' : status;
        if (normalizedStatus !== 'all') {
            query = query.eq('verification_status', normalizedStatus);
        }

        // Apply search filter
        if (search) {
            query = query.or(`name.ilike.%${search}%,address.ilike.%${search}%`);
        }

        // Apply ordering
        query = query.order(orderBy, { ascending: orderDirection === 'asc' });

        // Apply pagination
        const offset = (page - 1) * limit;
        query = query.range(offset, offset + limit - 1);

        const { data, error, count } = await query;
        if (error) throw error;

        // Enrich with display IDs (ORG-XXXXXX)
        let enrichedData = data || [];
        if (enrichedData.length > 0) {
            const orgIds = enrichedData.map(org => org.id);
            const displayIds = await getDisplayIds(orgIds, { quiet: filters.quiet });
            enrichedData = enrichedData.map(org => ({
                ...org,
                display_id: displayIds.get(org.id) || null
            }));
        }

        // Get stats
        const { data: allOrgs, error: statsError } = await supabase
            .from(TABLE_NAME)
            .select('verification_status');

        if (statsError) throw statsError;

        const stats = {
            pending: allOrgs?.filter(o => o.verification_status === 'pending').length || 0,
            verified: allOrgs?.filter(o => o.verification_status === 'verified').length || 0,
            rejected: allOrgs?.filter(o => o.verification_status === 'rejected').length || 0,
            total: allOrgs?.length || 0
        };

        logAuthorizationEvent('org_verification', 'getQueue', null, true);

        return {
            data: enrichedData,
            stats,
            pagination: {
                page,
                limit,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / limit)
            }
        };

    } catch (error) {
        return handleServiceError(error, 'org_verification', 'getQueue');
    }
}

/**
 * Verify or reject a facility
 * @param {string} hospitalId - Facility/Hospital ID
 * @param {boolean} approved - true = verify, false = reject
 * @param {string} notes - Optional admin notes
 * @returns {Promise<Object>} Updated organization
 */
export async function verifyOrganization(hospitalId, approved, notes = '') {
    try {
        // Admin check
        const adminCheck = await isAdmin();
        if (!adminCheck) {
            throw new AuthorizationError(
                'Admin access required for organization verification',
                'org_verification',
                'verify'
            );
        }

        // Get org info for audit
        const { data: org, error: fetchError } = await supabase
            .from(TABLE_NAME)
            .select('name, address, type')
            .eq('id', hospitalId)
            .maybeSingle();

        if (fetchError) throw fetchError;
        if (!org) throw new Error('Facility not found');

        // Update verification status via SECURITY DEFINER RPC (hospitals has no
        // direct write RLS policy; a raw .update() is silently denied). Reuses
        // the same update_hospital_by_admin RPC hospitalsService.updateHospital uses.
        //
        // The RPC overwrites specialties/service_types/features unconditionally
        // (blanking them for any absent key), so merge the row's current arrays
        // into this narrow payload first to preserve them.
        const newStatus = approved ? 'verified' : 'rejected';
        const payload = await mergePreservedHospitalArrays(hospitalId, {
            verification_status: newStatus,
            verified: approved // Keep boolean in sync
        });
        const { data: rpcResult, error } = await supabase.rpc('update_hospital_by_admin', {
            target_hospital_id: hospitalId,
            payload
        });

        if (error) throw error;
        if (rpcResult && rpcResult.success === false) {
            throw new Error(rpcResult.error || 'Facility verification failed');
        }

        // Re-read the updated row so callers keep receiving the facility object
        // (the RPC returns { success, id }, not the full row).
        const { data, error: readError } = await supabase
            .from(TABLE_NAME)
            .select()
            .eq('id', hospitalId)
            .maybeSingle();

        if (readError) throw readError;

        logAuthorizationEvent(
            'org_verification',
            'verify',
            hospitalId,
            true,
            `${approved ? 'Approved' : 'Rejected'} facility: ${org.name}${notes ? ` - ${notes}` : ''}`
        );

        return data;

    } catch (error) {
        return handleServiceError(error, 'org_verification', 'verify');
    }
}

/**
 * Get facility verification stats
 * @returns {Promise<Object>} Stats object
 */
export async function getOrgVerificationStats() {
    try {
        const adminCheck = await isAdmin();
        if (!adminCheck) {
            throw new AuthorizationError(
                'Admin access required for verification stats',
                'org_verification',
                'getStats'
            );
        }

        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select('verification_status, created_at');

        if (error) throw error;

        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        const stats = {
            pending: data?.filter(o => o.verification_status === 'pending').length || 0,
            verified: data?.filter(o => o.verification_status === 'verified').length || 0,
            rejected: data?.filter(o => o.verification_status === 'rejected').length || 0,
            total: data?.length || 0,
            recentPending: data?.filter(o => {
                return o.verification_status === 'pending' &&
                    new Date(o.created_at) > weekAgo;
            }).length || 0
        };

        logAuthorizationEvent('org_verification', 'getStats', null, true);
        return stats;

    } catch (error) {
        return handleServiceError(error, 'org_verification', 'getStats');
    }
}

/**
 * Subscribe to facility verification queue updates
 * @param {Function} callback - Callback for updates
 * @returns {Function} Unsubscribe function
 */
export function subscribeToOrgVerificationQueue(callback) {
    const channel = supabase
        .channel('org_verification_queue')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: TABLE_NAME,
                filter: 'verification_status=eq.pending'
            },
            (payload) => {
                if (payload.new) {
                    callback(payload.new, payload.eventType);
                }
            }
        )
        .subscribe();

    return () => supabase.removeChannel(channel);
}
