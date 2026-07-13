import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { useAuth } from '../../../contexts/AuthContext';
import { useAmbulancesMutations, applyOptimisticUpsert } from '../../../hooks/useAmbulancesMutations';
import {
  assertAmbulanceWriteScope,
  createAmbulance,
  filterAmbulanceStationOptions,
  updateAmbulance,
} from '../../../services/ambulancesService';
import { getHospitals } from '../../../services/hospitalsService';
import {
  createNotification,
  NotificationActions,
  NotificationTypes,
} from '../../../services/notificationService';
import { handleApiError } from '../../../utils/errorHandler';
import {
  buildAmbulancePayload,
  getAmbulanceStationName,
  normalizeAmbulanceForm,
  TRIP_OWNED_STATUSES,
} from './ambulanceModalModel';

export const useAmbulanceModalController = ({ isOpen, onClose, ambulance, mode, listFilter }) => {
  const isView = mode === 'view';
  const isCreate = mode === 'create';
  const { isAdmin, isOrgAdmin, orgId, profile } = useAuth();
  const isAdminRole = isAdmin();
  const isOrgAdminRole = isOrgAdmin();
  const actorScope = useMemo(() => ({
    role: isAdminRole ? 'admin' : (isOrgAdminRole ? 'org_admin' : profile?.role),
    organization_id: profile?.organization_id || orgId || null,
    hospital_ids: profile?.hospital_ids || [],
    organization_scope: profile?.organization_scope || null,
  }), [isAdminRole, isOrgAdminRole, orgId, profile]);

  const [formData, setFormData] = useState(() => (
    normalizeAmbulanceForm(ambulance, orgId, isCreate, isOrgAdminRole)
  ));
  const [hospitals, setHospitals] = useState([]);
  const [loadingHospitals, setLoadingHospitals] = useState(false);
  const [loading, setLoading] = useState(false);

  // Keep writes on the existing query owner so list-scoped optimistic updates,
  // rollback, and root invalidation retain their current behavior.
  const createAmbulanceMutation = useAmbulancesMutations({
    mutationFn: createAmbulance,
    filter: listFilter,
  });
  const updateAmbulanceMutation = useAmbulancesMutations({
    mutationFn: ({ id, ...changes }) => updateAmbulance(id, changes),
    applyOptimistic: applyOptimisticUpsert,
    filter: listFilter,
  });

  useEffect(() => {
    setFormData(normalizeAmbulanceForm(ambulance, orgId, isCreate, isOrgAdminRole));
  }, [ambulance, orgId, isCreate, isOrgAdminRole]);

  useEffect(() => {
    if (!isOpen) return undefined;

    let cancelled = false;
    setLoadingHospitals(true);

    getHospitals({ quiet: true, limit: 500 })
      .then((rows) => {
        if (!cancelled) {
          setHospitals(filterAmbulanceStationOptions(Array.isArray(rows) ? rows : [], actorScope));
        }
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
  }, [actorScope, isOpen]);

  const stationName = useMemo(
    () => getAmbulanceStationName(ambulance, hospitals, formData.hospital_id),
    [ambulance, formData.hospital_id, hospitals]
  );
  const status = String(formData.status || 'available').toLowerCase();
  const tripOwnedStatus = TRIP_OWNED_STATUSES.has(status);
  const selectedStationIsInScope = !formData.hospital_id
    || hospitals.some((hospital) => hospital.id === formData.hospital_id);
  const stationOutOfScope = isOrgAdminRole
    && Boolean(formData.hospital_id)
    && !loadingHospitals
    && !selectedStationIsInScope;
  const canSubmit = !isView
    && formData.call_sign?.trim()
    && formData.type
    && !stationOutOfScope
    && !loading;
  const modalTitle = isCreate ? 'New unit' : formData.call_sign || 'Ambulance unit';

  const updateField = (name, value) => {
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    updateField(name, value);
  };

  const closeModal = (shouldRefresh = false) => {
    onClose(shouldRefresh);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isView) return;

    setLoading(true);

    try {
      const payload = buildAmbulancePayload(formData, {
        isCreate,
        isOrgAdmin: isOrgAdminRole,
        orgId,
      });
      assertAmbulanceWriteScope(payload, actorScope);
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
      closeModal(true);
    } catch (error) {
      console.error('Error saving ambulance:', error);
      handleApiError(error, isCreate ? 'create' : 'update');
    } finally {
      setLoading(false);
    }
  };

  return {
    ambulance,
    canSubmit,
    closeModal,
    formData,
    handleChange,
    handleSubmit,
    hospitals,
    isAdminRole,
    isCreate,
    isOpen,
    isView,
    loading,
    loadingHospitals,
    modalTitle,
    selectedStationIsInScope,
    stationName,
    stationOutOfScope,
    status,
    tripOwnedStatus,
    updateField,
  };
};
