import React from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { X, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  Ambulance,
  Stethoscope,
  Building2,
  Users,
  Calendar,
  AlertTriangle,
  Zap,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';

const IconMap = {
  Ambulance,
  Stethoscope,
  Building2,
  Users,
  Calendar,
  AlertTriangle,
  Zap,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
};

export const NotificationCard = ({ notification, onDismiss, onMarkRead }) => {
  const IconComponent = IconMap[notification.icon];

  const colorConfig = {
    success: 'bg-success/20 text-success',
    destructive: 'bg-destructive/20 text-destructive',
    warning: 'bg-warning/20 text-warning',
    info: 'bg-info/20 text-info',
  };

  const signalConfig = {
    success: 'shadow-[inset_4px_0_0_hsl(var(--success)/0.72)]',
    destructive: 'shadow-[inset_4px_0_0_hsl(var(--destructive)/0.72)]',
    warning: 'shadow-[inset_4px_0_0_hsl(var(--warning)/0.72)]',
    info: 'shadow-[inset_4px_0_0_hsl(var(--info)/0.72)]',
  };

  // Use timestamp if available, fallback to created_at
  const displayTime = notification.timestamp || notification.created_at;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
      <div className={`squircle-lg bg-background/35 backdrop-blur-xs p-4 ${signalConfig[notification.color]} relative overflow-hidden group hover:shadow-xl transition-shadow`}>
        <div className="flex items-start gap-4">
          <div className={`w-10 h-10 squircle flex items-center justify-center flex-shrink-0 ${colorConfig[notification.color]}`}>
            {IconComponent ? <IconComponent className="h-5 w-5" /> : null}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-sm">{notification.title}</h3>
              {notification.priority && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                  {notification.priority}
                </Badge>
              )}
              {!notification.read && (
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              )}
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">{notification.message}</p>
            <div className="flex items-center gap-2 mt-2">
              <p className="text-[10px] text-muted-foreground/60">
                {displayTime ? new Date(displayTime).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                }) : 'No time'}
              </p>
              {notification.action_type && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                  {notification.action_type}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {!notification.read && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onMarkRead(notification.id)}
                aria-label="Mark notification as read"
                className="squircle h-7 w-7 p-0 hover:bg-primary/10 hover:text-primary"
              >
                <Check className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDismiss(notification.id)}
              aria-label="Dismiss notification"
              className="squircle h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
