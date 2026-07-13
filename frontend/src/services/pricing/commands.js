import { supabase } from '../../lib/supabase';

const resolveHospitalIdForPricing = async (item) => {
  if (item.hospital_id) return item.hospital_id;

  if (!item.organization_id) return null; // global pricing

  const { data, error } = await supabase
    .from('hospitals')
    .select('id')
    .eq('organization_id', item.organization_id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data?.id) {
    throw new Error('No hospital found for the selected organization. Create a hospital first to manage organization pricing.');
  }

  return data.id;
};

export const saveServicePricing = async (item) => {
  const hospitalId = await resolveHospitalIdForPricing(item);
  const payload = {
    id: item.id || null,
    hospital_id: hospitalId,
    service_type: item.service_type || item.category,
    service_name: item.service_name,
    base_price: item.base_price,
    description: item.description ?? item.metadata?.description ?? null
  };

  const { data, error } = await supabase.rpc('upsert_service_pricing', {
    payload
  });

  if (error) throw error;
  if (data && !data.success) throw new Error(data.error);
  return data;
};

export const deleteServicePricing = async (id) => {
  const { data, error } = await supabase.rpc('delete_service_pricing', {
    target_id: id
  });

  if (error) throw error;
  if (data && !data.success) throw new Error(data.error);
  return data;
};

export const saveRoomPricing = async (item) => {
  const hospitalId = await resolveHospitalIdForPricing(item);
  const payload = {
    id: item.id || null,
    hospital_id: hospitalId,
    room_name: item.room_name,
    room_type: item.room_type,
    price_per_night: item.price_per_night,
    description: item.description || null
  };

  const { data, error } = await supabase.rpc('upsert_room_pricing', {
    payload
  });

  if (error) throw error;
  if (data && !data.success) throw new Error(data.error);
  return data;
};

export const deleteRoomPricing = async (id) => {
  const { data, error } = await supabase.rpc('delete_room_pricing', {
    target_id: id
  });

  if (error) throw error;
  if (data && !data.success) throw new Error(data.error);
  return data;
};
