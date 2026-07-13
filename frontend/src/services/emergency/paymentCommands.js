import { supabase } from '../../lib/supabase';
import { isValidUUID } from '../../lib/utils';
import { withAudit, withRetry } from '../supabaseHelpers';
import { EMERGENCY_PAYMENT_RETRY_UNAVAILABLE_REASON } from './constants';

export async function approveCashPayment(paymentId, requestId) {
  try {
    return await withAudit('payment.approve_cash', 'payments', async () => {
      const { data, error } = await supabase.rpc('approve_cash_payment', {
        p_payment_id: paymentId,
        p_request_id: requestId,
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Approval failed');
      return data;
    }, { payment_id: paymentId, request_id: requestId });
  } catch (error) {
    if (
      error?.code === '23505' &&
      typeof error?.message === 'string' &&
      error.message.includes('emergency_requests_one_active_ambulance_per_user_idx')
    ) {
      throw new Error('Cannot approve dispatch: patient already has another active ambulance request (accepted/in-progress/arrived). Complete or cancel the existing trip first.');
    }
    if (
      error?.code === '23505' &&
      typeof error?.message === 'string' &&
      error.message.includes('emergency_requests_one_active_bed_per_user_idx')
    ) {
      throw new Error('Cannot approve booking: patient already has another active bed request (accepted/in-progress/arrived). Complete or cancel the existing booking first.');
    }
    console.error('Error approving cash payment:', error);
    throw error;
  }
}

export async function declineCashPayment(paymentId, requestId) {
  try {
    return await withAudit('payment.decline_cash', 'payments', async () => {
      const { data, error } = await supabase.rpc('decline_cash_payment', {
        p_payment_id: paymentId,
        p_request_id: requestId,
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Decline failed');
      return data;
    }, { payment_id: paymentId, request_id: requestId });
  } catch (error) {
    console.error('Error declining cash payment:', error);
    throw error;
  }
}

export async function getUserActivePaymentMethods(userId) {
  try {
    if (!isValidUUID(userId)) return [];

    return await withRetry(async () => {
      const { data, error } = await supabase
        .from('payment_methods')
        .select(
          'id,type,provider,brand,last4,expiry_month,expiry_year,is_default,is_active,created_at'
        )
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    });
  } catch (error) {
    console.error(`Error loading payment methods for user ${userId}:`, error);
    throw error;
  }
}

export async function retryPaymentWithDifferentMethod(requestId, paymentMethodId, userId) {
  void requestId;
  void paymentMethodId;
  void userId;
  throw new Error(EMERGENCY_PAYMENT_RETRY_UNAVAILABLE_REASON);
}
