"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';
import { Calendar, User, Hospital, Clock, FileText, Siren, Loader2 } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useAuth } from '../../contexts/AuthContext';
import { fetchVisitContext, fetchEmergencyContext, formatVisitDateTime, isEmergencyVisit } from '../../utils/visitContextUtils';
import { ModalShell } from '../ui/ModalShell';

export const VisitModal = ({ isOpen, onClose, visit, mode, onSave, users = [], hospitals = [] }) => {

  const isView = mode === 'view';
  const isEdit = mode === 'edit';
  const isCreate = mode === 'create';

  const [formData, setFormData] = useState({
    user_id: '',
    hospital_id: '',
    visit_type: 'checkup',
    status: 'scheduled',
    date: '', // Replaced scheduled_at
    notes: '',
    reason: '',
    room_number: '',
    cost: '',
    estimated_duration: '',
    insurance_covered: true,
    preparation: '',
    hospitals: null,
    profiles: null,
    ...visit
  });

  const [loading, setLoading] = useState(false);

  const { isAdmin, isOrgAdmin, orgId } = useAuth();
  const [visitContext, setVisitContext] = useState(null);
  const [emergencyContext, setEmergencyContext] = useState(null);
  const [loadingContext, setLoadingContext] = useState(false);
  const terminalStatusValues = new Set(['completed', 'cancelled', 'no-show']);
  const isTerminalStatus = terminalStatusValues.has(String(formData.status || '').toLowerCase());
  const formatPlainLabel = (value, fallback = 'Not set') => {
    const text = String(value || '').trim();
    if (!text) return fallback;
    return text.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  };
  const patientLabel = (
    visitContext?.patient?.fullName ||
    formData.patient?.full_name ||
    formData.patient?.username ||
    formData.patient_name ||
    formData.user_email ||
    (formData.user_id ? 'Linked patient' : 'No patient')
  );
  const patientSubtext = (
    visitContext?.patient?.email ||
    formData.patient?.email ||
    formData.user_email ||
    ''
  );
  const facilityLabel = (
    visitContext?.hospital?.name ||
    formData.hospital?.name ||
    formData.hospital_name ||
    formData.hospital ||
    (formData.hospital_id ? 'Linked facility' : 'No facility')
  );
  const facilitySubtext = (
    visitContext?.hospital?.address ||
    formData.hospital?.address ||
    ''
  );
  const doctorLabel = (
    formData.doctor?.name ||
    (typeof formData.doctor === 'string' ? formData.doctor : '') ||
    formData.doctor_name ||
    'Unassigned'
  );
  const visitTypeLabel = formatPlainLabel(formData.visit_type || formData.type, 'Visit');
  const statusLabel = formatPlainLabel(formData.status || 'scheduled', 'Scheduled');
  const dateTimeLabel = formData.date ? new Date(formData.date).toLocaleString() : 'Date not set';
  const insuranceLabel = formData.insurance_covered ? 'Covered' : 'Not covered';

  useEffect(() => {
    if (visit) {
      const formattedDate = formatVisitDateTime(visit);

      setFormData(prev => ({
        ...prev,
        ...visit,
        user_id: visit.user_id || prev.user_id,
        hospital_id: visit.hospital_id || prev.hospital_id,
        visit_type: visit.visit_type || visit.type || 'checkup',
        // 'upcoming' is a legacy alias of 'scheduled' (canonicalizeVisitStatus);
        // map it here so the status Select (which only offers 'Scheduled') stays coherent.
        status: String(visit.status || '').toLowerCase() === 'upcoming'
          ? 'scheduled'
          : (visit.status || 'scheduled'),
        date: formattedDate,
        room_number: visit.room_number || prev.room_number || '',
        cost: visit.cost || prev.cost || '',
        estimated_duration: visit.estimated_duration || prev.estimated_duration || '',
        insurance_covered: visit.insurance_covered ?? prev.insurance_covered ?? true,
        preparation: Array.isArray(visit.preparation) ? visit.preparation.join('\n') : (visit.preparation || prev.preparation || '')
      }));

      if (visit.user_id || visit.hospital_id) {
        fetchVisitContext(visit).then(setVisitContext);
      }

      if (isEmergencyVisit(visit)) {
        setLoadingContext(true);
        fetchEmergencyContext(visit.request_id || visit.id)
          .then(context => {
            setEmergencyContext(context);
          })
          .catch(error => {
            console.error('Error fetching emergency context:', error);
          })
          .finally(() => {
            setLoadingContext(false);
          });
      }
    } else if (isCreate && isOrgAdmin() && orgId) {
      setFormData(prev => ({ ...prev, hospital_id: orgId }));
    }
  }, [visit, isCreate, isOrgAdmin, orgId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!onSave) {
      console.error('VisitModal: onSave prop is required but was not provided');
      toast.error('Configuration error: cannot save. Please reload the page.');
      return;
    }
    setLoading(true);

    try {
      const submitData = { ...formData };
      delete submitData.profiles;
      delete submitData.hospitals;
      delete submitData.user_email;
      delete submitData.hospital_name;
      delete submitData.hospital; // Remove hospital text field to prevent UUID conflicts

      // Convert preparation back to array if string
      if (typeof submitData.preparation === 'string') {
        submitData.preparation = submitData.preparation.split('\n').filter(line => line.trim() !== '');
      }

      await onSave(submitData);
      // Single toast owner is the page (VisitsPage.handleSaveVisit toasts
      // success and error itself, then re-throws) -- toasting here duplicated
      // every notification (V-16). The modal only closes on success and
      // stays open on failure so edits are not lost.
      onClose(true);
    } catch (error) {
      console.error('Error saving visit:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-500/20 text-blue-500';
      case 'in_progress': return 'bg-orange-500/20 text-orange-500';
      case 'completed': return 'bg-green-500/20 text-green-500';
      case 'cancelled': return 'bg-red-500/20 text-red-500';
      default: return 'bg-muted/20 text-muted-foreground';
    }
  };

  const modalTitle = formData.visit_type
    ? formData.visit_type.charAt(0).toUpperCase() + formData.visit_type.slice(1)
    : isCreate
      ? 'New visit'
      : 'Visit';
  const modalSubtitle = dateTimeLabel;
  const statusBadge = (
    <Badge className={`rounded-pill px-3 py-0.5 text-xs font-semibold ${getStatusColor(formData.status)}`}>
      {formData.status?.toUpperCase() || 'SCHEDULED'}
    </Badge>
  );

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={() => onClose(false)}
      title={modalTitle}
      subtitle={modalSubtitle}
      icon={<Calendar className="h-5 w-5 text-primary" />}
      badge={statusBadge}
      size="lg"
      managed
      className="bg-background"
    >
      <div className="p-2 md:p-8 pt-2 overflow-y-auto flex-1 min-h-0 space-y-6 no-scrollbar">
              <form onSubmit={handleSubmit} className="space-y-6">

                {/* Participants Section */}
                <GlassCard icon={<User className="text-primary" />} title="Participants">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="user_id" className="text-xs font-semibold text-muted-foreground uppercase">Patient</Label>
                      {isView ? (
                        <ReadOnlyField
                          value={patientLabel}
                          subtext={patientSubtext}
                          icon={<User className="h-4 w-4" />}
                        />
                      ) : (
                        <Select
                          value={formData.user_id}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, user_id: value }))}
                        >
                          <SelectTrigger className="h-14 rounded-inner bg-muted/30 font-normal">
                            <SelectValue placeholder="Select patient" />
                          </SelectTrigger>
                          <SelectContent className="rounded-inner bg-background/95 shadow-xl">
                            {users.map(u => (
                              <SelectItem key={u.id} value={u.id}>
                                <div className="flex items-center gap-2">
                                  <Avatar className="w-6 h-6">
                                    <AvatarImage src={u.avatar_url || "/placeholder.svg"} />
                                    <AvatarFallback>{u.username?.[0]}</AvatarFallback>
                                  </Avatar>
                                  <span>{u.username || u.email}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    {/* Hospital Selection - Scoped for Org Admin */}
                    {/* Doctor Display (Read Only if available) */}
                    {(isView || formData.doctor) && (
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase">Doctor / Unit</Label>
                        {isView ? (
                          <ReadOnlyField value={doctorLabel} icon={<User className="h-4 w-4" />} />
                        ) : (
                          <Input
                            value={doctorLabel}
                            disabled
                            className="h-12 rounded-inner bg-muted/30 font-normal md:h-14"
                          />
                        )}
                      </div>
                    )}

                    {/* Hospital Selection */}
                    <div className="space-y-2">
                      <Label htmlFor="hospital_id" className="text-xs font-semibold text-muted-foreground uppercase">Facility</Label>
                      {isView ? (
                        <ReadOnlyField
                          value={facilityLabel}
                          subtext={facilitySubtext}
                          icon={<Hospital className="h-4 w-4" />}
                        />
                      ) : (
                        <Select
                          value={formData.hospital_id || ''}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, hospital_id: value }))}
                        >
                          <SelectTrigger className="h-12 rounded-inner bg-muted/30 font-normal md:h-14">
                            <SelectValue placeholder="Select facility" />
                          </SelectTrigger>
                          <SelectContent className="rounded-inner bg-background/95 shadow-xl">
                            {hospitals.map(h => (
                              <SelectItem key={h.id} value={h.id}>
                                <div className="flex items-center gap-2">
                                  <Hospital className="w-4 h-4 text-muted-foreground" />
                                  <span>{h.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                </GlassCard>

                {/* Visit Details */}
                <GlassCard icon={<FileText className="text-primary" />} title="Details & Schedule">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="visit_type" className="text-xs font-semibold text-muted-foreground uppercase">Visit Type</Label>
                      {isView ? (
                        <ReadOnlyField value={visitTypeLabel} icon={<FileText className="h-4 w-4" />} />
                      ) : (
                        <Select
                          value={formData.visit_type}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, visit_type: value }))}
                        >
                          <SelectTrigger className="h-12 rounded-inner bg-muted/30 font-normal">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-inner bg-background/95 shadow-xl">
                            <SelectItem value="checkup">Checkup</SelectItem>
                            <SelectItem value="Regular Checkup">Regular Checkup</SelectItem>
                            <SelectItem value="emergency">Emergency</SelectItem>
                            <SelectItem value="follow_up">Follow Up</SelectItem>
                            <SelectItem value="consultation">Consultation</SelectItem>
                            <SelectItem value="Consultation">Consultation (Full)</SelectItem>
                            <SelectItem value="surgery">Surgery</SelectItem>
                            <SelectItem value="Telehealth">Telehealth</SelectItem>
                            <SelectItem value="Bed Booking">Bed Booking</SelectItem>
                            <SelectItem value="Ambulance Ride">Ambulance Ride</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="status" className="text-xs font-semibold text-muted-foreground uppercase">Current Status</Label>
                      {isView ? (
                        <ReadOnlyField value={statusLabel} icon={<Clock className="h-4 w-4" />} />
                      ) : (
                        <Select
                          value={formData.status}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                          disabled={isTerminalStatus}
                        >
                          <SelectTrigger className="h-12 rounded-inner bg-muted/30 font-normal">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-inner bg-background/95 shadow-xl">
                            {/* 'upcoming' canonicalizes to 'scheduled' (visitStatus.js), so offering
                                both was a vocabulary leak; prefill maps upcoming -> scheduled. */}
                            <SelectItem value="scheduled">Scheduled</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="completed" disabled>Completed</SelectItem>
                            <SelectItem value="cancelled" disabled>Cancelled</SelectItem>
                            <SelectItem value="no-show" disabled>No show</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                      {!isView && (
                        <p className="text-xs text-muted-foreground">
                          Status changes here stay in scheduling.
                        </p>
                      )}
                    </div>

                    <div className="col-span-1 md:col-span-2 space-y-2 min-w-0">
                      <Label htmlFor="date" className="text-xs font-semibold text-muted-foreground uppercase">Date & Time</Label>
                      {isView ? (
                        <ReadOnlyField value={dateTimeLabel} icon={<Calendar className="h-4 w-4" />} />
                      ) : (
                        <Input
                          id="date"
                          name="date"
                          type="datetime-local"
                          value={formData.date || ''}
                          onChange={handleChange}
                          className="h-12 w-full min-w-0 max-w-full rounded-inner bg-muted/30 text-sm font-normal focus-visible:shadow-[0_0_0_3px_hsl(var(--primary)/0.14)] md:font-mono md:text-base"
                        />
                      )}
                    </div>

                    <div className="col-span-1 md:col-span-2 space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase">Reason for Visit</Label>
                      {/* Read-only until command authority is proved (2026-07-09 arbitration):
                          the visits write whitelist is contract-locked by design and silently
                          drops `reason`, so an editable field here would lie about what saving
                          does. Reason is owned by the care flow that created the visit. */}
                      <ReadOnlyField
                        value={formData.reason || (isCreate ? 'Not set' : 'No reason recorded')}
                        icon={<FileText className="h-4 w-4" />}
                      />
                      {!isView && (
                        <p className="text-xs text-muted-foreground">
                          Reason is set by the care flow.
                        </p>
                      )}
                    </div>
                  </div>
                </GlassCard>

                {/* Logistics & Billing */}
                <GlassCard icon={<Clock className="text-primary" />} title="Logistics & Billing">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="room_number" className="text-xs font-semibold text-muted-foreground uppercase">Room Number</Label>
                      {isView ? (
                        <ReadOnlyField value={formData.room_number || 'No room'} icon={<Hospital className="h-4 w-4" />} />
                      ) : (
                        <Input
                          id="room_number"
                          name="room_number"
                          value={formData.room_number || ''}
                          onChange={handleChange}
                          className="h-12 rounded-inner bg-muted/30 font-mono focus-visible:shadow-[0_0_0_3px_hsl(var(--primary)/0.14)]"
                          placeholder="e.g. 405-B"
                        />
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="estimated_duration" className="text-xs font-semibold text-muted-foreground uppercase">Duration</Label>
                      {isView ? (
                        <ReadOnlyField value={formData.estimated_duration || 'Not set'} icon={<Clock className="h-4 w-4" />} />
                      ) : (
                        <Input
                          id="estimated_duration"
                          name="estimated_duration"
                          value={formData.estimated_duration || ''}
                          onChange={handleChange}
                          className="h-12 rounded-inner bg-muted/30 focus-visible:shadow-[0_0_0_3px_hsl(var(--primary)/0.14)]"
                          placeholder="e.g. 30 mins"
                        />
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cost" className="text-xs font-semibold text-muted-foreground uppercase">Cost</Label>
                      {isView ? (
                        <ReadOnlyField value={formData.cost || 'Not set'} icon={<FileText className="h-4 w-4" />} />
                      ) : (
                        <Input
                          id="cost"
                          name="cost"
                          value={formData.cost || ''}
                          onChange={handleChange}
                          className="h-12 rounded-inner bg-muted/30 font-mono focus-visible:shadow-[0_0_0_3px_hsl(var(--primary)/0.14)]"
                          placeholder="e.g. $150"
                        />
                      )}
                    </div>
                    <div className="space-y-2 flex flex-col justify-center">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase mb-2">Insurance</Label>
                      {isView ? (
                        <ReadOnlyField value={insuranceLabel} icon={<FileText className="h-4 w-4" />} />
                      ) : (
                        <div className="flex items-center gap-2 rounded-inner bg-muted/30 p-3 transition-colors hover:bg-primary/5">
                          <input
                            type="checkbox"
                            checked={formData.insurance_covered}
                            onChange={(e) => setFormData(prev => ({ ...prev, insurance_covered: e.target.checked }))}
                            className="h-5 w-5 rounded-button text-primary focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.14)]"
                          />
                          <span className="text-sm font-medium">Covered by Insurance</span>
                        </div>
                      )}
                    </div>
                  </div>
                </GlassCard>

                {/* Preparation & Notes */}
                <GlassCard icon={<FileText className="text-primary" />} title="Preparation & Notes">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="preparation" className="text-xs font-semibold text-muted-foreground uppercase">Preparation Instructions</Label>
                      {isView ? (
                        <ReadOnlyField value={formData.preparation || 'No preparation notes'} multiline icon={<FileText className="h-4 w-4" />} />
                      ) : (
                        <Textarea
                          id="preparation"
                          name="preparation"
                          value={formData.preparation || ''}
                          onChange={handleChange}
                          placeholder="One instruction per line..."
                          className="min-h-[80px] resize-none rounded-inner bg-muted/30 p-4 focus-visible:shadow-[0_0_0_3px_hsl(var(--primary)/0.14)]"
                        />
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes" className="text-xs font-semibold text-muted-foreground uppercase">Clinical Notes</Label>
                      {isView ? (
                        <ReadOnlyField value={formData.notes || 'No clinical notes'} multiline icon={<FileText className="h-4 w-4" />} />
                      ) : (
                        <Textarea
                          id="notes"
                          name="notes"
                          value={formData.notes || ''}
                          onChange={handleChange}
                          className="min-h-[100px] resize-none rounded-inner bg-muted/30 p-4 focus-visible:shadow-[0_0_0_3px_hsl(var(--primary)/0.14)]"
                          placeholder="Add notes here..."
                        />
                      )}
                    </div>
                  </div>
                </GlassCard>

                {/* Emergency Context Bridge */}
                {loadingContext ? (
                  <GlassCard icon={<Siren className="text-red-500" />} title="Loading Incident Context">
                    <div className="flex items-center justify-center py-8">
                      <div className="h-6 w-6 animate-pulse rounded-pill bg-red-500/20"></div>
                    </div>
                  </GlassCard>
                ) : emergencyContext ? (
                  <GlassCard icon={<Siren className="text-red-500" />} title="Incident Context">
                    <div className="space-y-4">
                      <div className="rounded-inner bg-red-500/5 p-4">
                        <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-2">Original Situation Report</p>
                        <p className="text-sm leading-relaxed italic">"{emergencyContext.emergency?.description || 'No description provided'}"</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">Service Type</p>
                          <p className="text-xs font-semibold">{emergencyContext.emergency?.serviceType || 'Emergency'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">Status</p>
                          <p className="text-xs font-semibold">{emergencyContext.emergency?.status || 'Unknown'}</p>
                        </div>
                      </div>
                      {emergencyContext.patient && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Patient</p>
                            <p className="text-xs font-semibold">{emergencyContext.patient.fullName || 'Unknown'}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Contact</p>
                            <p className="text-xs font-semibold">{emergencyContext.patient.phone || 'N/A'}</p>
                          </div>
                        </div>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full rounded-button text-[10px] font-bold uppercase tracking-wider text-red-500 hover:bg-red-500/5"
                        onClick={() => {
                          const event = new CustomEvent('openEmergencyDetails', { detail: emergencyContext.emergency });
                          window.dispatchEvent(event);
                          onClose(false);
                        }}
                      >
                        View Full Incident Log
                      </Button>
                    </div>
                  </GlassCard>
                ) : null}

                {/* Footer Actions */}
                <div className="flex justify-end gap-3 rounded-inner bg-muted/30 p-4 sm:p-6">
                  {!isView ? (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => onClose(false)}
                        className="rounded-button font-semibold text-muted-foreground hover:bg-muted"
                        disabled={loading}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="rounded-button bg-primary px-8 font-semibold hover:bg-primary/90"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                            Saving...
                          </>
                        ) : (isCreate ? 'Schedule Visit' : 'Save Changes')}
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="button"
                      onClick={() => onClose(false)}
                      className="rounded-button bg-muted px-8 font-semibold text-foreground hover:bg-muted/80"
                    >
                      Close
                    </Button>
                  )}
                </div>
              </form>
      </div>
    </ModalShell>
  );
};

/* Sub-components */
const GlassCard = ({ children, title, icon }) => (
  <div className="rounded-card bg-muted/30 p-4 sm:p-6">
    <div className="flex items-center gap-3 mb-4 sm:mb-6">
      <div className="rounded-icon bg-muted/50 p-1.5 sm:p-2">
        {React.cloneElement(icon, { size: 16, className: 'sm:h-5 sm:w-5' })}
      </div>
      <h3 className="font-semibold tracking-tight text-sm sm:text-base uppercase">{title}</h3>
    </div>
    {children}
  </div>
);

const ReadOnlyField = ({ value, subtext, icon, multiline = false }) => {
  const displayValue = Array.isArray(value)
    ? value.filter(Boolean).join('\n')
    : String(value || 'Not set');

  return (
    <div className={`flex gap-3 rounded-inner bg-muted/30 px-3 py-3 text-sm ${multiline ? 'min-h-[88px] items-start' : 'min-h-12 items-center md:min-h-14'}`}>
      {icon && (
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-icon bg-background/50 text-muted-foreground">
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className={`block font-medium text-foreground ${multiline ? 'whitespace-pre-wrap leading-6' : 'truncate'}`}>
          {displayValue}
        </span>
        {subtext && (
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
            {subtext}
          </span>
        )}
      </span>
    </div>
  );
};
