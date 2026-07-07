import React, { useCallback, useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { handleApiError } from "../../utils/errorHandler";
import { Siren, MapPin, Clock, Activity, Phone, User, AlertTriangle, Navigation, CheckCircle2 } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { format } from 'date-fns';
import { createNotification, NotificationTypes, NotificationActions } from '../../services/notificationService';
import { createEmergencyRequest, updateEmergencyRequest } from '../../services/emergencyService';
import { ModalShell } from '../ui/ModalShell';

const STATUS_STEPS = ['pending_approval', 'in_progress', 'accepted', 'arrived', 'completed'];
const STATUS_LABELS = {
  pending_approval: 'pending',
  in_progress: 'in progress',
  accepted: 'en route',
  arrived: 'arrived',
  completed: 'completed',
};
const STATUS_SHORT_LABELS = {
  pending_approval: 'new',
  in_progress: 'active',
  accepted: 'sent',
  arrived: 'arrived',
  completed: 'done',
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

const requestFieldClassName = 'rounded-button bg-black/5 shadow-[0_12px_30px_rgb(0_0_0/0.05)] transition-[background,box-shadow] focus:bg-background/80 focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.16)] dark:bg-white/5 dark:focus:bg-white/[0.08]';
const requestSelectContentClassName = 'rounded-inner bg-background/95 shadow-2xl backdrop-blur-xl';

export const EmergencyRequestModal = ({ isOpen, onClose, request, mode }) => {
  const isView = mode === 'view';
  const isEdit = mode === 'edit';
  const isCreate = mode === 'create';
  const formId = 'emergency-request-form';

  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState({
    user_id: '',
    service_type: 'ambulance',
    emergency_type: '',
    priority: 'medium',
    status: 'pending_approval',
    location: '',
    latitude: null,
    longitude: null,
    description: '',
    ...request // Pattern B: merge initial props
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (request) {
      setFormData(prev => ({
        ...prev, // Keep existing
        ...request, // Merge new
        // Explicit fallbacks for Selects
        priority: request.priority || prev.priority || 'medium',
        status: normalizeEmergencyStatus(request.status || prev.status || 'pending_approval'),
        user_id: request.user_id || prev.user_id || '',
        service_type: request.service_type || request.emergency_type || prev.service_type || 'ambulance',
        emergency_type: request.emergency_type || prev.emergency_type || ''
      }));
    }
  }, [request]);

  const fetchUsers = useCallback(async () => {
    try {
      const { data } = await supabase.from('profiles').select('id, username, email, phone, avatar_url');
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    fetchUsers();
  }, [fetchUsers, isOpen]);

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

        toast.success('Request created');
      } else if (isEdit) {
        await updateEmergencyRequest(request.id, payload);

        await createNotification(
          NotificationTypes.EMERGENCY,
          NotificationActions.UPDATED,
          request.id,
          { message: `Emergency request updated - Status: ${normalizedStatus || submitData.status}` }
        );

        toast.success('Request updated');
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
  const modalTitle = isCreate ? 'New request' : isEdit ? 'Edit request' : 'Request details';
  const modalSubtitle = isCreate
    ? 'Create a request and send it to the care queue.'
    : isEdit
      ? 'Update request details from the approved receiver.'
      : 'Review request details.';
  const submitLabel = loading ? 'Saving...' : isCreate ? 'Create request' : 'Save changes';

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={() => onClose(false)}
      title={modalTitle}
      subtitle={modalSubtitle}
      icon={<Siren className={`h-4 w-4 ${getPriorityColor(formData.priority)}`} />}
      badge={(
        <Badge className={`rounded-pill px-4 py-1 shadow-sm ${getPriorityBg(formData.priority)} ${getPriorityColor(formData.priority)}`}>
          {formData.priority || 'medium'}
        </Badge>
      )}
      size="xl"
      footer={(
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onClose(false)}
            className="h-12 rounded-button px-8 font-semibold"
          >
            {isView ? 'Close' : 'Cancel'}
          </Button>
          {!isView && (
            <Button
              type="submit"
              form={formId}
              disabled={loading}
              className="h-12 rounded-button bg-primary px-10 font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90"
            >
              {submitLabel}
            </Button>
          )}
        </div>
      )}
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-6 px-4 pb-4 pt-1 sm:px-8 sm:pb-8 sm:pt-2">

                {/* Status Bar */}
                <div className="flex items-center justify-between gap-2 rounded-inner bg-black/5 p-1.5 dark:bg-white/5">
                  {STATUS_STEPS.map((step, i) => {
                    const isCurrent = currentStatus === step;
                    const isPast = currentStepIndex > i;
                    return (
                      <button
                        key={step}
                        type="button"
                        disabled={isView}
                        aria-pressed={isCurrent}
                        onClick={!isView ? () => setFormData(prev => ({ ...prev, status: step })) : undefined}
                        className={`min-w-0 flex-1 rounded-button px-1.5 py-2 text-[9px] font-semibold uppercase tracking-wide transition-all sm:px-3 sm:text-[10px] sm:tracking-wider ${isCurrent ? 'bg-primary text-white shadow-lg shadow-primary/20' :
                          isPast ? 'text-primary/70 bg-primary/5' : 'text-muted-foreground/40'
                          }`}
                      >
                        <span className="hidden sm:inline">{STATUS_LABELS[step] || step.replace(/_/g, ' ')}</span>
                        <span className="sm:hidden">{STATUS_SHORT_LABELS[step] || STATUS_LABELS[step] || step.replace(/_/g, ' ')}</span>
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
                            <SelectTrigger className={`${requestFieldClassName} h-12`}>
                              <SelectValue placeholder="Select user" />
                            </SelectTrigger>
                            <SelectContent className={requestSelectContentClassName}>
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
                            <Avatar className="h-12 w-12 rounded-icon">
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
                          className={requestFieldClassName}
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <Input
                            type="number"
                            name="latitude"
                            value={formData.latitude || ''}
                            onChange={handleChange}
                            disabled={isView}
                            placeholder="Lat"
                            className={`${requestFieldClassName} font-mono text-xs`}
                          />
                          <Input
                            type="number"
                            name="longitude"
                            value={formData.longitude || ''}
                            onChange={handleChange}
                            disabled={isView}
                            placeholder="Lng"
                            className={`${requestFieldClassName} font-mono text-xs`}
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
                              onValueChange={(value) =>
                                setFormData(prev => ({
                                  ...prev,
                                  emergency_type: value,
                                  service_type: value || prev.service_type || 'ambulance',
                                }))
                              }
                              disabled={isView}
                            >
                              <SelectTrigger className={requestFieldClassName}>
                                <SelectValue placeholder="Type" />
                              </SelectTrigger>
                              <SelectContent className={requestSelectContentClassName}>
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
                              <SelectTrigger className={requestFieldClassName}>
                                <SelectValue placeholder="Priority" />
                              </SelectTrigger>
                              <SelectContent className={requestSelectContentClassName}>
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
                            className={`${requestFieldClassName} min-h-[100px] resize-none`}
                          />
                          <Input
                            type="hidden"
                            name="service_type"
                            value={formData.service_type || ''}
                            readOnly
                          />
                        </div>
                      </div>
                    </GlassCard>
                  </div>
                </div>

      </form>
    </ModalShell>
  );
};

/* Sub-components */

const GlassCard = ({ children, title, icon, className }) => (
  <div className={`rounded-card bg-black/5 p-4 shadow-[0_18px_55px_rgb(0_0_0/0.06)] dark:bg-white/5 sm:p-6 ${className}`}>
    <div className="flex items-center gap-3 mb-4 sm:mb-6">
      <div className="rounded-icon bg-white/5 p-1.5 sm:p-2">
        {React.cloneElement(icon, { size: 16, className: 'sm:h-5 sm:w-5' })}
      </div>
      <h3 className="font-semibold tracking-tight text-sm sm:text-base">{title}</h3>
    </div>
    {children}
  </div>
);
