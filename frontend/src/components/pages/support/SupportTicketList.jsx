import React, { useRef } from 'react';
import {
  AlertCircle,
  Edit,
  Eye,
  Flag,
  Headphones,
  Loader2,
  MessageSquare,
  Plus,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { useListKeyboardNav, useScrollResetOnPage } from '../../../hooks/useListKeyboardNav';
import { ListRowShell, SortableColumnHeader } from '../../console/ActivitySheet';
import { EmptyState, LoadErrorState, SkeletonRows, StatusPill } from '../../console/primitives';
import { Button } from '../../ui/button';
import { Checkbox } from '../../ui/checkbox';
import {
  SUPPORT_EMPTY_HEADINGS,
  SUPPORT_GRID_COLS,
  SUPPORT_GRID_COLS_SELECT,
  formatSupportDate,
  getSupportAssigneeLabel,
  getSupportOpenAge,
  getSupportPriorityMeta,
  getSupportStatusMeta,
} from './supportTicketsModel';

export const SupportTicketList = ({
  activeActionFeedback,
  allSelected,
  assignPending,
  canAssign,
  canCreate,
  canEditTicket,
  canManage,
  convergenceMessage,
  deletePending,
  focusedTicket,
  hasFilter,
  items,
  kpiFilter,
  loadError,
  loading,
  onAssign,
  onClearFilters,
  onCreate,
  onDelete,
  onEdit,
  onRetry,
  onSelectAll,
  onSelectClick,
  onSort,
  onToggleSelect,
  onView,
  pagination,
  selectable,
  selectedIds,
  setFocused,
  someSelected,
  sortConfig,
}) => {
  const listScrollRef = useRef(null);
  useScrollResetOnPage(listScrollRef, pagination.currentPage);
  const handleListKeyDown = useListKeyboardNav({
    items,
    focusedItem: focusedTicket,
    setFocusedId: setFocused,
    onOpen: onView,
    scrollRef: listScrollRef,
    rowAttr: 'data-support-row',
  });

  return (
    <>
      {convergenceMessage && (
        <div
          role="status"
          data-testid="support-create-convergence-warning"
          className="mt-3 flex flex-col gap-3 rounded-inner bg-amber-500/10 px-4 py-3 text-amber-900 sm:flex-row sm:items-center sm:justify-between dark:text-amber-100"
        >
          <div className="flex min-w-0 items-start gap-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-sm font-medium leading-5">{convergenceMessage}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={onRetry}
            className="h-9 shrink-0 rounded-button bg-amber-500/10 px-4 text-xs font-semibold text-amber-900 hover:bg-amber-500/15 dark:text-amber-100"
          >
            Refresh
          </Button>
        </div>
      )}

      <div
        ref={listScrollRef}
        role="list"
        tabIndex={0}
        onKeyDown={handleListKeyDown}
        aria-label="Support list"
        style={{ outline: 'none' }}
        className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-card bg-background/30 p-3 no-scrollbar dark:bg-black/[0.08]"
      >
        <SupportListHeader
          selectable={selectable}
          allSelected={allSelected}
          someSelected={someSelected}
          onSelectAll={onSelectAll}
          sortConfig={sortConfig}
          onSort={onSort}
        />

        {loading && <SkeletonRows />}

        {!loading && loadError && items.length === 0 && (
          <LoadErrorState title="Support did not load" message={loadError} onRetry={onRetry} />
        )}

        {!loading && !loadError && Number(pagination.totalCount) === 0 && (
          <EmptyState
            icon={Headphones}
            heading={hasFilter ? 'No matching requests' : (SUPPORT_EMPTY_HEADINGS[kpiFilter] || 'No support requests')}
            body={hasFilter ? 'Change filters or search again.' : 'Support requests for this scope will appear here.'}
          >
            {hasFilter ? (
              <Button
                variant="ghost"
                onClick={onClearFilters}
                className="rounded-pill bg-muted/30 px-5 font-semibold transition-all hover:bg-foreground/10 hover:text-foreground active:scale-95"
              >
                Show all requests
              </Button>
            ) : (canCreate && (
              <Button
                onClick={onCreate}
                className="rounded-pill bg-foreground px-5 font-semibold text-background transition-all hover:bg-foreground/90 active:scale-95"
              >
                <Plus className="mr-2 h-4 w-4" />
                New ticket
              </Button>
            ))}
          </EmptyState>
        )}

        {!loading && items.length > 0 && items.map((ticket) => (
          <SupportTicketRow
            key={ticket.id}
            ticket={ticket}
            selected={focusedTicket?.id === ticket.id}
            canEdit={canEditTicket(ticket)}
            canManage={canManage}
            canAssign={canAssign}
            selectable={selectable}
            checked={selectedIds.includes(ticket.id)}
            onToggleSelect={onToggleSelect}
            onSelectClick={onSelectClick}
            onFocus={() => setFocused(ticket.id)}
            onView={onView}
            onEdit={onEdit}
            onDelete={onDelete}
            onAssign={onAssign}
            assignPending={assignPending}
            deletePending={deletePending}
            activeActionFeedback={activeActionFeedback}
          />
        ))}
      </div>
    </>
  );
};

const SupportListHeader = ({ selectable, allSelected, someSelected, onSelectAll, sortConfig, onSort }) => (
  <div className={`grid ${selectable ? SUPPORT_GRID_COLS_SELECT : SUPPORT_GRID_COLS} items-center gap-2 px-4 pb-3 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground`}>
    {selectable && (
      <Checkbox
        checked={someSelected ? 'indeterminate' : allSelected}
        onCheckedChange={onSelectAll}
        onClick={(event) => event.stopPropagation()}
        aria-label={allSelected ? 'Clear selection' : 'Select all tickets'}
        className="h-4 w-4"
      />
    )}
    <span>Request</span>
    <span>Status</span>
    <span>Priority</span>
    <SortableColumnHeader label="Updated" sortKey="updated_at" sortConfig={sortConfig} onSort={onSort} />
    <span className="justify-self-end text-right">Action</span>
  </div>
);

const SupportTicketRow = ({
  ticket,
  selected,
  canEdit,
  canManage,
  canAssign,
  selectable = false,
  checked = false,
  onToggleSelect,
  onSelectClick,
  onFocus,
  onView,
  onEdit,
  onDelete,
  onAssign,
  assignPending = false,
  deletePending = false,
  activeActionFeedback,
}) => {
  const statusMeta = getSupportStatusMeta(ticket.status);
  const priorityMeta = getSupportPriorityMeta(ticket.priority);
  const title = ticket.subject || 'Untitled request';
  const assigneeLabel = getSupportAssigneeLabel(ticket);
  const openAge = getSupportOpenAge(ticket);

  return (
    <ListRowShell
      id={ticket.id}
      dataAttrName="data-support-row"
      gridCols={selectable ? SUPPORT_GRID_COLS_SELECT : SUPPORT_GRID_COLS}
      selected={selected}
      onFocus={onFocus}
      onOpen={() => onView(ticket)}
    >
      {selectable && (
        <Checkbox
          checked={checked}
          onCheckedChange={(value) => onToggleSelect?.(ticket.id, value)}
          onClick={(event) => {
            onSelectClick?.(event);
            event.stopPropagation();
          }}
          aria-label={checked ? `Deselect ${title}` : `Select ${title}`}
          className="h-4 w-4"
        />
      )}

      <div className="flex min-w-0 items-center gap-3">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-icon ${statusMeta.tone}`}>
          <MessageSquare className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <div className="truncate text-[15px] font-semibold text-foreground" title={title}>{title}</div>
          <div className="mt-1 truncate text-xs text-muted-foreground" title={ticket.message || undefined}>{ticket.message || 'No message added'}</div>
        </div>
      </div>

      <div className="min-w-0">
        <StatusPill label={statusMeta.label} className={statusMeta.tone} compact />
        {ticket.assigned_to && (
          <div className="mt-1 truncate text-[11px] font-medium text-muted-foreground" title={`Assigned to ${assigneeLabel}`}>
            {assigneeLabel}
          </div>
        )}
      </div>

      <div className="min-w-0">
        <StatusPill label={priorityMeta.label} icon={Flag} className={priorityMeta.tone} compact />
      </div>

      <div className="text-sm font-medium text-muted-foreground">
        {formatSupportDate(ticket.updated_at || ticket.created_at)}
        {openAge && (
          <div className="text-[11px] font-medium text-muted-foreground/70">{openAge}</div>
        )}
      </div>

      <div className="flex items-center justify-end gap-1.5">
        <Button
          variant="ghost"
          size="icon"
          onClick={(event) => { event.stopPropagation(); onView(ticket); }}
          data-state={activeActionFeedback === `view-${ticket.id}` ? 'opening' : 'idle'}
          className="h-8 w-8 rounded-pill bg-background/45 text-muted-foreground transition-all hover:bg-foreground hover:text-background active:scale-95"
          aria-label={`View ${title}`}
        >
          <Eye className="h-4 w-4" />
        </Button>
        {canAssign && (
          <Button
            variant="ghost"
            size="icon"
            onClick={(event) => { event.stopPropagation(); onAssign(ticket); }}
            disabled={assignPending}
            aria-busy={assignPending}
            data-state={activeActionFeedback === `assign-${ticket.id}` ? 'opening' : 'idle'}
            className="h-8 w-8 rounded-pill bg-background/45 text-muted-foreground transition-all hover:bg-foreground hover:text-background active:scale-95"
            aria-label={`Assign ${title} to me`}
          >
            {assignPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          </Button>
        )}
        {canEdit && (
          <Button
            variant="ghost"
            size="icon"
            onClick={(event) => { event.stopPropagation(); onEdit(ticket); }}
            data-state={activeActionFeedback === `edit-${ticket.id}` ? 'opening' : 'idle'}
            className="h-8 w-8 rounded-pill bg-background/45 text-muted-foreground transition-all hover:bg-foreground hover:text-background active:scale-95"
            aria-label={`Edit ${title}`}
          >
            <Edit className="h-4 w-4" />
          </Button>
        )}
        {canManage && (
          <Button
            variant="ghost"
            size="icon"
            onClick={(event) => { event.stopPropagation(); onDelete(ticket); }}
            disabled={deletePending}
            aria-busy={deletePending}
            className="h-8 w-8 rounded-pill bg-destructive/10 text-destructive transition-all hover:bg-destructive hover:text-destructive-foreground active:scale-95"
            aria-label={`Delete ${title}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </ListRowShell>
  );
};
