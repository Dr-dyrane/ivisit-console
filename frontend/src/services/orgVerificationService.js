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

const TABLE_NAME = 'hospitals';

export async function getOnboardingCorrectionDraft(organizationId) {
    const [{ data: organization, error: organizationError }, { data: claims, error: claimsError }] =
        await Promise.all([
            supabase
                .from('organizations')
                .select('id,name,organization_type,registration_number,contact_email,contact_phone,address,city,state')
                .eq('id', organizationId)
                .single(),
            supabase
                .from('organization_facility_claims')
                .select('id,facility_id,status,claim_note,created_at')
                .eq('organization_id', organizationId)
                .order('created_at', { ascending: false })
                .limit(1),
        ]);
    if (organizationError) throw organizationError;
    if (claimsError) throw claimsError;

    return {
        organization,
        claim: claims?.[0] || null,
    };
}

const readFacilityVerificationStats = async ({ recentPendingSince = null } = {}) => {
    const queries = [
        supabase.from(TABLE_NAME).select('id', { count: 'exact', head: true }),
        supabase.from(TABLE_NAME).select('id', { count: 'exact', head: true }).eq('verification_status', 'pending'),
        supabase.from(TABLE_NAME).select('id', { count: 'exact', head: true }).eq('verification_status', 'verified'),
        supabase.from(TABLE_NAME).select('id', { count: 'exact', head: true }).eq('verification_status', 'rejected'),
    ];
    if (recentPendingSince) {
        queries.push(
            supabase
                .from(TABLE_NAME)
                .select('id', { count: 'exact', head: true })
                .eq('verification_status', 'pending')
                .gte('created_at', recentPendingSince)
        );
    }

    const results = await Promise.all(queries);
    const failed = results.find((result) => result.error);
    if (failed?.error) throw failed.error;

    return {
        total: results[0].count || 0,
        pending: results[1].count || 0,
        verified: results[2].count || 0,
        approved: results[2].count || 0,
        rejected: results[3].count || 0,
        ...(recentPendingSince ? { recentPending: results[4].count || 0 } : {}),
    };
};

const enrichOnboardingReview = async (facilities = []) => {
    if (!facilities.length) return facilities;

    const facilityIds = facilities.map((facility) => facility.id);
    const { data: claims, error: claimsError } = await supabase
        .from('organization_facility_claims')
        .select('*')
        .in('facility_id', facilityIds)
        .order('created_at', { ascending: false });
    if (claimsError) throw claimsError;

    const claimByFacility = new Map();
    (claims || []).forEach((claim) => {
        if (!claimByFacility.has(claim.facility_id)) claimByFacility.set(claim.facility_id, claim);
    });

    const organizationIds = [...new Set(facilities
        .map((facility) => (
            facility.organization_id || claimByFacility.get(facility.id)?.organization_id
        ))
        .filter(Boolean))];

    if (!organizationIds.length) {
        return facilities.map((facility) => ({
            ...facility,
            onboarding_organization: null,
            facility_claim: claimByFacility.get(facility.id) || null,
            verification_documents: [],
        }));
    }

    const [{ data: organizations, error: organizationsError }, { data: evidence, error: evidenceError }] =
        await Promise.all([
            supabase
                .from('organizations')
                .select('id, display_id, name, organization_type, registration_number, contact_email, contact_phone, address, city, state, verification_status, rejection_reason, verified_at, verified_by, created_at')
                .in('id', organizationIds),
            supabase
                .from('organization_verification_documents')
                .select('id, organization_id, facility_id, facility_claim_id, document_type, original_name, mime_type, size_bytes, review_status, reviewed_at, reviewed_by, rejection_reason, created_at')
                .in('organization_id', organizationIds)
                .order('created_at', { ascending: true }),
        ]);

    if (organizationsError) throw organizationsError;
    if (evidenceError) throw evidenceError;

    const organizationById = new Map((organizations || []).map((organization) => [organization.id, organization]));
    return facilities.map((facility) => {
        const claim = claimByFacility.get(facility.id) || null;
        const organizationId = facility.organization_id || claim?.organization_id || null;
        return {
            ...facility,
            onboarding_organization: organizationById.get(organizationId) || null,
            facility_claim: claim,
            verification_documents: (evidence || []).filter((document) => (
                document.organization_id === organizationId
                && (
                    document.facility_id === facility.id
                    || document.facility_claim_id === claim?.id
                )
            )),
        };
    });
};

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
        let enrichedData = await enrichOnboardingReview(data || []);
        if (enrichedData.length > 0) {
            const orgIds = enrichedData.map(org => org.id);
            const displayIds = await getDisplayIds(orgIds, { quiet: filters.quiet });
            enrichedData = enrichedData.map(org => ({
                ...org,
                display_id: displayIds.get(org.id) || null
            }));
        }

        const stats = await readFacilityVerificationStats();

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
        // direct write RLS policy; a raw .update() is silently denied). Reuses the
        // update_hospital_by_admin RPC, which now preserves arrays on omitted keys
        // (COALESCE), so no client-side array merge is needed.
        const newStatus = approved ? 'verified' : 'rejected';
        const payload = {
            verification_status: newStatus,
            verified: approved // Keep boolean in sync
        };
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

export async function reviewOrganizationEvidence(documentId, decision, note = '') {
    const { data, error } = await supabase.rpc('review_organization_verification_document', {
        p_document_id: documentId,
        p_decision: decision,
        p_note: note || null,
    });
    if (error) throw error;
    if (!data?.success) throw new Error('Evidence review was not reflected.');
    return data;
}

export async function reviewFacilityClaim(claimId, decision, note = '') {
    const { data, error } = await supabase.rpc('review_console_facility_claim', {
        p_claim_id: claimId,
        p_decision: decision,
        p_note: note || null,
    });
    if (error) throw error;
    if (!data?.success) throw new Error('Facility claim review was not reflected.');
    return data;
}

export async function reviewOnboardingOrganization(organizationId, decision, note = '') {
    const { data, error } = await supabase.rpc('review_console_organization', {
        p_organization_id: organizationId,
        p_decision: decision,
        p_note: note || null,
    });
    if (error) throw error;
    if (!data?.success) throw new Error('Organization review was not reflected.');
    return data;
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

        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const stats = await readFacilityVerificationStats({
            recentPendingSince: weekAgo.toISOString(),
        });

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
