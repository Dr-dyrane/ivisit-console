import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { toast } from 'sonner';
import { handleApiError } from '../../../utils/errorHandler';
import { saveEmergencyRequest } from './requestCommands';
import { useEmergencyRequestModalController } from './useEmergencyRequestModalController';
import { useEmergencyRequestOptions } from './useEmergencyRequestOptions';

const mockIsAdmin = jest.fn();
const mockIsOrgAdmin = jest.fn();

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    isAdmin: mockIsAdmin,
    isOrgAdmin: mockIsOrgAdmin,
  }),
}));

jest.mock('../../../utils/errorHandler', () => ({
  handleApiError: jest.fn(),
}));

jest.mock('sonner', () => ({
  toast: { error: jest.fn() },
}));

jest.mock('./requestCommands', () => ({
  saveEmergencyRequest: jest.fn(),
}));

jest.mock('./useEmergencyRequestOptions', () => ({
  useEmergencyRequestOptions: jest.fn(),
}));

const EMPTY_OPTIONS = {
  users: [],
  usersLoading: false,
  usersError: '',
  usersPartial: false,
  facilities: [],
  facilitiesLoading: false,
  facilitiesError: '',
  facilitiesPartial: false,
};

let latestController;

const Harness = (props) => {
  latestController = useEmergencyRequestModalController(props);
  return null;
};

describe('useEmergencyRequestModalController', () => {
  let container;
  let root;
  let onClose;
  let consoleError;

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    jest.clearAllMocks();
    latestController = undefined;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    onClose = jest.fn();
    mockIsAdmin.mockReturnValue(false);
    mockIsOrgAdmin.mockReturnValue(true);
    useEmergencyRequestOptions.mockReturnValue(EMPTY_OPTIONS);
    saveEmergencyRequest.mockResolvedValue(undefined);
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    consoleError.mockRestore();
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  });

  const renderController = async (props = {}) => {
    await act(async () => {
      root.render(
        <Harness
          isOpen
          onClose={onClose}
          mode="create"
          {...props}
        />
      );
    });
  };

  const submit = async () => {
    const preventDefault = jest.fn();
    await act(async () => {
      await latestController.handleSubmit({ preventDefault });
    });
    return preventDefault;
  };

  it('blocks organization-admin create before the receiver when no facility is selected', async () => {
    await renderController();
    const preventDefault = await submit();

    expect(latestController.lifecyclePresentation).toMatchObject({
      status: { key: 'pending_approval', label: 'Needs attention' },
      actions: { dispatch: { available: false }, complete: { available: false } },
    });
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith(
      'Select a facility in your organization before creating this request.'
    );
    expect(saveEmergencyRequest).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('requires bounded latitude and longitude together before saving', async () => {
    await renderController();
    await act(async () => {
      latestController.setFormData((previous) => ({
        ...previous,
        hospital_id: 'hospital-1',
        latitude: 6.45,
        longitude: null,
      }));
    });
    await submit();

    expect(toast.error).toHaveBeenCalledWith('Enter a valid latitude and longitude together.');
    expect(saveEmergencyRequest).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('passes the exact create submission to the receiver owner and closes only after success', async () => {
    await renderController();
    await act(async () => {
      latestController.setFormData((previous) => ({
        ...previous,
        user_id: 'patient-1',
        hospital_id: 'hospital-1',
        hospital_name: 'Care Hospital',
        service_type: 'bed',
        emergency_type: 'cardiac',
        priority: 'high',
        location: '12 Care Street',
        latitude: 6.45,
        longitude: 3.39,
        description: 'Patient needs support',
      }));
    });
    await submit();

    expect(saveEmergencyRequest).toHaveBeenCalledWith(expect.objectContaining({
      isCreate: true,
      isEdit: false,
      request: undefined,
      normalizedStatus: 'pending_approval',
      payload: expect.objectContaining({
        user_id: 'patient-1',
        hospital_id: 'hospital-1',
        hospital_name: 'Care Hospital',
        service_type: 'bed',
        status: 'pending_approval',
        patient_location: { lat: 6.45, lng: 3.39 },
        patient_snapshot: expect.objectContaining({
          priority: 'high',
          incident_type: 'cardiac',
          location_text: '12 Care Street',
          description: 'Patient needs support',
        }),
      }),
    }));
    expect(onClose).toHaveBeenCalledWith(true);
    expect(latestController.loading).toBe(false);
  });

  it('keeps the modal open and routes receiver failures through the existing error owner', async () => {
    const error = new Error('receiver denied');
    saveEmergencyRequest.mockRejectedValue(error);
    mockIsAdmin.mockReturnValue(true);
    mockIsOrgAdmin.mockReturnValue(false);
    await renderController({
      mode: 'edit',
      request: {
        id: 'request-2',
        user_id: 'patient-2',
        service_type: 'ambulance',
        status: 'accepted',
      },
    });
    await submit();

    expect(saveEmergencyRequest).toHaveBeenCalledWith(expect.objectContaining({
      isCreate: false,
      isEdit: true,
      request: expect.objectContaining({ id: 'request-2', user_id: 'patient-2' }),
      payload: expect.objectContaining({ user_id: 'patient-2', status: 'accepted' }),
    }));
    expect(handleApiError).toHaveBeenCalledWith(error, 'create');
    expect(onClose).not.toHaveBeenCalled();
    expect(latestController.loading).toBe(false);
  });
});
