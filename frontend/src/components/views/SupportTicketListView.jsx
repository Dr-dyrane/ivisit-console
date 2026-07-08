import React from 'react';
import { motion, LayoutGroup } from 'framer-motion';
import { Button } from '../ui/button';
import {
  Edit,
  Trash2,
  UserCheck,
  Calendar,
  Headphones,
  MessageSquare
} from 'lucide-react';

export const SupportTicketListView = ({
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
    <LayoutGroup>
      <motion.div
        layout
        className="grid grid-cols-1 gap-6 auto-rows-min grid-flow-dense md:grid-cols-2 xl:grid-cols-3"
      >
        {tickets.map((ticket, index) => (
          <motion.div
            layout
            key={ticket.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className="col-span-1"
          >
            <div className="group relative flex h-full flex-col overflow-hidden rounded-card bg-background/35 p-6 shadow-[0_18px_54px_rgb(0_0_0/0.10)] backdrop-blur-xl transition-transform duration-200 hover:-translate-y-0.5">

              {/* Top right icon */}
              <div className="absolute right-0 top-0 z-20 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-button bg-background/50 text-muted-foreground shadow-sm backdrop-blur-md transition-transform duration-300 group-hover:scale-110">
                  <Headphones className="h-5 w-5" />
                </div>
              </div>

              <div className="relative z-10 mb-4 flex items-center gap-2">
                <span className={`inline-flex items-center rounded-pill px-3 py-1 text-[10px] font-semibold ${getStatusConfig(ticket.status).badgeClass}`}>
                  {ticket.status}
                </span>
                <span className={`inline-flex items-center rounded-pill px-3 py-1 text-[10px] font-semibold ${getPriorityColor(ticket.priority)}`}>
                  {ticket.priority}
                </span>
              </div>

              <h3 className="relative z-10 mb-1 line-clamp-1 text-2xl font-bold transition-colors group-hover:text-foreground/80">
                {ticket.subject || 'No Subject'}
              </h3>
              <p className="relative z-10 mb-4 line-clamp-2 text-sm font-medium text-muted-foreground">
                {ticket.message || 'No description'}
              </p>

              <div className="relative z-10 mb-6 grid grid-cols-2 gap-3">
                <div className="rounded-inner bg-muted/30 p-3 transition-colors hover:bg-muted/50">
                  <div className="mb-1 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <p className="text-xs font-medium text-muted-foreground">Category</p>
                  </div>
                  <p className="truncate text-xl font-bold">{ticket.category || 'general'}</p>
                </div>
                <div className="rounded-inner bg-muted/30 p-3 transition-colors hover:bg-muted/50">
                  <div className="mb-1 flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-muted-foreground" />
                    <p className="text-xs font-medium text-muted-foreground">Assigned</p>
                  </div>
                  <p className="truncate text-xl font-bold">{ticket.assigned_to || 'Unassigned'}</p>
                </div>
              </div>

              {ticket.created_at && (
                <div className="relative z-10 mb-4 rounded-inner bg-muted/20 p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p className="text-xs font-medium text-muted-foreground">Created</p>
                  </div>
                  <p className="text-sm font-bold">{new Date(ticket.created_at).toLocaleDateString()}</p>
                </div>
              )}

              <div className="relative z-10 mt-auto">
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => onView(ticket)}
                    className="flex-1 rounded-button bg-foreground font-bold text-background hover:bg-foreground/90"
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    View
                  </Button>
                  {isAdmin && (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onEdit(ticket)}
                        className="rounded-button bg-muted/20 font-bold hover:bg-muted/30"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDelete(ticket.id)}
                        className="rounded-button bg-destructive/20 font-bold text-destructive hover:bg-destructive/30"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </LayoutGroup>
  );
};
