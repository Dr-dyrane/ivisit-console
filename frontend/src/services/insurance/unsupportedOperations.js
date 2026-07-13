const throwLegacyInsuranceReadUnavailable = () => {
  throw new Error('Legacy insurance policy reads are unavailable; use getInsurancePage() from insuranceService.');
};

export function buildInsuranceWritePayload(
  _input = {},
  _options = {}
) {
  throw new Error('Insurance write payload construction is unavailable until admin policy authority is verified.');
}

export async function getInsurancePolicies() {
  return throwLegacyInsuranceReadUnavailable();
}

export async function getInsurancePolicy() {
  return throwLegacyInsuranceReadUnavailable();
}

export async function createInsurancePolicy() {
  throw new Error('Insurance policy create is unavailable until admin policy authority is verified.');
}

export async function updateInsurancePolicy() {
  throw new Error('Insurance policy update is unavailable until admin policy authority is verified.');
}

export async function deleteInsurancePolicy() {
  throw new Error('Insurance policy delete is unavailable until admin policy authority is verified.');
}

export async function updatePolicyStatus() {
  throw new Error('Insurance policy status update is unavailable until admin policy authority is verified.');
}

export async function verifyInsurancePolicy() {
  throw new Error('Insurance policy verification is unavailable until admin policy authority is verified.');
}

export async function getInsuranceAnalytics() {
  throw new Error('Insurance analytics export is unavailable until route-wide distribution scope is verified.');
}

export async function uploadInsuranceCardImage() {
  throw new Error('Insurance card upload is unavailable until private storage ownership is verified.');
}
