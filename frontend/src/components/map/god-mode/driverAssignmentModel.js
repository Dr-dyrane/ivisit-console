import { resolveMapEntityLocation, toMapPoint } from '../mapViewModel';
import { decodePostGISGeometry } from '../../../utils/locationUtils';

export const getDriverNextAction = (assignmentStatus, options = {}) => {
  const normalizedStatus = String(assignmentStatus || '').toLowerCase();
  const {
    guarded = false,
    locationActive = false,
    locationStatus = 'idle',
    patientAcknowledgementState = null,
    telemetryState = null,
  } = options;

  if (normalizedStatus === 'offered') {
    if (guarded && !telemetryState) {
      return {
        action: null,
        label: 'Checking location',
        disabled: true,
        supportCopy: 'Confirming your live signal before this offer can be accepted.',
      };
    }
    if (guarded && telemetryState !== 'live') {
      if (locationActive || locationStatus === 'starting') {
        return {
          action: null,
          label: 'Restoring location',
          disabled: true,
          supportCopy: 'Waiting for a fresh live signal.',
        };
      }
      return {
        action: 'restore_location',
        label: 'Restore location',
        busyLabel: 'Restoring',
        supportCopy: 'Share a fresh location before accepting.',
      };
    }
    return { action: 'accept', label: 'Accept call', busyLabel: 'Accepting' };
  }
  if (normalizedStatus === 'accepted') {
    return { action: 'arrive', label: 'Mark arrived', busyLabel: 'Confirming' };
  }
  if (normalizedStatus === 'arrived') {
    if (guarded && patientAcknowledgementState !== 'confirmed') {
      const unavailable = patientAcknowledgementState === 'unavailable';
      return {
        action: null,
        label: unavailable ? 'Confirmation unavailable' : 'Waiting for patient',
        disabled: true,
        supportCopy: unavailable
          ? 'Patient confirmation could not be checked. We will retry automatically.'
          : 'Complete the trip after the patient confirms your arrival.',
      };
    }
    return { action: 'complete', label: 'Complete trip', busyLabel: 'Closing', requiresConfirmation: true };
  }

  return null;
};

export const getDriverDestination = ({ emergency, hospitals = [] } = {}) => {
  if (!emergency) return null;
  const status = String(emergency.assignment_status || '').toLowerCase();
  const hospital = hospitals.find((item) => item?.id === emergency.hospital_id) || null;
  const pickup = toMapPoint(resolveMapEntityLocation(emergency));
  const recordedDestination = toMapPoint(decodePostGISGeometry(emergency.destination_location));
  const hospitalDestination = toMapPoint(hospital) || recordedDestination;
  const destination = status === 'arrived' ? hospitalDestination : pickup;

  return {
    coordinates: destination,
    kind: status === 'arrived' ? 'hospital' : 'pickup',
    hospital,
    label: hospital?.name
      || emergency.hospital_name
      || emergency.destination_location?.address
      || 'Hospital not assigned',
  };
};

export const buildDriverDirectionsUrl = (coordinates) => {
  const point = toMapPoint(coordinates);
  if (!point) return null;
  const destination = encodeURIComponent(`${point.lat},${point.lng}`);
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;
};

export const getDriverUnitLabel = ({ ambulance, emergency } = {}) => (
  ambulance?.call_sign
  || ambulance?.vehicle_number
  || ambulance?.license_plate
  || (emergency?.ambulance_id ? `Unit ${emergency.ambulance_id.slice(-6)}` : null)
  || null
);

const ASSIGNMENT_PRIORITY = { arrived: 3, accepted: 2, offered: 1 };

export const selectCurrentDriverAssignment = (items = []) => (
  [...items]
    .filter((item) => ASSIGNMENT_PRIORITY[item?.assignment_status])
    .sort((left, right) => {
      const statusDelta = ASSIGNMENT_PRIORITY[right.assignment_status]
        - ASSIGNMENT_PRIORITY[left.assignment_status];
      if (statusDelta) return statusDelta;
      return Date.parse(right.offered_at || 0) - Date.parse(left.offered_at || 0);
    })[0] || null
);

export const formatOfferExpiry = (value) => {
  if (!value) return null;
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) return null;
  return `Respond by ${timestamp.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
};

export const formatLocationSharedAt = (value) => {
  if (!value) return 'Not shared yet';
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) return 'Shared recently';
  return `Shared ${timestamp.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
};
