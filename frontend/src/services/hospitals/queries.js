import { supabase } from '../../lib/supabase';
import { isValidUUID } from '../../lib/utils';
import { withRetry } from '../supabaseHelpers';
import { applyQueryAbortSignal, throwIfQueryAborted } from '../queryAbort';
import { HOSPITAL_SORT_FIELDS, TABLE_NAME } from './constants';
import { applyHospitalFilters } from './filters';

/**
 * Read hospital rows through database RLS with optional filters and paging.
 */
export async function getHospitals(filter = {}) {
  try {
    const abortSignal = filter?.abortSignal;
    throwIfQueryAborted(abortSignal);
    const { data, error, count } = await withRetry(async () => {
      let query = filter?.count
        ? supabase.from(TABLE_NAME).select('*', { count: 'exact' })
        : supabase.from(TABLE_NAME).select('*');

      query = applyHospitalFilters(query, filter);

      const sortKey = HOSPITAL_SORT_FIELDS.has(filter?.sortKey) ? filter.sortKey : 'created_at';
      query = query.order(sortKey, { ascending: filter?.sortDirection === 'asc' });

      if (filter?.offset !== undefined && filter?.offset !== null) {
        query = query.range(filter.offset, filter.offset + (filter.limit || 10) - 1);
      } else if (filter?.limit) {
        query = query.limit(filter.limit);
      }
      query = applyQueryAbortSignal(query, abortSignal);

      const result = await query;
      throwIfQueryAborted(abortSignal);
      if (result.error) throw result.error;
      return result;
    });
    if (error) throw error;

    const result = data || [];
    if (filter?.count) {
      return { data: result, count: Number.isFinite(count) ? count : result.length };
    }

    return result;
  } catch (error) {
    if (!filter?.quiet) {
      console.error('Error fetching hospitals:', error);
    }
    throw error;
  }
}

/**
 * Narrow facility identity projection for selectors owned by other domains.
 * Database RLS remains the visibility owner; no operational fields are returned.
 */
export async function getHospitalOptions() {
  return withRetry(async () => {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('id, name')
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  });
}

/**
 * Resolve a facility by canonical UUID or its display ID label.
 */
export async function getHospital(hospitalId, { abortSignal } = {}) {
  try {
    throwIfQueryAborted(abortSignal);
    const { data, error } = await withRetry(async () => {
      let query = supabase.from(TABLE_NAME).select('*');

      if (isValidUUID(hospitalId)) {
        query = query.eq('id', hospitalId);
      } else {
        query = query.eq('display_id', hospitalId);
      }
      query = applyQueryAbortSignal(query, abortSignal);

      const result = await query.maybeSingle();
      throwIfQueryAborted(abortSignal);
      if (result.error && result.error.code !== 'PGRST116') throw result.error;
      return result;
    });

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  } catch (error) {
    console.error(`Error fetching hospital ${hospitalId}:`, error);
    throw error;
  }
}

export async function getVerifiedHospitals() {
  try {
    const { data, error } = await withRetry(async () => {
      const result = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('verified', true)
        .order('rating', { ascending: false });
      if (result.error) throw result.error;
      return result;
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching verified hospitals:', error);
    throw error;
  }
}

export async function getHospitalsBySpecialty(specialty) {
  try {
    const { data, error } = await withRetry(async () => {
      const result = await supabase
        .from(TABLE_NAME)
        .select('*')
        .contains('specialties', [specialty])
        .order('rating', { ascending: false });
      if (result.error) throw result.error;
      return result;
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error(`Error fetching hospitals by specialty ${specialty}:`, error);
    throw error;
  }
}
