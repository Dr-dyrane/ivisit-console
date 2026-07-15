import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../../contexts/AuthContext';
import { handleApiError } from '../../../utils/errorHandler';
import {
  buildEmergencyRequestSubmission,
  createEmergencyRequestDraft,
  getRequestCoordinates,
  mergeEmergencyRequestDraft,
} from './requestModel';
import { buildEmergencyLifecyclePresentation } from '../../pages/requests/emergencyLifecyclePresentation';
import { saveEmergencyRequest } from './requestCommands';
import { useEmergencyRequestOptions } from './useEmergencyRequestOptions';

export const useEmergencyRequestModalController = ({
  isOpen,
  onClose,
  request,
  mode,
}) => {
  const { isAdmin, isOrgAdmin } = useAuth();
  const resolvedMode = mode || (request ? 'view' : 'create');
  const isView = resolvedMode === 'view';
  const isEdit = resolvedMode === 'edit';
  const isCreate = resolvedMode === 'create';
  const formId = 'emergency-request-form';
  const [formData, setFormData] = useState(() => createEmergencyRequestDraft(request));
  const [loading, setLoading] = useState(false);
  const options = useEmergencyRequestOptions({
    isOpen,
    isView,
    isCreate,
    isAdmin,
    isOrgAdmin,
  });

  useEffect(() => {
    if (request) {
      setFormData((previous) => mergeEmergencyRequestDraft(previous, request));
    }
  }, [request]);

  const handleChange = (event) => {
    const { name, value, type } = event.target;
    setFormData((previous) => ({
      ...previous,
      [name]: type === 'number' ? (value === '' ? null : Number(value)) : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const facilityRequiredForSubmit = isCreate && isOrgAdmin();
    if (facilityRequiredForSubmit && !formData.hospital_id) {
      toast.error('Select a facility in your organization before creating this request.');
      return;
    }

    const coordinates = getRequestCoordinates(formData);
    if (!coordinates.isValid) {
      toast.error('Enter a valid latitude and longitude together.');
      return;
    }

    setLoading(true);

    try {
      const submission = buildEmergencyRequestSubmission(formData, isCreate, coordinates);
      await saveEmergencyRequest({
        isCreate,
        isEdit,
        request,
        ...submission,
      });
      onClose(true);
    } catch (error) {
      console.error('Error saving emergency request:', error);
      handleApiError(error, 'create');
    } finally {
      setLoading(false);
    }
  };

  const selectedUser = options.users.find((user) => user.id === formData.user_id)
    || request?.profiles
    || request?.profile
    || null;
  const lifecyclePresentation = buildEmergencyLifecyclePresentation(formData);
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
      options.facilitiesLoading
      || Boolean(options.facilitiesError)
      || !formData.hospital_id
    )
  );

  return {
    ...options,
    formId,
    formData,
    setFormData,
    loading,
    isView,
    isEdit,
    isCreate,
    selectedUser,
    lifecyclePresentation,
    modalTitle,
    modalSubtitle,
    submitLabel,
    facilityRequired,
    showFacilityControl,
    submitDisabled,
    handleChange,
    handleSubmit,
  };
};
