import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Ambulance, Activity, Calendar, Hospital, MapPin, Shield, UserCheck, Wrench } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ModalShell } from '../ui/ModalShell';
import { useAuth } from '../../contexts/AuthContext';
import { handleApiError } from '../../utils/errorHandler';
import { createNotification, NotificationActions, NotificationTypes } from '../../services/notificationService';
import { createAmbulance, updateAmbulance } from '../../services/ambulancesService';
import { getHospitals } from '../../services/hospitalsService';
import { useAmbulancesMutations, applyOptimisticUpsert } from '../../hooks/useAmbulancesMutations';

const DEFAULT_AMBULANCE_FORM = {
  call_sign: '',
  type: 'BLS',
  status: 'available',
  vehicle_number: '',
  license_plate: '',
  hospital_id: '',
  eta: '',
  crew: '',
  current_call: '',
  base_price: '',
  organization_id: '',
};

const TRIP_OWNED_STATUSES = new Set(['dispatched', 'on_trip', 'en_route', 'on_scene', 'returning']);
const UNIT_STATUS_OPTIONS = [
  { value: 'available', label: 'Available' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'offline', label: 'Offline' },
  { value: 'pending_approval', label: 'Pending review' },
];
const TYPE_OPTIONS = [
  { value: 'BLS', label: 'Basic life support' },
  { value: 'ALS', label: 'Advanced life support' },
  { value: 'basic', label: 'Basic' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'critical', label: 'Critical care' },
];
const modalFieldClassName = 'rounded-button bg-muted/30 shadow-[0_14px_34px_rgb(0_0_0/0.06)] transition-[background,box-shadow] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:bg-background/80 focus-visible:shadow-[0_0_0_3px_hsl(var(--primary)/0.16),0_18px_38px_rgb(0_0_0/0.10)] dark:bg-white/[0.06] dark:focus-visible:bg-white/[0.09]';
const modalSelectContentClassName = 'rounded-inner bg-background/95 shadow-xl backdrop-blur-xl';

const normalizeFormData = (ambulance, orgId, isCreate, isOrgAdmin) => {
  const base = {
    ...DEFAULT_AMBULANCE_FORM,
    ...(ambulance || {}),
  };

  return {
    ...base,
    call_sign: base.call_sign || '',
    type: base.type || 'BLS',
    status: base.status || 'available',
    vehicle_number: base.vehicle_number || base.vehicle_label || '',
    license_plate: base.license_plate || '',
    hospital_id: base.hospital_id || '',
    eta: base.eta && base.eta !== 'N/A' ? base.eta : '',
    crew: base.crew || '',
    current_call: base.current_call || '',
    base_price: base.base_price ?? '',
    organization_id: base.organization_id || (isCreate && isOrgAdmin && orgId ? orgId : ''),
  };
};

const formatLabel = (value, fallback = 'Not set') => {
  const text = String(value || '').trim();
  if (!text) return fallback;
  return text.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const formatDateTime = (value) => {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleString();
};

const getStatusTone = (status) => {
  if (status === 'available') return 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-200';
  if (status === 'maintenance' || status === 'offline') return 'bg-muted/50 text-muted-foreground';
  if (status === 'pending_approval') return 'bg-amber-500/12 text-amber-700 dark:text-amber-200';
  if (TRIP_OWNED_STATUSES.has(status)) return 'bg-cyan-500/12 text-cyan-700 dark:text-cyan-200';
  return 'bg-muted/40 text-muted-foreground';
};

const buildAmbulancePayload = (formData, { isCreate, isOrgAdmin, orgId }) => {
  const payload = {
    call_sign: formData.call_sign?.trim(),
    type: formData.type,
    status: formData.status,
    vehicle_number: formData.vehicle_number?.trim(),
    license_plate: formData.license_plate?.trim(),
    hospital_id: formData.hospital_id || '',
    eta: formData.eta?.trim(),
    crew: formData.crew?.trim(),
    current_call: formData.current_call?.trim(),
    base_price: formData.base_price === '' ? undefined : Number(formData.base_price),
  };

  if (formData.organization_id) {
    payload.organization_id = formData.organization_id;
  } else if (isCreate && isOrgAdmin && orgId) {
    payload.organization_id = orgId;
  }

  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined) delete payload[key];
  });

  return payload;
};

export const AmbulanceModal = ({ isOpen, onClose, ambulance, mode, listFilter }) => {
  const isView = mode === 'view';
  const isEdit = mode === 'edit';
  const isCreate = mode === 'create';
  const { isOrgAdmin, orgId } = useAuth();

  const [formData, setFormData] = useState(() => normalizeFormData(ambulance, orgId, isCreate, isOrgAdmin()));
  const [hospitals, setHospitals] = useState([]);
  const [loadingHospitals, setLoadingHospitals] = useState(false);
  const [loading, setLoading] = useState(false);

  // --- Write path: React Query optimistic mutations (mirrors DoctorModal S3-3) ----
  // createAmbulance / updateAmbulance stay imported from ambulancesService and are
  // handed in as the mutationFn; useAmbulancesMutations wraps them with the onMutate
  // snapshot -> optimistic setQueryData -> onError rollback -> onSettled
  // invalidateQueries(['ambulances']) lifecycle. No direct service call and no second
  // store: the ['ambulances'] cache is the single source.
  //
  // `listFilter` is the exact filter AmbulancesPage passed to useAmbulancesQuery, so
  // the optimistic patch lands on that page's live ['ambulances', filter] cache
  // entry. Other AmbulanceModal hosts (FAB / context panel) omit it - their writes
  // still converge via the onSettled root invalidation, just without visible optimism.
  const createAmbulanceMutation = useAmbulancesMutations({
    mutationFn: createAmbulance,
    filter: listFilter,
    // No optimistic reducer for create: the server owns the new id and the station
    // enrichment, so an optimistic row would render keyless / half-joined. onSettled
    // invalidation refetches the real row within one round-trip.
  });
  const updateAmbulanceMutation = useAmbulancesMutations({
    // Strip the id back off for the updateAmbulance(id, changes) service signature.
    mutationFn: ({ id, ...changes }) => updateAmbulance(id, changes),
    applyOptimistic: applyOptimisticUpsert,
    filter: listFilter,
  });

  useEffect(() => {
    setFormData(normalizeFormData(ambulance, orgId, isCreate, isOrgAdmin()));
  }, [ambulance, orgId, isCreate, isOrgAdmin]);

  useEffect(() => {
    if (!isOpen) return undefined;

    let cancelled = false;
    setLoadingHospitals(true);

    getHospitals({ quiet: true, limit: 500 })
      .then((rows) => {
        if (!cancelled) setHospitals(Array.isArray(rows) ? rows : []);
      })
      .catch((error) => {
        if (!cancelled) {
          console.error('Error loading ambulance station options:', error);
          setHospitals([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingHospitals(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const stationName = useMemo(() => {
    const selected = hospitals.find((hospital) => hospital.id === formData.hospital_id);
    return selected?.name || ambulance?.station_name || ambulance?.hospital || (formData.hospital_id ? 'Linked station' : 'No station');
  }, [ambulance, formData.hospital_id, hospitals]);

  const status = String(formData.status || 'available').toLowerCase();
  const tripOwnedStatus = TRIP_OWNED_STATUSES.has(status);
  const canSubmit = !isView && formData.call_sign?.trim() && formData.type && !loading;
  const modalTitle = isCreate ? 'New unit' : formData.call_sign || 'Ambulance unit';
  const modalSubtitle = stationName;

  const statusBadge = (
    <Badge className={`rounded-pill px-3 py-0.5 text-xs font-semibold ${getStatusTone(status)}`}>
      {formatLabel(status, 'Available')}
    </Badge>
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isView) return;

    setLoading(true);

    try {
      const payload = buildAmbulancePayload(formData, { isCreate, isOrgAdmin: isOrgAdmin(), orgId });
      // mutateAsync routes through the same createAmbulance / updateAmbulance RPCs,
      // adding optimistic upsert + rollback and the single onSettled refresh. Carry
      // the id in the update variables so applyOptimisticUpsert matches the cached
      // row; the mutationFn strips it back off for updateAmbulance(id, changes).
      const savedAmbulance = isCreate
        ? await createAmbulanceMutation.mutateAsync(payload)
        : await updateAmbulanceMutation.mutateAsync({ id: ambulance.id, ...payload });

      try {
        await createNotification(
          NotificationTypes.AMBULANCE,
          isCreate ? NotificationActions.CREATED : NotificationActions.UPDATED,
          savedAmbulance?.id || ambulance?.id,
          { message: `${payload.call_sign || 'Ambulance unit'} ${isCreate ? 'was added' : 'was updated'}` }
        );
      } catch (notificationError) {
        console.warn('Ambulance notification was not created:', notificationError);
      }

      toast.success(isCreate ? 'Unit added' : 'Unit updated');
      onClose(true);
    } catch (error) {
      console.error('Error saving ambulance:', error);
      handleApiError(error, isCreate ? 'create' : 'update');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={() => onClose(false)}
      title={modalTitle}
      subtitle={modalSubtitle}
      icon={<Ambulance className="h-5 w-5 text-primary" />}
      badge={statusBadge}
      size="lg"
      managed
      className="bg-background"
    >
      <div className="flex-1 min-h-0 overflow-y-auto p-2 pt-1 md:p-8 md:pt-2 no-scrollbar">
        <form onSubmit={handleSubmit} className="space-y-6">
          <GlassCard icon={<Activity />} title="Unit">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FieldGroup label="Call sign" htmlFor="ambulance-call-sign">
                {isView ? (
                  <ReadOnlyField value={formData.call_sign || 'Unknown unit'} icon={<Ambulance className="h-4 w-4" />} />
                ) : (
                  <Input
                    id="ambulance-call-sign"
                    name="call_sign"
                    value={formData.call_sign}
                    onChange={handleChange}
                    className={`${modalFieldClassName} h-12 font-semibold`}
                    placeholder="D-AMB-1"
                  />
                )}
              </FieldGroup>

              <FieldGroup label="Type">
                {isView ? (
                  <ReadOnlyField value={formatLabel(formData.type, 'Unit')} icon={<Shield className="h-4 w-4" />} />
                ) : (
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData((current) => ({ ...current, type: value }))}
                  >
                    <SelectTrigger className={`${modalFieldClassName} h-12`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={modalSelectContentClassName}>
                      {TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </FieldGroup>

              <FieldGroup label="Vehicle number" htmlFor="ambulance-vehicle-number">
                {isView ? (
                  <ReadOnlyField value={formData.vehicle_number || 'No vehicle number'} icon={<Shield className="h-4 w-4" />} />
                ) : (
                  <Input
                    id="ambulance-vehicle-number"
                    name="vehicle_number"
                    value={formData.vehicle_number}
                    onChange={handleChange}
                    className={`${modalFieldClassName} h-12 font-mono`}
                    placeholder="COV-GUES-1"
                  />
                )}
              </FieldGroup>

              <FieldGroup label="Plate" htmlFor="ambulance-license-plate">
                {isView ? (
                  <ReadOnlyField value={formData.license_plate || 'No plate'} icon={<Shield className="h-4 w-4" />} />
                ) : (
                  <Input
                    id="ambulance-license-plate"
                    name="license_plate"
                    value={formData.license_plate}
                    onChange={handleChange}
                    className={`${modalFieldClassName} h-12 font-mono`}
                    placeholder="Plate"
                  />
                )}
              </FieldGroup>
            </div>
          </GlassCard>

          <GlassCard icon={<Hospital />} title="Station">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FieldGroup label="Base station">
                {isView ? (
                  <ReadOnlyField value={stationName} subtext={formData.hospital_id || ''} icon={<MapPin className="h-4 w-4" />} />
                ) : (
                  <Select
                    value={formData.hospital_id || undefined}
                    onValueChange={(value) => setFormData((current) => ({ ...current, hospital_id: value }))}
                  >
                    <SelectTrigger className={`${modalFieldClassName} h-12`}>
                      <SelectValue placeholder={loadingHospitals ? 'Loading stations...' : 'Select station'} />
                    </SelectTrigger>
                    <SelectContent className={modalSelectContentClassName}>
                      {formData.hospital_id && !hospitals.some((hospital) => hospital.id === formData.hospital_id) && (
                        <SelectItem value={formData.hospital_id}>{stationName}</SelectItem>
                      )}
                      {hospitals.map((hospital) => (
                        <SelectItem key={hospital.id} value={hospital.id}>
                          {hospital.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </FieldGroup>

              <FieldGroup label="ETA" htmlFor="ambulance-eta">
                {isView ? (
                  <ReadOnlyField value={formData.eta || 'Unknown'} icon={<Calendar className="h-4 w-4" />} />
                ) : (
                  <Input
                    id="ambulance-eta"
                    name="eta"
                    value={formData.eta}
                    onChange={handleChange}
                    className={`${modalFieldClassName} h-12`}
                    placeholder="Unknown"
                  />
                )}
              </FieldGroup>
            </div>
          </GlassCard>

          <GlassCard icon={<Wrench />} title="Status">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FieldGroup label="Current status">
                {isView || tripOwnedStatus ? (
                  <ReadOnlyField
                    value={formatLabel(status, 'Available')}
                    subtext={tripOwnedStatus && !isView ? 'Trip status changes stay in Requests.' : ''}
                    icon={<Activity className="h-4 w-4" />}
                  />
                ) : (
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData((current) => ({ ...current, status: value }))}
                  >
                    <SelectTrigger className={`${modalFieldClassName} h-12`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={modalSelectContentClassName}>
                      {UNIT_STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </FieldGroup>

              <FieldGroup label="Crew note" htmlFor="ambulance-crew">
                {isView ? (
                  <ReadOnlyField value={formData.crew || 'Not listed'} icon={<UserCheck className="h-4 w-4" />} />
                ) : (
                  <Input
                    id="ambulance-crew"
                    name="crew"
                    value={formData.crew}
                    onChange={handleChange}
                    className={`${modalFieldClassName} h-12`}
                    placeholder="Crew note"
                  />
                )}
              </FieldGroup>

              <FieldGroup label="Current call" htmlFor="ambulance-current-call">
                {isView ? (
                  <ReadOnlyField value={formData.current_call || 'No active call'} icon={<Activity className="h-4 w-4" />} />
                ) : (
                  <Input
                    id="ambulance-current-call"
                    name="current_call"
                    value={formData.current_call}
                    onChange={handleChange}
                    className={`${modalFieldClassName} h-12`}
                    placeholder="Linked request only"
                  />
                )}
              </FieldGroup>

              <FieldGroup label="Updated">
                <ReadOnlyField value={formatDateTime(formData.updated_at)} icon={<Calendar className="h-4 w-4" />} />
              </FieldGroup>
            </div>
          </GlassCard>

          <GlassCard icon={<UserCheck />} title="Linked work">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <UnavailableNote
                title="Driver link"
                text={formData.profile_id ? 'Linked profile is read-only in this pass.' : 'Driver assignment needs provider and station proof.'}
              />
              <UnavailableNote
                title="Image"
                text={formData.image ? 'Existing media is not edited here yet.' : 'Media upload needs storage policy proof.'}
              />
              <UnavailableNote
                title="Trip commands"
                text="Arrival, completion, and cancellation stay in Requests or Map."
              />
            </div>
          </GlassCard>

          <div className="flex justify-end gap-3 rounded-card bg-muted/30 p-3 md:p-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onClose(false)}
              className="h-11 rounded-button px-5 font-semibold text-muted-foreground hover:bg-muted"
              disabled={loading}
            >
              {isView ? 'Close' : 'Cancel'}
            </Button>
            {!isView && (
              <Button
                type="submit"
                className="h-11 rounded-button bg-primary px-6 font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90"
                disabled={!canSubmit}
                aria-busy={loading}
                data-state={loading ? 'saving' : 'idle'}
              >
                {loading ? 'Saving...' : isCreate ? 'Add unit' : 'Save changes'}
              </Button>
            )}
          </div>
        </form>
      </div>
    </ModalShell>
  );
};

const GlassCard = ({ children, title, icon }) => (
  <section className="rounded-card bg-muted/30 p-4 shadow-[0_18px_44px_rgb(0_0_0/0.06)] sm:p-6">
    <div className="mb-4 flex items-center gap-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-icon bg-background/60 text-primary shadow-sm">
        {React.cloneElement(icon, { size: 17 })}
      </span>
      <h3 className="text-sm font-semibold tracking-normal text-foreground sm:text-base">{title}</h3>
    </div>
    {children}
  </section>
);

const FieldGroup = ({ children, label, htmlFor }) => (
  <div className="space-y-2">
    <Label htmlFor={htmlFor} className="px-1 text-xs font-semibold text-muted-foreground">
      {label}
    </Label>
    {children}
  </div>
);

const ReadOnlyField = ({ value, subtext, icon }) => (
  <div className="flex min-h-12 items-center gap-3 rounded-inner bg-background/55 px-3 py-3 text-sm shadow-sm md:min-h-14">
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-icon bg-muted/50 text-muted-foreground">
      {icon}
    </span>
    <span className="min-w-0 flex-1">
      <span className="block truncate font-medium text-foreground">{String(value || 'Not set')}</span>
      {subtext && (
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">{subtext}</span>
      )}
    </span>
  </div>
);

const UnavailableNote = ({ title, text }) => (
  <div className="rounded-inner bg-background/55 p-4 shadow-sm">
    <p className="text-sm font-semibold text-foreground">{title}</p>
    <p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p>
  </div>
);
