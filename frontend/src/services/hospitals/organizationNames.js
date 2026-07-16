import { supabase } from '../../lib/supabase';
import { withRetry } from '../supabaseHelpers';
import { applyQueryAbortSignal, throwIfQueryAborted } from '../queryAbort';

// --- Read-only owning-organization resolution at the projection boundary (ADOPT-60) ---
// hospitals.organization_id is a bare UUID; mirroring the support-tickets page
// projection, ONE batched organizations read runs after the page window lands
// and maps organizations.name onto the rows as organization_name. Resolution
// failure is non-fatal: RLS-blocked or failed reads leave organization_name
// null and the surfaces render their honest fallbacks. No write path changes.

export async function resolveHospitalOrganizationNames(rows, abortSignal, quiet = false) {
  const organizationIds = [...new Set(
    rows.map((row) => row?.organization_id).filter(Boolean)
  )];
  const organizationNames = new Map();

  if (organizationIds.length === 0) {
    return organizationNames;
  }

  try {
    const { data, error } = await withRetry(async () => {
      const result = await applyQueryAbortSignal(
        supabase.from('organizations').select('id, name').in('id', organizationIds),
        abortSignal
      );
      throwIfQueryAborted(abortSignal);
      if (result.error) throw result.error;
      return result;
    });
    if (error) throw error;

    (data || []).forEach((organization) => {
      if (organization?.id) {
        organizationNames.set(organization.id, String(organization.name || '').trim() || null);
      }
    });
  } catch (error) {
    throwIfQueryAborted(abortSignal);
    if (!quiet) {
      console.error('Error resolving hospital organization names:', error);
    }
  }

  return organizationNames;
}

export const attachHospitalOrganizationNames = (rows, organizationNames) => (
  rows.map((row) => ({
    ...row,
    organization_name: row?.organization_id
      ? (organizationNames.get(row.organization_id) || null)
      : null,
  }))
);
