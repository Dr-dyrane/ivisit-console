import { supabase } from '../lib/supabase';

export const NotificationTypes = {
  AMBULANCE: 'ambulance',
  DOCTOR: 'doctor',
  HOSPITAL: 'hospital',
  USER: 'user',
  VISIT: 'visit',
  EMERGENCY: 'emergency_request',
  VERIFICATION: 'verification',
  NEWS: 'news',
};

export const NotificationActions = {
  CREATED: 'created',
  UPDATED: 'updated',
  DELETED: 'deleted',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
  ASSIGNED: 'assigned',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  PUBLISHED: 'published',
  UNPUBLISHED: 'unpublished',
};

export const ActionConfig = {
  [NotificationTypes.AMBULANCE]: {
    [NotificationActions.CREATED]: { label: 'Ambulance Added', icon: 'Ambulance', color: 'success' },
    [NotificationActions.UPDATED]: { label: 'Ambulance Updated', icon: 'Ambulance', color: 'info' },
    [NotificationActions.DELETED]: { label: 'Ambulance Removed', icon: 'Trash2', color: 'destructive' },
  },
  [NotificationTypes.DOCTOR]: {
    [NotificationActions.CREATED]: { label: 'Doctor Added', icon: 'Stethoscope', color: 'success' },
    [NotificationActions.UPDATED]: { label: 'Doctor Updated', icon: 'Stethoscope', color: 'info' },
    [NotificationActions.DELETED]: { label: 'Doctor Removed', icon: 'Trash2', color: 'destructive' },
  },
  [NotificationTypes.HOSPITAL]: {
    [NotificationActions.CREATED]: { label: 'Hospital Added', icon: 'Building2', color: 'success' },
    [NotificationActions.UPDATED]: { label: 'Hospital Updated', icon: 'Building2', color: 'info' },
    [NotificationActions.DELETED]: { label: 'Hospital Removed', icon: 'Trash2', color: 'destructive' },
  },
  [NotificationTypes.USER]: {
    [NotificationActions.CREATED]: { label: 'User Added', icon: 'Users', color: 'success' },
    [NotificationActions.UPDATED]: { label: 'User Updated', icon: 'Users', color: 'info' },
    [NotificationActions.DELETED]: { label: 'User Removed', icon: 'Trash2', color: 'destructive' },
  },
  [NotificationTypes.VISIT]: {
    [NotificationActions.CREATED]: { label: 'Visit Scheduled', icon: 'Calendar', color: 'success' },
    [NotificationActions.UPDATED]: { label: 'Visit Updated', icon: 'Calendar', color: 'info' },
    [NotificationActions.COMPLETED]: { label: 'Visit Completed', icon: 'CheckCircle', color: 'success' },
    [NotificationActions.CANCELLED]: { label: 'Visit Cancelled', icon: 'XCircle', color: 'destructive' },
  },
  [NotificationTypes.EMERGENCY]: {
    [NotificationActions.CREATED]: { label: 'Emergency Request', icon: 'AlertTriangle', color: 'destructive' },
    [NotificationActions.ASSIGNED]: { label: 'Emergency Assigned', icon: 'Zap', color: 'warning' },
    [NotificationActions.COMPLETED]: { label: 'Emergency Resolved', icon: 'CheckCircle', color: 'success' },
    [NotificationActions.CANCELLED]: { label: 'Emergency Cancelled', icon: 'XCircle', color: 'destructive' },
  },
  [NotificationTypes.VERIFICATION]: {
    [NotificationActions.CREATED]: { label: 'Verification Pending', icon: 'Clock', color: 'warning' },
    [NotificationActions.VERIFIED]: { label: 'Verification Approved', icon: 'CheckCircle', color: 'success' },
    [NotificationActions.REJECTED]: { label: 'Verification Rejected', icon: 'XCircle', color: 'destructive' },
  },
  [NotificationTypes.NEWS]: {
    [NotificationActions.CREATED]: { label: 'News Article Created', icon: 'Newspaper', color: 'success' },
    [NotificationActions.UPDATED]: { label: 'News Article Updated', icon: 'Newspaper', color: 'info' },
    [NotificationActions.DELETED]: { label: 'News Article Deleted', icon: 'Trash2', color: 'destructive' },
    [NotificationActions.PUBLISHED]: { label: 'News Article Published', icon: 'Eye', color: 'success' },
    [NotificationActions.UNPUBLISHED]: { label: 'News Article Unpublished', icon: 'EyeOff', color: 'warning' },
  },
};

export const createNotification = async (type, action, targetId, metadata = {}) => {
  try {
    const config = ActionConfig[type]?.[action];
    if (!config) {
      console.warn(`No config found for ${type}/${action}`);
      return null;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('notifications')
      .insert([
        {
          user_id: user.id,
          type,
          target_id: targetId,
          title: config.label,
          message: metadata.message || `${config.label} - ${targetId}`,
          icon: config.icon,
          color: config.color,
          metadata,
          read: false,
          created_at: new Date().toISOString(),
        }
      ])
      .select();

    if (error) {
      console.error('Error creating notification:', error);
      return null;
    }

    return data?.[0] || null;
  } catch (error) {
    console.error('Error in createNotification:', error);
    return null;
  }
};

export const subscribeToNotifications = (userId, callback) => {
  const channel = supabase
    .channel(`notifications:user=${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => callback(payload.new)
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
};

export const markNotificationAsRead = async (notificationId) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
};

export const getNotifications = async (userId, limit = 50, read = null) => {
  try {
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (read !== null) {
      query = query.eq('read', read);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
};
