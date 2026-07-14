import { supabase } from '../../lib/supabase';
import { isValidUUID } from '../../lib/utils';
import { applyAuthFilter, getCurrentUser } from '../authService';
import { withRetry } from '../supabaseHelpers';
import { TABLE_NAME } from './constants';
import { normalizeVisitForUI } from './normalization';
import {
  applyGenericVisitSourceScope,
  GENERIC_VISIT_WITH_PATIENT_SELECT,
} from './pageProjection';

const applyGenericVisitReadScope = (query, user) => applyGenericVisitSourceScope(
  applyAuthFilter(query, user, {
    userIdField: 'user_id',
    orgIdField: 'hospital_id',
    providerIdField: 'doctor_name',
    resourceType: 'visit',
  })
);

/**
 * Get all visits with optional filters.
 * Admin users can see all visits; other roles remain scoped by applyAuthFilter.
 */
export async function getVisits(filter = {}) {
  try {
    const user = await getCurrentUser();

    // Rebuild the PostgREST builder for every retry attempt.
    const data = await withRetry(async () => {
      let query = supabase.from(TABLE_NAME).select(GENERIC_VISIT_WITH_PATIENT_SELECT);

      query = applyGenericVisitReadScope(query, user);

      if (filter.user_id) {
        query = query.eq('user_id', filter.user_id);
      }
      if (filter?.doctor) {
        query = query.eq('doctor_name', filter.doctor);
      }
      if (filter?.doctor_name) {
        query = query.eq('doctor_name', filter.doctor_name);
      }
      if (filter?.hospital_id) {
        query = query.eq('hospital_id', filter.hospital_id);
      }
      if (filter?.status) {
        query = query.eq('status', filter.status);
      }
      if (filter?.type) {
        query = query.eq('type', filter.type);
      }
      if (filter?.visit_type) {
        query = query.eq('type', filter.visit_type);
      }
      if (filter?.date_from) {
        query = query.gte('date', filter.date_from);
      }
      if (filter?.date_to) {
        query = query.lte('date', filter.date_to);
      }

      query = query.order('date', { ascending: false });

      if (filter?.limit) {
        query = query.limit(filter.limit);
      }
      if (filter?.offset) {
        query = query.range(filter.offset, filter.offset + (filter.limit || 10) - 1);
      }

      const { data: rows, error } = await query;
      if (error) throw error;
      return rows;
    });

    return (data || []).map(normalizeVisitForUI);
  } catch (error) {
    if (!filter?.quiet) {
      console.error('Error fetching visits.');
    }
    throw error;
  }
}

/**
 * Get a visit by canonical UUID or read-only display ID.
 */
export async function getVisit(visitId) {
  try {
    const user = await getCurrentUser();
    const data = await withRetry(async () => {
      let query = supabase
        .from(TABLE_NAME)
        .select(GENERIC_VISIT_WITH_PATIENT_SELECT);

      query = applyGenericVisitReadScope(query, user);

      if (isValidUUID(visitId)) {
        query = query.eq('id', visitId);
      } else {
        query = query.eq('display_id', visitId);
      }

      const { data: row, error } = await query.maybeSingle();
      if (error) throw error;
      return row;
    });

    if (data) return normalizeVisitForUI(data);

    return null;
  } catch (error) {
    console.error('Error fetching visit.');
    throw error;
  }
}

/**
 * Read request-derived clinical evidence by visits.request_id first.
 * The legacy id/display-id path remains a fallback for historical rows.
 */
export async function getVisitByRequestId(requestId) {
  try {
    if (!requestId) return null;
    const user = await getCurrentUser();

    const data = await withRetry(async () => {
      let query = supabase
        .from(TABLE_NAME)
        .select(GENERIC_VISIT_WITH_PATIENT_SELECT);

      query = applyGenericVisitReadScope(query, user)
        .eq('request_id', requestId)
        .order('updated_at', { ascending: false })
        .limit(1);

      const { data: row, error } = await query.maybeSingle();
      if (error) throw error;
      return row;
    });

    if (data) return normalizeVisitForUI(data);

    return getVisit(requestId);
  } catch (error) {
    console.error('Error fetching visit for request.');
    throw error;
  }
}
