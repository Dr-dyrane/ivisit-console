import { supabase } from '../../lib/supabase';

// ADOPT-64 read-only resolved-price preview.
//
// Pure-read proof: supabase/migrations/20260219010000_core_rpcs.sql defines
// get_service_price (lines 1624-1638) and get_room_price (lines 1641-1655)
// as SELECT-only STABLE functions with no INSERT/UPDATE/DELETE, and no
// migration revokes their default EXECUTE grant, so the console's
// authenticated role can call them. This module never writes.
const RESOLVED_PRICE_RPCS = Object.freeze({
  service: 'get_service_price',
  room: 'get_room_price',
});

const buildResolvedPriceArgs = (family, resolutionType, hospitalId) => (
  family === 'service'
    ? { p_service_type: resolutionType, p_hospital_id: hospitalId || null }
    : { p_room_type: resolutionType, p_hospital_id: hospitalId || null }
);

export const getResolvedPricePreview = async ({
  family,
  type,
  hospitalId = null,
} = {}) => {
  const rpcName = RESOLVED_PRICE_RPCS[family];
  const resolutionType = typeof type === 'string' ? type.trim() : '';
  if (!rpcName || !resolutionType) {
    return { status: 'unavailable', row: null };
  }

  const { data, error } = await supabase.rpc(
    rpcName,
    buildResolvedPriceArgs(family, resolutionType, hospitalId),
  );
  if (error) throw error;

  const rows = Array.isArray(data) ? data : (data ? [data] : []);
  const row = rows[0] || null;
  // Honest nulls: '' coerces to 0 through Number(), so require a real numeric
  // price before claiming a resolution instead of inventing $0.00.
  const price = row?.price;
  if (price === null || price === undefined || price === '' || !Number.isFinite(Number(price))) {
    return { status: 'empty', row: null };
  }

  return {
    status: 'resolved',
    row: {
      name: row.service_name || row.room_name || null,
      price: Number(price),
      currency: row.currency || null,
    },
  };
};
