import React from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Edit,
  Eye,
  Headphones,
  MessageSquare,
  Tag,
  Trash2,
  User,
  UserPlus,
} from 'lucide-react';
import { MobileListRow } from '../canon';
import { MobileDetailSheet } from '../MobileDetailSheet';
import {
  CopilotActionButton,
  createSupportTicketGuidanceRequest,
} from '../../../features/copilot';
import { resolveVital } from '../../../constants/vitalTracks';
import { formatRelativeTime } from '../../../utils/activityUtils';
import {
  categoryLabel,
  isResolved,
  openedLabel,
  orbClassFor,
  priorityLabel,
  requesterName,
} from './mobileSupportModel';

const statusIcon = (status) => (isResolved(status) ? CheckCircle : Headphones);

export const MobileSupportAtlasLayer = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden bg-background">
    <div
      className="absolute inset-0 opacity-[0.28] dark:opacity-[0.22]"
      style={{
        backgroundImage:
          'linear-gradient(118deg, transparent 0 46%, hsl(var(--foreground) / 0.055) 46% 49%, transparent 49%), linear-gradient(32deg, transparent 0 42%, hsl(var(--foreground) / 0.045) 42% 45%, transparent 45%), linear-gradient(154deg, transparent 0 64%, hsl(var(--primary) / 0.07) 64% 67%, transparent 67%)',
        backgroundSize: '250px 178px, 330px 236px, 410px 276px',
        backgroundPosition: '18px 10px, -72px 48px, 16% 38%',
      }}
    />
    <div
      className="absolute inset-0"
      style={{
        background:
          'radial-gradient(circle at 20% 32%, hsl(var(--primary) / 0.10), transparent 28%), radial-gradient(circle at 82% 62%, hsl(var(--foreground) / 0.055), transparent 26%), linear-gradient(180deg, hsl(var(--background) / 0.18), hsl(var(--background)) 92%)',
      }}
    />
  </div>
);

export const MobileSupportTicketRow = ({ ticket, onOpen }) => {
  const status = ticket.status || 'open';
  const priority = ticket.priority || 'normal';
  const urgent = priority === 'urgent' || priority === 'high';
  const vital = resolveVital('support', status);

  return (
    <MobileListRow
      item={ticket}
      dataAttr="data-mobile-support-row"
      onOpen={onOpen}
      ariaLabel={`${ticket.subject || 'Support request'}, ${vital?.pill?.label || status}`}
      orbClass={orbClassFor(status)}
      icon={statusIcon(status)}
      title={ticket.subject || `Ticket ${String(ticket.id || '').slice(0, 8)}`}
      meta={`${priorityLabel(priority)} priority - ${categoryLabel(ticket.category)}`}
      time={formatRelativeTime(ticket.created_at)}
      markerChip={urgent ? priorityLabel(priority) : null}
      pill={vital?.pill}
    />
  );
};

export const MobileSupportNotices = ({
  convergenceMessage,
  errorMessage,
  hasRows,
  onRetry,
}) => (
  <>
    {convergenceMessage && (
      <div
        role="status"
        className="rounded-card bg-amber-500/10 p-4 text-amber-900 dark:text-amber-100"
        data-testid="mobile-support-create-convergence-warning"
      >
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold">Request saved</p>
            <p className="mt-1 text-xs leading-5 text-amber-900/75 dark:text-amber-100/75">
              {convergenceMessage}
            </p>
          </div>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 h-9 rounded-inner bg-amber-500/10 px-4 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-500/15 active:scale-[0.96] dark:text-amber-100"
          >
            Refresh
          </button>
        )}
      </div>
    )}

    {errorMessage && !convergenceMessage && hasRows && (
      <div
        className="rounded-card bg-destructive/10 p-4 text-destructive"
        data-testid="mobile-support-degraded-state"
      >
        <p className="text-sm font-semibold">Support did not refresh</p>
        <p className="mt-1 text-xs text-destructive/75">Showing the last loaded support rows.</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 h-9 rounded-inner bg-destructive/10 px-4 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/15 active:scale-[0.96]"
          >
            Try again
          </button>
        )}
      </div>
    )}
  </>
);

export const MobileSupportTicketDetailSheet = ({
  activeTicket,
  canAssign,
  canManage,
  editAllowed,
  onAssign,
  onDelete,
  onEdit,
  onView,
  setActiveTicket,
  faqs = [],
}) => {
  if (!activeTicket) return null;

  const ticket = activeTicket;
  const status = ticket.status || 'open';
  const vital = resolveVital('support', status);

  return (
    <MobileDetailSheet
      isOpen={!!activeTicket}
      onClose={() => setActiveTicket(null)}
      icon={statusIcon(status)}
      iconTone={vital?.tone}
      eyebrow="Support request"
      title={ticket.subject || `Ticket ${String(ticket.id || '').slice(0, 8)}`}
      statusPill={vital?.pill}
      vital={vital ? { ...vital, label: 'Ticket status' } : null}
      islands={[
        { icon: User, label: 'Requester', value: requesterName(ticket) },
        { icon: AlertTriangle, label: 'Priority', value: priorityLabel(ticket.priority) },
        { icon: Tag, label: 'Category', value: categoryLabel(ticket.category) },
        { icon: Clock, label: 'Opened', value: openedLabel(ticket) },
      ]}
      primary={{ label: 'Details', icon: Eye, onClick: () => { setActiveTicket(null); onView?.(ticket); } }}
      secondary={editAllowed(ticket) ? { icon: Edit, onClick: () => { setActiveTicket(null); onEdit?.(ticket); }, 'aria-label': `Edit ${ticket.subject || 'support request'}` } : undefined}
    >
      {ticket.message && (
        <div className="rounded-inner surface-card p-3 text-xs leading-5 text-muted-foreground">
          <span className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground/70">
            <MessageSquare className="h-3.5 w-3.5" />
            Message
          </span>
          {ticket.message}
        </div>
      )}
      <CopilotActionButton
        label="Review with Copilot"
        compact
        request={createSupportTicketGuidanceRequest({ ticket, faqs })}
        onBeforeOpen={() => setActiveTicket(null)}
      />
      {(canAssign || canManage) && (
        <div className="flex gap-2 pt-1">
          {canAssign && (
            <button
              type="button"
              onClick={() => { setActiveTicket(null); onAssign?.(ticket); }}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-button bg-foreground/[0.06] text-sm font-semibold text-foreground transition-all active:scale-[0.96] hover:bg-foreground/10 dark:bg-white/[0.08]"
            >
              <UserPlus className="h-4 w-4" />
              Assign to me
            </button>
          )}
          {canManage && (
            <button
              type="button"
              onClick={() => { setActiveTicket(null); onDelete?.(ticket); }}
              aria-label={`Delete ${ticket.subject || 'support request'}`}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-button bg-destructive/10 text-sm font-semibold text-destructive transition-transform active:scale-[0.96] hover:bg-destructive/20"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          )}
        </div>
      )}
    </MobileDetailSheet>
  );
};
