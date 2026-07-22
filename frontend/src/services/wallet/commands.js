import { supabase } from '../../lib/supabase';
import { isValidUUID } from '../../lib/utils';
import { withAudit, withRetry } from '../supabaseHelpers';

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

export const topUpWallet = async (amount, description, organizationId = null) => {
    return withAudit('wallet.topup', 'wallet', async () => {
        const { data, error } = await supabase.functions.invoke('create-payment-intent', {
            body: {
                amount: Number(amount),
                organization_id: organizationId,
                currency: 'usd',
                // The shared receiver only classifies this as wallet funding
                // from the top-level discriminator. The nested metadata remains
                // useful context, but cannot stand in for receiver intent.
                is_top_up: true,
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
