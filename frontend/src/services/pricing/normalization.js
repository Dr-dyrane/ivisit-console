import {
  PRICING_FAMILY_CONFIG,
  USD_CURRENCY,
} from './constants';

export const normalizePricingFamily = (family = 'all') => {
  if (family === 'services' || family === 'service') return 'services';
  if (family === 'rooms' || family === 'room') return 'rooms';
  return 'all';
};

export const getFamiliesForPage = (family = 'all') => {
  const normalizedFamily = normalizePricingFamily(family);
  if (normalizedFamily === 'services') return ['service'];
  if (normalizedFamily === 'rooms') return ['room'];
  return ['service', 'room'];
};

export const getPricingTableForFamily = (family) => PRICING_FAMILY_CONFIG[family]?.table;

export const normalizeSearch = (value = '') => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const getPricingRowUpdatedAt = (row) => row.updated_at || row.created_at || null;

export const sortPricingRows = (a, b, direction = 'desc') => {
  const dateA = a?.updated_at ? new Date(a.updated_at).getTime() : null;
  const dateB = b?.updated_at ? new Date(b.updated_at).getTime() : null;
  const validA = Number.isFinite(dateA);
  const validB = Number.isFinite(dateB);

  if (validA && validB && dateA !== dateB) {
    return direction === 'asc' ? dateA - dateB : dateB - dateA;
  }
  if (validA !== validB) return validA ? -1 : 1;
  return String(a?.id || '').localeCompare(String(b?.id || ''));
};

export const normalizePricingRow = (row, family, hospitalMap) => {
  const hospitalId = row.hospital_id || null;
  const hospital = hospitalId ? hospitalMap.get(hospitalId) : null;
  const organizationId = hospital?.organization_id || null;
  const isService = family === 'service';
  const amount = Number(isService ? row.base_price : row.price_per_night) || 0;
  const name = isService ? row.service_name : row.room_name;
  const type = isService ? row.service_type : row.room_type;
  const sourceLabel = hospitalId ? 'facility price' : 'platform fallback';

  return {
    ...row,
    _pricingType: family,
    family,
    hospitalId,
    hospital_id: hospitalId,
    organizationId,
    organization_id: organizationId,
    facilityName: hospital?.name || null,
    sourceLabel,
    source_label: sourceLabel,
    name,
    type,
    amount,
    currency: USD_CURRENCY,
    active: null,
    updatedAt: getPricingRowUpdatedAt(row),
    unit: isService ? 'Unit' : 'Night'
  };
};

export const getScopedFamilyCount = (summary, scope) => {
  if (scope === 'global') return summary.globalFallbackCount;
  if (scope === 'override') return summary.facilityPriceCount;
  return summary.totalCount;
};

export const combinePricingSummaries = (familySummaries) => familySummaries.reduce((summary, family) => ({
  totalCount: summary.totalCount + family.totalCount,
  globalFallbackCount: summary.globalFallbackCount + family.globalFallbackCount,
  facilityPriceCount: summary.facilityPriceCount + family.facilityPriceCount,
  recentCount: summary.recentCount + family.recentCount,
}), {
  totalCount: 0,
  globalFallbackCount: 0,
  facilityPriceCount: 0,
  recentCount: 0,
});
