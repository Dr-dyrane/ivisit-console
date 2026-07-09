import React from 'react';
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
  Newspaper,
  Eye,
  EyeOff,
  Bell,
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
  Newspaper,
  Eye,
  EyeOff,
};

// Tone map — literal palette only. The semantic tokens (primary/secondary/
// success/warning/info) all resolve to RED in this theme, so we never use them
// for tone. success -> emerald, info -> sky, warning -> amber, and only genuine
// danger (delete / cancel / emergency / reject) gets --destructive red.
const signalConfig = {
  success: { tile: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
  info: { tile: 'bg-sky-500/15 text-sky-600 dark:text-sky-400', dot: 'bg-sky-500' },
  warning: { tile: 'bg-amber-500/15 text-amber-600 dark:text-amber-500', dot: 'bg-amber-500' },
  destructive: { tile: 'bg-destructive/15 text-destructive', dot: 'bg-destructive' },
};

const neutralTone = { tile: 'bg-muted/50 text-muted-foreground', dot: 'bg-foreground/40' };

export const NotificationCard = ({ notification, onDismiss, onMarkRead }) => {
  const IconComponent = IconMap[notification.icon] || Bell;
  const tone = signalConfig[notification.color] || neutralTone;
  const isUnread = !notification.read;

  // Use timestamp if available, fallback to created_at
  const displayTime = notification.timestamp || notification.created_at;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
      {/* Borderless card — depth from tone + concentric radius (inner < container). */}
      {/* Unread reads brighter via surface tone alone: no drawn accent, no left bar. */}
      <div
        className={`group relative overflow-hidden rounded-inner p-4 backdrop-blur-xl transition-shadow shadow-[0_1px_3px_rgb(0_0_0/0.05)] hover:shadow-[0_4px_12px_rgb(0_0_0/0.07)] ${
          isUnread ? 'bg-card/70 dark:bg-card/55' : 'bg-muted/25 dark:bg-muted/15'
        }`}
      >
        <div className="flex items-start gap-3.5">
          <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-icon ${tone.tile}`}>
            {IconComponent ? <IconComponent className="h-5 w-5" /> : null}
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{notification.title}</h3>
              {isUnread && <span className={`h-2 w-2 flex-shrink-0 rounded-pill ${tone.dot}`} />}
            </div>
            <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{notification.message}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-muted-foreground/70">
                {displayTime ? new Date(displayTime).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                }) : 'No time'}
              </span>
              {notification.action_type && (
                <span className="rounded-pill bg-muted/60 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  {notification.action_type}
                </span>
              )}
              {notification.priority && notification.priority !== 'normal' && (
                <span className="rounded-pill bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-500">
                  {notification.priority}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-shrink-0 items-center gap-1">
            {isUnread && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onMarkRead(notification.id)}
                aria-label="Mark notification as read"
                className="h-8 w-8 rounded-button p-0 text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-600"
              >
                <Check className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDismiss(notification.id)}
              aria-label="Dismiss notification"
              className="h-8 w-8 rounded-button p-0 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
