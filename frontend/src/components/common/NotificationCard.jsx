import React from 'react';
import { X, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { resolveNotificationDestination } from './notificationRoutes';
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

// Relative for recent events ("3h ago", "1d ago"), short date past a week.
// Pure — the caller passes an ISO/date value; we never read module-scope time.
export const formatNotificationTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return date.toLocaleDateString();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
};

// The "New" pill leans on tone: emergency/danger -> destructive red, the
// approval / access-request lane -> amber, everything else the tone tile.
const resolveNewPillTone = (notification, tone) => {
  if (notification.color === 'destructive' || notification.type === 'emergency_request') {
    return 'bg-destructive/15 text-destructive';
  }
  if (notification.type === 'verification' || notification.action_type === 'assigned') {
    return 'bg-amber-500/15 text-amber-600 dark:text-amber-500';
  }
  return tone.tile;
};

export const NotificationCard = ({
  notification,
  onDismiss,
  onMarkRead,
  onOpenNotification,
  grouped = false,
  showDivider = false,
}) => {
  const IconComponent = IconMap[notification.icon] || Bell;
  const tone = signalConfig[notification.color] || neutralTone;
  const isUnread = !notification.read;
  const displayTime = notification.timestamp || notification.created_at;
  const destination = resolveNotificationDestination(notification);
  const canActivate = isUnread || Boolean(destination);
  const pillTone = resolveNewPillTone(notification, tone);

  const handleActivate = () => {
    if (isUnread) onMarkRead(notification.id);
    if (destination) onOpenNotification(destination);
  };

  // Standalone rows carry their own surface + unread/read tone; grouped rows are
  // transparent and inherit the shared panel surface (tone lives in the pill).
  const standaloneSurface = isUnread ? 'bg-card/70 dark:bg-card/55' : 'bg-muted/25 dark:bg-muted/15';

  const row = (
    <div
      role={canActivate ? 'button' : undefined}
      tabIndex={canActivate ? 0 : undefined}
      aria-label={destination ? `Open ${notification.title || 'notification'}` : (isUnread ? 'Mark notification as read' : undefined)}
      onClick={handleActivate}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleActivate();
        }
      }}
      className={`group relative w-full p-3.5 transition-colors ${canActivate ? 'cursor-pointer hover:bg-muted/20 dark:hover:bg-white/[0.04]' : ''}`}
    >
      <div className="flex items-start gap-3">
        {/* Circular icon well — type-tinted, pill radius. */}
        <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-pill ${tone.tile}`}>
          <IconComponent className="h-5 w-5" />
        </div>

        {/* Title + message, tight. */}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-semibold text-foreground">{notification.title}</h3>
          <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-muted-foreground">
            {notification.message}
          </p>
        </div>

        {/* Time on top, unread "New" pill (or a faint chevron for actionable read rows) below. */}
        <div className="ml-2 flex shrink-0 flex-col items-end">
          <span className="text-[11px] text-muted-foreground/70">{formatNotificationTime(displayTime)}</span>
          {isUnread ? (
            <span className={`mt-1 rounded-pill px-2 py-0.5 text-[10px] font-semibold ${pillTone}`}>New</span>
          ) : destination ? (
            <ChevronRight className="mt-1 h-4 w-4 text-muted-foreground/50" />
          ) : null}
        </div>
      </div>

      {/* Hover-only dismiss — never the primary layout. */}
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onDismiss(notification.id);
        }}
        aria-label="Dismiss notification"
        className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-pill p-0 text-muted-foreground opacity-0 backdrop-blur-sm transition-opacity hover:bg-muted/70 hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16 }}
      transition={{ duration: 0.24 }}
    >
      {grouped ? (
        <>
          {/* iOS grouped-list separator: the one sanctioned hairline (a tinted */}
          {/* fill div, never a drawn rule), indented past the icon well. */}
          {showDivider && (
            <div className="h-px bg-[hsl(var(--muted-foreground)/0.08)] ml-[60px]" aria-hidden="true" />
          )}
          {row}
        </>
      ) : (
        <div
          className={`overflow-hidden rounded-card shadow-[0_1px_3px_rgb(0_0_0/0.05)] transition-shadow hover:shadow-[0_4px_12px_rgb(0_0_0/0.07)] ${standaloneSurface}`}
        >
          {row}
        </div>
      )}
    </motion.div>
  );
};
