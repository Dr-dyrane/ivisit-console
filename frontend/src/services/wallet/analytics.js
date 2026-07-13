import { supabase } from '../../lib/supabase';
import { withRetry } from '../supabaseHelpers';

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
