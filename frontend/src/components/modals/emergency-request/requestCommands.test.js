import { toast } from 'sonner';
import {
  createNotification,
  NotificationActions,
  NotificationTypes,
} from '../../../services/notificationService';
import {
  createEmergencyRequest,
  updateEmergencyRequest,
} from '../../../services/emergencyService';
import { saveEmergencyRequest } from './requestCommands';

jest.mock('sonner', () => ({
  toast: { success: jest.fn() },
}));

jest.mock('../../../services/notificationService', () => ({
  createNotification: jest.fn(),
  NotificationActions: { CREATED: 'created', UPDATED: 'updated' },
  NotificationTypes: { EMERGENCY: 'emergency' },
}));

jest.mock('../../../services/emergencyService', () => ({
  createEmergencyRequest: jest.fn(),
  updateEmergencyRequest: jest.fn(),
}));

describe('EmergencyRequestModal receiver commands', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates through the canonical receiver before emitting creation evidence', async () => {
    const payload = { user_id: 'patient-1', status: 'pending_approval' };
    createEmergencyRequest.mockResolvedValue({ id: 'request-1' });
    createNotification.mockResolvedValue(undefined);

    await saveEmergencyRequest({
      isCreate: true,
      isEdit: false,
      payload,
      submitData: { priority: 'high' },
    });

    expect(createEmergencyRequest).toHaveBeenCalledWith(payload);
    expect(createNotification).toHaveBeenCalledWith(
      NotificationTypes.EMERGENCY,
      NotificationActions.CREATED,
      'request-1',
      { message: 'Emergency request created - Priority: high' }
    );
    expect(createEmergencyRequest.mock.invocationCallOrder[0])
      .toBeLessThan(createNotification.mock.invocationCallOrder[0]);
    expect(toast.success).toHaveBeenCalledWith('Request created');
    expect(updateEmergencyRequest).not.toHaveBeenCalled();
  });

  it('does not manufacture notification evidence when the create receiver returns no id', async () => {
    createEmergencyRequest.mockResolvedValue({});

    await saveEmergencyRequest({
      isCreate: true,
      isEdit: false,
      payload: { user_id: 'patient-2' },
      submitData: { priority: 'medium' },
    });

    expect(createNotification).not.toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith('Request created');
  });

  it('updates by UUID before emitting the canonical status notification', async () => {
    const payload = { status: 'accepted' };
    updateEmergencyRequest.mockResolvedValue({ id: 'request-2' });
    createNotification.mockResolvedValue(undefined);

    await saveEmergencyRequest({
      isCreate: false,
      isEdit: true,
      request: { id: 'request-2' },
      payload,
      submitData: { status: 'en_route' },
      normalizedStatus: 'accepted',
    });

    expect(updateEmergencyRequest).toHaveBeenCalledWith('request-2', payload);
    expect(createNotification).toHaveBeenCalledWith(
      NotificationTypes.EMERGENCY,
      NotificationActions.UPDATED,
      'request-2',
      { message: 'Emergency request updated - Status: accepted' }
    );
    expect(updateEmergencyRequest.mock.invocationCallOrder[0])
      .toBeLessThan(createNotification.mock.invocationCallOrder[0]);
    expect(toast.success).toHaveBeenCalledWith('Request updated');
    expect(createEmergencyRequest).not.toHaveBeenCalled();
  });

  it('propagates receiver failures without success feedback', async () => {
    const error = new Error('receiver denied');
    createEmergencyRequest.mockRejectedValue(error);

    await expect(saveEmergencyRequest({
      isCreate: true,
      isEdit: false,
      payload: { user_id: 'patient-3' },
      submitData: { priority: 'low' },
    })).rejects.toBe(error);

    expect(createNotification).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });
});
