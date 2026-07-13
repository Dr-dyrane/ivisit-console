export const PRICING_MUTATION_UNAVAILABLE_REASON = 'Price changes need a selected facility before they can run.';
export const PRICING_PROJECTION_UNAVAILABLE_MESSAGE = 'Pricing rules could not be verified for this scope.';
export const USD_CURRENCY = 'USD';
export const PRICING_QUERY_CHUNK_SIZE = 500;
export const PRICING_HOSPITAL_FILTER_LIMIT = 150;
export const PRICING_RECENT_DAYS = 30;

export const PRICING_FAMILY_CONFIG = Object.freeze({
  service: {
    table: 'service_pricing',
    searchColumns: ['service_name', 'service_type', 'description'],
  },
  room: {
    table: 'room_pricing',
    searchColumns: ['room_name', 'room_type', 'description'],
  },
});
