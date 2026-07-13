import { supabase } from '../../lib/supabase';

export const getPricing = async (type = 'services', organizationId = null) => {
  const table = type === 'services' ? 'service_pricing' : 'room_pricing';
  const [{ data: hospitals, error: hospitalsError }, { data, error }] = await Promise.all([
    supabase.from('hospitals').select('id, organization_id'),
    supabase.from(table).select('*').order('updated_at', { ascending: false })
  ]);

  if (hospitalsError) throw hospitalsError;
  if (error) throw error;

  const hospitalOrgMap = new Map((hospitals || []).map(h => [h.id, h.organization_id]));
  let normalized = (data || []).map(item => ({
    ...item,
    organization_id: item.organization_id ?? (item.hospital_id ? hospitalOrgMap.get(item.hospital_id) || null : null)
  }));

  if (organizationId) {
    // Return items that are global OR mapped to this organization (hospital-scoped pricing)
    normalized = normalized.filter(item => !item.hospital_id || item.organization_id === organizationId);
  }

  return normalized;
};
