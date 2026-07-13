import { normalizeInsuranceBillingStatus } from './billingNormalization';
import { sanitizeSearchTerm } from './filterUtils';

export const INSURANCE_BILLING_SORT_FIELDS = new Set([
  'created_at',
  'updated_at',
  'billing_date',
  'paid_date',
  'status',
  'claim_number',
  'total_amount',
  'insurance_amount',
  'user_amount',
]);

export function applyInsuranceBillingScope(query, user) {
  if (!user?.id || user.role !== 'admin') {
    return {
      query,
      denied: true,
      reason: !user?.id ? 'not_authenticated' : 'admin_only',
    };
  }

  return {
    query,
    denied: false,
    reason: null,
  };
}

export function applyInsuranceBillingFilters(query, filter = {}) {
  const status = normalizeInsuranceBillingStatus(filter.status);
  if (status) {
    query = query.eq('status', status);
  }

  if (filter.policyId) {
    query = query.eq('insurance_policy_id', filter.policyId);
  }
  if (Array.isArray(filter.policyIds) && filter.policyIds.length > 0) {
    query = query.in('insurance_policy_id', filter.policyIds);
  }
  if (filter.userId) {
    query = query.eq('user_id', filter.userId);
  }
  if (filter.hospitalId) {
    query = query.eq('hospital_id', filter.hospitalId);
  }
  if (filter.emergencyRequestId) {
    query = query.eq('emergency_request_id', filter.emergencyRequestId);
  }

  const search = sanitizeSearchTerm(filter.search);
  if (search) {
    query = query.or(`claim_number.ilike.%${search}%`);
  }

  return query;
}
