import { supabase } from '../../lib/supabase';
import { getCurrentUser } from '../authService';
import { applyQueryAbortSignal, throwIfQueryAborted } from '../queryAbort';
import { withRetry } from '../supabaseHelpers';
import { SUPPORT_TICKET_SORT_FIELDS, TABLE_NAME } from './constants';
import { normalizeSupportTicketRow } from './normalization';
import { applySupportTicketFilters, applySupportTicketScope } from './queryFilters';

// --- Read-only name resolution at the projection boundary (schema adoption, 2026-07-16) ---
// support_tickets stores bare UUIDs (assigned_to / user_id -> profiles,
// organization_id -> organizations). Mirroring the organizations->wallets JS-map
// join, the page projection batches ONE profiles read and ONE organizations read
// for the landed page window and maps display names onto the normalized rows.
// Resolution failure is non-fatal: unresolved names stay null and the surfaces
// render their honest "Unknown ..." labels. No write path changes here.

const toProfileDisplayName = (profile = {}) => {
  const fullName = String(profile.full_name || '').trim();
  if (fullName) return fullName;
  const joinedName = [profile.first_name, profile.last_name]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(' ');
  if (joinedName) return joinedName;
  return String(profile.email || '').trim() || null;
};

async function resolveSupportTicketNameMaps(tickets, abortSignal, quiet = false) {
  const profileIds = [...new Set(
    tickets.flatMap((ticket) => [ticket.assigned_to, ticket.user_id]).filter(Boolean)
  )];
  const organizationIds = [...new Set(
    tickets.map((ticket) => ticket.organization_id).filter(Boolean)
  )];
  const profileNames = new Map();
  const organizationNames = new Map();

  if (profileIds.length === 0 && organizationIds.length === 0) {
    return { profileNames, organizationNames };
  }

  try {
    const [profilesResult, organizationsResult] = await withRetry(async () => {
      const results = await Promise.all([
        profileIds.length > 0
          ? applyQueryAbortSignal(
            supabase.from('profiles').select('id, full_name, first_name, last_name, email').in('id', profileIds),
            abortSignal
          )
          : Promise.resolve({ data: [], error: null }),
        organizationIds.length > 0
          ? applyQueryAbortSignal(
            supabase.from('organizations').select('id, name').in('id', organizationIds),
            abortSignal
          )
          : Promise.resolve({ data: [], error: null }),
      ]);
      throwIfQueryAborted(abortSignal);
      const failed = results.find((result) => result?.error);
      if (failed) throw failed.error;
      return results;
    });

    (profilesResult.data || []).forEach((profile) => {
      if (profile?.id) profileNames.set(profile.id, toProfileDisplayName(profile));
    });
    (organizationsResult.data || []).forEach((organization) => {
      if (organization?.id) {
        organizationNames.set(organization.id, String(organization.name || '').trim() || null);
      }
    });
  } catch (error) {
    throwIfQueryAborted(abortSignal);
    if (!quiet) {
      console.error('Error resolving support ticket names:', error);
    }
  }

  return { profileNames, organizationNames };
}

const attachSupportTicketNames = (tickets, { profileNames, organizationNames }) => (
  tickets.map((ticket) => {
    const assigneeName = ticket.assigned_to
      ? (profileNames.get(ticket.assigned_to) || null)
      : null;
    const requesterName = (ticket.user_id ? (profileNames.get(ticket.user_id) || null) : null)
      || ticket.requester_name
      || null;
    const organizationName = ticket.organization_id
      ? (organizationNames.get(ticket.organization_id) || null)
      : null;

    return {
      ...ticket,
      assignee_name: assigneeName,
      requester_name: requesterName,
      organization_name: organizationName,
      customer_name: ticket.customer_name || requesterName,
    };
  })
);

async function getSupportTicketExactCount(filter = {}, quiet = false, scopedUser, abortSignal) {
  try {
    throwIfQueryAborted(abortSignal);
    const user = scopedUser || await getCurrentUser();
    throwIfQueryAborted(abortSignal);

    const { count, error } = await withRetry(async () => {
      let query = supabase.from(TABLE_NAME).select('id', { count: 'exact', head: true });
      query = applySupportTicketScope(query, user);
      query = applySupportTicketFilters(query, filter);
      query = applyQueryAbortSignal(query, abortSignal);
      const result = await query;
      throwIfQueryAborted(abortSignal);
      if (result.error) throw result.error;
      return result;
    });
    if (error) throw error;

    return Number.isFinite(count) ? count : 0;
  } catch (error) {
    if (!quiet) {
      console.error('Error fetching support ticket exact count:', error);
    }
    throw error;
  }
}

export async function getSupportTicketsPageStats(filter = {}, quiet = false, user, abortSignal) {
  const [total, open, inProgress, resolved, closed, urgent] = await Promise.all([
    getSupportTicketExactCount(filter, quiet, user, abortSignal),
    getSupportTicketExactCount({ ...filter, status: 'open' }, quiet, user, abortSignal),
    getSupportTicketExactCount({ ...filter, status: 'in_progress' }, quiet, user, abortSignal),
    getSupportTicketExactCount({ ...filter, status: 'resolved' }, quiet, user, abortSignal),
    getSupportTicketExactCount({ ...filter, status: 'closed' }, quiet, user, abortSignal),
    getSupportTicketExactCount({ ...filter, priority: 'urgent' }, quiet, user, abortSignal),
  ]);

  return {
    total,
    open,
    inProgress,
    resolved,
    closed,
    urgent,
    active: open + inProgress,
    exactCounts: true,
  };
}

export async function getSupportTicketsPage(filter = {}) {
  try {
    const abortSignal = filter?.abortSignal;
    throwIfQueryAborted(abortSignal);
    const user = await getCurrentUser();
    throwIfQueryAborted(abortSignal);
    const statsFilter = filter.statsFilter || {};

    const countPromise = getSupportTicketExactCount(filter, true, user, abortSignal);
    const statsPromise = getSupportTicketsPageStats(statsFilter, true, user, abortSignal);

    const sortKey = SUPPORT_TICKET_SORT_FIELDS.has(filter.sortKey)
      ? filter.sortKey
      : 'created_at';
    const limit = Number(filter.limit);
    const offset = Number(filter.offset) || 0;

    const dataPromise = withRetry(async () => {
      let dataQuery = supabase.from(TABLE_NAME).select('*');
      dataQuery = applySupportTicketScope(dataQuery, user);
      dataQuery = applySupportTicketFilters(dataQuery, filter);
      dataQuery = dataQuery.order(sortKey, { ascending: filter.sortDirection === 'asc' });
      if (Number.isFinite(limit) && limit > 0) {
        dataQuery = dataQuery.range(offset, offset + limit - 1);
      }
      dataQuery = applyQueryAbortSignal(dataQuery, abortSignal);
      const result = await dataQuery;
      throwIfQueryAborted(abortSignal);
      if (result.error) throw result.error;
      return result;
    });

    const [{ count }, { data, error }, stats] = await Promise.all([
      countPromise.then((value) => ({ count: value })),
      dataPromise,
      statsPromise,
    ]);
    throwIfQueryAborted(abortSignal);

    if (error) throw error;

    const normalizedTickets = (data || []).map(normalizeSupportTicketRow);
    const nameMaps = await resolveSupportTicketNameMaps(
      normalizedTickets,
      abortSignal,
      Boolean(filter?.quiet)
    );
    throwIfQueryAborted(abortSignal);

    return {
      data: attachSupportTicketNames(normalizedTickets, nameMaps),
      count: count || 0,
      stats,
    };
  } catch (error) {
    if (!filter?.quiet) {
      console.error('Error fetching support tickets page:', error);
    }
    throw error;
  }
}
