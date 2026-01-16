import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { Bell, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { NotificationCard } from './NotificationCard';
import { useAuth } from '../../contexts/AuthContext';
import { getNotifications, markNotificationAsRead, subscribeToNotifications } from '../../services/notificationService';

export const NotificationCenter = () => {
  const { user } = useAuth();
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
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToNotifications(user.id, (newNotification) => {
      setNotifications(prev => [newNotification, ...prev]);
    });

    return () => unsubscribe();
  }, [user]);

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
        onClick={() => setIsOpen(!isOpen)}
        className="squircle h-9 w-9 hover:bg-primary/10 hover:text-primary relative"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-2 -right-2 squircle-full h-5 w-5 p-0 flex items-center justify-center text-[10px] font-black bg-destructive text-destructive-foreground">
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>

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
              className="absolute top-full right-0 mt-2 w-96 max-h-[600px] z-50"
            >
              <Card className="squircle-xl glass shadow-2xl border-0 overflow-hidden flex flex-col">
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                  <div>
                    <h3 className="font-black">Notifications</h3>
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

                <div className="flex-1 overflow-y-auto space-y-2 p-4">
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
                      <p className="text-sm text-muted-foreground font-medium">No notifications</p>
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
    </div>
  );
};
