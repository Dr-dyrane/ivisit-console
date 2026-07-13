import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { useAuth } from '../../../contexts/AuthContext';
import {
  assertDoctorWriteScope,
  createDoctor,
  filterDoctorFacilityOptions,
  updateDoctor,
} from '../../../services/doctorsService';
import { getHospitals } from '../../../services/hospitalsService';
import { handleApiError } from '../../../utils/errorHandler';
import { useDoctorsMutations, applyOptimisticUpsert } from '../../../hooks/useDoctorsMutations';
import {
  buildStaffPayload,
  cleanText,
  getFacilityName,
  getStaffStatusMeta,
  normalizeForm,
} from './doctorModalModel';

export const useDoctorModalController = ({ isOpen, onClose, doctor, mode, listFilter }) => {
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

  // Keep writes on the existing React Query mutation boundary. The exact list
  // filter preserves optimistic update ownership for DoctorsPage callers.
  const createDoctorMutation = useDoctorsMutations({
    mutationFn: createDoctor,
    filter: listFilter,
  });
  const updateDoctorMutation = useDoctorsMutations({
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
        // The id is mutation metadata only; the adapter strips it before the
        // existing updateDoctor(id, changes) receiver is called.
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

  return {
    actorScope,
    canManageStaff,
    closeModal,
    facilities,
    facilityError,
    facilityName,
    facilityOutOfScope,
    formData,
    handleSubmit,
    isAdminRole,
    isCreate,
    isEdit,
    isOpen,
    isProfileLinked,
    isView,
    loadingFacilities,
    resolvedMode,
    saving,
    selectedFacilityIsInScope,
    status,
    subtitle,
    title,
    updateField,
  };
};

export default useDoctorModalController;
