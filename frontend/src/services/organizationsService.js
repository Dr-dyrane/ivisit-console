/**
 * Organizations Service
 * Handles all Supabase queries for organizations table
 */

import { supabase } from '../lib/supabase';
import { getCurrentUser } from './authService';
import { isValidUUID } from '../lib/utils';
import { withRetry, withAudit } from './supabaseHelpers';

const TABLE_NAME = 'organizations';
const ORGANIZATION_CREATE_FIELDS = [
    'name',
    'stripe_account_id',
    'ivisit_fee_percentage',
    'fee_tier',
    'contact_email',
    'is_active',
    'created_at',
    'updated_at',
];
const ORGANIZATION_UPDATE_FIELDS = [
    'name',
    'stripe_account_id',
    'ivisit_fee_percentage',
    'fee_tier',
    'contact_email',
    'is_active',
    'updated_at',
];

const toTrimmedOrNull = (value) => {
    if (value === undefined || value === null) return null;
    const text = String(value).trim();
    return text.length > 0 ? text : null;
};

const toFiniteOrNull = (value) => {
    if (value === undefined || value === null || value === '') return null;
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : null;
};

const pruneUndefined = (payload = {}) =>
    Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));

function buildOrganizationPayload(org = {}, { isUpdate = false } = {}) {
    const name = toTrimmedOrNull(org.name);
    if (!name) {
        throw new Error('Organization name is required');
    }

    const payload = {
        name,
        stripe_account_id: toTrimmedOrNull(org.stripe_account_id),
        ivisit_fee_percentage: toFiniteOrNull(org.ivisit_fee_percentage),
        fee_tier: toTrimmedOrNull(org.fee_tier) ?? 'standard',
        contact_email: toTrimmedOrNull(org.contact_email),
        is_active: org.is_active !== undefined ? Boolean(org.is_active) : true,
        updated_at: new Date().toISOString(),
    };

    if (!isUpdate) {
        payload.created_at = new Date().toISOString();
    }

    const allowedFields = new Set(isUpdate ? ORGANIZATION_UPDATE_FIELDS : ORGANIZATION_CREATE_FIELDS);
    return pruneUndefined(
        Object.fromEntries(Object.entries(payload).filter(([field]) => allowedFields.has(field)))
    );
}

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
export async function getOrganizations(filter = {}) {
    try {
        const user = await getCurrentUser();
        // RBAC: Patients should not be calling organizations (Console only)
        if (user?.role === 'patient') {
            return [];
        }

        const [orgsRes, walletsRes] = await withRetry(async () => {
            const [orgsResult, walletsResult] = await Promise.all([
                supabase.from(TABLE_NAME).select('*').order('name', { ascending: true }),
                supabase.from('organization_wallets').select('*')
            ]);

            if (orgsResult.error) throw orgsResult.error;
            if (walletsResult.error) throw walletsResult.error;

            return [orgsResult, walletsResult];
        });

        const walletsMap = (walletsRes.data || []).reduce((acc, w) => {
            acc[w.organization_id] = w;
            return acc;
        }, {});

        // ADOPT-27: carry the wallet row's own currency and freshness alongside the
        // balance; honest null when the organization has no wallet row.
        return (orgsRes.data || []).map(org => {
            const wallet = walletsMap[org.id] || null;
            return {
                ...org,
                wallet_balance: wallet?.balance || 0,
                wallet_currency: wallet?.currency ?? null,
                wallet_updated_at: wallet?.updated_at ?? null,
            };
        });
    } catch (error) {
        if (!filter?.quiet) {
            console.error('Error fetching organizations:', error);
        }
        throw error;
    }
}

/**
 * Complete, bounded organization options for authority-bearing forms.
 * The caller fails closed if the registry outgrows the bounded selector so a
 * partial list is never presented as the full organization registry.
 */
export async function getOrganizationOptions(options = {}) {
    const limit = Math.min(Math.max(Number(options.limit) || 200, 1), 500);
    const { data, count, error } = await withRetry(async () => {
        const result = await supabase
            .from(TABLE_NAME)
            .select('id, name, verification_status, is_active', { count: 'exact' })
            .eq('is_active', true)
            .order('name', { ascending: true })
            .range(0, limit - 1);
        if (result.error) throw result.error;
        return result;
    });

    if (error) throw error;
    if ((count || 0) > limit) {
        throw new Error('The organization registry is too large for this selector. Open an organization record to continue.');
    }

    return data || [];
}

// --- Bounded page projection for the Organizations route (React Query, 2026-07-11) --------
// Unlike getOrganizations (a bare array that callers slice locally), getOrganizationsPage
// returns { data, count, stats } with server-side search/sort/pagination and exact counts.
// Payout readiness spans organizations + organization_wallets, so this source-only pass resolves
// that join in a bounded client projection and fails visibly above the ceiling. A backend view/RPC
// should replace the resolver before the registry grows beyond that bound.

const ORG_SORT_FIELDS = new Set(['created_at', 'updated_at', 'name']);
const ORG_PAYOUT_RESOLUTION_ROW_LIMIT = 5000;

function applyOrganizationListFilters(query, filter = {}) {
    if (filter.search) {
        const s = String(filter.search).replace(/[%_,]/g, ' ').trim();
        if (s) query = query.or(`name.ilike.%${s}%,contact_email.ilike.%${s}%,stripe_account_id.ilike.%${s}%`);
    }
    return query;
}

async function getOrganizationExactCount(query, quiet, label) {
    const { count, error } = await query;
    if (error) {
        if (!quiet) console.error(`Error fetching ${label}:`, error);
        throw error;
    }
    return Number.isFinite(count) ? count : 0;
}

async function getOrganizationPayoutBuckets(quiet) {
    const [organizationsResult, walletsResult] = await Promise.all([
        supabase
            .from(TABLE_NAME)
            .select('id', { count: 'exact' })
            .limit(ORG_PAYOUT_RESOLUTION_ROW_LIMIT),
        supabase
            .from('organization_wallets')
            .select('organization_id, balance, currency, updated_at', { count: 'exact' })
            .limit(ORG_PAYOUT_RESOLUTION_ROW_LIMIT),
    ]);

    if (organizationsResult.error) {
        if (!quiet) console.error('Error resolving organization payout ids:', organizationsResult.error);
        throw organizationsResult.error;
    }
    if (walletsResult.error) {
        if (!quiet) console.error('Error resolving organization payout balances:', walletsResult.error);
        throw walletsResult.error;
    }

    const organizationIds = (organizationsResult.data || []).map((row) => row.id).filter(Boolean);
    const walletRows = walletsResult.data || [];
    const organizationCount = Number.isFinite(organizationsResult.count)
        ? organizationsResult.count
        : organizationIds.length;
    const walletCount = Number.isFinite(walletsResult.count) ? walletsResult.count : walletRows.length;

    if (organizationCount > organizationIds.length || walletCount > walletRows.length) {
        throw new Error(
            `Organization payout projection is larger than the client resolver limit (${ORG_PAYOUT_RESOLUTION_ROW_LIMIT}); backend organization payout projection required.`
        );
    }

    const balanceById = new Map();
    const walletMetaById = new Map();
    walletRows.forEach((wallet) => {
        if (!wallet?.organization_id) return;
        const balance = Number(wallet.balance);
        balanceById.set(wallet.organization_id, Number.isFinite(balance) ? balance : 0);
        // ADOPT-27: the wallet join used to drop everything but balance. Keep the
        // wallet row's currency and freshness so the page renders the row's own
        // currency (honest null when absent) and when the balance last moved.
        walletMetaById.set(wallet.organization_id, {
            currency: wallet.currency ?? null,
            updated_at: wallet.updated_at ?? null,
        });
    });

    const fundedIds = organizationIds.filter((id) => Number(balanceById.get(id) || 0) > 0);
    const fundedIdSet = new Set(fundedIds);
    const payoutGapIds = organizationIds.filter((id) => !fundedIdSet.has(id));

    return { balanceById, walletMetaById, fundedIds, payoutGapIds };
}

function applyOrganizationPayoutFilter(query, kpiFilter, payoutBuckets) {
    if (kpiFilter === 'funded') return payoutBuckets.fundedIds.length > 0
        ? query.in('id', payoutBuckets.fundedIds)
        : null;
    if (kpiFilter === 'payout_gap') return payoutBuckets.payoutGapIds.length > 0
        ? query.in('id', payoutBuckets.payoutGapIds)
        : null;
    return query;
}

// KPI stats are search-scoped but KPI-agnostic: changing the active chip narrows the row list
// while all three chip counts continue to describe the current search scope.
async function getOrganizationPageStats(filter, quiet, payoutBuckets) {
    let totalQuery = supabase.from(TABLE_NAME).select('id', { count: 'exact', head: true });
    totalQuery = applyOrganizationListFilters(totalQuery, filter);
    let fundedQuery = supabase.from(TABLE_NAME).select('id', { count: 'exact', head: true });
    fundedQuery = applyOrganizationListFilters(fundedQuery, filter);
    fundedQuery = applyOrganizationPayoutFilter(fundedQuery, 'funded', payoutBuckets);

    const [total, funded] = await Promise.all([
        getOrganizationExactCount(totalQuery, quiet, 'organization total count'),
        fundedQuery
            ? getOrganizationExactCount(fundedQuery, quiet, 'funded organization count')
            : Promise.resolve(0),
    ]);

    return { total, funded, payoutGap: Math.max(total - funded, 0) };
}

/**
 * Bounded Organizations page read: { data, count, stats }. Server-side search/sort/paginate
 * plus an exact, search-scoped payout axis. The React Query envelope both layouts consume.
 * READ-ONLY: no write path is exposed here (saveOrganization/deleteOrganization stay
 * orphaned; the page never imports them).
 */
export async function getOrganizationsPage(filter = {}) {
    try {
        const user = await getCurrentUser();
        // RBAC: Patients should not be calling organizations (Console only). No self-scope
        // column exists on `organizations`, so there is no applyAuthFilter org-scope here --
        // the /organizations route is admin-only (ProtectedRoute minRole="admin"), so the
        // ROUTE GATE is the scope. (Gap noted; a scope is NOT invented at the service layer.)
        if (user?.role === 'patient') {
            return { data: [], count: 0, stats: { total: 0, funded: 0, payoutGap: 0 } };
        }

        const payoutBuckets = await getOrganizationPayoutBuckets(filter.quiet);
        const listBucket = filter.kpiFilter === 'funded'
            ? payoutBuckets.fundedIds
            : filter.kpiFilter === 'payout_gap'
                ? payoutBuckets.payoutGapIds
                : null;

        const { data, count } = await withRetry(async () => {
            if (Array.isArray(listBucket) && listBucket.length === 0) {
                return { data: [], count: 0, error: null };
            }

            let query = supabase.from(TABLE_NAME).select('*', { count: 'exact' });
            query = applyOrganizationListFilters(query, filter);
            query = applyOrganizationPayoutFilter(query, filter.kpiFilter, payoutBuckets);
            const sortKey = ORG_SORT_FIELDS.has(filter.sortKey) ? filter.sortKey : 'created_at';
            query = query.order(sortKey, { ascending: filter.sortDirection === 'asc' });
            if (filter.limit) {
                const start = filter.offset || 0;
                query = query.range(start, start + filter.limit - 1);
            }
            const result = await query;
            if (result.error) throw result.error;
            return result;
        });

        const rows = (data || []).map((org) => {
            const walletMeta = payoutBuckets.walletMetaById.get(org.id);
            return {
                ...org,
                wallet_balance: payoutBuckets.balanceById.get(org.id) || 0,
                wallet_currency: walletMeta?.currency ?? null,
                wallet_updated_at: walletMeta?.updated_at ?? null,
            };
        });
        const stats = await getOrganizationPageStats(filter, filter.quiet, payoutBuckets);
        return { data: rows, count: count || 0, stats };
    } catch (error) {
        if (!filter?.quiet) {
            console.error('Error fetching organizations page:', error);
        }
        throw error;
    }
}

/**
 * Get single organization by ID
 */
export async function getOrganization(orgId) {
    // Guard empty/missing identifiers before hitting the DB.
    // NOTE: orgId may be a display_id (non-UUID), which is a valid lookup path,
    // so we intentionally do NOT reject non-UUID values here.
    if (orgId === undefined || orgId === null || orgId === '') return null;

    try {
        const { data } = await withRetry(async () => {
            let query = supabase.from(TABLE_NAME).select('*');

            if (isValidUUID(orgId)) {
                query = query.eq('id', orgId);
            } else {
                query = query.eq('display_id', orgId);
            }

            // .maybeSingle(): non-owner read can return 0 rows under RLS; null-guard below.
            const result = await query.maybeSingle();

            if (result.error && result.error.code !== 'PGRST116') throw result.error;
            return result;
        });

        return data || null;
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
        const payload = buildOrganizationPayload(org, { isUpdate });

        return await withAudit(
            isUpdate ? 'organization.update' : 'organization.create',
            'organization',
            async () => {
                const query = isUpdate
                    ? supabase.from(TABLE_NAME).update(payload).eq('id', org.id)
                    : supabase.from(TABLE_NAME).insert([payload]);

                const { data, error } = await query.select().single();
                if (error) throw error;
                return data;
            },
            { organization_id: org.id ?? null, is_update: isUpdate }
        );
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
        return await withAudit(
            'organization.delete',
            'organization',
            async () => {
                const { error } = await supabase
                    .from(TABLE_NAME)
                    .delete()
                    .eq('id', orgId);

                if (error) throw error;
            },
            { organization_id: orgId ?? null }
        );
    } catch (error) {
        console.error(`Error deleting organization ${orgId}:`, error);
        throw error;
    }
}
