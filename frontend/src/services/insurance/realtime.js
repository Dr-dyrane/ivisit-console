import { supabase } from '../../lib/supabase';

const TABLE_NAME = 'insurance_policies';
const BILLING_TABLE_NAME = 'insurance_billing';

export function subscribeToInsurancePolicies(callback, channelName = 'insurance_policies_changes') {
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: TABLE_NAME },
      callback
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

export function subscribeToInsuranceBillingOutcomes(callback, channelName = 'insurance_billing_changes') {
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: BILLING_TABLE_NAME },
      callback
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}
