import { resolveVital } from '../../../constants/vitalTracks';
import { getEmergencyActionState } from '../../../utils/emergencyActions';
import { canonicalizeEmergencyStatus } from '../../../utils/emergencyStatus';

const KNOWN_STATUSES = new Set([
  'pending_approval',
  'payment_declined',
  'in_progress',
  'accepted',
  'arrived',
  'completed',
  'cancelled',
]);

const PAYMENT_READY_STATUSES = new Set(['paid', 'completed']);
const PAYMENT_READY_METHODS = new Set(['card', 'cash', 'cash_payment', 'wallet']);
const PROGRESS_KEYS = ['pending_approval', 'accepted', 'arrived', 'completed'];

const clean = (value) => String(value ?? '').trim();
const normalized = (value) => clean(value).toLowerCase();
const hasValue = (value) => clean(value).length > 0;

const makeAction = ({ kind, label, available, receiver = null, reason = null }) => ({
  kind,
  label,
  available: Boolean(available),
  receiver,
  reason: available ? null : reason,
});

const getAssignmentEvidence = (request) => {
  const assignmentId = clean(request?.current_responder_assignment_id);
  const ambulanceId = clean(request?.ambulance_id);
  const responderId = clean(request?.responder_id);
  const hasResponderSnapshot = hasValue(request?.responder_name)
    || hasValue(request?.responder_vehicle_plate);
  const hasAny = Boolean(assignmentId || ambulanceId || responderId || hasResponderSnapshot);
  const hasOffer = Boolean(assignmentId && ambulanceId && !responderId);
  const hasAccepted = Boolean(assignmentId && ambulanceId && responderId);

  return {
    assignmentId: assignmentId || null,
    ambulanceId: ambulanceId || null,
    responderId: responderId || null,
    hasAny,
    hasOffer,
    hasAccepted,
    degraded: hasAny && !hasOffer && !hasAccepted,
  };
};

const getPaymentEvidence = (request) => {
  const paymentId = clean(request?.payment_id);
  const status = normalized(request?.payment_status);
  const method = normalized(request?.payment_method || request?.payment_method_id);
  return {
    paymentId: paymentId || null,
    status: status || null,
    method: method || null,
    ready: Boolean(
      paymentId
      && PAYMENT_READY_STATUSES.has(status)
      && PAYMENT_READY_METHODS.has(method)
    ),
  };
};

const getArrivalEvidence = (request) => {
  const patientAcknowledgedAt = clean(request?.patient_acknowledged_arrival_at);
  return {
    patientAcknowledgedAt: patientAcknowledgedAt || null,
    acknowledged: Boolean(patientAcknowledgedAt),
  };
};

const getStatusLabel = ({ status, service, assignment, payment, request, arrival }) => {
  if (status === 'pending_approval') return 'Needs attention';
  if (status === 'payment_declined') return 'Payment issue';
  if (status === 'arrived') return arrival.acknowledged ? 'Arrival confirmed' : 'Arrived';
  if (status === 'completed') return 'Completed';
  if (status === 'cancelled') return 'Cancelled';

  if (status === 'accepted') {
    if (service.isAmbulance && assignment.hasAccepted) return 'Dispatched';
    return 'Accepted';
  }

  if (status === 'in_progress') {
    if (service.isAmbulance && assignment.hasOffer) return 'Awaiting responder';
    if (assignment.hasAny) return 'Assignment pending';
    if (!payment.ready) return 'Awaiting payment';
    if (service.isBed && !hasValue(request?.hospital_id)) return 'Facility needed';
    if (service.isAmbulance) return 'Ready to dispatch';
    if (service.isBed) return 'Ready to accept';
    return 'In progress';
  }

  return 'Unknown status';
};

const getProgressCurrentKey = ({ status, assignment, request }) => {
  if (status === 'completed') return 'completed';
  if (status === 'arrived') return 'arrived';
  if (status === 'accepted') return 'accepted';
  if (status === 'cancelled') {
    if (hasValue(request?.arrived_at)) return 'arrived';
    if (assignment.hasAny) return 'accepted';
  }
  return 'pending_approval';
};

const getDispatchReason = ({
  actionState,
  assignment,
  canManage,
  payment,
  receiverAvailable,
  request,
  service,
  status,
}) => {
  if (!receiverAvailable) return 'Dispatch receiver is unavailable.';
  if (!canManage) return 'Your role cannot dispatch this request.';
  if (!hasValue(request?.id)) return 'Request identity is unavailable.';
  if (!service.dispatchReceiver) return 'This service has no supported dispatch receiver.';
  if (status !== 'in_progress') return 'This request is not awaiting dispatch.';
  if (assignment.hasAny) return 'A responder assignment is already active or unresolved.';
  if (!payment.ready) return 'Backend payment confirmation is not visible.';
  if (service.isBed && !hasValue(request?.hospital_id)) return 'A facility is required before accepting this bed request.';
  if (!actionState.canDispatch) return 'The canonical lifecycle does not allow dispatch.';
  return null;
};

const getCompleteReason = ({
  actionState,
  assignment,
  canComplete,
  receiverAvailable,
  request,
  service,
  status,
}) => {
  if (!receiverAvailable) return 'Completion receiver is unavailable.';
  if (!hasValue(request?.id)) return 'Request identity is unavailable.';
  if (!service.completeReceiver) return 'This service has no supported completion receiver.';
  if (!canComplete) return 'Your role or assignment cannot complete this request.';
  if (service.isAmbulance && status !== 'arrived') return 'The assigned responder must arrive before completion.';
  if (service.isAmbulance && !assignment.hasAccepted) return 'Current responder assignment evidence is incomplete.';
  if (service.isBed && status !== 'accepted' && status !== 'arrived') {
    return 'The bed request must be accepted before completion.';
  }
  if (!actionState.canComplete) return 'The canonical lifecycle does not allow completion.';
  return null;
};

export const canActorCompleteEmergency = (request, {
  canManage = false,
  isProvider = false,
  userId = null,
} = {}) => {
  const serviceType = normalized(request?.service_type || request?.serviceType);
  if (serviceType === 'bed') return Boolean(canManage);
  if (serviceType !== 'ambulance') return false;

  const assignment = getAssignmentEvidence(request);
  return Boolean(
    isProvider
    && hasValue(userId)
    && assignment.hasAccepted
    && assignment.responderId === clean(userId)
  );
};

export const buildEmergencyLifecyclePresentation = (request = {}, {
  canManage = false,
  canComplete = false,
  receivers = {},
} = {}) => {
  const canonicalStatus = canonicalizeEmergencyStatus(request?.status, 'unknown');
  const status = normalized(canonicalStatus) || 'unknown';
  const serviceType = normalized(request?.service_type || request?.serviceType);
  const service = {
    type: serviceType || 'unknown',
    isAmbulance: serviceType === 'ambulance',
    isBed: serviceType === 'bed',
    dispatchReceiver: serviceType === 'ambulance'
      ? 'console_dispatch_emergency'
      : serviceType === 'bed'
        ? 'console_accept_bed_emergency'
        : null,
    completeReceiver: serviceType === 'ambulance'
      ? 'responder_complete_emergency'
      : serviceType === 'bed'
        ? 'console_complete_emergency'
        : null,
  };
  const assignment = getAssignmentEvidence(request);
  const payment = getPaymentEvidence(request);
  const arrival = getArrivalEvidence(request);
  const actionState = getEmergencyActionState(request);
  const knownStatus = KNOWN_STATUSES.has(status);
  const baseVital = resolveVital('emergency', status);
  const label = getStatusLabel({ status, service, assignment, payment, request, arrival });
  const currentKey = getProgressCurrentKey({ status, assignment, request });
  const responseStepLabel = service.isAmbulance ? 'Response' : 'Accepted';
  const progressSteps = [
    { key: 'pending_approval', label: 'Requested' },
    { key: 'accepted', label: responseStepLabel },
    { key: 'arrived', label: 'Arrived' },
    { key: 'completed', label: 'Completed' },
  ];

  const dispatchReason = getDispatchReason({
    actionState,
    assignment,
    canManage,
    payment,
    receiverAvailable: receivers.dispatch === true,
    request,
    service,
    status,
  });
  const completeReason = getCompleteReason({
    actionState,
    assignment,
    canComplete,
    receiverAvailable: receivers.complete === true,
    request,
    service,
    status,
  });
  const details = makeAction({
    kind: 'details',
    label: 'Details',
    available: receivers.details === true,
    receiver: 'request_detail',
    reason: 'Request detail receiver is unavailable.',
  });
  const review = makeAction({
    kind: 'review',
    label: 'Review',
    available: status === 'pending_approval' && details.available,
    receiver: 'request_detail',
    reason: status === 'pending_approval'
      ? details.reason
      : 'This request does not need approval review.',
  });
  const dispatch = makeAction({
    kind: 'dispatch',
    label: service.isBed ? 'Accept bed' : 'Dispatch',
    available: dispatchReason === null,
    receiver: service.dispatchReceiver,
    reason: dispatchReason,
  });
  const complete = makeAction({
    kind: 'complete',
    label: 'Complete',
    available: completeReason === null,
    receiver: service.completeReceiver,
    reason: completeReason,
  });
  const retryPayment = makeAction({
    kind: 'retry',
    label: 'Retry payment',
    available: false,
    receiver: null,
    reason: 'Payment retry has no supported Console receiver.',
  });
  const cancel = makeAction({
    kind: 'cancel',
    label: 'Cancel request',
    available: Boolean(
      knownStatus
      && canManage
      && receivers.cancel === true
      && hasValue(request?.id)
      && actionState.canCancel
    ),
    receiver: 'console_cancel_emergency',
    reason: 'Cancellation is unavailable for this request.',
  });

  let primary = details;
  if (review.available) primary = review;
  else if (dispatch.available) primary = dispatch;
  else if (complete.available) primary = complete;
  else if (retryPayment.available) primary = retryPayment;

  const secondary = primary.kind === 'details' || !details.available ? [] : [details];

  return {
    status: {
      key: status,
      styleKey: knownStatus ? status : 'unknown',
      label,
      terminal: actionState.isTerminal,
      degraded: assignment.degraded || !knownStatus,
      pill: {
        label,
        className: baseVital?.pill?.className || 'bg-muted/34 text-muted-foreground',
      },
    },
    progress: {
      steps: progressSteps,
      keys: PROGRESS_KEYS,
      currentKey,
      activeIndex: Math.max(0, PROGRESS_KEYS.indexOf(currentKey)),
      tone: baseVital?.tone || 'hsl(var(--muted-foreground))',
      cancelled: status === 'cancelled' || status === 'payment_declined' || !knownStatus,
    },
    service,
    assignment,
    payment,
    arrival,
    actions: {
      review,
      dispatch,
      complete,
      retryPayment,
      cancel,
      details,
      primary,
      secondary,
    },
    actionState: {
      canDispatch: dispatch.available,
      canComplete: complete.available,
      canRetryPayment: retryPayment.available,
      canCancel: cancel.available,
      canProcessCash: actionState.canProcessCash,
      isBedFlow: service.isBed,
    },
  };
};
