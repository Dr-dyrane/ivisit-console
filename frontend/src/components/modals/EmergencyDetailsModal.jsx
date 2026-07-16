import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { ModalShell } from '../ui/ModalShell';
import {
  Siren,
  Clock,
  Activity,
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
import { canApplyEmergencyDetailProjection } from '../../utils/emergencyDetailRefresh';
import { fetchRequestVisitIdentity } from '../../utils/visitContextUtils';
import { resolveVital } from '../../constants/vitalTracks';
import {
  CostBreakdownLines,
  EmergencyIdentitySections,
  PanelCard,
  SectionCard,
} from './EmergencyDetailsSections';
const formatRequestTitle = (value) => {
  const label = String(value || '').replace(/_/g, ' ').trim();
  if (!label) return 'Request details';
  return `${label.charAt(0).toUpperCase()}${label.slice(1)} request`;
};

// Hero orb tint mirrors MobileEmergency's status-tinted request avatar so the modal
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
  const [detailRequest, setDetailRequest] = React.useState(request || null);
  const [visitOutcome, setVisitOutcome] = React.useState(null);
  const [loadingOutcome, setLoadingOutcome] = React.useState(false);
  const [paymentData, setPaymentData] = React.useState(null);
  const [paymentVisibilityState, setPaymentVisibilityState] = React.useState('not_created');
  const [visitVisibilityState, setVisitVisibilityState] = React.useState('not_expected_yet');
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [isProcessingApproval, setIsProcessingApproval] = React.useState(false);
  const [isRetryingPayment, setIsRetryingPayment] = React.useState(false);
  const [identityContext, setIdentityContext] = React.useState(null);
  const requestId = request?.id || null;
  const refreshSequenceRef = React.useRef(0);
  const activeRequestIdRef = React.useRef(requestId);
  const latestRequestPropRef = React.useRef(request);
  const detailOpenRef = React.useRef(isOpen);
  React.useLayoutEffect(() => {
    if (
      latestRequestPropRef.current !== request ||
      activeRequestIdRef.current !== requestId ||
      detailOpenRef.current !== isOpen
    ) {
      refreshSequenceRef.current += 1;
    }
    latestRequestPropRef.current = request;
    activeRequestIdRef.current = requestId;
    detailOpenRef.current = isOpen;
  }, [isOpen, request, requestId]);
  const activeRequest = detailRequest?.id === requestId ? detailRequest : request;
  const resolvedIdentity = identityContext && identityContext.requestId === activeRequest?.id
    ? identityContext.identity
    : null;
  const renderProjection = React.useMemo(
    () => buildEmergencyRenderProjection(activeRequest, {
      latestPayment: paymentData,
      paymentVisibilityState,
      visitOutcome,
      visitVisibilityState,
      identityProjection: resolvedIdentity,
    }),
    [activeRequest, paymentData, paymentVisibilityState, resolvedIdentity, visitOutcome, visitVisibilityState]
  );
  const normalizedStatus = renderProjection.statusDisplay.status;
  const isApprovalPending = normalizedStatus === 'pending_approval';
  const isPaymentDeclined = normalizedStatus === 'payment_declined';
  const canRetryPayment = typeof onRetryPayment === 'function';
  const showCashApprovalCard = isApprovalPending && (
    activeRequest?.status === 'pending_approval' ||
    activeRequest?.payment_status === 'pending' ||
    Boolean(paymentData)
  );

  const refreshProjection = React.useCallback(async () => {
    const sequence = ++refreshSequenceRef.current;
    const targetRequestId = requestId;
    if (!isOpen || !targetRequestId) return null;

    const isCurrentRefresh = () => canApplyEmergencyDetailProjection({
      sequence,
      latestSequence: refreshSequenceRef.current,
      requestId: targetRequestId,
      activeRequestId: activeRequestIdRef.current,
      isOpen: detailOpenRef.current,
    });

    setDetailLoading(true);
    setLoadingOutcome(true);
    try {
      const projection = await getEmergencyDetailProjection(targetRequestId);
      if (!isCurrentRefresh()) return null;
      if (!projection.request) {
        throw new Error('Request is no longer available in your current scope.');
      }
      setDetailRequest(projection.request);
      setPaymentData(projection.latestPayment || null);
      setPaymentVisibilityState(projection.paymentVisibilityState);
      setVisitOutcome(projection.visitOutcome || null);
      setVisitVisibilityState(projection.visitVisibilityState);
      return projection;
    } catch (error) {
      if (!isCurrentRefresh()) return null;
      console.error('Error loading emergency detail projection:', error);
      toast.error('Failed to load emergency detail');
      return null;
    } finally {
      if (isCurrentRefresh()) {
        setDetailLoading(false);
        setLoadingOutcome(false);
      }
    }
  }, [isOpen, requestId]);

  const handleApprove = async () => {
    if (!activeRequest) return;
    if (!paymentData) {
      console.warn('[EmergencyDetailsModal] Cannot approve: payment record unavailable');
      toast.error('Payment record unavailable for this request. Refreshing backend detail.');
      await refreshProjection();
      return;
    }
    setIsProcessingApproval(true);
    try {
      const approvalResult = await approveCashPayment(paymentData.id, activeRequest.id);
      await refreshProjection();
      toast.success(
        approvalResult?.ambulance_id || approvalResult?.responder_name
          ? 'Cash approved. A responder is assigned.'
          : 'Cash approved. Awaiting responder assignment.'
      );
      onClose(true); // Close and refresh
    } catch (e) {
      toast.error(e.message || 'Failed to approve payment');
    } finally {
      setIsProcessingApproval(false);
    }
  };

  const handleDecline = async () => {
    if (!activeRequest) return;
    if (!paymentData) {
      console.warn('[EmergencyDetailsModal] Cannot decline: payment record unavailable');
      toast.error('Payment record unavailable for this request. Refreshing backend detail.');
      await refreshProjection();
      return;
    }
    setIsProcessingApproval(true);
    try {
      await declineCashPayment(paymentData.id, activeRequest.id);
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
    if (!activeRequest || !canRetryPayment) return;
    setIsRetryingPayment(true);
    try {
      const ok = await onRetryPayment(activeRequest);
      if (ok) {
        await refreshProjection();
        onClose(true);
      }
    } finally {
      setIsRetryingPayment(false);
    }
  };

  React.useEffect(() => {
    setDetailRequest(request || null);
    setPaymentData(null);
    setPaymentVisibilityState('not_created');
    setVisitOutcome(null);
    setVisitVisibilityState('not_expected_yet');
    setIdentityContext(null);
  }, [request]);

  React.useEffect(() => {
    void refreshProjection();
  }, [refreshProjection]);

  React.useEffect(() => {
    if (!isOpen || !activeRequest?.id) return undefined;
    let active = true;

    fetchRequestVisitIdentity({ request: activeRequest, visit: visitOutcome })
      .then((context) => {
        if (!active) return;
        setIdentityContext({
          requestId: activeRequest.id,
          identity: context?.identity || null,
        });
      })
      .catch((error) => {
        if (!active) return;
        console.error('Error loading request identity context:', error);
        setIdentityContext(null);
      });

    return () => {
      active = false;
    };
  }, [activeRequest, isOpen, visitOutcome]);

  React.useEffect(() => {
    if (!isOpen || !requestId) return undefined;
    return subscribeToEmergencyDetail(requestId, () => {
      void refreshProjection();
    });
  }, [isOpen, requestId, refreshProjection]);

  if (!activeRequest) return null;

  // SCHEMA NOTE: emergency_requests has NO `priority` column (see types/database.ts Row).
  // The old priority colour/badge branches were dead code that always fell to the
  // defaults. The icon now wears the neutral default directly. Priority levels are
  // an ivisit-app schema decision, not a console patch.
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

  const modalTitle = formatRequestTitle(activeRequest.service_type);
  const modalSubtitle = `Case ID: #${activeRequest.id?.slice(0, 8) || 'unknown'} / ${activeRequest.created_at ? format(new Date(activeRequest.created_at), 'MMM dd, HH:mm') : 'Recently'}`;
  const vital = resolveVital('emergency', activeRequest.status);
  const patient = renderProjection.patientDisplay;
  const requesterUsername = patient.username || 'Patient';
  const facilityName = renderProjection.facilityDisplay.name;

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={() => onClose(false)}
      title={modalTitle}
      subtitle={modalSubtitle}
      icon={<span className="text-muted-foreground">{getEmergencyIcon(activeRequest.service_type)}</span>}
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
                <AvatarFallback className={`text-sm font-semibold ${getRequestOrbClass(activeRequest.status)}`}>
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
                  <p className="mt-1 text-sm text-muted-foreground">Verify the cash payment so responder assignment can continue.</p>
                </div>
              </div>

              <div className="rounded-inner bg-foreground/[0.04] p-4 dark:bg-white/[0.05]">
                <p className="eyebrow">Fee Amount</p>
                <p className="mt-1 text-xl font-bold text-foreground">
                  {renderProjection.paymentDisplay.amountLabel}
                </p>
                <CostBreakdownLines breakdown={renderProjection.paymentDisplay.breakdown} />
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
                  {isProcessingApproval ? 'Processing...' : 'Approve cash'}
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
          {isPaymentDeclined && canRetryPayment && (
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
          {activeRequest.ambulance_id && (
            <div className="flex items-center justify-center gap-2 rounded-card bg-foreground/[0.05] p-3 dark:bg-white/[0.07]">
              <Ambulance className="h-4 w-4 text-sky-500" />
              <span className="text-sm font-medium text-sky-600 dark:text-sky-300">Ambulance assigned</span>
            </div>
          )}

          {/* Situation Report */}
          <SectionCard title="Situation Report" bodyClassName="space-y-4">
            {/* SCHEMA NOTE: emergency_requests has NO `description`/notes column (see
                types/database.ts Row). The old `request.description` read was a phantom
                that always fell through to this copy. If situation reports become a
                product need, that is an ivisit-app schema/pillar decision. */}
            <p className="text-[15px] leading-relaxed text-foreground/90">
              No detailed description provided for this emergency incident.
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
                    <p className="text-sm font-medium text-foreground">&quot;{visitOutcome.summary}&quot;</p>
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

          <EmergencyIdentitySections request={activeRequest} projection={renderProjection} />

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
