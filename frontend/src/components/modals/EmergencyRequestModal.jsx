import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';
import { handleApiError } from "../../utils/errorHandler";
import { Siren, MapPin, Activity, User } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { createNotification, NotificationTypes, NotificationActions } from '../../services/notificationService';
import {
  createEmergencyRequest,
  getEmergencyCreateFacilityOptions,
  updateEmergencyRequest,
} from '../../services/emergencyService';
import { getEmergencyPatientOptions } from '../../services/profilesService';
import { ModalShell } from '../ui/ModalShell';
import { useAuth } from '../../contexts/AuthContext';

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

const SUPPORTED_SERVICE_TYPES = new Set(['ambulance', 'bed', 'booking']);
const normalizeServiceType = (value, fallback = 'ambulance') => {
  const serviceType = String(value || '').trim().toLowerCase();
  return SUPPORTED_SERVICE_TYPES.has(serviceType) ? serviceType : fallback;
};

const requestFieldClassName = 'h-11 rounded-inner bg-background/60 transition-[background,box-shadow] focus-visible:shadow-[0_0_0_3px_hsl(var(--primary)/0.18)] dark:bg-white/[0.06]';
const requestSelectContentClassName = 'rounded-inner bg-background/95 shadow-2xl backdrop-blur-xl';

export const EmergencyRequestModal = ({ isOpen, onClose, request, mode }) => {
  const { isAdmin, isOrgAdmin } = useAuth();
  const resolvedMode = mode || (request ? 'view' : 'create');
  const isView = resolvedMode === 'view';
  const isEdit = resolvedMode === 'edit';
  const isCreate = resolvedMode === 'create';
  const formId = 'emergency-request-form';

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [usersPartial, setUsersPartial] = useState(false);
  const [facilities, setFacilities] = useState([]);
  const [facilitiesLoading, setFacilitiesLoading] = useState(false);
  const [facilitiesError, setFacilitiesError] = useState('');
  const [facilitiesPartial, setFacilitiesPartial] = useState(false);
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
        service_type: normalizeServiceType(request.service_type || prev.service_type),
        emergency_type: request.patient_snapshot?.incident_type || request.emergency_type || prev.emergency_type || ''
      }));
    }
  }, [request]);

  useEffect(() => {
    if (!isOpen || isView) return undefined;

    let active = true;
    setUsersLoading(true);
    setUsersError('');
    getEmergencyPatientOptions()
      .then((result) => {
        if (!active) return;
        setUsers(result.data || []);
        setUsersPartial(Boolean(result.isPartial));
      })
      .catch((error) => {
        if (!active) return;
        console.error('Error fetching patient options:', error);
        setUsers([]);
        setUsersPartial(false);
        setUsersError(error?.message || 'Patient lookup is temporarily unavailable.');
      })
      .finally(() => {
        if (active) setUsersLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, isView]);

  useEffect(() => {
    if (!isOpen || !isCreate || (!isAdmin() && !isOrgAdmin())) return undefined;

    let active = true;
    setFacilitiesLoading(true);
    setFacilitiesError('');
    getEmergencyCreateFacilityOptions()
      .then((result) => {
        if (!active) return;
        setFacilities(result.data || []);
        setFacilitiesPartial(Boolean(result.isPartial));
      })
      .catch((error) => {
        if (!active) return;
        console.error('Error fetching emergency facility options:', error);
        setFacilities([]);
        setFacilitiesPartial(false);
        setFacilitiesError(error?.message || 'Facilities could not be loaded. Try again.');
      })
      .finally(() => {
        if (active) setFacilitiesLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isAdmin, isCreate, isOpen, isOrgAdmin]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? null : Number(value)) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const facilityRequired = isCreate && isOrgAdmin();
    if (facilityRequired && !formData.hospital_id) {
      toast.error('Select a facility in your organization before creating this request.');
      return;
    }

    const hasLatitude = formData.latitude !== null && formData.latitude !== undefined && formData.latitude !== '';
    const hasLongitude = formData.longitude !== null && formData.longitude !== undefined && formData.longitude !== '';
    const latitude = Number(formData.latitude);
    const longitude = Number(formData.longitude);
    if (
      hasLatitude !== hasLongitude ||
      (hasLatitude && (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
      ))
    ) {
      toast.error('Enter a valid latitude and longitude together.');
      return;
    }

    setLoading(true);

    try {
      const submitData = { ...formData };
      delete submitData.profiles;
      const normalizedStatus = submitData.status
        ? normalizeEmergencyStatus(submitData.status)
        : undefined;
      const existingSnapshot = submitData.patient_snapshot && typeof submitData.patient_snapshot === 'object'
        ? submitData.patient_snapshot
        : {};
      const payload = {
        user_id: submitData.user_id || undefined,
        service_type: normalizeServiceType(submitData.service_type),
        specialty: submitData.specialty || undefined,
        status: isCreate ? 'pending_approval' : normalizedStatus || undefined,
        hospital_id: submitData.hospital_id || undefined,
        hospital_name: submitData.hospital_name || undefined,
        ambulance_type: submitData.ambulance_type || undefined,
        bed_number: submitData.bed_number || undefined,
        total_cost: submitData.total_cost ?? undefined,
        payment_status: submitData.payment_status || undefined,
        patient_snapshot: {
          ...existingSnapshot,
          priority: submitData.priority || undefined,
          incident_type: submitData.emergency_type || undefined,
          location_text: submitData.location || undefined,
          description: submitData.description || undefined,
        },
        patient_location: hasLatitude ? { lat: latitude, lng: longitude } : undefined,
        description: submitData.description || undefined,
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

  const selectedUser = users.find(u => u.id === formData.user_id)
    || request?.profiles
    || request?.profile
    || null;
  const currentStatus = normalizeEmergencyStatus(formData.status);
  const currentStepIndex = STATUS_STEPS.indexOf(currentStatus);
  const modalTitle = isCreate ? 'New request' : isEdit ? 'Edit request' : 'Request details';
  const modalSubtitle = isCreate
    ? 'Create a request and send it to the care queue.'
    : isEdit
      ? 'Update request details from the approved receiver.'
      : 'Review request details.';
  const submitLabel = loading ? 'Saving...' : isCreate ? 'Create request' : 'Save changes';
  const facilityRequired = isCreate && isOrgAdmin();
  const showFacilityControl = isCreate && (isAdmin() || isOrgAdmin());
  const submitDisabled = loading || (
    facilityRequired && (
      facilitiesLoading ||
      Boolean(facilitiesError) ||
      !formData.hospital_id
    )
  );

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={() => onClose(false)}
      title={modalTitle}
      subtitle={modalSubtitle}
      icon={<Siren className={`h-4 w-4 ${getPriorityColor(formData.priority)}`} />}
      badge={(
        <Badge className={`rounded-pill px-4 py-1 ${getPriorityBg(formData.priority)} ${getPriorityColor(formData.priority)}`}>
          {formData.priority || 'medium'}
        </Badge>
      )}
      size="lg"
      footer={(
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onClose(false)}
            className="h-12 rounded-button bg-muted/60 px-8 font-semibold active:scale-[0.96]"
          >
            {isView ? 'Close' : 'Cancel'}
          </Button>
          {!isView && (
            <Button
              type="submit"
              form={formId}
              disabled={submitDisabled}
              className="h-12 rounded-button bg-primary px-10 font-semibold text-primary-foreground active:scale-[0.96] hover:bg-primary/90"
            >
              {submitLabel}
            </Button>
          )}
        </div>
      )}
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-6 px-4 pb-4 pt-1 sm:px-8 sm:pb-8 sm:pt-2">

                {/* Status Bar */}
                <div className="flex items-center justify-between gap-2 rounded-inner bg-foreground/[0.05] p-1.5 dark:bg-white/[0.07]">
                  {STATUS_STEPS.map((step, i) => {
                    const isCurrent = currentStatus === step;
                    const isPast = currentStepIndex > i;
                    return (
                      <button
                        key={step}
                        type="button"
                        disabled={!isEdit}
                        aria-pressed={isCurrent}
                        onClick={isEdit ? () => setFormData(prev => ({ ...prev, status: step })) : undefined}
                        className={`min-w-0 flex-1 rounded-button px-1.5 py-2 text-[9px] font-semibold uppercase tracking-wide transition-all active:scale-[0.96] sm:px-3 sm:text-[10px] sm:tracking-wider ${isCurrent ? 'bg-primary text-primary-foreground' :
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
                          <>
                          <Select
                            value={formData.user_id}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, user_id: value }))}
                            disabled={usersLoading || Boolean(usersError)}
                          >
                            <SelectTrigger className={requestFieldClassName}>
                              <SelectValue placeholder={usersLoading ? 'Loading patients...' : 'Select patient'} />
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
                          {usersError && (
                            <p className="text-xs font-medium text-destructive">{usersError}</p>
                          )}
                          {!usersLoading && !usersError && users.length === 0 && (
                            <p className="text-xs text-muted-foreground">No patients are available in your current scope.</p>
                          )}
                          {usersPartial && (
                            <p className="text-xs text-muted-foreground">Showing the first 100 patients in your current scope.</p>
                          )}
                          </>
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
                          value={formData.location || ''}
                          onChange={handleChange}
                          name="location"
                          disabled={isView}
                          placeholder="Location address..."
                          className={requestFieldClassName}
                        />
                        {showFacilityControl && (
                          <div className="space-y-1.5">
                            <Label className="ml-1 text-[10px] uppercase tracking-widest opacity-50">
                              Facility{facilityRequired ? ' (required)' : ''}
                            </Label>
                            <Select
                              value={formData.hospital_id || ''}
                              onValueChange={(value) => {
                                const facility = facilities.find((item) => item.id === value);
                                setFormData(prev => ({
                                  ...prev,
                                  hospital_id: value,
                                  hospital_name: facility?.name || '',
                                }));
                              }}
                              disabled={facilitiesLoading || Boolean(facilitiesError)}
                            >
                              <SelectTrigger className={requestFieldClassName}>
                                <SelectValue placeholder={facilitiesLoading ? 'Loading facilities...' : 'Select facility'} />
                              </SelectTrigger>
                              <SelectContent className={requestSelectContentClassName}>
                                {facilities.map((facility) => (
                                  <SelectItem key={facility.id} value={facility.id}>
                                    {facility.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {facilitiesError && (
                              <p className="text-xs font-medium text-destructive">{facilitiesError}</p>
                            )}
                            {!facilitiesLoading && !facilitiesError && facilities.length === 0 && (
                              <p className="text-xs text-muted-foreground">No facilities are available in your current scope.</p>
                            )}
                            {facilitiesPartial && (
                              <p className="text-xs text-muted-foreground">Showing the first 100 facilities in your current scope.</p>
                            )}
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                          <Input
                            type="number"
                            name="latitude"
                            value={formData.latitude ?? ''}
                            onChange={handleChange}
                            disabled={isView}
                            min="-90"
                            max="90"
                            step="any"
                            placeholder="Lat"
                            className={`${requestFieldClassName} font-mono text-xs`}
                          />
                          <Input
                            type="number"
                            name="longitude"
                            value={formData.longitude ?? ''}
                            onChange={handleChange}
                            disabled={isView}
                            min="-180"
                            max="180"
                            step="any"
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
                            <Label className="text-[10px] uppercase tracking-widest opacity-50 ml-1">Service</Label>
                            <Select
                              value={normalizeServiceType(formData.service_type)}
                              onValueChange={(value) => setFormData(prev => ({ ...prev, service_type: value }))}
                              disabled={isView}
                            >
                              <SelectTrigger className={requestFieldClassName}>
                                <SelectValue placeholder="Service" />
                              </SelectTrigger>
                              <SelectContent className={requestSelectContentClassName}>
                                <SelectItem value="ambulance">Ambulance</SelectItem>
                                <SelectItem value="bed">Bed</SelectItem>
                                <SelectItem value="booking">Booking</SelectItem>
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
                          <Label className="text-[10px] uppercase tracking-widest opacity-50 ml-1">Incident</Label>
                          <Select
                            value={formData.emergency_type}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, emergency_type: value }))}
                            disabled={isView}
                          >
                            <SelectTrigger className={requestFieldClassName}>
                              <SelectValue placeholder="Select incident" />
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
                          <Label className="text-[10px] uppercase tracking-widest opacity-50 ml-1">Description</Label>
                          <Textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            disabled={isView}
                            placeholder="Detailed situation report..."
                            className={`${requestFieldClassName} min-h-[100px] resize-none`}
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
  <div className={`rounded-card bg-foreground/[0.05] p-4 dark:bg-white/[0.07] ${className}`}>
    <div className="flex items-center gap-3 mb-4">
      <div className="rounded-icon bg-foreground/[0.06] p-1.5 dark:bg-white/[0.08]">
        {React.cloneElement(icon, { size: 16, className: 'sm:h-5 sm:w-5' })}
      </div>
      <h3 className="text-[13px] font-semibold text-muted-foreground">{title}</h3>
    </div>
    {children}
  </div>
);
