import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { LocationCell } from '../ui/LocationCell';
import { ModalShell } from '../ui/ModalShell';
import {
  Siren,
  MapPin,
  Clock,
  Activity,
  Phone,
  User,
  Navigation,
  AlertTriangle,
  Shield,
  Calendar,
  FileText,
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

const formatRequestTitle = (value) => {
  const label = String(value || '').replace(/_/g, ' ').trim();
  if (!label) return 'Request details';
  return `${label.charAt(0).toUpperCase()}${label.slice(1)} request`;
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
      size="xl"
      managed
    >
      <div className="flex-1 overflow-y-auto p-4 pt-1 sm:p-8 sm:pt-2 space-y-5 sm:space-y-6 no-scrollbar">
              {/* Status Tracker Bubbles */}
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                {['pending_approval', 'in_progress', 'accepted', 'arrived', 'completed'].map((step, i, arr) => {
                  const isCurrent = normalizedStatus === step;
                  const currentIndex = arr.indexOf(normalizedStatus);
                  const isPast = currentIndex > i;
                  const stepLabel = step === 'pending_approval'
                    ? 'Approval'
                    : step === 'in_progress'
                      ? 'Dispatched'
                      : step;

                  return (
                    <div key={step} className={`rounded-inner p-3 text-center transition-all ${isCurrent ? 'bg-sky-500/10 text-sky-500 shadow-[0_10px_28px_rgb(0_0_0/0.10)]' :
                      isPast ? 'bg-green-500/5 text-green-500 opacity-60' :
                        'bg-white/5 text-muted-foreground opacity-30'
                      }`}>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em]">{stepLabel.replace('_', ' ')}</p>
                    </div>
                  );
                })}
              </div>

              {/* Cash Payment Approval Action */}
              {showCashApprovalCard && (
                <div className="space-y-4 rounded-card bg-orange-500/10 p-6 shadow-[0_10px_28px_rgb(0_0_0/0.10)]">
                  <div className="flex items-center gap-3">
                    <div className="rounded-icon bg-orange-500/20 p-2">
                      <Shield className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-orange-500">Cash Payment Approval Required</h4>
                      <p className="text-sm text-muted-foreground">The patient has requested a cash payment. Please verify and approve to start the trip.</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 rounded-inner bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground uppercase tracking-[0.14em] mb-1">Fee Amount</p>
                      <p className="text-xl font-bold">
                        {renderProjection.paymentDisplay.amountLabel}
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                      <Button
                        variant="ghost"
                        onClick={handleDecline}
                        disabled={isProcessingApproval || !paymentData}
                        className="w-full rounded-button text-red-500 hover:bg-red-500/10 sm:w-auto"
                      >
                        Decline
                      </Button>
                      <Button
                        onClick={handleApprove}
                        disabled={isProcessingApproval || !paymentData}
                        className="w-full rounded-button bg-orange-500 px-6 text-white hover:bg-orange-600 sm:w-auto"
                      >
                        {isProcessingApproval ? 'Processing...' : 'Approve & Dispatch'}
                      </Button>
                    </div>
                  </div>
                  {!paymentData && (
                    <p className="text-xs text-orange-300/80">
                      {detailLoading
                        ? 'Refreshing payment detail from backend truth...'
                        : paymentVisibilityState === 'failed'
                          ? 'Payment row lookup failed. Refresh the request or check payment visibility.'
                          : 'No payment row is visible yet for this pending approval request.'}
                    </p>
                  )}
                </div>
              )}

              {isPaymentDeclined && (
                <div className="space-y-4 rounded-card bg-amber-500/10 p-6 shadow-[0_10px_28px_rgb(0_0_0/0.10)]">
                  <div className="flex items-center gap-3">
                    <div className="rounded-icon bg-amber-500/20 p-2">
                      <AlertTriangle className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-amber-500">Payment Declined</h4>
                      <p className="text-sm text-muted-foreground">
                        Retry this request with a different saved payment method.
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      onClick={handleRetry}
                      disabled={isRetryingPayment}
                      className="rounded-button bg-amber-500 px-6 text-slate-950 hover:bg-amber-500/90"
                    >
                      {isRetryingPayment ? 'Retrying...' : 'Retry Payment'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Dispatch Source Indicator */}
              {request.ambulance_id && (
                <div className="flex items-center justify-center gap-2 rounded-inner bg-blue-500/10 p-3 shadow-[0_10px_28px_rgb(0_0_0/0.10)]">
                  <Ambulance className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium text-blue-500">Auto-dispatched from mobile app</span>
                </div>
              )}

              {/* Main Info Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Situation Report */}
                <GlassCard icon={<FileText className="text-primary" />} title="Situation Report" className="lg:col-span-2">
                  <div className="space-y-4">
                    <p className="text-lg font-normal leading-relaxed text-foreground/90">
                      {request.description || 'No detailed description provided for this emergency incident.'}
                    </p>

                    {/* Clinical Outcome Bridge */}
                    {loadingOutcome ? (
                      <div className="mt-6 space-y-3 rounded-inner bg-muted/5 p-4">
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          <span className="ml-2 text-xs text-muted-foreground">Loading clinical outcome...</span>
                        </div>
                      </div>
                    ) : visitOutcome ? (
                      <div className="mt-6 space-y-3 rounded-inner bg-green-500/5 p-4">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="bg-green-500/5 text-[10px] font-bold uppercase text-green-500">Clinical Outcome</Badge>
                          <span className="text-xs text-muted-foreground">Recorded by {visitOutcome.doctor || 'Attending Physician'}</span>
                        </div>
                        <div className="space-y-2">
                          {visitOutcome.summary && (
                            <p className="text-sm font-medium">"{visitOutcome.summary}"</p>
                          )}
                          {visitOutcome.prescriptions && (
                            <div className="flex flex-wrap gap-2">
                              {Array.isArray(visitOutcome.prescriptions) ? visitOutcome.prescriptions.map((p, i) => (
                                <Badge key={i} variant="secondary" className="bg-white/5 text-[10px] uppercase tracking-tighter">{p}</Badge>
                              )) : <Badge variant="secondary" className="bg-white/5 text-[10px] uppercase tracking-tighter">{visitOutcome.prescriptions}</Badge>}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-full justify-between rounded-button text-xs font-semibold text-green-500 hover:bg-green-500/5"
                          onClick={() => {
                            // PULLBACK NOTE: Route to the mounted visits receiver from /emergencies.
                            // OLD: dispatch unmounted openVisitModal custom event.
                            // NEW: preserve visit identity through the existing VisitsPage route receiver.
                            navigate(`/visits?view=${visitOutcome.id}`);
                            onClose(false);
                          }}
                        >
                          <span>View Full Clinical Record</span>
                          <ChevronRight className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (normalizedStatus === 'completed' || normalizedStatus === 'cancelled') ? (
                      <div className="mt-6 space-y-3 rounded-inner bg-yellow-500/5 p-4">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="bg-yellow-500/5 text-[10px] font-bold uppercase text-yellow-500">Clinical Record</Badge>
                          <span className="text-xs text-muted-foreground">No visit outcome recorded</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {visitVisibilityState === 'missing_terminal'
                            ? 'This emergency is terminal, but no linked visit record was found.'
                            : 'This emergency was completed but no detailed clinical record was found in the system.'}
                        </p>
                      </div>
                    ) : null}

                    <div className="flex flex-wrap gap-4 pt-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>{renderProjection.identity.createdAt ? format(new Date(renderProjection.identity.createdAt), 'EEEE, MMMM do yyyy') : 'Unknown Date'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>{renderProjection.identity.createdAt ? format(new Date(renderProjection.identity.createdAt), 'HH:mm:ss') : 'Unknown Time'}</span>
                      </div>
                    </div>
                  </div>
                </GlassCard>

                {/* Requester Info */}
                <GlassCard icon={<User className="text-purple-500" />} title="Requester">
                  {(() => {
                    const patient = renderProjection.patientDisplay;
                    return (
                      <div className="space-y-6">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-16 w-16 rounded-icon shadow-xl">
                            <AvatarImage src={patient.avatar} />
                            <AvatarFallback className="text-xl font-semibold">
                              {patient.initials}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="text-lg font-semibold">{patient.name}</h4>
                            <p className="text-sm text-muted-foreground uppercase tracking-wider">
                              {request.patient_snapshot?.username || request.profiles?.username || 'Patient'}
                            </p>
                          </div>
                        </div>
                        <div className="space-y-3 pt-4">
                          <div className="flex items-center justify-between text-sm">
                            <span className="opacity-50">Phone</span>
                            <span className="font-normal">{patient.phone}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="opacity-50">Email</span>
                            <span className="font-normal truncate max-w-[150px]">
                              {patient.email}
                            </span>
                          </div>
                        </div>
                        <Button variant="ghost" disabled className="w-full gap-2 rounded-button bg-muted/45 text-muted-foreground hover:bg-muted/45 disabled:opacity-100">
                          <Phone className="w-4 h-4" />
                          Call Unavailable
                        </Button>
                      </div>
                    );
                  })()}
                </GlassCard>

                {/* Location Card */}
                <GlassCard icon={<MapPin className="text-green-500" />} title="Location Data" className="lg:col-span-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                    <div className="space-y-4">
                      <div className="rounded-inner bg-white/5 p-4">
                        <p className="text-xs text-muted-foreground uppercase tracking-[0.14em] mb-1">Hospital</p>
                        <p className="text-lg font-semibold">{renderProjection.facilityDisplay.name}</p>
                      </div>
                      {request.patient_location && (
                        <div className="rounded-inner bg-white/5 p-4">
                          <p className="text-xs text-muted-foreground uppercase tracking-[0.14em] mb-1">Patient Location</p>
                          <p className="font-mono text-sm font-semibold">
                            <LocationCell
                              location={request.patient_location}
                              pickupLocation={request.pickup_location}
                              responderLocation={request.responder_location}
                            />
                          </p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-inner bg-white/5 p-4">
                          <p className="text-xs text-muted-foreground uppercase tracking-[0.14em] mb-1">Request ID</p>
                          <p className="font-mono text-sm font-semibold">{renderProjection.identity.displayId || 'N/A'}</p>
                        </div>
                        <div className="rounded-inner bg-white/5 p-4">
                          <p className="text-xs text-muted-foreground uppercase tracking-[0.14em] mb-1">Service Type</p>
                          <p className="font-mono text-sm font-semibold">{renderProjection.serviceDisplay.label}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="group relative aspect-video overflow-hidden rounded-card bg-white/5">
                        <div className="absolute inset-0 flex items-center justify-center bg-primary/5 transition-colors group-hover:bg-primary/10">
                          <MapPin className="w-12 h-12 text-primary opacity-20" />
                        </div>
                        <div className="absolute bottom-4 left-4 right-4 rounded-inner bg-black/40 p-4 backdrop-blur-md">
                          <p className="text-xs font-normal text-white/70">Geographic coordinates verified</p>
                        </div>
                      </div>
                      <Button
                        onClick={() => sceneCoordinates && window.open(`https://maps.google.com/?q=${sceneCoordinates.lat},${sceneCoordinates.lng}`, '_blank')}
                        disabled={!sceneCoordinates}
                        className="w-full gap-2 rounded-button bg-primary text-white hover:bg-primary/90"
                      >
                        <Navigation className="w-4 h-4" />
                        Navigate to Scene
                      </Button>
                    </div>
                  </div>
                </GlassCard>

                {/* Service Details */}
                {request.service_type === 'ambulance' && renderProjection.serviceDisplay.hasAmbulanceType && (
                  <GlassCard icon={<Ambulance className="text-blue-500" />} title="Ambulance Details" className="lg:col-span-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="rounded-inner bg-white/5 p-4">
                        <p className="text-xs text-muted-foreground uppercase tracking-[0.14em] mb-1">Type</p>
                        <p className="font-semibold">
                          {renderProjection.serviceDisplay.ambulanceTypeLabel}
                        </p>
                      </div>
                      <div className="rounded-inner bg-white/5 p-4">
                        <p className="text-xs text-muted-foreground uppercase tracking-[0.14em] mb-1">ETA</p>
                        <p className="font-semibold">{renderProjection.responderDisplay.etaLabel || etaDisplay || 'N/A'}</p>
                      </div>
                      <div className="rounded-inner bg-white/5 p-4">
                        <p className="text-xs text-muted-foreground uppercase tracking-[0.14em] mb-1">Status</p>
                        <p className="font-semibold capitalize">{renderProjection.statusDisplay.label}</p>
                      </div>
                    </div>
                  </GlassCard>
                )}

                {request.service_type === 'bed' && (
                  <GlassCard icon={<Calendar className="text-green-500" />} title="Bed Details" className="lg:col-span-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="rounded-inner bg-white/5 p-4">
                        <p className="text-xs text-muted-foreground uppercase tracking-[0.14em] mb-1">Bed Number</p>
                        <p className="font-semibold">{request.bed_number || 'N/A'}</p>
                      </div>
                      <div className="rounded-inner bg-white/5 p-4">
                        <p className="text-xs text-muted-foreground uppercase tracking-[0.14em] mb-1">Bed Type</p>
                        <p className="font-semibold capitalize">{bedCategory || 'N/A'}</p>
                      </div>
                      <div className="rounded-inner bg-white/5 p-4">
                        <p className="text-xs text-muted-foreground uppercase tracking-[0.14em] mb-1">Specialty</p>
                        <p className="font-semibold">{renderProjection.serviceDisplay.specialtyLabel}</p>
                      </div>
                    </div>
                  </GlassCard>
                )}

                {/* Responder Info */}
                {request.responder_name && (
                  <GlassCard icon={<Shield className="text-orange-500" />} title="Responder Information" className="lg:col-span-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="rounded-inner bg-white/5 p-4">
                        <p className="text-xs text-muted-foreground uppercase tracking-[0.14em] mb-1">Responder Name</p>
                        <p className="font-semibold">{request.responder_name || 'N/A'}</p>
                      </div>
                      <div className="rounded-inner bg-white/5 p-4">
                        <p className="text-xs text-muted-foreground uppercase tracking-[0.14em] mb-1">Contact</p>
                        <p className="font-semibold">{request.responder_phone || 'N/A'}</p>
                      </div>
                      {request.responder_vehicle_plate && (
                        <div className="rounded-inner bg-white/5 p-4">
                          <p className="text-xs text-muted-foreground uppercase tracking-[0.14em] mb-1">Vehicle Plate</p>
                          <p className="font-semibold">{request.responder_vehicle_plate || 'N/A'}</p>
                        </div>
                      )}
                      {request.responder_vehicle_type && (
                        <div className="rounded-inner bg-white/5 p-4">
                          <p className="text-xs text-muted-foreground uppercase tracking-[0.14em] mb-1">Vehicle Type</p>
                          <p className="font-semibold capitalize">{request.responder_vehicle_type || 'N/A'}</p>
                        </div>
                      )}
                    </div>
                  </GlassCard>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="sticky bottom-0 z-10 flex flex-col-reverse gap-2 pt-4 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] bg-background/85 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-end sm:gap-3 sm:pb-2">
                <Button
                  variant="ghost"
                  onClick={() => onClose(false)}
                  className="h-11 w-full rounded-button px-5 text-sm font-semibold sm:h-12 sm:w-auto sm:px-8"
                >
                  Dismiss
                </Button>
                <Button
                  disabled
                  className="h-11 w-full rounded-button bg-muted/55 px-5 text-sm font-semibold text-muted-foreground hover:bg-muted/55 disabled:opacity-100 sm:h-12 sm:w-auto sm:px-8"
                >
                  Report unavailable
                </Button>
              </div>
      </div>
    </ModalShell>
  );
};

/* Sub-components */

const GlassCard = ({ children, title, icon, className }) => (
  <div className={`rounded-card bg-white/5 p-4 shadow-[0_10px_28px_rgb(0_0_0/0.10)] sm:p-6 ${className}`}>
    <div className="flex items-center gap-3 mb-4 sm:mb-6">
      <div className="rounded-icon bg-white/5 p-1.5 sm:p-2">
        {React.cloneElement(icon, { size: 16, className: 'sm:h-5 sm:w-5' })}
      </div>
      <h3 className="font-semibold tracking-tight text-sm sm:text-base">{title}</h3>
    </div>
    {children}
  </div>
);
