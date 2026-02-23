import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { Bell, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { NotificationCard } from './NotificationCard';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { Sheet, SheetContent, SheetOverlay } from '../ui/sheet';
import { getNotifications, markNotificationAsRead, subscribeToNotifications } from '../../services/notificationService';

export const NotificationCenter = () => {
  const { user } = useAuth();
  const { isMobile } = useNavigation();
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const data = await getNotifications(user.id, 30);
    setNotifications(data);
    setLoading(false);
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
      fetchNotifications();
    };
    window.addEventListener('notifications:changed', handleNotificationsChanged);
    return () => window.removeEventListener('notifications:changed', handleNotificationsChanged);
  }, [fetchNotifications]);

  const handleDismiss = useCallback((notificationId) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  }, []);

  const handleMarkRead = useCallback(async (notificationId) => {
    await markNotificationAsRead(notificationId);
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
  }, []);

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          const nextOpen = !isOpen;
          setIsOpen(nextOpen);
          if (nextOpen) fetchNotifications();
        }}
        className={`${isMobile
          ? 'h-8 w-8 rounded-full hover:bg-[hsl(var(--spark)/0.08)] hover:text-[hsl(var(--spark)/0.92)]'
          : 'h-9 w-9 squircle hover:bg-primary/10 hover:text-primary'
          } relative transition-[color,background] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]`}
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
            className="w-[88%] max-w-[385px] px-2 border-0 bg-background/95 dark:bg-muted/50 backdrop-blur-sm rounded-l-[36px] overflow-hidden shadow-2xl"
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
                      className="h-20 squircle-lg bg-muted/10 animate-pulse"
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
                  className="w-full text-xs rounded-2xl hover:bg-[hsl(var(--spark)/0.08)] hover:text-[hsl(var(--spark)/0.92)]"
                  onClick={() => {
                    notifications
                      .filter(n => !n.read)
                      .forEach(n => handleMarkRead(n.id));
                  }}
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
                <Card className="squircle-xl bg-background/35 backdrop-blur-xs shadow-2xl border-0 overflow-hidden flex flex-col">
                  <div className="p-4 border-b border-white/10 flex items-center justify-between">
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
                            className="h-20 squircle-lg bg-muted/10 animate-pulse"
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
                    <div className="p-3 border-t border-white/10 bg-white/5">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => {
                          notifications
                            .filter(n => !n.read)
                            .forEach(n => handleMarkRead(n.id));
                        }}
                      >
                        Mark all as read
                      </Button>
                    </div>
                  )}
                </Card>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      )}
    </div>
  );
};
