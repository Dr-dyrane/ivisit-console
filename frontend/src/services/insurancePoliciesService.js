/**
 * Legacy Insurance Policies Service
 *
 * Active policy reads belong to insuranceService.getInsurancePage().
 * This adapter keeps old export names only where compatibility is needed.
 */

import {
  createInsurancePolicy as createInsurancePolicyThroughOwner,
  deleteInsurancePolicy as deleteInsurancePolicyThroughOwner,
  updateInsurancePolicy as updateInsurancePolicyThroughOwner,
} from './insuranceService';

const legacyReadError = () => {
  throw new Error('Legacy insurance policy reads are unavailable; use getInsurancePage() from insuranceService.');
};

const legacyRealtimeError = () => {
  throw new Error('Legacy insurance policy realtime is unavailable; use route-owned subscribeToInsurancePolicies() from insuranceService.');
};

/**
 * Compatibility export. Reads are owned by insuranceService.getInsurancePage().
 */
export async function getInsurancePolicies() {
  return legacyReadError();
}

/**
 * Compatibility export. Reads are owned by insuranceService.getInsurancePage().
 */
export async function getInsurancePolicy() {
  return legacyReadError();
}

/**
 * Compatibility export. Writes are owned by insuranceService.
 */
export async function createInsurancePolicy(input) {
  return createInsurancePolicyThroughOwner(input);
}

/**
 * Compatibility export. Writes are owned by insuranceService.
 */
export async function updateInsurancePolicy(policyId, input) {
  return updateInsurancePolicyThroughOwner(policyId, input);
}

/**
 * Compatibility export. Writes are owned by insuranceService.
 */
export async function deleteInsurancePolicy(policyId) {
  return deleteInsurancePolicyThroughOwner(policyId);
}

/**
 * Compatibility export. User policy reads are owned by insuranceService.getInsurancePage().
 */
export async function getUserInsurancePolicies() {
  return legacyReadError();
}

/**
 * Compatibility export. Active coverage reads are owned by proved app/patient flows.
 */
export async function getUserActiveInsurancePolicies() {
  return legacyReadError();
}

/**
 * Compatibility export. Do not convert unavailable coverage truth into false.
 */
export async function isPolicyActive() {
  return legacyReadError();
}

/**
 * Compatibility export. Do not convert unavailable coverage truth into false.
 */
export async function verifyCoverage() {
  return legacyReadError();
}

/**
 * Compatibility export. Writes are owned by insuranceService.
 */
export async function updatePolicyDocuments(policyId, frontImageUrl, backImageUrl) {
  return updateInsurancePolicyThroughOwner(policyId, {
    front_image_url: frontImageUrl,
    back_image_url: backImageUrl,
  });
}

/**
 * Compatibility export. Realtime is route-owned by insuranceService.
 */
export function subscribeToInsurancePolicy() {
  return legacyRealtimeError();
}

/**
 * Compatibility export. Realtime is route-owned by insuranceService.
 */
export function subscribeToUserInsurancePolicies() {
  return legacyRealtimeError();
}
