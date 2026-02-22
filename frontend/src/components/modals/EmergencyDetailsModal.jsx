import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { LocationCell } from '../ui/LocationCell';
import {
  X,
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
  Ambulance
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

import { supabase } from '../../lib/supabase';
import { getVisit } from '../../services/visitsService';
import { getStandardizedPatient } from '../../utils/patientUtils';
import { approveCashPayment, declineCashPayment } from '../../services/emergencyService';

export const EmergencyDetailsModal = ({ isOpen, onClose, request }) => {
  const [visitOutcome, setVisitOutcome] = React.useState(null);
  const [loadingOutcome, setLoadingOutcome] = React.useState(false);
  const [paymentData, setPaymentData] = React.useState(null);
  const [isProcessingApproval, setIsProcessingApproval] = React.useState(false);

  const handleApprove = async () => {
    if (!paymentData || !request) return;
    setIsProcessingApproval(true);
    try {
      await approveCashPayment(paymentData.id, request.id);
      toast.success('Cash payment approved. Dispatching responder.');
      onClose(true); // Close and refresh
    } catch (e) {
      toast.error(e.message || 'Failed to approve payment');
    } finally {
      setIsProcessingApproval(false);
    }
  };

  const handleDecline = async () => {
    if (!paymentData || !request) return;
    setIsProcessingApproval(true);
    try {
      await declineCashPayment(paymentData.id, request.id);
      toast.success('Cash payment declined.');
      onClose(true); // Close and refresh
    } catch (e) {
      toast.error(e.message || 'Failed to decline payment');
    } finally {
      setIsProcessingApproval(false);
    }
  };

  // Debug: Log incoming request data (commented out for performance)
  // React.useEffect(() => {
  //   console.log('🔍 EmergencyDetailsModal - Request Data:', request);
  // }, [request]);

  React.useEffect(() => {
    if (request?.id && (request.status === 'completed' || request.status === 'cancelled')) {
      fetchVisitOutcome(request.id);
    } else {
      setVisitOutcome(null);
    }

    if (request?.id && request.status === 'pending_approval') {
      fetchPaymentData(request.id);
    } else {
      setPaymentData(null);
    }

    if (!request && isOpen) {
      // console.log('🔍 EmergencyDetailsModal - No request data provided');
    }
  }, [request, isOpen]);

  const fetchPaymentData = async (requestId) => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('emergency_request_id', requestId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (data) setPaymentData(data);
    } catch (e) {
      console.error('Error fetching payment data:', e);
    }
  };

  const fetchVisitOutcome = async (id) => {
    // console.log('🔍 EmergencyDetailsModal - Fetching visit outcome for ID:', id);
    setLoadingOutcome(true);
    try {
      const visitData = await getVisit(id);
      // console.log('🔍 EmergencyDetailsModal - Visit data received:', visitData);
      if (visitData) {
        setVisitOutcome(visitData);
      } else {
        // console.log('🔍 EmergencyDetailsModal - No visit data found for emergency ID:', id);
        setVisitOutcome(null);
      }
    } catch (e) {
      console.error('Error fetching visit outcome:', e);
      setVisitOutcome(null);
    } finally {
      setLoadingOutcome(false);
    }
  };

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

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/30 backdrop-blur-md"
            onClick={() => onClose(false)}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative z-10 w-full h-[100dvh] sm:h-auto sm:max-w-5xl sm:max-h-[90vh] overflow-hidden rounded-none sm:rounded-[32px] shadow-2xl"
          >
            {/* Header Area */}
            <div className="flex items-center justify-between p-4 sm:p-8 pb-3 sm:pb-4">
              <div className="flex items-center gap-4">
                <div className={`p-2.5 rounded-2xl ${getPriorityBg(request.priority)} ${getPriorityColor(request.priority)}`}>
                  {getEmergencyIcon(request.service_type)}
                </div>
                <div className="hidden sm:block">
                  <h2 className="text-2xl font-semibold tracking-tight text-foreground/90">
                    {request.service_type?.replace('_', ' ').toUpperCase() || 'EMERGENCY REQUEST'}
                  </h2>
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    Case ID: <span className="font-mono text-xs opacity-70">#{request.id?.slice(0, 8)}</span>
                    <span className="opacity-30">•</span>
                    {request.created_at ? format(new Date(request.created_at), 'MMM dd, HH:mm') : 'Recently'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge className={`rounded-full px-4 py-1 border-0 ${getPriorityBg(request.priority)} ${getPriorityColor(request.priority)}`}>
                  {request.priority?.toUpperCase()}
                </Badge>
                <Button
                  variant="ghost"
                  onClick={() => onClose(false)}
                  className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div className="p-4 sm:p-8 pt-1 sm:pt-2 overflow-y-auto h-[calc(100dvh-88px)] sm:max-h-[calc(90vh-120px)] space-y-5 sm:space-y-6 no-scrollbar">
              {/* Status Tracker Bubbles */}
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                {['pending_approval', 'dispatched', 'en_route', 'arrived', 'completed'].map((step, i, arr) => {
                  const isCurrent = request.status === step;
                  // Handle 'pending' as 'pending_approval' for visual consistency if needed
                  const effectiveStatus = (request.status === 'pending') ? 'pending_approval' : request.status;
                  const currentIndex = arr.indexOf(effectiveStatus);
                  const isPast = currentIndex > i;
                  const stepLabel = step === 'pending_approval' ? 'Approval' : step;

                  return (
                    <div key={step} className={`p-3 rounded-2xl text-center border transition-all ${isCurrent ? 'bg-primary/10 border-primary/20 text-primary' :
                      isPast ? 'bg-green-500/5 border-green-500/10 text-green-500 opacity-60' :
                        'bg-white/5 border-white/10 text-muted-foreground opacity-30'
                      }`}>
                      <p className="text-[10px] font-semibold uppercase tracking-widest">{stepLabel.replace('_', ' ')}</p>
                    </div>
                  );
                })}
              </div>

              {/* Cash Payment Approval Action */}
              {request.status === 'pending_approval' && (
                <div className="p-6 rounded-3xl bg-orange-500/10 border border-orange-500/20 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-500/20 rounded-xl">
                      <Shield className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-orange-500">Cash Payment Approval Required</h4>
                      <p className="text-sm text-muted-foreground">The patient has requested a cash payment. Please verify and approve to start the trip.</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Fee Amount</p>
                      <p className="text-xl font-bold">
                        {paymentData?.amount || request.fee_amount || '0.00'} {paymentData?.currency || 'USD'}
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={handleDecline}
                        disabled={isProcessingApproval}
                        className="rounded-xl border-red-500/20 hover:bg-red-500/10 text-red-500"
                      >
                        Decline
                      </Button>
                      <Button
                        onClick={handleApprove}
                        disabled={isProcessingApproval}
                        className="rounded-xl bg-orange-500 hover:bg-orange-600 text-white px-6"
                      >
                        {isProcessingApproval ? 'Processing...' : 'Approve & Dispatch'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Dispatch Source Indicator */}
              {request.ambulance_id && (
                <div className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20">
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
                      <div className="mt-6 p-4 rounded-2xl bg-muted/5 border border-muted/10 space-y-3">
                        <div className="flex items-center justify-center py-4">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-muted-foreground"></div>
                          <span className="ml-2 text-xs text-muted-foreground">Loading clinical outcome...</span>
                        </div>
                      </div>
                    ) : visitOutcome ? (
                      <div className="mt-6 p-4 rounded-2xl bg-green-500/5 border border-green-500/10 space-y-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-green-500 border-green-500/20 bg-green-500/5 text-[10px] font-bold uppercase">Clinical Outcome</Badge>
                          <span className="text-xs text-muted-foreground">Recorded by {visitOutcome.doctor || 'Attending Physician'}</span>
                        </div>
                        <div className="space-y-2">
                          {visitOutcome.summary && (
                            <p className="text-sm font-medium">"{visitOutcome.summary}"</p>
                          )}
                          {visitOutcome.prescriptions && (
                            <div className="flex flex-wrap gap-2">
                              {Array.isArray(visitOutcome.prescriptions) ? visitOutcome.prescriptions.map((p, i) => (
                                <Badge key={i} variant="secondary" className="text-[10px] bg-white/5 border-white/10 uppercase tracking-tighter">{p}</Badge>
                              )) : <Badge variant="secondary" className="text-[10px] bg-white/5 border-white/10 uppercase tracking-tighter">{visitOutcome.prescriptions}</Badge>}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-between h-8 text-green-500 hover:bg-green-500/5 text-xs font-semibold rounded-xl"
                          onClick={() => {
                            const event = new CustomEvent('openVisitModal', { detail: { visit: visitOutcome, mode: 'view' } });
                            window.dispatchEvent(event);
                            onClose(false);
                          }}
                        >
                          <span>View Full Clinical Record</span>
                          <ChevronRight className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (request?.status === 'completed' || request?.status === 'cancelled') ? (
                      <div className="mt-6 p-4 rounded-2xl bg-yellow-500/5 border border-yellow-500/10 space-y-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-yellow-500 border-yellow-500/20 bg-yellow-500/5 text-[10px] font-bold uppercase">Clinical Record</Badge>
                          <span className="text-xs text-muted-foreground">No visit outcome recorded</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          This emergency was completed but no detailed clinical record was found in the system.
                        </p>
                      </div>
                    ) : null}

                    <div className="flex flex-wrap gap-4 pt-4 border-t border-white/5">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>{request.created_at ? format(new Date(request.created_at), 'EEEE, MMMM do yyyy') : 'Unknown Date'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>{request.created_at ? format(new Date(request.created_at), 'HH:mm:ss') : 'Unknown Time'}</span>
                      </div>
                    </div>
                  </div>
                </GlassCard>

                {/* Requester Info */}
                <GlassCard icon={<User className="text-purple-500" />} title="Requester">
                  {(() => {
                    const patient = getStandardizedPatient(request);
                    return (
                      <div className="space-y-6">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-16 w-16 rounded-[20px] border-2 border-white/10 shadow-xl">
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
                        <div className="space-y-3 pt-4 border-t border-white/5">
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
                        <Button variant="outline" className="w-full rounded-2xl border-white/10 hover:bg-white/5 gap-2">
                          <Phone className="w-4 h-4" />
                          Call Patient
                        </Button>
                      </div>
                    );
                  })()}
                </GlassCard>

                {/* Location Card */}
                <GlassCard icon={<MapPin className="text-green-500" />} title="Location Data" className="lg:col-span-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                    <div className="space-y-4">
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                        <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Hospital</p>
                        <p className="text-lg font-semibold">{request.hospital_name || 'N/A'}</p>
                      </div>
                      {request.patient_location && (
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Patient Location</p>
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
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Request ID</p>
                          <p className="font-mono text-sm font-semibold">{request.request_id || 'N/A'}</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Service Type</p>
                          <p className="font-mono text-sm font-semibold">{request.service_type || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="aspect-video rounded-3xl bg-white/5 border border-white/10 overflow-hidden relative group">
                        <div className="absolute inset-0 flex items-center justify-center bg-primary/5 transition-colors group-hover:bg-primary/10">
                          <MapPin className="w-12 h-12 text-primary opacity-20" />
                        </div>
                        <div className="absolute bottom-4 left-4 right-4 p-4 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10">
                          <p className="text-xs font-normal text-white/70">Geographic coordinates verified</p>
                        </div>
                      </div>
                      <Button
                        onClick={() => window.open(`https://maps.google.com/?q=${request.latitude},${request.longitude}`, '_blank')}
                        className="w-full rounded-2xl bg-primary hover:bg-primary/90 text-white gap-2"
                      >
                        <Navigation className="w-4 h-4" />
                        Navigate to Scene
                      </Button>
                    </div>
                  </div>
                </GlassCard>

                {/* Service Details */}
                {request.service_type === 'ambulance' && request.ambulance_type && (
                  <GlassCard icon={<Ambulance className="text-blue-500" />} title="Ambulance Details" className="lg:col-span-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                        <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Type</p>
                        <p className="font-semibold">
                          {typeof request.ambulance_type === 'string'
                            ? JSON.parse(request.ambulance_type)?.title || 'Standard'
                            : 'Standard'
                          }
                        </p>
                      </div>
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                        <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">ETA</p>
                        <p className="font-semibold">{request.estimated_arrival || 'N/A'}</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                        <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Status</p>
                        <p className="font-semibold capitalize">{request.status || 'N/A'}</p>
                      </div>
                    </div>
                  </GlassCard>
                )}

                {request.service_type === 'bed' && (
                  <GlassCard icon={<Calendar className="text-green-500" />} title="Bed Details" className="lg:col-span-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                        <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Bed Number</p>
                        <p className="font-semibold">{request.bed_number || 'N/A'}</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                        <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Bed Type</p>
                        <p className="font-semibold capitalize">{request.bed_type || 'N/A'}</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                        <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Specialty</p>
                        <p className="font-semibold">{request.specialty || 'N/A'}</p>
                      </div>
                    </div>
                  </GlassCard>
                )}

                {/* Responder Info */}
                {request.responder_name && (
                  <GlassCard icon={<Shield className="text-orange-500" />} title="Responder Information" className="lg:col-span-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                        <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Responder Name</p>
                        <p className="font-semibold">{request.responder_name || 'N/A'}</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                        <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Contact</p>
                        <p className="font-semibold">{request.responder_phone || 'N/A'}</p>
                      </div>
                      {request.responder_vehicle_plate && (
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Vehicle Plate</p>
                          <p className="font-semibold">{request.responder_vehicle_plate || 'N/A'}</p>
                        </div>
                      )}
                      {request.responder_vehicle_type && (
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Vehicle Type</p>
                          <p className="font-semibold capitalize">{request.responder_vehicle_type || 'N/A'}</p>
                        </div>
                      )}
                    </div>
                  </GlassCard>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="sticky bottom-0 z-10 flex items-center justify-end gap-3 pt-4 pb-2 bg-background/70 backdrop-blur-sm">
                <Button
                  variant="ghost"
                  onClick={() => onClose(false)}
                  className="rounded-full px-8 h-12 font-semibold"
                >
                  Dismiss
                </Button>
                <Button
                  className="rounded-full px-8 h-12 bg-white/10 hover:bg-white/20 border border-white/10 font-semibold"
                >
                  Generate Incident Report
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

/* Sub-components */

const GlassCard = ({ children, title, icon, className }) => (
  <div className={`p-4 sm:p-6 rounded-[28px] bg-white/5 border-white/10 ${className}`}>
    <div className="flex items-center gap-3 mb-4 sm:mb-6">
      <div className="p-1.5 sm:p-2 bg-white/5 rounded-lg">
        {React.cloneElement(icon, { size: 16, className: 'sm:h-5 sm:w-5' })}
      </div>
      <h3 className="font-semibold tracking-tight text-sm sm:text-base">{title}</h3>
    </div>
    {children}
  </div>
);
