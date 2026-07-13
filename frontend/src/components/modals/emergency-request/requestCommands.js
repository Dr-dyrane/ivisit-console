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

export const saveEmergencyRequest = async ({
  isCreate,
  isEdit,
  request,
  payload,
  submitData,
  normalizedStatus,
}) => {
  if (isCreate) {
    const created = await createEmergencyRequest(payload);
    const createdId = created?.id;
    if (createdId) {
      await createNotification(
        NotificationTypes.EMERGENCY,
        NotificationActions.CREATED,
        createdId,
        { message: `Emergency request created - Priority: ${submitData.priority}` }
      );
    }

    toast.success('Request created');
  } else if (isEdit) {
    await updateEmergencyRequest(request.id, payload);

    await createNotification(
      NotificationTypes.EMERGENCY,
      NotificationActions.UPDATED,
      request.id,
      { message: `Emergency request updated - Status: ${normalizedStatus || submitData.status}` }
    );

    toast.success('Request updated');
  }
};
