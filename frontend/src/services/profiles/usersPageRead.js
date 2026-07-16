import { supabase } from '../../lib/supabase';
import { applyAuthFilter, getCurrentUser } from '../authService';
import { withRetry } from '../supabaseHelpers';
import { PROFILE_TABLE_NAME } from './constants';

const USER_SORT_FIELDS = new Set(['created_at', 'updated_at', 'username', 'email', 'role']);

function applyUserListFilters(query, filter = {}) {
  if (filter.forceEmpty) {
    query = query.eq('id', '00000000-0000-0000-0000-000000000000');
  }
  if (filter.role) {
    const roles = Array.isArray(filter.role) ? filter.role : [filter.role];
    if (roles.length > 0) query = query.in('role', roles);
  }
  if (filter.provider_type) {
    const types = Array.isArray(filter.provider_type) ? filter.provider_type : [filter.provider_type];
    if (types.length > 0) query = query.in('provider_type', types);
  }
  if (filter.verified !== undefined) {
    query = query.eq('bvn_verified', filter.verified);
  }
  if (filter.onboarding_status && filter.onboarding_status !== 'all') {
    query = query.eq('onboarding_status', filter.onboarding_status);
  }
  if (filter.search) {
    const search = String(filter.search).replace(/[%_,]/g, ' ').trim();
    if (search) {
      query = query.or(
        `username.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,full_name.ilike.%${search}%`
      );
    }
  }
  const range = filter.created_at || {};
  if (range.start) {
    query = query.gte('created_at', new Date(`${range.start}T00:00:00.000Z`).toISOString());
  }
  if (range.end) {
    query = query.lte('created_at', new Date(`${range.end}T23:59:59.999Z`).toISOString());
  }
  return query;
}

// ADOPT-29: surface auth.users.last_sign_in_at on the page rows via the
// EXISTING admin-gated get_all_auth_users read (the RPC raises for any role
// outside admin/org_admin/dispatcher, so the attempt mirrors the same gate
// getProfiles uses for includeAuthData). Enrichment is read-only and
// fail-open to absence: any error, refusal, or non-array payload leaves the
// rows without the field so the UI renders an honest absence, never a
// fabricated sign-in time. Org actors keep their own organization scope.
const AUTH_ENRICHED_ROLES = new Set(['admin', 'org_admin', 'dispatcher']);

async function attachLastSignIn(rows, user) {
  if (!Array.isArray(rows) || rows.length === 0) return rows;
  if (!AUTH_ENRICHED_ROLES.has(user?.role)) return rows;
  try {
    const { data, error } = await supabase.rpc('get_all_auth_users', {
      p_organization_id: user.role === 'admin' ? null : user.organization_id || null,
    });
    if (error || !Array.isArray(data)) return rows;
    const signIns = new Map(data.map((entry) => [entry.id, entry.last_sign_in_at || null]));
    return rows.map((row) => (
      signIns.has(row.id) ? { ...row, last_sign_in_at: signIns.get(row.id) } : row
    ));
  } catch {
    return rows;
  }
}

// ADOPT-46: resolve the assigned fleet unit's human vehicle label through ONE
// read-only batched ambulances lookup for the landed page window (support
// donor pattern, 58a62e7d). profiles.assigned_ambulance_id is TEXT, so only
// UUID-shaped values reach the query. Resolution is non-fatal: RLS refusal,
// errors, or unmatched ids leave assigned_ambulance_label absent and the rail
// chip degrades to presence-only wording -- never a fabricated unit name and
// never a surfaced raw UUID. No write path changes here.
const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const toAmbulanceVehicleLabel = (unit = {}) => (
  [unit.call_sign, unit.vehicle_number, unit.license_plate]
    .map((part) => String(part || '').trim())
    .find(Boolean) || null
);

async function attachAssignedAmbulanceLabels(rows, quiet) {
  if (!Array.isArray(rows) || rows.length === 0) return rows;
  const ids = [...new Set(
    rows
      .map((row) => (typeof row.assigned_ambulance_id === 'string' ? row.assigned_ambulance_id.trim() : ''))
      .filter((id) => UUID_SHAPE.test(id))
  )];
  if (ids.length === 0) return rows;
  try {
    const { data, error } = await supabase
      .from('ambulances')
      .select('id, call_sign, vehicle_number, license_plate')
      .in('id', ids);
    if (error || !Array.isArray(data)) return rows;
    const labels = new Map();
    data.forEach((unit) => {
      if (unit?.id) labels.set(unit.id, toAmbulanceVehicleLabel(unit));
    });
    return rows.map((row) => {
      const key = typeof row.assigned_ambulance_id === 'string' ? row.assigned_ambulance_id.trim() : '';
      return labels.has(key)
        ? { ...row, assigned_ambulance_label: labels.get(key) }
        : row;
    });
  } catch (error) {
    if (!quiet) console.error('Error resolving assigned ambulance labels:', error);
    return rows;
  }
}

async function getUserExactCount(baseFilter, user, extra) {
  let query = supabase.from(PROFILE_TABLE_NAME).select('id', { count: 'exact', head: true });
  query = applyAuthFilter(query, user, { userIdField: 'id', orgIdField: 'organization_id' });
  query = applyUserListFilters(query, baseFilter);
  if (extra?.role) query = query.eq('role', extra.role);
  if (extra?.verified !== undefined) query = query.eq('bvn_verified', extra.verified);
  const { count, error } = await query;
  if (error) throw error;
  if (!Number.isFinite(count)) throw new Error('Exact user count is unavailable');
  return count;
}

async function getUserPageStats(filter, user, quiet) {
  const statsFilter = {
    search: filter.search,
    created_at: filter.created_at,
    provider_type: filter.provider_type,
  };
  try {
    const [total, provider, org_admin, patient, verified] = await Promise.all([
      getUserExactCount(statsFilter, user, {}),
      getUserExactCount(statsFilter, user, { role: 'provider' }),
      getUserExactCount(statsFilter, user, { role: 'org_admin' }),
      getUserExactCount(statsFilter, user, { role: 'patient' }),
      getUserExactCount(statsFilter, user, { verified: true }),
    ]);
    return {
      stats: { total, provider, org_admin, patient, verified },
      error: null,
    };
  } catch (error) {
    if (!quiet) console.error('Error fetching user page statistics:', error);
    return {
      stats: null,
      error: {
        kind: 'count_unavailable',
        message: 'User totals are unavailable. Retry to refresh them.',
      },
    };
  }
}

export async function getUsersPage(filter = {}) {
  try {
    const user = await getCurrentUser();

    const { data, count } = await withRetry(async () => {
      let query = supabase.from(PROFILE_TABLE_NAME).select('*', { count: 'exact' });
      query = applyAuthFilter(query, user, { userIdField: 'id', orgIdField: 'organization_id' });
      query = applyUserListFilters(query, filter);
      const sortKey = USER_SORT_FIELDS.has(filter.sortKey) ? filter.sortKey : 'created_at';
      query = query.order(sortKey, { ascending: filter.sortDirection === 'asc' });
      if (filter.limit) {
        const start = filter.offset || 0;
        query = query.range(start, start + filter.limit - 1);
      }
      const result = await query;
      if (result.error) throw result.error;
      return result;
    });
    if (!Number.isFinite(count)) throw new Error('Exact users page count is unavailable');

    let enriched = data || [];
    if (enriched.length > 0) {
      const { getDisplayIds } = await import('../displayIdService');
      const ids = enriched.map((profile) => profile.id);
      const displayIds = await getDisplayIds(ids, { quiet: filter.quiet });
      enriched = enriched.map((profile) => ({
        ...profile,
        display_id:
          profile.display_id ||
          (displayIds.get ? displayIds.get(profile.id) : displayIds[profile.id]) ||
          null,
      }));
    }

    enriched = await attachLastSignIn(enriched, user);
    enriched = await attachAssignedAmbulanceLabels(enriched, filter.quiet);

    const statsProjection = await getUserPageStats(filter, user, filter.quiet);
    return {
      data: enriched,
      count,
      stats: statsProjection.stats,
      statsError: statsProjection.error,
    };
  } catch (error) {
    if (!filter.quiet) console.error('Error fetching users page:', error);
    throw error;
  }
}
