import React from 'react';
import { Navigation, Phone } from 'lucide-react';
import { Button } from '../ui/button';
import { LocationCell } from '../ui/LocationCell';
import { getCurrentResponderAssignment } from '../../services/emergencyService';
import { formatOfferExpiry } from '../map/god-mode/driverAssignmentModel';
import { formatRequestDayTime } from '../../utils/requestDisplay';
import { formatEmergencyServiceToken } from '../../utils/emergencyRequestMapper';

export const PanelCard = ({ children, className = '' }) => (
  <div className={`rounded-card bg-foreground/[0.05] p-4 dark:bg-white/[0.07] ${className}`}>
    {children}
  </div>
);

export const SectionCard = ({ title, children, bodyClassName = 'space-y-3', className = '' }) => (
  <PanelCard className={className}>
    <h3 className="text-[13px] font-semibold text-muted-foreground">{title}</h3>
    <div className={`mt-3 ${bodyClassName}`}>{children}</div>
  </PanelCard>
);

export const DetailRow = ({ label, value, valueClassName = '' }) => (
  <div>
    <p className="eyebrow">{label}</p>
    <p className={`mt-1 break-words text-sm font-medium text-foreground ${valueClassName}`}>{value}</p>
  </div>
);

// ADOPT-04: read-only cost component lines under the cash Fee Amount total.
// The projection only emits non-null columns, so an empty breakdown renders nothing.
export const CostBreakdownLines = ({ breakdown }) => {
  if (!Array.isArray(breakdown) || breakdown.length === 0) return null;
  return (
    <div className="mt-3 space-y-1.5">
      {breakdown.map((line) => (
        <div key={line.key} className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">{line.label}</span>
          <span className="font-medium text-foreground">{line.amountLabel}</span>
        </div>
      ))}
    </div>
  );
};

// ADOPT-21 read surfacing: the CURRENT responder assignment referenced by
// emergency_requests.current_responder_assignment_id. One read-only fetch per
// assignment id after the request row lands (the modal's existing realtime
// refresh changes the id and re-triggers it -- no new channels). A missing or
// unreadable row keeps the section absent.
const useCurrentResponderAssignment = (request) => {
  const assignmentId = request?.current_responder_assignment_id || null;
  const [assignment, setAssignment] = React.useState(null);

  React.useEffect(() => {
    let active = true;
    setAssignment(null);
    if (!assignmentId) return undefined;

    getCurrentResponderAssignment({ current_responder_assignment_id: assignmentId })
      .then((row) => {
        if (active) setAssignment(row);
      })
      .catch(() => {
        if (active) setAssignment(null);
      });

    return () => {
      active = false;
    };
  }, [assignmentId]);

  return assignment;
};

export const AssignmentTimelineSection = ({ request }) => {
  const assignment = useCurrentResponderAssignment(request);
  if (!assignment) return null;

  // Donor parity (DriverAssignmentCard): the respond-by window only reads
  // while the offer is still open; landed timestamps render as day-aware times.
  const offerExpiry = assignment.status === 'offered'
    ? formatOfferExpiry(assignment.offer_expires_at)
    : null;

  return (
    <SectionCard title="Responder Assignment" bodyClassName="grid grid-cols-2 gap-x-6 gap-y-4">
      <DetailRow label="Assignment Status" value={formatEmergencyServiceToken(assignment.status, 'Unknown')} />
      {assignment.offered_at && <DetailRow label="Offered" value={formatRequestDayTime(assignment.offered_at)} />}
      {offerExpiry && <DetailRow label="Offer Window" value={offerExpiry} />}
      {assignment.accepted_at && <DetailRow label="Accepted" value={formatRequestDayTime(assignment.accepted_at)} />}
      {assignment.arrived_at && <DetailRow label="Arrived" value={formatRequestDayTime(assignment.arrived_at)} />}
      {assignment.completed_at && <DetailRow label="Completed" value={formatRequestDayTime(assignment.completed_at)} />}
      {assignment.decline_reason && <DetailRow label="Decline Reason" value={assignment.decline_reason} />}
    </SectionCard>
  );
};

export const EmergencyIdentitySections = ({ request, projection }) => {
  const patient = projection.patientDisplay;
  const doctor = projection.doctorDisplay;
  const responder = projection.responderDisplay;
  const sceneCoordinates = projection.locationDisplay.coordinates;
  const hasAssignment = doctor.hasDoctor || responder.hasResponder;

  return (
    <>
      <SectionCard title="Requester">
        <DetailRow label="Phone" value={patient.phone} />
        <DetailRow label="Email" value={patient.email} />
        <Button
          variant="ghost"
          disabled
          className="mt-1 h-11 w-full gap-2 rounded-button bg-muted/60 font-semibold text-muted-foreground hover:bg-muted/60 disabled:opacity-100"
        >
          <Phone className="h-4 w-4" />
          Call Unavailable
        </Button>
      </SectionCard>

      <SectionCard title="Location Data" bodyClassName="space-y-4">
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          <DetailRow label="Hospital" value={projection.facilityDisplay.name} />
          <DetailRow label="Service Type" value={projection.serviceDisplay.label} />
          <DetailRow label="Request ID" value={projection.identity.displayId || 'N/A'} valueClassName="font-mono" />
          {request.patient_location && (
            <div>
              <p className="eyebrow">Patient Location</p>
              <div className="mt-1 font-mono text-sm text-foreground">
                <LocationCell
                  location={request.patient_location}
                  pickupLocation={request.pickup_location}
                  responderLocation={request.responder_location}
                />
              </div>
            </div>
          )}
        </div>
        <Button
          onClick={() => sceneCoordinates && window.open(`https://maps.google.com/?q=${sceneCoordinates.lat},${sceneCoordinates.lng}`, '_blank')}
          disabled={!sceneCoordinates}
          variant="ghost"
          className="h-12 w-full gap-2 rounded-button bg-muted/60 font-semibold text-foreground hover:bg-muted"
        >
          <Navigation className="h-4 w-4" />
          Navigate to Scene
        </Button>
      </SectionCard>

      {request.service_type === 'ambulance' && projection.serviceDisplay.hasAmbulanceType && (
        <SectionCard title="Ambulance Details" bodyClassName="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          <DetailRow label="Type" value={projection.serviceDisplay.ambulanceTypeLabel} />
          <DetailRow label="ETA" value={responder.etaLabel || request.eta_display || 'N/A'} />
          <DetailRow label="Status" value={projection.statusDisplay.label} valueClassName="capitalize" />
        </SectionCard>
      )}

      {request.service_type === 'bed' && (
        <SectionCard title="Bed Details" bodyClassName="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          <DetailRow label="Bed Number" value={request.bed_number || 'N/A'} />
          <DetailRow label="Bed Type" value={projection.serviceDisplay.bedCategoryLabel} valueClassName="capitalize" />
          <DetailRow label="Specialty" value={projection.serviceDisplay.specialtyLabel} />
        </SectionCard>
      )}

      {hasAssignment && (
        <SectionCard title="Assigned Care" bodyClassName="grid grid-cols-2 gap-x-6 gap-y-4">
          {doctor.hasDoctor && <DetailRow label="Doctor" value={doctor.label} />}
          {doctor.hasDoctor && doctor.specialty && (
            <DetailRow label="Doctor Specialty" value={doctor.specialty} />
          )}
          {responder.hasResponder && (
            <DetailRow label="Driver / Responder" value={responder.label} />
          )}
          {responder.hasResponder && responder.phone && (
            <DetailRow label="Driver / Responder Contact" value={responder.phone} />
          )}
          {responder.vehiclePlate && <DetailRow label="Vehicle Plate" value={responder.vehiclePlate} />}
          {responder.vehicleType && (
            <DetailRow label="Vehicle Type" value={responder.vehicleType} valueClassName="capitalize" />
          )}
          {/* ADOPT-05: telemetry freshness from responder_location_observed_at /
              responder_location_accuracy_meters. Null telemetry stays absent. */}
          {responder.hasResponder && responder.locationFreshness && (
            <DetailRow label="Location Updated" value={responder.locationFreshness.label} />
          )}
        </SectionCard>
      )}

      <AssignmentTimelineSection request={request} />
    </>
  );
};
