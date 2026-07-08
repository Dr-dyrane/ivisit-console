import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '../ui/dropdown-menu';
import {
  Edit,
  Trash2,
  UserCheck,
  Calendar,
  MessageSquare,
  MoreHorizontal
} from 'lucide-react';

const GRID_TEMPLATE = 'grid-cols-[40px_minmax(160px,1.6fr)_minmax(96px,0.7fr)_minmax(96px,0.7fr)_minmax(96px,0.7fr)_minmax(120px,1fr)_minmax(110px,0.8fr)_56px]';

export const SupportTicketTableView = ({
  tickets,
  onView,
  onEdit,
  onDelete,
  onAssign,
  getStatusConfig,
  getPriorityColor,
  isAdmin,
  isMobile,
  selectedIds = [],
  onSelect,
  onSelectAll
}) => {
  const isAllSelected = tickets.length > 0 && selectedIds.length === tickets.length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="rounded-card bg-background/30 overflow-hidden p-3">
        {/* Header row */}
        <div className={`grid ${GRID_TEMPLATE} items-center gap-2 px-3 pb-3 pt-2 text-[10px]`}>
          <div className="flex items-center">
            <Checkbox
              checked={isAllSelected}
              onCheckedChange={(checked) => onSelectAll(checked)}
              aria-label="Select all"
            />
          </div>
          <span className="font-semibold uppercase tracking-[0.14em] text-muted-foreground">Subject</span>
          <span className="font-semibold uppercase tracking-[0.14em] text-muted-foreground">Category</span>
          <span className="font-semibold uppercase tracking-[0.14em] text-muted-foreground">Priority</span>
          <span className="font-semibold uppercase tracking-[0.14em] text-muted-foreground">Status</span>
          <span className="font-semibold uppercase tracking-[0.14em] text-muted-foreground">Assigned</span>
          <span className="font-semibold uppercase tracking-[0.14em] text-muted-foreground">Created</span>
          <span className="justify-self-end font-semibold uppercase tracking-[0.14em] text-muted-foreground">Actions</span>
        </div>

        {/* Data rows */}
        {tickets.length === 0 ? (
          <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
            No support tickets found.
          </div>
        ) : (
          tickets.map((ticket, index) => {
            const selected = selectedIds.includes(ticket.id);
            return (
              <motion.div
                key={ticket.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.02 }}
                className={`grid ${GRID_TEMPLATE} items-center gap-2 rounded-inner px-3 py-3 transition-colors ${selected ? 'bg-muted/50' : 'hover:bg-muted/30'}`}
              >
                <div className="flex items-center">
                  <Checkbox
                    checked={selected}
                    onCheckedChange={(checked) => onSelect(ticket.id, checked)}
                    aria-label={`Select ticket ${ticket.subject}`}
                  />
                </div>
                {/* Subject */}
                <div className="min-w-0 truncate text-xs font-bold md:text-sm" title={ticket.subject}>
                  {ticket.subject || 'No Subject'}
                </div>
                {/* Category */}
                <div className="min-w-0">
                  <span className="inline-flex items-center rounded-pill bg-muted px-2 py-0.5 text-[10px] font-semibold text-foreground/80">
                    {ticket.category || 'general'}
                  </span>
                </div>
                {/* Priority */}
                <div className="min-w-0">
                  <span className={`inline-flex items-center rounded-pill px-2 py-0.5 text-[10px] font-semibold ${getPriorityColor(ticket.priority)}`}>
                    {ticket.priority || 'normal'}
                  </span>
                </div>
                {/* Status */}
                <div className="min-w-0">
                  <span className={`inline-flex items-center rounded-pill px-2 py-0.5 text-[10px] font-semibold ${getStatusConfig(ticket.status).badgeClass}`}>
                    {ticket.status?.replace('_', ' ') || 'open'}
                  </span>
                </div>
                {/* Assigned */}
                <div className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground md:text-sm">
                  <UserCheck className="h-3 w-3 shrink-0 md:h-4 md:w-4" />
                  <span className="truncate">{ticket.assigned_to || 'Unassigned'}</span>
                </div>
                {/* Created */}
                <div className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground md:text-sm">
                  <Calendar className="h-3 w-3 shrink-0 md:h-4 md:w-4" />
                  <span className="truncate">{new Date(ticket.created_at).toLocaleDateString()}</span>
                </div>
                {/* Actions */}
                <div className="justify-self-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-pill hover:bg-muted/40">
                        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[160px] rounded-inner bg-background/80 shadow-sm">
                      <DropdownMenuItem onClick={() => onView(ticket)} className="cursor-pointer py-2 text-xs font-medium">
                        <MessageSquare className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                        View Details
                      </DropdownMenuItem>
                      {isAdmin && (
                        <>
                          <DropdownMenuItem onClick={() => onEdit(ticket)} className="cursor-pointer py-2 text-xs font-medium">
                            <Edit className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onDelete(ticket.id)} className="cursor-pointer py-2 text-xs font-medium text-destructive focus:bg-destructive/10 focus:text-destructive">
                            <Trash2 className="mr-2 h-3.5 w-3.5" />
                            Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </motion.div>
  );
};
