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

const getWalletLedger = async (walletId, limit = 50) => {
    if (!isValidUUID(walletId)) return [];

    const { data, error } = await withRetry(() => supabase
        .from('wallet_ledger')
        .select('*')
        .eq('wallet_id', walletId)
        .order('created_at', { ascending: false })
        .limit(limit));
    if (error) throw error;
    return data || [];
};

export const getWalletPayments = async ({ organizationId = null, isOrgAdmin = false, limit = 50 } = {}) => {
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
        `);

    if (isOrgAdmin && organizationId) {
        query = query.eq('organization_id', organizationId);
    }

    const paymentsQuery = query
        .order('created_at', { ascending: false })
        .limit(limit);
    const { data, error } = await withRetry(() => paymentsQuery);
    if (error) throw error;

    return (data || []).map(normalizeWalletPayment);
};

export const getWalletContextData = async ({ profile, isAdmin = false, ledgerLimit = 10 } = {}) => {
    const wallet = await resolveWalletForProfile({ profile, isAdmin });
    const ledger = await getWalletLedger(wallet?.id, ledgerLimit);

    return {
        wallet,
        ledger,
        projection: 0,
    };
};

export const getWalletPageData = async ({ profile, isAdmin = false, isOrgAdmin = false, limit = 50 } = {}) => {
    const organizationId = profile?.organization_id || null;
    const wallet = await resolveWalletForProfile({ profile, isAdmin });
    const safeLimit = Math.max(1, Number(limit) || 50);

    const [paymentMethodsResult, ledgerResult, paymentsResult] = await Promise.allSettled([
        listPaymentMethods(isAdmin ? null : organizationId),
        getWalletLedger(wallet?.id, safeLimit + 1),
        getWalletPayments({ organizationId, isOrgAdmin, limit: safeLimit + 1 }),
    ]);

    const ledgerRows = ledgerResult.status === 'fulfilled' ? ledgerResult.value : [];
    const paymentRows = paymentsResult.status === 'fulfilled' ? paymentsResult.value : [];
    const readState = {
        wallet: wallet ? 'ready' : 'missing',
        ledger: !wallet ? 'unavailable' : ledgerResult.status === 'fulfilled' ? 'ready' : 'failed',
        payments: paymentsResult.status === 'fulfilled' ? 'ready' : 'failed',
        paymentMethods: paymentMethodsResult.status === 'fulfilled' ? 'ready' : 'failed',
    };

    return {
        wallet,
        ledger: ledgerRows.slice(0, safeLimit),
        paymentMethods: paymentMethodsResult.status === 'fulfilled' ? paymentMethodsResult.value : [],
        payments: paymentRows.slice(0, safeLimit),
        hasMore: {
            ledger: ledgerRows.length > safeLimit,
            payments: paymentRows.length > safeLimit,
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
