import { supabase } from '../lib/supabase';
import { withRetry, withAudit } from './supabaseHelpers';
import { isValidUUID } from '../lib/utils';

/**
 * Wallet Service for iVisit Console
 * Handles financial data fetching for Dashboard and Analytics
 */

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

// PULLBACK NOTE: Payments truth projection
// OLD: Payment KPIs summed whichever ledger rows happened to be loaded by the page.
// NEW: Totals publish only after an exact, bounded, stable scan of the full wallet ledger.
const LEDGER_METRIC_PAGE_SIZE = 1000;
const LEDGER_METRIC_MAX_ROWS = 10000;

const runWalletRead = async (buildQuery) => withRetry(async () => {
    const result = await buildQuery();
    if (result?.error) throw result.error;
    return result;
});

const getExactLedgerCount = async (walletId) => {
    const { count } = await runWalletRead(() => supabase
        .from('wallet_ledger')
        .select('id', { count: 'exact', head: true })
        .eq('wallet_id', walletId));
    const numericCount = Number(count);

    if (count === null || count === undefined || !Number.isSafeInteger(numericCount) || numericCount < 0) {
        throw new Error('Wallet ledger count is unavailable.');
    }

    return numericCount;
};

const getWalletLedgerPreview = async (walletId, limit = 50) => {
    if (!isValidUUID(walletId)) {
        return { rows: [], totalCount: null };
    }

    const safeLimit = Math.max(1, Number(limit) || 50);
    const { data, count } = await runWalletRead(() => supabase
        .from('wallet_ledger')
        .select('*', { count: 'exact' })
        .eq('wallet_id', walletId)
        .order('created_at', { ascending: false })
        .limit(safeLimit));

    return {
        rows: data || [],
        totalCount: count !== null && count !== undefined && Number.isSafeInteger(Number(count))
            ? Number(count)
            : null,
    };
};

export const getWalletLedgerMetrics = async ({
    walletId,
    pageSize = LEDGER_METRIC_PAGE_SIZE,
    maxRows = LEDGER_METRIC_MAX_ROWS,
} = {}) => {
    if (!isValidUUID(walletId)) {
        throw new Error('Wallet scope is unavailable.');
    }

    const requestedPageSize = Number(pageSize);
    const requestedMaxRows = Number(maxRows);
    const safePageSize = Math.min(1000, Math.max(
        1,
        Number.isSafeInteger(requestedPageSize) ? requestedPageSize : LEDGER_METRIC_PAGE_SIZE,
    ));
    const safeMaxRows = Math.max(
        safePageSize,
        Number.isSafeInteger(requestedMaxRows) && requestedMaxRows > 0
            ? requestedMaxRows
            : LEDGER_METRIC_MAX_ROWS,
    );
    const expectedCount = await getExactLedgerCount(walletId);

    if (expectedCount > safeMaxRows) {
        throw new Error('Wallet ledger is too large for a complete browser projection.');
    }

    let processedCount = 0;
    let credits = 0;
    let debits = 0;
    let creditCount = 0;
    let debitCount = 0;

    while (processedCount < expectedCount) {
        const pageLength = Math.min(safePageSize, expectedCount - processedCount);
        const { data } = await runWalletRead(() => supabase
            .from('wallet_ledger')
            .select('amount, transaction_type')
            .eq('wallet_id', walletId)
            .order('created_at', { ascending: true })
            .order('id', { ascending: true })
            .range(processedCount, processedCount + pageLength - 1));
        const rows = data || [];

        if (rows.length !== pageLength) {
            throw new Error('Wallet ledger changed before totals could be confirmed.');
        }

        rows.forEach((row) => {
            const transactionType = String(row?.transaction_type || '').trim().toLowerCase();
            if (transactionType !== 'credit' && transactionType !== 'debit') return;

            const amount = Number(row?.amount);
            if (!Number.isFinite(amount)) {
                throw new Error('Wallet ledger contains an invalid amount.');
            }

            if (transactionType === 'credit') {
                credits += Math.abs(amount);
                creditCount += 1;
                return;
            }

            debits += Math.abs(amount);
            debitCount += 1;
        });

        processedCount += rows.length;
    }

    const confirmedCount = await getExactLedgerCount(walletId);
    if (confirmedCount !== expectedCount || processedCount !== expectedCount) {
        throw new Error('Wallet ledger changed before totals could be confirmed.');
    }

    return {
        basis: 'complete_wallet_ledger_scan',
        scope: 'all_recorded_wallet_entries',
        scopeLabel: 'All recorded ledger entries',
        complete: true,
        rowCount: expectedCount,
        credits,
        debits,
        creditCount,
        debitCount,
    };
};

const protectCsvFormula = (value) => {
    if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
    const text = value === null || value === undefined ? '' : String(value);
    return /^[\t\r\n ]*[=+\-@]/.test(text) ? `'${text}` : text;
};

const escapeCsvCell = (value) => `"${protectCsvFormula(value).replace(/"/g, '""')}"`;

const formatLedgerCsvDate = (value) => {
    const date = new Date(value || '');
    return Number.isNaN(date.getTime()) ? value || '' : date.toISOString();
};

export const buildLoadedLedgerCsv = ({ ledger = [], currency = 'USD' } = {}) => {
    const rows = [
        ['Date', 'Type', 'Description', 'Amount', 'Currency'],
        ...ledger.map((entry) => [
            formatLedgerCsvDate(entry?.created_at),
            entry?.transaction_type || '',
            entry?.description || '',
            entry?.amount ?? '',
            String(currency || 'USD').toUpperCase(),
        ]),
    ];

    return rows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');
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

export const getWalletSummary = async (profile, isAdmin) => {
    try {
        let balance = 0;
        let todayIncome = 0;
        let yesterdayIncome = 0;
        let currency = 'USD';

        // 1. Fetch Balance
        if (isAdmin) {
            const { data: mainWallet } = await withRetry(() => supabase.from('ivisit_main_wallet').select('*').maybeSingle());
            balance = mainWallet?.balance || 0;
            currency = mainWallet?.currency || 'USD';
        } else {
            const { data: orgWallet } = await withRetry(() => supabase.from('organization_wallets')
                .select('*')
                .eq('organization_id', profile.organization_id)
                .maybeSingle());
            balance = orgWallet?.balance || 0;
            currency = orgWallet?.currency || 'USD';
        }

        // 2. Fetch Income (Ledger entries with type 'credit')
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        let query = supabase.from('wallet_ledger')
            .select('amount, created_at')
            .eq('transaction_type', 'credit');

        if (isAdmin) {
            // Platform Ledger: Filter by the platform's singular wallet_id
            const { data: mainWallet } = await withRetry(() => supabase.from('ivisit_main_wallet').select('id').maybeSingle());
            if (mainWallet) query = query.eq('wallet_id', mainWallet.id);
        } else {
            // Org Ledger: Filter by the organization's specific wallet_id
            // Note: wallet_ledger does NOT contain organization_id directly.
            const { data: orgWallet } = await withRetry(() => supabase.from('organization_wallets').select('id').eq('organization_id', profile.organization_id).maybeSingle());
            if (orgWallet) query = query.eq('wallet_id', orgWallet.id);
        }

        const summaryLedgerQuery = query.gte('created_at', yesterday.toISOString());
        const { data: ledgerData } = await withRetry(() => summaryLedgerQuery);

        if (ledgerData) {
            todayIncome = ledgerData
                .filter(item => new Date(item.created_at) >= today)
                .reduce((sum, item) => sum + Number(item.amount), 0);

            yesterdayIncome = ledgerData
                .filter(item => new Date(item.created_at) >= yesterday && new Date(item.created_at) < today)
                .reduce((sum, item) => sum + Number(item.amount), 0);
        }

        // Calculate trend (%)
        let trend = 0;
        if (yesterdayIncome > 0) {
            trend = ((todayIncome - yesterdayIncome) / yesterdayIncome) * 100;
        } else if (todayIncome > 0) {
            trend = 100;
        }

        return {
            balance,
            todayIncome,
            yesterdayIncome,
            trend: Math.round(trend),
            currency
        };
    } catch (error) {
        console.error('Error fetching wallet summary:', error);
        return { balance: 0, todayIncome: 0, yesterdayIncome: 0, trend: 0, currency: 'USD' };
    }
};

export const getFinanceAnalytics = async (profile, isAdmin, days = 30, options = {}) => {
    try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        let query = supabase.from('wallet_ledger')
            .select('amount, created_at, transaction_type', { count: 'exact' })
            .gte('created_at', startDate.toISOString());
        let currency = null;

        if (isAdmin) {
            const { data: mainWallet, error: walletError } = await withRetry(() => supabase.from('ivisit_main_wallet').select('id, currency').maybeSingle());
            if (walletError) throw walletError;
            if (!mainWallet?.id || !mainWallet?.currency) throw new Error('Platform wallet is unavailable.');
            currency = mainWallet.currency;
            query = query.eq('wallet_id', mainWallet.id);
        } else {
            if (!profile?.organization_id) throw new Error('Organization wallet is unavailable.');
            const { data: orgWallet, error: walletError } = await withRetry(() => supabase.from('organization_wallets').select('id, currency').eq('organization_id', profile.organization_id).maybeSingle());
            if (walletError) throw walletError;
            if (!orgWallet?.id || !orgWallet?.currency) throw new Error('Organization wallet is unavailable.');
            currency = orgWallet.currency;
            query = query.eq('wallet_id', orgWallet.id);
        }

        const financeQuery = query.order('created_at', { ascending: true });
        const { data, error, count } = await withRetry(() => financeQuery);

        if (error) throw error;
        if (Number.isFinite(Number(count)) && Number(count) > (data || []).length) {
            throw new Error('Finance history is incomplete for this period.');
        }

        // Generate all dates in range to ensure a baseline
        const groupedData = {};
        for (let i = 0; i <= days; i++) {
            const d = new Date();
            d.setDate(d.getDate() - (days - i));
            const dateStr = d.toLocaleDateString();
            groupedData[dateStr] = { date: dateStr, income: 0, outflow: 0, currency };
        }

        // Fill with actual data (Reflection of Stripe via Webhooks)
        if (data && data.length > 0) {
            data.forEach(item => {
                const date = new Date(item.created_at).toLocaleDateString();
                if (groupedData[date]) {
                    if (item.transaction_type === 'credit') {
                        groupedData[date].income += Number(item.amount) || 0;
                    } else if (item.transaction_type === 'payout' || item.transaction_type === 'debit') {
                        groupedData[date].outflow += Math.abs(Number(item.amount)) || 0;
                    }
                }
            });
        }

        return Object.values(groupedData);
    } catch (error) {
        if (!options?.quiet) {
            console.error('Error fetching finance analytics:', error);
        }

        if (options?.throwOnError) {
            throw error;
        }

        // Return a zeroed baseline even on error
        const baseline = [];
        for (let i = 0; i <= days; i++) {
            const d = new Date();
            d.setDate(d.getDate() - (days - i));
            baseline.push({ date: d.toLocaleDateString(), income: 0, outflow: 0 });
        }
        return baseline;
    }
};

/**
 * Get Projected Revenue (30d) based on trailing 7-day average
 */
export const getProjectedRevenue = async (organizationId = null, options = {}) => {
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        let query = supabase.from('wallet_ledger')
            .select('amount')
            .eq('transaction_type', 'credit')
            .gte('created_at', sevenDaysAgo.toISOString());

        if (organizationId) {
            // Multi-tenant isolation: wallet_ledger is linked via wallet_id
            const { data: orgWallet } = await withRetry(() => supabase.from('organization_wallets').select('id').eq('organization_id', organizationId).maybeSingle());
            if (orgWallet) query = query.eq('wallet_id', orgWallet.id);
        } else {
            // Platform-wide metrics
            const { data: mainWallet } = await withRetry(() => supabase.from('ivisit_main_wallet').select('id').maybeSingle());
            if (mainWallet) query = query.eq('wallet_id', mainWallet.id);
        }

        const projectionQuery = query;
        const { data, error } = await withRetry(() => projectionQuery);
        if (error) throw error;

        const totalLast7Days = data.reduce((sum, item) => sum + Number(item.amount), 0);
        const dailyAvg = totalLast7Days / 7;

        return Math.round(dailyAvg * 30);
    } catch (error) {
        if (!options?.quiet) {
            console.error('Error calculating projection:', error);
        }
        if (options?.throwOnError) throw error;
        return 0;
    }
};

/**
 * Handle Fund Withdrawal
 * Calls the Secure Payout Edge Function in ivisit-app
 */
export const withdrawFunds = async (amount, description, organizationId = null) => {
    return withAudit('wallet.withdraw', 'wallet', async () => {
        const { data, error } = await supabase.functions.invoke('create-payout', {
            body: {
                amount: Number(amount),
                organization_id: organizationId,
                currency: 'usd',
                description: description
            }
        });

        if (error) throw error;

        // The DB reflection is updated via webhooks when Stripe succeeds,
        // or we might need to update a 'pending' state here.
        return data;
    }, { amount: Number(amount), organization_id: organizationId });
};

/**
 * Handle Fund Top-up
 * Triggers a Payment Intent for the organization
 */
export const topUpWallet = async (amount, description, organizationId = null) => {
    return withAudit('wallet.topup', 'wallet', async () => {
        const { data, error } = await supabase.functions.invoke('create-payment-intent', {
            body: {
                amount: Number(amount),
                organization_id: organizationId,
                currency: 'usd',
                metadata: {
                    type: 'wallet_topup',
                    description: description
                }
            }
        });

        if (error) throw error;

        // Note: In a real flow, the frontend would now use the returned clientSecret
        // with Stripe.js to complete the payment.
        // Once completed, the stripe-webhook handles crediting the DB wallet.
        return data;
    }, { amount: Number(amount), organization_id: organizationId });
};

/**
 * Get Org Stripe Status (cards, payout status)
 */
export const getOrgStripeStatus = async (organizationId) => {
    if (!isValidUUID(organizationId)) return null;

    const { data, error } = await withRetry(() => supabase.rpc('get_org_stripe_status', {
        p_organization_id: organizationId
    }));

    if (error) throw error;
    return data;
};

/**
 * Create Setup Intent for Card Collection
 */
export const createSetupIntent = async (organizationId) => {
    const { data, error } = await supabase.functions.invoke('manage-payment-methods', {
        body: { action: 'create-setup-intent', organization_id: organizationId }
    });

    if (error) throw error;
    return data;
};

/**
 * List Saved Payment Methods
 */
export const listPaymentMethods = async (organizationId, options = {}) => {
    try {
        const { data, error } = await supabase.functions.invoke('manage-payment-methods', {
            body: { action: 'list-payment-methods', organization_id: organizationId }
        });

        if (error) throw error;
        return data.data || [];
    } catch (error) {
        if (options?.quiet) return [];
        throw error;
    }
};

/**
 * Detach Payment Method
 */
export const deletePaymentMethod = async (organizationId, paymentMethodId) => {
    const { data, error } = await supabase.functions.invoke('manage-payment-methods', {
        body: { action: 'delete-payment-method', organization_id: organizationId, payment_method_id: paymentMethodId }
    });

    if (error) throw error;
    return data;
};

/**
 * Process Cash Payment (Manual Confirmation)
 * Records a cash payment in the ledger and deducts the 2.5% platform fee from Org balance
 */
export const processCashPayment = async (emergencyId, orgId, amount, currency = 'USD') => {
  void currency;
  return withAudit('wallet.cash_payment', 'payment', async () => {
    const { data, error } = await supabase.rpc('process_cash_payment', {
        p_emergency_request_id: emergencyId,
        p_organization_id: orgId,
        p_amount: Number(amount)
    });

    if (error) throw error;
    if (!data.success) throw new Error(data.error || 'Failed to process cash payment');

    return data;
  }, { emergency_request_id: emergencyId, organization_id: orgId, amount: Number(amount) });
};

/**
 * Check if Organization can accept a Cash Payment (Wallet Cap)
 * Verifies if their current balance is enough to cover the 2.5% fee
*/
export const checkCashEligibility = async (orgId, estimatedAmount) => {
    void estimatedAmount;
    if (!isValidUUID(orgId)) return false;

    const { data, error } = await withRetry(() => supabase.rpc('check_cash_eligibility', {
        p_organization_id: orgId
    }));

    if (error) {
        console.error('Error checking cash eligibility:', error);
        return false;
    }

    return data;
};

/**
 * Set Default Payout Method
 */
export const setPayoutMethod = async (organizationId, paymentMethodId) => {
    const { data, error } = await supabase.functions.invoke('manage-payment-methods', {
        body: { action: 'set-payout-method', organization_id: organizationId, payment_method_id: paymentMethodId }
    });

    if (error) throw error;
    return data;
};
