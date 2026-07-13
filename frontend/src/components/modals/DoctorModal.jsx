import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Award,
  Building2,
  CheckCircle2,
  Clock,
  FileText,
  IdCard,
  Loader2,
  Mail,
  Phone,
  Stethoscope,
  UserRound,
} from 'lucide-react';

import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { ModalShell } from '../ui/ModalShell';
import { useAuth } from '../../contexts/AuthContext';
import {
  assertDoctorWriteScope,
  createDoctor,
  filterDoctorFacilityOptions,
  updateDoctor,
} from '../../services/doctorsService';
import { getHospitals } from '../../services/hospitalsService';
import { handleApiError } from '../../utils/errorHandler';
import { useDoctorsMutations, applyOptimisticUpsert } from '../../hooks/useDoctorsMutations';

const EMPTY_FORM = {
  name: '',
  specialization: '',
  phone: '',
  email: '',
  hospital_id: '',
  status: 'available',
  experience: '',
  license_number: '',
  about: '',
  consultation_fee: '',
};

const statusMeta = {
  available: {
    label: 'Available',
    className: 'bg-emerald-500/12 text-emerald-700 dark:bg-emerald-300/16 dark:text-emerald-100',
  },
  busy: {
    label: 'Busy',
    className: 'bg-amber-500/12 text-amber-700 dark:bg-amber-300/16 dark:text-amber-100',
  },
  on_call: {
    label: 'On call',
    className: 'bg-sky-500/12 text-sky-700 dark:bg-sky-300/16 dark:text-sky-100',
  },
  off_duty: {
    label: 'Off duty',
    className: 'bg-foreground/[0.06] text-muted-foreground dark:bg-white/[0.07] dark:text-slate-200',
  },
  invited: {
    label: 'Invited',
    className: 'bg-violet-500/12 text-violet-700 dark:bg-violet-300/16 dark:text-violet-100',
  },
  unavailable: {
    label: 'Unavailable for assignment',
    className: 'bg-amber-500/12 text-amber-700 dark:bg-amber-300/16 dark:text-amber-100',
  },
};

const normalizeStaffDirectoryStatus = (status) => {
  const value = String(status || '').trim().toLowerCase();
  return value || 'available';
};

const formatStatusLabel = (status) => String(status || '')
  .replace(/_/g, ' ')
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

const getStaffStatusMeta = (status, isAvailable) => {
  const normalizedStatus = normalizeStaffDirectoryStatus(status);
  if (normalizedStatus === 'available' && isAvailable === false) {
    return statusMeta.unavailable;
  }
  return statusMeta[normalizedStatus] || {
    label: formatStatusLabel(normalizedStatus) || 'Unknown',
    className: statusMeta.off_duty.className,
  };
};

const fieldClassName = 'h-11 w-full rounded-inner bg-background/[0.72] px-4 text-sm font-medium text-foreground shadow-[inset_0_1px_0_hsl(var(--foreground)/0.04),0_12px_28px_rgb(0_0_0/0.06)] transition-[background,box-shadow,transform] placeholder:text-muted-foreground/60 disabled:cursor-not-allowed disabled:opacity-60 focus:bg-background/[0.84] focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.16),0_18px_38px_rgb(0_0_0/0.10)] dark:bg-white/[0.07] dark:focus:bg-white/[0.09]';

export const normalizeForm = (doctor) => ({
  ...EMPTY_FORM,
  name: doctor?.name || '',
  specialization: doctor?.specialization || '',
  phone: doctor?.phone || '',
  email: doctor?.email || '',
  hospital_id: doctor?.hospital_id || '',
  status: normalizeStaffDirectoryStatus(doctor?.status),
  experience: doctor?.experience == null ? '' : String(doctor.experience),
  license_number: doctor?.license_number || '',
  about: doctor?.about || '',
  consultation_fee: doctor?.consultation_fee || '',
});

const cleanText = (value) => {
  const text = String(value || '').trim();
  return text.length > 0 ? text : null;
};

export const buildStaffPayload = (formData, { isCreate = false, isProfileLinked = false } = {}) => {
  const experience = formData.experience === '' ? null : Number(formData.experience);

  const payload = {
    specialization: cleanText(formData.specialization),
    hospital_id: formData.hospital_id || null,
    experience: Number.isFinite(experience) ? experience : null,
    license_number: cleanText(formData.license_number),
    about: cleanText(formData.about),
    consultation_fee: cleanText(formData.consultation_fee),
  };

  if (isCreate || !isProfileLinked) {
    payload.name = cleanText(formData.name);
    payload.phone = cleanText(formData.phone);
    payload.email = cleanText(formData.email);
  }

  // Database defaults own initial availability; ordinary directory edits do not
  // write lifecycle fields.

  return payload;
};

const getFacilityName = (doctor, facilities, hospitalId) => {
  if (doctor?.hospitals?.name) return doctor.hospitals.name;
  if (!hospitalId) return 'No facility selected';
  return facilities.find((facility) => facility.id === hospitalId)?.name || 'Facility unavailable';
};

const getInitials = (name = 'Staff') => name
  .split(' ')
  .map((part) => part.trim().charAt(0))
  .filter(Boolean)
  .slice(0, 2)
  .join('')
  .toUpperCase() || 'ST';

export const DoctorModal = ({ isOpen, onClose, doctor, mode, listFilter }) => {
  const resolvedMode = mode || (doctor ? 'view' : 'create');
  const isView = resolvedMode === 'view';
  const isEdit = resolvedMode === 'edit';
  const isCreate = resolvedMode === 'create';
  const isProfileLinked = Boolean(doctor?.profile_id);
  const { isAdmin, isOrgAdmin, profile } = useAuth();
  const isAdminRole = Boolean(isAdmin?.());
  const isOrgAdminRole = Boolean(isOrgAdmin?.());
  const canManageStaff = isAdminRole || isOrgAdminRole;
  const actorScope = useMemo(() => ({
    role: isAdminRole ? 'admin' : (isOrgAdminRole ? 'org_admin' : profile?.role),
    organization_id: profile?.organization_id || null,
    hospital_ids: profile?.hospital_ids || [],
    organization_scope: profile?.organization_scope || null,
  }), [isAdminRole, isOrgAdminRole, profile]);

  const [formData, setFormData] = useState(() => normalizeForm(doctor));
  const [facilities, setFacilities] = useState([]);
  const [loadingFacilities, setLoadingFacilities] = useState(false);
  const [facilityError, setFacilityError] = useState('');
  const [saving, setSaving] = useState(false);

  // --- Write path: React Query optimistic mutations (the reference S3-3 wiring) --
  // createDoctor / updateDoctor stay imported from doctorsService and are handed
  // in as the mutationFn; useDoctorsMutations (CONSOLE_LAYER_MODEL_PLAN.md:195)
  // wraps them with the onMutate snapshot -> optimistic setQueryData -> onError
  // rollback -> onSettled invalidateQueries(['doctors']) lifecycle. No direct
  // service call and no second store: the ['doctors'] cache is the single source.
  //
  // `listFilter` is the exact filter DoctorsPage passed to useDoctorsQuery, so the
  // optimistic patch lands on that page's live ['doctors', filter] cache entry.
  // Other DoctorModal hosts (Settings / FAB / BottomBar) omit it - their writes
  // still converge via the onSettled root invalidation, just without visible
  // optimism (no active list to patch).
  const createDoctorMutation = useDoctorsMutations({
    mutationFn: createDoctor,
    filter: listFilter,
    // No optimistic reducer for create: the server owns the new id and the
    // hospital join, so an optimistic row would render keyless / half-joined.
    // onSettled invalidation refetches the real row within one round-trip.
  });
  const updateDoctorMutation = useDoctorsMutations({
    // Strip the id back off for the updateDoctor(id, changes) service signature.
    mutationFn: ({ id, ...changes }) => updateDoctor(id, changes),
    applyOptimistic: applyOptimisticUpsert,
    filter: listFilter,
  });

  useEffect(() => {
    if (!isOpen) return;
    setFormData(normalizeForm(doctor));
  }, [doctor, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    const loadFacilities = async () => {
      setLoadingFacilities(true);
      setFacilityError('');

      try {
        const rows = await getHospitals({ quiet: true, limit: 500 });
        const visibleFacilities = Array.isArray(rows) ? rows : rows?.data || [];
        if (cancelled) return;

        const scopedFacilities = filterDoctorFacilityOptions(visibleFacilities, actorScope);
        setFacilities(scopedFacilities);
        if (isCreate && scopedFacilities.length === 1) {
          setFormData((current) => ({
            ...current,
            hospital_id: current.hospital_id || scopedFacilities[0].id,
          }));
        }
      } catch (error) {
        if (cancelled) return;
        setFacilityError('Facilities are unavailable right now.');
      } finally {
        if (!cancelled) {
          setLoadingFacilities(false);
        }
      }
    };

    loadFacilities();

    return () => {
      cancelled = true;
    };
  }, [actorScope, isCreate, isOpen]);

  const status = getStaffStatusMeta(formData.status, doctor?.is_available);
  const facilityName = useMemo(
    () => getFacilityName(doctor, facilities, formData.hospital_id),
    [doctor, facilities, formData.hospital_id]
  );
  const selectedFacilityIsInScope = isAdminRole
    || !formData.hospital_id
    || facilities.some((facility) => facility.id === formData.hospital_id);
  const facilityOutOfScope = isOrgAdminRole
    && Boolean(formData.hospital_id)
    && !loadingFacilities
    && !selectedFacilityIsInScope;
  const title = isCreate ? 'Add staff' : formData.name || 'Staff profile';
  const subtitle = isCreate ? 'Create a directory record' : formData.specialization || 'Staff member';

  const closeModal = (shouldRefresh = false) => {
    if (saving) return;
    onClose?.(shouldRefresh);
  };

  const updateField = (field, value) => {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (isView) return;
    if (!canManageStaff) {
      toast.error('This role cannot change staff.');
      return;
    }

    const payload = buildStaffPayload(formData, { isCreate, isProfileLinked });
    if (!cleanText(formData.name) || !cleanText(formData.email) || !payload.specialization) {
      toast.error('Name, email, and specialty are required.');
      return;
    }
    if (!payload.hospital_id) {
      toast.error('Select a facility first.');
      return;
    }

    try {
      assertDoctorWriteScope(payload, actorScope, { requireFacility: isCreate && isOrgAdminRole });
    } catch (scopeError) {
      toast.error(scopeError.message);
      return;
    }

    setSaving(true);

    try {
      if (isCreate) {
        await createDoctorMutation.mutateAsync(payload);
        toast.success('Staff member added.');
      } else if (isEdit && doctor?.id) {
        // Carry the id in the variables so applyOptimisticUpsert matches and
        // merges the existing cached row; the mutationFn strips it back off.
        await updateDoctorMutation.mutateAsync({ id: doctor.id, ...payload });
        toast.success('Staff changes saved.');
      }

      closeModal(true);
    } catch (error) {
      handleApiError(error, isCreate ? 'create' : 'update');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={() => closeModal(false)}
      title={title}
      subtitle={subtitle}
      icon={<Stethoscope className="h-5 w-5 text-sky-600 dark:text-sky-200" />}
      badge={(
        <span className={`rounded-pill px-3 py-1 text-[11px] font-semibold ${status.className}`}>
          {status.label}
        </span>
      )}
      size="lg"
      managed
      className="bg-background shadow-[0_28px_90px_rgb(0_0_0/0.24)] backdrop-blur-2xl dark:bg-background"
    >
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 pt-1 md:p-6 md:pt-2">
          <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
            <section className="rounded-card bg-muted/22 p-4 shadow-[0_18px_54px_rgb(0_0_0/0.10)] md:p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-pill bg-sky-500/14 text-lg font-semibold text-sky-700 dark:bg-sky-300/18 dark:text-sky-100">
                  {getInitials(formData.name)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-foreground">
                    {formData.name || 'New staff'}
                  </span>
                  <span className="mt-1 block truncate text-xs text-muted-foreground">
                    {formData.specialization || 'Specialty not set'}
                  </span>
                </span>
              </div>

              <div className="mt-5 space-y-2">
                <SummaryItem icon={Building2} label="Facility" value={facilityName} />
                <SummaryItem icon={IdCard} label="License" value={formData.license_number || 'Not set'} />
                <SummaryItem icon={Clock} label="Experience" value={formData.experience ? `${formData.experience} years` : 'Not set'} />
              </div>

              {!canManageStaff && !isView && (
                <div className="mt-4 rounded-inner bg-muted/30 p-3 text-xs font-medium text-muted-foreground">
                  This role can view staff but cannot change records.
                </div>
              )}
            </section>

            <section className="rounded-card bg-background/58 p-4 shadow-[0_18px_54px_rgb(0_0_0/0.10)] dark:bg-white/[0.045] md:p-5">
              {isView ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <ReadOnlyItem icon={UserRound} label="Name" value={formData.name} />
                  <ReadOnlyItem icon={Award} label="Specialty" value={formData.specialization} />
                  <ReadOnlyItem icon={Mail} label="Email" value={formData.email} />
                  <ReadOnlyItem icon={Phone} label="Phone" value={formData.phone} />
                  <ReadOnlyItem icon={Building2} label="Facility" value={facilityName} />
                  <ReadOnlyItem icon={CheckCircle2} label="Status" value={status.label} />
                  <ReadOnlyItem icon={IdCard} label="License" value={formData.license_number} />
                  <ReadOnlyItem icon={FileText} label="Notes" value={formData.about} wide />
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {isProfileLinked ? (
                    <ReadOnlyItem
                      icon={UserRound}
                      label="Full name"
                      value={formData.name}
                      hint="Synced from the linked account"
                    />
                  ) : (
                    <Field label="Full name">
                      <input
                        value={formData.name}
                        onChange={(event) => updateField('name', event.target.value)}
                        required
                        placeholder="Name"
                        className={fieldClassName}
                      />
                    </Field>
                  )}

                  <Field label="Specialty">
                    <input
                      value={formData.specialization}
                      onChange={(event) => updateField('specialization', event.target.value)}
                      required
                      placeholder="Primary care"
                      className={fieldClassName}
                    />
                  </Field>

                  {isProfileLinked ? (
                    <ReadOnlyItem
                      icon={Mail}
                      label="Email"
                      value={formData.email}
                      hint="Synced from the linked account"
                    />
                  ) : (
                    <Field label="Email">
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(event) => updateField('email', event.target.value)}
                        required
                        placeholder="name@example.com"
                        className={fieldClassName}
                      />
                    </Field>
                  )}

                  {isProfileLinked ? (
                    <ReadOnlyItem
                      icon={Phone}
                      label="Phone"
                      value={formData.phone}
                      hint="Synced from the linked account"
                    />
                  ) : (
                    <Field label="Phone">
                      <input
                        value={formData.phone}
                        onChange={(event) => updateField('phone', event.target.value)}
                        placeholder="Phone"
                        className={fieldClassName}
                      />
                    </Field>
                  )}

                  <Field label="Facility">
                    <select
                      value={selectedFacilityIsInScope ? formData.hospital_id : ''}
                      onChange={(event) => updateField('hospital_id', event.target.value)}
                      disabled={loadingFacilities}
                      required
                      className={fieldClassName}
                    >
                      <option value="">{loadingFacilities ? 'Loading facilities' : 'Select facility'}</option>
                      {isAdminRole && formData.hospital_id && !facilities.some((facility) => facility.id === formData.hospital_id) && (
                        <option value={formData.hospital_id}>{facilityName}</option>
                      )}
                      {facilities.map((facility) => (
                        <option key={facility.id} value={facility.id}>
                          {facility.name || 'Unnamed facility'}
                        </option>
                      ))}
                    </select>
                    {facilityError && (
                      <span className="mt-2 block text-xs font-medium text-amber-700 dark:text-amber-100">
                        {facilityError}
                      </span>
                    )}
                    {facilityOutOfScope && (
                      <span className="mt-2 block text-xs font-medium text-amber-700 dark:text-amber-100" role="alert">
                        This facility is outside your organization. Select an authorized facility before saving.
                      </span>
                    )}
                  </Field>

                  <ReadOnlyItem
                    icon={CheckCircle2}
                    label="Status"
                    value={status.label}
                    hint={isCreate
                      ? 'New staff starts available for assignment'
                      : 'Managed by the authorized availability workflow'}
                  />

                  <Field label="License">
                    <input
                      value={formData.license_number}
                      onChange={(event) => updateField('license_number', event.target.value)}
                      placeholder="License"
                      className={fieldClassName}
                    />
                  </Field>

                  <Field label="Experience">
                    <input
                      type="number"
                      min="0"
                      value={formData.experience}
                      onChange={(event) => updateField('experience', event.target.value)}
                      placeholder="Years"
                      className={fieldClassName}
                    />
                  </Field>

                  <Field label="Notes" wide>
                    <textarea
                      value={formData.about}
                      onChange={(event) => updateField('about', event.target.value)}
                      placeholder="Short note"
                      className={`${fieldClassName} min-h-[96px] resize-none py-3`}
                    />
                  </Field>
                </div>
              )}
            </section>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-3 bg-background/62 p-4 shadow-[0_-18px_54px_rgb(0_0_0/0.08)] backdrop-blur-xl md:p-5">
          <Button
            type="button"
            variant="ghost"
            onClick={() => closeModal(false)}
            disabled={saving}
            className="h-11 rounded-button px-6 font-semibold transition-transform active:scale-[0.98]"
          >
            {isView ? 'Close' : 'Cancel'}
          </Button>

          {!isView && (
            <Button
              type="submit"
              disabled={saving || !canManageStaff || facilityOutOfScope}
              className="h-11 rounded-button bg-sky-600 px-7 font-semibold text-white shadow-[0_16px_36px_rgb(14_165_233/0.28)] transition-transform hover:bg-sky-500 active:scale-[0.98] disabled:opacity-60"
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {saving ? 'Saving' : isCreate ? 'Add staff' : 'Save changes'}
            </Button>
          )}
        </div>
      </form>
    </ModalShell>
  );
};

const Field = ({ label, children, wide = false }) => (
  <div className={`space-y-2 ${wide ? 'sm:col-span-2' : ''}`}>
    <Label className="ml-1 text-[11px] font-semibold text-muted-foreground">
      {label}
    </Label>
    {children}
  </div>
);

const SummaryItem = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-3 rounded-inner bg-background/48 p-3 dark:bg-white/[0.045]">
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-icon bg-muted/28 text-muted-foreground">
      <Icon className="h-4 w-4" />
    </span>
    <span className="min-w-0">
      <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      <span className="mt-1 block truncate text-sm font-semibold text-foreground">
        {value || 'Not set'}
      </span>
    </span>
  </div>
);

const ReadOnlyItem = ({ icon: Icon, label, value, hint, wide = false }) => (
  <div className={`rounded-inner bg-muted/22 p-4 shadow-[0_12px_34px_rgb(0_0_0/0.07)] ${wide ? 'sm:col-span-2' : ''}`}>
    <div className="flex items-center gap-2 text-muted-foreground">
      <Icon className="h-4 w-4" />
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em]">
        {label}
      </span>
    </div>
    <p className="mt-2 text-sm font-semibold text-foreground">
      {value || 'Not set'}
    </p>
    {hint && (
      <p className="mt-1 text-xs text-muted-foreground">
        {hint}
      </p>
    )}
  </div>
);

export default DoctorModal;
