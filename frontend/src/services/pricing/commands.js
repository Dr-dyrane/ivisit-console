import { supabase } from '../../lib/supabase';

const resolveHospitalIdForPricing = (item = {}) => {
  if (item.hospital_id) return item.hospital_id;

  // Pricing rows are keyed by hospital_id. Picking an arbitrary hospital for
  // an organization would change one facility while describing the result as
  // an organization-wide rule, so dormant command callers must select one.
  if (item.organization_id) {
    throw new Error('Select a facility before changing organization pricing.');
  }

  return null; // explicit platform fallback
};

export const saveServicePricing = async (item) => {
  const hospitalId = resolveHospitalIdForPricing(item);
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
  const hospitalId = resolveHospitalIdForPricing(item);
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
