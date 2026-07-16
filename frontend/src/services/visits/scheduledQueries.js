import { supabase } from '../../lib/supabase';
import { getCurrentUser } from '../authService';
import { applyQueryAbortSignal, throwIfQueryAborted } from '../queryAbort';
import { normalizeVisitForUI } from './normalization';

export const SCHEDULED_VISIT_PAGE_SIZE = 20;
// ADOPT-30: the scheduled lane feeds the same VisitsDetailRail as generic
// history (lifecycle_state carries rating_pending/rated), so it adopts the
// same numeric/financial outcome columns. Patient-authored rating_comment and
// the bare tip_payment_id FK stay excluded (scheduledQueries.test.js pins it).
export const SCHEDULED_VISIT_SELECT = `
  id,
  display_id,
  user_id,
  doctor_id,
  hospital_id,
  request_id,
  care_mode,
  scheduled_start_at,
  scheduled_end_at,
  scheduled_timezone,
  status,
  lifecycle_state,
  lifecycle_updated_at,
  rating,
  rated_at,
  tip_amount,
  tip_currency,
  tipped_at,
  type,
  specialty,
  doctor_name,
  doctor_image,
  hospital_name,
  date,
  created_at,
  updated_at,
  patient:profiles!visits_user_id_fkey (
    id,
    username,
    email,
    full_name,
    phone,
    avatar_url
  ),
  doctor_record:doctors!visits_doctor_id_fkey (
    id,
    profile_id,
    name,
    image,
    specialization,
    hospital_id
  ),
  hospital_record:hospitals!visits_hospital_id_fkey (
    id,
    name,
    address,
    timezone
  )
`;

const STATUS_TO_SOURCE = Object.freeze({
  scheduled: ['upcoming'],
  in_progress: ['in_progress'],
  completed: ['completed'],
  cancelled: ['cancelled'],
});

export const sanitizeScheduledVisitSearch = (value) => String(value || '')
  .trim()
  .replace(/[,%]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, 80);

const resolveScheduledVisitScope = async () => {
  const actor = await getCurrentUser();
  if (!actor || !['admin', 'org_admin', 'provider'].includes(actor.role)) {
    throw new Error('Scheduled visits are unavailable for this role.');
  }

  if (actor.role !== 'provider') return { actor, doctorId: null };
  const { data, error } = await supabase
    .from('doctors')
    .select('id')
    .eq('profile_id', actor.id)
    .maybeSingle();
  if (error) throw error;
  if (!data?.id) throw new Error('No clinician identity is linked to this account.');
  return { actor, doctorId: data.id };
};

const applySourceScope = (query, scope) => {
  let next = query
    .is('request_id', null)
    .in('care_mode', ['in_person', 'telemedicine_async'])
    .not('scheduled_start_at', 'is', null);

  if (scope.actor.role === 'org_admin') {
    const ids = Array.isArray(scope.actor.hospital_ids) ? scope.actor.hospital_ids : [];
    next = next.in('hospital_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']);
  } else if (scope.actor.role === 'provider') {
    next = next.eq('doctor_id', scope.doctorId);
  }
  return next;
};

const applyScheduledFilters = (query, filters = {}, kpiFilter = 'all') => {
  let next = query;
  const careModes = Array.isArray(filters.care_mode)
    ? filters.care_mode
    : Array.isArray(filters.visit_type)
      ? filters.visit_type.filter((value) => ['in_person', 'telemedicine_async'].includes(value))
      : [];
  if (careModes.length) next = next.in('care_mode', careModes);

  // ADOPT-65: 'today' is a calendar-day scope, never a lifecycle status; it
  // must not fall into the STATUS_TO_SOURCE mapping (that would query
  // status='today' and return a dishonest empty list).
  const statusFilters = kpiFilter && kpiFilter !== 'all' && kpiFilter !== 'today'
    ? [kpiFilter]
    : Array.isArray(filters.status)
      ? filters.status
      : filters.status ? [filters.status] : [];
  const sourceStatuses = [...new Set(statusFilters.flatMap((status) => STATUS_TO_SOURCE[status] || [status]))];
  if (sourceStatuses.length) next = next.in('status', sourceStatuses);

  if (filters.date?.start) next = next.gte('scheduled_start_at', `${filters.date.start}T00:00:00.000Z`);
  if (filters.date?.end) next = next.lt('scheduled_start_at', `${filters.date.end}T23:59:59.999Z`);

  if (kpiFilter === 'today') {
    // Same UTC day-bound convention as the filters.date branch above, applied
    // on top of any user date range rather than replacing it.
    const todayIso = new Date().toISOString().split('T')[0];
    next = next.gte('scheduled_start_at', `${todayIso}T00:00:00.000Z`);
    next = next.lt('scheduled_start_at', `${todayIso}T23:59:59.999Z`);
  }

  const search = sanitizeScheduledVisitSearch(filters.search);
  if (search) {
    const pattern = `%${search}%`;
    next = next.or([
      `display_id.ilike.${pattern}`,
      `type.ilike.${pattern}`,
      `hospital_name.ilike.${pattern}`,
      `doctor_name.ilike.${pattern}`,
      `specialty.ilike.${pattern}`,
    ].join(','));
  }
  return next;
};

const applyScheduledOrder = (query, sortConfig = {}) => {
  const allowed = new Set(['scheduled_start_at', 'status', 'care_mode', 'hospital_name', 'doctor_name', 'type']);
  const key = allowed.has(sortConfig.key) ? sortConfig.key : 'scheduled_start_at';
  const ascending = sortConfig.direction !== 'desc';
  return query.order(key, { ascending, nullsFirst: false }).order('id', { ascending: true });
};

const countScheduledRows = async ({ scope, filters, status, kpi = 'all', abortSignal }) => {
  let query = supabase.from('visits').select('id', { count: 'exact', head: true });
  query = applySourceScope(query, scope);
  query = applyScheduledFilters(query, { ...filters, status: status ? [status] : undefined }, kpi);
  query = applyQueryAbortSignal(query, abortSignal);
  const { count, error } = await query;
  throwIfQueryAborted(abortSignal);
  if (error) throw error;
  return count || 0;
};

export async function getScheduledVisitsPageData({
  filters = {},
  kpiFilter = 'all',
  range = { start: 0, end: SCHEDULED_VISIT_PAGE_SIZE - 1 },
  sortConfig = { key: 'scheduled_start_at', direction: 'asc' },
  abortSignal,
} = {}) {
  throwIfQueryAborted(abortSignal);
  const scope = await resolveScheduledVisitScope();
  throwIfQueryAborted(abortSignal);
  const start = Math.max(Number(range.start) || 0, 0);
  const requestedEnd = Math.max(Number(range.end) || start, start);
  const end = Math.min(requestedEnd, start + SCHEDULED_VISIT_PAGE_SIZE - 1);

  let pageQuery = supabase.from('visits').select(SCHEDULED_VISIT_SELECT, { count: 'exact' });
  pageQuery = applySourceScope(pageQuery, scope);
  pageQuery = applyScheduledFilters(pageQuery, filters, kpiFilter);
  pageQuery = applyScheduledOrder(pageQuery, sortConfig).range(start, end);
  pageQuery = applyQueryAbortSignal(pageQuery, abortSignal);

  const statsFilters = { ...filters, status: undefined };
  // ADOPT-65: today is one extra exact-count HEAD read (read path only) so the
  // scheduled lane's Today chip carries the same server-exact truth as the
  // status chips instead of a fabricated client zero.
  const [page, total, scheduled, inProgress, completed, cancelled, today] = await Promise.all([
    pageQuery,
    countScheduledRows({ scope, filters: statsFilters, abortSignal }),
    countScheduledRows({ scope, filters: statsFilters, status: 'scheduled', abortSignal }),
    countScheduledRows({ scope, filters: statsFilters, status: 'in_progress', abortSignal }),
    countScheduledRows({ scope, filters: statsFilters, status: 'completed', abortSignal }),
    countScheduledRows({ scope, filters: statsFilters, status: 'cancelled', abortSignal }),
    countScheduledRows({ scope, filters: statsFilters, kpi: 'today', abortSignal }),
  ]);
  throwIfQueryAborted(abortSignal);
  if (page.error) throw page.error;

  return {
    visits: (page.data || []).map(normalizeVisitForUI),
    count: page.count || 0,
    stats: { total, scheduled, inProgress, completed, cancelled, today },
    countBasis: 'server_exact',
    pageSize: SCHEDULED_VISIT_PAGE_SIZE,
  };
}

export async function getScheduledVisitById(visitId, { abortSignal } = {}) {
  if (!visitId) return null;
  const scope = await resolveScheduledVisitScope();
  let query = supabase
    .from('visits')
    .select(SCHEDULED_VISIT_SELECT)
    .eq('id', visitId);
  query = applySourceScope(query, scope);
  query = applyQueryAbortSignal(query, abortSignal);
  const { data, error } = await query.maybeSingle();
  throwIfQueryAborted(abortSignal);
  if (error) throw error;
  return data ? normalizeVisitForUI(data) : null;
}
