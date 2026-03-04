import React from 'react';
import { motion, LayoutGroup } from 'framer-motion';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  Edit,
  Trash2,
  UserCheck,
  Calendar,
  Flag,
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
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-min grid-flow-dense"
      >
        {tickets.map((ticket, index) => {
          const statusConfig = getStatusConfig(ticket.status);
          const StatusIcon = statusConfig.icon;

          return (
            <motion.div
              layout
              key={ticket.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className="col-span-1"
            >
              <Card className="h-full squircle-xl bg-background/35 backdrop-blur-xs shadow-premium p-6 border-0 hover-lift group relative overflow-hidden flex flex-col">

                {/* Top Right Icon */}
                <div className="absolute top-0 right-0 p-5 z-20">
                  <div className="relative">
                    <div className="absolute inset-0 bg-primary/10 blur-xl rounded-full scale-150" />
                    <div className="w-10 h-10 squircle-sm bg-background/50 backdrop-blur-md flex items-center justify-center shadow-sm relative z-10  group-hover:scale-110 transition-transform duration-300">
                      <Headphones className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-4 relative z-10">
                  <Badge className={`squircle-sm ${getStatusConfig(ticket.status).badgeClass} border-0 font-bold editorial-subtitle px-3 py-1`}>
                    {ticket.status}
                  </Badge>
                  <Badge className={`squircle-sm ${getPriorityColor(ticket.priority)} border-0 font-bold editorial-subtitle px-3 py-1`}>
                    {ticket.priority}
                  </Badge>
                </div>

                <h3 className="font-bold text-2xl mb-1 tracking-tight group-hover:text-primary transition-colors line-clamp-1 relative z-10">
                  {ticket.subject || 'No Subject'}
                </h3>
                <p className="text-sm font-medium text-muted-foreground mb-4 relative z-10 line-clamp-2">
                  {ticket.message || 'No description'}
                </p>

                <div className="grid grid-cols-2 gap-3 mb-6 relative z-10">
                  <div className="p-3 squircle bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <MessageSquare className="h-4 w-4 text-info" />
                      <p className="text-xs text-muted-foreground font-medium">Category</p>
                    </div>
                    <p className="font-bold text-xl truncate">{ticket.category || 'general'}</p>
                  </div>
                  <div className="p-3 squircle bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <UserCheck className="h-4 w-4 text-warning" />
                      <p className="text-xs text-muted-foreground font-medium">Assigned</p>
                    </div>
                    <p className="font-bold text-xl truncate">{ticket.assigned_to || 'Unassigned'}</p>
                  </div>
                </div>

                {ticket.created_at && (
                  <div className="mb-4 p-3 squircle bg-primary/5 relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      <p className="text-xs text-muted-foreground font-medium">Created</p>
                    </div>
                    <p className="font-bold text-sm">{new Date(ticket.created_at).toLocaleDateString()}</p>
                  </div>
                )}

                <div className="mt-auto relative z-10">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => onView(ticket)}
                      className="flex-1 squircle bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      View
                    </Button>
                    {isAdmin && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onEdit(ticket)}
                          className="squircle border-0 bg-muted/20 hover:bg-muted/30 font-bold"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onDelete(ticket.id)}
                          className="squircle border-0 bg-destructive/20 hover:bg-destructive/30 text-destructive font-bold"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>
    </LayoutGroup>
  );
};
