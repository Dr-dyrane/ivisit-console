import React from 'react';
import {
  AlertCircle,
  ChevronRight,
  Clock,
  Edit,
  Eye,
  Flag,
  Headphones,
  Info,
  Loader2,
  Plus,
  Tag,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { DetailRailShell, RailInsetHero } from '../../console/WorkspaceStage';
import { CopyChip, DetailLine, Shimmer } from '../../console/primitives';
import { Button } from '../../ui/button';
import {
  formatSupportDate,
  getSupportPriorityMeta,
  getSupportStatusMeta,
  titleCase,
} from './supportTicketsModel';

const RailActionButton = ({ icon: Icon, label, onClick, disabled = false, spinning = false }) => (
  <Button
    variant="ghost"
    disabled={disabled}
    className="h-11 w-full rounded-button bg-muted/28 text-sm font-semibold text-foreground transition-all hover:bg-muted/42 active:scale-[0.98] disabled:opacity-60"
    onClick={onClick}
  >
    {spinning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Icon className="mr-2 h-4 w-4 text-muted-foreground" />}
    {label}
  </Button>
);

export const SupportDetailRail = ({
  ticket,
  loading,
  hasFilter,
  canEdit,
  canManage,
  canAssign,
  canCreate,
  assignPending,
  deletePending,
  onView,
  onEdit,
  onDelete,
  onAssign,
  onCreate,
  embedded = false,
}) => {
  if (loading && !ticket) {
    return (
      <DetailRailShell embedded={embedded}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="space-y-3">
            <Shimmer className="h-6 w-36 rounded-inner" />
            <Shimmer className="h-6 w-24 rounded-pill" />
          </div>
          <Shimmer className="h-9 w-9 rounded-pill" />
        </div>
        <div className="mb-5 space-y-2">
          <Shimmer className="h-5 w-2/3 rounded-inner" />
          <Shimmer className="h-4 w-1/2 rounded-inner" />
        </div>
        <div className="space-y-2">
          {[0, 1, 2, 3].map((index) => (<Shimmer key={index} className="h-[52px] w-full rounded-inner" />))}
        </div>
      </DetailRailShell>
    );
  }

  if (!ticket) {
    return (
      <DetailRailShell embedded={embedded}>
        <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
          <Headphones className="mb-4 h-10 w-10 text-muted-foreground/60" />
          <h2 className="text-xl font-semibold">No request selected</h2>
          <p className="mt-2 max-w-[260px] text-sm text-muted-foreground">
            {hasFilter ? 'Requests that match your filters will appear here.' : 'Select a request to see its details here.'}
          </p>
          {canCreate && (
            <Button
              onClick={onCreate}
              className="mt-5 h-11 rounded-button bg-foreground px-5 text-sm font-semibold text-background transition-all hover:bg-foreground/90 active:scale-95"
            >
              <Plus className="mr-2 h-4 w-4" />
              New ticket
            </Button>
          )}
        </div>
      </DetailRailShell>
    );
  }

  const statusMeta = getSupportStatusMeta(ticket.status);
  const priorityMeta = getSupportPriorityMeta(ticket.priority);
  const displayId = ticket.display_id || (ticket.id ? `Request ${String(ticket.id).slice(0, 8)}` : null);

  return (
    <DetailRailShell embedded={embedded}>
      <RailInsetHero>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold tracking-tight">Request details</h2>
            {displayId && (
              <div className="mt-1 flex min-w-0 items-center gap-1">
                <p className="truncate font-mono text-[11px] font-medium tracking-wide text-muted-foreground" title={displayId}>{displayId}</p>
                <CopyChip value={displayId} label="Copy ticket ID" />
              </div>
            )}
            <div className={`mt-4 inline-flex items-center gap-2 rounded-pill px-3 py-1 text-xs font-semibold ${statusMeta.tone}`}>
              <Headphones className="h-3.5 w-3.5" />
              {statusMeta.label}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-pill bg-muted/30 text-muted-foreground transition-all hover:bg-muted/45 hover:text-foreground active:scale-95"
            onClick={() => onView(ticket)}
            aria-label="Open full request details"
          >
            <Info className="h-4 w-4" />
          </Button>
        </div>

        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold" title={ticket.subject || 'Untitled request'}>{ticket.subject || 'Untitled request'}</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{ticket.message || 'No message was added.'}</p>
        </div>
      </RailInsetHero>

      <div className="space-y-2">
        <DetailLine icon={AlertCircle} label="Status" value={statusMeta.label} />
        <DetailLine icon={Flag} label="Priority" value={priorityMeta.label} />
        <DetailLine icon={Tag} label="Category" value={titleCase(ticket.category || 'general')} />
        <DetailLine icon={Clock} label="Created" value={formatSupportDate(ticket.created_at)} />
        <DetailLine icon={Clock} label="Updated" value={formatSupportDate(ticket.updated_at || ticket.created_at)} />
      </div>

      <div className="mt-5 space-y-2.5">
        <Button
          className="h-12 w-full rounded-button bg-foreground text-base font-semibold text-background transition-all hover:bg-foreground/90 active:scale-[0.99]"
          onClick={() => onView(ticket)}
        >
          <Eye className="mr-2 h-5 w-5" />
          View details
          <ChevronRight className="ml-auto h-5 w-5" />
        </Button>

        {(canEdit || canAssign) && (
          <div className={`grid gap-3 ${canEdit && canAssign ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {canEdit && <RailActionButton icon={Edit} label="Edit" onClick={() => onEdit(ticket)} />}
            {canAssign && (
              <RailActionButton
                icon={UserPlus}
                label="Assign to me"
                onClick={() => onAssign(ticket)}
                disabled={assignPending}
                spinning={assignPending}
              />
            )}
          </div>
        )}

        {canManage && (
          <Button
            variant="ghost"
            className="h-10 w-full rounded-button bg-destructive/8 text-sm font-semibold text-destructive transition-all hover:bg-destructive/12 active:scale-[0.99]"
            onClick={() => onDelete(ticket)}
            disabled={deletePending}
            aria-busy={deletePending}
          >
            {deletePending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
            {deletePending ? 'Deleting...' : 'Delete request'}
          </Button>
        )}

        <div
          role="note"
          className="flex items-center gap-2 rounded-button bg-muted/25 px-4 py-3 text-sm font-medium text-muted-foreground"
        >
          <Info className="h-4 w-4 shrink-0" />
          Status transitions stay backend-owned; the actions above are the proved support commands.
        </div>
      </div>
    </DetailRailShell>
  );
};
