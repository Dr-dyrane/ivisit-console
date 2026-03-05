/**
 * Insurance Service
 * Handles all Supabase queries for insurance_policies table
 * Insurance policy management and verification
 */

import { supabase } from '../lib/supabase';
import { getCurrentUser, applyAuthFilter } from './authService';

const TABLE_NAME = 'insurance_policies';

function parseCoverageDetails(value) {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return { ...value };
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      return {};
    }
  }
  return {};
}

function toNullableNumber(value) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const asNumber = Number(value);
  return Number.isFinite(asNumber) ? asNumber : null;
}

function parseLinkedPaymentSnapshot(value) {
  if (!value) return null;
  if (typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      return null;
    }
  }
  return null;
}

function normalizeLinkedPaymentValue(value) {
  if (value === undefined) {
    return { normalized: undefined, snapshot: undefined };
  }
  if (value === null || value === '') {
    return { normalized: null, snapshot: null };
  }
  if (typeof value === 'string') {
    return { normalized: value, snapshot: undefined };
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    const methodId =
      value.id ||
      value.method_id ||
      value.payment_method_id ||
      value.reference_id ||
      null;

    return {
      normalized: methodId || undefined,
      snapshot: value,
    };
  }
  return { normalized: null, snapshot: undefined };
}

function buildCoverageDetails(input = {}, existingDetails = {}) {
  const details = {
    ...parseCoverageDetails(existingDetails),
  };

  const legacyKeys = [
    'group_number',
    'policy_holder_name',
    'front_image_url',
    'back_image_url',
    'coverage_amount',
  ];

  for (const key of legacyKeys) {
    if (input[key] === undefined) continue;
    if (input[key] === null || input[key] === '') {
      delete details[key];
      continue;
    }
    details[key] = input[key];
  }

  if (input.coverage_details && typeof input.coverage_details === 'object') {
    Object.assign(details, input.coverage_details);
  }

  if (input.coverage_type !== undefined || input.plan_type !== undefined || input.policy_type !== undefined) {
    const nextCoverageType = input.coverage_type ?? input.plan_type ?? input.policy_type;
    if (nextCoverageType === null || nextCoverageType === '') {
      delete details.coverage_type;
    } else {
      details.coverage_type = nextCoverageType;
    }
  }

  if (input.linked_payment_method_snapshot !== undefined) {
    if (input.linked_payment_method_snapshot === null || input.linked_payment_method_snapshot === '') {
      delete details.linked_payment_method_snapshot;
    } else {
      details.linked_payment_method_snapshot = input.linked_payment_method_snapshot;
    }
  }

  return details;
}

export function normalizeInsurancePolicy(record) {
  if (!record) return record;
  const details = parseCoverageDetails(record.coverage_details);
  const linkedPaymentSnapshot =
    parseLinkedPaymentSnapshot(details.linked_payment_method_snapshot) ||
    parseLinkedPaymentSnapshot(record.linked_payment_method);

  return {
    ...record,
    coverage_type: record.plan_type || details.coverage_type || '',
    policy_type: record.plan_type || details.coverage_type || '',
    start_date: record.starts_at || '',
    end_date: record.expires_at || '',
    policy_holder_name: details.policy_holder_name || '',
    group_number: details.group_number || '',
    front_image_url: details.front_image_url || '',
    back_image_url: details.back_image_url || '',
    linked_payment_method: linkedPaymentSnapshot || record.linked_payment_method || null,
    coverage_amount:
      details.coverage_amount ??
      (record.coverage_percentage !== null && record.coverage_percentage !== undefined
        ? Number(record.coverage_percentage)
        : 0),
  };
}

export function buildInsuranceWritePayload(
  input = {},
  { userId = null, forInsert = false, existingCoverageDetails = {} } = {}
) {
  const now = new Date().toISOString();
  const payload = {};

  const assignIfDefined = (key, value) => {
    if (value !== undefined) payload[key] = value;
  };

  assignIfDefined('provider_name', input.provider_name);
  assignIfDefined('policy_number', input.policy_number);

  if (input.coverage_type !== undefined || input.plan_type !== undefined || input.policy_type !== undefined) {
    assignIfDefined('plan_type', input.coverage_type ?? input.plan_type ?? input.policy_type ?? null);
  }
  if (input.start_date !== undefined || input.starts_at !== undefined) {
    assignIfDefined('starts_at', input.start_date ?? input.starts_at ?? null);
  }
  if (input.end_date !== undefined || input.expires_at !== undefined) {
    assignIfDefined('expires_at', input.end_date ?? input.expires_at ?? null);
  }
  if (input.status !== undefined) {
    assignIfDefined('status', input.status || 'active');
  }
  if (input.verified !== undefined) {
    assignIfDefined('verified', !!input.verified);
  }
  if (input.is_default !== undefined) {
    assignIfDefined('is_default', !!input.is_default);
  }

  const { normalized: linkedPaymentMethod, snapshot: linkedPaymentSnapshot } =
    normalizeLinkedPaymentValue(input.linked_payment_method);
  assignIfDefined('linked_payment_method', linkedPaymentMethod);

  const coveragePercentage =
    input.coverage_percentage !== undefined
      ? input.coverage_percentage
      : input.coverage_amount;
  const parsedCoveragePercentage = toNullableNumber(coveragePercentage);
  if (parsedCoveragePercentage !== undefined) {
    payload.coverage_percentage = parsedCoveragePercentage;
  }

  const hasLegacyCoverageInput =
    input.group_number !== undefined ||
    input.policy_holder_name !== undefined ||
    input.front_image_url !== undefined ||
    input.back_image_url !== undefined ||
    input.coverage_amount !== undefined ||
    input.coverage_details !== undefined ||
    input.coverage_type !== undefined ||
    input.plan_type !== undefined ||
    input.policy_type !== undefined ||
    linkedPaymentSnapshot !== undefined ||
    input.linked_payment_method_snapshot !== undefined;

  if (hasLegacyCoverageInput) {
    payload.coverage_details = buildCoverageDetails(
      {
        ...input,
        linked_payment_method_snapshot:
          input.linked_payment_method_snapshot !== undefined
            ? input.linked_payment_method_snapshot
            : linkedPaymentSnapshot,
      },
      existingCoverageDetails
    );
  }

  if (forInsert) {
    payload.user_id = input.user_id || userId || null;
    if (payload.status === undefined) payload.status = 'active';
    if (payload.verified === undefined) payload.verified = false;
    payload.created_at = now;
  } else if (input.user_id !== undefined) {
    payload.user_id = input.user_id || null;
  }

  payload.updated_at = now;
  return payload;
}

/**
 * Get all insurance policies with optional filters
 * Admin users can see all policies, others see only their own
 */
export async function getInsurancePolicies(filter = {}) {
  try {
    const user = await getCurrentUser();
    
    // PULLBACK NOTE: Early return if user not authenticated
    // OLD: Proceed with query even if user is undefined
    // NEW: Return empty array if no user to prevent UUID errors
    if (!user || !user.id) {
      console.log('User not authenticated, returning empty insurance policies');
      return [];
    }

    let query = supabase.from(TABLE_NAME).select('*');

    // 1. Apply RBAC Scoping
    // Insurance policies table doesn't have organization_id, only user_id
    if (user?.role === 'admin') {
      // Admin gets all policies
    } else if (user?.role === 'org_admin') {
      // Org Admin gets all policies (no organization_id field to filter by)
    } else if (user?.role === 'provider') {
      // Providers shouldn't access insurance data
      return [];
    } else {
      // Patients see only their own policies
      query = query.eq('user_id', user.id);
    }

    // 2. Apply Custom Filters
    if (filter.provider_name) {
      query = query.eq('provider_name', filter.provider_name);
    }
    if (filter.coverage_type) {
      query = query.eq('plan_type', filter.coverage_type);
    }
    if (filter.plan_type) {
      query = query.eq('plan_type', filter.plan_type);
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

    return (data || []).map(normalizeInsurancePolicy);
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

    return normalizeInsurancePolicy(data || null);
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
    const payload = buildInsuranceWritePayload(input, {
      userId: user?.id,
      forInsert: true,
    });

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert([payload])
      .select()
      .single();

    if (error) throw error;

    return normalizeInsurancePolicy(data);
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
    const { data: existingPolicy, error: existingError } = await supabase
      .from(TABLE_NAME)
      .select('coverage_details')
      .eq('id', policyId)
      .single();

    if (existingError && existingError.code !== 'PGRST116') throw existingError;

    const payload = buildInsuranceWritePayload(input, {
      forInsert: false,
      existingCoverageDetails: existingPolicy?.coverage_details || {},
    });

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update(payload)
      .eq('id', policyId)
      .select()
      .single();

    if (error) throw error;

    return normalizeInsurancePolicy(data);
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

    return normalizeInsurancePolicy(data);
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
        updated_at: new Date().toISOString()
      })
      .eq('id', policyId)
      .select()
      .single();

    if (error) throw error;

    return normalizeInsurancePolicy(data);
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
      .select('provider_name, plan_type, status, verified, created_at, starts_at, expires_at');

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
        if (!item.expires_at) return false;
        const endDate = new Date(item.expires_at);
        return endDate < new Date();
      }).length || 0,
      expiringSoon: data?.filter(item => {
        if (!item.expires_at) return false;
        const endDate = new Date(item.expires_at);
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
      analytics.byCoverageType[item.plan_type] = (analytics.byCoverageType[item.plan_type] || 0) + 1;
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
