import React from 'react';
import {
  Ambulance,
  BedDouble,
  Calendar,
  CheckCheck,
  ClipboardCheck,
  Clock,
  CreditCard,
  Eye,
  Hash,
  Hospital,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Send,
  User,
  X,
} from 'lucide-react';
import { MobileDetailSheet } from '../MobileDetailSheet';
import { FEEDBACK_TYPES } from '../../../contexts/FeedbackContext';
import { canonicalizeEmergencyStatus } from '../../../utils/emergencyStatus';
import { getEmergencyActionState } from '../../../utils/emergencyActions';
import { formatRequestDayTime } from '../../../utils/requestDisplay';
import { resolveVital } from '../../../constants/vitalTracks';
import { buildMobileRequestDetailModel, getMobileRequestServiceLabel } from './mobileEmergencyModel';

export const MobileEmergencyDetailSheet = ({
  controller,
  canManageRequests,
  canCompleteRequest,
  onView,
  onDispatch,
  onComplete,
  onProcessCash,
  onRetryPayment,
}) => {
  const {
    activeRequest,
    setActiveRequest,
    activePlace,
    triggerFromEvent,
  } = controller;

  if (!activeRequest) return null;

  const detail = buildMobileRequestDetailModel(activeRequest);
  const {
    projection,
    name,
    facility,
    location,
    responder,
    terminal,
    phone,
    patientEmail,
    coordinates,
    displayId,
    isAmbulanceService,
    paymentParts,
    hasPayment,
    vehicleParts,
    bedParts,
  } = detail;
  const vital = resolveVital('emergency', activeRequest.status);
  const actionState = getEmergencyActionState(activeRequest);
  const actorCanComplete = Boolean(canCompleteRequest?.(activeRequest));

  const closeThen = (callback) => () => {
    setActiveRequest(null);
    callback?.(activeRequest);
  };
  const detailsAction = {
    label: 'Details',
    icon: Eye,
    onClick: closeThen(onView),
  };
  let primaryAction = detailsAction;
  let primaryKind = 'details';

  if (canonicalizeEmergencyStatus(activeRequest.status, null) === 'pending_approval') {
    primaryKind = 'review';
    primaryAction = {
      label: 'Review',
      icon: ClipboardCheck,
      tone: 'hsl(var(--destructive))',
      onClick: closeThen(onView),
    };
  } else if (canManageRequests && actionState.canDispatch) {
    primaryKind = 'dispatch';
    primaryAction = {
      label: 'Dispatch',
      icon: Send,
      tone: 'hsl(200 98% 39%)',
      onClick: closeThen(onDispatch),
    };
  } else if (actorCanComplete && actionState.canComplete) {
    primaryKind = 'complete';
    primaryAction = {
      label: 'Complete',
      icon: CheckCheck,
      tone: 'hsl(162 94% 24%)',
      onClick: closeThen(onComplete),
    };
  } else if (actionState.canRetryPayment) {
    primaryKind = 'retry';
    primaryAction = {
      label: 'Retry payment',
      icon: RefreshCw,
      tone: 'hsl(26 90% 37%)',
      onClick: closeThen(onRetryPayment),
    };
  }

  const secondaryAction = primaryKind === 'details' ? undefined : detailsAction;
  const extraActions = [
    canManageRequests && actionState.canDispatch && primaryKind !== 'dispatch' && {
      label: 'Dispatch',
      icon: Send,
      tone: 'hsl(200 98% 39%)',
      onClick: closeThen(onDispatch),
    },
    actorCanComplete && actionState.canComplete && primaryKind !== 'complete' && {
      label: 'Complete',
      icon: CheckCheck,
      tone: 'hsl(162 94% 24%)',
      onClick: closeThen(onComplete),
    },
    actionState.canRetryPayment && primaryKind !== 'retry' && {
      label: 'Retry',
      icon: RefreshCw,
      tone: 'hsl(26 90% 37%)',
      onClick: closeThen(onRetryPayment),
    },
  ].filter(Boolean);

  return (
    <MobileDetailSheet
      isOpen
      onClose={() => setActiveRequest(null)}
      icon={ClipboardCheck}
      iconTone={vital?.tone}
      avatarUrl={projection.patientDisplay.avatar}
      avatarInitials={projection.patientDisplay.initials}
      eyebrow={getMobileRequestServiceLabel(activeRequest)}
      title={name}
      statusPill={vital?.pill}
      vital={vital ? { ...vital, label: 'Request status' } : null}
      islands={[
        { icon: User, label: 'Patient', value: name },
        phone && { icon: Phone, label: 'Phone', value: phone, href: `tel:${String(phone).replace(/[\s-]/g, '')}` },
        patientEmail && { icon: Mail, label: 'Email', value: patientEmail, href: `mailto:${patientEmail}` },
        { icon: ClipboardCheck, label: 'Service type', value: getMobileRequestServiceLabel(activeRequest) },
        { icon: Hospital, label: 'Facility', value: facility },
        { icon: Ambulance, label: 'Responder', value: responder },
        !terminal && projection.responderDisplay.hasResponder && {
          icon: Clock,
          label: 'ETA',
          value: projection.responderDisplay.etaLabel,
        },
        isAmbulanceService && projection.serviceDisplay.hasAmbulanceType && {
          icon: Ambulance,
          label: 'Ambulance type',
          value: projection.serviceDisplay.ambulanceTypeLabel,
        },
        isAmbulanceService && vehicleParts.length > 0 && {
          icon: Ambulance,
          label: 'Vehicle',
          value: vehicleParts.join(' \u00b7 '),
        },
        actionState.isBedFlow && bedParts.length > 0 && {
          icon: BedDouble,
          label: 'Bed',
          value: bedParts.join(' \u00b7 '),
        },
        {
          icon: MapPin,
          label: 'Location',
          value: activePlace?.shortLabel || location,
          href: projection.locationDisplay.canOpenExternalMap && coordinates
            ? `https://maps.google.com/?q=${coordinates.lat},${coordinates.lng}`
            : undefined,
        },
        hasPayment && { icon: CreditCard, label: 'Payment', value: paymentParts.join(' \u00b7 ') },
        displayId && {
          icon: Hash,
          label: 'Reference',
          value: displayId,
          onPress: (event) => {
            navigator.clipboard?.writeText(String(displayId))?.catch(() => {});
            triggerFromEvent(event, {
              variant: FEEDBACK_TYPES.SUCCESS,
              color: 'hsl(var(--spark))',
              haptic: true,
              sound: true,
            });
          },
        },
        { icon: Calendar, label: 'Created', value: formatRequestDayTime(activeRequest.created_at) },
        terminal && activeRequest.completed_at && {
          icon: CheckCheck,
          label: 'Completed',
          value: formatRequestDayTime(activeRequest.completed_at),
        },
        terminal && activeRequest.cancelled_at && {
          icon: X,
          label: 'Cancelled',
          value: formatRequestDayTime(activeRequest.cancelled_at),
        },
      ]}
      primary={primaryAction}
      secondary={secondaryAction}
      extras={extraActions}
    >
      {actionState.canProcessCash && (
        <button
          type="button"
          onClick={() => onProcessCash?.(activeRequest)}
          className="h-12 w-full rounded-button bg-muted/25 text-sm font-semibold text-muted-foreground transition-all hover:bg-muted/35 active:scale-[0.96]"
        >
          Cash settlement handled in Finance
        </button>
      )}
    </MobileDetailSheet>
  );
};
