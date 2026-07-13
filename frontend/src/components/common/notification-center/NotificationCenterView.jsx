import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, X } from 'lucide-react';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Sheet, SheetContent, SheetOverlay } from '../../ui/sheet';
import { MarkAllReadButton, NotificationListState } from './NotificationContent';

const NotificationPanelHeader = ({ compact = false, unreadCount }) => (
  <div>
    <h3 className={`${compact ? 'text-base' : 'text-lg'} font-bold tracking-tight text-foreground`}>
      Notifications
    </h3>
    {unreadCount > 0 && (
      <p className={`mt-0.5 ${compact ? 'text-xs' : 'text-sm'} text-muted-foreground`}>
        {unreadCount} new
      </p>
    )}
  </div>
);

const MobileNotificationSheet = ({ controller }) => {
  const { isOpen, setIsOpen, unreadCount } = controller;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetOverlay className="bg-black/[0.46] backdrop-blur-sm" />
      <SheetContent
        side="right"
        className="flex flex-col w-[88%] max-w-[385px] px-2 pt-4 pb-0 bg-card/90 dark:bg-card/85 backdrop-blur-2xl backdrop-saturate-150 rounded-l-sheet overflow-hidden shadow-[0_12px_32px_rgb(0_0_0/0.10)]"
      >
        <div className="shrink-0 px-1 pb-3">
          <NotificationPanelHeader unreadCount={unreadCount} />
        </div>

        <div className="flex-1 overflow-y-auto px-1 pb-3 no-scrollbar">
          <NotificationListState controller={controller} />
        </div>

        {controller.notifications.length > 0 && (
          <div className="shrink-0 px-1 py-2.5 bg-card/40 backdrop-blur-xl">
            <MarkAllReadButton controller={controller} />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

const DesktopNotificationDropdown = ({ controller }) => {
  const { isOpen, setIsOpen, unreadCount } = controller;

  return (
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
            <div className="flex flex-col overflow-hidden rounded-card bg-card/90 backdrop-blur-2xl backdrop-saturate-150 shadow-[0_12px_32px_rgb(0_0_0/0.10)] dark:bg-card/85">
              <div className="flex items-center justify-between px-3 pt-4 pb-3">
                <NotificationPanelHeader compact unreadCount={unreadCount} />
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
                <NotificationListState controller={controller} />
              </div>

              {controller.notifications.length > 0 && (
                <div className="px-3 py-3 bg-card/40 backdrop-blur-xl">
                  <MarkAllReadButton controller={controller} />
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export const NotificationCenterView = ({ controller }) => {
  const {
    isMobile,
    isOpen,
    toggleNotifications,
    unreadCount,
  } = controller;

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        aria-label={isOpen ? 'Close notifications' : 'Open notifications'}
        aria-expanded={isOpen}
        aria-haspopup={isMobile ? 'dialog' : 'menu'}
        onClick={toggleNotifications}
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

      {isMobile ? (
        <MobileNotificationSheet controller={controller} />
      ) : (
        <DesktopNotificationDropdown controller={controller} />
      )}
    </div>
  );
};
