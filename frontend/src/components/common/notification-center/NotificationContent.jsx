import React, { useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { AlertCircle, Bell, Loader2 } from 'lucide-react';
import { Button } from '../../ui/button';
import { NotificationCard } from '../NotificationCard';
import { groupNotificationsByDay } from './notificationPresentation';

export const NotificationGroupList = ({
  notifications,
  onDismiss,
  onMarkRead,
  onOpenNotification,
}) => {
  const groups = useMemo(() => groupNotificationsByDay(notifications), [notifications]);

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <section key={group.key} className="space-y-2">
          <div className="mb-2 flex items-center justify-between px-1">
            <h4 className="text-sm font-semibold text-foreground">{group.label}</h4>
            <button
              type="button"
              onClick={() => onDismiss(group.items.map((notification) => notification.id))}
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
                onOpenNotification={onOpenNotification}
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
                    onOpenNotification={onOpenNotification}
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

export const NotificationLoadError = ({ onRetry }) => (
  <div role="alert" className="py-12 text-center">
    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-icon bg-destructive/[0.08]">
      <AlertCircle className="h-5 w-5 text-destructive" />
    </div>
    <p className="text-sm font-semibold text-foreground">Notifications unavailable</p>
    <p className="mx-auto mt-1 max-w-[240px] text-xs leading-5 text-muted-foreground">
      We could not load notifications right now.
    </p>
    <Button
      variant="ghost"
      size="sm"
      className="mt-3 rounded-button bg-muted/50 text-xs font-semibold hover:bg-muted"
      onClick={onRetry}
    >
      Try again
    </Button>
  </div>
);

export const NotificationInlineError = ({ message, onRetry }) => (
  <div role="alert" className="mb-3 flex items-start gap-2 rounded-inner bg-destructive/[0.07] px-3 py-2.5">
    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
    <p className="min-w-0 flex-1 text-xs leading-5 text-foreground">{message}</p>
    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        className="shrink-0 rounded-pill px-1 text-xs font-semibold text-foreground transition-opacity hover:opacity-70"
      >
        Retry
      </button>
    )}
  </div>
);

export const NotificationListState = ({ controller }) => {
  const {
    handleDismiss,
    handleMarkRead,
    handleOpenNotification,
    handleRetryNotifications,
    loadError,
    loading,
    mutationError,
    notifications,
  } = controller;

  let content;
  if (loading && notifications.length === 0) {
    content = (
      <div className="space-y-3">
        {[...Array(3)].map((_, index) => (
          <div key={index} className="h-20 rounded-inner bg-muted/30 animate-pulse" />
        ))}
      </div>
    );
  } else if (loadError && notifications.length === 0) {
    content = <NotificationLoadError onRetry={handleRetryNotifications} />;
  } else if (notifications.length === 0) {
    content = (
      <div className="py-14 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-icon bg-muted/40">
          <Bell className="h-5 w-5 text-muted-foreground/60" />
        </div>
        <p className="text-sm text-muted-foreground">No notifications</p>
      </div>
    );
  } else {
    content = (
      <NotificationGroupList
        notifications={notifications}
        onDismiss={handleDismiss}
        onMarkRead={handleMarkRead}
        onOpenNotification={handleOpenNotification}
      />
    );
  }

  return (
    <>
      {loadError && notifications.length > 0 && (
        <NotificationInlineError message={loadError} onRetry={handleRetryNotifications} />
      )}
      {mutationError && <NotificationInlineError message={mutationError} />}
      {content}
    </>
  );
};

export const MarkAllReadButton = ({ controller }) => {
  const {
    handleMarkAllRead,
    markingAll,
    notifications,
    unreadCount,
  } = controller;

  if (notifications.length === 0) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      className="w-full rounded-button text-xs font-semibold text-muted-foreground hover:bg-muted/60 hover:text-foreground"
      onClick={handleMarkAllRead}
      disabled={markingAll || unreadCount === 0}
      aria-busy={markingAll}
      data-state={markingAll ? 'pending' : 'ready'}
    >
      {markingAll && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
      {markingAll ? 'Marking as read...' : unreadCount === 0 ? 'All caught up' : 'Mark all as read'}
    </Button>
  );
};
