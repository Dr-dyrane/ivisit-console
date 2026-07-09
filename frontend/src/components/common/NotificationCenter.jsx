import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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

// Local day-bucket grouping — no shared mobile helper matches the per-calendar-day
// Today / Yesterday / weekday+date / short-date shape, so we keep it here. Pure:
// the caller passes `now`; we only build Dates from each row's own timestamp.
const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const dayLabel = (date, now) => {
  const diffDays = Math.round((startOfDay(now).getTime() - startOfDay(date).getTime()) / 86400000);
  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  return date.toLocaleDateString();
};

function groupNotificationsByDay(notifications, now = new Date()) {
  const list = Array.isArray(notifications) ? notifications : [];
  const buckets = new Map();

  list.forEach((notification) => {
    const raw = notification.timestamp || notification.created_at;
    const date = raw ? new Date(raw) : null;
    const valid = date && !Number.isNaN(date.getTime());
    const key = valid ? startOfDay(date).getTime() : 0;

    if (!buckets.has(key)) {
      buckets.set(key, {
        key,
        label: valid ? dayLabel(date, now) : 'Earlier',
        ts: key,
        items: [],
      });
    }
    buckets.get(key).items.push({ notification, ts: valid ? date.getTime() : 0 });
  });

  return [...buckets.values()]
    .sort((a, b) => b.ts - a.ts)
    .map((bucket) => ({
      key: bucket.key,
      label: bucket.label,
      items: bucket.items.sort((a, b) => b.ts - a.ts).map((entry) => entry.notification),
    }));
}

// Shared grouped renderer for both the desktop dropdown and the mobile Sheet.
// One card per single-item day; one panel with hairline-separated rows otherwise.
const NotificationGroupList = ({ notifications, onDismiss, onMarkRead }) => {
  const groups = useMemo(() => groupNotificationsByDay(notifications), [notifications]);

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <section key={group.key} className="space-y-2">
          <div className="mb-2 flex items-center justify-between px-1">
            <h4 className="text-sm font-semibold text-foreground">{group.label}</h4>
            <button
              type="button"
              onClick={() => group.items.forEach((notification) => onDismiss(notification.id))}
              className="rounded-pill px-1 text-xs font-semibold text-destructive transition-opacity hover:opacity-70"
            >
              Clear
            </button>
          </div>

          {group.items.length === 1 ? (
            <AnimatePresence initial={false} mode="popLayout">
              <NotificationCard
                key={group.items[0].id}
                notification={group.items[0]}
                onDismiss={onDismiss}
                onMarkRead={onMarkRead}
              />
            </AnimatePresence>
          ) : (
            <div className="overflow-hidden rounded-card surface-card">
              <AnimatePresence initial={false} mode="popLayout">
                {group.items.map((notification, index) => (
                  <NotificationCard
                    key={notification.id}
                    notification={notification}
                    onDismiss={onDismiss}
                    onMarkRead={onMarkRead}
                    grouped
                    showDivider={index > 0}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>
      ))}
    </div>
  );
};

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
          : 'h-9 w-9 rounded-button hover:bg-muted/60 hover:text-foreground'
          } relative transition-[color,background] duration-200 ease-out`}
      >
        <Bell className={`h-4 w-4 ${isMobile ? 'text-foreground/80' : ''}`} />
        {unreadCount > 0 && (
          <Badge className="absolute -top-2 -right-2 rounded-pill h-5 w-5 p-0 flex items-center justify-center text-[10px] font-bold bg-destructive text-destructive-foreground">
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Mobile: Sheet */}
      {isMobile ? (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetOverlay className="bg-black/[0.46] backdrop-blur-sm" />
          <SheetContent
            side="right"
            className="flex flex-col w-[88%] max-w-[385px] px-2 pt-4 pb-0 bg-card/88 dark:bg-[#0b1220]/85 backdrop-blur-xl rounded-l-sheet overflow-hidden shadow-[0_12px_32px_rgb(0_0_0/0.10)]"
          >
            <div className="shrink-0 px-1 pb-3">
              <h3 className="text-lg font-bold tracking-tight text-foreground">Notifications</h3>
              {unreadCount > 0 && (
                <p className="mt-0.5 text-sm text-muted-foreground">{unreadCount} new</p>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-1 pb-3 no-scrollbar">
              {loading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="h-20 rounded-inner bg-muted/30 animate-pulse"
                    />
                  ))}
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-14 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-icon bg-muted/40">
                    <Bell className="h-5 w-5 text-muted-foreground/60" />
                  </div>
                  <p className="text-sm text-muted-foreground">No notifications</p>
                </div>
              ) : (
                <NotificationGroupList
                  notifications={notifications}
                  onDismiss={handleDismiss}
                  onMarkRead={handleMarkRead}
                />
              )}
            </div>

            {notifications.length > 0 && (
              <div className="shrink-0 px-1 py-2.5 bg-card/40 backdrop-blur-xl">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full rounded-button text-xs font-semibold text-muted-foreground hover:bg-muted/60 hover:text-foreground"
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
                <div className="flex flex-col overflow-hidden rounded-card bg-card/68 backdrop-blur-2xl shadow-[0_12px_32px_rgb(0_0_0/0.10)] dark:bg-card/55">
                  <div className="flex items-center justify-between px-3 pt-4 pb-3">
                    <div>
                      <h3 className="text-base font-bold tracking-tight text-foreground">Notifications</h3>
                      {unreadCount > 0 && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{unreadCount} new</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsOpen(false)}
                      aria-label="Close notifications"
                      className="h-8 w-8 rounded-pill p-0 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="max-h-[50vh] overflow-y-auto px-3 pb-3">
                    {loading ? (
                      <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                          <div
                            key={i}
                            className="h-20 rounded-inner bg-muted/30 animate-pulse"
                          />
                        ))}
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="py-14 text-center">
                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-icon bg-muted/40">
                          <Bell className="h-5 w-5 text-muted-foreground/60" />
                        </div>
                        <p className="text-sm text-muted-foreground">No notifications</p>
                      </div>
                    ) : (
                      <NotificationGroupList
                        notifications={notifications}
                        onDismiss={handleDismiss}
                        onMarkRead={handleMarkRead}
                      />
                    )}
                  </div>

                  {notifications.length > 0 && (
                    <div className="px-3 py-3 bg-card/40 backdrop-blur-xl">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full rounded-button text-xs font-semibold text-muted-foreground hover:bg-muted/60 hover:text-foreground"
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
