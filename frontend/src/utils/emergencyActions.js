import { canonicalizeEmergencyStatus, isTerminalEmergencyStatus } from './emergencyStatus';

const CASH_METHODS = new Set(['cash', 'cash_payment']);

const toLower = (value) => String(value ?? '').trim().toLowerCase();

export function getEmergencyActionState(request) {
  const canonicalStatus = canonicalizeEmergencyStatus(request?.status, request?.status);
  const status = toLower(canonicalStatus);
  const serviceType = toLower(request?.service_type || request?.serviceType);
  const paymentMethod = toLower(request?.payment_method || request?.payment_method_id);
  const paymentStatus = toLower(request?.payment_status);
  const hasAmbulance = Boolean(request?.ambulance_id);
  const isBedFlow = serviceType === 'bed' || serviceType === 'booking';
  const isTerminal = isTerminalEmergencyStatus(status);
  const canDispatch =
    !isTerminal &&
    status === 'in_progress' &&
    (isBedFlow || !hasAmbulance);
  const canComplete =
    !isTerminal &&
    (status === 'accepted' || status === 'arrived');
  const canProcessCash =
    status === 'completed' &&
    CASH_METHODS.has(paymentMethod) &&
    paymentStatus !== 'completed';
  const showClinicalRecord = status === 'completed' || status === 'cancelled';

  return {
    status,
    isTerminal,
    hasAmbulance,
    isBedFlow,
    canDispatch,
    canComplete,
    canProcessCash,
    showClinicalRecord,
  };
}
