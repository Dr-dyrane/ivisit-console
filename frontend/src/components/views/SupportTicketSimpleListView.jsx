import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { 
  Edit, 
  Trash2, 
  UserCheck, 
  Calendar, 
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
          <Card className="squircle-lg glass shadow-sm p-3 md:p-4 border-0 hover:shadow-md transition-shadow group">
            <div className="flex items-center gap-3 md:gap-4 justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 md:gap-3 mb-2">
                  <h3 className="font-black text-sm md:text-lg truncate group-hover:text-primary transition-colors">
                    {ticket.subject || 'No Subject'}
                  </h3>
                  <div className="flex gap-1 md:gap-2 flex-shrink-0">
                    <Badge className={`squircle-sm ${getPriorityColor(ticket.priority)} border-0 font-black text-xs`}>
                      {ticket.priority || 'normal'}
                    </Badge>
                    <Badge className={`squircle-sm ${getStatusConfig(ticket.status).badgeClass} border-0 font-black text-xs`}>
                      {ticket.status?.replace('_', ' ') || 'open'}
                    </Badge>
                  </div>
                </div>
                <p className="text-xs md:text-sm text-muted-foreground truncate">
                  <MessageSquare className="h-3 w-3 inline mr-1" />
                  {ticket.category || 'general'} • 
                  <Clock className="h-3 w-3 inline mx-1" />
                  {new Date(ticket.created_at).toLocaleDateString()} • 
                  <UserCheck className="h-3 w-3 inline mx-1" />
                  {ticket.assigned_to || 'Unassigned'}
                </p>
              </div>

              <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
                <div className={`flex gap-1 ${isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onView(ticket)}
                    className="h-8 w-8 p-0 hover:bg-primary/20"
                  >
                    <MessageSquare className="h-3 w-3" />
                  </Button>
                  {isAdmin && (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onEdit(ticket)}
                        className="h-8 w-8 p-0 hover:bg-primary/20"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDelete(ticket.id)}
                        className="h-8 w-8 p-0 hover:bg-destructive/20"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
};
