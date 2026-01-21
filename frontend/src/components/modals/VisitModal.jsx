"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';
import { X, Calendar, User, Hospital, Clock, FileText } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useAuth } from '../../contexts/AuthContext';

export const VisitModal = ({ isOpen, onClose, visit, mode, onSave, users = [], hospitals = [] }) => {
  const isView = mode === 'view';
  const isEdit = mode === 'edit';
  const isCreate = mode === 'create';

  const [formData, setFormData] = useState(visit || {
    user_id: '',
    hospital_id: '',
    visit_type: 'checkup',
    status: 'scheduled',
    scheduled_at: '',
    notes: '',
    reason: '',
    hospitals: null,
    profiles: null
  });

  const [loading, setLoading] = useState(false);

  const { isAdmin, isOrgAdmin, orgId } = useAuth();
  useEffect(() => {
    if (visit) {
      setFormData({
        ...visit,
        scheduled_at: visit.scheduled_at ? new Date(visit.scheduled_at).toISOString().slice(0, 16) : ''
      });
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
      delete submitData.hospital_name;

      if (onSave) {
        await onSave(submitData);
      }
      toast.success(isCreate ? 'Visit scheduled successfully' : 'Visit updated successfully');
      onClose(true);
    } catch (error) {
      console.error('Error saving visit:', error);
      toast.error('Failed to save visit');
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
                      {formData.scheduled_at ? new Date(formData.scheduled_at).toLocaleString() : 'Date not set'}
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
                    </div>

                    {/* Hospital Selection - Scoped for Org Admin */}
                    {(isAdmin() || (isOrgAdmin() && isView)) && (
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70">
                          Hospital
                        </Label>
                        <Select
                          disabled={isView}
                          value={formData.hospital_id || ""}
                          onValueChange={(value) => setFormData({ ...formData, hospital_id: value })}
                        >
                          <SelectTrigger className="squircle bg-muted/30 border-0 h-11">
                            <SelectValue placeholder="Select Hospital" />
                          </SelectTrigger>
                          <SelectContent className="geo-sharp border-white/10 bg-background/95 backdrop-blur-xl">
                            {hospitals.map((h) => (
                              <SelectItem key={h.id} value={h.id}>
                                {h.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {!(isAdmin() || (isOrgAdmin() && isView)) && (
                      <div className="space-y-2">
                        <Label htmlFor="hospital_id" className="text-xs font-semibold text-muted-foreground uppercase">Facility</Label>
                        <Select
                          value={formData.hospital_id}
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
                      </div>
                    )}
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
                          <SelectItem value="emergency">Emergency</SelectItem>
                          <SelectItem value="follow_up">Follow Up</SelectItem>
                          <SelectItem value="consultation">Consultation</SelectItem>
                          <SelectItem value="surgery">Surgery</SelectItem>
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
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="col-span-1 md:col-span-2 space-y-2">
                      <Label htmlFor="scheduled_at" className="text-xs font-semibold text-muted-foreground uppercase">Date & Time</Label>
                      <Input
                        id="scheduled_at"
                        name="scheduled_at"
                        type="datetime-local"
                        value={formData.scheduled_at}
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
                        value={formData.reason}
                        onChange={handleChange}
                        disabled={isView}
                        className="rounded-2xl bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary/50 h-12 font-normal"
                        placeholder="e.g., Annual checkup"
                      />
                    </div>

                    <div className="col-span-1 md:col-span-2 space-y-2">
                      <Label htmlFor="notes" className="text-xs font-semibold text-muted-foreground uppercase">Clinical Notes</Label>
                      <Textarea
                        id="notes"
                        name="notes"
                        value={formData.notes}
                        onChange={handleChange}
                        disabled={isView}
                        className="rounded-2xl bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary/50 min-h-[100px] resize-none p-4"
                        placeholder="Add notes here..."
                      />
                    </div>
                  </div>
                </GlassCard>

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
