import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { toast } from 'sonner';

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
import { useAmbulancesMutations } from '../../../hooks/useAmbulancesMutations';
import { useAmbulanceModalController } from './useAmbulanceModalController';

const mockAuth = {
  isAdmin: jest.fn(),
  isOrgAdmin: jest.fn(),
  orgId: null,
  profile: {},
};
const mockCreateMutateAsync = jest.fn();
const mockUpdateMutateAsync = jest.fn();

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
  },
}));

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

jest.mock('../../../services/ambulancesService', () => ({
  assertAmbulanceWriteScope: jest.fn(),
  createAmbulance: jest.fn(),
  filterAmbulanceStationOptions: jest.fn(),
  updateAmbulance: jest.fn(),
}));

jest.mock('../../../services/hospitalsService', () => ({
  getHospitals: jest.fn(),
}));

jest.mock('../../../services/notificationService', () => ({
  createNotification: jest.fn(),
  NotificationActions: {
    CREATED: 'created',
    UPDATED: 'updated',
  },
  NotificationTypes: {
    AMBULANCE: 'ambulance',
  },
}));

jest.mock('../../../utils/errorHandler', () => ({
  handleApiError: jest.fn(),
}));

jest.mock('../../../hooks/useAmbulancesMutations', () => ({
  applyOptimisticUpsert: jest.fn(),
  useAmbulancesMutations: jest.fn(),
}));

const orgId = '11111111-1111-4111-8111-111111111111';
const hospital = {
  id: '33333333-3333-4333-8333-333333333333',
  name: 'Authorized station',
};
const ambulance = {
  id: '22222222-2222-4222-8222-222222222222',
  call_sign: 'UNIT-7',
  type: 'BLS',
  status: 'en_route',
  vehicle_number: 'VAN-7',
  license_plate: 'PLATE-7',
  hospital_id: hospital.id,
  eta: '12 min',
  crew: ['Ada', 'Bola'],
  current_call: 'REQ-7',
  organization_id: orgId,
};

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('useAmbulanceModalController', () => {
  let container;
  let latest;
  let root;
  let errorSpy;
  let warnSpy;

  const Harness = (props) => {
    latest = useAmbulanceModalController(props);
    return null;
  };

  const renderController = async (props) => {
    await act(async () => {
      root.render(<Harness {...props} />);
      await flush();
      await flush();
    });
  };

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    jest.clearAllMocks();
    useAmbulancesMutations.mockImplementation(({ applyOptimistic }) => ({
      mutateAsync: applyOptimistic ? mockUpdateMutateAsync : mockCreateMutateAsync,
    }));
    mockAuth.isAdmin.mockReturnValue(true);
    mockAuth.isOrgAdmin.mockReturnValue(false);
    mockAuth.orgId = null;
    mockAuth.profile = {
      role: 'admin',
      organization_id: null,
      hospital_ids: [],
      organization_scope: null,
    };
    getHospitals.mockResolvedValue([hospital]);
    filterAmbulanceStationOptions.mockImplementation((rows) => rows);
    assertAmbulanceWriteScope.mockImplementation((payload) => payload);
    mockCreateMutateAsync.mockResolvedValue({ id: ambulance.id });
    mockUpdateMutateAsync.mockResolvedValue({ id: ambulance.id });
    createNotification.mockResolvedValue(undefined);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    errorSpy.mockRestore();
    warnSpy.mockRestore();
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  });

  it('loads and scopes station options only while open', async () => {
    const onClose = jest.fn();
    const listFilter = { status: 'available' };

    await renderController({ isOpen: false, onClose, mode: 'create', listFilter });
    expect(getHospitals).not.toHaveBeenCalled();

    await renderController({ isOpen: true, onClose, mode: 'create', listFilter });

    expect(getHospitals).toHaveBeenCalledWith({ quiet: true, limit: 500 });
    expect(filterAmbulanceStationOptions).toHaveBeenCalledWith([hospital], {
      role: 'admin',
      organization_id: null,
      hospital_ids: [],
      organization_scope: null,
    });
    expect(latest.hospitals).toEqual([hospital]);
    expect(latest.loadingHospitals).toBe(false);
    expect(useAmbulancesMutations).toHaveBeenCalledWith(expect.objectContaining({
      mutationFn: createAmbulance,
      filter: listFilter,
    }));

    const updateOptions = useAmbulancesMutations.mock.calls
      .map(([options]) => options)
      .find((options) => options.applyOptimistic);
    await updateOptions.mutationFn({ id: ambulance.id, call_sign: 'UNIT-8' });
    expect(updateAmbulance).toHaveBeenCalledWith(ambulance.id, { call_sign: 'UNIT-8' });
  });

  it('creates through the scoped mutation, reports feedback, and closes with refresh', async () => {
    const onClose = jest.fn();
    mockAuth.isAdmin.mockReturnValue(false);
    mockAuth.isOrgAdmin.mockReturnValue(true);
    mockAuth.orgId = orgId;
    mockAuth.profile = {
      role: 'org_admin',
      organization_id: orgId,
      hospital_ids: [hospital.id],
      organization_scope: null,
    };

    await renderController({ isOpen: true, onClose, mode: 'create' });
    act(() => {
      latest.updateField('call_sign', ' UNIT-7 ');
      latest.updateField('crew', 'Ada, Bola');
      latest.updateField('hospital_id', hospital.id);
    });

    const event = { preventDefault: jest.fn() };
    await act(async () => {
      await latest.handleSubmit(event);
    });

    const expectedPayload = expect.objectContaining({
      call_sign: 'UNIT-7',
      type: 'BLS',
      status: 'available',
      hospital_id: hospital.id,
      crew: ['Ada', 'Bola'],
      organization_id: orgId,
    });
    expect(event.preventDefault).toHaveBeenCalled();
    expect(assertAmbulanceWriteScope).toHaveBeenCalledWith(expectedPayload, expect.objectContaining({
      role: 'org_admin',
      organization_id: orgId,
    }));
    expect(mockCreateMutateAsync).toHaveBeenCalledWith(expectedPayload);
    expect(createNotification).toHaveBeenCalledWith(
      NotificationTypes.AMBULANCE,
      NotificationActions.CREATED,
      ambulance.id,
      { message: 'UNIT-7 was added' }
    );
    expect(toast.success).toHaveBeenCalledWith('Unit added');
    expect(onClose).toHaveBeenCalledWith(true);
    expect(latest.loading).toBe(false);
  });

  it('keeps dispatch fields out of edits and does not fail a save when notification fails', async () => {
    const onClose = jest.fn();
    createNotification.mockRejectedValueOnce(new Error('notification unavailable'));

    await renderController({ isOpen: true, onClose, ambulance, mode: 'edit' });
    await act(async () => {
      await latest.handleSubmit({ preventDefault: jest.fn() });
    });

    const variables = mockUpdateMutateAsync.mock.calls[0][0];
    expect(variables.id).toBe(ambulance.id);
    expect(variables).not.toHaveProperty('status');
    expect(variables).not.toHaveProperty('current_call');
    expect(variables.crew).toEqual(['Ada', 'Bola']);
    expect(warnSpy).toHaveBeenCalledWith(
      'Ambulance notification was not created:',
      expect.any(Error)
    );
    expect(toast.success).toHaveBeenCalledWith('Unit updated');
    expect(onClose).toHaveBeenCalledWith(true);
  });

  it('fails closed for an out-of-scope station and routes save errors without closing', async () => {
    const onClose = jest.fn();
    const error = new Error('save denied');
    mockAuth.isAdmin.mockReturnValue(false);
    mockAuth.isOrgAdmin.mockReturnValue(true);
    mockAuth.orgId = orgId;
    mockAuth.profile = {
      role: 'org_admin',
      organization_id: orgId,
      hospital_ids: [],
      organization_scope: null,
    };
    filterAmbulanceStationOptions.mockReturnValue([]);
    mockUpdateMutateAsync.mockRejectedValueOnce(error);

    await renderController({ isOpen: true, onClose, ambulance, mode: 'edit' });

    expect(latest.stationOutOfScope).toBe(true);
    expect(latest.selectedStationIsInScope).toBe(false);
    expect(latest.canSubmit).toBe(false);

    await act(async () => {
      await latest.handleSubmit({ preventDefault: jest.fn() });
    });

    expect(handleApiError).toHaveBeenCalledWith(error, 'update');
    expect(toast.success).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(latest.loading).toBe(false);
  });

  it('keeps view submit inert and preserves explicit close results', async () => {
    const onClose = jest.fn();
    const event = { preventDefault: jest.fn() };

    await renderController({ isOpen: true, onClose, ambulance, mode: 'view' });
    await act(async () => {
      await latest.handleSubmit(event);
    });

    expect(event.preventDefault).toHaveBeenCalled();
    expect(mockCreateMutateAsync).not.toHaveBeenCalled();
    expect(mockUpdateMutateAsync).not.toHaveBeenCalled();

    act(() => latest.closeModal(false));
    expect(onClose).toHaveBeenCalledWith(false);
  });
});
