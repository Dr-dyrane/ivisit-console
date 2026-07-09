import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { LocationCell } from '../ui/LocationCell';
import { ModalShell } from '../ui/ModalShell';
import {
  Siren,
  Clock,
  Activity,
  Phone,
  Navigation,
  AlertTriangle,
  Shield,
  Calendar,
  Heart,
  Zap,
  ChevronRight,
  Ambulance,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

import {
  approveCashPayment,
  declineCashPayment,
  getEmergencyDetailProjection,
  subscribeToEmergencyDetail,
} from '../../services/emergencyService';
import { canonicalizeEmergencyStatus } from '../../utils/emergencyStatus';
import { buildEmergencyRenderProjection } from '../../utils/emergencyRequestMapper';
import { resolveVital } from '../../constants/vitalTracks';

const formatRequestTitle = (value) => {
  const label = String(value || '').replace(/_/g, ' ').trim();
  if (!label) return 'Request details';
  return `${label.charAt(0).toUpperCase()}${label.slice(1)} request`;
};

// Hero orb tint — mirrors MobileEmergency's status-tinted request avatar so the modal
// identity reads with the same lifecycle energy as the list row.
const getRequestOrbClass = (status) => {
  const key = canonicalizeEmergencyStatus(status, 'pending_approval');
  if (key === 'pending_approval' || key === 'payment_declined') return 'bg-destructive/14 text-destructive';
  if (key === 'completed') return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200';
  if (key === 'cancelled') return 'bg-muted/34 text-muted-foreground';
  if (key === 'in_progress') return 'bg-amber-500/10 text-amber-700 dark:text-amber-200';
  if (key === 'accepted') return 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-200';
  if (key === 'arrived') return 'bg-sky-500/10 text-sky-700 dark:text-sky-200';
  return 'bg-muted/34 text-muted-foreground';
};

export const EmergencyDetailsModal = ({ isOpen, onClose, request, onRetryPayment }) => {
  const navigate = useNavigate();
  const [visitOutcome, setVisitOutcome] = React.useState(null);
  const [loadingOutcome, setLoadingOutcome] = React.useState(false);
  const [paymentData, setPaymentData] = React.useState(null);
  const [paymentVisibilityState, setPaymentVisibilityState] = React.useState('not_created');
  const [visitVisibilityState, setVisitVisibilityState] = React.useState('not_expected_yet');
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [isProcessingApproval, setIsProcessingApproval] = React.useState(false);
  const [isRetryingPayment, setIsRetryingPayment] = React.useState(false);
  const renderProjection = React.useMemo(
    () => buildEmergencyRenderProjection(request, {
      latestPayment: paymentData,
      paymentVisibilityState,
      visitOutcome,
      visitVisibilityState,
    }),
    [request, paymentData, paymentVisibilityState, visitOutcome, visitVisibilityState]
  );
  const normalizedStatus = renderProjection.statusDisplay.status;
  const isApprovalPending = normalizedStatus === 'pending_approval';
  const isPaymentDeclined = normalizedStatus === 'payment_declined';
  const sceneCoordinates = renderProjection.locationDisplay.coordinates;
  const showCashApprovalCard = isApprovalPending && (
    request?.status === 'pending_approval' ||
    request?.payment_status === 'pending' ||
    Boolean(paymentData)
  );
  const etaDisplay = request?.eta_display || null;
  const bedCategory = request?.bed_category || null;

  const refreshProjection = React.useCallback(async () => {
    if (!isOpen || !request?.id) return null;

    setDetailLoading(true);
    setLoadingOutcome(true);
    try {
      const projection = await getEmergencyDetailProjection(request.id, request);
      setPaymentData(projection.latestPayment || null);
      setPaymentVisibilityState(projection.paymentVisibilityState);
      setVisitOutcome(projection.visitOutcome || null);
      setVisitVisibilityState(projection.visitVisibilityState);
      return projection;
    } catch (error) {
      console.error('Error loading emergency detail projection:', error);
      toast.error('Failed to load emergency detail');
      return null;
    } finally {
      setDetailLoading(false);
      setLoadingOutcome(false);
    }
  }, [isOpen, request]);

  const handleApprove = async () => {
    if (!request) return;
    if (!paymentData) {
      console.warn('[EmergencyDetailsModal] Cannot approve: payment record unavailable');
      toast.error('Payment record unavailable for this request. Refreshing backend detail.');
      await refreshProjection();
      return;
    }
    setIsProcessingApproval(true);
    try {
      await approveCashPayment(paymentData.id, request.id);
      const projection = await refreshProjection();
      const nextStatus = canonicalizeEmergencyStatus(
        projection?.request?.status,
        projection?.request?.status
      );
      toast.success(
        nextStatus === 'in_progress'
          ? 'Cash approval recorded. Dispatch is released.'
          : 'Cash approval recorded. Request is refreshing.'
      );
      onClose(true); // Close and refresh
    } catch (e) {
      toast.error(e.message || 'Failed to approve payment');
    } finally {
      setIsProcessingApproval(false);
    }
  };

  const handleDecline = async () => {
    if (!request) return;
    if (!paymentData) {
      console.warn('[EmergencyDetailsModal] Cannot decline: payment record unavailable');
      toast.error('Payment record unavailable for this request. Refreshing backend detail.');
      await refreshProjection();
      return;
    }
    setIsProcessingApproval(true);
    try {
      await declineCashPayment(paymentData.id, request.id);
      await refreshProjection();
      toast.success('Cash payment decline recorded.');
      onClose(true); // Close and refresh
    } catch (e) {
      toast.error(e.message || 'Failed to decline payment');
    } finally {
      setIsProcessingApproval(false);
    }
  };

  const handleRetry = async () => {
    if (!request || typeof onRetryPayment !== 'function') return;
    setIsRetryingPayment(true);
    try {
      const ok = await onRetryPayment(request);
      if (ok) {
        await refreshProjection();
        onClose(true);
      }
    } finally {
      setIsRetryingPayment(false);
    }
  };

  React.useEffect(() => {
    void refreshProjection();
  }, [refreshProjection]);

  React.useEffect(() => {
    if (!isOpen || !request?.id) return undefined;
    const requestId = request.id;
    return subscribeToEmergencyDetail(requestId, () => {
      void refreshProjection();
    });
  }, [isOpen, request?.id, refreshProjection]);

  if (!request) return null;

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'text-red-500';
      case 'high': return 'text-orange-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-blue-500';
      default: return 'text-muted-foreground';
    }
  };

  const getPriorityBg = (priority) => {
    switch (priority) {
      case 'critical': return 'bg-red-500/10';
      case 'high': return 'bg-orange-500/10';
      case 'medium': return 'bg-yellow-500/10';
      case 'low': return 'bg-blue-500/10';
      default: return 'bg-muted/10';
    }
  };

  const getEmergencyIcon = (type) => {
    switch (type) {
      case 'cardiac': return <Heart className="w-5 h-5" />;
      case 'accident': return <AlertTriangle className="w-5 h-5" />;
      case 'respiratory': return <Activity className="w-5 h-5" />;
      case 'stroke': return <Zap className="w-5 h-5" />;
      case 'ambulance': return <Navigation className="w-5 h-5" />;
      case 'bed_booking': return <Calendar className="w-5 h-5" />;
      default: return <Siren className="w-5 h-5" />;
    }
  };

  const modalTitle = formatRequestTitle(request.service_type);
  const modalSubtitle = `Case ID: #${request.id?.slice(0, 8) || 'unknown'} / ${request.created_at ? format(new Date(request.created_at), 'MMM dd, HH:mm') : 'Recently'}`;
  const vital = resolveVital('emergency', request.status);
  const patient = renderProjection.patientDisplay;
  const requesterUsername = request.patient_snapshot?.username || request.profiles?.username || 'Patient';
  const facilityName = renderProjection.facilityDisplay.name;

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={() => onClose(false)}
      title={modalTitle}
      subtitle={modalSubtitle}
      icon={<span className={getPriorityColor(request.priority)}>{getEmergencyIcon(request.service_type)}</span>}
      badge={(
        <Badge className={`rounded-pill px-4 py-1 ${getPriorityBg(request.priority)} ${getPriorityColor(request.priority)}`}>
          {request.priority?.toUpperCase()}
        </Badge>
      )}
      size="lg"
      managed
    >
      <div className="flex-1 overflow-y-auto p-4 pt-1 sm:p-8 sm:pt-2 no-scrollbar">
        <div className="mx-auto max-w-2xl space-y-4">

          {/* Hero / identity card */}
          <PanelCard>
            <div className="flex items-start gap-3.5">
              <Avatar className="h-12 w-12 shrink-0 rounded-pill">
                <AvatarImage src={patient.avatar} />
                <AvatarFallback className={`text-sm font-semibold ${getRequestOrbClass(request.status)}`}>
                  {patient.initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[17px] font-semibold leading-tight text-foreground">{patient.name}</p>
                <p className="mt-1 truncate text-sm uppercase tracking-wider text-muted-foreground">{requesterUsername}</p>
                {facilityName && <p className="mt-1.5 truncate text-sm text-muted-foreground">{facilityName}</p>}
              </div>
              {vital?.pill && (
                <span className={`shrink-0 rounded-pill px-2.5 py-1 text-[11px] font-semibold ${vital.pill.className}`}>
                  {vital.pill.label}
                </span>
              )}
            </div>
          </PanelCard>

          {/* Cash Payment Approval Action */}
          {showCashApprovalCard && (
            <PanelCard className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-pill bg-destructive/14 text-destructive">
                  <Shield className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-[15px] font-semibold leading-tight text-foreground">Cash Payment Approval Required</h4>
                  <p className="mt-1 text-sm text-muted-foreground">The patient has requested a cash payment. Please verify and approve to start the trip.</p>
                </div>
              </div>

              <div className="rounded-inner bg-foreground/[0.04] p-4 dark:bg-white/[0.05]">
                <p className="eyebrow">Fee Amount</p>
                <p className="mt-1 text-xl font-bold text-foreground">
                  {renderProjection.paymentDisplay.amountLabel}
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="ghost"
                  onClick={handleDecline}
                  disabled={isProcessingApproval || !paymentData}
                  className="h-12 w-full rounded-button bg-destructive/10 font-semibold text-destructive hover:bg-destructive/15 hover:text-destructive sm:flex-1"
                >
                  Decline
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={isProcessingApproval || !paymentData}
                  className="h-12 w-full rounded-button font-semibold sm:flex-1"
                >
                  {isProcessingApproval ? 'Processing...' : 'Approve & Dispatch'}
                </Button>
              </div>

              {!paymentData && (
                <p className="text-xs text-muted-foreground">
                  {detailLoading
                    ? 'Refreshing payment detail from backend truth...'
                    : paymentVisibilityState === 'failed'
                      ? 'Payment row lookup failed. Refresh the request or check payment visibility.'
                      : 'No payment row is visible yet for this pending approval request.'}
                </p>
              )}
            </PanelCard>
          )}

          {/* Payment Declined Action */}
          {isPaymentDeclined && (
            <PanelCard className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-pill bg-amber-500/10 text-amber-600 dark:text-amber-300">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-[15px] font-semibold leading-tight text-foreground">Payment Declined</h4>
                  <p className="mt-1 text-sm text-muted-foreground">Retry this request with a different saved payment method.</p>
                </div>
              </div>
              <Button
                onClick={handleRetry}
                disabled={isRetryingPayment}
                className="h-12 w-full rounded-button font-semibold"
              >
                {isRetryingPayment ? 'Retrying...' : 'Retry Payment'}
              </Button>
            </PanelCard>
          )}

          {/* Dispatch Source Indicator */}
          {request.ambulance_id && (
            <div className="flex items-center justify-center gap-2 rounded-card bg-foreground/[0.05] p-3 dark:bg-white/[0.07]">
              <Ambulance className="h-4 w-4 text-sky-500" />
              <span className="text-sm font-medium text-sky-600 dark:text-sky-300">Auto-dispatched from mobile app</span>
            </div>
          )}

          {/* Situation Report */}
          <SectionCard title="Situation Report" bodyClassName="space-y-4">
            <p className="text-[15px] leading-relaxed text-foreground/90">
              {request.description || 'No detailed description provided for this emergency incident.'}
            </p>

            {/* Clinical Outcome Bridge */}
            {loadingOutcome ? (
              <div className="flex items-center justify-center rounded-inner bg-foreground/[0.04] p-4 dark:bg-white/[0.05]">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="ml-2 text-xs text-muted-foreground">Loading clinical outcome...</span>
              </div>
            ) : visitOutcome ? (
              <div className="space-y-3 rounded-inner bg-emerald-500/[0.07] p-4">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-emerald-500/10 text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-300">Clinical Outcome</Badge>
                  <span className="text-xs text-muted-foreground">Recorded by {visitOutcome.doctor || 'Attending Physician'}</span>
                </div>
                <div className="space-y-2">
                  {visitOutcome.summary && (
                    <p className="text-sm font-medium text-foreground">"{visitOutcome.summary}"</p>
                  )}
                  {visitOutcome.prescriptions && (
                    <div className="flex flex-wrap gap-2">
                      {Array.isArray(visitOutcome.prescriptions) ? visitOutcome.prescriptions.map((p, i) => (
                        <Badge key={i} variant="secondary" className="bg-foreground/[0.06] text-[10px] uppercase tracking-tighter dark:bg-white/[0.08]">{p}</Badge>
                      )) : <Badge variant="secondary" className="bg-foreground/[0.06] text-[10px] uppercase tracking-tighter dark:bg-white/[0.08]">{visitOutcome.prescriptions}</Badge>}
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-full justify-between rounded-button bg-muted/60 text-xs font-semibold hover:bg-muted"
                  onClick={() => {
                    // PULLBACK NOTE: Route to the mounted visits receiver from /emergencies.
                    // OLD: dispatch unmounted openVisitModal custom event.
                    // NEW: preserve visit identity through the existing VisitsPage route receiver.
                    navigate(`/visits?view=${visitOutcome.id}`);
                    onClose(false);
                  }}
                >
                  <span>View Full Clinical Record</span>
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            ) : (normalizedStatus === 'completed' || normalizedStatus === 'cancelled') ? (
              <div className="space-y-2 rounded-inner bg-foreground/[0.04] p-4 dark:bg-white/[0.05]">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-amber-500/10 text-[10px] font-bold uppercase text-amber-600 dark:text-amber-300">Clinical Record</Badge>
                  <span className="text-xs text-muted-foreground">No visit outcome recorded</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {visitVisibilityState === 'missing_terminal'
                    ? 'This emergency is terminal, but no linked visit record was found.'
                    : 'This emergency was completed but no detailed clinical record was found in the system.'}
                </p>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-4 pt-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{renderProjection.identity.createdAt ? format(new Date(renderProjection.identity.createdAt), 'EEEE, MMMM do yyyy') : 'Unknown Date'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{renderProjection.identity.createdAt ? format(new Date(renderProjection.identity.createdAt), 'HH:mm:ss') : 'Unknown Time'}</span>
              </div>
            </div>
          </SectionCard>

          {/* Requester */}
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

          {/* Location Data */}
          <SectionCard title="Location Data" bodyClassName="space-y-4">
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <DetailRow label="Hospital" value={renderProjection.facilityDisplay.name} />
              <DetailRow label="Service Type" value={renderProjection.serviceDisplay.label} />
              <DetailRow label="Request ID" value={renderProjection.identity.displayId || 'N/A'} valueClassName="font-mono" />
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

          {/* Ambulance Details */}
          {request.service_type === 'ambulance' && renderProjection.serviceDisplay.hasAmbulanceType && (
            <SectionCard title="Ambulance Details" bodyClassName="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
              <DetailRow label="Type" value={renderProjection.serviceDisplay.ambulanceTypeLabel} />
              <DetailRow label="ETA" value={renderProjection.responderDisplay.etaLabel || etaDisplay || 'N/A'} />
              <DetailRow label="Status" value={renderProjection.statusDisplay.label} valueClassName="capitalize" />
            </SectionCard>
          )}

          {/* Bed Details */}
          {request.service_type === 'bed' && (
            <SectionCard title="Bed Details" bodyClassName="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
              <DetailRow label="Bed Number" value={request.bed_number || 'N/A'} />
              <DetailRow label="Bed Type" value={bedCategory || 'N/A'} valueClassName="capitalize" />
              <DetailRow label="Specialty" value={renderProjection.serviceDisplay.specialtyLabel} />
            </SectionCard>
          )}

          {/* Responder Information */}
          {request.responder_name && (
            <SectionCard title="Responder Information" bodyClassName="grid grid-cols-2 gap-x-6 gap-y-4">
              <DetailRow label="Responder Name" value={request.responder_name || 'N/A'} />
              <DetailRow label="Contact" value={request.responder_phone || 'N/A'} />
              {request.responder_vehicle_plate && (
                <DetailRow label="Vehicle Plate" value={request.responder_vehicle_plate || 'N/A'} />
              )}
              {request.responder_vehicle_type && (
                <DetailRow label="Vehicle Type" value={request.responder_vehicle_type || 'N/A'} valueClassName="capitalize" />
              )}
            </SectionCard>
          )}

          {/* Bottom Actions */}
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
            <Button
              variant="ghost"
              onClick={() => onClose(false)}
              className="h-12 w-full rounded-button bg-muted/60 font-semibold text-foreground hover:bg-muted sm:w-auto sm:px-8"
            >
              Dismiss
            </Button>
            <Button
              disabled
              variant="ghost"
              className="h-12 w-full rounded-button bg-muted/60 font-semibold text-muted-foreground hover:bg-muted/60 disabled:opacity-100 sm:w-auto sm:px-8"
            >
              Report unavailable
            </Button>
          </div>

        </div>
      </div>
    </ModalShell>
  );
};

/* Sub-components — card-stack primitives (borderless translucent panels, canon radii). */

const PanelCard = ({ children, className = '' }) => (
  <div className={`rounded-card bg-foreground/[0.05] p-4 dark:bg-white/[0.07] ${className}`}>
    {children}
  </div>
);

const SectionCard = ({ title, children, bodyClassName = 'space-y-3', className = '' }) => (
  <PanelCard className={className}>
    <h3 className="text-[13px] font-semibold text-muted-foreground">{title}</h3>
    <div className={`mt-3 ${bodyClassName}`}>{children}</div>
  </PanelCard>
);

const DetailRow = ({ label, value, valueClassName = '' }) => (
  <div>
    <p className="eyebrow">{label}</p>
    <p className={`mt-1 break-words text-sm font-medium text-foreground ${valueClassName}`}>{value}</p>
  </div>
);
