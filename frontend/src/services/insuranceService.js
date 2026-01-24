/**
 * Insurance Service
 * Handles all Supabase queries for insurance_policies table
 * Insurance policy management and verification
 */

import { supabase } from '../lib/supabase';
import { getCurrentUser, applyAuthFilter } from './authService';

const TABLE_NAME = 'insurance_policies';

/**
 * Get all insurance policies with optional filters
 * Admin users can see all policies, others see only their own
 */
export async function getInsurancePolicies(filter = {}) {
  try {
    const user = await getCurrentUser();
    let query = supabase.from(TABLE_NAME).select('*');

    // 1. Apply RBAC Scoping
    // Insurance policies table doesn't have organization_id, only user_id
    if (user?.role === 'admin') {
      // Admin gets all policies
      console.log('[RBAC] Admin access - all insurance policies');
    } else if (user?.role === 'org_admin') {
      // Org Admin gets all policies (no organization_id field to filter by)
      console.log('[RBAC] Org Admin access - all insurance policies (no org field)');
    } else if (user?.role === 'provider') {
      // Providers shouldn't access insurance data
      console.log('[RBAC] Provider access denied for insurance policies - not applicable');
      return [];
    } else {
      // Patients see only their own policies
      query = query.eq('user_id', user?.id);
      console.log(`[RBAC] Patient access - own insurance policies`);
    }

    // 2. Apply Custom Filters
    if (filter.provider_name) {
      query = query.eq('provider_name', filter.provider_name);
    }
    if (filter.coverage_type) {
      query = query.eq('coverage_type', filter.coverage_type);
    }
    if (filter.status) {
      query = query.eq('status', filter.status);
    }

    query = query.order('created_at', { ascending: false });

    if (filter.limit) {
      query = query.limit(filter.limit);
    }
    if (filter.offset) {
      query = query.range(filter.offset, filter.offset + (filter.limit || 10) - 1);
    }

    const { data, error } = await query;
    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching insurance policies:', error);
    return [];
  }
}

/**
 * Get single insurance policy by ID
 */
export async function getInsurancePolicy(policyId) {
  try {
    const user = await getCurrentUser();
    let query = supabase.from(TABLE_NAME).select('*');

    // Apply authorization for single policy
    if (user?.role !== 'admin') {
      query = query.eq('user_id', user?.id);
    }

    const { data, error } = await query.eq('id', policyId).single();

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
    const user = await getCurrentUser();
    const payload = {
      user_id: input.user_id || user?.id,
      provider_name: input.provider_name,
      policy_number: input.policy_number,
      group_number: input.group_number,
      policy_holder_name: input.policy_holder_name,
      coverage_type: input.coverage_type,
      start_date: input.start_date,
      end_date: input.end_date,
      front_image_url: input.front_image_url,
      back_image_url: input.back_image_url,
      status: input.status || 'active',
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

    return true;
  } catch (error) {
    console.error(`Error deleting insurance policy ${policyId}:`, error);
    throw error;
  }
}

/**
 * Update policy status
 */
export async function updatePolicyStatus(policyId, status) {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', policyId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error(`Error updating policy status for ${policyId}:`, error);
    throw error;
  }
}

/**
 * Verify insurance policy
 */
export async function verifyInsurancePolicy(policyId, verified) {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update({
        verified,
        verified_at: verified ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', policyId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error(`Error verifying insurance policy ${policyId}:`, error);
    throw error;
  }
}

/**
 * Get insurance analytics
 */
export async function getInsuranceAnalytics() {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('provider_name, coverage_type, status, verified, created_at, start_date, end_date');

    if (error) throw error;

    // Calculate analytics
    const analytics = {
      total: data?.length || 0,
      byProvider: {},
      byCoverageType: {},
      byStatus: {},
      verified: data?.filter(item => item.verified).length || 0,
      active: data?.filter(item => item.status === 'active').length || 0,
      expired: data?.filter(item => {
        if (!item.end_date) return false;
        const endDate = new Date(item.end_date);
        return endDate < new Date();
      }).length || 0,
      expiringSoon: data?.filter(item => {
        if (!item.end_date) return false;
        const endDate = new Date(item.end_date);
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        return endDate > new Date() && endDate <= thirtyDaysFromNow;
      }).length || 0,
    };

    // Group by provider
    data?.forEach(item => {
      analytics.byProvider[item.provider_name] = (analytics.byProvider[item.provider_name] || 0) + 1;
    });

    // Group by coverage type
    data?.forEach(item => {
      analytics.byCoverageType[item.coverage_type] = (analytics.byCoverageType[item.coverage_type] || 0) + 1;
    });

    // Group by status
    data?.forEach(item => {
      analytics.byStatus[item.status] = (analytics.byStatus[item.status] || 0) + 1;
    });

    return analytics;
  } catch (error) {
    console.error('Error fetching insurance analytics:', error);
    throw error;
  }
}

/**
 * Subscribe to insurance policy changes
 */
export function subscribeToInsurancePolicies(callback) {
  const channel = supabase
    .channel('insurance_policies_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: TABLE_NAME },
      callback
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

/**
 * Upload insurance card image
 */
export async function uploadInsuranceCardImage(file) {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
    const filePath = `insurance-cards/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // Use Signed URL for private buckets. 1 year expiry (31536000 seconds).
    const { data, error: urlError } = await supabase.storage
      .from('documents')
      .createSignedUrl(filePath, 31536000);

    if (urlError) throw urlError;

    return data.signedUrl;
  } catch (error) {
    console.error('Error uploading insurance card image:', error);
    throw error;
  }
}
