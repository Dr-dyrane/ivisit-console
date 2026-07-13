import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { getEmergencyCreateFacilityOptions } from '../../../services/emergencyService';
import { getEmergencyPatientOptions } from '../../../services/profilesService';
import { useEmergencyRequestOptions } from './useEmergencyRequestOptions';

jest.mock('../../../services/emergencyService', () => ({
  getEmergencyCreateFacilityOptions: jest.fn(),
}));

jest.mock('../../../services/profilesService', () => ({
  getEmergencyPatientOptions: jest.fn(),
}));

let latestOptions;

const Harness = (props) => {
  latestOptions = useEmergencyRequestOptions(props);
  return null;
};

const flush = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

describe('useEmergencyRequestOptions', () => {
  let container;
  let root;
  let isAdmin;
  let isOrgAdmin;
  let consoleError;

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    jest.clearAllMocks();
    latestOptions = undefined;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    isAdmin = jest.fn(() => true);
    isOrgAdmin = jest.fn(() => false);
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    consoleError.mockRestore();
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  });

  it('does not acquire patient or facility data while closed or in view mode', async () => {
    await act(async () => {
      root.render(
        <Harness
          isOpen={false}
          isView={false}
          isCreate
          isAdmin={isAdmin}
          isOrgAdmin={isOrgAdmin}
        />
      );
    });
    await flush();

    expect(getEmergencyPatientOptions).not.toHaveBeenCalled();
    expect(getEmergencyCreateFacilityOptions).not.toHaveBeenCalled();

    await act(async () => {
      root.render(
        <Harness
          isOpen
          isView
          isCreate={false}
          isAdmin={isAdmin}
          isOrgAdmin={isOrgAdmin}
        />
      );
    });
    await flush();

    expect(getEmergencyPatientOptions).not.toHaveBeenCalled();
    expect(getEmergencyCreateFacilityOptions).not.toHaveBeenCalled();
  });

  it('loads bounded patient and facility options only for an authorized create surface', async () => {
    getEmergencyPatientOptions.mockResolvedValue({
      data: [{ id: 'patient-1', username: 'Ada' }],
      isPartial: true,
    });
    getEmergencyCreateFacilityOptions.mockResolvedValue({
      data: [{ id: 'hospital-1', name: 'Care Hospital' }],
      isPartial: false,
    });

    await act(async () => {
      root.render(
        <Harness
          isOpen
          isView={false}
          isCreate
          isAdmin={isAdmin}
          isOrgAdmin={isOrgAdmin}
        />
      );
    });
    await flush();

    expect(getEmergencyPatientOptions).toHaveBeenCalledTimes(1);
    expect(getEmergencyCreateFacilityOptions).toHaveBeenCalledTimes(1);
    expect(latestOptions).toEqual(expect.objectContaining({
      users: [{ id: 'patient-1', username: 'Ada' }],
      usersLoading: false,
      usersError: '',
      usersPartial: true,
      facilities: [{ id: 'hospital-1', name: 'Care Hospital' }],
      facilitiesLoading: false,
      facilitiesError: '',
      facilitiesPartial: false,
    }));
  });

  it('keeps facility acquisition off edit mode while still loading patient choices', async () => {
    getEmergencyPatientOptions.mockResolvedValue({ data: [], isPartial: false });

    await act(async () => {
      root.render(
        <Harness
          isOpen
          isView={false}
          isCreate={false}
          isAdmin={isAdmin}
          isOrgAdmin={isOrgAdmin}
        />
      );
    });
    await flush();

    expect(getEmergencyPatientOptions).toHaveBeenCalledTimes(1);
    expect(getEmergencyCreateFacilityOptions).not.toHaveBeenCalled();
  });

  it('surfaces read failures honestly without retaining plausible option data', async () => {
    getEmergencyPatientOptions.mockRejectedValue(new Error('patient denied'));
    getEmergencyCreateFacilityOptions.mockRejectedValue(new Error('facility denied'));

    await act(async () => {
      root.render(
        <Harness
          isOpen
          isView={false}
          isCreate
          isAdmin={isAdmin}
          isOrgAdmin={isOrgAdmin}
        />
      );
    });
    await flush();

    expect(latestOptions).toEqual(expect.objectContaining({
      users: [],
      usersLoading: false,
      usersError: 'patient denied',
      usersPartial: false,
      facilities: [],
      facilitiesLoading: false,
      facilitiesError: 'facility denied',
      facilitiesPartial: false,
    }));
  });
});
