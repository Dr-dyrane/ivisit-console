import { supabase } from '../../lib/supabase';
import { isValidUUID } from '../../lib/utils';
import { withRetry } from '../supabaseHelpers';

export const getOrgStripeStatus = async (organizationId) => {
    if (!isValidUUID(organizationId)) return null;

    const { data, error } = await withRetry(() => supabase.rpc('get_org_stripe_status', {
        p_organization_id: organizationId
    }));

    if (error) throw error;
    return data;
};

export const createSetupIntent = async (organizationId) => {
    const { data, error } = await supabase.functions.invoke('manage-payment-methods', {
        body: { action: 'create-setup-intent', organization_id: organizationId }
    });

    if (error) throw error;
    return data;
};

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

export const deletePaymentMethod = async (organizationId, paymentMethodId) => {
    const { data, error } = await supabase.functions.invoke('manage-payment-methods', {
        body: { action: 'delete-payment-method', organization_id: organizationId, payment_method_id: paymentMethodId }
    });

    if (error) throw error;
    return data;
};

export const setPayoutMethod = async (organizationId, paymentMethodId) => {
    const { data, error } = await supabase.functions.invoke('manage-payment-methods', {
        body: { action: 'set-payout-method', organization_id: organizationId, payment_method_id: paymentMethodId }
    });

    if (error) throw error;
    return data;
};
