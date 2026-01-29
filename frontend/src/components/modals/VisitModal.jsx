"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';
import { handleApiError } from "../../utils/errorHandler";
import { X, Calendar, User, Hospital, Clock, FileText, Siren } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useAuth } from '../../contexts/AuthContext';
import { fetchVisitContext, fetchEmergencyContext, formatVisitDateTime, isEmergencyVisit } from '../../utils/visitContextUtils';

export const VisitModal = ({ isOpen, onClose, visit, mode, onSave, users = [], hospitals = [] }) => {
  // Debug: Log incoming visit data
  React.useEffect(() => {
    console.log('🔍 VisitModal - Visit Data:', visit);
    console.log('🔍 VisitModal - Mode:', mode);
  }, [visit, mode]);

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
    ...visit // ✅ Spread visit for initial prefill
  });

  const [loading, setLoading] = useState(false);

  const { isAdmin, isOrgAdmin, orgId } = useAuth();
  const [visitContext, setVisitContext] = useState(null);
  const [emergencyContext, setEmergencyContext] = useState(null);
  const [loadingContext, setLoadingContext] = useState(false);

  useEffect(() => {
    if (visit) {
      // ✅ Use proper date formatting - no manual parsing
      const formattedDate = formatVisitDateTime(visit);

      setFormData(prev => ({
        ...prev,
        ...visit,
        user_id: visit.user_id || prev.user_id,
        hospital_id: visit.hospital_id || prev.hospital_id,
        visit_type: visit.visit_type || visit.type || 'checkup',
        status: visit.status || 'scheduled',
        date: formattedDate,
        room_number: visit.room_number || prev.room_number || '',
        cost: visit.cost || prev.cost || '',
        estimated_duration: visit.estimated_duration || prev.estimated_duration || '',
        insurance_covered: visit.insurance_covered ?? prev.insurance_covered ?? true,
        preparation: Array.isArray(visit.preparation) ? visit.preparation.join('\n') : (visit.preparation || prev.preparation || '')
      }));

      // ✅ Fetch visit context using proper services
      if (visit.user_id || visit.hospital_id) {
        fetchVisitContext(visit).then(setVisitContext);
      }

      // ✅ Fetch Emergency Context if this visit originated from one
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
    setLoading(true);

    try {
      const submitData = { ...formData };
      delete submitData.profiles;
      delete submitData.hospitals;
      delete submitData.user_email;
      delete submitData.user_email;
      delete submitData.hospital_name;

      // Convert preparation back to array if string
      if (typeof submitData.preparation === 'string') {
        submitData.preparation = submitData.preparation.split('\n').filter(line => line.trim() !== '');
      }

      if (onSave) {
        await onSave(submitData);
      }
      toast.success(isCreate ? 'Visit scheduled successfully' : 'Visit updated successfully');
      onClose(true);
    } catch (error) {
      console.error('Error saving visit:', error);
      handleApiError(error, 'create');
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

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
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
            className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-[32px] shadow-2xl"
          >
            {/* Header Area */}
            <div className="flex items-center justify-between p-8 pb-4">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-blue-500/20 rounded-2xl">
                  <Calendar className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-foreground/90">
                    {formData.visit_type ? formData.visit_type.charAt(0).toUpperCase() + formData.visit_type.slice(1) : 'New Visit'}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={`rounded-full border-0 font-semibold px-3 py-0.5 text-xs ${getStatusColor(formData.status)}`}>
                      {formData.status?.toUpperCase()}
                    </Badge>
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formData.date ? new Date(formData.date).toLocaleString() : 'Date not set'}
                    </span>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                onClick={() => onClose(false)}
                className="h-10 w-10 rounded-full bg-muted/50 hover:bg-muted transition-colors"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="p-8 pt-2 overflow-y-auto max-h-[calc(90vh-120px)] space-y-6 no-scrollbar">
              <form onSubmit={handleSubmit} className="space-y-6">

                {/* Participants Section */}
                <GlassCard icon={<User className="text-primary" />} title="Participants">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="user_id" className="text-xs font-semibold text-muted-foreground uppercase">Patient</Label>
                      {isView && visitContext?.patient ? (
                        <div className="flex items-center gap-3 p-3 rounded-2xl bg-muted/30 border-0 h-14">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={visitContext.patient.avatar} />
                            <AvatarFallback>{visitContext.patient.fullName?.[0] || 'U'}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium text-sm">
                              {visitContext.patient.fullName || 'Unknown Patient'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {visitContext.patient.email || 'No email'}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <Select
                          value={formData.user_id}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, user_id: value }))}
                          disabled={isView}
                        >
                          <SelectTrigger className="rounded-2xl bg-muted/30 border-0 h-14 font-normal">
                            <SelectValue placeholder="Select patient" />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl border-0 shadow-xl bg-background/95 backdrop-blur-xl">
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
                        <Input
                          value={
                            formData.doctor?.name ||
                            (typeof formData.doctor === 'string' ? formData.doctor : 'Unassigned')
                          }
                          disabled
                          className="rounded-2xl bg-muted/30 border-0 h-14 font-normal"
                        />
                      </div>
                    )}

                    {/* Hospital Selection */}
                    <div className="space-y-2">
                      <Label htmlFor="hospital_id" className="text-xs font-semibold text-muted-foreground uppercase">Facility</Label>
                      {isView && visitContext?.hospital ? (
                        <div className="flex items-center gap-3 p-3 rounded-2xl bg-muted/30 border-0 h-14">
                          <Hospital className="w-5 h-5 text-muted-foreground" />
                          <div className="flex-1">
                            <p className="font-medium text-sm">
                              {visitContext.hospital.name || 'Unknown Hospital'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {visitContext.hospital.address || 'No address'}
                            </p>
                          </div>
                        </div>
                      ) : isView && !formData.hospital_id && formData.hospital ? (
                        <div className="flex items-center h-14 w-full rounded-2xl border border-input bg-muted/30 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50">
                          <span className="flex items-center gap-2">
                            <Hospital className="w-4 h-4 text-muted-foreground" />
                            {formData.hospital}
                          </span>
                        </div>
                      ) : (
                        <Select
                          value={formData.hospital_id || ''}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, hospital_id: value }))}
                          disabled={isView}
                        >
                          <SelectTrigger className="rounded-2xl bg-muted/30 border-0 h-14 font-normal">
                            <SelectValue placeholder="Select facility" />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl border-0 shadow-xl bg-background/95 backdrop-blur-xl">
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
                      <Select
                        value={formData.visit_type}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, visit_type: value }))}
                        disabled={isView}
                      >
                        <SelectTrigger className="rounded-2xl bg-muted/30 border-0 h-12 font-normal">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-0 shadow-xl bg-background/95 backdrop-blur-xl">
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
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="status" className="text-xs font-semibold text-muted-foreground uppercase">Current Status</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                        disabled={isView}
                      >
                        <SelectTrigger className="rounded-2xl bg-muted/30 border-0 h-12 font-normal">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-0 shadow-xl bg-background/95 backdrop-blur-xl">
                          <SelectItem value="scheduled">Scheduled</SelectItem>
                          <SelectItem value="upcoming">Upcoming</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="col-span-1 md:col-span-2 space-y-2">
                      <Label htmlFor="date" className="text-xs font-semibold text-muted-foreground uppercase">Date & Time</Label>
                      <Input
                        id="date"
                        name="date"
                        type="datetime-local"
                        value={formData.date || ''}
                        onChange={handleChange}
                        disabled={isView}
                        className="rounded-2xl bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary/50 h-12 font-mono"
                      />
                    </div>

                    <div className="col-span-1 md:col-span-2 space-y-2">
                      <Label htmlFor="reason" className="text-xs font-semibold text-muted-foreground uppercase">Reason for Visit</Label>
                      <Input
                        id="reason"
                        name="reason"
                        value={formData.reason || ''}
                        onChange={handleChange}
                        disabled={isView}
                        className="rounded-2xl bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary/50 h-12 font-normal"
                        placeholder="e.g., Annual checkup"
                      />
                    </div>
                  </div>
                </GlassCard>

                {/* Logistics & Billing */}
                <GlassCard icon={<Clock className="text-primary" />} title="Logistics & Billing">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="room_number" className="text-xs font-semibold text-muted-foreground uppercase">Room Number</Label>
                      <Input
                        id="room_number"
                        name="room_number"
                        value={formData.room_number || ''}
                        onChange={handleChange}
                        disabled={isView}
                        className="rounded-2xl bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary/50 h-12 font-mono"
                        placeholder="e.g. 405-B"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="estimated_duration" className="text-xs font-semibold text-muted-foreground uppercase">Duration</Label>
                      <Input
                        id="estimated_duration"
                        name="estimated_duration"
                        value={formData.estimated_duration || ''}
                        onChange={handleChange}
                        disabled={isView}
                        className="rounded-2xl bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary/50 h-12"
                        placeholder="e.g. 30 mins"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cost" className="text-xs font-semibold text-muted-foreground uppercase">Cost</Label>
                      <Input
                        id="cost"
                        name="cost"
                        value={formData.cost || ''}
                        onChange={handleChange}
                        disabled={isView}
                        className="rounded-2xl bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary/50 h-12 font-mono"
                        placeholder="e.g. $150"
                      />
                    </div>
                    <div className="space-y-2 flex flex-col justify-center">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase mb-2">Insurance</Label>
                      <div className="flex items-center gap-2 p-3 rounded-2xl bg-muted/30 border border-transparent hover:border-primary/20 transition-colors">
                        <input
                          type="checkbox"
                          checked={formData.insurance_covered}
                          onChange={(e) => setFormData(prev => ({ ...prev, insurance_covered: e.target.checked }))}
                          disabled={isView}
                          className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <span className="text-sm font-medium">Covered by Insurance</span>
                      </div>
                    </div>
                  </div>
                </GlassCard>

                {/* Preparation & Notes */}
                <GlassCard icon={<FileText className="text-primary" />} title="Preparation & Notes">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="preparation" className="text-xs font-semibold text-muted-foreground uppercase">Preparation Instructions</Label>
                      <Textarea
                        id="preparation"
                        name="preparation"
                        value={formData.preparation || ''}
                        onChange={handleChange}
                        disabled={isView}
                        placeholder="One instruction per line..."
                        className="rounded-2xl bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary/50 min-h-[80px] resize-none p-4"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes" className="text-xs font-semibold text-muted-foreground uppercase">Clinical Notes</Label>
                      <Textarea
                        id="notes"
                        name="notes"
                        value={formData.notes || ''}
                        onChange={handleChange}
                        disabled={isView}
                        className="rounded-2xl bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary/50 min-h-[100px] resize-none p-4"
                        placeholder="Add notes here..."
                      />
                    </div>
                  </div>
                </GlassCard>

                {/* Emergency Context Bridge */}
                {loadingContext ? (
                  <GlassCard icon={<Siren className="text-red-500" />} title="Loading Incident Context">
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-500"></div>
                    </div>
                  </GlassCard>
                ) : emergencyContext ? (
                  <GlassCard icon={<Siren className="text-red-500" />} title="Incident Context">
                    <div className="space-y-4">
                      <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/10">
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
                        className="w-full rounded-xl border-red-500/20 text-red-500 hover:bg-red-500/5 text-[10px] font-bold uppercase tracking-wider"
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
                <div className="p-4 sm:p-6 rounded-[24px] bg-muted/30  flex gap-3 justify-end">
                  {!isView ? (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => onClose(false)}
                        className="rounded-2xl font-semibold text-muted-foreground hover:bg-muted"
                        disabled={loading}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="rounded-2xl bg-primary hover:bg-primary/90 font-semibold px-8"
                        disabled={loading}
                      >
                        {loading ? 'Saving...' : (isCreate ? 'Schedule Visit' : 'Save Changes')}
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="button"
                      onClick={() => onClose(false)}
                      className="rounded-2xl bg-muted text-foreground hover:bg-muted/80 font-semibold px-8"
                    >
                      Close
                    </Button>
                  )}
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

/* Sub-components */
const GlassCard = ({ children, title, icon }) => (
  <div className="p-4 sm:p-6 rounded-[28px] bg-muted/30 ">
    <div className="flex items-center gap-3 mb-4 sm:mb-6">
      <div className="p-1.5 sm:p-2 bg-muted/50 rounded-lg">
        {React.cloneElement(icon, { size: 16, className: 'sm:h-5 sm:w-5' })}
      </div>
      <h3 className="font-semibold tracking-tight text-sm sm:text-base uppercase">{title}</h3>
    </div>
    {children}
  </div>
);
