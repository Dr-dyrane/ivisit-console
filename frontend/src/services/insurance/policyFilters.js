import { normalizeFilterList, sanitizeSearchTerm } from './filterUtils';

export const INSURANCE_SORT_FIELDS = new Set([
  'created_at',
  'updated_at',
  'provider_name',
  'policy_number',
  'status',
  'verified',
  'plan_type',
  'expires_at',
]);

export function withoutInsuranceFilterDimensions(filter = {}, dimensions = []) {
  const next = { ...filter };
  delete next.kpiFilter;
  dimensions.forEach((dimension) => {
    delete next[dimension];
  });
  return next;
}

export function applyInsurancePageScope(query, user) {
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

export function applyInsurancePageFilters(query, filter = {}) {
  const kpiFilter = String(filter.kpiFilter || 'all');
  if (['active', 'pending', 'expired'].includes(kpiFilter)) {
    query = query.eq('status', kpiFilter);
  }
  if (kpiFilter === 'unverified') {
    query = query.eq('verified', false);
  }
  if (kpiFilter === 'expiringSoon') {
    // Mirrors getInsuranceExpiringSoonCount's active + 30-day expires_at
    // window so the KPI chip's rows match its exact-count stat.
    const now = new Date();
    const horizon = new Date();
    horizon.setDate(horizon.getDate() + 30);
    query = query
      .eq('status', 'active')
      .gte('expires_at', now.toISOString())
      .lte('expires_at', horizon.toISOString());
  }

  const statusValues = normalizeFilterList(filter.status);
  if (statusValues.length === 1) {
    query = query.eq('status', statusValues[0]);
  } else if (statusValues.length > 1) {
    query = query.in('status', statusValues);
  }

  const typeValues = normalizeFilterList(filter.type || filter.policy_type || filter.plan_type);
  if (typeValues.length === 1) {
    const planType = sanitizeSearchTerm(typeValues[0]);
    if (planType) query = query.ilike('plan_type', planType);
  } else if (typeValues.length > 1) {
    query = query.in('plan_type', typeValues);
  }

  if (filter.provider_name) {
    query = query.eq('provider_name', filter.provider_name);
  }

  if (filter.expiresBefore) {
    query = query.lte('expires_at', filter.expiresBefore);
  }
  if (filter.expiresAfter) {
    query = query.gte('expires_at', filter.expiresAfter);
  }

  if (filter.verified === 'verified' || filter.verified === true) {
    query = query.eq('verified', true);
  } else if (filter.verified === 'unverified' || filter.verified === false) {
    query = query.eq('verified', false);
  }

  const dateRange = filter.created_at;
  if (dateRange?.start) {
    query = query.gte('created_at', new Date(`${dateRange.start}T00:00:00`).toISOString());
  }
  if (dateRange?.end) {
    query = query.lte('created_at', new Date(`${dateRange.end}T23:59:59`).toISOString());
  }

  const search = sanitizeSearchTerm(filter.search);
  if (search) {
    query = query.or(
      `policy_number.ilike.%${search}%,provider_name.ilike.%${search}%,plan_type.ilike.%${search}%`
    );
  }

  return query;
}
