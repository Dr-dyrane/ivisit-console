import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Bell, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { NotificationCard } from './NotificationCard';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { Sheet, SheetContent, SheetOverlay } from '../ui/sheet';
import { getNotifications, markNotificationAsRead, subscribeToNotifications } from '../../services/notificationService';

const NOTIFICATION_CACHE_MS = 60000;
const notificationCacheByUserId = new Map();

async function readNotificationsForUser(userId, options = {}) {
  const cached = notificationCacheByUserId.get(userId);
  const now = Date.now();

  if (!options.force && cached?.data && cached.expiresAt > now) {
    return cached.data;
  }

  if (!options.force && cached?.promise) {
    return cached.promise;
  }

  const promise = getNotifications(userId, 30, null, { quiet: true })
    .then((data) => {
      notificationCacheByUserId.set(userId, {
        data,
        expiresAt: Date.now() + NOTIFICATION_CACHE_MS,
        promise: null,
      });
      return data;
    })
    .catch((error) => {
      if (notificationCacheByUserId.get(userId)?.promise === promise) {
        notificationCacheByUserId.delete(userId);
      }
      throw error;
    });

  notificationCacheByUserId.set(userId, {
    data: cached?.data || null,
    expiresAt: cached?.expiresAt || 0,
    promise,
  });

  return promise;
}

export const NotificationCenter = () => {
  const { user } = useAuth();
  const { isMobile } = useNavigation();
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const fetchSeqRef = useRef(0);
  const inFlightUserIdRef = useRef(null);
  const lastFetchedUserIdRef = useRef(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  const fetchNotifications = useCallback(async (options = {}) => {
    if (!user?.id) return;
    if (
      !options.force &&
      (inFlightUserIdRef.current === user.id || lastFetchedUserIdRef.current === user.id)
    ) {
      return;
    }

    const fetchSeq = fetchSeqRef.current + 1;
    fetchSeqRef.current = fetchSeq;
    inFlightUserIdRef.current = user.id;

    setLoading(true);

    try {
      const data = await readNotificationsForUser(user.id, options);
      if (fetchSeq !== fetchSeqRef.current) return;

      setNotifications(data);
      lastFetchedUserIdRef.current = user.id;
    } catch {
      // Keep the existing list; notification refresh should not break the shell.
    } finally {
      if (inFlightUserIdRef.current === user.id) inFlightUserIdRef.current = null;
      if (fetchSeq === fetchSeqRef.current) setLoading(false);
    }
  }, [user?.id]); // Use user.id instead of user object

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!user?.id) return;
    const unsubscribe = subscribeToNotifications(user.id, (newNotification) => {
      setNotifications(prev => [newNotification, ...prev]);
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

  const handleDismiss = useCallback((notificationId) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  }, []);

  const markNotificationsReadOptimistically = useCallback(async (notificationIds) => {
    const ids = [...new Set(notificationIds)].filter(Boolean);
    if (ids.length === 0) return;

    setNotifications(prev =>
      prev.map(notification =>
        ids.includes(notification.id)
          ? { ...notification, read: true }
          : notification
      )
    );

    const results = await Promise.all(
      ids.map(async (id) => ({
        id,
        ok: await markNotificationAsRead(id),
      }))
    );

    const failedIds = results.filter(result => !result.ok).map(result => result.id);
    if (failedIds.length === 0) return;

    setNotifications(prev =>
      prev.map(notification =>
        failedIds.includes(notification.id)
          ? { ...notification, read: false }
          : notification
      )
    );
  }, []);

  const handleMarkRead = useCallback(async (notificationId) => {
    await markNotificationsReadOptimistically([notificationId]);
  }, [markNotificationsReadOptimistically]);

  const handleMarkAllRead = useCallback(() => {
    markNotificationsReadOptimistically(
      notifications
        .filter(notification => !notification.read)
        .map(notification => notification.id)
    );
  }, [markNotificationsReadOptimistically, notifications]);

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        aria-label={isOpen ? 'Close notifications' : 'Open notifications'}
        aria-expanded={isOpen}
        aria-haspopup={isMobile ? 'dialog' : 'menu'}
        onClick={() => {
          const nextOpen = !isOpen;
          setIsOpen(nextOpen);
          if (nextOpen) fetchNotifications({ force: true });
        }}
        className={`${isMobile
          ? 'h-8 w-8 rounded-pill hover:bg-[hsl(var(--spark)/0.08)] hover:text-[hsl(var(--spark)/0.92)]'
          : 'h-9 w-9 squircle hover:bg-primary/10 hover:text-primary'
          } relative transition-[color,background] duration-200 ease-out`}
      >
        <Bell className={`h-4 w-4 ${isMobile ? 'text-foreground/80' : ''}`} />
        {unreadCount > 0 && (
          <Badge className="absolute -top-2 -right-2 squircle-full h-5 w-5 p-0 flex items-center justify-center text-[10px] font-bold bg-destructive text-destructive-foreground">
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Mobile: Sheet */}
      {isMobile ? (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetOverlay className="bg-black/15 backdrop-blur-xs" />
          <SheetContent
            side="right"
            className="w-[88%] max-w-[385px] px-2 bg-background/95 dark:bg-muted/50 backdrop-blur-sm rounded-l-sheet overflow-hidden shadow-2xl"
          >
            <div className="px-4 pt-3 pb-2">
              <div>
                <h3 className="font-normal text-lg tracking-tight">Notifications</h3>
                {unreadCount > 0 && (
                  <p className="text-sm text-muted-foreground">{unreadCount} new</p>
                )}
              </div>
            </div>

            <div className="max-h-[68vh] overflow-y-auto px-2 pb-20 no-scrollbar">
              {loading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="h-20 rounded-inner bg-muted/10 animate-pulse"
                    />
                  ))}
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-12 text-center">
                  <Bell className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground font-normal">No notifications</p>
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {notifications.map(notification => (
                    <NotificationCard
                      key={notification.id}
                      notification={notification}
                      onDismiss={handleDismiss}
                      onMarkRead={handleMarkRead}
                    />
                  ))}
                </AnimatePresence>
              )}
            </div>

            {notifications.length > 0 && (
              <div className="absolute bottom-0 left-0 right-0 p-2 bg-background/70 backdrop-blur-xl">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs rounded-button hover:bg-[hsl(var(--spark)/0.08)] hover:text-[hsl(var(--spark)/0.92)]"
                  onClick={handleMarkAllRead}
                >
                  Mark all as read
                </Button>
              </div>
            )}
          </SheetContent>
        </Sheet>
      ) : (
        /* Desktop: Dropdown */
        <AnimatePresence>
          {isOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsOpen(false)}
                className="fixed inset-0 z-40"
              />
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full right-0 mt-2 w-96 max-h-[600px] z-50 backdrop-blur-sm"
              >
                <div className="rounded-card bg-background/35 backdrop-blur-xs shadow-2xl overflow-hidden flex flex-col">
                  <div className="p-4 bg-white/[0.04] flex items-center justify-between">
                    <div>
                      <h3 className="font-bold">Notifications</h3>
                      {unreadCount > 0 && (
                        <p className="text-xs text-muted-foreground">{unreadCount} new</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsOpen(false)}
                      aria-label="Close notifications"
                      className="squircle h-7 w-7 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="max-h-[50vh] overflow-y-auto space-y-2 p-4">
                    {loading ? (
                      <div className="space-y-2">
                        {[...Array(3)].map((_, i) => (
                          <div
                            key={i}
                            className="h-20 rounded-inner bg-muted/10 animate-pulse"
                          />
                        ))}
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="py-12 text-center">
                        <Bell className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground font-normal">No notifications</p>
                      </div>
                    ) : (
                      <AnimatePresence mode="popLayout">
                        {notifications.map(notification => (
                          <NotificationCard
                            key={notification.id}
                            notification={notification}
                            onDismiss={handleDismiss}
                            onMarkRead={handleMarkRead}
                          />
                        ))}
                      </AnimatePresence>
                    )}
                  </div>

                  {notifications.length > 0 && (
                    <div className="p-3 bg-white/5 shadow-[0_-14px_36px_-34px_hsl(var(--foreground)/0.45)]">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs"
                        onClick={handleMarkAllRead}
                      >
                        Mark all as read
                      </Button>
                    </div>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      )}
    </div>
  );
};
