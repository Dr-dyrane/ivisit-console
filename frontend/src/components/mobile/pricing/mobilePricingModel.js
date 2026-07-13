import { resolveAdaptiveGroups } from '../../../utils/adaptiveGrouping';

export const formatPricingLabel = (value, fallback = 'Unknown') => String(value || fallback)
  .replace(/_/g, ' ')
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

export const getMobilePricingAmount = (item = {}) => Number(
  item.amount ?? item.base_price ?? item.price_per_night ?? 0,
) || 0;

export const getMobilePricingFamily = (item = {}) => (
  item.family
  || item._pricingType
  || (item.price_per_night !== undefined ? 'room' : 'service')
);

export const getMobilePricingUpdatedAt = (item = {}) => (
  item.updatedAt || item.updated_at || item.created_at
);

export const isMobileGlobalPricingRule = (item = {}) => (
  !item.organization_id && !item.hospital_id
);

export const formatMobilePricingMoney = (item = {}) => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: item.currency || 'USD',
}).format(getMobilePricingAmount(item));

export const getMobilePricingCounts = ({ pricingProjection, allPricing = [] }) => {
  const summary = pricingProjection?.summary || {};
  const total = Number(pricingProjection?.totalCount ?? allPricing.length ?? 0);

  return {
    all: total,
    global: Number(
      summary.globalFallbackCount
      ?? allPricing.filter(isMobileGlobalPricingRule).length,
    ),
    override: Number(
      summary.facilityPriceCount
      ?? allPricing.filter((item) => !isMobileGlobalPricingRule(item)).length,
    ),
  };
};

export const getMobilePricingKpis = (counts) => [
  {
    id: 'all',
    label: 'Rules',
    value: counts.all,
    color: 'hsl(var(--muted-foreground))',
  },
  {
    id: 'global',
    label: 'Platform',
    value: counts.global,
    color: 'hsl(199 89% 38%)',
  },
  {
    id: 'override',
    label: 'Facility',
    value: counts.override,
    color: 'hsl(162 94% 24%)',
  },
];

export const getMobilePricingScopeCount = (counts, kpiFilter) => {
  if (kpiFilter === 'global') return counts.global;
  if (kpiFilter === 'override') return counts.override;
  return counts.all;
};

export const hasMobilePricingFilters = ({ searchTerm, kpiFilter, activeTab }) => (
  Boolean(searchTerm) || kpiFilter !== 'all' || activeTab !== 'all'
);

export const getMobilePricingGroups = (items) => resolveAdaptiveGroups(items, [
  {
    key: 'scope',
    assign: (item) => (isMobileGlobalPricingRule(item) ? 'platform' : 'facility'),
    labelFor: (key) => (key === 'platform' ? 'Platform fallback' : 'Facility price'),
    order: (keys) => ['facility', 'platform'].filter((key) => keys.includes(key)),
  },
  {
    type: 'coarse-recency',
    key: 'updated',
    getDate: getMobilePricingUpdatedAt,
  },
]).groups;

export const getMobilePricingTitle = (item = {}) => (
  item.name || item.service_name || item.room_name || 'Unnamed price'
);

export const getMobilePricingMeta = (item = {}) => (
  `${formatMobilePricingMoney(item)} / ${getMobilePricingFamily(item) === 'room' ? 'night' : 'unit'} / ${isMobileGlobalPricingRule(item) ? 'Platform fallback' : item.facilityName || item.facility_name || 'Facility price'}`
);
