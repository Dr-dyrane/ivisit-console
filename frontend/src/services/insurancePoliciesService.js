/**
 * Insurance Policies Service
 * Handles all Supabase queries for insurance_policies table
 * Insurance plan management and coverage verification
 */

import { supabase } from '../lib/supabase';

const TABLE_NAME = 'insurance_policies';

/**
 * Get all insurance policies with optional filters
 */
export async function getInsurancePolicies(filter) {
  try {
    let query = supabase.from(TABLE_NAME).select('*');

    if (filter?.user_id) {
      query = query.eq('user_id', filter.user_id);
    }
    if (filter?.provider_name) {
      query = query.eq('provider_name', filter.provider_name);
    }
    if (filter?.coverage_type) {
      query = query.eq('coverage_type', filter.coverage_type);
    }

    query = query.order('created_at', { ascending: false });

    if (filter?.limit) {
      query = query.limit(filter.limit);
    }
    if (filter?.offset) {
      query = query.range(filter.offset, filter.offset + (filter.limit || 10) - 1);
    }

    const { data, error } = await query;
    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching insurance policies:', error);
    throw error;
  }
}

/**
 * Get single insurance policy by ID
 */
export async function getInsurancePolicy(policyId) {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('id', policyId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    return data || null;
  } catch (error) {
    console.error(`Error fetching insurance policy ${policyId}:`, error);
    throw error;
  }
}

/**
 * Create new insurance policy
 */
export async function createInsurancePolicy(input) {
  try {
    const payload = {
      user_id: input.user_id,
      provider_name: input.provider_name,
      policy_number: input.policy_number,
      group_number: input.group_number,
      policy_holder_name: input.policy_holder_name,
      coverage_type: input.coverage_type,
      start_date: input.start_date,
      end_date: input.end_date,
      front_image_url: input.front_image_url,
      back_image_url: input.back_image_url,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert([payload])
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error creating insurance policy:', error);
    throw error;
  }
}

/**
 * Update insurance policy
 */
export async function updateInsurancePolicy(policyId, input) {
  try {
    const payload = {
      ...input,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update(payload)
      .eq('id', policyId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error(`Error updating insurance policy ${policyId}:`, error);
    throw error;
  }
}

/**
 * Delete insurance policy
 */
export async function deleteInsurancePolicy(policyId) {
  try {
    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('id', policyId);

    if (error) throw error;
  } catch (error) {
    console.error(`Error deleting insurance policy ${policyId}:`, error);
    throw error;
  }
}

/**
 * Get insurance policies for user
 */
export async function getUserInsurancePolicies(userId) {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error(`Error fetching insurance policies for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Get active insurance policies for user
 */
export async function getUserActiveInsurancePolicies(userId) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('user_id', userId)
      .lte('start_date', today)
      .gte('end_date', today)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error(`Error fetching active insurance policies for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Check if policy is active
 */
export async function isPolicyActive(policyId) {
  try {
    const policy = await getInsurancePolicy(policyId);
    if (!policy) return false;

    const today = new Date().toISOString().split('T')[0];
    const startDate = policy.start_date || '';
    const endDate = policy.end_date || '';

    return startDate <= today && today <= endDate;
  } catch (error) {
    console.error(`Error checking if policy ${policyId} is active:`, error);
    return false;
  }
}

/**
 * Verify coverage for user
 */
export async function verifyCoverage(userId) {
  try {
    const activePolicies = await getUserActiveInsurancePolicies(userId);
    return activePolicies.length > 0;
  } catch (error) {
    console.error(`Error verifying coverage for user ${userId}:`, error);
    return false;
  }
}

/**
 * Update policy document images
 */
export async function updatePolicyDocuments(policyId, frontImageUrl, backImageUrl) {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update({
        front_image_url: frontImageUrl,
        back_image_url: backImageUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', policyId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error(`Error updating policy documents ${policyId}:`, error);
    throw error;
  }
}

/**
 * Subscribe to insurance policy updates
 */
export function subscribeToInsurancePolicy(policyId, callback) {
  const channel = supabase
    .channel(`insurance_policy_${policyId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: TABLE_NAME,
        filter: `id=eq.${policyId}`,
      },
      (payload) => {
        if (payload.new) {
          callback(payload.new);
        }
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

/**
 * Subscribe to user insurance policy changes
 */
export function subscribeToUserInsurancePolicies(userId, callback) {
  const channel = supabase
    .channel(`user_insurance_policies_${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: TABLE_NAME,
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        if (payload.new) {
          callback(payload.new, payload.eventType);
        }
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}
