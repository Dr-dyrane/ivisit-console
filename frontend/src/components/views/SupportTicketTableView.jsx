import React from 'react';
import { motion } from 'framer-motion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { 
  Edit, 
  Trash2, 
  UserCheck, 
  Calendar, 
  MessageSquare,
  Clock
} from 'lucide-react';

export const SupportTicketTableView = ({ 
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
    >
      <Card className="squircle-lg glass shadow-premium border-0 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-white/10 hover:bg-transparent">
                <TableHead className="font-black uppercase tracking-wider text-xs md:text-sm">Subject</TableHead>
                <TableHead className="font-black uppercase tracking-wider text-xs md:text-sm">Category</TableHead>
                <TableHead className="font-black uppercase tracking-wider text-xs md:text-sm">Priority</TableHead>
                <TableHead className="font-black uppercase tracking-wider text-xs md:text-sm">Status</TableHead>
                <TableHead className="font-black uppercase tracking-wider text-xs md:text-sm">Assigned</TableHead>
                <TableHead className="font-black uppercase tracking-wider text-xs md:text-sm">Created</TableHead>
                <TableHead className="font-black uppercase tracking-wider text-xs md:text-sm text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map((ticket, index) => (
                <motion.tr
                  key={ticket.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.02 }}
                  className="border-b border-white/10 hover:bg-white/5 transition-colors group"
                >
                  <TableCell className="font-black truncate max-w-[150px] md:max-w-[200px] text-xs md:text-sm">
                    <div className="truncate" title={ticket.subject}>
                      {ticket.subject || 'No Subject'}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs md:text-sm">
                    <Badge className="squircle-sm bg-info/20 text-info border-0 font-black text-xs">
                      {ticket.category || 'general'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs md:text-sm">
                    <Badge className={`squircle-sm ${getPriorityColor(ticket.priority)} border-0 font-black text-xs`}>
                      {ticket.priority || 'normal'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs md:text-sm">
                    <Badge className={`squircle-sm ${getStatusConfig(ticket.status).badgeClass} border-0 font-black text-xs`}>
                      {ticket.status?.replace('_', ' ') || 'open'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs md:text-sm">
                    <div className="flex items-center gap-1">
                      <UserCheck className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
                      <span className="truncate">{ticket.assigned_to || 'Unassigned'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs md:text-sm">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
                      <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1 md:gap-2">
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
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </motion.div>
  );
};
