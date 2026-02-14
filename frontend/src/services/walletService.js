import { supabase } from '../lib/supabase';

/**
 * Wallet Service for iVisit Console
 * Handles financial data fetching for Dashboard and Analytics
 */

export const getWalletSummary = async (profile, isAdmin) => {
    try {
        let balance = 0;
        let todayIncome = 0;
        let yesterdayIncome = 0;
        let currency = 'USD';

        // 1. Fetch Balance
        if (isAdmin) {
            const { data: mainWallet } = await supabase.from('ivisit_main_wallet').select('*').single();
            balance = mainWallet?.balance || 0;
            currency = mainWallet?.currency || 'USD';
        } else {
            const { data: orgWallet } = await supabase.from('organization_wallets')
                .select('*')
                .eq('organization_id', profile.organization_id)
                .single();
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

        if (!isAdmin) {
            query = query.eq('organization_id', profile.organization_id);
        }

        const { data: ledgerData } = await query.gte('created_at', yesterday.toISOString());

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

export const getFinanceAnalytics = async (profile, isAdmin, days = 30) => {
    try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        let query = supabase.from('wallet_ledger')
            .select('amount, created_at, transaction_type')
            .gte('created_at', startDate.toISOString());

        if (!isAdmin) {
            query = query.eq('organization_id', profile.organization_id);
        }

        const { data, error } = await query.order('created_at', { ascending: true });

        if (error) throw error;

        // Generate all dates in range to ensure a baseline
        const groupedData = {};
        for (let i = 0; i <= days; i++) {
            const d = new Date();
            d.setDate(d.getDate() - (days - i));
            const dateStr = d.toLocaleDateString();
            groupedData[dateStr] = { date: dateStr, income: 0, outflow: 0 };
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
        console.error('Error fetching finance analytics:', error);

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
export const getProjectedRevenue = async (organizationId = null) => {
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        let query = supabase.from('wallet_ledger')
            .select('amount')
            .eq('transaction_type', 'credit')
            .gte('created_at', sevenDaysAgo.toISOString());

        if (organizationId) {
            query = query.eq('organization_id', organizationId);
        }

        const { data, error } = await query;
        if (error) throw error;

        const totalLast7Days = data.reduce((sum, item) => sum + Number(item.amount), 0);
        const dailyAvg = totalLast7Days / 7;

        return Math.round(dailyAvg * 30);
    } catch (error) {
        console.error('Error calculating projection:', error);
        return 0;
    }
};

/**
 * Handle Fund Withdrawal
 * Calls the Secure Payout Edge Function in ivisit-app
 */
export const withdrawFunds = async (amount, description, organizationId = null) => {
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
};

/**
 * Handle Fund Top-up
 * Triggers a Payment Intent for the organization
 */
export const topUpWallet = async (amount, description, organizationId = null) => {
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
};

/**
 * Get Org Stripe Status (cards, payout status)
 */
export const getOrgStripeStatus = async (organizationId) => {
    const { data, error } = await supabase.rpc('get_org_stripe_status', {
        p_org_id: organizationId
    });

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
export const listPaymentMethods = async (organizationId) => {
    const { data, error } = await supabase.functions.invoke('manage-payment-methods', {
        body: { action: 'list-payment-methods', organization_id: organizationId }
    });

    if (error) throw error;
    return data.data || [];
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
 * Set Default Payout Method
 */
export const setPayoutMethod = async (organizationId, paymentMethodId) => {
    const { data, error } = await supabase.functions.invoke('manage-payment-methods', {
        body: { action: 'set-payout-method', organization_id: organizationId, payment_method_id: paymentMethodId }
    });

    if (error) throw error;
    return data;
};
