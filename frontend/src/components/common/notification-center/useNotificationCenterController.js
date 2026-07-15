import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useNavigation } from '../../../contexts/NavigationContext';
import {
  dismissNotifications,
  markNotificationAsRead,
  subscribeToNotifications,
} from '../../../services/notificationService';
import {
  invalidateNotificationsForUser,
  readNotificationsForUser,
  reduceNotificationRealtimeEvent,
} from './notificationData';

export const useNotificationCenterController = () => {
  const { user } = useAuth();
  const { usesCompactNavigation } = useNavigation();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [mutationError, setMutationError] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);
  const fetchSeqRef = useRef(0);
  const inFlightUserIdRef = useRef(null);
  const lastFetchedUserIdRef = useRef(null);

  const unreadCount = notifications.filter((notification) => !notification.read).length;

  const fetchNotifications = useCallback(async (options = {}) => {
    if (!user?.id) return;
    if (
      !options.force
      && (inFlightUserIdRef.current === user.id || lastFetchedUserIdRef.current === user.id)
    ) {
      return;
    }

    const fetchSeq = fetchSeqRef.current + 1;
    fetchSeqRef.current = fetchSeq;
    inFlightUserIdRef.current = user.id;

    setLoadError(null);
    setLoading(true);

    try {
      const data = await readNotificationsForUser(user.id, options);
      if (fetchSeq !== fetchSeqRef.current) return;

      setNotifications(data);
      lastFetchedUserIdRef.current = user.id;
    } catch {
      if (fetchSeq !== fetchSeqRef.current) return;

      // Keep the existing list; notification refresh should not break the shell.
      setLoadError('Notifications could not be refreshed. Try again.');
    } finally {
      if (inFlightUserIdRef.current === user.id) inFlightUserIdRef.current = null;
      if (fetchSeq === fetchSeqRef.current) setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!user?.id) return undefined;
    const unsubscribe = subscribeToNotifications(user.id, (payload) => {
      invalidateNotificationsForUser(user.id);
      setLoadError(null);
      setNotifications((previous) => reduceNotificationRealtimeEvent(previous, payload));
    });

    return () => unsubscribe();
  }, [user?.id]);

  useEffect(() => {
    const handleNotificationsChanged = () => {
      fetchNotifications({ force: true });
    };
    window.addEventListener('notifications:changed', handleNotificationsChanged);
    return () => window.removeEventListener('notifications:changed', handleNotificationsChanged);
  }, [fetchNotifications]);

  const handleDismiss = useCallback(async (notificationIds) => {
    if (!user?.id) return;
    const ids = [...new Set(
      (Array.isArray(notificationIds) ? notificationIds : [notificationIds])
        .filter(Boolean)
    )];
    if (ids.length === 0) return;

    const idSet = new Set(ids);
    setMutationError(null);
    setNotifications((previous) => previous.filter(
      (notification) => !idSet.has(notification.id)
    ));

    const cleared = await dismissNotifications(ids, user.id);
    if (cleared) return;

    setMutationError('Notifications could not be cleared. Try again.');
    fetchNotifications({ force: true });
  }, [fetchNotifications, user?.id]);

  const markNotificationsReadOptimistically = useCallback(async (notificationIds) => {
    const ids = [...new Set(notificationIds)].filter(Boolean);
    if (ids.length === 0) return { failedIds: [] };

    const idSet = new Set(ids);
    const previousReadById = new Map(
      notifications
        .filter((notification) => idSet.has(notification.id))
        .map((notification) => [notification.id, Boolean(notification.read)])
    );

    setNotifications((previous) => previous.map((notification) => (
      idSet.has(notification.id) ? { ...notification, read: true } : notification
    )));

    const results = await Promise.all(
      ids.map(async (id) => {
        try {
          return { id, ok: await markNotificationAsRead(id) };
        } catch {
          return { id, ok: false };
        }
      })
    );

    const failedIds = results.filter(result => !result.ok).map(result => result.id);
    if (failedIds.length === 0) return { failedIds };

    const failedIdSet = new Set(failedIds);
    setNotifications((previous) => previous.map((notification) => {
      if (!failedIdSet.has(notification.id) || !previousReadById.has(notification.id)) {
        return notification;
      }
      return { ...notification, read: previousReadById.get(notification.id) };
    }));

    return { failedIds };
  }, [notifications]);

  const handleMarkRead = useCallback(async (notificationId) => {
    setMutationError(null);
    const { failedIds } = await markNotificationsReadOptimistically([notificationId]);
    if (failedIds.length > 0) {
      setMutationError('This notification could not be marked as read. Try again.');
    }
  }, [markNotificationsReadOptimistically]);

  const handleMarkAllRead = useCallback(async () => {
    if (markingAll) return;

    const unreadIds = notifications
      .filter((notification) => !notification.read)
      .map((notification) => notification.id);
    if (unreadIds.length === 0) return;

    setMutationError(null);
    setMarkingAll(true);
    try {
      const { failedIds } = await markNotificationsReadOptimistically(unreadIds);
      if (failedIds.length > 0) {
        setMutationError('Some notifications could not be marked as read. Try again.');
      }
    } finally {
      setMarkingAll(false);
    }
  }, [markNotificationsReadOptimistically, markingAll, notifications]);

  const handleRetryNotifications = useCallback(() => {
    fetchNotifications({ force: true });
  }, [fetchNotifications]);

  const handleOpenNotification = useCallback((destination) => {
    setIsOpen(false);
    navigate(destination);
  }, [navigate]);

  const toggleNotifications = useCallback(() => {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (nextOpen) fetchNotifications({ force: true });
  }, [fetchNotifications, isOpen]);

  return {
    fetchNotifications,
    handleDismiss,
    handleMarkAllRead,
    handleMarkRead,
    handleOpenNotification,
    handleRetryNotifications,
    isMobile: usesCompactNavigation,
    isOpen,
    loadError,
    loading,
    markingAll,
    mutationError,
    notifications,
    setIsOpen,
    toggleNotifications,
    unreadCount,
  };
};
