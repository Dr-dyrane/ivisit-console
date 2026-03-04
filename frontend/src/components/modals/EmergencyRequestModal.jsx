import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { handleApiError } from "../../utils/errorHandler";
import { X, Siren, MapPin, Clock, Activity, Phone, User, AlertTriangle, Navigation, CheckCircle2 } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { format } from 'date-fns';
import { createNotification, NotificationTypes, NotificationActions } from '../../services/notificationService';
import { createEmergencyRequest, updateEmergencyRequest } from '../../services/emergencyService';

const STATUS_STEPS = ['pending_approval', 'in_progress', 'accepted', 'arrived', 'completed'];
const STATUS_LABELS = {
  pending_approval: 'pending',
  in_progress: 'in progress',
  accepted: 'en route',
  arrived: 'arrived',
  completed: 'completed',
};

const STATUS_ALIAS_TO_DB = {
  pending: 'pending_approval',
  dispatched: 'in_progress',
  en_route: 'accepted',
  assigned: 'accepted',
  responding: 'accepted',
  canceled: 'cancelled',
};

const normalizeEmergencyStatus = (value, fallback = 'pending_approval') => {
  const status = String(value || '').toLowerCase();
  if (!status) return fallback;
  return STATUS_ALIAS_TO_DB[status] || status;
};

export const EmergencyRequestModal = ({ isOpen, onClose, request, mode }) => {
  const isView = mode === 'view';
  const isEdit = mode === 'edit';
  const isCreate = mode === 'create';

  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState({
    user_id: '',
    emergency_type: '',
    priority: 'medium',
    status: 'pending_approval',
    location: '',
    latitude: null,
    longitude: null,
    description: '',
    ...request // ✅ Pattern B: Merge initial props
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (request) {
      setFormData(prev => ({
        ...prev, // ✅ Keep existing
        ...request, // ✅ Merge new
        // Explicit fallbacks for Selects
        priority: request.priority || prev.priority || 'medium',
        status: normalizeEmergencyStatus(request.status || prev.status || 'pending_approval'),
        user_id: request.user_id || prev.user_id || '',
        emergency_type: request.emergency_type || prev.emergency_type || ''
      }));
    }
  }, [request]);

  const fetchUsers = async () => {
    try {
      const { data } = await supabase.from('profiles').select('id, username, email, phone, avatar_url');
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = { ...formData };
      delete submitData.profiles;
      const normalizedStatus = submitData.status
        ? normalizeEmergencyStatus(submitData.status)
        : undefined;
      const payload = {
        user_id: submitData.user_id || undefined,
        service_type: submitData.service_type || submitData.emergency_type || 'ambulance',
        specialty: submitData.specialty || submitData.emergency_type || undefined,
        status: normalizedStatus || undefined,
        hospital_id: submitData.hospital_id || undefined,
        hospital_name: submitData.hospital_name || undefined,
        ambulance_type: submitData.ambulance_type || undefined,
        bed_number: submitData.bed_number || undefined,
        total_cost: submitData.total_cost ?? undefined,
        payment_status: submitData.payment_status || undefined,
        patient_snapshot: {
          priority: submitData.priority || undefined,
          location_text: submitData.location || undefined,
          description: submitData.description || undefined,
        },
        patient_location:
          submitData.latitude !== null &&
          submitData.latitude !== undefined &&
          submitData.longitude !== null &&
          submitData.longitude !== undefined
            ? { latitude: Number(submitData.latitude), longitude: Number(submitData.longitude) }
            : undefined,
      };

      if (isCreate) {
        const created = await createEmergencyRequest(payload);
        const createdId = created?.id;
        if (createdId) {
          await createNotification(
            NotificationTypes.EMERGENCY,
            NotificationActions.CREATED,
            createdId,
            { message: `Emergency request created - Priority: ${submitData.priority}` }
          );
        }

        toast.success('Emergency request created successfully');
      } else if (isEdit) {
        await updateEmergencyRequest(request.id, payload);

        await createNotification(
          NotificationTypes.EMERGENCY,
          NotificationActions.UPDATED,
          request.id,
          { message: `Emergency request updated - Status: ${normalizedStatus || submitData.status}` }
        );

        toast.success('Incident report updated');
      }

      onClose(true);
    } catch (error) {
      console.error('Error saving emergency request:', error);
      handleApiError(error, 'create');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (p) => {
    switch (p) {
      case 'critical': return 'text-red-500';
      case 'high': return 'text-orange-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-blue-500';
      default: return 'text-muted-foreground';
    }
  };

  const getPriorityBg = (p) => {
    switch (p) {
      case 'critical': return 'bg-red-500/10';
      case 'high': return 'bg-orange-500/10';
      case 'medium': return 'bg-yellow-500/10';
      case 'low': return 'bg-blue-500/10';
      default: return 'bg-muted/10';
    }
  };

  const selectedUser = users.find(u => u.id === formData.user_id);
  const currentStatus = normalizeEmergencyStatus(formData.status);
  const currentStepIndex = STATUS_STEPS.indexOf(currentStatus);

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
                <div className={`p-2.5 rounded-2xl ${getPriorityBg(formData.priority)} ${getPriorityColor(formData.priority)}`}>
                  <Siren className="h-6 w-6" />
                </div>
                <div className="hidden sm:block">
                  <h2 className="text-2xl font-semibold tracking-tight text-foreground/90">
                    {formData.emergency_type ? formData.emergency_type.replace('_', ' ').toUpperCase() : 'NEW EMERGENCY'}
                  </h2>
                  <p className="text-sm text-muted-foreground">Incident dispatch and reporting system</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge className={`rounded-full px-4 py-1 border-0 ${getPriorityBg(formData.priority)} ${getPriorityColor(formData.priority)}`}>
                  {formData.priority?.toUpperCase()}
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
              <form onSubmit={handleSubmit} className="space-y-6">

                {/* Status Bar */}
                <div className="p-1.5 rounded-[20px] bg-white/5  flex items-center justify-between gap-2">
                  {STATUS_STEPS.map((step, i) => {
                    const isCurrent = currentStatus === step;
                    const isPast = currentStepIndex > i;
                    return (
                      <button
                        key={step}
                        type="button"
                        onClick={!isView ? () => setFormData(prev => ({ ...prev, status: step })) : undefined}
                        className={`flex-1 py-2 px-3 rounded-xl transition-all text-[10px] font-semibold uppercase tracking-wider ${isCurrent ? 'bg-primary text-white shadow-lg shadow-primary/20' :
                          isPast ? 'text-primary/70 bg-primary/5' : 'text-muted-foreground/40'
                          }`}
                      >
                        {STATUS_LABELS[step] || step.replace(/_/g, ' ')}
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-6">
                    <GlassCard icon={<User className="text-primary" />} title="Requester">
                      <div className="space-y-4">
                        {!isView ? (
                          <Select
                            value={formData.user_id}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, user_id: value }))}
                          >
                            <SelectTrigger className="rounded-2xl bg-white/5 border-white/10 h-12">
                              <SelectValue placeholder="Select user" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-white/10 bg-background/95 backdrop-blur-xl">
                              {users.map(u => (
                                <SelectItem key={u.id} value={u.id}>
                                  <div className="flex items-center gap-2">
                                    <Avatar className="w-6 h-6">
                                      <AvatarImage src={u.avatar_url} />
                                      <AvatarFallback>{u.username?.[0]}</AvatarFallback>
                                    </Avatar>
                                    <span>{u.username}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="flex items-center gap-4 p-2">
                            <Avatar className="w-12 h-12 rounded-xl ">
                              <AvatarImage src={selectedUser?.avatar_url} />
                              <AvatarFallback>{selectedUser?.username?.[0] || 'U'}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold">{selectedUser?.username || 'Unknown User'}</p>
                              <p className="text-xs text-muted-foreground">{selectedUser?.phone || 'No phone'}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </GlassCard>

                    <GlassCard icon={<MapPin className="text-green-500" />} title="Location">
                      <div className="space-y-4">
                        <Input
                          value={formData.location}
                          onChange={handleChange}
                          name="location"
                          disabled={isView}
                          placeholder="Location address..."
                          className="rounded-xl bg-white/5 border-white/10"
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <Input
                            type="number"
                            name="latitude"
                            value={formData.latitude || ''}
                            onChange={handleChange}
                            disabled={isView}
                            placeholder="Lat"
                            className="rounded-xl bg-white/5 border-white/10 font-mono text-xs"
                          />
                          <Input
                            type="number"
                            name="longitude"
                            value={formData.longitude || ''}
                            onChange={handleChange}
                            disabled={isView}
                            placeholder="Lng"
                            className="rounded-xl bg-white/5 border-white/10 font-mono text-xs"
                          />
                        </div>
                      </div>
                    </GlassCard>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-6">
                    <GlassCard icon={<Activity className="text-orange-500" />} title="Incident Details">
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-[10px] uppercase tracking-widest opacity-50 ml-1">Type</Label>
                            <Select
                              value={formData.emergency_type}
                              onValueChange={(value) => setFormData(prev => ({ ...prev, emergency_type: value }))}
                              disabled={isView}
                            >
                              <SelectTrigger className="rounded-xl bg-white/5 border-white/10">
                                <SelectValue placeholder="Type" />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl border-white/10 bg-background/95 backdrop-blur-xl">
                                <SelectItem value="cardiac">Cardiac</SelectItem>
                                <SelectItem value="accident">Accident</SelectItem>
                                <SelectItem value="respiratory">Respiratory</SelectItem>
                                <SelectItem value="stroke">Stroke</SelectItem>
                                <SelectItem value="pregnancy">Pregnancy</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[10px] uppercase tracking-widest opacity-50 ml-1">Priority</Label>
                            <Select
                              value={formData.priority}
                              onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
                              disabled={isView}
                            >
                              <SelectTrigger className="rounded-xl bg-white/5 border-white/10">
                                <SelectValue placeholder="Priority" />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl border-white/10 bg-background/95 backdrop-blur-xl">
                                <SelectItem value="critical">Critical</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="low">Low</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase tracking-widest opacity-50 ml-1">Description</Label>
                          <Textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            disabled={isView}
                            placeholder="Detailed situation report..."
                            className="rounded-xl bg-white/5 border-white/10 min-h-[100px] resize-none"
                          />
                        </div>
                      </div>
                    </GlassCard>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="sticky bottom-0 z-10 flex items-center justify-end gap-3 pt-4 pb-2 border-t border-white/5 bg-background/70 backdrop-blur-sm">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => onClose(false)}
                    className="rounded-full px-8 h-12 font-semibold"
                  >
                    {isView ? 'Close' : 'Cancel'}
                  </Button>
                  {!isView && (
                    <Button
                      type="submit"
                      disabled={loading}
                      className="rounded-full px-12 h-12 bg-primary hover:bg-primary/90 text-white font-semibold shadow-lg shadow-primary/20"
                    >
                      {loading ? 'Processing...' : (isCreate ? 'Dispatch Unit' : 'Update Record')}
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
