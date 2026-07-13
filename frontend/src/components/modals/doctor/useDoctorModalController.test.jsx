import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { toast } from 'sonner';

import {
  assertDoctorWriteScope,
  filterDoctorFacilityOptions,
} from '../../../services/doctorsService';
import { getHospitals } from '../../../services/hospitalsService';
import { handleApiError } from '../../../utils/errorHandler';
import { useDoctorModalController } from './useDoctorModalController';

const mockAuth = {
  isAdmin: jest.fn(),
  isOrgAdmin: jest.fn(),
  profile: {},
};
const mockCreateMutateAsync = jest.fn();
const mockUpdateMutateAsync = jest.fn();

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

jest.mock('../../../services/doctorsService', () => ({
  assertDoctorWriteScope: jest.fn(),
  createDoctor: jest.fn(),
  filterDoctorFacilityOptions: jest.fn(),
  updateDoctor: jest.fn(),
}));

jest.mock('../../../services/hospitalsService', () => ({
  getHospitals: jest.fn(),
}));

jest.mock('../../../utils/errorHandler', () => ({
  handleApiError: jest.fn(),
}));

jest.mock('../../../hooks/useDoctorsMutations', () => ({
  applyOptimisticUpsert: () => {},
  useDoctorsMutations: ({ applyOptimistic }) => ({
    mutateAsync: applyOptimistic ? mockUpdateMutateAsync : mockCreateMutateAsync,
  }),
}));

const facility = {
  id: '33333333-3333-4333-8333-333333333333',
  name: 'Authorized facility',
};
const doctor = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Ada Doctor',
  specialization: 'Emergency',
  phone: '+2348000000000',
  email: 'ada@example.com',
  hospital_id: facility.id,
  status: 'invited',
  experience: 8,
  license_number: 'LIC-8',
  about: 'Linked provider',
  consultation_fee: '100',
};

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('useDoctorModalController', () => {
  let container;
  let latest;
  let root;

  const Harness = (props) => {
    latest = useDoctorModalController(props);
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

    jest.clearAllMocks();
    mockAuth.isAdmin.mockReturnValue(true);
    mockAuth.isOrgAdmin.mockReturnValue(false);
    mockAuth.profile = {
      role: 'admin',
      organization_id: null,
      hospital_ids: [],
      organization_scope: null,
    };
    getHospitals.mockResolvedValue([]);
    filterDoctorFacilityOptions.mockImplementation((rows) => rows);
    assertDoctorWriteScope.mockImplementation((payload) => payload);
    mockCreateMutateAsync.mockResolvedValue({ id: doctor.id });
    mockUpdateMutateAsync.mockResolvedValue({ id: doctor.id });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  });

  it('loads scoped facilities only while open and auto-selects the sole create option', async () => {
    const hiddenFacility = { id: '44444444-4444-4444-8444-444444444444', name: 'Hidden' };
    getHospitals.mockResolvedValue([facility, hiddenFacility]);
    filterDoctorFacilityOptions.mockReturnValue([facility]);

    await renderController({ isOpen: true, onClose: jest.fn(), mode: 'create' });

    expect(getHospitals).toHaveBeenCalledWith({ quiet: true, limit: 500 });
    expect(filterDoctorFacilityOptions).toHaveBeenCalledWith(
      [facility, hiddenFacility],
      expect.objectContaining({ role: 'admin', hospital_ids: [] })
    );
    expect(latest.facilities).toEqual([facility]);
    expect(latest.formData.hospital_id).toBe(facility.id);
    expect(latest.title).toBe('Add staff');
    expect(latest.facilityOutOfScope).toBe(false);
  });

  it('submits create data through the existing scoped mutation receiver', async () => {
    const onClose = jest.fn();
    mockAuth.isAdmin.mockReturnValue(false);
    mockAuth.isOrgAdmin.mockReturnValue(true);
    mockAuth.profile = {
      role: 'org_admin',
      organization_id: '22222222-2222-4222-8222-222222222222',
      hospital_ids: [facility.id],
      organization_scope: null,
    };
    getHospitals.mockResolvedValue([facility]);

    await renderController({ isOpen: true, onClose, mode: 'create', listFilter: { page: 1 } });
    act(() => {
      latest.updateField('name', doctor.name);
      latest.updateField('specialization', doctor.specialization);
      latest.updateField('phone', doctor.phone);
      latest.updateField('email', doctor.email);
      latest.updateField('experience', String(doctor.experience));
      latest.updateField('license_number', doctor.license_number);
      latest.updateField('about', doctor.about);
    });
    await act(async () => {
      await latest.handleSubmit({ preventDefault: jest.fn() });
    });

    const payload = mockCreateMutateAsync.mock.calls[0][0];
    expect(payload).toEqual({
      specialization: 'Emergency',
      hospital_id: facility.id,
      experience: 8,
      license_number: 'LIC-8',
      about: 'Linked provider',
      consultation_fee: null,
      name: 'Ada Doctor',
      phone: '+2348000000000',
      email: 'ada@example.com',
    });
    expect(payload).not.toHaveProperty('status');
    expect(payload).not.toHaveProperty('is_available');
    expect(assertDoctorWriteScope).toHaveBeenCalledWith(
      payload,
      expect.objectContaining({
        role: 'org_admin',
        organization_id: '22222222-2222-4222-8222-222222222222',
      }),
      { requireFacility: true }
    );
    expect(toast.success).toHaveBeenCalledWith('Staff member added.');
    expect(onClose).toHaveBeenCalledWith(true);
    expect(latest.saving).toBe(false);
  });

  it('keeps linked profile identity and lifecycle fields out of edit payloads', async () => {
    const onClose = jest.fn();
    getHospitals.mockResolvedValue([facility]);

    await renderController({
      isOpen: true,
      onClose,
      doctor: { ...doctor, profile_id: '55555555-5555-4555-8555-555555555555' },
      mode: 'edit',
    });
    await act(async () => {
      await latest.handleSubmit({ preventDefault: jest.fn() });
    });

    const variables = mockUpdateMutateAsync.mock.calls[0][0];
    expect(variables).toMatchObject({
      id: doctor.id,
      specialization: 'Emergency',
      hospital_id: facility.id,
      experience: 8,
    });
    expect(variables).not.toHaveProperty('name');
    expect(variables).not.toHaveProperty('email');
    expect(variables).not.toHaveProperty('phone');
    expect(variables).not.toHaveProperty('status');
    expect(variables).not.toHaveProperty('is_available');
    expect(toast.success).toHaveBeenCalledWith('Staff changes saved.');
    expect(onClose).toHaveBeenCalledWith(true);
  });

  it('fails closed for roles without staff write authority', async () => {
    mockAuth.isAdmin.mockReturnValue(false);
    mockAuth.isOrgAdmin.mockReturnValue(false);
    mockAuth.profile = { role: 'provider', hospital_ids: [facility.id] };
    getHospitals.mockResolvedValue([facility]);

    await renderController({ isOpen: true, onClose: jest.fn(), doctor, mode: 'edit' });
    await act(async () => {
      await latest.handleSubmit({ preventDefault: jest.fn() });
    });

    expect(toast.error).toHaveBeenCalledWith('This role cannot change staff.');
    expect(assertDoctorWriteScope).not.toHaveBeenCalled();
    expect(mockCreateMutateAsync).not.toHaveBeenCalled();
    expect(mockUpdateMutateAsync).not.toHaveBeenCalled();
  });

  it('reports receiver errors without closing or claiming success', async () => {
    const onClose = jest.fn();
    const error = new Error('receiver unavailable');
    getHospitals.mockResolvedValue([facility]);
    mockCreateMutateAsync.mockRejectedValue(error);

    await renderController({ isOpen: true, onClose, doctor, mode: 'create' });
    await act(async () => {
      await latest.handleSubmit({ preventDefault: jest.fn() });
    });

    expect(handleApiError).toHaveBeenCalledWith(error, 'create');
    expect(toast.success).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(latest.saving).toBe(false);
  });
});
