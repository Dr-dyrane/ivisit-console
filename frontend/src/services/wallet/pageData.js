import { supabase } from '../../lib/supabase';
import { isValidUUID } from '../../lib/utils';
import { withRetry } from '../supabaseHelpers';
import { getWalletLedgerMetrics, getWalletLedgerPreview } from './ledger';
import { listPaymentMethods } from './paymentMethods';
import { runWalletRead } from './query';

const normalizePaymentProfile = (profile) => {
    if (Array.isArray(profile)) return profile[0] || null;
    return profile || null;
};

const normalizeWalletPayment = (payment) => {
    const { profiles, ...rest } = payment || {};
    return {
        ...rest,
        user_details: normalizePaymentProfile(profiles),
    };
};

const resolveWalletForProfile = async ({ profile, isAdmin }) => {
    if (isAdmin) {
        const { data, error } = await withRetry(() => supabase
            .from('ivisit_main_wallet')
            .select('*')
            .maybeSingle());
        if (error) throw error;
        return data || null;
    }

    if (!isValidUUID(profile?.organization_id)) return null;

    const { data, error } = await withRetry(() => supabase
        .from('organization_wallets')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .maybeSingle());
    if (error) throw error;
    return data || null;
};

const getWalletLedger = async (walletId, limit = 50) => (
    await getWalletLedgerPreview(walletId, limit)
).rows;

const getWalletPaymentsPreview = async ({ organizationId = null, isOrgAdmin = false, limit = 50 } = {}) => {
    let query = supabase
        .from('payments')
        .select(`
            *,
            profiles!payments_user_id_fkey (
                first_name,
                last_name,
                phone,
                email
            ),
            emergency_requests (
                id,
                service_type,
                created_at,
                hospitals (
                    name,
                    address
                )
            )
        `, { count: 'exact' });

    if (isOrgAdmin && organizationId) {
        query = query.eq('organization_id', organizationId);
    }

    const { data, count } = await runWalletRead(() => query
        .order('created_at', { ascending: false })
        .limit(limit));

    return {
        rows: (data || []).map(normalizeWalletPayment),
        totalCount: count !== null && count !== undefined && Number.isSafeInteger(Number(count))
            ? Number(count)
            : null,
    };
};

export const getWalletPayments = async ({ organizationId = null, isOrgAdmin = false, limit = 50 } = {}) => {
    const result = await getWalletPaymentsPreview({ organizationId, isOrgAdmin, limit });
    return result.rows;
};

export const getWalletContextData = async ({ profile, isAdmin = false, ledgerLimit = 10 } = {}) => {
    const wallet = await resolveWalletForProfile({ profile, isAdmin });
    const ledger = isAdmin ? await getWalletLedger(wallet?.id, ledgerLimit) : [];

    return {
        wallet,
        ledger,
        projection: 0,
        readState: {
            wallet: wallet ? 'ready' : 'missing',
            ledger: isAdmin && wallet ? 'ready' : 'unavailable',
        },
    };
};

export const getWalletPageData = async ({ profile, isAdmin = false, isOrgAdmin = false, limit = 50 } = {}) => {
    const organizationId = profile?.organization_id || null;
    const wallet = await resolveWalletForProfile({ profile, isAdmin });
    const safeLimit = Math.max(1, Number(limit) || 50);

    const ledgerPromise = isAdmin && wallet?.id
        ? getWalletLedgerPreview(wallet.id, safeLimit + 1)
        : Promise.resolve(null);
    const financeMetricsPromise = isAdmin && wallet?.id
        ? getWalletLedgerMetrics({ walletId: wallet.id })
        : Promise.resolve(null);
    const [paymentMethodsResult, ledgerResult, paymentsResult, financeMetricsResult] = await Promise.allSettled([
        listPaymentMethods(isAdmin ? null : organizationId),
        ledgerPromise,
        getWalletPaymentsPreview({ organizationId, isOrgAdmin, limit: safeLimit + 1 }),
        financeMetricsPromise,
    ]);

    const ledgerProjection = ledgerResult.status === 'fulfilled' ? ledgerResult.value : null;
    const paymentsProjection = paymentsResult.status === 'fulfilled' ? paymentsResult.value : null;
    const ledgerRows = ledgerProjection?.rows || [];
    const paymentRows = paymentsProjection?.rows || [];
    const readState = {
        wallet: wallet ? 'ready' : 'missing',
        ledger: !wallet || !isAdmin ? 'unavailable' : ledgerResult.status === 'fulfilled' ? 'ready' : 'failed',
        payments: paymentsResult.status === 'fulfilled' ? 'ready' : 'failed',
        paymentMethods: paymentMethodsResult.status === 'fulfilled' ? 'ready' : 'failed',
        financeMetrics: !wallet || !isAdmin ? 'unavailable' : financeMetricsResult.status === 'fulfilled' ? 'ready' : 'failed',
    };

    return {
        wallet,
        ledger: ledgerRows.slice(0, safeLimit),
        paymentMethods: paymentMethodsResult.status === 'fulfilled' ? paymentMethodsResult.value : [],
        payments: paymentRows.slice(0, safeLimit),
        financeMetrics: financeMetricsResult.status === 'fulfilled' ? financeMetricsResult.value : null,
        hasMore: {
            ledger: readState.ledger === 'ready' && ledgerProjection?.totalCount !== null
                ? ledgerProjection.totalCount > safeLimit
                : ledgerRows.length > safeLimit,
            payments: paymentsProjection?.totalCount !== null
                ? paymentsProjection.totalCount > safeLimit
                : paymentRows.length > safeLimit,
        },
        totalCounts: {
            ledger: readState.ledger === 'ready' ? ledgerProjection?.totalCount ?? null : null,
            payments: readState.payments === 'ready' ? paymentsProjection?.totalCount ?? null : null,
        },
        readState,
        partialFailure: Object.values(readState).some((state) => state === 'failed'),
        limit: safeLimit,
    };
};
