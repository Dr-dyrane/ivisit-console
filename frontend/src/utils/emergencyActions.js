import { canonicalizeEmergencyStatus, isTerminalEmergencyStatus } from './emergencyStatus';
import { canTransition } from './transitions';

const CASH_METHODS = new Set(['cash', 'cash_payment']);

const toLower = (value) => String(value ?? '').trim().toLowerCase();

/**
 * getEmergencyActionState - operator action legality for one emergency request.
 *
 * Re-expressed over the L4 emergency transition table (constants/lifecycles.js
 * via utils/transitions.js, CONSOLE_LAYER_MODEL_PLAN.md step S2-2): the state
 * transitions (dispatch / complete / retryPayment) are read from the table via
 * canTransition, then constrained by record-shape guards (bed flow, ambulance
 * presence, patient id). Exported here under the original name so existing call
 * sites keep working unchanged (utils/recordUrgency.js:51, the EmergencyRequest
 * list/table views, and EmergencyRequestsPage). The returned object shape is
 * unchanged and is pinned by EmergencyRequestsPage.contract.test.js.
 */
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
    canTransition('emergency', status, 'dispatch') &&
    (isBedFlow || !hasAmbulance);
  const canComplete = canTransition('emergency', status, 'complete');
  const hasUnsettledCash =
    status === 'completed' &&
    CASH_METHODS.has(paymentMethod) &&
    paymentStatus !== 'completed';
  const canRetryPayment =
    canTransition('emergency', status, 'retryPayment') && Boolean(request?.user_id);
  const canCancel = !isTerminal;
  const showClinicalRecord = status === 'completed' || status === 'cancelled';

  return {
    status,
    isTerminal,
    hasAmbulance,
    isBedFlow,
    canDispatch,
    canComplete,
    canProcessCash: false,
    canCancel,
    hasUnsettledCash,
    cashDisabledReason: hasUnsettledCash
      ? 'Manual cash settlement is blocked until Pass 2 finance authority is implemented.'
      : null,
    canRetryPayment,
    showClinicalRecord,
  };
}
