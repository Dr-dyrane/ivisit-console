/**
 * Pricing service compatibility facade.
 *
 * Keep existing imports stable while projection, compatibility read, and RPC
 * command ownership live in focused modules under ./pricing.
 */

export { getPricingPageData } from './pricing/pageData';
export { getPricing } from './pricing/reads';
export {
  deleteRoomPricing,
  deleteServicePricing,
  saveRoomPricing,
  saveServicePricing,
} from './pricing/commands';
