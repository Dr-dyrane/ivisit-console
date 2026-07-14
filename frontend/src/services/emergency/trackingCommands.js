import {
  getResponderTelemetryState,
  reportResponderTelemetry,
} from '../emergencyResponseService';

export function updateResponderLocation(context) {
  return reportResponderTelemetry(context);
}

export function getResponderLocationState(requestId) {
  return getResponderTelemetryState(requestId);
}

export async function updatePatientLocation() {
  throw new Error('Patient location is patient-owned and cannot be changed from Console.');
}
