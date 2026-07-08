import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '../ui/button';
import {
  Edit,
  Trash2,
  UserCheck,
  MessageSquare,
  Clock
} from 'lucide-react';

export const SupportTicketSimpleListView = ({
  tickets,
  onView,
  onEdit,
  onDelete,
  onAssign,
  getStatusConfig,
  getPriorityColor,
  isAdmin,
  isMobile
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-2"
    >
      {tickets.map((ticket, index) => (
        <motion.div
          key={ticket.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.02 }}
        >
          <div className="group rounded-card bg-background/35 p-3 shadow-[0_14px_38px_rgb(0_0_0/0.08)] backdrop-blur-xl transition-colors hover:bg-muted/30 md:p-4">
            <div className="flex items-center justify-between gap-3 md:gap-4">
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex items-center gap-2 md:gap-3">
                  <h3 className="truncate text-sm font-bold transition-colors group-hover:text-foreground/80 md:text-lg">
                    {ticket.subject || 'No Subject'}
                  </h3>
                  <div className="flex flex-shrink-0 gap-1 md:gap-2">
                    <span className={`inline-flex items-center rounded-pill px-2 py-0.5 text-[10px] font-semibold ${getPriorityColor(ticket.priority)}`}>
                      {ticket.priority || 'normal'}
                    </span>
                    <span className={`inline-flex items-center rounded-pill px-2 py-0.5 text-[10px] font-semibold ${getStatusConfig(ticket.status).badgeClass}`}>
                      {ticket.status?.replace('_', ' ') || 'open'}
                    </span>
                  </div>
                </div>
                <p className="truncate text-xs text-muted-foreground md:text-sm">
                  <MessageSquare className="mr-1 inline h-3 w-3" />
                  {ticket.category || 'general'} &bull;
                  <Clock className="mx-1 inline h-3 w-3" />
                  {new Date(ticket.created_at).toLocaleDateString()} &bull;
                  <UserCheck className="mx-1 inline h-3 w-3" />
                  {ticket.assigned_to || 'Unassigned'}
                </p>
              </div>

              <div className="flex flex-shrink-0 items-center gap-1 md:gap-2">
                <div className={`flex gap-1 ${isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onView(ticket)}
                    className="h-8 w-8 rounded-button p-0 hover:bg-muted/40"
                  >
                    <MessageSquare className="h-3 w-3" />
                  </Button>
                  {isAdmin && (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onEdit(ticket)}
                        className="h-8 w-8 rounded-button p-0 hover:bg-muted/40"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDelete(ticket.id)}
                        className="h-8 w-8 rounded-button p-0 text-destructive hover:bg-destructive/20"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
};
