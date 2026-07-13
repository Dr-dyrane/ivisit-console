/**
 * Insurance service compatibility facade.
 *
 * Policy and billing projections remain separate read-only boundaries. Unsupported
 * policy commands stay fail closed until receiver authority is proved.
 */

export {
  getInsurancePage,
  getInsurancePageStats,
} from './insurance/policyProjection';
export { normalizeInsurancePolicy } from './insurance/policyNormalization';
export {
  getInsuranceBillingOutcomes,
  getInsuranceBillingOutcomeStats,
} from './insurance/billingProjection';
export { normalizeInsuranceBillingOutcome } from './insurance/billingNormalization';
export {
  buildInsuranceWritePayload,
  createInsurancePolicy,
  deleteInsurancePolicy,
  getInsuranceAnalytics,
  getInsurancePolicies,
  getInsurancePolicy,
  updateInsurancePolicy,
  updatePolicyStatus,
  uploadInsuranceCardImage,
  verifyInsurancePolicy,
} from './insurance/unsupportedOperations';
export {
  subscribeToInsuranceBillingOutcomes,
  subscribeToInsurancePolicies,
} from './insurance/realtime';
